# Workspace guide

- The default active application is the pixel game, **`hollow-pixel/` (The Hollow: Between Seasons)**. Unless the user explicitly names another game, make gameplay, item, sprite and UI changes there and run commands from that directory. Read `hollow-pixel/AGENTS.md` before editing.
- `ShatteredCodex-Feywild (1)/` and `shattered-codex-rpg (2)/` are reference prototypes. Keep their originals intact; adapt selected work into the active application.
- `wizard-combat/` is the independent original 3D game, not the default editing target. Its canonical lore in `wizard-combat/docs/lore/` remains shared reference material.
- Other collaborators may be editing gameplay, UI and art. Read the current files before modifying them, use focused edits, and preserve unrelated work.
- For the pixel game, validate gameplay with `npm test`, production compilation with `npm run build`, and browser interactions with `npm run test:browser`. Its local browser preview is **port 5175**. Port 5174 belongs to the original wizard game.
