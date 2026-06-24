import test from "node:test";
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".svg": "image/svg+xml"
};

function createStaticServer() {
  return http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
    const target = path.resolve(root, relativePath);
    if (target !== root && !target.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const info = await stat(target);
      if (!info.isFile()) throw new Error("not a file");
      response.writeHead(200, { "Content-Type": contentTypes[path.extname(target)] || "application/octet-stream" });
      createReadStream(target).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
}

test("HTTP server returns the app, modules, CSS, and all SVG pieces", async context => {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  const base = "http://127.0.0.1:" + address.port;
  const pieceNames = ["king", "queen", "rook", "bishop", "knight", "pawn"];
  const paths = [
    "/",
    "/assets/css/app.css",
    "/src/app.js",
    "/src/views/game-view.js",
    ...pieceNames.flatMap(name => [
      "/assets/pieces/white/" + name + ".svg",
      "/assets/pieces/black/" + name + ".svg"
    ])
  ];

  for (const assetPath of paths) {
    const response = await fetch(base + assetPath);
    assert.equal(response.status, 200, assetPath);
    assert.ok((await response.arrayBuffer()).byteLength > 0, assetPath);
  }
});
