import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { migrateActorSource } from "../module/migrate-actor.js";

const samplePath = "/home/ubuntu/.cursor/projects/workspace/uploads/fvtt-Actor-____-UcnEUWRQJxgfrU9P_9965.json";

test("migrates 前田影歌 object grid into computed specialty numbers", async () => {
  let raw;
  try {
    raw = JSON.parse(readFileSync(samplePath, "utf8"));
  } catch {
    return; // sample is only present in the agent workspace
  }

  const actor = migrateActorSource(raw);
  const table = actor.system.talent.table;
  assert.equal(Array.isArray(table), true);
  assert.equal(actor.system.mana.value, 0);
  assert.equal(actor.prototypeToken.bar1.attribute, "mana");
  assert.equal(actor.prototypeToken.bar2.attribute, "tmp_mana");
  assert.equal(actor._id, "UcnEUWRQJxgfrU9P");

  // Screenshot: 花, 牙, 光, 物語, 不幸
  assert.equal(table[1][2].state, true);
  assert.equal(table[1][2].num, "5");
  assert.equal(table[1][6].state, true);
  assert.equal(table[1][6].num, "5");
  assert.equal(table[2][9].state, true);
  assert.equal(table[2][9].num, "5");
  assert.equal(table[3][0].state, true);
  assert.equal(table[3][0].num, "5");
  assert.equal(table[5][6].state, true);
  assert.equal(table[5][6].num, "5");
});
