# The Hollow — Feywild journey

A first-person wizard RPG built around the new combat prototype. The supplied prototypes remain unchanged. Feywild's procedural tree, leaf, bark and noise components are adapted under `src/fey/`; Shattered Codex informed the equipment slots, exploration quests and utility spells. Its gameplay/UI/global state were not imported.

## Run

`npm install`, `npm run dev`, `npm test`, `npm run build`.

The current preview is http://127.0.0.1:5174/. Chrome/Edge support captured mouse look. Windowed play uses arrows to look and J/K/L for attack/bind/shield.

## Journey

Start at the Hearth knowing only Firebolt. The first three seedlings earn level two. Each level grants one spell knowledge, spent in the codex. First encounter clears award handcrafted equipment. Claim completed quests for XP, with bonus knowledge for exploration and outer keepers. Spent knowledge can be refunded at the Hearth.

Opening route: First embers, Bind, Briar track, Shield, Watchstones, Frostburst, Needle nursery. This introduces counters before encounters that depend on them. Choosing other spells remains possible.

17 named encounters, levels 1–10, and roughly 140 roaming wilderness packs occupy four seasonal courts over an 832m landscape: northwest blossom woods, northeast mushroom wetlands, southeast amber woodland and southwest winterlands. Later fights include 8- and 12-enemy broods, healer groups and heavy keepers. Ordinary monsters remain roughly 2–4 accurate fire hits at a comparable level; heavies last longer. Both encounter stats and player spell power grow with level.

## Controls

| Input | Ability | Level |
| --- | --- | --- |
| LMB | Free Firebolt; hold to repeat | Start |
| RMB | Seeking Bind; zero damage, 6s root (3.5s heavy) | 2 |
| Mouse forward / M5 | Shield; six frontal shots, 5s | 3 |
| Q | 16m Shockwave; push, stagger, clear projectiles | 4 |
| E | Frostburst; 10m splash, 40 damage with falloff, 2.5s slow | 4 |
| R | Siphon; aim to latch, then drain and heal up to 3.6s | 6 |
| F | 7.5m directional Blink | 5 |
| 1 | Lantern Fox; 55s companion attacking engaged visible enemies | 3 |
| 2 | Tailwind; 22s, +30% movement, +20% firing speed | 5 |
| 3 | Verdant Oath; 30s, 2 HP/sec healing | 7 |
| 4 | Hearthcall; 3s return channel, interrupted by damage/casting | 2 |

WASD move, Shift sprint, Space jump. Tab/B spellbook, I inventory, V journal, M map, N bestiary, T settings, Esc pause. Only learned spells appear on the combat HUD. Number keys 5–9 are reserved for future utility spells.

**Testing mode:** enable in Settings (T). G toggles free flight; WASD follows your aim, Space ascends and Ctrl descends. Shift accelerates to 140m/s in flight or 80m/s on foot. Turning flight off lands on terrain or cover below. Testing mode is session-only and resets on reload; ordinary game progress still saves.

Bind acquires a visible target within a forgiving forward cone, then steers a physical projectile. Cover breaks tracking and blocks it. Firebolt and enemy shots remain straight. Shield interception occurs on the visible ellipse 1.8m ahead. Area spells respect solid cover.

## Equipment, quests and saves

Six slots: wand, focus, head, robe, feet and charm, arranged around a paper-doll wanderer who visibly wears and holds what is equipped. Click a satchel item to equip it (the old one returns to the satchel), click an equipped slot to remove it, or drag between satchel and slot. Hovering an item shows its numbers, rarity and an ▲/▼ comparison, and previews the change on the character sheet (health, mana, regen, spell power, Firebolt damage and DPS, Frostburst, Siphon, Bind, damage reduction, move speed). First-clear rewards are deterministic and granted once. Effects include movement, spell power, health/mana, regeneration, longer Bind, wider Frostburst and improved Siphon healing.

Seven original quests connect the opening encounters, four courts and outer keepers. Claim rewards in the journal. The map reveals encounter names as you explore. No towns, merchants or inventory tetris yet.

Autosaves locally every ten seconds, on progression changes, pause and page exit under `hollow-fey-journey-v2`. Preserves level, knowledge, spells, equipment, quests, discoveries and position. Loading restores health/mana and repopulates encounters; first-clear rewards stay consumed. Death restores you in place. New Journey resets the save after in-game confirmation. Prototype saves are separate.

