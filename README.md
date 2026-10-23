# Night City Dossier

A Cyberpunk 2020 table app for Windows and Mac, similar to D&D Beyond: players build and run their characters, the GM runs the campaign, and everyone meets on an Owlbear-style battle map over the internet. Windows and Mac players can share the same game.

## Install
Get the files from the **[latest release](https://github.com/whudsontosh/night-city-dossier/releases/latest)**.

**Windows:** download `Night-City-Dossier-Setup-x.y.z.exe` and run it. It installs just for your Windows user and doesn't need admin rights. Windows SmartScreen may warn that the app is unrecognised (it isn't code-signed): choose **More info → Run anyway**.

**Mac** (macOS 11 or later, Apple Silicon or Intel): download `Night-City-Dossier-x.y.z.dmg`, open it and drag **Night City Dossier** into **Applications**. The app isn't notarised by Apple, so the first time you open it macOS blocks it:
1. Open it from Applications. When macOS says it can't verify the app, click **Done** (or **Cancel**).
2. Open **System Settings → Privacy & Security**, scroll down to the message about Night City Dossier and click **Open Anyway**, then confirm with your password.
3. On macOS 14 or earlier you can instead Control-click the app in Applications, choose **Open**, then **Open** again.

You only do this once. The app has to stay in Applications to update itself.

## What it does
- **Players:** guided character builder (roles, stats, career and pickup skills, lifepath, gear and cyberware), live character sheet with dice, wounds, armor, Humanity and IP, paper-sheet PDF export.
- **GM:** several campaigns to choose from, each with its own party overview, encounter tracker with initiative and damage, NPC library, campaign notes and session log.
- **Online table:** the GM clicks **Host game → Go online** and sends players an invite code. When a player joins, their character is saved into the campaign and gets a token on the map. Wounds, cash and IP sync both ways while connected.
- **Battle map:** map images or blank grids, meter-based ruler, tokens with wound rings, fog of war, drawing, pings, shared dice log and chat.
- **Your data:** saved automatically, with daily backup files in `Documents\Night City Dossier` (Windows) or `Documents/Night City Dossier` (Mac). Updates and uninstalling never touch it. Character and campaign files work on both.

## Updates
The app checks this repository's latest release every time it starts (and from **Help → Check for updates**). If there's a newer version, it downloads the build for your computer, checks its SHA-256 against `latest.json` in the release, installs it and reopens. On Windows that's a silent run of the installer; on a Mac the app swaps itself in Applications.

## Building locally
Windows installer, on Linux or WSL with Node 20+, Python 3 and NSIS (`sudo apt install nsis`):
```
bash scripts/build-windows.sh
```
Output goes to `release/`. Mac app, on a Mac with Node 20+, Python 3 and the Xcode command line tools:
```
bash scripts/build-mac.sh
```
Output goes to `release-mac/`. To run the app from source: `cd src && python3 build.py && cd ../desktop && npm install && npx electron .`

## Layout
| Path | What's there |
|---|---|
| `src/` | The app pages: rules and data (`core.js`), dice, backups, paper sheets (`core2.js`), map engine (`map.js`), player app (`player*.js`), GM console and hosting (`gm*.js`), styles (`shared.css`). `build.py` assembles them. |
| `desktop/` | Electron shell: window and menus (`main.js`), table server (`server.js`), Cloudflare link (`tunnel.js`), self-updater (`updater.js`) |
| `desktop/build/` | Icon, Windows installer script (`installer.nsi`) |
| `scripts/` | Build and release helpers |
| `.github/workflows/release.yml` | Builds the Windows installer and the Mac app on GitHub, checks the Mac app on a real Mac |

See `THIRD-PARTY-NOTICES.md` for bundled fonts and libraries.
