"""Deduplicate emitted JS and measure raw/per-file gzip-9 bytes, as in X1.

Usage: python3 scripts/measure-dashboard-js.py .next [browser-resources.json]
Manifest entries omit dynamically rendered and interaction-only imports.
Browser scenarios include observed requests, with incremental files reported apart.
"""
import gzip
import json
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".next")
manifest = json.loads((root / "app-build-manifest.json").read_text())["pages"]


def measure(files):
    chunks = []
    for file in sorted(set(files)):
        if not file.endswith((".js", ".mjs")):
            continue
        data = (root / file).read_bytes()
        chunks.append({"file": file, "raw": len(data),
                       "gzip9": len(gzip.compress(data, compresslevel=9, mtime=0))})
    return {"count": len(chunks), "raw": sum(c["raw"] for c in chunks),
            "gzip9": sum(c["gzip9"] for c in chunks), "chunks": chunks}


routes = {
    "dashboard": ["/layout", "/dashboard/layout", "/dashboard/page"],
    "publicReader": ["/layout", "/dashboard/layout",
                     "/dashboard/problems/[id]/layout", "/dashboard/problems/[id]/page"],
}
result = {"manifest": {
    name: measure(file for route in entries for file in manifest.get(route, []))
    for name, entries in routes.items()
}}
if len(sys.argv) > 2:
    result["browser"] = json.loads(Path(sys.argv[2]).read_text())
    for scenario in result["browser"]:
        scenario["initial"] = measure(scenario["initial"])
        for step in scenario["milestones"]:
            step["additional"] = measure(step["additional"])
            step["cumulative"] = measure(step["cumulative"])
print(json.dumps(result, indent=2))
