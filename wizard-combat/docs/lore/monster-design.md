# The Hollow monster and living plant design backlog

Build creatures whose anatomy, behavior and presence follow from the world's ecology. This includes predators, prey, stationary hunters, defensive trees, symbiotic plants and small animals that make larger ecosystems function. A creature does not need to attack the player to earn its place in the game.

Creative direction comes from [World lore and ecological foundations](world-lore.md), especially its accepted refinements. Habitat requirements and world systems are in [Terrain and ecological systems design backlog](terrain-design.md). All entries below are design and implementation work to do. Working names, detailed mechanics, suggested counters and build order are proposals unless explicitly identified as accepted refinements.

## Build sequence

Build complete small communities before expanding the roster. The suggested order proves progressively harder systems while delivering recognizable places.

| Stage | Community | First playable result | Dependencies |
| --- | --- | --- | --- |
| 1 | Barkjaw, Claspwood, Giftwillow and Rootknife | Observe paired grazing, provoke a tree strike, see an opportunistic hunt and choose how to cross the clearing | Creature targeting, food points, tree attack states and shared collision |
| 2 | Boundary Scavenger, Snowkeel, Ventback and Steam Moth | Two environments within roughly 20 m sustain animals that cannot live in either environment alone | Fixed small habitats, adjacency, snow depth and nest sites |
| 3 | Hollow Elder and Canopy Ants | Enter an apparently dead giant tree; discover living structural trails in another grove | Interior geometry, environmental attacks, support states and escape routes |
| 4 | Gradient Brood, Eggrunner, Duskcoil and slow habitat residents | Observe staggered hatching and a risky egg raid across a gradual time boundary | Local clocks, perception, incubation, resistance and temporal audio |
| 5 | Spring, autumn, winter and terrain engineering extensions | Add diversity through the supporting catalog below | Reuse proven habitat and interaction systems |

## Shared creature requirements

- Define habitat, food, reproduction, predators and environmental limits before finalizing appearance.
- Give each active species an ordinary routine, a reason to fight, a retreat or avoidance rule, and a readable attack cue. Hunger, nesting and defense should produce different decisions.
- Support creature-to-creature encounters. Hollow trees must trap monsters; Rootknives must hunt grazers; egg hunters must consume eggs.
- Record the marks a species leaves: scars, tunnels, nests, routes, stripped bark, excrement, pollen, corpses or altered growth.
- Specify visual and audio cues that let the player learn the rule without a bestiary explanation. Camouflage may be excellent but must leave discoverable evidence.
- Separate ecological population limits from combat respawn rules. Killing an organism should not be the only meaningful interaction, and one encounter should not create unlimited offspring, resources or experience.
- Start with bounded authored encounters and a small number of interacting agents. Full world population simulation is a later design choice.
- For each species, deliver a silhouette, material palette, scale relative to player, animation/state list, habitat placement rules, interaction definition, bestiary entry and one demonstrable encounter.

## Priority creature designs

### Barkjaw

**Role and habitat:** Heavy tree grazer in browsed woodland. Accepted defining anatomy is a cow-like body with a dangerous spider-like mouth adapted to subduing living trees.

**Appearance:** Broad shaggy back, protected neck, closable nostrils, thick eyelids and outward-braced forelegs. Four outer mouth-limbs pin branches; two inner hooks grip wood around a recessed grinding mouth. Keep the calm body silhouette and unfolding face equally readable.

**Behavior:** Feed in pairs, alternating feeder and lookout. Prefer young wood and Giftwillow branches. Approach Claspwoods cautiously; bait a contraction and exploit the recovery. Defend the partner and retreat when overwhelmed. Ordinary nearby movement need not provoke aggression.

**Encounter and counters:** The front is dangerous; commitment to feeding exposes the flank and rear. A Rootknife attempts to exploit that opening. The player can observe, separate the pair, protect it or reroute it with food. Exact spell interactions need playtesting.

**Terrain and assets:** Feeding-height bark scars, low crowns, hoof paths, seedlings suppressed around feeding sites, mouth plates and grazing audio. Animations need rest, lookout, brace, mouth unfolding, stripping, defensive sweep and alarm.

