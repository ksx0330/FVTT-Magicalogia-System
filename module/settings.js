import { TalentTableForm } from "./talent-table.js";

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
		
		for (var i = 1; i <= 12; i++)
        for (var j = 0; j < 6; ++j) {			
            var name = String.fromCharCode(65 + j);
			game.settings.register("magicalogia", `MAGICALOGIA.${name}${i}`, {
				scope: 'world',
				config: false,
				type: String,
				default: ""
			});
        }
        
        
		Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
			return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
		});

		Handlebars.registerHelper('ifOR', function(arg1, arg2, options) {
			return (arg1 || arg2) ? options.fn(this) : options.inverse(this);;
		});

		Handlebars.registerHelper('ifOrEquals', function(arg1, arg2, arg3, arg4, options) {
			return (arg1 == arg2 || arg3 == arg4) ? options.fn(this) : options.inverse(this);
		});

		Handlebars.registerHelper('checkVisible', function(arg1, arg2, options) {
			return (arg1 instanceof Object && arg2 in arg1 && arg1[arg2]);
		});

		Handlebars.registerHelper('ifSuccess', function(arg1, arg2, options) {
			return (arg1 >= arg2) ? options.fn(this) : options.inverse(this);
		});
		
		Handlebars.registerHelper('localTalent', function(arg1, options) {
			let title = game.settings.get("magicalogia", arg1);
			return (title !== "") ? title : game.i18n.localize(arg1);
		});

		Handlebars.registerHelper('manaGauge', function(now, max) {
			let percent = (max != 0) ? now / max * 100 : 0;
			return `background: linear-gradient(90deg, #569ccb ${percent}%, #5d5d5d 0%);`;
		});

		Handlebars.registerHelper('doublet', function(arg1, options) {
			let part = arg1[0];
			console.log(part);

			let manaList = ["A1", "B1", "C1", "D1", "E1", "F1"];
			let isDoublet = part.rolls[0].result == part.rolls[1].result;
			let mana = `MAGICALOGIA.${manaList[part.rolls[0].result - 1]}`

			if (!isDoublet)
				return "";
			else
				return `
				<h4 class="dice-total" style="color: #4131c7; margin-bottom: 4px">
					<span>Doublet! - ${game.i18n.localize(mana)}</span>
				</h4>
				`
		});


	}
	

	
}
