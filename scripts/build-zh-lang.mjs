/**
 * Generates lang/zh-TW.json and lang/zh-CN.json from the Traditional Chinese
 * Magicalogia fan sheet wording. Run: node scripts/build-zh-lang.mjs
 *
 * Simplified Chinese is derived with opencc-python-reimplemented (t2s).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const en = JSON.parse(readFileSync(join(root, "lang/en.json"), "utf8"));

/** Traditional Chinese — wording from the 魔導書大戰 Excel character sheet. */
const zhTW = {
  "MAGICALOGIA.SheetClassCharacter": "魔導書大戰 角色卡",
  "MAGICALOGIA.SheetClassItem": "魔導書大戰 道具卡",
  "MAGICALOGIA.Mana": "當前魔力",
  "MAGICALOGIA.TmpMana": "臨時魔力",
  "MAGICALOGIA.TmpName": "偽名",
  "MAGICALOGIA.MagicName": "魔法名",
  "MAGICALOGIA.Grade": "階梯",
  "MAGICALOGIA.Curiosity": "領域",
  "MAGICALOGIA.SpiritTalent": "魂之特技",
  "MAGICALOGIA.Description": "概要",
  "MAGICALOGIA.Ability": "藏書",
  "MAGICALOGIA.Bonds": "關係",
  "MAGICALOGIA.Items": "道具",
  "MAGICALOGIA.Basic": "基本資料",
  "MAGICALOGIA.Age": "年齡",
  "MAGICALOGIA.Gender": "性別",
  "MAGICALOGIA.Career": "經歷",
  "MAGICALOGIA.Agency": "機關",
  "MAGICALOGIA.Identify": "對外身分",
  "MAGICALOGIA.Exp": "功績點",
  "MAGICALOGIA.ExpAbstruct": "魔貨",
  "MAGICALOGIA.Attack": "攻擊力",
  "MAGICALOGIA.Defence": "防禦力",
  "MAGICALOGIA.RootForce": "根源力",
  "MAGICALOGIA.TrueLook": "真實之姿",
  "MAGICALOGIA.Effect": "效果",
  "MAGICALOGIA.Duty": "設定／義務",
  "MAGICALOGIA.Status": "變調",
  "MAGICALOGIA.Seal": "封印",
  "MAGICALOGIA.Burn": "綻放",
  "MAGICALOGIA.Weakness": "虛弱",
  "MAGICALOGIA.Sickness": "病魔",
  "MAGICALOGIA.Block": "遮斷",
  "MAGICALOGIA.Misfortune": "厄運",
  "MAGICALOGIA.Death": "死亡",
  "MAGICALOGIA.Extinction": "消滅",
  "MAGICALOGIA.Memo": "描述",
  "MAGICALOGIA.AbilityList": "藏書",
  "MAGICALOGIA.Class": "學派",
  "MAGICALOGIA.ManaMark": "魔素標記",
  "MAGICALOGIA.Type": "類型",
  "MAGICALOGIA.Summon": "召喚",
  "MAGICALOGIA.Spell": "咒文",
  "MAGICALOGIA.Equipment": "裝備",
  "MAGICALOGIA.Target": "目標",
  "MAGICALOGIA.Cost": "COST",
  "MAGICALOGIA.Charge": "填充",
  "MAGICALOGIA.Word": "咒句",
  "MAGICALOGIA.Talent": "指定特技",
  "MAGICALOGIA.BondsList": "〈錨點〉",
  "MAGICALOGIA.ItemsList": "道具",
  "MAGICALOGIA.Requirement": "使用資格",
  "MAGICALOGIA.RequireExp": "必要功績點",
  "MAGICALOGIA.Quantity": "個數",
  "MAGICALOGIA.Format": "所有形式",
  "MAGICALOGIA.Destiny": "命運值",
  "MAGICALOGIA.DestinyPower": "命運之力",
  "MAGICALOGIA.Attribute": "屬性",
  "MAGICALOGIA.OverflowX": "星暗相通",
  "MAGICALOGIA.A1": "1. 星",
  "MAGICALOGIA.A2": "黃金",
  "MAGICALOGIA.A3": "大地",
  "MAGICALOGIA.A4": "森",
  "MAGICALOGIA.A5": "道",
  "MAGICALOGIA.A6": "海",
  "MAGICALOGIA.A7": "寂靜",
  "MAGICALOGIA.A8": "雨",
  "MAGICALOGIA.A9": "嵐",
  "MAGICALOGIA.A10": "太陽",
  "MAGICALOGIA.A11": "天空",
  "MAGICALOGIA.A12": "異界",
  "MAGICALOGIA.B1": "2. 獸",
  "MAGICALOGIA.B2": "肉",
  "MAGICALOGIA.B3": "蟲",
  "MAGICALOGIA.B4": "花",
  "MAGICALOGIA.B5": "血",
  "MAGICALOGIA.B6": "鱗",
  "MAGICALOGIA.B7": "混沌",
  "MAGICALOGIA.B8": "牙",
  "MAGICALOGIA.B9": "吼叫",
  "MAGICALOGIA.B10": "憤怒",
  "MAGICALOGIA.B11": "翼",
  "MAGICALOGIA.B12": "愛慾",
  "MAGICALOGIA.C1": "3. 力",
  "MAGICALOGIA.C2": "重力",
  "MAGICALOGIA.C3": "風",
  "MAGICALOGIA.C4": "流動",
  "MAGICALOGIA.C5": "水",
  "MAGICALOGIA.C6": "波",
  "MAGICALOGIA.C7": "自由",
  "MAGICALOGIA.C8": "衝擊",
  "MAGICALOGIA.C9": "雷",
  "MAGICALOGIA.C10": "炎",
  "MAGICALOGIA.C11": "光",
  "MAGICALOGIA.C12": "圓環",
  "MAGICALOGIA.D1": "4. 歌",
  "MAGICALOGIA.D2": "物語",
  "MAGICALOGIA.D3": "旋律",
  "MAGICALOGIA.D4": "淚",
  "MAGICALOGIA.D5": "離別",
  "MAGICALOGIA.D6": "微笑",
  "MAGICALOGIA.D7": "思念",
  "MAGICALOGIA.D8": "勝利",
  "MAGICALOGIA.D9": "戀愛",
  "MAGICALOGIA.D10": "熱情",
  "MAGICALOGIA.D11": "治癒",
  "MAGICALOGIA.D12": "時",
  "MAGICALOGIA.E1": "5. 夢",
  "MAGICALOGIA.E2": "追憶",
  "MAGICALOGIA.E3": "謎",
  "MAGICALOGIA.E4": "謊言",
  "MAGICALOGIA.E5": "不安",
  "MAGICALOGIA.E6": "睡眠",
  "MAGICALOGIA.E7": "偶然",
  "MAGICALOGIA.E8": "幻",
  "MAGICALOGIA.E9": "狂氣",
  "MAGICALOGIA.E10": "祈禱",
  "MAGICALOGIA.E11": "希望",
  "MAGICALOGIA.E12": "未來",
  "MAGICALOGIA.F1": "6. 闇",
  "MAGICALOGIA.F2": "深淵",
  "MAGICALOGIA.F3": "腐敗",
  "MAGICALOGIA.F4": "背叛",
  "MAGICALOGIA.F5": "迷惘",
  "MAGICALOGIA.F6": "怠惰",
  "MAGICALOGIA.F7": "扭曲",
  "MAGICALOGIA.F8": "不幸",
  "MAGICALOGIA.F9": "愚昧",
  "MAGICALOGIA.F10": "惡意",
  "MAGICALOGIA.F11": "絕望",
  "MAGICALOGIA.F12": "死",
  "MAGICALOGIA.Tmp": "可變",

  "MAGICALOGIA.Roll": "判定",
  "MAGICALOGIA.Special": "大成功！",
  "MAGICALOGIA.Fumble": "大失敗！",
  "MAGICALOGIA.Success": "成功",
  "MAGICALOGIA.Fail": "失敗",
  "MAGICALOGIA.Skill": "特技",
  "MAGICALOGIA.Secret": "秘密",
  "MAGICALOGIA.Handout": "Handout",
  "MAGICALOGIA.Visible": "公開",
  "MAGICALOGIA.Hidden": "非公開",

  "MAGICALOGIA.Attacker": "攻擊方",
  "MAGICALOGIA.Defenser": "防禦方",
  "MAGICALOGIA.Observer": "立會人",

  "MAGICALOGIA.StartMagicBattle": "開始魔法戰",
  "MAGICALOGIA.StopMagicBattle": "結束魔法戰",

  "MAGICALOGIA.SelectTarget": "請選擇攻擊目標。",
  "MAGICALOGIA.SelectZomeTarget": "請選擇魔法戰的雙方代表。",
  "MAGICALOGIA.SelectObserver": "請為這位魔法使選擇立會人。",

  "MAGICALOGIA.SelectBattle": "請選擇進行中的魔法戰。",
  "MAGICALOGIA.NotStopBattle": "目前沒有進行中的魔法戰。",

  "MAGICALOGIA.SelectActor": "請選擇角色",
  "MAGICALOGIA.MustUseActor": "必須從角色（Token 或角色卡）進行判定。",
  "MAGICALOGIA.ReadyPlot": "預設已就緒。",
  "MAGICALOGIA.AwaitPlot": "已取消預設就緒。",
  "MAGICALOGIA.RevealPlot": "公開預設？",
  "MAGICALOGIA.Confirm": "確認",
  "MAGICALOGIA.SelectUser": "選擇使用者",
  "MAGICALOGIA.Share": "分享",
  "MAGICALOGIA.CannotUse": "無法使用",
  "MAGICALOGIA.WordAlreadyUsed": "這個咒句已經使用過了。",
  "MAGICALOGIA.PowerAlreadyUsed": "這個命運之力已經使用過了。",
  "MAGICALOGIA.RollAddonPrompt": "請輸入修正值",

  "SETTINGS.TalentTable": "特技名稱",
  "SETTINGS.TalentTableDesc": "覆寫本世界預設的特技表標籤。",
  "SETTINGS.RollAddon": "每次判定都詢問修正值",
  "SETTINGS.RollAddonDesc": "即使沒有按住 Ctrl，每次擲骰也會顯示修正值對話框。"
};

