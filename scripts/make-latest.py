"""Writes the latest.json the app reads to find updates.

  make-latest.py <version> <repo> --win <Setup.exe> [--mac <mac.zip>]
  make-latest.py <Setup.exe> <version> <repo>          (older form: Windows only)

The top-level file/url/sha256/size fields describe the Windows installer, because that's what
1.1–1.3 read. Every platform is listed under "platforms" ("win32", "darwin") for 1.4.0 and later.
"""
import hashlib, json, os, sys, datetime, subprocess

def asset(path, version, repo):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    name = os.path.basename(path)
    return {"file": name, "url": f"https://github.com/{repo}/releases/download/v{version}/{name}", "sha256": h.hexdigest(), "size": os.path.getsize(path)}

args = sys.argv[1:]
if args and args[0].endswith(".exe"):
    win, version, repo, mac = args[0], args[1], args[2], None
else:
    version, repo = args[0], args[1]
    opts = dict(zip(args[2::2], args[3::2]))
    win, mac = opts.get("--win"), opts.get("--mac")
notes = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "release-notes.py"), version], capture_output=True, text=True).stdout.strip()
out = {"version": version}
platforms = {}
if win:
    platforms["win32"] = asset(win, version, repo)
    out.update(platforms["win32"])
if mac:
    platforms["darwin"] = asset(mac, version, repo)
out["date"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
out["notes"] = notes
out["platforms"] = platforms
print(json.dumps(out, indent=1))
