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

Start by speaking to **Rowan**, beside the village waypost. **Mara** stands outside the moss-roof cottage to the northeast. New journeys begin with basic Ember casting. Clear the three pasture Seedlings and return to Rowan to earn Briarbind, a singing-reed wand, amber and tonics. Buy further spell lessons at safe settlements with amber, subject to level requirements. Equip rewards in the pack (I).

| Control | Action |
| --- | --- |
| Drag in the bottom third | Immediate invisible movement joystick; one at a time |
| Pinch with two fingers | Zoom the world in or out (1×–4×) |
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
| K / I / J / M | Spell lessons / equipment / journal / map |
| P | Download a PNG of the current game view, including visible UI |
| Escape | Close a menu or pause |

Q/E/F/R can all be reassigned. Click a hotbar ability to prepare or cast it; right-click it to change that slot. Choose a binding in the grimoire, then click a spell. Changing bindings does not reset cooldowns. Menus pause simulation. Sound can be enabled in the pause menu. Walk with the keyboard, or drag in the bottom third of the world to use an invisible analog joystick immediately. Once the joystick has moved, extra fingers cannot zoom, steal or stop it. Lift every finger before starting a new pinch. A fresh two-finger gesture can zoom anywhere, including the lower third if the joystick has not moved yet. Tapping nearby villagers and objects interacts with them; tapping nearby neutral wildlife observes it. Quick taps select or switch a creature target, interact, or place an armed spell. Ordinary ground taps do not start walking. Basic attacks automatically find nearby threats, use no aether, and pause inside Willowmere. Screenshot files use timestamped names and the browser’s normal download destination; capture happens locally with no upload.

Resting at a Hearthstone or inn restores health and aether outside combat. Health does not regenerate while walking; tonics restore 65 health with an eight-second recovery. Returning to a haven between encounters is part of the expedition loop. The market trades three gathered sprigs or twelve amber coins for a tonic. Death returns the player home while preserving discoveries and quest progress.

Progress saves automatically every twelve seconds, on relevant menu actions, and when the tab is left. It uses this browser and origin's local storage (`hollow-between-seasons-v1`). A small diamond confirms manual saves; errors appear briefly. It does not touch wizard-combat saves.

## This chapter

- **Willowmere:** cottages, a lit inn, a market, cultivated beds, a well, fences, a courier's camp, two quest-giving villagers, a roaming child, an innkeeper, and a restorative Hearthstone.
- **The Verdant Reach:** grazing clearings, riverbanks, orchid patches, flower groves, Giftwillows, Claspwoods, Hollow Hosts, and Bellroots.
- **Amberfall Woods:** leaf litter, Sourhearts, mossy ledges, mushroom gardens, a pond, and the immense Hollow Elder.
- **The Stillwhite:** snowbell patches, conifers, icy crystals, moving feeding trails, and a frozen river shrine.
- **Cindervein:** basalt vents, mineral ground, thorn scrub, impassable lava, nesting Ventbacks, and Lantern Wyrms. Steam marks the adjacent winter boundary.
- **37 creature species**, including 24 new lore-based species and 8 regional appearances of familiar animals, plus three connected opening quests: reunite a grazing pair for Rowan, take his introduction to Mara and reopen the Boundary Scavengers’ feeding corridor, then keep a notebook of four habitat specialists.
- **Nine learnable, assignable spells:** Briarwall, Briarbind, Frostbloom, Willow Ward, Hollow Bell, Moon Siphon, Verdant Oath, Mothstep, and Lantern Fox. These cover temporary terrain, roots, slows, shields, stuns, area damage, life drain, healing, movement, and a combat companion. Briarwall blocks movement and shots for seven seconds.
- **320 active sprite cells** across five transparent 8×8 atlases, including scenery variants, four-direction mage poses, creature walk cycles, villagers, and small wildlife, combined with coded terrain, particle effects, shadows, water glints, weather, footsteps/feeding motion, and depth sorting. The HUD is limited to small health/aether bars, casting icons and menu controls; region names and interaction cues appear only when relevant. Canopies fade when they obscure the player.

The world now covers **20000×12600 units**: **10× the area of the 6000×4200 world from before the RPG update**. The starting village retains its scale and location. Fixed-size scenery cells populate the additional land at least as densely as the existing wilderness; the map contains roughly 52,000 scenery objects and 4,500 creatures. Follow the east road from Willowmere toward Redleaf Post and the Cuphorn Pools, or continue south from Snowbell Hollow toward Snowwatch and Floodblossom. **18 new landmarks** connect through branching footpaths and bridges, with four new safe camps for conversation, supplies and rest. The map opens with M; use +/− to zoom, drag to pan, Find me to inspect your surroundings, and Whole world for the overview.

New communities include ant-supported canopy groves, fog gardens, burrow ridges, Whitebraid growth, frozen larders, Glassbrood pools, cold gardens, burial mounds, Hush terraces and the Bone Orchard. Eight Giftwillow drawings and several forms of each major tree family mix young, old, browsed, twisted, branching and hollow silhouettes. Related trees stay in recognizable groves instead of being randomly mixed across every habitat.

The view is a three-quarter top-down projection with compressed ground depth, rather than a rotating 3D camera or a strict diamond-tile isometric grid. The layout adapts to narrow windows. Touchscreens use immediate bottom-third joystick movement, tap-to-target, nearby interactions and the existing spell and menu buttons, without a visible directional pad. Mobile starts at 1.5× world zoom instead of desktop's 2×, showing a third more world in each direction. Pinch to adjust between 1× and 4×; the HUD stays the same size.

## RPG progression

