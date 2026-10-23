'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog, Menu, clipboard, net, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { createServer } = require('./server');
const tunnel = require('./tunnel');
const updater = require('./updater');

app.setAppUserModelId('com.nightcity.dossier');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

const DATA_DIR = path.join(app.getPath('documents'), 'Night City Dossier');
const MAPS_DIR = path.join(DATA_DIR, 'maps');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BIN_DIR = path.join(app.getPath('userData'), 'bin');
const CFG_FILE = path.join(app.getPath('userData'), 'settings.json');
for (const d of [DATA_DIR, MAPS_DIR, BACKUP_DIR]) { try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} }

let cfg = { mode: null, bounds: null };
try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) }; } catch (e) {}
function saveCfg() { try { fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 1)); } catch (e) {} }

const adminKey = crypto.randomBytes(24).toString('hex');
let srv = null;
let srvReady = null;
let directPort = null;
let tunnelState = { state: 'off', url: '', msg: '' };
let mainWin = null;
const playerWins = new Set();

function ensureServer() {
  if (!srvReady) {
    srv = createServer({ assetsDir: MAPS_DIR, adminKey });
    srvReady = srv.start(47020, '127.0.0.1');
  }
  return srvReady;
}

function pageFor(mode) {
  return path.join(__dirname, 'app', mode === 'gm' ? 'gm.html' : mode === 'player' ? 'player.html' : 'launcher.html');
}

function hardenContents(wc) {
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); }
  });
}

