import { TalentTableForm } from "./talent-table.js";
import { registerHandlebarsHelpers } from "./compat.js";

export class MagicalogiaSettings {
  static init() {
    game.settings.registerMenu("magicalogia", "talentTable", {
      name: "SETTINGS.TalentTable",
      label: "SETTINGS.TalentTable",
      hint: "SETTINGS.TalentTableDesc",
      icon: "fas fa-bars",
      type: TalentTableForm,
      restricted: true
    });

    game.settings.register("magicalogia", "rollAddon", {
      name: "SETTINGS.RollAddon",
      hint: "SETTINGS.RollAddonDesc",
      scope: "client",
      type: Boolean,
      default: false,
      config: true
    });

    game.settings.register("magicalogia", "schemaVersion", {
      name: "Magicalogia schema version",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });

    for (let i = 1; i <= 12; i++) {
      for (let j = 0; j < 6; ++j) {
        const name = String.fromCharCode(65 + j);
        game.settings.register("magicalogia", `MAGICALOGIA.${name}${i}`, {
          scope: "world",
          config: false,
          type: String,
          default: ""
        });
      }
    }

    registerHandlebarsHelpers({
      ifEquals(arg1, arg2, options) {
        return arg1 == arg2 ? options.fn(this) : options.inverse(this);
      },
      ifOR(arg1, arg2, options) {
        return arg1 || arg2 ? options.fn(this) : options.inverse(this);
      },
      ifOrEquals(arg1, arg2, arg3, arg4, options) {
        return arg1 == arg2 || arg3 == arg4 ? options.fn(this) : options.inverse(this);
      },
      checkVisible(arg1, arg2) {
        return arg1 instanceof Object && arg2 in arg1 && arg1[arg2];
      },
      ifSuccess(arg1, arg2, options) {
        return arg1 >= arg2 ? options.fn(this) : options.inverse(this);
      },
      localTalent(arg1) {
        const title = game.settings.get("magicalogia", arg1);
        return title !== "" ? title : game.i18n.localize(arg1);
      },
      manaGauge(now, max) {
        const percent = max != 0 ? now / max * 100 : 0;
        return `background: linear-gradient(90deg, #569ccb ${percent}%, #5d5d5d 0%);`;
      },
      doublet(arg1) {
        const part = arg1?.[0];
        if (!part || part.rolls?.length != 2) return "";
        const manaList = ["A1", "B1", "C1", "D1", "E1", "F1"];
        const isDoublet = part.rolls[0].result == part.rolls[1].result;
        if (!isDoublet) return "";
        const mana = `MAGICALOGIA.${manaList[part.rolls[0].result - 1]}`;
        return `<h4 class="dice-total" style="color: #4131c7; margin-bottom: 4px"><span>Doublet! - ${game.i18n.localize(mana)}</span></h4>`;
      }
    });
  }
}
