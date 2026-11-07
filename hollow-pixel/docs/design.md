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
| Claspwood | Entering its exposed root circle triggers a visible contraction and damage with a recovery interval. |
| Mantleback | Slow roaming, idle feeding states, and a visible decomposer garden establish a peaceful autumn resident. |
| Insect support trails | Worker motion appears at Hollow Host and Claspwood roots. Structural canopy collapse is not simulated yet. |
| Lantern Fox | The summon follows the player and attacks only engaged threats, leaving neutral wildlife alone. |

The initial two 8×8 atlases contain 128 cells: 64 environment objects and 64 characters, creatures, and animation poses. The mage has four directions with two walking poses each; creatures and villagers have paired poses. Runtime extraction bounds every opaque part of each cell, including disconnected hats and heads. Source PNGs remain intact. Small birds, hares, moths, beetles and fox cubs, a roaming child, feeding gestures, smoke, vents and independent particles add motion without distorting body parts.

## Combat

Keyboard movement is immediate and normalized, with a small camera dead zone. Ground clicks do not move the player. Basic casting runs automatically outside the safe village: Ember deals more damage, Frost slows approaching enemies, and Siphon trades damage for modest healing. Each stance finds a nearby visible threat and continues after a kill. Basic attacks cost no mana. Enemy windups make standing exchanges readable while allowing the player to step back or use control spells.

Q/E/F/R are four independent loadout slots. Cooldowns belong to spells, so rebinding does not bypass them. Targeted spells validate range and solid cover before consuming mana. Area spells avoid peaceful animals. Q/E/R initially prepare Briarwall, Frostbloom and Hollow Bell for deliberate click placement; F casts a ward immediately. Preparing and cancelling spells spends nothing. Briarwall blocks actors and projectiles for seven seconds. Space suspends automatic attacks, and 1/2/3 or Tab change stance. Shields absorb damage before health, root prevents movement, stun cancels windups, and slow reduces movement speed. Healing and mana are capped. Death preserves progress and returns the player to Willowmere.

## Walking and quest rhythm

[Ahriman’s Prophecy](https://aveyond.com/games/ahrimans-prophecy/) is a reference for village-centered adventuring, keyboard exploration, NPC conversations, connected errands, and combat in the world. All art and world fiction here are original to this project or adapted from the shared Hollow lore.

Willowmere is safe. Rowan sends the player north to clear three Seedlings; returning earns his introduction to Mara. Mara asks for the seasonal crossing to be cleared, and only afterward offers the longer wildlife notebook. Dialogue closes after accepting or completing an errand. The journal records objectives on demand. Toma offers rest and a road rumor; Pip wanders near the cottages and hints at the Scavengers’ needs.

The always-visible UI is health/aether bars, three stance icons, four bound spells, a tonic, and menu icons. Nearby interactions get a small C prompt. Region names and discoveries fade. The journal, spell selection and map pause the game. P locally downloads a PNG of the current game and UI, including an open conversation or menu.

## Expanded wilderness

The map is now 6000×4200 units (5.83× its previous area), preserving the original village, quests and actor IDs. Eighteen added landmarks form eastern and southern circuits with fourteen route extensions. Four protected camps offer rest, supplies and local conversations. Optional landmark interactions explain a nearby ecological clue without adding persistent HUD text.

The world places 36 species across 14 authored resource communities: mineral ponds, ant-supported canopies, fog gardens, burrow ridges, Whitebraid growth, frozen caches, vent terraces, hot nursery pools, cold gardens, snow tunnels, filtering terraces, burial groves, nursery refuges and a corpse garden. New animals visit compatible resources, feed or rest, accompany grazers, follow predators, inspect egg banks or call from defensive groves. Peaceful actors remain inside their seasonal habitats. The additional Scavengers have their own open local feeding crossing; they do not depend on the village quest.

Three new 8×8 atlases add 128 environment objects and 64 wildlife poses. The environment catalog supplies eight Giftwillows and four forms of the other grove families, using different silhouettes, age, root structure and branching. Regional creature forms are separate drawings. Every source sheet is retained with exact generation/correction prompts.

Terrain is baked into nearby 384-pixel tiles with a maximum cache of 48 tiles instead of one world-sized bitmap. Scenery collision uses spatial buckets; distant creatures receive coarse idle updates. Routes are checked for local passability and flood-fill connectivity from Willowmere, and the browser suite visits every added landmark.

## Scope and next development seams

This is a coherent first playable chapter, not the complete ecological backlog. The Hollow Elder currently has an exterior interaction and visual warning; its giant traversable interior is future work. Local time gradients, staggered predator eggs, long-term canopy failure, real food-web population changes, advanced inventory/equipment, interiors, and additional chapters remain to be designed and built.

NPCs provide conversation, services and quests, and Pip wanders near home. They do not yet follow daily schedules. Forest ground has microhabitats and decorative rocky ledges, but continuous traversable terrain elevation is not simulated. Neutral animals are protected from player attacks unless already aggressive; this keeps observation and ecological restoration central to this chapter.

All art and runtime code are inside `hollow-pixel/`. Shared lore is referenced in place to avoid diverging copies. Nothing in this prototype rewrites the existing wizard game's data, art, or save format.
