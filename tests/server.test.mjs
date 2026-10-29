import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
test("local-only HTTP server serves all UI files with restrictive CSP", {timeout:12000}, async () => {
  const child = spawn(process.execPath,["scripts/serve.mjs"],{
    cwd,env:{...process.env,TRA_PORT:"0"},stdio:["ignore","pipe","pipe"]
  });
  let output = "";
  let failure = "";
  child.stderr.on("data",(d)=>{failure += String(d);});
  try {
    const port = await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("SERVER_START_TIMEOUT:"+failure)),6000);
      child.stdout.on("data",(d)=>{
        output += String(d);
        const match=output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if(match){clearTimeout(timer);resolve(Number(match[1]));}
      });
      child.once("error",(e)=>{clearTimeout(timer);reject(e);});
      child.once("exit",(code)=>{
        clearTimeout(timer);
        reject(new Error("SERVER_EXIT:"+code+":"+failure));
      });
    });
    const base = "http://127.0.0.1:"+port;
    for(const [uri,expected] of [
      ["/","你的环境"],["/web/styles.css",".app-shell"],
      ["/web/app.js","transition"],["/src/state.mjs","nativeEnforcement"]
    ]){
      const res = await fetch(base+uri);
      assert.equal(res.status,200,uri);
      assert.ok(res.headers.get("content-security-policy").includes("connect-src 'none'"));
      assert.ok((await res.text()).includes(expected),uri);
    }
    for (const uri of ["/README.md","/package.json","/.git/config"]) {
      const res = await fetch(base+uri);
      assert.equal(res.status,404,uri);
    }
  } finally {child.kill("SIGTERM");}
});
