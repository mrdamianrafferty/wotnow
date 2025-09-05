import os, json, subprocess, shlex, datetime, sys, yaml

# Ensure we're running from the project root
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.join(script_dir, "../../../")
project_root = os.path.abspath(project_root)
os.chdir(project_root)

CFG = "services/astro_highlights/astro_canaries.yml"
with open(CFG, "r") as f:
    data = yaml.safe_load(f)

# Use absolute paths
venv = os.path.abspath(data["vars"]["venv"])
pkg_dir = os.path.abspath(data["vars"]["pkg_dir"])
out_dir = os.path.abspath(data["vars"]["out_dir"])
days = int(data["vars"].get("days", 7))
start_date = data["vars"].get("start_date") or None
date_arg = ["--date", start_date] if start_date else []

# Determine Python executable
# In GitHub Actions, use the system python; locally use venv if it exists
if os.environ.get('GITHUB_ACTIONS'):
    py = sys.executable  # Use the current Python interpreter
    print(f"🔧 Running in GitHub Actions, using system Python: {py}")
elif os.path.exists(os.path.join(venv, "bin", "python")):
    py = os.path.join(venv, "bin", "python")
    print(f"🔧 Using virtual environment Python: {py}")
else:
    py = sys.executable  # Fallback to system Python
    print(f"🔧 Virtual environment not found, using system Python: {py}")

cmd_base = [py, "-m", "astro_highlights.build_highlights", "--days", str(days)]
os.makedirs(out_dir, exist_ok=True)
manifest = []
today = datetime.date.today().isoformat()

canaries = data.get("canaries") or {}
for region, items in canaries.items():
    for it in items:
        name = it["name"]; lat = it["lat"]; lon = it["lon"]
        out_file = os.path.join(out_dir, f"highlights_{region}_{name}.json")
        cmd = cmd_base + ["--lat", str(lat), "--lon", str(lon), "--out", out_file] + date_arg
        print("→", " ".join(shlex.quote(x) for x in cmd))
        subprocess.check_call(cmd, cwd=pkg_dir)
        manifest.append({"region": region, "name": name, "lat": lat, "lon": lon, "out": out_file, "built_at": today})

with open(os.path.join(out_dir, "index_canaries.json"), "w") as f:
    json.dump({"items": manifest}, f, indent=2)
print("✓ Wrote", os.path.join(out_dir, "index_canaries.json"))
