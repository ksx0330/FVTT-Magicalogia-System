import { refreshTalentGrid } from "./document/actor.js";

// One-time repair for actor/token data created under the pre-V14 template.
// MagicalogiaActor.migrateData() calls migrateActorSource() per document at load;
// runWorldMigration() persists it to existing world actors once, gated by schemaVersion.

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTalentTable(table) {
  const cols = [];
  for (let i = 0; i < 6; ++i) {
    const src = Array.isArray(table) ? table[i] : table?.[i] ?? table?.[String(i)];
    const col = [];
    for (let j = 0; j < 11; ++j) {
      const cell = Array.isArray(src) ? src[j] : src?.[j] ?? src?.[String(j)] ?? {};
      col.push({
        misfortune: !!cell.misfortune,
        state: !!cell.state,
        num: cell.num == null || cell.num === "" ? "12" : String(cell.num),
        debuf: !!cell.debuf
      });
    }
    cols.push(col);
  }
  return cols;
}

function normalizeGap(gap) {
  const out = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false };
  if (!gap) return out;
  for (let i = 0; i < 6; ++i)
    out[i] = !!(gap[i] ?? gap[String(i)]);
  return out;
}

// A V11 export's table is a plain object with all 6 column keys, each cell carrying
// all 4 fields. A single checkbox click submits a sparse diff like
// `{"3":{"5":{"state":true}}}`, and — since every specialty checkbox shares one
// <form> — even clicking just one submits EVERY cell's `.state`, but never
// `.misfortune` (no input binds it). Requiring `.misfortune` on a sample cell is
// what tells a genuine legacy blob apart from either kind of live form diff.
function looksLikeLegacyTable(table) {
  if (Array.isArray(table) || !table || typeof table !== "object") return false;
  if (![0, 1, 2, 3, 4, 5].every((i) => String(i) in table)) return false;
  const sample = table[0]?.[0];
  return !!sample && typeof sample === "object" && "misfortune" in sample;
}

/**
 * Foundry calls migrateData() on full documents at load AND on partial update
 * diffs, so this must never touch a field that isn't actually present in `source`
 * — doing so (e.g. defaulting an absent system.talent) would inject a blank grid
 * into an unrelated update (mana change, misfortune toggle) and wipe the real one.
 */
export function migrateActorSource(source) {
  if (!source || typeof source !== "object") return source;

  const system = source.system ?? source.data;
  if (system && typeof system === "object") {
    source.system = system;

    if (system.mana && typeof system.mana.value === "string") {
      system.mana.value = toNumber(system.mana.value, 0);
    }
    if (system.tmp_mana && typeof system.tmp_mana.value === "string") {
      system.tmp_mana.value = toNumber(system.tmp_mana.value, 0);
    }

    const talent = system.talent;
    if (talent && looksLikeLegacyTable(talent.table)) {
      talent.table = normalizeTalentTable(talent.table);
    }
  }

  const token = source.prototypeToken;
  if (token && typeof token === "object" && token.img) {
    token.texture = { ...(token.texture ?? {}), src: token.texture?.src || token.img };
    delete token.img;
  }

  return source;
}

function talentGridNeedsPersist(actor) {
  const stored = actor?._source?.system?.talent ?? actor?.system?.talent;
  const table = stored?.table;
  if (!table) return false;
  if (!Array.isArray(table)) return true;

  const refreshed = refreshTalentGrid({
    table: normalizeTalentTable(table),
    gap: normalizeGap(stored.gap),
    overflowX: !!stored.overflowX
  }).table;
  for (let i = 0; i < 6; ++i)
  for (let j = 0; j < 11; ++j) {
    if (String(table[i]?.[j]?.num) !== String(refreshed[i][j].num)) return true;
    if (!!table[i]?.[j]?.state !== !!refreshed[i][j].state) return true;
  }
  return false;
}

export async function runWorldMigration() {
  if (!game.user.isGM) return;
  const schema = game.settings.get("magicalogia", "schemaVersion") || 0;
  if (schema >= 2) return;

  for (const actor of game.actors) {
    if (actor.type !== "character") continue;

    const talent = actor.system.talent ?? {};
    const refreshed = refreshTalentGrid({
      table: normalizeTalentTable(talent.table),
      gap: normalizeGap(talent.gap),
      overflowX: !!talent.overflowX
    });

    const patch = {
      "system.talent.table": refreshed.table,
      "system.talent.gap": refreshed.gap,
      "system.mana.value": toNumber(actor.system.mana?.value, 0),
      "system.mana.min": toNumber(actor.system.mana?.min, 0),
      "system.mana.max": toNumber(actor.system.mana?.max, 0),
      "system.tmp_mana.value": toNumber(actor.system.tmp_mana?.value, 0),
      "system.tmp_mana.min": toNumber(actor.system.tmp_mana?.min, 0),
      "prototypeToken.bar1.attribute": "mana",
      "prototypeToken.bar2.attribute": "tmp_mana"
    };
    if (talentGridNeedsPersist(actor) || actor.prototypeToken?.bar1?.attribute !== "mana") {
      await actor.update(patch);
    }
  }

  await game.settings.set("magicalogia", "schemaVersion", 2);
  ui.notifications?.info(game.i18n.localize("MAGICALOGIA.TalentGridRebuilt"));
}
