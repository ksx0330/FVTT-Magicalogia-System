import { refreshTalentGrid, applyTalentPatch } from "../talent-graph.js";
import { migrateActorSource } from "../migrate-actor.js";
import { Dialog, createChatMessage, getSpeaker, getWhisperRecipients, evaluateRoll, renderTemplate } from "../compat.js";

const ActorDocument = globalThis.foundry?.documents?.Actor ?? globalThis.Actor;

export class MagicalogiaActor extends ActorDocument {

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

  /**
   * Recalculate specialty target numbers whenever the talent grid changes.
   * Accepts both array grids and the object-keyed grids Foundry form submits.
   */
  async _preUpdate(changed, options, user) {
    if (changed.system?.talent) {
      const talentChange = changed.system.talent;
      const result = applyTalentPatch(
        this.system.talent.table,
        this.system.talent.gap,
        this.system.talent.overflowX,
        talentChange
      );
      changed.system.talent.table = result.table;
      if (talentChange.curiosity != 0 && talentChange.gap) {
        changed.system.talent.gap = talentChange.gap;
      }
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
