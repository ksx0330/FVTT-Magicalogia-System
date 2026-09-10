import test from "node:test";
import assert from "node:assert/strict";
import { getTalentTable, applyTalentPatch } from "../module/talent-graph.js";

function emptyTable() {
  return Array.from({ length: 6 }, () =>
    Array.from({ length: 11 }, () => ({ misfortune: false, state: false, num: "12" }))
  );
}

const emptyGap = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false };

test("unchecked grid stays at 12", () => {
  const table = getTalentTable(emptyTable(), emptyGap, false);
  assert.equal(table[0][0].num, "12");
  assert.equal(table[5][10].num, "12");
});

test("a checked specialty is target 5", () => {
  const source = emptyTable();
  source[1][3].state = true;
  const table = getTalentTable(source, emptyGap, false);
  assert.equal(table[1][3].num, "5");
});

test("same-column neighbors cost 1", () => {
  const source = emptyTable();
  source[0][5].state = true;
  const table = getTalentTable(source, emptyGap, false);
  assert.equal(table[0][4].num, "6");
  assert.equal(table[0][6].num, "6");
});

test("adjacent columns cost 2 without a gap", () => {
  const source = emptyTable();
  source[2][0].state = true;
  const table = getTalentTable(source, emptyGap, false);
  assert.equal(table[1][0].num, "7");
  assert.equal(table[3][0].num, "7");
});

test("a gap checkbox halves the column-change cost", () => {
  const source = emptyTable();
  source[2][0].state = true;
  const gap = { ...emptyGap, 2: true };
  const table = getTalentTable(source, gap, false);
  assert.equal(table[1][0].num, "6");
});

test("applyTalentPatch recalculates when a cell is checked", () => {
  const result = applyTalentPatch(emptyTable(), emptyGap, false, {
    table: { 0: { 0: { state: true } } }
  });
  assert.equal(result.table[0][0].num, "5");
  assert.equal(result.table[0][1].num, "6");
});

test("curiosity marks the two neighboring domain gaps", () => {
  const talentChange = { curiosity: 3 };
  const result = applyTalentPatch(emptyTable(), emptyGap, false, talentChange);
  assert.equal(result.gap[2], true);
  assert.equal(result.gap[3], true);
  assert.equal(result.gap[1], false);
});

test("object-keyed Foundry form data still recalculates", () => {
  const objectTable = {
    0: { 0: { state: true, num: "12", misfortune: false } },
    1: {},
    2: {},
    3: {},
    4: {},
    5: {}
  };
  const table = getTalentTable(objectTable, emptyGap, false);
  assert.equal(table[0][0].num, "5");
  assert.equal(table[0][1].num, "6");
  assert.equal(Array.isArray(table), true);
});
