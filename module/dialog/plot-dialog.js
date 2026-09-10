import { Dialog, mergeObject, asJQuery, createChatMessage, getSpeaker } from "../compat.js";

export class PlotDialog extends Dialog {

  constructor(actorId, name, receiver, plot, options) {
    super({
      title: "Plot Dialog",
      content: "",
      buttons: {}
    }, options);

    this.actorId = actorId;
    this.name = name;
    this.receiver = receiver;
    this.ready = false;
    this.plot = plot;
    this.select = null;
    this.data.content = this._getContent();
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dialog", "magicalogia"],
      width: 400
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".plot").click(this._selectDice.bind(this));
    html.find(".select").click(this._swapDice.bind(this));
    html.find(".add-dice").click(this._addDice.bind(this));
    html.find(".remove-dice").click(this._removeDice.bind(this));
    html.find(".share-plot").click(this._sharePlot.bind(this));
    html.find("#ready").click(this._ready.bind(this));
  }

  _getContent() {
    let content = `
        <h2 class="plot-header">${this.name}
          <div class="dice-controls" style="float: right">
            <button type="button" class="add-dice">
              <i class="fas fa-plus"></i>
            </button>
            <button type="button" class="remove-dice">
              <i class="fas fa-minus"></i>
            </button>`;

    if (game.user.isGM) {
      content += `
        <button type="button" class="share-plot">
          <i class="fas fa-share"></i>
        </button>`;
    }

    content += `</div></h2><div id="plot-dices" class="dice-lists dice-lists-md">`;
    for (let i = 0; i < this.plot.length; ++i) {
      content += `<div class="plot" data-index="${i}">?</div> `;
    }
    content += `</div><hr><div id="select-dices" class="dice-lists dice-lists-md">`;

    for (const d of ["1", "2", "3", "4", "5", "6", "?"]) {
      content += `<div class="select" data-num="${d}">${d}</div>`;
    }

    content += `</div><hr><button type="button" class="await" id="ready">Ready</button>`;
    return content;
  }

  _addDice(event) {
    event.preventDefault();
    $(event.currentTarget.closest(".dialog-content")).find("#plot-dices").append(
      `<div class="plot dice" data-index="${this.plot.length}">?</div> `
    );
    this.plot.push("?");
    $(event.currentTarget.closest(".dialog-content")).find(".plot").last().click(this._selectDice.bind(this));
  }

  _removeDice(event) {
    event.preventDefault();
    this.plot.pop();
    $(event.currentTarget.closest(".dialog-content")).find(".plot").last().remove();
  }

  _sharePlot(event) {
    event.preventDefault();

    const userList = game.users.filter((user) => user.active && user.id != game.user.id);
    let content = `<div class="share-dialog">`;
    for (const user of userList) {
      content += `
        <div class="user-item">
          <label>
            <input type="radio" name="share_user" value="${user.id}" />
            ${user.name}
          </label>
        </div>`;
    }
    content += `</div>`;

    new Dialog({
      title: game.i18n.localize("MAGICALOGIA.SelectUser"),
      content,
      buttons: {
        one: {
          icon: '<i class="fas fa-share"></i>',
          label: game.i18n.localize("MAGICALOGIA.Share"),
          callback: (html) => {
            const $html = asJQuery(html);
            const share = $html.find("input[name=share_user]:checked").val();
            if (!share) return;
            game.socket.emit("system.magicalogia", {
              id: "req",
              sender: this.receiver,
              receiver: share,
              data: { actorId: this.actorId, dice: this.plot, name: this.name }
            });
            this.close();
          }
        }
      }
    }).render(true);
  }

  _selectDice(event) {
    event.preventDefault();
    if ($(event.currentTarget).hasClass("dice-select")) {
      $(event.currentTarget).removeClass("dice-select");
      this.select = null;
      return;
    }
    $(event.currentTarget).parent().find(".dice-select").removeClass("dice-select");
    $(event.currentTarget).addClass("dice-select");
    this.select = event.currentTarget;
  }

  _swapDice(event) {
    event.preventDefault();
    if (this.select != null) {
      this.plot[this.select.dataset.index] = event.currentTarget.dataset.num;
      $(this.select).text(event.currentTarget.dataset.num);
      $(this.select).removeClass("dice-select");
      this.select = null;
    }
  }

  async _ready(event) {
    event.preventDefault();
    this.ready = !this.ready;

    if (this.ready) {
      $(event.currentTarget).removeClass("await").addClass("ready").text("Cancel");
    } else {
      $(event.currentTarget).removeClass("ready").addClass("await").text("Ready");
    }

    await createChatMessage({
      content: this.ready
        ? game.i18n.localize("MAGICALOGIA.ReadyPlot")
        : game.i18n.localize("MAGICALOGIA.AwaitPlot"),
      speaker: getSpeaker({ alias: this.name })
    });

    if (game.user.id === this.receiver) {
      const plot = game.magicalogia.plot.find((a) => a.actorId === this.actorId);
      plot.ready = this.ready;
      plot.dice = this.plot;
      Hooks.call("checkPlot");
    } else {
      game.socket.emit("system.magicalogia", {
        id: "resp",
        sender: game.user.id,
        receiver: this.receiver,
        data: { actorId: this.actorId, dice: this.plot, ready: this.ready }
      });
    }
  }

}
