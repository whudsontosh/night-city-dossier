#!/usr/bin/env bash
# Builds the Mac app (one universal build for Apple Silicon and Intel) into ./release-mac:
#   Night-City-Dossier-<version>.dmg      what people download and drag to Applications
#   Night-City-Dossier-<version>-mac.zip  what the app's self-updater downloads
# Needs macOS with Xcode command line tools, node 20+ and python3. The app is ad-hoc signed
# (not notarised), so on first launch macOS asks people to allow it in Privacy & Security.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
VERSION=$(node -p "require('./desktop/package.json').version")
echo "Building Night City Dossier $VERSION for macOS"

(cd src && python3 build.py)

cd desktop
npm ci --no-audit --no-fund
rm -rf dist
npx electron-builder --mac --universal --dir --publish never
APP="$(ls -d dist/mac-universal/*.app | head -n1)"
[ -d "$APP" ] || { echo "no .app produced"; exit 1; }
# Apple Silicon only runs signed code: re-sign the whole bundle ad hoc after electron-builder's changes
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
lipo -archs "$APP/Contents/MacOS/Night City Dossier"
cd "$ROOT"

rm -rf release-mac && mkdir -p release-mac
ZIP="release-mac/Night-City-Dossier-$VERSION-mac.zip"
DMG="release-mac/Night-City-Dossier-$VERSION.dmg"
ditto -c -k --sequesterRsrc --keepParent "desktop/$APP" "$ZIP"

STAGE="$(mktemp -d)"
ditto "desktop/$APP" "$STAGE/Night City Dossier.app"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "Night City Dossier $VERSION" -srcfolder "$STAGE" -fs HFS+ -format UDZO -ov "$DMG"
rm -rf "$STAGE"
echo "Done:"; ls -la release-mac
