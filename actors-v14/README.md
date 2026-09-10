# Migrated actor JSON (Foundry V14)

These files were rebuilt from V11/V13 exports:

- Talent grid converted from object-keys to a 6×11 array
- Specialty target numbers recalculated (checked cells are **5**)
- Mana fields coerced to numbers
- Token bars pointed at `mana` / `tmp_mana`

## Import

1. Update the Magicalogia system to **0.2.1** (reload Foundry).
2. Either:
   - Open the existing actor → **Import Data** and choose the matching file, or
   - Drag the JSON onto the Actors sidebar (creates a copy if `_id` already exists)

A GM loading a world on 0.2.1 also rebuilds specialty numbers on actors already in the world, so a re-import is optional if you only need the grid to show 5/6/7 instead of 12.
