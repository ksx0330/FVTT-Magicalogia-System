import { MagicalogiaActorSheet } from "./sheet/actor-sheet.js";
import { MagicalogiaItemSheet } from "./sheet/item-sheet.js";
import { MagicalogiaActor } from "./document/actor.js";
import { MagicalogiaSettings } from "./settings.js";
import { PlotSettings } from "./plot.js";
import { PlotDialog } from "./dialog/plot-dialog.js";
import { ActorItemToken } from "./document/token.js";
import { migrateActorSource, talentGridNeedsPersist } from "./migrate-actor.js";
import {
  Dialog,
  DocumentSheetConfig,
  ActorSheet,
  ItemSheet,
  asJQuery,
  deepClone,
  snapToGrid,
  addTokenControlTool,
  getSpeaker
} from "./compat.js";

Hooks.once("init", async function () {
  console.log("Initializing Magicalogia System (Foundry V14)");

  if (globalThis.Roll) {
    try {
      Roll.TOOLTIP_TEMPLATE = "systems/magicalogia/templates/tooltip.html";
    } catch (err) {
      console.warn("Magicalogia: could not set Roll.TOOLTIP_TEMPLATE", err);
    }
  }

  if (!ActorSheet || !ItemSheet || !Dialog) {
    throw new Error("Magicalogia 0.2.1 requires Foundry V13+ (foundry.appv1 sheets and Dialog).");
  }

  CONFIG.Actor.documentClass = MagicalogiaActor;
  CONFIG.Token.objectClass = ActorItemToken;

  const ActorDocument = foundry.documents?.Actor ?? globalThis.Actor;
  const ItemDocument = foundry.documents?.Item ?? globalThis.Item;

  if (DocumentSheetConfig) {
    DocumentSheetConfig.unregisterSheet(ActorDocument, "core", ActorSheet);
    DocumentSheetConfig.registerSheet(ActorDocument, "magicalogia", MagicalogiaActorSheet, {
      types: ["character"],
      makeDefault: true,
      label: "MAGICALOGIA.SheetClassCharacter"
    });
    DocumentSheetConfig.unregisterSheet(ItemDocument, "core", ItemSheet);
    DocumentSheetConfig.registerSheet(ItemDocument, "magicalogia", MagicalogiaItemSheet, {
      types: ["bond", "ability", "item", "handout"],
      makeDefault: true,
      label: "MAGICALOGIA.SheetClassItem"
    });
  } else {
    const ActorsCollection = foundry.documents.collections?.Actors ?? globalThis.Actors;
    const ItemsCollection = foundry.documents.collections?.Items ?? globalThis.Items;
    ActorsCollection.unregisterSheet("core", ActorSheet);
    ActorsCollection.registerSheet("magicalogia", MagicalogiaActorSheet, { makeDefault: true });
    ItemsCollection.unregisterSheet("core", ItemSheet);
    ItemsCollection.registerSheet("magicalogia", MagicalogiaItemSheet, { makeDefault: true });
  }

  CONFIG.Combat.initiative.formula = "1d6";
  MagicalogiaSettings.init();
  PlotSettings.initPlot();
});

Hooks.once("ready", async function () {
  const root = document.querySelector(".vtt.game") ?? document.body;
  if (!document.querySelector(".plot-bar")) {
    const hotbar = document.createElement("div");
    hotbar.className = "plot-bar";
    root.appendChild(hotbar);
  }

  if (!game.user.isGM) return;
  const schema = game.settings.get("magicalogia", "schemaVersion") || 0;
  if (schema >= 2) return;

  for (const actor of game.actors) {
    if (actor.type !== "character") continue;
    const cloned = migrateActorSource({
      system: foundry.utils.deepClone(actor.system),
      prototypeToken: foundry.utils.deepClone(actor.prototypeToken ?? {})
    });
    const patch = {
      "system.talent.table": cloned.system.talent.table,
      "system.talent.gap": cloned.system.talent.gap,
      "system.mana": cloned.system.mana,
      "system.tmp_mana": cloned.system.tmp_mana,
      "prototypeToken.bar1.attribute": "mana",
      "prototypeToken.bar2.attribute": "tmp_mana"
    };
    if (talentGridNeedsPersist(actor) || actor.prototypeToken?.bar1?.attribute !== "mana") {
      await actor.update(patch);
    }
  }

  await game.settings.set("magicalogia", "schemaVersion", 2);
  ui.notifications?.info("Magicalogia: rebuilt specialty target numbers on existing characters.");
});

