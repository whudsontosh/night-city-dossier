# Night City Dossier

A Cyberpunk 2020 table app for Windows, similar to D&D Beyond: players build and run their characters, the GM runs the campaign, and everyone meets on an Owlbear-style battle map over the internet.

**[Download the latest installer](https://github.com/whudsontosh/night-city-dossier/releases/latest)**: get `Night-City-Dossier-Setup-x.y.z.exe` from the newest release. Everyone at the table (GM and players) installs the same file. It installs just for your Windows user and doesn't need admin rights. Windows SmartScreen may warn that the app is unrecognised (it isn't code-signed): choose **More info → Run anyway**.

## What it does
- **Players:** guided character builder (roles, stats, career and pickup skills, lifepath, gear and cyberware), live character sheet with dice, wounds, armor, Humanity and IP, paper-sheet PDF export.
- **GM:** party overview, encounter tracker with initiative and damage, NPC library, campaign notes and session log.
- **Online table:** the GM clicks **Host game → Go online** and sends players an invite code. When a player joins, their character is saved into the campaign and gets a token on the map. Wounds, cash and IP sync both ways while connected.
- **Battle map:** map images or blank grids, meter-based ruler, tokens with wound rings, fog of war, drawing, pings, shared dice log and chat.
- **Your data:** saved automatically, with daily backup files in `Documents\Night City Dossier`. Updates and uninstalling never touch it.

## Updates
The app checks this repository's latest release every time it starts (and from **Help → Check for updates**). If there's a newer version, it downloads the installer, checks its SHA-256 against `latest.json` in the release, installs it silently and reopens.

## Publishing a new version
1. Make your changes.
2. Bump `"version"` in `desktop/package.json` (for example `1.1.0` → `1.2.0`).
3. Add a `## 1.2.0` section at the top of `CHANGELOG.md`. It becomes the release notes and is shown in the app's update window.
4. Commit and push to `main`.
5. The **Build and release** GitHub Action sees the new version, builds the installer and publishes release `v1.2.0` (about 5 minutes). Installed apps update on their next launch.

Pushes that don't change the version don't make a release. You can also click **Run workflow** on the Actions tab to get a test build as a downloadable artifact.

## Building locally
On Linux or WSL with Node 20+, Python 3 and NSIS (`sudo apt install nsis`):
```
bash scripts/build-windows.sh
```
Output goes to `release/`. To run the app from source: `cd src && python3 build.py && cd ../desktop && npm install && npx electron .`

## Layout
| Path | What's there |
|---|---|
| `src/` | The app pages: rules and data (`core.js`), dice, backups, paper sheets (`core2.js`), map engine (`map.js`), player app (`player*.js`), GM console and hosting (`gm*.js`), styles (`shared.css`). `build.py` assembles them. |
| `desktop/` | Electron shell: window and menus (`main.js`), table server (`server.js`), Cloudflare link (`tunnel.js`), self-updater (`updater.js`) |
| `desktop/build/` | Icon, Windows installer script (`installer.nsi`) |
| `scripts/` | Build and release helpers |
| `.github/workflows/release.yml` | Builds and publishes releases when you push a `v*` tag |

See `THIRD-PARTY-NOTICES.md` for bundled fonts and libraries.
