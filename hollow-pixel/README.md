# The Hollow: Between Seasons

A new, standalone pixel-art RPG set in the Hollow. This is a playable opening chapter and expanded wilderness: an inhabited crossroads, four permanent seasonal habitats, strange wildlife, ecological errands, and automatic basic casting with deliberate tactical spells.

The original `wizard-combat/` application is independent and unchanged by this project. This game shares its world and creature ideas, but has a new 2D renderer, simulation, controls, and interface. It does not import or depend on the original game's runtime.

## Play locally

```powershell
cd hollow-pixel
npm install
npm run dev
```

Open **http://127.0.0.1:5175/**. The separate port leaves the original wizard game on 5174. If dependencies are already installed, only `npm run dev` is necessary.

Start by speaking to **Rowan**, beside the village waypost. **Mara** stands outside the moss-roof cottage to the northeast. The grimoire begins with all nine spells available, so different builds can be tried immediately.

| Control | Action |
| --- | --- |
| Tap / click ground | Walk to that point around obstacles |
| Tap / click nearby villagers or objects | Talk, gather, rest, or interact |
| WASD / arrow keys | Walk; cancels the current walking route |
| Shift | Run |
| 1 / 2 / 3 | Ember / Frost / Siphon automatic casting |
| Tab | Cycle casting stance |
| Space | Toggle automatic attacks |
| Q / E / R | Prepare Briarwall / Frostbloom / Hollow Bell, then click to place |
| F | Cast Willow Ward immediately |
| Right-click / Escape while aiming | Cancel placement |
| Left-click creature | Prefer that target; neutral wildlife stays protected |
| C / Enter | Talk, advance dialogue, rest, gather, clear a crossing, or observe wildlife |
| H | Drink a tonic |
| K / J / M | Spells / journal / map |
| P | Download a PNG of the current game view, including visible UI |
| Escape | Close a menu or pause |

Q/E/F/R can all be reassigned. Click a hotbar ability to prepare or cast it; right-click it to change that slot. Choose a binding in the grimoire, then click a spell. Changing bindings does not reset cooldowns. Menus pause simulation. Sound can be enabled in the pause menu. Walk with the keyboard or tap/click ground to follow a route around obstacles. Tapping nearby villagers and objects interacts with them; tapping nearby neutral wildlife observes it. Ground taps place an armed spell instead of moving. Basic attacks automatically find nearby threats, use no aether, and pause inside Willowmere. Screenshot files use timestamped names and the browser’s normal download destination; capture happens locally with no upload.

Resting at a Hearthstone restores health and aether outside combat. The market trades three gathered sprigs or twelve amber coins for a tonic. Death returns the player home while preserving discoveries and quest progress.

Progress saves automatically every twelve seconds, on relevant menu actions, and when the tab is left. It uses this browser and origin's local storage (`hollow-between-seasons-v1`). A small diamond confirms manual saves; errors appear briefly. It does not touch wizard-combat saves.

## This chapter

- **Willowmere:** cottages, a lit inn, a market, cultivated beds, a well, fences, a courier's camp, two quest-giving villagers, a roaming child, an innkeeper, and a restorative Hearthstone.
- **The Verdant Reach:** grazing clearings, riverbanks, orchid patches, flower groves, Giftwillows, Claspwoods, Hollow Hosts, and Bellroots.
- **Amberfall Woods:** leaf litter, Sourhearts, mossy ledges, mushroom gardens, a pond, and the immense Hollow Elder.
- **The Stillwhite:** snowbell patches, conifers, icy crystals, moving feeding trails, and a frozen river shrine.
- **Cindervein:** basalt vents, mineral ground, thorn scrub, impassable lava, nesting Ventbacks, and Lantern Wyrms. Steam marks the adjacent winter boundary.
- **36 creature species**, including 24 new lore-based species and 8 regional appearances of familiar animals, plus three connected opening quests: reunite a grazing pair for Rowan, take his introduction to Mara and reopen the Boundary Scavengers’ feeding corridor, then keep a notebook of four habitat specialists.
- **Nine assignable spells:** Briarwall, Briarbind, Frostbloom, Willow Ward, Hollow Bell, Moon Siphon, Verdant Oath, Mothstep, and Lantern Fox. These cover temporary terrain, roots, slows, shields, stuns, area damage, life drain, healing, movement, and a combat companion. Briarwall blocks movement and shots for seven seconds.
- **320 active sprite cells** across five transparent 8×8 atlases, including scenery variants, four-direction mage poses, creature walk cycles, villagers, and small wildlife, combined with coded terrain, particle effects, shadows, water glints, weather, footsteps/feeding motion, and depth sorting. The HUD is limited to small health/aether bars, casting icons and menu controls; region names and interaction cues appear only when relevant. Canopies fade when they obscure the player.