Hooks.on("dropCanvasData", async (canvasApp, data) => {
  if (data.type !== "Item") return;

  const ItemDocument = foundry.documents?.Item ?? globalThis.Item;
  const item = await ItemDocument.implementation.fromDropData(data);
  if (item.type !== "handout") return;

  const pos = snapToGrid(data.x, data.y);
  const [token] = await canvasApp.scene.createEmbeddedDocuments("Token", [{
    name: item.name,
    x: pos.x,
    y: pos.y,
    texture: { src: item.img }
  }], {});
  await token.setFlag("magicalogia", "uuid", data.uuid);
});

Hooks.on("renderChatLog", (app, html) => chatListeners(html));
Hooks.on("renderChatPopout", (app, html) => chatListeners(html));
Hooks.on("updatePlotBar", (html) => chatListeners(html));

function actorFromSpeaker() {
  const speaker = getSpeaker();
  if (speaker.token) {
    const token = canvas.tokens?.get(speaker.token)
      ?? canvas.tokens?.placeables?.find((t) => t.id === speaker.token);
    if (token?.actor) return token.actor;
    const doc = game.scenes.current?.tokens.get(speaker.token);
    if (doc?.actor) return doc.actor;
  }
  if (speaker.actor) return game.actors.get(speaker.actor);
  return null;
}

async function chatListeners(html) {
  const $html = asJQuery(html);

  $html.on("click", ".roll-talent", async (event) => {
    event.preventDefault();
    const data = event.currentTarget.dataset;
    const actor = actorFromSpeaker();
    if (!actor) {
      new Dialog({
        title: game.i18n.localize("MAGICALOGIA.SelectActor"),
        content: `<p>${game.i18n.localize("MAGICALOGIA.MustUseActor")}</p>`,
        buttons: {}
      }).render(true);
      return;
    }

    let add = true;
    if (!event.ctrlKey && !game.settings.get("magicalogia", "rollAddon")) add = false;
    const secret = event.altKey;

    const tmpTitle = data.talent.split(game.i18n.localize("MAGICALOGIA.Tmp"));
    if (tmpTitle.length == 2) {
      let name_id = tmpTitle[0].trim() === "" ? Math.floor(Math.random() * 6) : null;
      if (name_id == null) {
        for (let i = 0; i < 6; ++i) {
          const name = String.fromCharCode(65 + i);
          let title = game.settings.get("magicalogia", `MAGICALOGIA.${name}1`);
          title = title !== "" ? title : game.i18n.localize(`MAGICALOGIA.${name}1`);
          if (title == tmpTitle[0].trim()) name_id = i;
        }
      }
      const id = Math.floor(Math.random() * 11) + 2;
      const name = String.fromCharCode(65 + name_id);
      let title = game.settings.get("magicalogia", `MAGICALOGIA.${name}${id}`);
      title = title !== "" ? title : game.i18n.localize(`MAGICALOGIA.${name}${id}`);
      const num = actor.system.talent.table[name_id][id - 2].num;
      return actor.rollTalent(title, num, add, secret);
    }

    for (let i = 2; i <= 12; ++i) {
      for (let j = 0; j < 6; ++j) {
        const name = String.fromCharCode(65 + j);
        let title = game.settings.get("magicalogia", `MAGICALOGIA.${name}${i}`);
        title = title !== "" ? title : game.i18n.localize(`MAGICALOGIA.${name}${i}`);
        if (title === data.talent) {
          const num = actor.system.talent.table[j][i - 2].num;
          return actor.rollTalent(title, num, add, secret);
        }
      }
    }
  });

  $html.on("click", ".plot-dialog", async (ev) => {
    ev.preventDefault();
    const data = ev.currentTarget.dataset;
    const dice = data.dice.split(",");
    const d = new PlotDialog(data.actorId, data.name, data.sender, dice).render(true);
    game.magicalogia.plotDialogs.push(d);
  });
}

