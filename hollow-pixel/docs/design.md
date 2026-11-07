# Between Seasons: first chapter design

## Direction

The original game's world is the foundation; its first-person targeting, camera, terrain meshes, and combat simulation are not reused. The new game emphasizes reading a place, watching the lives inside it, and deciding when to fight.

A fixed, authored set of landmarks sits inside a deterministic patchwork of permanent seasons. Procedural variation adds moisture, soil, litter, flowers, rocky formations, vegetation density, and readable paths. Time of day does not advance the seasons. Matter and wildlife can cross the seam when their own habitat rules permit it.

The graphical projection compresses world Y to 72% for a three-quarter overhead view. Art faces the same general view; world objects sort by their ground position. Trees, buildings, and rocks have physical bases, and walking and Mothstep share the same collision model. The visible seasonal seam and ground conditions use the same functions as wildlife habitat checks.

## Behaviors with actual consequences

| Relationship | First playable implementation |
| --- | --- |
| Giftwillow and Barkjaw | Grazers approach Giftwillows and alternate feeding and lookout states. The mouth-limbs move while feeding. |
| Separated feeding pair | One member waits beyond thorn growth. Defeating the three pasture Seedlings releases it to return to its partner. |
| Rootknife and lookout | Rootknives approach unguarded grazers and hold back from nearby watchful pairs. They fight the player if approached. |
| Snowkeel and cold ground | Snowkeels move within winter and refuse movement that would take them into warm ground. Their passage leaves animated snow ridges. |
| Ventback and nest | Ventbacks remain near their clutch and become hostile only when the player approaches the nesting area closely. |
| Boundary Scavenger | Separate cold and warm food reserves drain over time. After the crossing is cleared, animals travel between its two sides and replenish the corresponding reserve. |
| Claspwood | A 40-unit root circle warns for 0.3 seconds, then lashes if the player remains. A 0.8-second recovery makes repeat strikes roughly 1.1 seconds apart. Alarm calls use the same cooldown; stepping out avoids the hit, and safe havens cancel pending strikes. |
| Mantleback | Slow roaming, idle feeding states, and a visible decomposer garden establish a peaceful autumn resident. |
| Insect support trails | Worker motion appears at Hollow Host and Claspwood roots. Structural canopy collapse is not simulated yet. |
| Lantern Fox | The summon follows the player and attacks only engaged threats, leaving neutral wildlife alone. |

The initial two 8×8 atlases contain 128 cells: 64 environment objects and 64 characters, creatures, and animation poses. The mage has four directions with two walking poses each; creatures and villagers have paired poses. Runtime extraction bounds every opaque part of each cell, including disconnected hats and heads. Source PNGs remain intact. Small birds, hares, moths, beetles and fox cubs, a roaming child, feeding gestures, smoke, vents and independent particles add motion without distorting body parts.

## Combat

Keyboard movement is immediate and normalized, with a small camera dead zone. Ground clicks follow a route around obstacles. Basic casting runs automatically outside the safe village: Ember deals more damage, Frost slows approaching enemies, and Siphon trades damage for modest healing. Each stance finds a nearby visible threat and continues after a kill. Basic attacks cost no mana. Enemy windups make standing exchanges readable while allowing the player to step back or use control spells. Combat movement is 30% faster than the original pace, with a 0.45-second base windup and 1.05-second recovery. A level advantage increases notice distance, projectile speed and pursuit range. Enemies at least two levels above the player get a two-second opening rush that can catch a passing runner. Melee enemies advance during the windup, but walls, roots and stun still stop them.

Q/E/F/R are four independent loadout slots. Cooldowns belong to spells, so rebinding does not bypass them. Targeted spells validate range and solid cover before consuming mana. Area spells avoid peaceful animals. The initial Q/E/F/R slots are locked until their spells are learned. The pasture reward assigns Briarbind to Q; later lessons allow Briarwall, Frostbloom and Hollow Bell placement, Willow Ward and other abilities. Preparing and cancelling spells spends nothing. Briarwall blocks actors and projectiles for seven seconds. Space suspends automatic attacks, and 1/2/3 or Tab change stance. Shields absorb damage before health, root prevents movement, stun cancels windups, and slow reduces movement speed. Healing and mana are capped. Death preserves progress and returns the player to Willowmere.

## Walking and quest rhythm

