#!/usr/bin/env bash
# Builds the Windows installer, the standalone HTML pages and latest.json into ./release
# Needs: node 20+, python3, makensis (apt install nsis). Works on Linux (GitHub Actions) and WSL.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
VERSION=$(node -p "require('./desktop/package.json').version")
REPO="${GITHUB_REPOSITORY:-whudsontosh/night-city-dossier}"
echo "Building Night City Dossier $VERSION"

(cd src && python3 build.py)

cd desktop
npm ci --no-audit --no-fund
rm -rf dist
npx electron-builder --win --x64 --dir --publish never
node build/set-exe-icon.mjs "dist/win-unpacked/Night City Dossier.exe" build/icon.ico "$VERSION"
makensis -V2 -DVERSION="$VERSION" build/installer.nsi
cd "$ROOT"

rm -rf release && mkdir -p release
SETUP="Night-City-Dossier-Setup-$VERSION.exe"
cp "desktop/dist/$SETUP" release/
cp dist/night-city-dossier.html release/night-city-dossier-browser.html
cp dist/night-city-gm-console.html release/night-city-gm-console-browser.html
python3 scripts/make-latest.py "release/$SETUP" "$VERSION" "$REPO" > release/latest.json
python3 scripts/release-notes.py "$VERSION" > release/notes.md
echo "Done:"; ls -la release
