#!/usr/bin/env bash
# Release check on a real Mac (GitHub's macOS runner): the packaged app starts, its table server
# answers, it can go online through Cloudflare, and the self-updater swaps the app and reopens it.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
VERSION=$(node -p "require('./desktop/package.json').version")
ZIP="$ROOT/release-mac/Night-City-Dossier-$VERSION-mac.zip"
WORK="$(mktemp -d)"
APPS="$WORK/Applications"; mkdir -p "$APPS"
ditto -x -k "$ZIP" "$APPS"
APP="$APPS/Night City Dossier.app"
BIN="$APP/Contents/MacOS/Night City Dossier"
fail() { echo "SMOKE FAIL: $*"; for f in "$WORK"/*.json "$WORK"/*.after; do [ -f "$f" ] && { echo "--- $f"; cat "$f"; }; done; cat "$TMPDIR"/NightCityDossier-update/mac-update.log 2>/dev/null || true; exit 1; }
wait_for() { for i in $(seq 1 "$2"); do [ -f "$1" ] && grep -q '"finished": true' "$1" && return 0; sleep 1; done; return 1; }

echo "== 1. starts, serves the table, goes online"
NCD_SMOKE_TUNNEL=1 "$BIN" --ncd-smoke-out="$WORK/run1.json" &
wait_for "$WORK/run1.json" 150 || fail "first launch didn't finish"
cat "$WORK/run1.json"
grep -q '"ok": true' "$WORK/run1.json" || fail "first launch reported a problem"
grep -q '"serverStatus": 200' "$WORK/run1.json" || fail "table server didn't answer"
grep -q '"tunnelStatus": 200' "$WORK/run1.json" || echo "::warning::Cloudflare link didn't answer from the runner (network); not failing the build"
grep -q '"platform": "darwin"' "$WORK/run1.json" || fail "not darwin?"
sleep 2

echo "== 2. self-update swaps the app and reopens it"
SRV="$WORK/srv"; mkdir -p "$SRV/v$VERSION"
cp "$ZIP" "$SRV/v$VERSION/"
SHA=$(shasum -a 256 "$ZIP" | cut -d' ' -f1); SIZE=$(stat -f%z "$ZIP"); NAME=$(basename "$ZIP")
cat > "$SRV/latest.json" <<JSON
{"version":"$VERSION","platforms":{"darwin":{"file":"$NAME","url":"http://127.0.0.1:8765/v$VERSION/$NAME","sha256":"$SHA","size":$SIZE}}}
JSON
(cd "$SRV" && python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1) &
HTTP=$!
sleep 1
BEFORE=$(stat -f%i "$APP")
NCD_UPDATE_URL="http://127.0.0.1:8765/latest.json" NCD_UPDATE_ASSET_PREFIX="http://127.0.0.1:8765/" NCD_UPDATE_PRETEND_VERSION="0.0.1" \
  "$BIN" --ncd-smoke-out="$WORK/run2.json" &
for i in $(seq 1 120); do grep -q '"update": "handed-off"' "$WORK/run2.json" 2>/dev/null && break; grep -q '"finished": true' "$WORK/run2.json" 2>/dev/null && break; sleep 1; done
cat "$WORK/run2.json" || true
grep -q '"update": "handed-off"' "$WORK/run2.json" || fail "the updater didn't hand off to the installer helper"
wait_for "$WORK/run2.json.after" 90 || fail "the app didn't reopen after updating"
cat "$WORK/run2.json.after"
AFTER=$(stat -f%i "$APP")
[ "$BEFORE" != "$AFTER" ] || fail "the app bundle wasn't replaced"
ls -a "$APPS"
ls -a "$APPS" | grep -q '^\.ncd-' && fail "leftover update folders"
codesign --verify --deep --strict "$APP" || fail "updated app isn't validly signed"
kill $HTTP 2>/dev/null || true
cat "$TMPDIR"/NightCityDossier-update/mac-update.log 2>/dev/null || true
echo "SMOKE OK"