function createMainWindow() {
  const b = cfg.bounds || {};
  mainWin = new BrowserWindow({
    width: b.width || 1440, height: b.height || 920, x: b.x, y: b.y, minWidth: 1000, minHeight: 660,
    backgroundColor: '#0f1018', title: 'Night City Dossier', autoHideMenuBar: false, show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  if (b.maximized) mainWin.maximize();
  hardenContents(mainWin.webContents);
  mainWin.once('ready-to-show', () => mainWin.show());
  const remember = () => { if (!mainWin || mainWin.isDestroyed()) return; cfg.bounds = { ...mainWin.getNormalBounds(), maximized: mainWin.isMaximized() }; saveCfg(); };
  mainWin.on('resize', remember); mainWin.on('move', remember);
  mainWin.on('closed', () => { mainWin = null; });
  mainWin.loadFile(pageFor(cfg.mode));
  buildMenu();
}

function openPlayerWindow() {
  const w = new BrowserWindow({
    width: 1280, height: 840, minWidth: 1000, minHeight: 660, backgroundColor: '#0f1018', title: 'Night City Dossier · Player',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  hardenContents(w.webContents);
  playerWins.add(w);
  w.on('closed', () => playerWins.delete(w));
  w.loadFile(pageFor('player'));
}

function setMode(mode) {
  cfg.mode = mode === 'gm' || mode === 'player' ? mode : null;
  saveCfg();
  if (mainWin) mainWin.loadFile(pageFor(cfg.mode));
  buildMenu();
}

function buildMenu() {
  const tpl = [
    { label: 'File', submenu: [
      { label: 'GM mode', type: 'radio', checked: cfg.mode === 'gm', click: () => setMode('gm') },
      { label: 'Player mode', type: 'radio', checked: cfg.mode === 'player', click: () => setMode('player') },
      { type: 'separator' },
      { label: 'Open a player window', click: openPlayerWindow },
      { type: 'separator' },
      { label: 'Open data folder', click: () => shell.openPath(DATA_DIR) },
      { label: 'Open backups folder', click: () => shell.openPath(BACKUP_DIR) },
      { type: 'separator' },
      { role: 'quit', label: 'Exit' },
    ] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools', label: 'Developer tools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Help', submenu: [
      { label: 'Check for updates…', click: () => runUpdate(true) },
      { type: 'separator' },
      { label: 'About Night City Dossier', click: () => dialog.showMessageBox(mainWin, { type: 'info', title: 'Night City Dossier', message: `Night City Dossier ${app.getVersion()}`, detail: `Cyberpunk 2020 characters, GM console and online map table.\n\nYour data: ${DATA_DIR}\nOnline links by Cloudflare quick tunnels (cloudflared ${tunnel.CF_VERSION}).` }) },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

function lanIps() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  return out;
}

function writeBackup(kind, text) {
  if (!/^(campaign|characters)$/.test(kind) || typeof text !== 'string' || text.length > 60 * 1024 * 1024) return false;
  const day = new Date().toISOString().slice(0, 10);
  const tmp = path.join(BACKUP_DIR, `.${kind}.tmp`);
  fs.writeFileSync(tmp, text);
  fs.copyFileSync(tmp, path.join(BACKUP_DIR, `${kind}-${day}.json`));
  fs.renameSync(tmp, path.join(BACKUP_DIR, `${kind}-latest.json`));
  const old = fs.readdirSync(BACKUP_DIR).filter((f) => new RegExp(`^${kind}-\\d{4}-\\d{2}-\\d{2}\\.json$`).test(f)).sort();
  while (old.length > 30) { try { fs.unlinkSync(path.join(BACKUP_DIR, old.shift())); } catch (e) {} }
  return true;
}

/* ---------------- IPC ---------------- */
ipcMain.handle('server:info', async () => { const port = await ensureServer(); return { port, adminKey }; });
ipcMain.handle('host:state', async () => ({ tunnel: tunnelState, direct: directPort }));
ipcMain.handle('tunnel:start', async () => {
  const port = await ensureServer();
  const url = await tunnel.start({
    binDir: BIN_DIR, port, fetchImpl: (u) => net.fetch(u),
    onStatus: (s) => { tunnelState = s; for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('tunnel:status', s); },
  });
  return url;
});
ipcMain.handle('tunnel:stop', async () => { tunnel.stop(); tunnelState = { state: 'off', url: '', msg: '' }; return true; });
ipcMain.handle('direct:start', async (e, port) => { await ensureServer(); directPort = await srv.listenPublic(Math.max(1024, Math.min(65535, Number(port) || 47021))); return { port: directPort }; });
ipcMain.handle('direct:stop', async () => { if (srv) await srv.closePublic(); directPort = null; return true; });
ipcMain.handle('net:lan', async () => lanIps());
ipcMain.handle('net:publicip', async () => {
  const res = await net.fetch('https://api.ipify.org?format=json');
  const j = await res.json();
  return /^[0-9a-f:.]+$/i.test(j.ip || '') ? j.ip : '';
});
ipcMain.handle('backup:write', async (e, kind, text) => writeBackup(kind, text));
ipcMain.handle('backup:open', async () => shell.openPath(BACKUP_DIR));
ipcMain.handle('data:open', async () => shell.openPath(DATA_DIR));
ipcMain.handle('clip:write', async (e, text) => { clipboard.writeText(String(text).slice(0, 100000)); return true; });
ipcMain.handle('mode:set', async (e, mode) => { setMode(mode); return true; });
ipcMain.handle('win:player', async () => { openPlayerWindow(); return true; });
ipcMain.handle('app:version', async () => app.getVersion());
ipcMain.handle('update:skip', async () => { skipUpdate(); return true; });

/* ---------------- updates ---------------- */
let updating = false;
let updWin = null;
let updAbort = null;
function updSend(s) { if (updWin && !updWin.isDestroyed()) updWin.webContents.send('update:status', s); }
function skipUpdate() {
  if (updAbort) { try { updAbort.abort(); } catch (e) {} }
  if (updWin && !updWin.isDestroyed()) updWin.close();
}
function openUpdateWindow(info) {
  updWin = new BrowserWindow({
    width: 520, height: 330, resizable: false, minimizable: false, maximizable: false, parent: mainWin || undefined, modal: !!mainWin,
    backgroundColor: '#0f1018', title: 'Updating Night City Dossier', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  updWin.setMenu(null);
  hardenContents(updWin.webContents);
  updWin.on('closed', () => { updWin = null; if (updAbort) { try { updAbort.abort(); } catch (e) {} } });
  updWin.loadFile(path.join(__dirname, 'app', 'update.html'));
  return new Promise((r) => updWin.webContents.once('did-finish-load', () => { updWin.show(); r(); }));
}
async function runUpdate(manual) {
  if (updating) return;
  const allowed = (app.isPackaged && process.platform === 'win32') || process.env.NCD_UPDATE_URL;
  if (!allowed) { if (manual) dialog.showMessageBox(mainWin, { type: 'info', message: 'Updates only run in the installed Windows app.' }); return; }
  updating = true;
  let info = null;
  try {
    info = await updater.check((u, o) => net.fetch(u, o), app.getVersion());
    if (!info) {
      if (manual) dialog.showMessageBox(mainWin, { type: 'info', title: 'Night City Dossier', message: `You have the latest version (${app.getVersion()}).` });
      return;
    }
    await openUpdateWindow(info);
    const base = { version: info.version, current: app.getVersion(), notes: info.notes };
    updSend({ ...base, state: 'downloading', pct: 0, got: 0, total: info.size });
    updAbort = new AbortController();
    const file = await updater.download((u, o) => net.fetch(u, o), info, path.join(app.getPath('temp'), 'NightCityDossier-update'),
      (pct, got, total) => updSend({ ...base, state: 'downloading', pct, got, total }), updAbort.signal);
    updAbort = null;
    if (!updWin) return; // skipped while downloading
    updSend({ ...base, state: 'installing' });
    await new Promise((r) => setTimeout(r, 1200));
    updater.runInstaller(file);
    if (!process.env.NCD_UPDATE_DRYRUN) setTimeout(() => app.quit(), 300);
  } catch (e) {
    updAbort = null;
    const aborted = e && (e.name === 'AbortError' || /abort/i.test(String(e.message)));
    if (aborted) return;
    console.error('[updater]', e);
    if (updWin) updSend({ version: info && info.version, current: app.getVersion(), state: 'error', msg: String(e.message || e) });
    else if (manual) dialog.showMessageBox(mainWin, { type: 'warning', title: 'Night City Dossier', message: 'Couldn\u2019t check for updates.', detail: String(e.message || e) });
  } finally { updating = false; }
}
ipcMain.handle('pdf:save', async (e, name) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showSaveDialog(win, { title: 'Save PDF', defaultPath: path.join(app.getPath('documents'), (String(name || 'character-sheet').replace(/[^\w.-]+/g, '-') || 'sheet') + '.pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled || !r.filePath) return { saved: false };
  const pdf = await e.sender.printToPDF({ printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(r.filePath, pdf);
  shell.openPath(r.filePath);
  return { saved: true, path: r.filePath };
});

/* ---------------- lifecycle ---------------- */
app.on('second-instance', () => { if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); } });
app.whenReady().then(async () => {
  if (!gotLock) return;
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'clipboard-sanitized-write'));
  session.defaultSession.on('will-download', (e, item) => {
    item.setSaveDialogOptions({ title: 'Save file', defaultPath: path.join(app.getPath('documents'), item.getFilename()) });
  });
  if (cfg.mode === 'gm') ensureServer().catch(() => {});
  createMainWindow();
  if (cfg.autoUpdate !== false) setTimeout(() => runUpdate(false), 2500);
});
app.on('window-all-closed', () => { app.quit(); });
app.on('before-quit', () => { try { tunnel.stop(); } catch (e) {} try { if (srv) srv.close(); } catch (e) {} });
