"""Writes the latest.json the app reads to find updates."""
import hashlib, json, os, sys, datetime, subprocess
setup, version, repo = sys.argv[1], sys.argv[2], sys.argv[3]
h = hashlib.sha256()
with open(setup, "rb") as f:
    for chunk in iter(lambda: f.read(1 << 20), b""):
        h.update(chunk)
name = os.path.basename(setup)
notes = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "release-notes.py"), version], capture_output=True, text=True).stdout.strip()
print(json.dumps({
    "version": version,
    "file": name,
    "url": f"https://github.com/{repo}/releases/download/v{version}/{name}",
    "sha256": h.hexdigest(),
    "size": os.path.getsize(setup),
    "date": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "notes": notes,
}, indent=1))
