/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class InsaneActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["magicalogia", "sheet", "actor"],
      template: "systems/magicalogia/templates/actor-sheet.html",
      width: 800,
      height: 800,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];

    data.data.tables = [];
    for (var i = 2; i <= 12; ++i) {
        data.data.tables.push({line: [], number: i});
        for (var j = 0; j < 6; ++j) {
            var name = String.fromCharCode(65 + j);
            data.data.tables[i - 2].line.push({ id: `col-${i}-${j}`, title: `MAGICALOGIA.${name}${i}`, name: `data.talent.table.${j}.${i - 2}`, state: data.data.talent.table[j][i - 2].state, num: data.data.talent.table[j][i - 2].num, misfortune: data.data.talent.table[j][i - 2].misfortune });
        }
    }

    const actorData = data.actor;

    actorData.abilityList = [];
    actorData.bondList = [];
    actorData.itemList = [];

    for (let i of data.actor.items) {
        if (i.type === 'ability')
            actorData.abilityList.push(i);
        else if (i.type == 'bond')
            actorData.bondList.push(i);
        else
            actorData.itemList.push(i);
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find(".talent-name").click(this._onRollTalent.bind(this));

    // Owned Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    html.find('.charge-change').click(this._changeItemCharge.bind(this));
    html.find('.use-word').click(this._useItemWord.bind(this));
    html.find('.use-power').click(this._useItemPower.bind(this));

    // Talent
    html.find('.item-label').click(this._showItemDetails.bind(this));
    html.find(".echo-item").click(this._echoItemDescription.bind(this));

    html.find(".talent").on('mousedown', async ev => {
      const misfortune = ev.currentTarget.dataset.misfortune;
      const update = {};
      update[`${ev.currentTarget.dataset.name}.misfortune`] = (misfortune == undefined) ? true : false;

      if (event.button == 2 || event.which == 3) {
          await this.actor.update(update);
          let table = this._getTalentTable();
          let formData = {};
          for (var i = 0; i < 6; ++i)
          for (var j = 0; j < 11; ++j)
            formData[`data.talent.table.${i}.${j}.num`] = table[i][j].num;

          await this.actor.update(formData);
      }
    });


    if (this.actor.owner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 500;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    let target = event.currentTarget;

    if (target == undefined || target.name.indexOf("data.talent") == -1)
      return await this.object.update(formData);

    await this.object.update(formData);

    let table = this._getTalentTable();
    for (var i = 0; i < 6; ++i)
    for (var j = 0; j < 11; ++j)
      formData[`data.talent.table.${i}.${j}.num`] = table[i][j].num;

    return await this.object.update(formData);
  }


  /* -------------------------------------------- */

  async _onRollTalent(event) {
    event.preventDefault();
    let dataset = event.currentTarget.dataset;
    let num = dataset.num;
    let title = dataset.title;

    if (dataset.misfortune == 'true')
      num = (Number(num) + 1 <= 12) ? Number(num) + 1 : 12;

    new Dialog({
        title: "Please put the additional value",
        content: "<p><input type='text' id='add'></p>",
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: () => this._rollDice(title, $("#add").val(), num)
          }
        },
        default: "confirm"
    }).render(true);

  }

  async _rollDice(title, add, num) {
    let mana = ["A1", "B1", "C1", "D1", "E1", "F1"];
    let formula = "2d6";

    if (add != "")
      formula += "+" + add;

    // GM rolls.
    let chatData = {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: "<h2>" + title + "</h2>"
    };

    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user._id];
    if (rollMode === "blindroll") chatData["blind"] = true;

    let roll = new Roll(formula);
    roll.roll();
    chatData.content = await renderTemplate("systems/magicalogia/templates/roll.html", {
        formula: roll.formula,
        flavor: null,
        user: game.user._id,
        tooltip: await roll.getTooltip(),
        total: Math.round(roll.total * 100) / 100,
        num: num,
        doublet: (roll.parts[0].rolls[0].roll == roll.parts[0].rolls[1].roll),
        mana: `MAGICALOGIA.${mana[roll.parts[0].rolls[0].roll - 1]}`
    });

    if (game.dice3d) {
        game.dice3d.showForRoll(roll, chatData.whisper, chatData.blind).then(displayed => ChatMessage.create(chatData));
    } else {
        chatData.sound = CONFIG.sounds.dice;
        ChatMessage.create(chatData);
    }


  }


    /* -------------------------------------------- */
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;

    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type
    };
    return this.actor.createOwnedItem(itemData);
  }

  _showItemDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    toggler.toggleClass('open');
    description.slideToggle();
  }

  _echoItemDescription(event) {
    event.preventDefault();
    const item = $(event.currentTarget).parents('.item');
    const description = item.find('.item-description').first();
    const title = item.find(".item-name").first();

    // GM rolls.
    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3>" + title.text() + "</h3>" + description[0].innerHTML
    };

    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user._id];
    if (rollMode === "blindroll") chatData["blind"] = true;

    ChatMessage.create(chatData);

  }

  async _changeItemCharge(event) {
    event.preventDefault();
    const chargeButton = $(event.currentTarget);
    const item = this.actor.getOwnedItem(chargeButton.parents('.item')[0].dataset.itemId);

    const add = Number(event.currentTarget.dataset.add);
    const num = Number(item.data.data.charge);

    if (num + add < 0)
      return;

    await item.update({"data.charge": num + add});

    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3>" + item.data.name + ": " + num + " -> " + (num + add) + "</h3>"
    };

    ChatMessage.create(chatData);
  }

  async _useItemWord(event) {
    event.preventDefault();
    const target = $(event.currentTarget);
    const item = this.actor.getOwnedItem(target.parents('.item')[0].dataset.itemId);

    if (item.data.data.word_check) {
      new Dialog({
          title: "Can not use!",
          content: "<p>You aleady use this word!</p>",
          buttons: {}
      }).render(true);
      return;
    }

    await item.update({"data.word_check": true});

    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3>" + item.data.data.word + "</h3>"
    };

    ChatMessage.create(chatData);W
  }

  async _useItemPower(event) {
    event.preventDefault();
    const target = $(event.currentTarget);
    const item = this.actor.getOwnedItem(target.parents('.item')[0].dataset.itemId);

    if (item.data.data.check) {
      new Dialog({
          title: "Can not use!",
          content: "<p>You aleady use this power!</p>",
          buttons: {}
      }).render(true);
      return;
    }

    await item.update({"data.check": true});

    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3>" + game.i18n.localize("MAGICALOGIA.DestinyPower") + ": " + item.data.name + "</h3>"
    };

    ChatMessage.create(chatData);
  }

  async _useItem(event) {
    event.preventDefault();
    const useButton = $(event.currentTarget);
    const item = this.actor.getOwnedItem(useButton.parents('.item')[0].dataset.itemId);

    if (item.data.data.quantity > 0) {
      await item.update({'data.quantity': item.data.data.quantity - 1});
  
      // GM rolls.
      let chatData = {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: "<h3>" + game.i18n.localize("MAGICALOGIA.UseItem") + ": " + item.data.name + "</h3>"
      };
  
      let rollMode = game.settings.get("core", "rollMode");
      if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
      if (rollMode === "selfroll") chatData["whisper"] = [game.user._id];
      if (rollMode === "blindroll") chatData["blind"] = true;
  
      ChatMessage.create(chatData);

    }
  
  }

  _getTalentTable() {
    let table = JSON.parse(JSON.stringify(this.actor.data.data.talent.table));
    let curiosity = this.actor.data.data.talent.curiosity;
    let nodes = [];

    for (var i = 0; i < 6; ++i)
    for (var j = 0; j < 11; ++j) {
      if (table[i][j].misfortune == false && table[i][j].state == true) {
        nodes.push({x: i, y: j});
        table[i][j].num = "5";
      } else
        table[i][j].num = "12";
    }
        

    let dx = [0, 0, 1, -1];
    let dy = [1, -1, 0, 0];
    let move = [1, 1, 2, 2];
    for (var i = 0; i < nodes.length; ++i) {
      let queue = [nodes[i]];

      while (queue.length != 0) {
        let now = queue[0];
        queue.shift();

        for (var d = 0; d < 4; ++d) {
          var nx = now.x + dx[d];
          var ny = now.y + dy[d];
          var m = move[d];

          if (nx < 0 || nx >= 6 || ny < 0 || ny >= 11)
            continue;

          if (m == 2 && (nx == curiosity - 1 || now.x == curiosity - 1))
            m = 1;

          if (Number(table[nx][ny].num) > Number(table[now.x][now.y].num) + m) {
            table[nx][ny].num = String(Number(table[now.x][now.y].num) + m);
            queue.push({x: nx, y: ny});
          }
        }
      }
    }

    return table;
  }

}