**Completion check:** Two Barkjaws visibly alternate roles; an isolated feeder is more vulnerable than a protected one; the clearing's shape and scars match their bodies.

### Claspwood

**Role and habitat:** Stationary constricting tree whose loose vines resemble fallen vegetation. Surface-root pressure triggers an attack above an ecological weight threshold.

**Behavior:** Warn through root tension and vine movement, constrict, expend stored energy, then recover. Small visitors can pass safely. A Barkjaw can provoke and exhaust it. The tree must not attack continuously without cost.

**Encounter and counters:** Retreat before the loop closes, provoke the strike from outside its reach, or interrupt an attacking part. Prototype how Bind, Shockwave and damage affect vines without treating the entire tree as an ordinary humanoid enemy.

**Assets:** Resting loops, pressured roots, tightening vines, recovery droop and remains of prior prey. Match rendered reach to the collision and attack volumes.

**Completion check:** A player can learn the tell, survive a failed attempt and exploit recovery; both appropriate wildlife and the player trigger the same rule.

### Giftwillow and Sourheart

**Giftwillow:** Grow detachable nutritious branches that redirect grazing away from the trunk. Show browsed and replenishing states, seeds caught in fur, and a recognizable branch form. A feeding herd should favor an available gift branch. Proposed quest use: restore a safe grazing route before dense hunting cover returns.

**Sourheart:** Damage triggers bitter, irritating sap. Show a delayed change in sap color, gloss or vapor so grazers and players can recognize the response. Feeding duration should change when the defense activates. Specialized grazer saliva is a later variant, not a mandatory first implementation.

**Completion check:** The two trees produce different observable feeding decisions rather than merely different textures.

### Hollow Host and its defenders

**Role:** Tree that houses stinging insects in resin-fed chambers. This is distinct from the giant Hollow Elder and from structural Canopy Ants.

**Behavior:** Bark damage exposes channels; air through them whistles; the resident colony responds. Insect activity should also be visible during calm conditions. Potential pollination duties connect the defense to nearby useful plants.

**Assets and encounter:** Chamber mouths, resin trails, whistle cues and bounded swarm effects. Closing a damaged channel or withdrawing should be designable alternatives to killing the colony.

**Completion check:** A player can connect damage, whistle and defense, and observe the ecological cost of removing the defenders in an authored quest.

### Rootknife

**Role and habitat:** Low ambush predator of tree grazers, concealed among exposed roots and damaged branches at feeding sites.

**Appearance:** Long flexible body, flattened head and hooked forelimbs that attack soft tissue behind legs. Its shape should echo the woodland it hunts in without becoming visually indistinguishable at every distance.

**Behavior:** Wait for mouth-limbs to commit, approach the unguarded side, strike and withdraw. Avoid the front of healthy paired grazers. Later behavior can disturb saplings to separate a herd. Its optional scavenger follower squeals at the start of a hunt, sometimes spoiling the ambush.

**Encounter and cues:** Scraped soil, displaced small animals and a pre-strike flex reveal it. Open grazed ground reduces its concealment. A quest can trace livestock loss to missing experienced herd members or a poorly designed fence.

**Completion check:** The same Rootknife attacks an isolated feeder but declines or delays the attack when a partner has a clear view.

### Boundary Scavenger

**Accepted requirement:** Digestion needs food from both sides of a seasonal boundary. A large single-season region is effectively a desert despite plentiful carrion.

**Proposed mechanism:** Two gut cultures require different dietary inputs. Carrion or fungal coatings from each side replenish a separate reserve. Exact foods and appearance remain open; avoid locking the art to a generic animal before selecting the feeding mechanism.

**Behavior:** Alternate feeding grounds, cache food near crossings, defend access rather than a broad territory, and become distressed or leave when one resource is inaccessible. An uninterrupted region should be unattractive to its path selection, not just have a lower spawn probability.

