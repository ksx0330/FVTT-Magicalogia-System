import { refreshTalentGrid } from "./talent-graph.js";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Rewrite a Foundry actor source blob so V14 Magicalogia can load it.
 * Safe to run in Node (JSON files) or inside Foundry (live documents).
 */
export function migrateActorSource(source) {
  if (!source || typeof source !== "object") return source;

  const system = source.system ?? source.data ?? {};
  source.system = system;

  system.mana = {
    value: toNumber(system.mana?.value, 0),
    min: toNumber(system.mana?.min, 0),
    max: toNumber(system.mana?.max, 0)
  };
  system.tmp_mana = {
    value: toNumber(system.tmp_mana?.value, 0),
    min: toNumber(system.tmp_mana?.min, 0)
  };

  const talent = system.talent ?? {};
  const refreshed = refreshTalentGrid(talent);
  system.talent = {
    ...talent,
    table: refreshed.table,
    gap: refreshed.gap,
    overflowX: refreshed.overflowX,
    curiosity: toNumber(talent.curiosity, 0),
    spirit_talent: talent.spirit_talent ?? { name: "", misfortune: false },
    subTitle: talent.subTitle ?? { id: "", title: "", state: false }
  };

  const token = source.prototypeToken;
  if (token && typeof token === "object") {
    token.bar1 = { ...(token.bar1 ?? {}), attribute: "mana" };
    token.bar2 = { ...(token.bar2 ?? {}), attribute: "tmp_mana" };
    if (token.img && !token.texture) {
      token.texture = { src: token.img };
      delete token.img;
    } else if (token.img && token.texture && !token.texture.src) {
      token.texture.src = token.img;
      delete token.img;
    } else if (token.img && token.texture?.src) {
      delete token.img;
    }
  }

  if (source._stats) {
    source._stats.systemId = "magicalogia";
    source._stats.systemVersion = "0.2.1";
  }

  const uuid = source._stats?.exportSource?.uuid;
  if (!source._id && typeof uuid === "string" && uuid.startsWith("Actor.")) {
    source._id = uuid.slice("Actor.".length);
  }

  return source;
}

export function talentGridNeedsPersist(actor) {
  const table = actor?.system?.talent?.table;
  if (!table) return false;
  if (!Array.isArray(table)) return true;
  const refreshed = refreshTalentGrid(actor.system.talent).table;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 11; j++) {
      if (String(table[i]?.[j]?.num) !== String(refreshed[i][j].num)) return true;
      if (!!table[i]?.[j]?.state !== !!refreshed[i][j].state) return true;
    }
  }
  return false;
}
