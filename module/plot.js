// import { ActorListDialog } from "./dialog/actor-list-dialog.js";
import { PlotDialog } from "./dialog/plot-dialog.js";

export class PlotSettings {
    static initPlot() {
        game.magicalogia = {
            plot: [],
            plotDialogs: []
        }

        game.socket.on("system.magicalogia", ({id, sender, receiver, data}) => {
            if (id === "release")
                Hooks.call("releasePlot");
            
            if (game.user.id != receiver)
                return;
                
            if (id === "req") {

                let d = new PlotDialog(data.actorId, data.name, sender, data.dice).render(true);
                game.magicalogia.plotDialogs.push(d);

                Hooks.call("setPlotBar", data.actorId, data.name, sender, data.dice);
                
            } else if (id === "resp") {
                let plot = game.magicalogia.plot.find(a => (a.actorId === data.actorId));
                plot.ready = data.ready;
                plot.dice = data.dice;
                
                Hooks.call("checkPlot");
            }
        
        });

        Hooks.on("initPlot", (list) => {
            game.magicalogia.plot = [];
            list.forEach(i => 
                game.magicalogia.plot.push({
                    actorId: i.actorId,
                    name: i.name,
                    role: i.role,
                    dice: i.dice,
                    ready: false
                })
            );

        });

        Hooks.on("spreadPlot", () => {
            let plots = game.magicalogia.plot;
            for (let plot of plots) {

                let share = null;
                for (let user of game.users)
                    if (user.active && user.isGM) {
                        share = user.id;
                        break;
                    }
                
                for (let user of game.users)
                    if (user.active && user.character != null && user.character.id === plot.actorId) {
                        share = user.id;
                        break;
                    }

                if (share == game.user.id) {
                    let d = new PlotDialog(plot.actorId, plot.name, game.user.id, plot.dice).render(true);
                    game.magicalogia.plotDialogs.push(d);

                    Hooks.call("setPlotBar", plot.actorId, plot.name, game.user.id, plot.dice);
                } else
                    game.socket.emit("system.magicalogia", {id: "req", sender: game.user.id, receiver: share, data: { actorId: plot.actorId, name: plot.name, dice: plot.dice } });
            }
            
        });

        Hooks.on("setPlotBar", (actorId, name, sender, dice) => {
            let plotBar = $(document).find(".plot-bar");
            if (plotBar == null)
                return;

            let serializeDice = dice.join(",");
            let content = `
                <h2>${name}</h2>
                <button type="button" class="plot-dialog" 
                    data-actor-id="${actorId}" 
                    data-name="${name}"
                    data-sender="${sender}"
                    data-dice="${serializeDice}"
                    >PLOT</button>
                `

            let plot = $(`
                <div class="chat-message message flexcol item">
                  <span class="remove-bar"><a class="remove-btn"><i class="fas fa-trash"></i></a></span>
                  ${content}
                </div>`);

            plot.on("click", ".remove-btn", ev => {
                event.preventDefault();
                const target = ev.currentTarget.closest(".chat-message");
                target.remove();
            });

            plotBar.append(plot);
            Hooks.call("updatePlotBar", plot);
        });

        Hooks.on("checkPlot", () => {
            for (let plot of game.magicalogia.plot.values())
                if (!plot.ready)
                    return;
                    
            let reveal = async () => {
                Hooks.call("releasePlot");
                game.socket.emit("system.magicalogia", {id: "release"});

                let content = `<table style="text-align: center">`;
                for (let l of game.magicalogia.plot) {
                    content += `<tr><th>${l.role}</th><th>${l.name}</th></tr><tr><td colspan="2" class="dice-lists dice-lists-sm">`
                    for (let [index, d] of l.dice.entries()) {
                        if (d == "?") {
                            d = new Roll("1d6");
                            await d.roll({async: true});
                            l.dice[index] = d.total;
                            content += `<div class="random">${d.total}</div> `
                        } else
                            content += `<div>${d}</div> `
                    }
                    content += `</td></tr>`;
                }
                content += `</table>`;
                
                let chatData = {"content": content, "speaker": ChatMessage.getSpeaker({ alias: "PLOT" })};
                ChatMessage.create(chatData);
            };

            new Dialog({
                title: "Reveal?",
                content: "",
                buttons: {
                    "confirm": {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Confirm",
                        callback: reveal
                    }
                }
            }).render(true);
            
        });
        
        Hooks.on("releasePlot", () => {
           for (let d of game.magicalogia.plotDialogs)
                d.close();
            game.magicalogia.plotDialogs = [];
            $(document).find(".plot-bar").empty();
        });




    }

}