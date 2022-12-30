/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { MagicalogiaActorSheet } from "./sheet/actor-sheet.js";
import { MagicalogiaItemSheet } from "./sheet/item-sheet.js";
import { MagicalogiaActor } from "./document/actor.js";
import { MagicalogiaSettings } from "./settings.js";
import { PlotSettings } from "./plot.js";
import { PlotDialog } from "./dialog/plot-dialog.js";

import { ActorItemToken } from "./document/token.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
    console.log(`Initializing Simple Magicalogia System`);

    CONFIG.Actor.documentClass = MagicalogiaActor;
    CONFIG.Token.objectClass = ActorItemToken;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("magicalogia", MagicalogiaActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("magicalogia", MagicalogiaItemSheet, {makeDefault: true});

    // CONFIG.Combat.documentClass = PlotCombat;
    CONFIG.Combat.initiative.formula = "1d6";
    MagicalogiaSettings.init();
    
    PlotSettings.initPlot();

});


Hooks.once("ready", async function() {
    let basedoc = document.getElementsByClassName("vtt game system-magicalogia");
    let hotbar = document.createElement("div");
    hotbar.className = "plot-bar";

    basedoc[0].appendChild(hotbar);
});

Hooks.on("dropCanvasData", async (canvas, data) => {
    if (data.type == "Item") {
        let item = await Item.implementation.fromDropData(data);
        if (item.type != "handout")
            return;

        const hw = canvas.grid.w / 2;
        const hh = canvas.grid.h / 2;
        const pos = canvas.grid.getSnappedPosition(data.x - hw, data.y - hh);

        const token = (await canvas.scene.createEmbeddedDocuments("Token", [{name: item.name, img: item.img, x: pos.x, y: pos.y}], {}))[0];
        await token.setFlag("magicalogia", "uuid", data.uuid);
    }

});

Hooks.on("renderChatLog", (app, html, data) => chatListeners(html));
Hooks.on("renderChatPopout", (app, html, data) => chatListeners(html));
Hooks.on("updatePlotBar", (html) => chatListeners(html));

async function chatListeners(html) {
    html.on('click', '.roll-talent', async ev => {
        event.preventDefault();
        const data = ev.currentTarget.dataset;
        const speaker = ChatMessage.getSpeaker();
        let actor = null;
        
        if (speaker.token != null)
            actor = canvas.tokens.objects.children.find(e => e.id == speaker.token).actor;
        else if (speaker.actor != null)
            actor = game.actors.get(speaker.actor);
        else {
            new Dialog({
                title: "alert",
                content: `You must use actor`,
                buttons: {}
            }).render(true);
            return;
        }
        
        let add = true;
        if (!event.ctrlKey && !game.settings.get("magicalogia", "rollAddon"))
          add = false;

        let secret = false;
        if (event.altKey)
          secret = true;
        
        for (var i = 2; i <= 12; ++i)
        for (var j = 0; j < 6; ++j) {
            let name = String.fromCharCode(65 + j);
            let title = game.settings.get("magicalogia", `MAGICALOGIA.${name}${i}`);
            title = (title !== "") ? title : game.i18n.localize(`MAGICALOGIA.${name}${i}`);
            
            if (title === data.talent) {
                let num = actor.system.talent.table[j][i - 2].num;
                let misfortune = actor.system.talent.table[j][i - 2].misfortune;
                
                return actor.rollTalent(title, num, add, secret, misfortune);
            }
        }
        
        new Dialog({
            title: "alert",
            content: `Error ${data.talent}`,
            buttons: {}
        }).render(true);
        return;
    });


    html.on('click', '.plot-dialog', async ev => {
        event.preventDefault();
        const data = ev.currentTarget.dataset;

        const dice = data.dice.split(",");
        let d = new PlotDialog(data.actorId, data.name, data.sender, dice).render(true);
        game.magicalogia.plotDialogs.push(d);

    });
}


Hooks.on("getSceneControlButtons", function(controls) {
    controls[0].tools.push({
        name: "startBattle",
        title: game.i18n.localize("MAGICALOGIA.StartMagicBattle"),
        icon: "fas fa-star-of-david",
        visible: game.user.isGM,
        onClick: () => {
            let makeZone = async () => {
                let targets = game.user.targets;
                if (targets.size != 2)
                    return;

                let data = {};
                let actors = targets.reduce((acc, t) => {
                    acc.push(t.actor);
                    return acc;
                }, []);

                for (let actor of actors) {
                    data[actor.id] = [];

                    await game.user.updateTokenTargets();
                    await Dialog.prompt({
                        title: game.i18n.localize("MAGICALOGIA.SelectObserver"),
                        content: `
                          <h2>
                            ${actor.name}: ${game.i18n.localize("MAGICALOGIA.SelectObserver")}
                          </h2>
                        `,
                        callback: () => {
                            for (let t of game.user.targets)
                                data[actor.id].push(t.actor.id);
                        }
                    });

                }

                let scene = game.scenes.current;
                let magicZone = {};
                if ("magicalogia" in scene.flags && "magicZone" in scene.flags["magicalogia"])
                    magicZone = duplicate(scene.flags["magicalogia"].magicZone);

                let key = actors.map((a) => a.id).sort().join("-");
                magicZone[key] = data;

                console.log(magicZone);
                await scene.setFlag("magicalogia", "magicZone", magicZone);
            }

            Dialog.prompt({
                title: game.i18n.localize("MAGICALOGIA.SelectZomeTarget"),
                content: `
                  <h2>
                    ${game.i18n.localize("MAGICALOGIA.SelectZomeTarget")}
                  </h2>
                `,
                callback: () => makeZone()
            });

        },
        button: true
    });

    controls[0].tools.push({
        name: "endBattle",
        title: game.i18n.localize("MAGICALOGIA.StopMagicBattle"),
        icon: "fas fa-star-of-david",
        visible: game.user.isGM,
        onClick: () => {
            let scene = game.scenes.current;
            let magicZone = {};
            if ("magicalogia" in scene.flags && "magicZone" in scene.flags["magicalogia"])
                magicZone = duplicate(scene.flags["magicalogia"].magicZone);

            if (Object.keys(magicZone).length == 0) {
                Dialog.prompt({
                    title: game.i18n.localize("MAGICALOGIA.NotStopBattle"),
                    content: `
                      <h2>
                        ${game.i18n.localize("MAGICALOGIA.NotStopBattle")}
                      </h2>
                    `,
                    callback: () => console.log("Cancel")
                });
                return;
            }


            let content = `<p>${game.i18n.localize("MAGICALOGIA.SelectBattle")}<br><div>`;
            content += '<select id="battle-select-dialog" multiple style="width: 100%; height: 100%">';
    
            for (let pair of Object.keys(magicZone)) {
                let name = pair.split("-");
                let actors = [game.actors.get(name[0]), game.actors.get(name[1])];
                if (actors[0] == undefined || actors[1] == undefined) {
                    magicZone[`-=${pair}`] = {};
                    continue;
                }

                content += `<option value="${pair}">${actors[0].name} - ${actors[1].name}</option>`;
            }
            content += '</select></div>';


            Dialog.prompt({
                title: game.i18n.localize("MAGICALOGIA.SelectBattle"),
                content: content,
                callback: async () => {
                    let selected = $("#battle-select-dialog").val();
                    for (let s of selected) 
                        magicZone[`-=${s}`] = {};

                    await scene.setFlag("magicalogia", "magicZone", magicZone);

                }
            });

        },
        button: true
    });







});