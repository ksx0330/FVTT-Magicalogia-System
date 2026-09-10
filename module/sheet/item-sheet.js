import { ItemSheet, mergeObject, TextEditor } from "../compat.js";
import { TalentSelectDialog } from "../dialog/talent-select-dialog.js";

export class MagicalogiaItemSheet extends ItemSheet {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["magicalogia", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  get template() {
    return `systems/magicalogia/templates/item/${this.item.type}-sheet.html`;
  }

  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    sheetBody.css("height", position.height - 130);
    return position;
  }

  _canUserView(user) {
    if (this.object.compendium) return user.isGM || !this.object.compendium.private;
    let can = this.object.testUserPermission(user, this.options.viewPermission);

    if (this.item.type === "handout" && !can) {
      const visible = this.item.system.visible;
      can = visible instanceof Object && game.userId in visible && visible[game.userId];
    }
    return can;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".show-actor").click(this._onShowActor.bind(this));
    html.find(".select-talent").click(this._onSelectTalent.bind(this));
    if (!this.options.editable) return;
  }

  async getData(options) {
    const data = await super.getData(options);
    data.userId = game.user.id;
    this.options.title = this.document.name;
    data.system = this.item.system;
    data.dtypes = ["String", "Number", "Boolean"];
    data.isGM = game.user.isGM;
    data.item = this.item.toObject(false);

    if (this.item.type === "handout") {
      data.users = [];
      for (const i of game.users) {
        if (!i.isGM) data.users.push(i);
      }
    }

    const enrich = async (html) => {
      if (!html) return "";
      return TextEditor.enrichHTML(html, { async: true, relativeTo: this.item });
    };

    data.enrichedBiography = await enrich(this.object.system.description);
    if (this.object.type === "handout") {
      data.enrichedSecret = await enrich(this.object.system.secret);
    }

    return data;
  }

  async _onShowActor(event) {
    event.preventDefault();
    const actor = game.actors.get(this.object.system.actor);
    actor?.sheet.render(true);
  }

  async _onSelectTalent(event) {
    event.preventDefault();
    const dialog = new TalentSelectDialog(this.object.actor, async (text) => {
      await this.object.update({ "system.talent": text });
    });
    dialog.render(true);
  }

}