**Encounter and cues:** A worn route crosses the boundary repeatedly. Two visibly distinct food caches reveal the dependence. It may be dangerous around scarce supplies but is not automatically a dedicated player hunter.

**Assets:** Distinct feeding animations for the two resources, carrying and caching states, border trails and signs of depleted reserves.

**Completion check:** With abundant food on only one side, the animal still tries to reach the other. Restoring access fixes its condition. Moving a carcass alone cannot bypass the missing dietary component unless that component is actually present.

### Snowkeel

**Role and habitat:** Snow swimmer feeding on mineral-fed fungal corridors under deep snow close to volcanic ground. Requires cold, moist cover; bare ground is a real movement and survival limit.

**Appearance and cues:** Blade-shaped back, broad chest, digging paddles. Moving snow ridges, dim internal light and local snow settling indicate position before emergence.

**Behavior:** Follow connected deep snow and fungus. Aerate feeding beds and accidentally collapse Ventback breeding shelves. Avoid exposed rock rather than simply walking over it under a snow shader.

**Encounter:** A bridge collapses because forge runoff shifted the food corridor. Redirecting the runoff or providing a different route can solve the conflict.

**Completion check:** The creature remains viable near lava when its snow route is intact, cannot cross an exposed gap normally, and leaves tunnels that align with its movement.

### Ventback and Steam Moth

**Ventback:** Insulating scales and hollow dorsal vents. Adults use hot rock; eggs require warm support and cold wet cover. Parents maintain snow-overhung ledges, clear debris and defend the clutch. Nest defense must differ from ordinary roaming aggression. Snowkeel disturbance can trigger conflict without shared prey.

**Steam Moth:** Small larvae use warm exposed fungus; adults distribute spores among disturbed boundary patches. Begin as ambient life with a bounded quest population rather than full combat agents. Preserve its ability to be a missing ecological link.

**Assets:** Vent steaming, ledge scraping, guarded eggs, damaged clutch, moth swirls and fungal regrowth. Use targeted steam effects so important silhouettes remain visible.

**Completion check:** Ventback nesting requires both environmental inputs. A disturbed bed attracts moth activity; loss of the disperser can explain a failing patch while the boundary remains fixed.

### Hollow Elder

**Accepted requirement:** A giant apparently dead tree is a traversable shelter that attacks the player and other monsters after they enter. This is an environment-scale predator.

**Proposed anatomy:** A dead outer shell hides living root bundles and contractile inner growth. Some remote hollow limbs can be extensions of the same organism. How far the parent can reach is still a design decision.

**Encounter sequence:** Approach a believable shelter; notice old remains and slightly displaced bark; cross an inner pressure zone; see roots awaken; respond to local attacks and find an escape. A passing creature can trigger the tree first and demonstrate the danger.

**Counterplay and assets:** Interrupt individual attacking roots, retreat through a narrowing passage, or expose a vulnerable inner growth. Give closure clear wind-up and recovery. Provide routes and readable openings rather than an unavoidable sealed-room death. Build interior geometry, animated roots and attack volumes together; a billboard monster alone cannot deliver this encounter.

**Completion check:** Both player and wildlife can activate it; an informed player can identify and escape it; the trunk remains navigable before activation and collision follows its changing parts.

### Canopy Ants

**Accepted requirement:** Very active, dense ant-like trails help hold an immense canopy together. The forest must read as a living structural colony, with eventual canopy failure when that support is lost.

**Proposed behavior:** Interlocked worker groups brace joints while moving trails replenish them and repair damage. Some routes carry resin or wood fragments, but structural importance must remain visible in the living workers themselves. Different worker functions may share one colony rather than require many enemy species.

**Appearance:** Streams of articulated bodies entering cracks, crossing roots and reinforcing branch junctions. Concentrate movement at meaningful supports. Avoid covering the forest in generic silk. Veilspinner fog webs remain a separate ecological idea.

**Encounter:** A blocked trail diverts workers, a load-bearing junction weakens, branches sag and the colony attempts repairs. A player can restore a route, defend the workers, or deliberately cause a local failure with visible consequences.

