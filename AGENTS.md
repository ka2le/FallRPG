# Workspace guide

- The active application is `wizard-combat/`. Run its commands from that directory.
- `ShatteredCodex-Feywild (1)/` and `shattered-codex-rpg (2)/` are reference prototypes. Keep their originals intact; adapt selected work into the active application.
- Other collaborators may be editing the UI and monster art. Read the current files before modifying them, use focused edits, and preserve unrelated work. World rendering is primarily in `src/feyworld.js`, `src/ground.js`, and `src/landscape.js` inside the active application.
- Validate gameplay changes with `npm test` and production compilation with `npm run build`. Check rendering changes in the local browser at port 5174.