## Rendering

Adapted Feywild branch geometry, painted foliage cards, bark/rock textures and noise. The 832m landscape now has wooded ridges, wetland hollows, an autumn caldera and winter mountains rising over 100m above the Hearth, with flatter encounter clearings. Meandering paths and irregular lake shores share the terrain data used for movement and projectile collision.

Eight procedural ground materials (turf, forest floor, autumn leaves, rock, snow, sand, mud and basalt) blend by biome, slope, elevation and shoreline. Two bounded 256px texture arrays supply albedo, normal and roughness detail, with mipmaps and reduced distant detail. Terrain is split into 64 frustum-culled chunks. No erosion job or impostor-baking startup.

Instanced trees with distance-based detail; forest updates at about 3Hz. Tiled and culled grass/flowers. Varied boulders, low slabs and fallen logs are instanced in spatial tiles. Their rendered convex profiles are also their collision geometry. Tree trunks are solid cover. A spatial index keeps movement, projectile and AI cover queries local. Capped effect sprites and shared enemy textures. Nearby AI runs at 30Hz; swept projectiles at 120Hz. No shadow maps, reflections or expensive postprocessing.

Low/Balanced/High control resolution, tree detail and view distance. Optional frame stats show FPS, draw calls and triangles. Performance measurements are local observations, not guarantees across hardware.

Boulders and logs are solid and jumpable; tree trunks block movement, sight and spells while foliage remains decorative. The Hearth stones are decorative. Pools are shallow and traversable. Briar Seedling, Thorn Prowler and Hex Spitter are painted, animated SVG rigs; the other species still use emoji billboards until they get rigs. Navigation uses local corner routing around natural cover. Wilderness groups vary by biome and distance, roam near their home, and grant XP without duplicating named encounter rewards. Wilderness respawns take at least three minutes and wait until the player is more than 60m away. This is the first playable progression pass; pacing needs continued human playtesting.

## Interface

The codex is icon-tabbed (spellbook, inventory, journal, map, bestiary) with details on hover. The spellbook is a level tree; tooltips show live numbers scaled by current spell power. The HUD has a framed action bar with painted icons, mana costs and cooldown sweeps, numeric health/mana, a target frame (portrait, level, HP, status) and floating damage/XP numbers (toggle in settings).

## Monster rigs

`src/monsters/` holds paper-doll rigs: one 512×512 SVG drawing split into parts, each with a pivot and optional parent, plus an `animate(pose, state)` function. The game rasterises each part once per species and draws it as a billboarded plane; the bestiary and target frame render the same definition as live SVG. Beyond 40 m a rig swaps to a single rest-pose plane.

Animation state from combat: `move`/`phase` (gait), `windup`, `attack` (shot or strike), `hurt`, `stun` (Shockwave), `root` (Bind), `slow`, `dodge`, `dead`. Side-view art sets `side:true` and is flipped toward its travel direction.

To add a species: copy `seedling.js` (the commented reference), draw parts back to front, add it to `monsters/index.js`, and preview every state at `/bestiary.html` during `npm run dev`. `tests/art.test.js` checks part trees and that every state yields finite poses.

## Code

- `data.js`: abilities, species, encounters and solid cover.
- `landscape.js`: shared terrain and seasonal layout.
- `scenery.js`: deterministic natural cover, shared tree placement and wilderness packs.
- `cover-shapes.js`: shared render/collision hulls and spatial lookup.
- `ground.js`: layered terrain material and chunk meshes.
- `testing-mode.js`: optional accelerated movement and flight.
- `combat.js`: FPS simulation, homing, utility spells and enemy AI.
- `journey.js`: knowledge, loot, equipment, quests and save validation.
- `feyworld.js`: adapted procedural scenery, instancing and detail levels.
- `journey-ui.js`: codex tabs, spell tree, inventory/paper doll, journal, map and bestiary.
- `monsters/`: rig runtime (`rig.js`) and painted species. `art/`: item, spell and paper-doll SVG art.
- Tests cover combat, progression/counter timing, gear, rewards, homing/cover, utility spells and save round trips.