function currentMagicZone(scene) {
  return deepClone(scene?.flags?.magicalogia?.magicZone ?? {});
}

async function writeMagicZone(scene, magicZone) {
  await scene.update({ "flags.magicalogia.magicZone": magicZone });
}

Hooks.on("getSceneControlButtons", (controls) => {
  addTokenControlTool(controls, {
    name: "startBattle",
    title: game.i18n.localize("MAGICALOGIA.StartMagicBattle"),
    icon: "fas fa-star-of-david",
    visible: game.user.isGM,
    button: true,
    onClick: () => {
      const makeZone = async () => {
        const targets = game.user.targets;
        if (targets.size != 2) return;

        const data = {};
        const actors = Array.from(targets, (t) => t.actor).filter(Boolean);

        for (const actor of actors) {
          data[actor.id] = [];
          await game.user.updateTokenTargets();
          await Dialog.prompt({
            title: game.i18n.localize("MAGICALOGIA.SelectObserver"),
            content: `<h2>${actor.name}: ${game.i18n.localize("MAGICALOGIA.SelectObserver")}</h2>`,
            callback: () => {
              for (const t of game.user.targets) data[actor.id].push(t.actor.id);
            }
          });
        }

        const scene = game.scenes.current;
        const magicZone = currentMagicZone(scene);
        const key = actors.map((a) => a.id).sort().join("-");
        magicZone[key] = data;
        await writeMagicZone(scene, magicZone);
      };

      Dialog.prompt({
        title: game.i18n.localize("MAGICALOGIA.SelectZomeTarget"),
        content: `<h2>${game.i18n.localize("MAGICALOGIA.SelectZomeTarget")}</h2>`,
        callback: () => makeZone()
      });
    }
  });

  addTokenControlTool(controls, {
    name: "endBattle",
    title: game.i18n.localize("MAGICALOGIA.StopMagicBattle"),
    icon: "fas fa-star-of-david",
    visible: game.user.isGM,
    button: true,
    onClick: () => {
      const scene = game.scenes.current;
      const magicZone = currentMagicZone(scene);

      if (Object.keys(magicZone).length == 0) {
        Dialog.prompt({
          title: game.i18n.localize("MAGICALOGIA.NotStopBattle"),
          content: `<h2>${game.i18n.localize("MAGICALOGIA.NotStopBattle")}</h2>`,
          callback: () => {}
        });
        return;
      }

      let content = `<p>${game.i18n.localize("MAGICALOGIA.SelectBattle")}<br><div>`;
      content += '<select id="battle-select-dialog" multiple style="width: 100%; height: 100%">';
      for (const pair of Object.keys(magicZone)) {
        const [idA, idB] = pair.split("-");
        const actors = [game.actors.get(idA), game.actors.get(idB)];
        if (!actors[0] || !actors[1]) {
          delete magicZone[pair];
          continue;
        }
        content += `<option value="${pair}">${actors[0].name} - ${actors[1].name}</option>`;
      }
      content += "</select></div>";

      Dialog.prompt({
        title: game.i18n.localize("MAGICALOGIA.SelectBattle"),
        content,
        callback: async (html) => {
          const $html = asJQuery(html);
          const selected = $html.find("#battle-select-dialog").val()
            ?? $("#battle-select-dialog").val();
          for (const s of selected ?? []) delete magicZone[s];
          await writeMagicZone(scene, magicZone);
        }
      });
    }
  });
});
