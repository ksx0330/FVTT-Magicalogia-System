import { PlotDialog } from "./dialog/plot-dialog.js";
import { Dialog, createChatMessage, getSpeaker, evaluateRoll } from "./compat.js";

export class PlotSettings {
  static initPlot() {
    game.magicalogia = {
      plot: [],
      plotDialogs: []
    };

    game.socket.on("system.magicalogia", ({ id, sender, receiver, data }) => {
      if (id === "release") Hooks.call("releasePlot");
      if (game.user.id != receiver) return;

      if (id === "req") {
        const d = new PlotDialog(data.actorId, data.name, sender, data.dice).render(true);
        game.magicalogia.plotDialogs.push(d);
        Hooks.call("setPlotBar", data.actorId, data.name, sender, data.dice);
      } else if (id === "resp") {
        const plot = game.magicalogia.plot.find((a) => a.actorId === data.actorId);
        if (!plot) return;
        plot.ready = data.ready;
        plot.dice = data.dice;
        Hooks.call("checkPlot");
      }
    });

    Hooks.on("initPlot", (list) => {
      game.magicalogia.plot = list.map((i) => ({
        actorId: i.actorId,
        name: i.name,
        role: i.role,
        dice: i.dice,
        ready: false
      }));
    });

    Hooks.on("spreadPlot", () => {
      for (const plot of game.magicalogia.plot) {
        let share = null;
        for (const user of game.users) {
          if (user.active && user.isGM) {
            share = user.id;
            break;
          }
        }
        for (const user of game.users) {
          if (user.active && user.character != null && user.character.id === plot.actorId) {
            share = user.id;
            break;
          }
        }

        if (share == game.user.id) {
          const d = new PlotDialog(plot.actorId, plot.name, game.user.id, plot.dice).render(true);
          game.magicalogia.plotDialogs.push(d);
          Hooks.call("setPlotBar", plot.actorId, plot.name, game.user.id, plot.dice);
        } else {
          game.socket.emit("system.magicalogia", {
            id: "req",
            sender: game.user.id,
            receiver: share,
            data: { actorId: plot.actorId, name: plot.name, dice: plot.dice }
          });
        }
      }
    });

    Hooks.on("setPlotBar", (actorId, name, sender, dice) => {
      const plotBar = $(document).find(".plot-bar");
      if (!plotBar.length) return;

      const serializeDice = dice.join(",");
      const plot = $(`
                <div class="chat-message message flexcol item">
                  <span class="remove-bar"><a class="remove-btn"><i class="fas fa-trash"></i></a></span>
                  <h2>${name}</h2>
                  <button type="button" class="plot-dialog"
                    data-actor-id="${actorId}"
                    data-name="${name}"
                    data-sender="${sender}"
                    data-dice="${serializeDice}"
                    >PLOT</button>
                </div>`);

      plot.on("click", ".remove-btn", (ev) => {
        ev.preventDefault();
        ev.currentTarget.closest(".chat-message")?.remove();
      });

      plotBar.append(plot);
      Hooks.call("updatePlotBar", plot);
    });

    Hooks.on("checkPlot", () => {
      for (const plot of game.magicalogia.plot) {
        if (!plot.ready) return;
      }

      const reveal = async () => {
        Hooks.call("releasePlot");
        game.socket.emit("system.magicalogia", { id: "release" });

        let content = `<table style="text-align: center">`;
        for (const l of game.magicalogia.plot) {
          content += `<tr><th>${l.role}</th><th>${l.name}</th></tr><tr><td colspan="2" class="dice-lists dice-lists-sm">`;
          for (let index = 0; index < l.dice.length; index++) {
            let d = l.dice[index];
            if (d == "?") {
              const rolled = await evaluateRoll("1d6");
              l.dice[index] = rolled.total;
              content += `<div class="random">${rolled.total}</div> `;
            } else {
              content += `<div>${d}</div> `;
            }
          }
          content += `</td></tr>`;
        }
        content += `</table>`;
        await createChatMessage({ content, speaker: getSpeaker({ alias: "PLOT" }) });
      };

      new Dialog({
        title: game.i18n.localize("MAGICALOGIA.RevealPlot"),
        content: "",
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("MAGICALOGIA.Confirm"),
            callback: reveal
          }
        }
      }).render(true);
    });

    Hooks.on("releasePlot", () => {
      for (const d of game.magicalogia.plotDialogs) d.close();
      game.magicalogia.plotDialogs = [];
      $(document).find(".plot-bar").empty();
    });
  }
}