const missing = Object.keys(en).filter((k) => !(k in zhTW));
const extra = Object.keys(zhTW).filter((k) => !(k in en));
if (missing.length || extra.length) {
  throw new Error(`zh-TW key mismatch. missing=${missing} extra=${extra}`);
}

function toJson(obj) {
  const ordered = {};
  for (const key of Object.keys(en)) ordered[key] = obj[key];
  return JSON.stringify(ordered, null, 4) + "\n";
}

writeFileSync(join(root, "lang/zh-TW.json"), toJson(zhTW), "utf8");

const py = `
from opencc import OpenCC
import json, sys
cc = OpenCC("t2s")
data = json.loads(sys.stdin.read())
out = {k: cc.convert(v) if isinstance(v, str) else v for k, v in data.items()}
# Keep the Excel loanword and COST column header unchanged.
out["MAGICALOGIA.Handout"] = "Handout"
out["MAGICALOGIA.Cost"] = "COST"
print(json.dumps(out, ensure_ascii=False, indent=4))
`;

const conv = spawnSync("python3", ["-c", py], {
  input: JSON.stringify(zhTW),
  encoding: "utf8"
});
if (conv.status !== 0) {
  throw new Error(conv.stderr || "OpenCC conversion failed");
}
const zhCN = JSON.parse(conv.stdout);
writeFileSync(join(root, "lang/zh-CN.json"), toJson(zhCN), "utf8");
console.log("Wrote lang/zh-TW.json and lang/zh-CN.json");
