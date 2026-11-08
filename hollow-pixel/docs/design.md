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

Keyboard movement is immediate and normalized. Basic casting is a single free spark (14 base damage every 1.1 seconds), with automatic visible-threat selection and deliberate target switching. Space toggles basic attacks; Tab cycles targets. Spells occupy 1–9, with optional Q/E/F/R aliases. Aether Lance arms a four-spark next attack; Willow Ward follows, then a self-centered Wildbloom, Windrun escape and healing, spreading next-shot Briarbind, and Lantern Fox. The previous wall, ground-targeted area attacks, siphon and blink remain in code outside the current learning path. See [balance.md](balance.md) for exact costs, unlocks and simulation commands.

Mana, rather than long cooldowns, limits powerful casts. Magic power scales damage and utility duration. Two shared skill points per level buy Power, Mana, new spells or one focus upgrade per spell. Mana increases pool and regeneration together; the modest free level bonus prevents rapid early damage inflation. Growth and gear persist, and level-ups do not refill mana. Shields refresh rather than stack; healing is capped; roots stop movement while stun also cancels attacks. Peaceful wildlife remains protected.

Hostile creatures emphasize approach speed, awareness, projectile speed and frequent attacks. Most are territorial and visibly walk home after breaking pursuit, recovering health gradually; haven entry never instantly refills an enemy. Nearby compatible pack members rally together within a bounded radius, including when the first member is killed immediately. A few dedicated hunters pursue without a distance leash. Havens cancel aggression. Five-minute ordinary and eight-minute elite respawns require a subsequent haven visit and wait until the player has left the area. Camp clear records and one-time bounty rewards persist independently of the current population. Paused or closed games do not advance respawn time; reloads preserve the timer and haven gate.

The first pasture is a contained introduction farther north of town, with a clear approach and room to retreat outside the haven. Its three Seedlings cooperate within 120 units, move at 104 units/second after a brief 116-unit approach, and strike for three damage. All small Seedlings share 0.45-second warnings and 1.15-second recovery, including ordinary wilderness specimens. Three are intended to be comfortable with basic sparks; larger thickets reward powerful spells. Nearby Briar camps, the orchid and first traveling hedge sit beyond the introductory approach. Save migration preserves progression and wounds while relocating living enemies to this layout. Combatants use a spatial neighborhood and damped separation drift to fan out smoothly. Close attackers sidestep along their attack ring instead of bouncing out of reach and charging back. This adds no creature collision bodies and yields to narrow scenery gaps, roots, stuns and rooted hedge formations. Basic automatic fire resumes on loading a journey; a session-local pause shows OFF, while a haven shows SAFE.

## Walking and quest rhythm

