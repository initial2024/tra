import http from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = new Map([
  ["/",["web/index.html","text/html; charset=utf-8"]],
  ["/index.html",["web/index.html","text/html; charset=utf-8"]],
  ["/web/app.js",["web/app.js","text/javascript; charset=utf-8"]],
  ["/web/styles.css",["web/styles.css","text/css; charset=utf-8"]],
  ["/src/state.mjs",["src/state.mjs","text/javascript; charset=utf-8"]]
]);
const server = http.createServer(async(req,res)=>{
  const url = new URL(req.url,"http://127.0.0.1");
  const record = files.get(url.pathname);
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'");
  if (req.method !== "GET" || !record) {res.writeHead(404);res.end("Not found");return;}
  try {
    const data = await readFile(path.join(root,record[0]));
    res.writeHead(200,{"Content-Type":record[1]});
    res.end(data);
  } catch {
    res.writeHead(500); res.end("Local demo unavailable");
  }
});
server.listen(4173,"127.0.0.1",()=> {
  console.log("Tra local-only management preview: http://127.0.0.1:4173");
  console.log("No Android isolation or native DSH bridge is connected.");
});
