'use strict';
/*
 * Self-updater. Each launch the app reads latest.json from the newest GitHub release,
 * and if that version is newer it downloads the installer, checks its SHA-256,
 * runs it silently and quits. The installer reopens the app when it finishes.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const REPO = 'whudsontosh/night-city-dossier';
const LATEST_URL = process.env.NCD_UPDATE_URL || `https://github.com/${REPO}/releases/latest/download/latest.json`;
const ASSET_PREFIX = process.env.NCD_UPDATE_ASSET_PREFIX || `https://github.com/${REPO}/releases/download/`;

function parseVer(v) {
  const m = String(v || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function newer(a, b) {
  const x = parseVer(a), y = parseVer(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] > y[i]; }
  return false;
}

function withTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

async function check(fetchImpl, current) {
  const to = withTimeout(10000);
  let res;
  try { res = await fetchImpl(LATEST_URL + (LATEST_URL.includes('?') ? '&' : '?') + 't=' + Date.now(), { signal: to.signal, cache: 'no-store' }); }
  finally { to.done(); }
  if (res.status === 404) return null; // no releases yet
  if (!res.ok) throw new Error(`Update check failed (HTTP ${res.status}).`);
  const info = await res.json();
  if (!info || !parseVer(info.version)) throw new Error('The update information was incomplete.');
  if (!newer(info.version, current)) return null;
  if (typeof info.url !== 'string' || !info.url.startsWith(ASSET_PREFIX)) throw new Error('The update points somewhere unexpected, so it was ignored.');
  if (!/^[a-f0-9]{64}$/.test(info.sha256 || '')) throw new Error('The update has no checksum, so it was ignored.');
  return {
    version: String(info.version).replace(/^v/i, ''),
    url: info.url,
    sha256: info.sha256,
    size: Number(info.size) || 0,
    file: String(info.file || 'Night-City-Dossier-Setup.exe').replace(/[^\w.-]/g, ''),
    notes: String(info.notes || '').slice(0, 2000),
  };
}

async function download(fetchImpl, info, dir, onProgress, signal) {
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, info.file);
  // reuse a finished download from an earlier attempt
  if (fs.existsSync(target)) {
    const h = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    if (h === info.sha256) { onProgress(100, info.size, info.size); return target; }
    try { fs.unlinkSync(target); } catch (e) {}
  }
  const res = await fetchImpl(info.url, { signal });
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
  const total = Number(res.headers.get('content-length')) || info.size || 0;
  const tmp = target + '.part';
  const out = fs.createWriteStream(tmp);
  const hash = crypto.createHash('sha256');
  let got = 0, last = -1;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const buf = Buffer.from(value);
      hash.update(buf);
      got += buf.length;
      if (!out.write(buf)) await new Promise((r) => out.once('drain', r));
      const pct = total ? Math.min(100, Math.floor((got / total) * 100)) : 0;
      if (pct !== last) { last = pct; onProgress(pct, got, total); }
    }
  } catch (e) {
    out.destroy();
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
  await new Promise((r) => out.end(r));
  if (hash.digest('hex') !== info.sha256) {
    try { fs.unlinkSync(tmp); } catch (e) {}
    throw new Error('The downloaded update failed its safety check, so it was deleted.');
  }
  fs.renameSync(tmp, target);
  return target;
}

function runInstaller(file) {
  if (process.env.NCD_UPDATE_DRYRUN) { console.log('[updater] would run', file); return; }
  const child = spawn(file, ['/S'], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
}

module.exports = { check, download, runInstaller, newer, LATEST_URL, REPO };