**Completion check:** A specific trail connects a colony to a specific support; disrupting it produces staged weakness and a readable eventual collapse, not arbitrary instant destruction of the entire forest.

### Gradient Brood

**Accepted requirement:** A deadly predator distributes very fast-hatching eggs across a time gradient so offspring arrive at different outside times. The benefit must be the opposite of simultaneous hatching for safety in numbers.

**Proposed ecology:** Hatchlings are dangerous immediately, territorial and cannibalistic. Separation in outside time lets each disperse and find prey before another arrives. This explanation can be changed while retaining staggered emergence as the defining strategy.

**Nesting:** Similar eggs at different temporal depths accumulate incubation at their own local rates. Near-normal eggs hatch first; deeper eggs later. Extremely slow sites can preserve a short local incubation across very long outside periods. Do not fake all variation with unrelated random timers.

**Appearance and behavior:** Final adult body is open. Prioritize a distinctive egg, readable imminent hatch and an emerging young predator with a dangerous first behavior. Shell twitching, membrane motion and the surrounding environment jointly reveal progress and time rate.

**Encounter:** The player notices apparent abandoned eggs while an Eggrunner raids. Interrupting that raid may allow a dangerous hatch. Moving an egg toward normal time accelerates its remaining incubation; it must not reset age or automatically erase the risk.

**Completion check:** Equivalent eggs at different depths hatch in the expected order; movement changes subsequent incubation, not past progress; emergences are separated sufficiently for the ecological benefit to be observable. Population and reward limits prevent an endless hatch farm.

### Eggrunner

**Accepted candidate:** A creature less affected by time distortion enters a pocket to eat eggs before a much deadlier predator hatches.

**Proposed constraints:** Partial resistance applies to its living body, has an energetic or exposure cost, and does not automatically accelerate every object it touches. It must leave or recover after a raid. Its final anatomy and working name remain open.

**Behavior:** Inspect nesting margins, select reachable eggs, dash inward, break or eat one, and withdraw. Abort when hatching is too advanced. A failed raid should show why the egg predator is needed and feared.

**Counterplay:** The player can protect eggs, protect the Eggrunner, obstruct the route or simply observe. Its value as population control should complicate automatic aggression.

**Completion check:** Under the same local conditions it advances faster than an ordinary organism but within documented limits. It can succeed against a fresh egg and fail against a nearly hatched one. Carrying an egg does not silently confer resistance on the egg.

### Tetherfruit Tree

**Accepted requirement:** Fruit stays nutritious only while the parent recognizes its attachment, and animals transport it on living threads.

**Proposed interaction:** Show a living connection from tree to carrier, with a distinguishable connected state and a fading state after recognition ends. Decide separately whether physical continuity is sufficient, whether reconnection works, and how quickly nutrition is lost.

**Behavior and terrain:** Carriers stay within a thread's practical reach, route around obstructions or deliberately extend a growing tether. Trails can reveal the hidden parent. The tree's benefit could be seed placement or animal visitation; choose this before finalizing reproduction lore.

**Assets:** Fruit attached to a branch, carried fruit, flexible living thread, tension, break and loss-of-nutrition states. Simplify distant threads while preserving the visible connection during interaction.

**Completion check:** A carrier visibly moves with the connection intact; cutting or invalidating it changes the fruit according to one consistent rule. Inventory storage and save/load must preserve the relevant state.

### Groveflower

**Accepted requirement:** Flowers grow on carnivores because hunting routes carry them between distant groves. This is distinct from a predator cultivating camouflage.

**Proposed relationship:** Seeds attach in a resting grove, root shallowly in specialized host tissue, then exchange pollen with flowers encountered along the hunting circuit. A possible host benefit is repelling parasites; scent that gives away the host is a possible cost. Select a balanced relationship during detailed design.

**Assets and behavior:** Flowers physically attach to a moving host, respond to gait, and show seed or pollen transfer at compatible groves. Avoid turning the host into a stationary shrub during locomotion.

**Completion check:** At least two groves and a host route form a visible dispersal chain; interrupting the route has a local ecological consequence. The host remains a competent carnivore.

