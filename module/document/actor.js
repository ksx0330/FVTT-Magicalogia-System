
export class MagicalogiaActor extends Actor {

  prepareData() {
    super.prepareData();

  }

    /** @override */
  async _preUpdate(data, options, userId) {
    console.log(data);

    if ('data' in data && 'talent' in data.system) {
      let table = JSON.parse(JSON.stringify(this.system.talent.table));
      let gap = JSON.parse(JSON.stringify(this.system.talent.gap));

      if ('table' in data.system.talent) {
        for (let a = 0; a < Object.keys(data.system.talent.table).length; ++a) {
          let i = Object.keys(data.system.talent.table)[a];
          for (let b = 0; b < Object.keys(data.system.talent.table[i]).length; ++b) {
            let j = Object.keys(data.system.talent.table[i])[b];
            for (let c = 0; c < Object.keys(data.system.talent.table[i][j]).length; ++c) {
              let key = Object.keys(data.system.talent.table[i][j])[c];
              table[i][j][key] = data.system.talent.table[i][j][key];
            }
          }
        }

      }

      if ('gap' in data.system.talent) {
        for (let a = 0; a < Object.keys(data.system.talent.gap).length; ++a) {
          let i = Object.keys(data.system.talent.gap)[a];
          gap[i] = data.system.talent.gap[i];
        }
      }

      if ('curiosity' in data.system.talent && data.system.talent.curiosity != 0) {
        gap = data.system.talent.gap = {"0": false, "1": false, "2": false, "3": false, "4": false, "5": false};

        data.system.talent.gap[data.system.talent.curiosity] = gap[data.system.talent.curiosity] = true;
        data.system.talent.gap[data.system.talent.curiosity - 1] = gap[data.system.talent.curiosity - 1] = true;
      }

      data.system.talent.table = this._getTalentTable(table, gap);
    }

    super._preUpdate(data, options, userId);
  }

  _getTalentTable(table, gap) {
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
        
        if (+table[now.x][now.y].num == 12)
          continue;

        for (var d = 0; d < 4; ++d) {
          var nx = now.x + dx[d];
          var ny = now.y + dy[d];
          var m = move[d];
          
          if (nx < 0 || nx >= 6 || ny < 0 || ny >= 11)
            continue;

          let g = ( (now.x == 0 && nx == 5) || (now.x == 5 && nx == 0) ) ? gap[0] : gap[(nx > now.x) ? nx : now.x];
          if (m == 2 && g)
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


  async rollTalent(title, num, add, secret, misfortune = false) {
    if (!add) {
      this._onRollDice(title, num, null, secret, misfortune); 
      return;
    }
    
    new Dialog({
        title: "Please put the additional value",
        content: `<p><input type='text' id='add'></p><script>$("#add").focus()</script>`,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: () => this._onRollDice(title, num, $("#add").val(), secret, misfortune)
          }
        },
        default: "confirm"
    }).render(true);
    
  }

  async _onRollDice(title, num, add, secret, misfortune = false) {
    
    // GM rolls.
    let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: "<h2><b>" + title + "</b></h2>"
    };

    let rollMode = (secret) ? "gmroll" : game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user.id];
    if (rollMode === "blindroll") chatData["blind"] = true;

    let formula = "2d6";
    if (add != null)
      formula += (add < 0) ? `${add}` : `+${add}`;
    if (misfortune)
      formula += "-1";

    let roll = new Roll(formula);
    await roll.roll({async: true});
    let d = roll.terms[0].total;

    chatData.content = await renderTemplate("systems/magicalogia/templates/roll.html", {
        formula: roll.formula,
        flavor: null,
        user: game.user.id,
        tooltip: await roll.getTooltip(),
        total: Math.round(roll.total * 100) / 100,
        special: d == 12,
        fumble: d == 2,
        num: num
    });

    if (game.dice3d) {
        game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind).then(displayed => ChatMessage.create(chatData));;
    } else {
        chatData.sound = CONFIG.sounds.dice;
        ChatMessage.create(chatData);
    }
  }

  _echoItemDescription(itemId) {
    const item = this.items.get(itemId);

    let title = item.name;
    let description = item.system.description;

    if (item.type == 'ability') {
      title = `<img src="${item.img}" width="28" height="28">&nbsp&nbsp<b>${title}</b>`;
      description = `<table style="text-align: center;">
                      <tr>
                        <th>${game.i18n.localize("MAGICALOGIA.Type")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Talent")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Target")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Cost")}</th>
                      </tr>

                      <tr>
                        <td>${item.system.type}</td>
                        <td>${item.system.talent}</td>
                        <td>${item.system.target}</td>
                        <td>${item.system.cost}</td>
                      </tr>
                    </table>${description}`

      if (item.system.talent != "")
        description += `<button type="button" class="roll-talent" data-talent="${item.system.talent}">${item.system.talent}</button>`

    }

    else if (item.type == 'bond') {
      title = `<img src="${item.img}" width="28" height="28">&nbsp&nbsp<b>${title}</b>`;
      description = `<table style="text-align: center;">
                      <tr>
                        <th>${game.i18n.localize("MAGICALOGIA.Destiny")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Attribute")}</th>
                      </tr>

                      <tr>
                        <td>${item.system.destiny}</td>
                        <td>${item.system.attribute}</td>
                      </tr>
                    </table>${description}`
    }
    
    else if (item.type == "item") {
      title = `<img src="${item.img}" width="28" height="28">&nbsp&nbsp<b>${title}</b>`;
      description = `<table style="text-align: center;">
                      <tr>
                        <th>${game.i18n.localize("MAGICALOGIA.Requirement")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.RequireExp")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Quantity")}</th>
                        <th>${game.i18n.localize("MAGICALOGIA.Format")}</th>
                      </tr>

                      <tr>
                        <td>${item.system.requirement}</td>
                        <td>${item.system.require_exp}</td>
                        <td>${item.system.quantity}</td>
                        <td>${item.system.format}</td>
                      </tr>
                    </table>${description}`
    }
    
    // GM rolls.
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="" data-actor-id=${this.id} data-item-id=${itemId}>` + `<h2 style='display: flex; padding-bottom: 2px;'>` + title + "</h2>" + description + `</div>`
    };

    ChatMessage.create(chatData);

  }

}