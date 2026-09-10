FVTT Magicalogia System
-------------------
Magicalogia System


Installation Instructions
-------------
To install the Magicalogia system for Foundry Virtual Tabletop, simply paste the following URL into the Install System
dialog on the Setup menu of the application.

https://raw.githubusercontent.com/ksx0330/FVTT-Magicalogia-System/main/system.json


Compatibility
-------------
Verified on Foundry VTT **14.365**, minimum **13**.

Foundry moved or removed several APIs between V11 and V14, so this version wraps them in `module/compat.js`:

- ApplicationV1 classes (`ActorSheet`, `ItemSheet`, `Dialog`, `FormApplication`) live under `foundry.appv1`
- `duplicate()` -> `foundry.utils.deepClone()`, `ChatMessage#user` -> `author`
- The chat log passes an `HTMLElement` instead of jQuery
- Scene controls are an object keyed by name, not an array
- `canvas.grid.getSnappedPosition()` -> `getSnappedPoint()`, `token.img` -> `token.texture.src`
- The `{{#select}}` Handlebars helper was removed; templates use `selected` on `<option>`
- `gridDistance` / `gridUnits` in `system.json` -> `grid: { distance, units }`

The first time a GM loads a world on this version, specialty target numbers are rebuilt on existing characters. Older
exports stored the talent grid as object keys and left every cell at 12; checked specialties should be 5, with
neighbors counting up.


Picture
------------

![image](https://user-images.githubusercontent.com/15700174/210094674-83262573-ac01-41ea-a6a9-0e292a70f6aa.png)

![image](https://user-images.githubusercontent.com/15700174/210094801-a26a7ed0-d656-47b7-811d-49aeb4af5dcc.png)

![image](https://user-images.githubusercontent.com/15700174/210094977-e367577d-b5d3-47df-8e9e-5bc2df601c46.png)

![image](https://user-images.githubusercontent.com/15700174/210094846-9c317a7d-0d3b-4393-a697-3fc8d0e98470.png)
