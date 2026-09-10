import { bringSheetForward } from "../compat.js";

const TokenPlaceable = globalThis.foundry?.canvas?.placeables?.Token ?? globalThis.Token;

export class ActorItemToken extends TokenPlaceable {

  /** @override */
  _canView(user, event) {
    if (this.actor) {
      return this.actor.testUserPermission(user, "LIMITED");
    }

    const uuid = this.document.getFlag?.("magicalogia", "uuid") ?? this.document.flags?.magicalogia?.uuid;
    if (!uuid) {
      ui.notifications.warn("TOKEN.WarningNoActor", { localize: true });
      return false;
    }

    const item = foundry.utils.fromUuidSync?.(uuid) ?? globalThis.fromUuidSync?.(uuid);
    if (item) return item.testUserPermission(user, "LIMITED");
    return true;
  }

  /** @override */
  async _onClickLeft2(event) {
    let sheet;
    if (!this.actor) {
      const uuid = this.document.getFlag?.("magicalogia", "uuid") ?? this.document.flags?.magicalogia?.uuid;
      const item = await fromUuid(uuid);
      sheet = item?.sheet;
    } else {
      sheet = this.actor.sheet;
    }

    if (!sheet) return;
    if (sheet.rendered) {
      sheet.maximize?.();
      bringSheetForward(sheet);
    } else {
      sheet.render(true, { token: this.document });
    }
  }

}