The pasture is the level-one introduction. Rowan rewards its clear with **Briarbind**, **Rowan’s singing reed** (+25% spell damage and +3 basic damage), 35 amber and two tonics. Its XP reward brings you to level two. The persistent objective strip points to Rowan, the pasture, and your active bounty. Danger levels appear in the HUD, on selected enemies, and at bounty markers on the map.

Twenty bounties contain **60 named camps and 20 elite keepers**, using existing creature art. Seven contracts introduce the original regions; thirteen more cross the frontier. Roadside packs and off-road communities populate the long connecting routes. Monsters have fixed regional levels; returning with better equipment makes earlier areas easier. In combat, monsters move 30% faster than their old pace and use a 0.45-second windup with about 1.05 seconds between attacks. Higher-level enemies notice you farther away, open with a short two-second rush, and fire faster projectiles; simply sprinting through them can draw real hits. Cover, roots, stun, movement upgrades and safe refuges still provide ways out. Claspwoods show a 0.3-second root-circle warning and repeat their strikes about every 1.1 seconds if you remain within 40 units. Move out as soon as you see the first warning or strike. Deep-wilderness enemies have substantially more health and damage than pasture seedlings. Roadside patrols return after three minutes when you are at least 450 units away; named camps stay cleared.

| Route | Suggested level | Turn in | Equipment reward |
| --- | --- | --- | --- |
| Briar Road, north of the pasture | 2–3 | Rowan, Willowmere | Briarwarden coat: +30 health, 12% damage reduction |
| East road to Redleaf | 4–5 | Neris, Redleaf Post | Sunstone: +25% power, +30 aether |
| Snow road to Snowwatch | 5–6 | Orren, Snowwatch | Greatcoat: +60 health, 22% damage reduction |
| Southern Cinder terraces | 6–7 | Mara, Willowmere | Cinder heartwood: +80% power, +9 basic damage |
| Cuphorn Pools to the canopy | 7–8 | Neris, Redleaf Post | Canopy heart: power, aether and regeneration |
| Whitebraid and Frozen Larder | 9–10 | Tal, Pilgrim Hearth | Pilgrim boots: movement and health |
| Crownless Road beyond Whitebraid | 11–12 | Mara, Willowmere | Last Lantern: +120% power, +15 basic damage |

The frontier adds **13 forest districts and 13 supply refuges**, spanning levels 5–19, around a central Willowmere. Mossway opens west from the village road, Bellwood connects north beyond the Briar Road, Redwood branches west from Floodblossom, and Ember Deeps runs south from the Pilgrim Hearth. The eastern route continues past the Crownless Road to Longbriar. Winding links connect the remaining forests in all directions, with individually oriented expedition loops instead of a rectangular road grid. Each district has three named camps, an elite warden, a local keeper, supplies, rest and a unique equipment reward. The road network is over 130,000 world units long.

Clustered tree families, open browsing pockets and undergrowth continue throughout the frontier. **39 ecological pockets** add planted ponds, fog gardens, burrow ridges, burial mounds, corpse gardens, feeding terraces, frozen larders, snowbell gardens, cold gardens, mineral pools, vent nurseries and ash gardens. Resident animals use the existing feeding and wandering routines; a wider mix of peaceful wildlife and predators inhabits the connecting wilderness. Water and lava use the same queries for terrain and movement, with passable road crossings.

Refuges are separated by thousands of world units. They give you bases for repeated trips into the same forest; the region's warden is a destination rather than another monster beside town. The original early quests and saves remain usable. On first loading an older save from the relocated frontier, you return to Willowmere with progression intact. Subsequent saves retain positions throughout the centered world.

Accept unlocked bounties from the journal while in a haven, or speak to their giver. All three camps are required; return to the named giver to claim the reward. The market also sells a stronger wand, movement boots and an aether pendant. The equipment screen shows actual stats and what an item replaces. Gear and lesson purchases use the same amber, so supplies and upgrades compete for your expedition budget.

Existing saves retain their previously available spells. To experience the basic starting progression, choose **Esc → New journey → Start new journey**; this explicitly replaces the current local save. New saves preserve learned spells, equipment, cleared camps and bounty progress.

## Marching Claspwoods

Fourteen independent traveling hedges live along the Briar Road, the Living Scaffold, Longbriar, Mossway, Bellwood and the Southern Canopy. Each contains six **Marching Claspwoods**, using the existing tree artwork with walking root legs and interwoven roots when they form a wall.

Their staggered cycle is: scatter and wander, gather across a trail, **hold the completed wall for 60 seconds**, then release **one trunk every five seconds**. They slowly migrate toward a second gathering spot as they disperse. Another grove may be closing a different stretch while this one opens. The minute starts after the living members have actually reached formation, and the groves continue their schedules away from the player.

Trunks physically block walking, spell paths, and sight. They lash with the same short warning and fast repeated root strikes as fixed Claspwoods. Take another path, wait for the hedge to loosen, bind or stun an assembling trunk, or cut one down to make a permanent opening. Formation phase, timer, migration positions and defeated trunks survive saves. Zoom the atlas to see each hedge's current phase, or observe a tree for its field-guide entry.

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
| `src/rootwall-layout.js` | Traveling hedge territories, formations and scatter lanes |
| `src/rootwalls.js` | Independent grove schedules, physical migration and saved state |
| `src/frontier.js` | Tenfold world dimensions, forest districts, roads, refuges and contracts |
| `src/frontier-world.js` | Dense frontier scenery, wildlife and refuge generation |
| `src/adventure.js` | Gear, training costs, regional levels, routes and bounty encounters |
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
