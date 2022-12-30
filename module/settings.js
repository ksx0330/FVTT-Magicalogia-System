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
	}
	

	
}
