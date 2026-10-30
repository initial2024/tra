#!/usr/bin/env python3
"""Compile the local sandbox CONFIGURATION UI into one fully offline HTML file.

This does not create Android services, permissions, virtual devices or an APK.
No external libraries or HTTP requests are included in the output.
"""
from pathlib import Path
import re
import hashlib
import base64
import html as html_mod

ROOT = Path(__file__).resolve().parents[1]
page = (ROOT / "web/index.html").read_text(encoding="utf-8")
style = (ROOT / "web/styles.css").read_text(encoding="utf-8")
state = (ROOT / "src/state.mjs").read_text(encoding="utf-8")
app = (ROOT / "web/app.js").read_text(encoding="utf-8")

# Strip only the ESM surface used by the shipped source, fail closed on changes.
assert state.count("export ") >= 6, "unexpected state exports"
assert "import " not in state, "unexpected state imports"
state = re.sub(r"\bexport (const|function)\s+", r"\1 ", state)
app, count = re.subn(
    r'\Aimport\s*\{[\s\S]*?\}\s*from\s*"\.\./src/state\.mjs";\s*',
    "", app, count=1
)
assert count == 1, "unexpected browser import"
assert "import " not in app and "export " not in app, "unexpected ESM imports"
script = "'use strict';\n" + state + "\n" + app + "\n"
css = "\n" + style + "\n"

def fingerprint(value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("ascii")

policy = (
    "default-src 'none'; "
    f"script-src 'sha256-{fingerprint(script)}'; "
    f"style-src 'sha256-{fingerprint(css)}'; "
    "img-src data:; connect-src 'none'; "
    "base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'"
)
policy_meta = (
    '<meta http-equiv="Content-Security-Policy" content="'
    + html_mod.escape(policy, quote=True) + '">'
)
assert '<link rel="stylesheet" href="./web/styles.css">' in page
assert '<script type="module" src="./web/app.js"></script>' in page
page = page.replace('<link rel="stylesheet" href="./web/styles.css">', f"<style>{css}</style>", 1)
page = page.replace('<script type="module" src="./web/app.js"></script>', "", 1)
page = page.replace('<head>', '<head>\n  ' + policy_meta, 1)
page = page.replace('</body>', f"<script>{script}</script>\n</body>", 1)
assert "src=" not in page.replace('src=', 'src=', 0) or '<script src=' not in page
assert "http://" not in script and "https://" not in script
assert "fetch(" not in script and "WebSocket(" not in script

output = ROOT / "dist" / "tra-sandbox-manager-offline.html"
output.parent.mkdir(exist_ok=True)
output.write_text(page, encoding="utf-8")
print("OFFLINE_SINGLE_FILE_HTML=PASS")
print("OFFLINE_SCRIPT_CSP_SHA256=PASS")
print("ANDROID_NATIVE_ISOLATION=NOT_CONNECTED")
print("OUTPUT=" + str(output))
