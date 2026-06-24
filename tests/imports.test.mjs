import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

async function listJavaScript(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listJavaScript(target));
    else if (entry.name.endsWith(".js")) files.push(target);
  }
  return files;
}

test("all local JavaScript imports resolve", async () => {
  const files = await listJavaScript(path.join(root, "src"));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const imports = source.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g);
    for (const match of imports) {
      const resolved = path.resolve(path.dirname(file), match[1]);
      assert.ok((await stat(resolved)).isFile(), path.relative(root, file) + " -> " + match[1]);
    }
  }
});
