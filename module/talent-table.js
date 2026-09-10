import { FormApplication, mergeObject } from "./compat.js";

export class TalentTableForm extends FormApplication {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "talent setting",
      template: "systems/magicalogia/templates/talent-table-form.html",
      width: 500,
      closeOnSubmit: true,
      classes: ["magicalogia", "sheet"]
    });
  }

  async getData(options) {
    const data = await super.getData(options);
    data.tables = await this._initTable();
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='reset']").click(this._reset.bind(this));
    this.reset = false;
  }

  async _initTable() {
    const table = Array.from({ length: 12 }, () => []);
    for (let i = 1; i <= 12; i++) {
      for (let j = 0; j < 6; ++j) {
        const name = String.fromCharCode(65 + j);
        table[i - 1].push({
          title: game.i18n.localize(`MAGICALOGIA.${name}${i}`),
          id: `col-${j}-${i}`,
          value: this.reset ? "" : game.settings.get("magicalogia", `MAGICALOGIA.${name}${i}`)
        });
      }
    }
    return table;
  }

  async _reset() {
    this.reset = true;
    this.render();
  }

  async _updateObject(event, formData) {
    for (let i = 1; i <= 12; i++) {
      for (let j = 0; j < 6; ++j) {
        const item = document.querySelector(`#col-${j}-${i}`);
        const name = String.fromCharCode(65 + j);
        await game.settings.set("magicalogia", `MAGICALOGIA.${name}${i}`, item?.value ?? "");
      }
    }
  }

}
