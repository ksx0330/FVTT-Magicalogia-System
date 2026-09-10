import { migrateActorSource } from "../migrate.js";
import { Dialog, createChatMessage, getSpeaker, getWhisperRecipients, evaluateRoll, renderTemplate } from "../compat.js";

const ActorDocument = globalThis.foundry?.documents?.Actor ?? globalThis.Actor;

function applyMisfortuneDebuf(table) {
  const misfortuneState = table.map((col) => col.some((cell) => cell.misfortune));
  for (let i = 0; i < 6; ++i)
  for (let j = 0; j < 11; ++j)
    table[i][j].debuf = misfortuneState[i];
  return table;
}

/**
 * Checked specialties start at 5. Adjacent cells cost 1 (same column) or 2
 * (neighboring columns), unless a "gap" checkbox halves the column-change cost.
 * Assumes a clean 6x11 array and fully-keyed gap; old-shaped data is migrate.js's job.
 */
function getTalentTable(table, gap, overflowX) {
  const next = table.map((col) => col.map((cell) => ({ ...cell })));
  const nodes = [];

  for (let i = 0; i < 6; ++i)
  for (let j = 0; j < 11; ++j) {
    if (next[i][j].misfortune == false && next[i][j].state == true) {
      nodes.push({ x: i, y: j });
      next[i][j].num = "5";
    } else
      next[i][j].num = "12";
  }

  const dx = [0, 0, 1, -1];
  const dy = [1, -1, 0, 0];
  const move = [1, 1, 2, 2];

  for (let i = 0; i < nodes.length; ++i) {
    const queue = [nodes[i]];

    while (queue.length != 0) {
      const now = queue.shift();

      if (+next[now.x][now.y].num == 12)
        continue;

      for (let d = 0; d < 4; ++d) {
        let nx = now.x + dx[d];
        const ny = now.y + dy[d];
        let m = move[d];

        if (overflowX && (nx < 0 || nx >= 6))
          nx = (nx < 0) ? 5 : 0;

        if (nx < 0 || nx >= 6 || ny < 0 || ny >= 11)
          continue;

        const blocked = ((now.x == 0 && nx == 5) || (now.x == 5 && nx == 0)) ? gap[0] : gap[(nx > now.x) ? nx : now.x];
        if (m == 2 && blocked)
          m = 1;

        if (Number(next[nx][ny].num) > Number(next[now.x][now.y].num) + m) {
          next[nx][ny].num = String(Number(next[now.x][now.y].num) + m);
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return applyMisfortuneDebuf(next);
}

export function refreshTalentGrid(talent) {
  const source = talent ?? {};
  const overflowX = !!source.overflowX;
  return { table: getTalentTable(source.table, source.gap, overflowX), gap: source.gap, overflowX };
}

export class MagicalogiaActor extends ActorDocument {

  // Runs before prepareData on every document load — the earliest point to repair pre-V14 data (module/migrate.js).
  static migrateData(source) {
    if (typeof super.migrateData === "function") {
      source = super.migrateData(source) ?? source;
    }
    return migrateActorSource(source);
  }

  prepareData() {
    super.prepareData();

    const talent = this.system?.talent;
    if (!talent) return;

    const refreshed = refreshTalentGrid(talent);
    this.system.talent.table = refreshed.table;
    this.system.talent.gap = refreshed.gap;
    this.system.talent.overflowX = refreshed.overflowX;
  }

  // Foundry submits even a single checkbox edit as a sparse diff keyed by index
  // (`{"3":{"5":{"state":true}}}`); merge it in and recompute target numbers.
  async _preUpdate(changed, options, user) {
    if (changed.system?.talent) {
      const talentChange = changed.system.talent;
      const table = this.system.talent.table.map((col) => col.map((cell) => ({ ...cell })));
      let gap = { ...this.system.talent.gap };
      let overflowX = !!this.system.talent.overflowX;

      if (talentChange.table) {
        for (const i of Object.keys(talentChange.table))
        for (const j of Object.keys(talentChange.table[i]))
        for (const key of Object.keys(talentChange.table[i][j]))
          table[Number(i)][Number(j)][key] = talentChange.table[i][j][key];
      }

      if (talentChange.gap) {
        for (const i of Object.keys(talentChange.gap))
          gap[Number(i)] = talentChange.gap[i];
      }

      // curiosity's <select> lives in the same <form> as the gap checkboxes, so it
      // rides along on every submit — only re-derive gap when it actually changed,
      // or a plain gap click gets clobbered by the unchanged curiosity value.
      if ("curiosity" in talentChange && talentChange.curiosity != 0
        && Number(talentChange.curiosity) !== Number(this.system.talent.curiosity)) {
        gap = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false };
        gap[talentChange.curiosity] = true;
        gap[talentChange.curiosity - 1] = true;
        changed.system.talent.gap = { ...gap };
      }

      if ("overflowX" in talentChange)
        overflowX = talentChange.overflowX;

      changed.system.talent.table = getTalentTable(table, gap, overflowX);
    }

    return super._preUpdate(changed, options, user);
  }

  async rollTalent(title, num, add, secret, debuf = false) {
    if (!add) {
      return this._onRollDice(title, num, null, secret, debuf);
    }

    return Dialog.prompt({
      title: game.i18n.localize("MAGICALOGIA.RollAddonPrompt"),
      content: `<p><input type="text" name="add" value="0" autofocus></p>`,
      label: game.i18n.localize("MAGICALOGIA.Confirm"),
      callback: (html) => {
        const $html = html.jquery ? html : $(html);
        const value = $html.find('[name="add"]').val();
        return this._onRollDice(title, num, value, secret, debuf);
      }
    });
  }

  async _onRollDice(title, num, add, secret, debuf = false) {
    const chatData = {
      author: game.user.id,
      speaker: getSpeaker({ actor: this }),
      flavor: `<h2><b>${title}</b></h2>`
    };

    const rollMode = secret ? "gmroll" : game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData.whisper = getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData.whisper = [game.user.id];
    if (rollMode === "blindroll") chatData.blind = true;

    let formula = "2d6";
    if (add != null && add !== "") formula += Number(add) < 0 ? `${add}` : `+${add}`;
    if (debuf) formula += "-1";

    const roll = await evaluateRoll(formula);
    const diceTotal = roll.terms[0]?.total;

    chatData.content = await renderTemplate("systems/magicalogia/templates/roll.html", {
      formula: roll.formula,
      flavor: null,
      user: game.user.id,
      tooltip: await roll.getTooltip(),
      total: Math.round(roll.total * 100) / 100,
      special: diceTotal == 12,
      fumble: diceTotal == 2,
      num
    });

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind);
    } else {
      chatData.sound = CONFIG.sounds.dice;
    }
    return createChatMessage(chatData);
  }

  _echoItemDescription(itemId) {
    const item = this.items.get(itemId);
    if (!item) return;

    let title = item.name;
    let description = item.system.description ?? "";

    if (item.type === "ability") {
      title = `<img src="${item.img}" width="28" height="28">&nbsp;&nbsp;<b>${title}</b>`;
      description = `<table style="text-align: center;">
                      <tr>
                        <th>${game.i18n.localize("MAGICALOGIA.Type")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Talent")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Target")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Cost")}</th>
                      </tr>
                      <tr>
                        <td>${item.system.type}</td>
                        <td>${item.system.talent}</td>
                        <td>${item.system.target}</td>
                        <td>${item.system.cost}</td>
                      </tr>
                    </table>${description}`;

      if (item.system.talent !== "") {
        description += `<button type="button" class="roll-talent" data-talent="${item.system.talent}">${item.system.talent}</button>`;
      }
    } else if (item.type === "bond") {
      title = `<img src="${item.img}" width="28" height="28">&nbsp;&nbsp;<b>${title}</b>`;
      description = `<table style="text-align: center;">
                      <tr>
                        <th>${game.i18n.localize("MAGICALOGIA.Destiny")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Attribute")}</th>
                      </tr>
                      <tr>
                        <td>${item.system.destiny}</td>
                        <td>${item.system.attribute}</td>
                      </tr>
                    </table>${description}`;
    } else if (item.type === "item") {
      title = `<img src="${item.img}" width="28" height="28">&nbsp;&nbsp;<b>${title}</b>`;
      description = `<table style="text-align: center;">
                      <tr>
                        <th>${game.i18n.localize("MAGICALOGIA.Requirement")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.RequireExp")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Quantity")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Format")}</th>
                      </tr>
                      <tr>
                        <td>${item.system.requirement}</td>
                        <td>${item.system.require_exp}</td>
                        <td>${item.system.quantity}</td>
                        <td>${item.system.format}</td>
                      </tr>
                    </table>${description}`;
    }

    return createChatMessage({
      author: game.user.id,
      speaker: getSpeaker({ actor: this }),
      content: `<div data-actor-id="${this.id}" data-item-id="${itemId}"><h2 style="display: flex; padding-bottom: 2px;">${title}</h2>${description}</div>`
    });
  }

}