[Ahriman’s Prophecy](https://aveyond.com/games/ahrimans-prophecy/) is a reference for village-centered adventuring, keyboard exploration, NPC conversations, connected errands, and combat in the world. All art and world fiction here are original to this project or adapted from the shared Hollow lore.

Willowmere is safe. Rowan sends the player north to clear three Seedlings; returning earns Briarbind, a stronger wand, supplies and access to spell lessons and road bounties. Fixed-level monsters and permanent equipment upgrades make deeper roads dangerous until the player is prepared. Health attrition, tonic recovery and safe resting encourage return trips. Mara asks for the seasonal crossing to be cleared, and only afterward offers the longer wildlife notebook. Dialogue closes after accepting or completing an errand. The journal records objectives on demand. Toma offers rest and a road rumor; Pip wanders near the cottages and hints at the Scavengers’ needs.

The always-visible UI is health/aether bars, casting and spell icons, a tonic, menu icons, and a compact level, amber, danger and current-objective strip. Unlearned casting styles and spells are dimmed. Nearby interactions get a small C prompt. Region names and discoveries fade. The journal, spell selection and map pause the game. P locally downloads a PNG of the current game and UI, including an open conversation or menu.

## Expanded wilderness

The map is now 20000×12600 units (10× the pre-RPG 6000×4200 landscape), preserving the original village, quests and actor IDs. The existing eighteen ecological landmarks and four protected camps remain. Thirteen frontier forest districts add a connected network of long roads and expedition loops, thirteen supply refuges and local quest givers, and thirteen unique equipment rewards. Fixed-sized scenery cells maintain density across the enlarged landscape. Encounters progress from the easy village pasture to level-19 frontier wardens. Optional landmark interactions explain a nearby ecological clue without adding persistent HUD text.

The world places 37 species across 14 authored resource communities: mineral ponds, ant-supported canopies, fog gardens, burrow ridges, Whitebraid growth, frozen caches, vent terraces, hot nursery pools, cold gardens, snow tunnels, filtering terraces, burial groves, nursery refuges and a corpse garden. New animals visit compatible resources, feed or rest, accompany grazers, follow predators, inspect egg banks or call from defensive groves. Peaceful actors remain inside their seasonal habitats. The additional Scavengers have their own open local feeding crossing; they do not depend on the village quest.

Three new 8×8 atlases add 128 environment objects and 64 wildlife poses. The environment catalog supplies eight Giftwillows and four forms of the other grove families, using different silhouettes, age, root structure and branching. Regional creature forms are separate drawings. Every source sheet is retained with exact generation/correction prompts.

Terrain is baked into nearby 384-pixel tiles with a maximum cache of 48 tiles instead of one world-sized bitmap. Scenery rendering, collision, root hazards and feeding queries use spatial buckets. Distant peaceful creatures receive staggered, coarse idle updates; distant hostile packs remain dormant until approached. Ambient wildlife moves near the player. A spatial path index keeps terrain baking and scatter clearance local despite the much longer road network. Routes are checked for local passability and flood-fill connectivity from Willowmere, and the browser suite visits all thirteen frontier districts and all four seasonal habitats. The atlas supports zoom, drag-to-pan, a player focus, and a full-world overview.

## Traveling living walls

Marching Claspwoods are a local adaptation of defensive trees, using the existing tree atlas. Fourteen six-member groves follow independent schedules in the spring forests. Their physical trunks share movement, sight and projectile collision. Trees walk to formation; a 60-second hold begins only once the living group has arrived. Dispersal releases one tree every five seconds toward the next gathering area, followed by a wandering interval. Rooting or stunning one delays its arrival, and killing one opens a persistent gap. The grove phase, elapsed time, active site and individual positions are saved.

Narrow travel lanes are cleared when placing groves, with terrain and habitat checks across every lane. Distant migration updates at a coarse rate; nearby trees move smoothly. The surrounding forest remains dense. No new source atlas is required.

## Scope and next development seams

This is a coherent first playable chapter, not the complete ecological backlog. The Hollow Elder currently has an exterior interaction and visual warning; its giant traversable interior is future work. Local time gradients, staggered predator eggs, long-term canopy failure, real food-web population changes, interiors and additional ecological chapters remain to be designed and built. The current RPG layer provides four equipment slots, amber-priced training and gear, 60 bounty camps, 20 elites, and fixed regional levels; see the README for the progression route.

NPCs provide conversation, services and quests, and Pip wanders near home. They do not yet follow daily schedules. Forest ground has microhabitats and decorative rocky ledges, but continuous traversable terrain elevation is not simulated. Neutral animals are protected from player attacks unless already aggressive; this keeps observation and ecological restoration central to this chapter.

All art and runtime code are inside `hollow-pixel/`. Shared lore is referenced in place to avoid diverging copies. Nothing in this prototype rewrites the existing wizard game's data, art, or save format.