### Overgrowth Stalker

**Accepted requirement:** Real plants grow through a predator's skin. Greater concealment reduces mobility, forcing periodic clearing or shedding.

**Proposed behavior:** Settle in suitable vegetation and become increasingly concealed; ambush from that position; strip growth against stones or shed it before traveling. A recently cleared animal moves better but is easier to see.

**Assets:** Clear, partly grown and overgrown silhouettes; living roots or attachments through the skin; brush shedding; distinct movement poses. Plants should match the local flora enough to explain concealment.

**Encounter:** Recognize an overgrown ambush site, force movement into open ground or discover a stripping stone and predict the hunter's return.

**Completion check:** Growth state changes both concealment and movement capability. The animal visibly pays for switching strategies; changing only its texture is insufficient.

## Supporting creature and plant catalog

Each row is retained design work, not a completed or rejected feature. Develop the full brief when its community reaches implementation. Existing names are from the brainstorm; names for previously unnamed organisms are provisional descriptive labels.

| Organism | Ecological relationship | Behavior and visual work | Habitat or encounter dependency |
| --- | --- | --- | --- |
| Rime Antler | Cultivates algae and invertebrates on mineral antlers across cold and warm mist | Antler scraping, garden courtship display, defending birds and broken-antler consequences | Winter and mist adjacency; access to both sides |
| Glassbrood | Hot-pool eggs require cold transport by mineral-swallowing grazers | Nodule-like eggs, ingestion, transport and regurgitation; adults cannot follow into winter | Connected pool and winter route; missing transporter quest |
| Lantern Orchid | Nectar chambers reward pollination with a recognizable light rhythm | Entry and exit openings, pollen coating and consistent pulse | Permanent spring and pollinator traffic |
| Petalmaw | Mimics the orchid to eat inexperienced or desperate pollinators | Imperfect pulse, petal-like face, jaw wind-up and empty lure state | Place among genuine orchids so comparison is possible |
| Crownbloom | Pollen protects local grazers and repels susceptible predators | Heavy-animal trigger, pollen burst and species-specific tolerance | Grazing refuge in spring |
| Pollen Hunter | Predator adapts to Crownbloom defenses | Visible secondary eyelids and behavior that exploits protected prey | Demonstrate an exception after teaching ordinary pollen response |
| Mantleback | Carries decomposers that prepare its food and shelter smaller life | Back garden, filtering mouth, stone rubbing and churned feeding trails | Deep autumn litter and stripping boulders |
| Sinking Orchard | Fruit attracts prey; roots maintain substrate that traps heavier visitors | Fruit, weight response, settling ground and root activity | Collapsible litter ground, safe harvesting positions |
| Snowbell | Ice flowers guide underground pollinators by vibration | Hollow ice resonators, distinct notes and underground response | Winter snow with active root food web |
| Snowbell Pollinator | Follows vibration to underground food and pollinates roots or flowers | Small moving snow cues and visits synchronized with calls | Snowbell patches |
| Tapping Hunter | Imitates Snowbell vibrations to catch pollinators | Ground tapping, false call pattern, ambush and larger-grazer interference | Acoustic food web; distinguish genuine and false cues |
| Snowbell Grazer | Finds roots by listening for the Tapping Hunter | Listening posture, root digging and interrupted hunts | Links the acoustic chain to visible larger wildlife |
| Whitebraid | Colonial frost-like threads absorb debris and carcass nutrients | Harmless and constricting variants, tightening around warmth, tunnel reinforcement option | Snow surfaces and buried organic matter |
| Cache Finder | Locates ancient frozen meals of larger predators | Search, retrieval and evasive behavior rather than obligatory combat | Persistent winter cache locations |
| Stillglass | Filters incoming debris and gradually builds slow-pocket terraces | Translucent sweeping limbs, particulate trapping, fed and starved states | Slow ground, inflow and a selectable starvation encounter |
| Velvet Anchor | Durable slow grazer cultivating edible shell films | Closed rock-like pose, grazing, shell garden and tiny positional changes | Slow interior with food and resting niches |
| Hush Orchid | Slow flowering offers prolonged outside access to pollinators | Heavy timed petals and resource-limited nectar availability | Slow pocket edge with cross-boundary pollinators |
| Threshold Heron | Hunts outside and returns to young in slow time | Recalibration, feeding, nesting and precise crossing display | Nest inside, hunting grounds outside; local chick age |
| Duskcoil | Conceals itself inside a slow margin and strikes across it | Tension wave, stirring grass, coordinated boundary crossing and recovery | Gradual time field; no unexplained normal-speed attack from deep slow ground |
| Clocklouse | Exploits frequent time-crossers and impairs adjustment | Parasite indication, host grooming and cleaning-station visitors | Temporal adaptation and parasite removal |
| Refuge Grazer | Escapes into slow ground when a pursuer cannot afford outside delay | Threat assessment, refuge entry and later return | Slow refuge with meaningful predator commitments |
| Flashfern | Rapid local lifecycle consumes substantial resources | Growth, fruiting, collapse and litter waves | Rare fast-time ground with water and nutrient input |
| Fast Grove Raider | Feeds on fast growth but emerges spent | Entry, sustained feeding and fatigue cues; waiting predators | Fast grove exits and resource costs |
| Ridgeback Burrower | Converts mineral soil into porous stone and redirects water | Digging, stone deposition, communal burrows and abandoned works | Ridges, tunnels and altered drainage |
| Cuphorn | Repeatedly excavates mineral-water bowls and transports plants | Digging, drinking and vegetation on horns | Growing ponds and links between pools |
| Veilspinner | Fog-catching webs irrigate gardens that attract its prey | Targeted large webs, water paths and feeding behavior | Fog corridors and anchor-fed gardens; separate from ant-supported canopy |
| Bellroot | Changes root growth around frequently traveled routes | Hollow resonance, footfall response and route-specific root forms | Herd paths and acoustic road clues |
| Burial Stag | Covers dead with soil and living branches, building mounds over generations | Burial behavior, herd return and recognizable grave planting | Wooded mounds and settlements occupying old burial ground |
| Cold Garden Grazer | Keeps a cold ecosystem in its fur by sleeping across a winter edge | Fur garden, aligned resting posture and withering away from cold | Narrow stable sleeping sites at seasonal edges |
| Memory Fungus | Growth retreats from repeated pressure patterns of a particular predator | Track-shaped absence and changing growth response | Readable history of animal paths |
| Scent Thief | Borrows protective scents from larger animals | Rubbing, scent depletion and resting in travelers' packs | Species-specific recognition; temporary safe passage |
| Decoy Plant | Edible above-ground structures distract from mobile underground reproduction | Decoy feeding and distinct underground propagules | Soil routes and misleading harvest expectations |
| Sap Drinker | Wounds defensive trees and drinks sap to deter predators | Wounding, drinking and temporary warning coloration or odor | Sourheart or another chosen defensive tree |
| Uphill Carrier | Drags food to safe heights and fertilizes the uplands | Carrying, safe feeding terraces and abandoned drag tracks | Lower predators sustain the incentive; nutrient-rich high valley |
| Alarm Caller | Recruits defensive trees through alarm calls and sometimes deceives them | True and false calls, tree response and refuge behavior | Claspwood grove with call-triggered defense |
| Rootknife Follower | Trades noisy hunt announcements for leftovers | Following, squealing and scavenging; can spoil an ambush | Rootknife hunting routine |
| Cleaner Birds and Climbers | Remove parasites from protected places on grazers | Cleaning gestures, host tolerance and alarm dispersal | Barkjaw resting sites and optional temporal cleaning stations |
| Giant Corpse Specialists | Open carcasses that ordinary scavengers cannot exploit | Staged arrival and corpse-opening marks | Temporary corpse habitat and succession |
| Ancient Refuge Herbivore | Emerges into a world missing its former food and route | Searching, frustrated feeding and nonmalicious destruction | Slow refuge, obsolete migration corridor and relocation story |