[Ahriman’s Prophecy](https://aveyond.com/games/ahrimans-prophecy/) is a reference for village-centered adventuring, keyboard exploration, NPC conversations, connected errands, and combat in the world. All art and world fiction here are original to this project or adapted from the shared Hollow lore.

Willowmere is safe. Rowan sends the player north to clear three Seedlings; returning earns a modestly stronger wand, supplies and access to road bounties. Skill points buy Aether Lance and later lessons. Fixed-level monsters and permanent equipment upgrades make deeper roads dangerous until the player is prepared. Health attrition, tonic recovery and safe resting encourage return trips. Mara asks for the seasonal crossing to be cleared, and only afterward offers the longer wildlife notebook. Dialogue closes after accepting or completing an errand. The journal records objectives on demand. Toma offers rest and a road rumor; Pip wanders near the cottages and hints at the Scavengers’ needs.

The always-visible UI is health/aether bars, casting and spell icons, a tonic, menu icons, and a compact level, amber, danger and current-objective strip. Unlearned spells have no hotbar icons. Character has Items / Spells / Stats tabs; these share the skill-point budget and show actual combat recovery. Nearby interactions get a small C prompt. Region names and discoveries fade. The journal, spell selection and map pause the game. P locally downloads a PNG of the current game and UI, including an open conversation or menu.

## Expanded wilderness

The map is now 20000×12600 units (10× the pre-RPG 6000×4200 landscape), preserving the original village, quests and actor IDs. The existing eighteen ecological landmarks and four protected camps remain. Thirteen frontier forest districts add a connected network of long roads and expedition loops, thirteen supply refuges and local quest givers, and thirteen unique equipment rewards. Fixed-sized scenery cells maintain density across the enlarged landscape. Encounters progress from the easy village pasture to level-19 frontier wardens. Optional landmark interactions explain a nearby ecological clue without adding persistent HUD text.

The world places 37 species across 14 authored resource communities: mineral ponds, ant-supported canopies, fog gardens, burrow ridges, Whitebraid growth, frozen caches, vent terraces, hot nursery pools, cold gardens, snow tunnels, filtering terraces, burial groves, nursery refuges and a corpse garden. New animals visit compatible resources, feed or rest, accompany grazers, follow predators, inspect egg banks or call from defensive groves. Peaceful actors remain inside their seasonal habitats. The additional Scavengers have their own open local feeding crossing; they do not depend on the village quest.

Three new 8×8 atlases add 128 environment objects and 64 wildlife poses. The environment catalog supplies eight Giftwillows and four forms of the other grove families, using different silhouettes, age, root structure and branching. Regional creature forms are separate drawings. Every source sheet is retained with exact generation/correction prompts.

Terrain is baked into nearby 384-pixel tiles with a maximum cache of 48 tiles instead of one world-sized bitmap. Scenery rendering, collision, root hazards and feeding queries use spatial buckets. Distant peaceful creatures receive staggered, coarse idle updates; distant hostile packs remain dormant until approached. Ambient wildlife moves near the player. A spatial path index keeps terrain baking and scatter clearance local despite the much longer road network. Routes are checked for local passability and flood-fill connectivity from Willowmere, and the browser suite visits all thirteen frontier districts and all four seasonal habitats. The atlas supports zoom, drag-to-pan, a player focus, and a full-world overview.

## Traveling living walls

Marching Claspwoods are a local adaptation of defensive trees, using the existing tree atlas. Fourteen six-member groves follow independent schedules in the spring forests. Their physical trunks share movement, sight and projectile collision. Trees walk to formation; a 60-second hold begins only once the living group has arrived. Dispersal releases one tree every five seconds toward the next gathering area, followed by a wandering interval. Rooting or stunning one delays its arrival, and killing one opens a gap until its timed, haven-gated respawn. Rooted trunks regenerate faster than an apprentice’s basic sparks; higher power or mana investment can cut a gap. Attacked walking trees rally and pursue, while unprovoked groves are excluded from automatic attacks. The grove phase, elapsed time, active site and individual positions are saved.

Narrow travel lanes are cleared when placing groves, with terrain and habitat checks across every lane. Distant migration updates at a coarse rate; nearby trees move smoothly. The surrounding forest remains dense. No new source atlas is required.

## Scope and next development seams

This is a coherent first playable chapter, not the complete ecological backlog. The Hollow Elder currently has an exterior interaction and visual warning; its giant traversable interior is future work. Local time gradients, staggered predator eggs, long-term canopy failure, real food-web population changes, interiors and additional ecological chapters remain to be designed and built. The current RPG layer provides twelve equipment slots, skill-point spell training and amber-priced gear, 60 bounty camps, 20 elites, and fixed regional levels; see the README for the progression route.

NPCs provide conversation, services and quests, and Pip wanders near home. They do not yet follow daily schedules. Forest ground has microhabitats and decorative rocky ledges, but continuous traversable terrain elevation is not simulated. Neutral animals are protected from player attacks unless already aggressive; this keeps observation and ecological restoration central to this chapter.

All art and runtime code are inside `hollow-pixel/`. Shared lore is referenced in place to avoid diverging copies. Nothing in this prototype rewrites the existing wizard game's data, art, or save format.