The world now covers **6000×4200 units**, about **5.8 times** the original area. Follow the east road from Willowmere toward Redleaf Post and the Cuphorn Pools, or continue south from Snowbell Hollow toward Snowwatch and Floodblossom. **18 new landmarks** connect through branching footpaths and bridges, with four new safe camps for conversation, supplies and rest. The map opens with M.

New communities include ant-supported canopy groves, fog gardens, burrow ridges, Whitebraid growth, frozen larders, Glassbrood pools, cold gardens, burial mounds, Hush terraces and the Bone Orchard. Eight Giftwillow drawings and several forms of each major tree family mix young, old, browsed, twisted, branching and hollow silhouettes. Related trees stay in recognizable groves instead of being randomly mixed across every habitat.

The view is a three-quarter top-down projection with compressed ground depth, rather than a rotating 3D camera or a strict diamond-tile isometric grid. The layout adapts to narrow windows. Touchscreens use tap-to-move, tap-to-target, nearby interactions and the existing spell and menu buttons, without a visible directional pad.

## Shared lore

The canonical documents remain in the original application:

- [World lore](../wizard-combat/docs/lore/world-lore.md)
- [Creature and plant designs](../wizard-combat/docs/lore/monster-design.md)
- [Terrain and ecological foundations](../wizard-combat/docs/lore/terrain-design.md)

See [the design notes](docs/design.md) for what is implemented and what remains an encounter idea. Names such as Willowmere, Rowan, Mara, and the regional names are new local adaptations, not edits to the canonical lore.

## Development and verification

```powershell
npm test
npm run build
npm run preview
```

`npm test` runs the deterministic gameplay tests with Node. `npm run build` writes a standalone Vite production build to `dist/`. `npm run preview` serves that build at **http://127.0.0.1:4175/**.

Browser checks:

```powershell
npx playwright install chromium
npm run test:browser
```

The browser tests run in an isolated profile, check conversations, bindings, saves, keyboard movement, mode attacks, tactical placement, PNG downloads, all four habitats, and compact/narrow layouts, and save screenshots under ignored `artifacts/`. If using an already-installed compatible headless Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. The development-only `?test` harness is excluded from the production build.

## Source map

| File | Responsibility |
| --- | --- |
| `src/data.js` | Spells, species, region descriptions, places, quests |
| `src/world.js` | Stable habitats, terrain queries, paths, collision, scenery, authored communities |
| `src/game.js` | Movement, combat, ecological routines, quests, observations, serialization |
| `src/render.js` | Sprite atlases, depth ordering, animation, effects, maps |
| `src/terrain.js` | Nearby terrain tiles with a bounded cache |
| `src/regions.js` | Expanded routes, camps, landmarks and ecological communities |
| `src/environment-catalog.js` | Tree families, variants and habitat props |
| `src/expansion-monsters.js` | New species and regional creature appearances |
| `src/ecology-expansion.js` | Resource visits, feeding routines, followers and calls |
| `src/ui.js` | HUD, accessible menus, grimoire, conversations, journal, atlas |
| `src/main.js` | Input, frame loop, startup, persistence, focus handling |
| `src/sprites.js` | Whole-silhouette extraction and directional frame mapping |
| `src/screenshot.js` | Local PNG download of the game and visible UI |
| `src/audio.js` | Optional locally synthesized ambience and action sounds |
| `src/style.css` | Responsive forest-and-brass interface |

Art is saved in [public/assets](public/assets). [Art provenance and exact prompts](docs/art-prompts.json) document the initial atlases and archived originals, generated using the built-in image-generation tool. Generated source PNGs are preserved. Runtime bounds include all opaque pieces in each cell, so detached hats and heads are retained. The v2 art was prompted for simpler, coarser pixel clusters; it is not run through a pixelation filter.

[Ahriman’s Prophecy](https://aveyond.com/games/ahrimans-prophecy/) informs the village-centered exploration, keyboard walking, connected NPC errands, and in-world battle rhythm. Its assets are not used.

The additional [groves and wilds prompts](docs/environment-expansion-prompts.json) and [wildlife prompts](docs/wildlife-expansion-prompts.json) record the built-in generations and their padding/transparency corrections. Final expansion sheets are `public/assets/groves-expansion.png`, `public/assets/wilds-expansion.png`, and `public/assets/wildlife-expansion.png`.
