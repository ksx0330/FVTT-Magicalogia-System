
export class TalentTableForm extends FormApplication {
    
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: 'talent setting',
            template: "systems/magicalogia/templates/talent-table-form.html",
            width: 500,
            closeOnSubmit: true,
            classes: ["magicalogia", "sheet"]
        });
    }
    
    /** @override */
    async getData(options) {
        let data = super.getData(options);
        data.tables = await this._initTable();
        
        console.log(data);
        return data;
    }
    
    
    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        
        html.find("button[name='reset']").click(this._reset.bind(this));
        
        this.reset = false;
    }
    
    async _initTable() {
        var table = Array.from({length: 12}, () => []);
        for (var i = 1; i <= 12; i++)
        for (var j = 0; j < 6; ++j) {
            var name = String.fromCharCode(65 + j);
            var item = { title: await game.i18n.localize(`MAGICALOGIA.${name}${i}`), 
                         id: `col-${j}-${i}` ,
                         value: (this.reset) ? "" : game.settings.get("magicalogia", `MAGICALOGIA.${name}${i}`)
                       }
            
            table[i-1].push(item);
        }
        
        return table;
    }
    
    
    async _reset() {
        this.reset = true;
        this.render();
    }
    
    /** @override */
    async _updateObject(event, formData) {
        for (var i = 1; i <= 12; i++)
        for (var j = 0; j < 6; ++j) {
            let item = $(`#col-${j}-${i}`)[0];
            var name = String.fromCharCode(65 + j);
            game.settings.set("magicalogia", `MAGICALOGIA.${name}${i}`, item.value);
        }
    }
    
    
}