## NPC and quest integration

Translate each relationship into investigation and choices. Keep the broader settlement and fey ideas in the lore document; give creature encounters concrete consequences.

| Quest seed | Evidence to expose | Possible actions to design |
| --- | --- | --- |
| Herd losses | Feeding partners missing; vulnerable fence layout; Rootknife signs | Restore pairing, change access, protect the herd or hunt the predator |
| Forest entering town | New insect defenses discourage grazing | Restore Giftwillow access, relocate a colony or accept a changed route |
| Lava-side bridge failures | Fungus follows forge runoff; Snowkeel tunnels align with it | Redirect runoff, reinforce a crossing or move the feeding route |
| Failed Glassbrood nesting | Viable eggs but absent mineral-swallowing transporters | Restore transporter access rather than replacing eggs |
| No birds in the spring town | Ornamentals poison the insects birds eat | Change planting, restore safe pollinator habitat |
| Silent orchard roots | Predatory traps stopped filtering infected animals | Restore the organism, manage infection or provide another ecological barrier |
| Slow grove hunger | Upstream dam blocks debris; Stillglass behavior changed | Restore inflow or establish a sustainable alternative |
| Dangerous egg harvest | Eggrunner suppression changes hatch success | Protect population control, move nests carefully or contain emergences |
| Failing canopy | Broken trails lead to a specific support | Reconnect routes, protect workers, redirect traffic or allow a controlled fall |
| Dead giant dispute | Scavenger arrival, fertility and rare fungus have different beneficiaries | Manage the site with corpse wardens rather than defaulting to destruction |

