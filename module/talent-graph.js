/**
 * Magicalogia specialty (talent) distance table.
 *
 * Checked specialties start at 5. Adjacent cells cost 1 (same column) or 2
 * (neighboring columns), unless a "gap" checkbox halves the column-change cost.
 * Pure function so it can be unit-tested outside Foundry.
 *
 * Foundry form submits turn the 6x11 grid into a nested object with string keys
 * (`{"0":{"0":{...}}}`). Every helper here accepts that shape or a real array.
 */

export function emptyTalentCell() {
  return { misfortune: false, state: false, num: "12", debuf: false };
}

export function normalizeTalentTable(table) {
  const cols = [];
  for (let i = 0; i < 6; i++) {
    const src = Array.isArray(table) ? table[i] : table?.[i] ?? table?.[String(i)];
    const col = [];
    for (let j = 0; j < 11; j++) {
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

export function normalizeGap(gap) {
  const out = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false };
  if (!gap) return out;
  for (let i = 0; i < 6; i++) {
    out[i] = !!(gap[i] ?? gap[String(i)]);
  }
  return out;
}

export function applyMisfortuneDebuf(table) {
  const next = normalizeTalentTable(table);
  const misfortuneState = next.map((col) => col.some((cell) => cell.misfortune));
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 11; j++) {
      next[i][j].debuf = misfortuneState[i];
    }
  }
  return next;
}

export function getTalentTable(table, gap, overflowX) {
  const next = normalizeTalentTable(table);
  const g = normalizeGap(gap);
  const nodes = [];

  for (let i = 0; i < 6; ++i) {
    for (let j = 0; j < 11; ++j) {
      if (next[i][j].misfortune === false && next[i][j].state === true) {
        nodes.push({ x: i, y: j });
        next[i][j].num = "5";
      } else {
        next[i][j].num = "12";
      }
    }
  }

  const dx = [0, 0, 1, -1];
  const dy = [1, -1, 0, 0];
  const move = [1, 1, 2, 2];

  for (let i = 0; i < nodes.length; ++i) {
    const queue = [nodes[i]];

    while (queue.length !== 0) {
      const now = queue.shift();
      if (+next[now.x][now.y].num === 12) continue;

      for (let d = 0; d < 4; ++d) {
        let nx = now.x + dx[d];
        const ny = now.y + dy[d];
        let m = move[d];

        if (overflowX && (nx < 0 || nx >= 6)) nx = nx < 0 ? 5 : 0;
        if (nx < 0 || nx >= 6 || ny < 0 || ny >= 11) continue;

        const blocked = ((now.x === 0 && nx === 5) || (now.x === 5 && nx === 0))
          ? g[0]
          : g[nx > now.x ? nx : now.x];
        if (m === 2 && blocked) m = 1;

        if (Number(next[nx][ny].num) > Number(next[now.x][now.y].num) + m) {
          next[nx][ny].num = String(Number(next[now.x][now.y].num) + m);
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return applyMisfortuneDebuf(next);
}

export function applyTalentPatch(currentTable, currentGap, currentOverflowX, talentChange) {
  let table = normalizeTalentTable(currentTable);
  let gap = normalizeGap(currentGap);
  let overflowX = !!currentOverflowX;
  const change = talentChange ?? {};

  if (change.table) {
    for (const i of Object.keys(change.table)) {
      for (const j of Object.keys(change.table[i])) {
        for (const key of Object.keys(change.table[i][j])) {
          table[Number(i)][Number(j)][key] = change.table[i][j][key];
        }
      }
    }
  }

  if (change.gap) {
    for (const i of Object.keys(change.gap)) {
      gap[Number(i)] = change.gap[i];
    }
  }

  if ("curiosity" in change && change.curiosity != 0) {
    gap = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false };
    gap[change.curiosity] = true;
    gap[change.curiosity - 1] = true;
    change.gap = { ...gap };
  }

  if ("overflowX" in change) overflowX = change.overflowX;

  return {
    table: getTalentTable(table, gap, overflowX),
    gap,
    overflowX
  };
}

export function refreshTalentGrid(talent) {
  const source = talent ?? {};
  const gap = normalizeGap(source.gap);
  const overflowX = !!source.overflowX;
  return {
    table: getTalentTable(source.table, gap, overflowX),
    gap,
    overflowX
  };
}
