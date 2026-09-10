/**
 * Foundry V13/V14 API aliases.
 *
 * Magicalogia originally targeted V11, when ActorSheet, Dialog, mergeObject,
 * duplicate, renderTemplate, and TextEditor were globals. V13 moved ApplicationV1
 * under foundry.appv1; V14 removed several remaining shims (duplicate, ChatMessage#user,
 * System#gridDistance, the Handlebars select helper, canvas.grid.getSnappedPosition).
 */

function fromFoundry(...paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((obj, key) => obj?.[key], globalThis);
    if (value !== undefined) return value;
  }
  return undefined;
}

export const ActorSheet = fromFoundry("foundry.appv1.sheets.ActorSheet", "ActorSheet");
export const ItemSheet = fromFoundry("foundry.appv1.sheets.ItemSheet", "ItemSheet");
export const FormApplication = fromFoundry("foundry.appv1.api.FormApplication", "FormApplication");
export const Dialog = fromFoundry("foundry.appv1.api.Dialog", "Dialog");

export const mergeObject = fromFoundry("foundry.utils.mergeObject", "mergeObject");
export const deepClone = fromFoundry("foundry.utils.deepClone", "foundry.utils.duplicate", "duplicate");

export const renderTemplate = fromFoundry(
  "foundry.applications.handlebars.renderTemplate",
  "foundry.utils.renderTemplate",
  "renderTemplate"
);

export const TextEditor = fromFoundry(
  "foundry.applications.ux.TextEditor.implementation",
  "foundry.applications.ux.TextEditor",
  "TextEditor"
);

export const DocumentSheetConfig = fromFoundry(
  "foundry.applications.apps.DocumentSheetConfig",
  "DocumentSheetConfig"
);

export const HandlebarsLib = fromFoundry("Handlebars", "foundry.applications.handlebars.Handlebars");

/**
 * ChatLog and other AppV2 surfaces pass an HTMLElement; AppV1 still passes jQuery.
 */
export function asJQuery(html) {
  const jq = globalThis.$;
  if (!jq) {
    throw new Error("Magicalogia requires jQuery, which Foundry still bundles.");
  }
  if (html && typeof html === "object" && html.jquery) return html;
  return jq(html);
}

export function createChatMessage(data) {
  const payload = { ...data };
  if (payload.user && !payload.author) {
    payload.author = payload.user;
    delete payload.user;
  }
  const ChatMessage = fromFoundry("foundry.documents.ChatMessage", "CONFIG.ChatMessage.documentClass", "ChatMessage");
  return ChatMessage.create(payload);
}

export function getSpeaker(options) {
  const ChatMessage = fromFoundry("foundry.documents.ChatMessage", "CONFIG.ChatMessage.documentClass", "ChatMessage");
  return ChatMessage.getSpeaker(options);
}

export function getWhisperRecipients(name) {
  const ChatMessage = fromFoundry("foundry.documents.ChatMessage", "CONFIG.ChatMessage.documentClass", "ChatMessage");
  return ChatMessage.getWhisperRecipients(name);
}

export async function evaluateRoll(formula) {
  const RollClass = fromFoundry("foundry.dice.Roll", "CONFIG.Dice.rolls.0", "Roll");
  const roll = new RollClass(formula);
  if (typeof roll.evaluate === "function") {
    await roll.evaluate();
  } else {
    await roll.roll();
  }
  return roll;
}

export function snapToGrid(x, y) {
  const grid = canvas.grid;
  if (typeof grid.getSnappedPoint === "function") {
    const sizeX = grid.sizeX ?? grid.w ?? canvas.grid.size;
    const sizeY = grid.sizeY ?? grid.h ?? canvas.grid.size;
    return grid.getSnappedPoint(
      { x: x - sizeX / 2, y: y - sizeY / 2 },
      { mode: CONST.GRID_SNAPPING_MODES?.TOP_LEFT_CORNER ?? 0 }
    );
  }
  const hw = (grid.w ?? grid.sizeX) / 2;
  const hh = (grid.h ?? grid.sizeY) / 2;
  return grid.getSnappedPosition(x - hw, y - hh);
}

export function tokenTextureUpdate(name, img) {
  return { name, "texture.src": img };
}

export function bringSheetForward(sheet) {
  if (typeof sheet.bringToFront === "function") sheet.bringToFront();
  else if (typeof sheet.bringToTop === "function") sheet.bringToTop();
}

/**
 * V13 changed scene controls from an array of groups to an object keyed by name.
 * Tools inside a group also became a named object instead of an array.
 */
export function addTokenControlTool(controls, tool) {
  const group = Array.isArray(controls)
    ? controls.find((c) => c.name === "token" || c.name === "tokens")
    : (controls.tokens ?? controls.token);

  if (!group) {
    console.warn("Magicalogia: could not find the token scene-control group.");
    return;
  }

  const entry = {
    ...tool,
    onChange: tool.onChange ?? ((_event, active) => {
      if (active !== false && typeof tool.onClick === "function") tool.onClick();
    })
  };

  if (Array.isArray(group.tools)) group.tools.push(entry);
  else group.tools[tool.name] = entry;
}

export function registerHandlebarsHelpers(helpers) {
  for (const [name, fn] of Object.entries(helpers)) {
    HandlebarsLib.registerHelper(name, fn);
  }
}
