/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class MagicalogiaActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["magicalogia", "sheet", "actor"],
      width: 800,
      height: 735,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skill"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/magicalogia/templates/actor";
    return `${path}/${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    let isOwner = false;
    let isEditable = this.isEditable;
    let data = super.getData(options);
    let items = {};
    let actorData = {};

    isOwner = this.document.isOwner;
    isEditable = this.isEditable;

    data.lang = game.i18n.lang;
    data.userId = game.user.id
    data.isGM = game.user.isGM;

    // The Actor's data
    actorData = this.actor.toObject(false);
    data.actor = actorData;
    data.system = this.actor.system;
    data.system.isOwner = isOwner;

    data.items = Array.from(this.actor.items.values());
    data.items = data.items.map( i => {
      i.system.id = i.id;
      return i;
    });

    data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));


    let subTitle = {state: false, id: ""}
    if ("subTitle" in data.system.talent && data.system.talent.subTitle.state) {
      subTitle.id = data.system.talent.subTitle.id;
      subTitle.state = true;
    }

    data.system.tables = [];
    for (var i = 2; i <= 12; ++i) {
        data.system.tables.push({line: [], number: i});
        for (var j = 0; j < 6; ++j) {
            var name = String.fromCharCode(65 + j);
            data.system.tables[i - 2].line.push({ id: `col-${j}-${i-2}`, title: `MAGICALOGIA.${name}${i}`, name: `system.talent.table.${j}.${i - 2}`, state: data.system.talent.table[j][i - 2].state, num: data.system.talent.table[j][i - 2].num, misfortune: data.system.talent.table[j][i - 2].misfortune, debuf: data.system.talent.table[j][i - 2].debuf, subTitle: (`col-${j}-${i-2}` == subTitle.id) ? true : false });
        }
    }

    actorData.abilityList = [];
    actorData.bondList = [];
    actorData.itemList = [];
    actorData.handoutList = [];

    for (let i of data.items) {
        if (i.type === 'ability')
            actorData.abilityList.push(i);
        else if (i.type == 'bond')
            actorData.bondList.push(i);
        else if (i.type == 'item')
            actorData.itemList.push(i);
        else if (i.type == 'handout')
            actorData.handoutList.push(i);
    }

    data.enrichedBiography = await TextEditor.enrichHTML(data.system.details.biography, {async: true});
    data.enrichedTrueLook = await TextEditor.enrichHTML(data.system.true_look.biography, {async: true});

    console.log(this);

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Talent
    html.find('.item-label').click(this._showItemDetails.bind(this));
    html.find(".echo-item").click(this._echoItemDescription.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find(".talent-name").on('mousedown', this._onRouteTalent.bind(this));

    // Owned Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let item = this.actor.items.get(li.data("itemId"));
      item.delete();
    });

    // Use Item
    html.find('.circle').click(this._attackPlot.bind(this));

    html.find('.status-btn').click(this._changeStatus.bind(this));
    html.find('.truelook-change').click(this._changeTrueLook.bind(this));
    html.find('.mana-change').click(this._changeManaGauge.bind(this));
    html.find('.charge-change').click(this._changeItemCharge.bind(this));
    html.find('.use-word').click(this._useItemWord.bind(this));
    html.find('.use-power').click(this._useItemPower.bind(this));

    if (this.actor.isOwner) {
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
    const bodyHeight = position.height;
    sheetBody.css("height", bodyHeight - 330);
    return position;
  }

  /* -------------------------------------------- */

  async _onRouteTalent(event) {
    if (event.button == 2 || event.which == 3)
      this._setMisfortuneTalent(event);
    else
      this._onRollTalent(event);
  }
  
  async _setMisfortuneTalent(event) {
    event.preventDefault();
    let dataset = event.currentTarget.dataset;
    let id = dataset.id;

    if (id == "-")
      return;

    if (id == "spirit") {
      let misfortune = this.actor.system.talent.spirit_talent.misfortune;
      await this.actor.update({"system.talent.spirit_talent.misfortune": !misfortune});
      return;
    }

    let table = duplicate(this.actor.system.talent.table);
    let splitId = id.split("-");
    table[splitId[1]][splitId[2]].misfortune = !table[splitId[1]][splitId[2]].misfortune;
    await this.actor.update({"system.talent.table": table});
  }
  
  async _onRollTalent(event) {
    event.preventDefault();
    let dataset = event.currentTarget.dataset;
    let num = dataset.num;
    let title = dataset.title;
    let add = true;
    let secret = false;
    let debuf = false;

    if (dataset.debuf == 'true')
      debuf = true;
  
    if (!event.ctrlKey && !game.settings.get("magicalogia", "rollAddon"))
      add = false;

    if (event.altKey)
      secret = true;

    if (event.shiftKey) {
      let subTitle = this.actor.system.talent.subTitle;

      if (subTitle.state) {
        this.actor.update({"system.talent.subTitle.id": "", "system.talent.subTitle.title": "", "system.talent.subTitle.state": false});
        if (dataset.id != subTitle.id)
          title = subTitle.title + "->" + title;
        else
          return;

      } else {
        this.actor.update({"system.talent.subTitle.id": dataset.id, "system.talent.subTitle.title": title, "system.talent.subTitle.state": true});
        return;
      }
    }
    
    await this.actor.rollTalent(title, num, add, secret, debuf);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDropActor(event, data) {
    if ( !this.actor.isOwner ) return false;

    const actor = await Actor.implementation.fromDropData(data);
    const actorData = actor.toObject();

    const itemData = {
      name: actor.name,
      img: actor.img,
      type: "bond",
      system: {
        "actor": actor.id
      }
    };

    // Handle item sorting within the same Actor
    if ( this.actor.uuid === actor.parent?.uuid ) return this._onSortItem(event, itemData);

    // Create the owned item
    return this._onDropItemCreate(itemData);
  }
  
  /* -------------------------------------------- */
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;

    const name = `New ${type.capitalize()}`;
    let itemData = {
      name: name,
      type: type,
      img: `icons/svg/${header.dataset.img}.svg`,
      system: {}
    };
    if (type == "handout")
      itemData.system.visible = {[game.user.id]: true};

    await this.actor.createEmbeddedDocuments('Item', [itemData], {});
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
    const li = $(event.currentTarget).parents('.item');

    this.actor._echoItemDescription(li[0].dataset.itemId);
  }

  async _changeStatus(event) {
    event.preventDefault();

    const name = event.currentTarget.dataset.name;
    const splitName = name.split(".");
    const state = this.actor.system.status[splitName[2]];

    await this.actor.update({[name]: !state});
  }

  async _changeTrueLook(event) {
    const state = this.actor.system.true_look.check;
    await this.actor.update({"system.true_look.check": !state});

    if (!state) {
      let title = `<img src="${this.actor.system.true_look.img}" width="28" height="28">&nbsp&nbsp<b>${this.actor.name}</b>`;
      let description = `
        <table style="text-align: center;">
          <tr>
            <th>${game.i18n.localize("Name")}</th>
            <th>${game.i18n.localize("MAGICALOGIA.Effect")}</th>
          </tr>

          <tr>
            <td>${this.actor.system.true_look.name}</td>
            <td>${this.actor.system.true_look.effect}</td>
          </tr>
        </table>${this.actor.system.true_look.biography}`;

      let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="" data-actor-id=${this.id}>` + `<h2 style='display: flex; padding-bottom: 2px;'>` + title + "</h2>" + description + `</div>`
      };
  
      ChatMessage.create(chatData);
    }

    for (let token of game.scenes.current.tokens) {
      console.log(token);

      if (token.actor != null && token.actor.id == this.actor.id ) {
        if (!state)
          token.update({"name": this.actor.system.true_look.name, "img": this.actor.system.true_look.img});
        else
          token.update({"name": this.actor.name, "img": this.actor.img});
      }
    }

  }

  async _changeManaGauge(event) {
    event.preventDefault();

    const name = event.currentTarget.dataset.name;
    const label = event.currentTarget.dataset.label;
    const add = Number(event.currentTarget.dataset.add);

    let num = 0;
    let splitName = name.split(".");
    if (splitName.length == 2)
      num = Number(this.actor.system[splitName[1]]);
    else
      num = Number(this.actor.system[splitName[1]][splitName[2]]);

    if (num + add < 0)
      return;

    await this.actor.update({[name]: num + add});

    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3><b>" + this.actor.name + "</b></h3>" + label + ": " + num + " -> " + (num + add)
    };

    ChatMessage.create(chatData);
  }

  async _changeItemCharge(event) {
    event.preventDefault();
    const chargeButton = $(event.currentTarget);
    const item = this.actor.items.get(chargeButton.parents('.item')[0].dataset.itemId);

    const add = Number(event.currentTarget.dataset.add);
    const num = Number(item.system.charge);

    if (num + add < 0)
      return;

    await item.update({"system.charge": num + add});

    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3><b>" + item.name + "</b></h3>" + num + " -> " + (num + add)
    };

    ChatMessage.create(chatData);
  }

  async _useItemWord(event) {
    event.preventDefault();
    const target = $(event.currentTarget);
    const item = this.actor.items.get(target.parents('.item')[0].dataset.itemId);

    if (item.system.word_check) {
      new Dialog({
          title: "Can not use!",
          content: "<p>You aleady use this word!</p>",
          buttons: {}
      }).render(true);
      return;
    }

    await item.update({"system.word_check": true});

    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3><b>" + item.name + "</b></h3><b>" + item.system.word + "</b>"
    };

    ChatMessage.create(chatData);
  }

  async _useItemPower(event) {
    event.preventDefault();
    const target = $(event.currentTarget);
    const item = this.actor.items.get(target.parents('.item')[0].dataset.itemId);

    if (item.system.check) {
      new Dialog({
          title: "Can not use!",
          content: "<p>You aleady use this power!</p>",
          buttons: {}
      }).render(true);
      return;
    }

    await item.update({"system.check": true});

    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3><b>" + game.i18n.localize("MAGICALOGIA.DestinyPower") + ": " + item.name + "</b></h3>"
    };

    ChatMessage.create(chatData);
  }


  async _attackPlot(event) {

    console.log("ATTACK");

    let attackTarget = () => {
      let target = game.user.targets.first();
      let key = [this.actor.id, target.actor.id].sort().join("-");

      let scene = game.scenes.current;
      let magicZone = {};
      if ("magicalogia" in scene.flags && "magicZone" in scene.flags["magicalogia"])
          magicZone = scene.flags["magicalogia"].magicZone;

      if (!(key in magicZone)) {
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

      let data = [];
      data.push({
        actorId: this.actor.id,
        name: this.actor.name,
        dice: Array.from({length: this.actor.system.details.attack}, () => "?"),
        role: game.i18n.localize("MAGICALOGIA.Attacker")
      });

      let targetActor = target.actor;
      data.push({
        actorId: targetActor.id,
        name: targetActor.name,
        dice: Array.from({length: targetActor.system.details.defence}, () => "?"),
        role: game.i18n.localize("MAGICALOGIA.Defenser")
      });

      let observers = magicZone[key][targetActor.id];
      for (let observer of observers) {
        let actor = game.actors.get(observer);
        data.push({
          actorId: actor.id,
          name: actor.name,
          dice: ["?"],
          role: game.i18n.localize("MAGICALOGIA.Observer")
        });
      }

      Hooks.call("initPlot", data);
      Hooks.call("spreadPlot");
    }

    Dialog.prompt({
      title: game.i18n.localize("MAGICALOGIA.SelectTarget"),
      content: `
        <h2>
          ${game.i18n.localize("MAGICALOGIA.SelectTarget")}
        </h2>
      `,
      callback: () => attackTarget()
    });



  }




}