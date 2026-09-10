import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const en = JSON.parse(readFileSync(join(root, "lang/en.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(root, "system.json"), "utf8"));

const expectedLangs = [
  { lang: "en", path: "lang/en.json" },
  { lang: "ko", path: "lang/ko.json" },
  { lang: "ja", path: "lang/ja.json" },
  { lang: "zh-TW", path: "lang/zh-TW.json" },
  { lang: "zh-CN", path: "lang/zh-CN.json" }
];

test("system.json registers every language pack", () => {
  const langs = manifest.languages.map((entry) => entry.lang);
  for (const expected of expectedLangs) {
    assert.ok(langs.includes(expected.lang), `missing lang ${expected.lang}`);
    const entry = manifest.languages.find((item) => item.lang === expected.lang);
    assert.equal(entry.path, expected.path);
  }
});

test("Chinese packs cover every English key", () => {
  for (const file of ["lang/zh-TW.json", "lang/zh-CN.json"]) {
    const pack = JSON.parse(readFileSync(join(root, file), "utf8"));
    assert.deepEqual(Object.keys(pack).sort(), Object.keys(en).sort(), file);
    for (const [key, value] of Object.entries(pack)) {
      assert.equal(typeof value, "string", `${file} ${key}`);
      assert.ok(value.length > 0, `${file} ${key} is empty`);
    }
  }
});

test("Traditional pack uses Excel character-sheet wording", () => {
  const tw = JSON.parse(readFileSync(join(root, "lang/zh-TW.json"), "utf8"));
  assert.equal(tw["MAGICALOGIA.TmpName"], "偽名");
  assert.equal(tw["MAGICALOGIA.MagicName"], "魔法名");
  assert.equal(tw["MAGICALOGIA.Identify"], "對外身分");
  assert.equal(tw["MAGICALOGIA.Grade"], "階梯");
  assert.equal(tw["MAGICALOGIA.Career"], "經歷");
  assert.equal(tw["MAGICALOGIA.Agency"], "機關");
  assert.equal(tw["MAGICALOGIA.Mana"], "當前魔力");
  assert.equal(tw["MAGICALOGIA.TmpMana"], "臨時魔力");
  assert.equal(tw["MAGICALOGIA.Exp"], "功績點");
  assert.equal(tw["MAGICALOGIA.ExpAbstruct"], "魔貨");
  assert.equal(tw["MAGICALOGIA.RootForce"], "根源力");
  assert.equal(tw["MAGICALOGIA.SpiritTalent"], "魂之特技");
  assert.equal(tw["MAGICALOGIA.OverflowX"], "星暗相通");
  assert.equal(tw["MAGICALOGIA.TrueLook"], "真實之姿");
  assert.equal(tw["MAGICALOGIA.Ability"], "藏書");
  assert.equal(tw["MAGICALOGIA.Talent"], "指定特技");
  assert.equal(tw["MAGICALOGIA.Word"], "咒句");
  assert.equal(tw["MAGICALOGIA.Charge"], "填充");
  assert.equal(tw["MAGICALOGIA.Status"], "變調");
  assert.equal(tw["MAGICALOGIA.Burn"], "綻放");
  assert.equal(tw["MAGICALOGIA.Block"], "遮斷");
  assert.equal(tw["MAGICALOGIA.Misfortune"], "厄運");
  assert.equal(tw["MAGICALOGIA.B12"], "愛慾");
  assert.equal(tw["MAGICALOGIA.C4"], "流動");
  assert.equal(tw["MAGICALOGIA.D5"], "離別");
  assert.equal(tw["MAGICALOGIA.D9"], "戀愛");
  assert.equal(tw["MAGICALOGIA.E4"], "謊言");
  assert.equal(tw["MAGICALOGIA.E9"], "狂氣");
  assert.equal(tw["MAGICALOGIA.F5"], "迷惘");
  assert.equal(tw["MAGICALOGIA.F9"], "愚昧");
  assert.equal(tw["MAGICALOGIA.Observer"], "立會人");
});

test("Simplified pack is a conversion of the Traditional pack", () => {
  const cn = JSON.parse(readFileSync(join(root, "lang/zh-CN.json"), "utf8"));
  assert.equal(cn["MAGICALOGIA.TmpName"], "伪名");
  assert.equal(cn["MAGICALOGIA.Identify"], "对外身分");
  assert.equal(cn["MAGICALOGIA.Mana"], "当前魔力");
  assert.equal(cn["MAGICALOGIA.TmpMana"], "临时魔力");
  assert.equal(cn["MAGICALOGIA.TrueLook"], "真实之姿");
  assert.equal(cn["MAGICALOGIA.Ability"], "藏书");
  assert.equal(cn["MAGICALOGIA.Status"], "变调");
  assert.equal(cn["MAGICALOGIA.Burn"], "绽放");
  assert.equal(cn["MAGICALOGIA.Block"], "遮断");
  assert.equal(cn["MAGICALOGIA.Misfortune"], "厄运");
  assert.equal(cn["MAGICALOGIA.B12"], "爱欲");
  assert.equal(cn["MAGICALOGIA.D5"], "离别");
  assert.equal(cn["MAGICALOGIA.D9"], "恋爱");
  assert.equal(cn["MAGICALOGIA.E4"], "谎言");
  assert.equal(cn["MAGICALOGIA.E9"], "狂气");
  assert.equal(cn["MAGICALOGIA.Observer"], "立会人");
});
