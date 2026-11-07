# Between Seasons workspace

- This folder is the new, independent top-down game. Run its commands here, not in `wizard-combat/`.
- Keep the original wizard game and both reference prototypes intact. Other collaborators may be editing them.
- Canonical world and ecology documents live in `../wizard-combat/docs/lore/`. Reference them rather than creating competing lore copies.
- Keep rendering, world queries, and collision consistent. Preserve neutral wildlife and habitat-dependent behavior.
- Generated source art lives in `public/assets/`; exact prompts are recorded in `docs/art-prompts.json`.
- Validate gameplay with `npm test`, compilation with `npm run build`, and browser interactions with `npm run test:browser`.
- The new development server uses port **5175**. Port 5174 belongs to the original wizard game. Inspect all four habitats when changing scenery or sprite rendering.
