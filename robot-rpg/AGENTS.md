# Robot RPG workspace

- This is an independent, complete clone of `../hollow-pixel/`, with passive AutumNation leaf-picker robots. Edit here for Robot RPG requests; preserve the source games.
- Keep inherited quests, combat, items, forge, habitats and controls intact.
- Robots are ambient workers, outside combat targeting. Groups of 3–6 share a bin that accepts leaves forever, without counters, bags or economy.
- Robot behavior and pixel drawings: `src/robots.js`, `src/robot-art.js`. Reference: AutumNation `public/game.js` (STYLES, drawRobot, drawWheels, drawBasket).
- Validate with `npm test`, `npm run build`, and `npm run test:browser`. Inspect all four habitats after rendering changes.
- Development port: **5177**. Preview: **4177**. Ports 5174/5175 belong to the original games; 5176 is the forge bridge.
- Keep save/settings keys independent (`robot-rpg-*`). Canonical lore: `../wizard-combat/docs/lore/`.
