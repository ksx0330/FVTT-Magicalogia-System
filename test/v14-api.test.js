import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

test("no removed V14 Handlebars select helper in templates", () => {
  for (const file of walk(join(root, "templates")).filter((f) => f.endsWith(".html"))) {
    const text = readFileSync(file, "utf8");
    assert.equal(text.includes("{{#select"), false, `${file} still uses {{#select}}`);
  }
});

test("system.json declares V14 compatibility and grid object", () => {
  const manifest = JSON.parse(readFileSync(join(root, "system.json"), "utf8"));
  assert.equal(manifest.id, "magicalogia");
  assert.ok(Number(manifest.compatibility.minimum) >= 13);
  assert.match(String(manifest.compatibility.verified), /^14/);
  assert.equal(typeof manifest.grid.distance, "number");
  assert.ok(!("gridDistance" in manifest));
  assert.ok(!("gridUnits" in manifest));
});

test("runtime modules do not call removed Foundry globals", () => {
  const files = walk(join(root, "module")).filter((f) => f.endsWith(".js") && !f.endsWith("compat.js"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.equal(/\bduplicate\s*\(/.test(text), false, `${file} calls duplicate()`);
    assert.equal(/canvas\.grid\.getSnappedPosition/.test(text), false, file);
    assert.equal(/canvas\.grid\.w\b/.test(text), false, file);
    assert.equal(/ChatMessage\.create/.test(text), false, `${file} calls ChatMessage.create`);
    assert.equal(/user:\s*game\.user\._id/.test(text), false, file);
    assert.equal(/(?<!\$)html\.on\s*\(/.test(text), false, `${file} uses html.on (needs asJQuery)`);
    assert.equal(/controls\[0\]\.tools/.test(text), false, file);
  }
});
