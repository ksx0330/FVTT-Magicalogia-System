# Magicalogia for Foundry VTT v14

**magi-v14-forge** is a fork of [ksx0330/FVTT-Magicalogia-System](https://github.com/ksx0330/FVTT-Magicalogia-System) that runs on **Foundry Virtual Tabletop V14 Stable 7 (build 365)**.

Foundry install manifest:

`https://raw.githubusercontent.com/AgentKevin2077/magi-v14-forge/main/system.json`

Original git history is kept. The V11 codebase is the parent; this branch adds the V14 compatibility port on top. The original remote is `upstream`:

```bash
git remote add upstream https://github.com/ksx0330/FVTT-Magicalogia-System.git
```

The original system last verified against **Foundry 11.315**. It is a complete Magicalogia character sheet: specialty grid, grimoires, bonds, handouts, true form, and magic-duel plots. This fork keeps that sheet and updates the Foundry APIs underneath it.

## Why the original did not load on V14

Foundry did not just “bump a version number.” Between V11 and V14 several APIs the system called were relocated or deleted. The usual symptoms are:

- Foundry Setup marks the system **incompatible**
- Enabling a world throws in the console (`html.on is not a function`, `select is not a helper`, `duplicate is not defined`, `controls[0] is undefined`)
- The character sheet never opens, or opens as a blank window

These are the actual missing links:

| Break | When | What the V11 code did | What V14 requires |
| --- | --- | --- | --- |
| Compatibility manifest | V12+ | `"verified": "11.315"` | `compatibility.minimum` / `verified` covering V14 |
| `System#gridDistance` / `gridUnits` | V14 | top-level `gridDistance` in `system.json` | `"grid": { "distance", "units" }` |
| Handlebars `{{#select}}` | V14 | used on the character and ability sheets | removed; use `selected` on `<option>` |
| ApplicationV1 globals | V13 | `ActorSheet`, `ItemSheet`, `Dialog`, `FormApplication` | `foundry.appv1.sheets.*` / `foundry.appv1.api.*` |
| `duplicate()` | V14 | clone talent tables and scene flags | `foundry.utils.deepClone()` |
| `ChatMessage#user` | V14 | `user: game.user.id` on chat data | `author` |
| Chat log hook | V13 | `html.on('click', …)` assuming jQuery | ChatLog is ApplicationV2; `html` is an `HTMLElement` |
| Scene controls | V13 | `controls[0].tools.push(...)` | `controls` is an object; `tools` is keyed by name |
| Grid snapping | V12/V14 | `canvas.grid.w` / `getSnappedPosition` | `canvas.grid.sizeX` / `getSnappedPoint` |
| Token image | V10 shim removed | `token.update({ img })` | `token.update({ "texture.src": … })` |
| Sheet registration | V13 | `Actors.registerSheet` | `foundry.applications.apps.DocumentSheetConfig` |
| Talent `_preUpdate` | V10 leftover | checked `'data' in changed` | actor diffs live under `system`, so specialties never recalculated |

ApplicationV1 sheets still exist in V14 under `foundry.appv1`, so this fork keeps the original layout instead of rewriting the UI in ApplicationV2. The crash was not “old sheets are forbidden”; it was the globals, helpers, and hooks around those sheets.

## Clone this repo

Origin CLI runs on macOS, Linux, and WSL. On Windows, use WSL, not PowerShell:

```bash
# Run in WSL (Origin CLI is not available in PowerShell)
# Install the Origin CLI
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh

# Sign in (also sets up git credentials)
origin auth login

# Clone the repository
origin repo clone meowleftandright/magi-v14-forge
```

If `origin` is not found after install:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

CLI docs: [cursor.com/docs/origin/cli](https://cursor.com/docs/origin/cli)

## Install in Foundry

1. In Foundry, open **Setup → Game Systems → Install System**.
2. If you have a `system.json` URL for this fork, paste it there.
3. Otherwise copy this folder into Foundry’s data directory:

```
<Foundry User Data>/Data/systems/magicalogia/
```

The folder name must be `magicalogia` (it must match `"id"` in `system.json`).

4. Create or open a world that uses **Magicalogia System**. Foundry V14.365 is the verified build.

Worlds created on the original V11 system should still open. Actor data lives in `system.*` the same way it did in V11.

Updating to system **0.2.1** rebuilds specialty target numbers on existing characters the next time a GM loads the world. Old exports stored the talent grid as objects and left every cell at `12`; checked specialties should be `5`, with neighbors counting up.

**0.2.2** adds Traditional Chinese (`zh-TW`) and Simplified Chinese (`zh-CN`) language packs. Foundry uses the client language (Configure → Language). Terminology follows the fan 魔導書大戰 character sheet: 偽名, 當前魔力, 藏書, 指定特技, 咒句, 變調, plus the specialty names 愛慾 / 離別 / 戀愛 / 迷惘 / 愚昧. Simplified Chinese is a conversion of that same wording, not a separate translation from English.

Migrated actor JSON files live in `actors-v14/`. In Foundry, open the actor → header menu → Import Data, or drag the JSON onto the Actors directory.

## Using the sheet

- **Left-click** a specialty to roll 2d6 against its target number.
- **Right-click** a specialty to mark misfortune (that whole domain takes −1).
- **Shift-click** a specialty, then another, to chain `A -> B` for a connected check.
- **Ctrl** (or the client setting) opens a modifier prompt.
- Drop an actor onto the sheet to create a **bond**.
- Drop a **handout** item onto the canvas to place a token that opens the handout.
- GM token tools **Start / End Magic Duel** still drive the plot bar
```
Original copyright: MIT, Foundry Network / ltaeng (ksx0330). This fork keeps that license.

v14-compatible version: developed by meowleftandright (喵佐), assisted by Cursor.
