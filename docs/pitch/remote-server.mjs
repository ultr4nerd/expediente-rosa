// Tiny presenter remote: serves docs/pitch and shares the current slide between the phone and the Mac.
// Run: node docs/pitch/remote-server.mjs  (port 8090). Phone: /presenter.html · Mac screen: /screen.html
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
let state = { slide: 1, step: 1, at: Date.now() };

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/state") {
    if (req.method === "POST") {
      let body = "";
      for await (const c of req) body += c;
      try { state = { ...state, ...JSON.parse(body), at: Date.now() }; } catch {}
    }
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify(state));
  }
  const path = normalize(join(root, url.pathname === "/" ? "/presenter.html" : url.pathname));
  if (!path.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(path);
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(data);
  } catch { res.writeHead(404); res.end("not found"); }
}).listen(8090, "127.0.0.1", () => console.log("presenter remote on :8090"));
