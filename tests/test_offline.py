import unittest
import subprocess
import pathlib
import re
import base64
import hashlib
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGE = ROOT / "dist" / "tra-sandbox-manager-offline.html"

class Inspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.attrs = []
        self.scripts = []
        self.styles = []
        self._context = None
    def handle_starttag(self, tag, attrs):
        self.attrs.append((tag,dict(attrs)))
        if tag == "script":
            self._context = "script"
        if tag == "style":
            self._context = "style"
    def handle_endtag(self, tag):
        if self._context == tag:
            self._context = None
    def handle_data(self, data):
        if self._context == "script":
            self.scripts.append(data)
        if self._context == "style":
            self.styles.append(data)

class OfflineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(["python3",str(ROOT / "scripts/build_offline_ui.py")],check=True)
    def test_is_single_file_no_remote_scripts(self):
        d = Inspector()
        d.feed(PAGE.read_text(encoding="utf-8"))
        self.assertEqual(sum(t=="script" for t,a in d.attrs),1)
        self.assertEqual(sum(t=="style" for t,a in d.attrs),1)
        self.assertFalse(any("src" in a for t,a in d.attrs if t=="script"))
        self.assertFalse(any(t=="link" for t,a in d.attrs))
        self.assertIn("localStorage",''.join(d.scripts))
    def test_csp_digests_match(self):
        d=Inspector()
        d.feed(PAGE.read_text(encoding="utf-8"))
        policy=next(a["content"] for t,a in d.attrs if t=="meta" and a.get("http-equiv")=="Content-Security-Policy")
        self.assertIn("connect-src 'none'",policy)
        self.assertIn("default-src 'none'",policy)
        for kind,values in [("script",d.scripts),("style",d.styles)]:
            payload="".join(values).encode()
            digest=base64.b64encode(hashlib.sha256(payload).digest()).decode()
            self.assertIn("sha256-"+digest,policy,kind)
    def test_no_real_vm_claim(self):
        page=PAGE.read_text(encoding="utf-8")
        self.assertIn("原生隔离：未连接",page)
        self.assertIn("实际授权数：0",page)
        self.assertNotIn("android.permission.MANAGE_VIRTUAL_MACHINE",page)
if __name__=="__main__":
    unittest.main()
