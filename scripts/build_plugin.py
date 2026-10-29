#!/usr/bin/env python3
"""Build a deterministic, read-only DSH tool ZIP. NOT an APK or VM."""
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)
out = DIST / "sandbox-manager-tool.zip"
metadata = {
    "name": "@initial2024/dsh-sandbox-manager-tool",
    "version": "0.1.0",
    "description": "Read-only DSH sandbox manager status tool; no native enforcement",
    "type": "module",
    "main": "lib/index.js"
}
with zipfile.ZipFile(out, "w") as z:
    for name, data in (
        ("package.json", (json.dumps(metadata, ensure_ascii=False, indent=2) + "\n").encode()),
        ("lib/index.js", (ROOT / "lib/index.js").read_bytes())
    ):
        item = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
        item.compress_type = zipfile.ZIP_DEFLATED
        item.external_attr = 0o100644 << 16
        z.writestr(item, data)
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    assert set(z.namelist()) == {"package.json", "lib/index.js"}
print(f"DSH_READ_ONLY_TOOL_ZIP={out}")
print("REAL_DSH_RUNTIME_COMPATIBILITY=NOT_VERIFIED")
print("ANDROID_SANDBOX_ENFORCEMENT=NOT_CONNECTED")