## Integration with the active game

The active application already has a bestiary, species data, combat states and SVG monster rigs. These new ecological designs do not rename or replace the current roster automatically. Existing art and UI work should be preserved. Choose compatibility or a distinct new species deliberately during implementation.

Relevant starting points, to read again before editing:

- [Species and encounters](../../src/data.js) define current creature data and camps.
- [Combat simulation](../../src/combat.js) contains current enemy behavior, targeting and projectiles; ecological AI will need additional goals and creature-to-creature relationships.
- [Monster registry](../../src/monsters/index.js) and [rig runtime](../../src/monsters/rig.js) support art and animation. New ecology states must be connected to actual behavior.
- [Scenery and wilderness placement](../../src/scenery.js) should consume habitat conditions rather than distributing all organisms as ordinary packs.
- [Journey progression](../../src/journey.js) is the starting point for authored ecological quest state and saved consequences.
- [Existing application guide](../../README.md) describes current controls, rendering and verification commands.

The giant Hollow Elder and structural trees require world geometry as well as art. Snow movement, distributed colonies and temporal eggs need custom representations appropriate to their scale; do not force every organism into the same enemy rig.

## Decisions to resolve during detailed design

- Final names, body plans and silhouettes for the Boundary Scavenger, Gradient Brood, Eggrunner and other unnamed organisms.
- Exact dietary inputs and reserve depletion for the Boundary Scavenger.
- Canopy Ant structural mechanism, repair rate and warning time before local failure.
- Gradient Brood incubation duration, field-depth placement, dispersal interval and reason staggered emergence wins; cannibalism is the leading proposal.
- Eggrunner resistance limits, recovery needs and interactions with carried objects.
- Tetherfruit attachment recognition, breakage, reconnection, harvest and inventory behavior.
- Groveflower host benefit, cost and reproductive mechanism.
- Overgrowth Stalker growth speed, shedding cost and readable concealment.
- Which ecological changes persist between visits and which reset as bounded encounters.

## Implementation verification

For gameplay implementation, run `npm test` and `npm run build` from `wizard-combat/`. Check rendering and encounters in the local browser at port 5174, and preview new rigs and their actual gameplay states in the bestiary. This documentation does not implement the roster or require gameplay testing on its own.

Add tests for consequential rules when they are implemented: habitat rejection, paired feeding protection, shared player/wildlife triggers, local incubation, moving eggs, resistance bounds and save persistence. Use observation in the browser to judge silhouettes, attack tells, ecological legibility and whether the encounter actually feels alive.
