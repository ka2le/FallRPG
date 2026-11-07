# The Hollow terrain and ecological systems design backlog

Build places whose form reveals the organisms and magical rules that maintain them. Permanent seasons, environmental adjacency, predatory vegetation, local time and accumulated animal behavior should determine where encounters occur and how the world looks.

This backlog translates [World lore and ecological foundations](world-lore.md) into terrain and system work. Species requirements are in [Monster and living plant design backlog](monster-design.md). All features here are pending design or implementation; proposed structures, mechanics and priorities are not claims about existing game behavior.

## Core world requirements

- Seasons are fixed to places, not advanced by elapsed time. Seasonal patches can be surprisingly small and next to radically different conditions.
- Boundaries permit matter and organisms to pass. Magic continually maintains each place's defining conditions, allowing snow and volcanic heat to remain close without gradually homogenizing the map.
- Geology, season, moisture, snow depth and local time are distinct influences. A volcanic winter edge is a combination of conditions, not a new season.
- Every habitat needs food and material flows. Permanent winter hides productivity; permanent autumn continually processes litter; permanent spring has no seasonal ecological reset.
- Adjacency and connectivity matter. A creature may need two environments within reach, a connected snow route, or food from both sides of a boundary.
- Time changes gradually across a margin. Entry initially feels slow; within the interior the observer adapts and the outside world feels fast.
- Life leaves persistent-looking evidence: scars, tunnels, maintained routes, ponds, terraces, structural trails and corpse gardens.
- Preserve beauty, calm and ordinary routines alongside danger. Some apparently dangerous animals create safe places.

## Existing integration points

The current application has broad seasonal courts, shared terrain sampling, biome materials, deterministic scenery, solid cover, wilderness encounters and a bestiary. Small fixed habitat patches and ecological interactions should extend these systems deliberately. Current source files must be reread when implementation begins because other collaborators are editing the application.

| Existing area | Starting point | Intended responsibility to investigate |
| --- | --- | --- |
| World shape and biome queries | [landscape.js](../../src/landscape.js) | Fixed patches, environmental fields, adjacency and authoritative terrain queries |
| Ground materials and meshes | [ground.js](../../src/ground.js) | Surface evidence, snow, litter, thermal margins and collision-aligned ground states |
| World vegetation | [feyworld.js](../../src/feyworld.js) | Ecological tree forms, colonies, host plants, canopy and visible habitat transitions |
| Placement | [scenery.js](../../src/scenery.js) | Place connected communities and life traces using habitat constraints |
| Cover and traversal | [cover-shapes.js](../../src/cover-shapes.js) | Solid roots, hollows, supports and geometry shared by movement and projectiles |
| Simulation | [combat.js](../../src/combat.js) | Creature relationships, local time, hazards and shared environmental triggers |
| Progression and persistence | [journey.js](../../src/journey.js) | Authored ecosystem state, quests and consequential changes between visits |
| Rendering and effects | [world.js](../../src/world.js) | Time presentation, environmental effects and synchronization with simulation |

Use shared authoritative conditions for placement, visuals, navigation and gameplay. A visible deep snow route must also be traversable by Snowkeels; a collapsing support must change relevant collision. The existing landscape grid is not a substitute for detailed interior geometry or narrow root structures.

## Proposed build stages

| Stage | Terrain delivery | Ecological demonstration |
| --- | --- | --- |
| 1 | Grazed woodland clearing, four contrasting tree strategies, visible feeding traces | Barkjaws maintain open ground while Claspwoods and Rootknives create danger |
| 2 | Small permanent seasonal patches and one snow-volcanic boundary | Snowkeel routes, Ventback nesting and a Boundary Scavenger crossing |
| 3 | Giant hollow tree interior and a grove supported by living ant trails | Enterable organism and local structural consequences |
| 4 | One gradual slow-time pocket with a visible normal-time exterior | Staggered eggs, Eggrunner raid, Duskcoil and slow habitat residents |
| 5 | Seasonal subhabitats, terrain engineers, corpse succession and settlements | Expand proven systems into diverse locations and quests |

Use a deliberately authored example for each new system before procedural distribution. Complete a resource-consumer-predator relationship and its environmental evidence before adding more disconnected scenery.

## Fixed habitats and adjacency

### Small permanent seasonal patches

**Build:** Layer local fixed patches over the broad regional arrangement. A winter hollow may fit beside a warm grove or lava lake; some patches may only be a few meters across. Preserve irregular but stable geography rather than random recoloring on each visit.

**Design:** Determine patch placement, blending width, minimum playable dimensions and how far neighboring conditions can influence its edge. Keep season fixed when local hazards or corpses temporarily alter the surface.

**Readability:** Carry the condition through plants, ground, sound, precipitation behavior and resident animals. A sharp contrast between nearby places can coexist with a narrow physical transition. Seasonal transitions need not use the same width or rules as temporal transitions.

**Acceptance:** Revisit or reload the same location and find the same season. Demonstrate a snow-dependent animal living roughly 20 m from lava. Crossing the seam changes meaningful habitat conditions, not only color.

### Stable permeable boundaries

**Build:** Represent the resources created at interfaces: meltwater, steam, fog, mineral deposits, accumulating ice and dispersal paths. Allow moving objects and water to cross without permanently erasing the environmental identities.

**Design:** Define local restoration behavior and exceptions. Snow entering lava melts; water entering sustained winter can freeze. Avoid requiring full thermal fluid simulation to communicate the rule: bounded authored effects and resource states can establish it.

**Acceptance:** The same boundary supports a repeatable resource flow and a dependable habitat. Local disturbance may change access or production while the seasonal seam remains in place.

### Habitat connectivity and creature placement

**Build:** Query local conditions and reachable resources before placing nests, food or creatures. Track connected snow, crossings, access to both dietary inputs, suitable root cover and temporal depth.

**Design:** A proposed habitat query may expose season contributions, heat, wetness, snow depth, local time factor and resource tags. Exact interfaces should follow the current code during implementation. Keep derived paths and placement deterministic where possible.

**Acceptance:** Reject a Snowkeel isolated on bare rock, a Ventback nest without cold wet cover, and a Boundary Scavenger territory with only one dietary resource. Return a usable habitat reason during development so placement errors can be diagnosed.

### Snow and volcanic community

**Build:** Deep snow routes, mineral-fed fungal mats, warm stone shelves, snow overhangs, steaming hollows and disturbed spore sites. Snow tunnels and breeding shelves must occupy related positions.

**Interactions:** Snowkeels aerate fungus and may collapse shelves. Ventbacks clear and defend nesting ledges. Steam Moths recolonize disturbed fungal patches. Forge runoff can redirect the feeding corridor.

**Assets:** Moving snow ridges, exposed dark fungus, cleared basalt, roofed clutches, vents and bounded steam. Deep snow needs its own depth or volume representation; changing terrain albedo is insufficient.

**Acceptance:** Observe all three organisms using the same boundary for different reasons. A change in runoff or route access changes behavior without moving the permanent season.

### Boundary routes and storage

**Build:** Narrow repeated crossings, paired food caches, rime-antler mist stations, mineral pools and winter caches. Small access points can be strategically more important than large areas.

**Interactions:** Scavengers alternate resources; Glassbrood eggs rely on transporter visits; Cold Garden Grazers occupy mixed-condition beds. A blocked crossing can disrupt reproduction or digestion without causing direct damage.

**Acceptance:** Restoring a short route solves an ecological problem. A large neighboring expanse with the wrong conditions cannot substitute merely because it has free space.

## Forests shaped by feeding and defense

### Grazing fronts

**Build:** Open low woodland, scarred trunks at Barkjaw mouth height, feeding stations, thorn fronts and root-covered ambush sites. A Giftwillow route should look different from a defensive Claspwood front.

**Interactions:** Grazing suppresses dense cover; predators reduce grazing; thorn shelter enables more ambushes; Giftwillows spread through the grazers. Initial implementation can use authored before-and-after states rather than simulating centuries of vegetation growth.

**Acceptance:** The player can infer what maintains a clearing. A scripted change in herd access creates a coherent vegetation and encounter change with readable intermediate evidence.

### Defensive tree territories

**Build:** Distinct environmental forms for Claspwood pressure roots, Sourheart sap defenses, Hollow Host chambers and Giftwillow feeding branches. Tree influence extends beyond the trunk but has a visible extent and recovery cycle.

**Interactions:** Shared triggers detect appropriate player and wildlife contact. Roots, sap and insect response have different counterplay. Small harmless traffic should continue through a grove where ecological rules permit it.

**Acceptance:** A player can distinguish at least two defenses before triggering them, and the rendered attack reach matches its gameplay reach.

### Giant hollow tree interiors

**Build:** An immense apparently dead trunk with enterable chambers, broken limb corridors, hidden living roots, prey remains, interior anchors and escape routes. The shelter is itself an organism.

**Interactions:** Pressure, feeding opportunity or another chosen stimulus awakens internal attacks. Moving roots change passage availability. Wildlife can enter and trigger the same encounter. Detached hollow limbs connected to the parent are a possible expansion.

**Technical design:** Use actual interior surfaces and collision rather than treating the entire trunk as a solid obstacle or a flat sprite. Maintain camera clearance, projectile blocking and AI routes in resting and active states. Prefer bounded moving parts to arbitrary live remeshing.

**Acceptance:** The player can enter, read warning evidence, witness a creature being attacked, survive an activation and escape. Attack animation, passage geometry and collision agree.

### Canopy supported by living trails

**Build:** Very tall trees with structurally meaningful cracks, junctions and root spans reinforced by dense ant-like traffic. Workers stream between colonies and supports. Interlocked groups and active maintenance provide the working structural explanation.

**Interactions:** A blocked route causes rerouting, then weakening if support cannot be restored. Creaks, sags, falling fragments and changes in traffic warn of local failure. Repairs can restore the support before collapse.

**Technical design:** Represent a small support graph per grove rather than a physics simulation of every worker. Nearby trails need rich visible movement; distant colonies can use simpler animated representations. Failure states must update relevant traversal and cover.

**Acceptance:** Follow a trail to the branch it maintains. Interrupt it and observe a staged local consequence. Restore access in time and prevent the fall. Do not replace this identity with a silk-covered forest.

### Host vegetation and tethered fruit

**Build:** Groves visited by flowering carnivores, predator stripping stones, living fruit threads and visible plant attachment points. These relationships must be visible during movement.

**Interactions:** Carnivore routes transfer flowers or pollen; overgrown predators shed plants to regain mobility; fruit carriers trail a connection back to a parent tree.

**Design:** Decide tether collision and tension, parent recognition, nutrition changes, reconnection and inventory persistence. Decide which route interruption changes plant dispersal. These are independent relationships even if they share rendering infrastructure.

**Acceptance:** Trace a fruit's live connection to its parent, identify a predator's discarded growth, and observe a host visiting more than one compatible grove.

## Seasonal communities

### Permanent spring

**Build:** Continuous flowering, nectar chambers, distinguishable light rhythms, dense pollinator routes and Crownbloom grazing refuges. Use rich signals with enough visual hierarchy that combat remains readable.

**Interactions:** Genuine Lantern Orchids and Petalmaws share space but differ in a learnable pulse. Crownbloom reacts to heavy visitors; local grazers tolerate pollen while ordinary predators do not. Specialized hunters provide later exceptions.

**Story:** Ornamental planting can poison the insect food chain and remove birds. Settlements and fey can depend on specific pollination relationships.

**Acceptance:** A player can compare genuine and false flowers, learn the difference, and see a grazer obtain real protection from a pollen patch.

### Permanent autumn

**Build:** Continuous leaf input and decomposition, deep warm litter, fungal layers, Mantleback tracks and scraping stones. Sinking Orchards require locally unstable ground rather than a uniformly dangerous biome.

**Interactions:** Mantlebacks expose food and carry decomposers. Orchard roots maintain substrate that sorts visitors by weight. Harvesting routes support lightweight creatures, long tools or suspended walkways.

**Acceptance:** Small wildlife feeds safely where heavy visitors visibly begin sinking. The player can recognize ground instability and reach a viable escape or safe harvesting position.

### Permanent winter

**Build:** Hidden fungal and root food, Snowbell ice resonators, burrowing pollinator traces, Whitebraid growth and persistent frozen caches. Preserve apparent quiet while giving attentive players clues.

**Interactions:** Genuine and mimicked vibrations attract different visitors. Warmth can trigger dangerous Whitebraid. Caches attract finders and territorial owners. Habitat food may originate underground or cross the boundary.

**Acceptance:** At least one visible larger animal, hidden food source and sound cue form a readable chain. Frozen caches have stable locations or explicitly authored changes between visits.

## Local time as habitat

### Gradual time fields

**Build:** A continuous local rate field with a transition band and an interior. Keep the field distinct from seasons, attack debuffs and global pause. Design overlap behavior explicitly if multiple fields can meet.

**Simulation proposal:** For a fixed body at a point, local elapsed time increases by outside simulation time multiplied by its effective local rate. Sample the field at a defined whole-body anchor and smooth adaptation rather than scaling each limb independently. Resistance modifies a creature's effective rate according to one bounded rule.

**Decisions:** Choose what uses local time: movement, attack wind-up, incubation, healing, status durations, plant cycles, projectiles and sound-producing actions. Document any exceptions. A spell slow and a time field should combine intentionally, not through accidental double multiplication.

**Acceptance:** An ordinary actor takes longer in outside time to cross slow ground, while its own state sequence stays coherent. Crossing either way is gradual and reversible. Large bodies do not suffer unintended per-limb clock discontinuities.

### Perception from outside and inside

**Build:** From outside, slow inhabitants barely move. On entry, movement and actions initially feel resistant. After adaptation inside, local activity feels natural and the outside visibly rushes. Leaves, water, wildlife and sound provide comparison points.

**Design proposal:** Keep simulation clocks and player presentation separate. The relative apparent pace of another actor should reflect its rate compared with the observer's adapted rate. Determine how world simulation advances during this presentation so effects remain consistent; merely reducing player movement would not deliver the requested interior experience.

**Controls and accessibility:** Keep aiming and UI responsive enough to play. Convey lag through intentional movement, action and environmental cues rather than uncontrolled input buffering. Choose audio treatment that remains understandable and avoid relying only on color or blur.

**Acceptance:** Observe the same pocket from outside, cross its margin, settle inside and look back. The three stages must be visibly different, with the exterior faster relative to the settled interior observer. Combat cues must still predict actual events.

### Time effects on projectiles and moving objects

**Build:** A consistent boundary policy for traveling spells, thrown objects, carried eggs and moving hazards. Use swept collision or appropriate substeps where rate changes could otherwise skip a hit.

**Design:** Choose whether unbound objects adopt the local field immediately or smoothly. A resistant carrier must not silently grant all carried objects resistance. Decide how effects with an owner use clocks after leaving that owner.

**Acceptance:** Fire or throw across both directions of the gradient and observe trajectories and impacts that match the chosen rule. Moving an egg changes future incubation at its new effective conditions without losing accumulated progress.

### Staggered egg banks

**Build:** Nest sites distributed across different depths of the gradient, with rapid local incubation and delayed outside emergence. Place eggs to make spacing in emergence intentional. Extremely slow positions can preserve ancient viable eggs.

**Ecological proposal:** Immediately dangerous, territorial or cannibalistic hatchlings benefit from arriving one at a time. Avoid simultaneous-hatch swarm behavior as the defining survival strategy. The benefit should be demonstrated through dispersal or an authored encounter.

**Interactions:** Eggrunners raid before hatching. Their partial resistance makes them relatively quick within the field, with limits and retreat behavior. Player interference can change which eggs survive.

**Acceptance:** Equivalent eggs laid at different rates emerge in predictable order; movement and save/load preserve progress; a failed raid can release a dangerous hatchling. Nest limits prevent unlimited spawning or rewards.

### Slow refuges and resident communities

**Build:** Stillglass terraces near incoming debris, Velvet Anchor resting niches, Hush Orchid feeding sites, Threshold Heron nests, Duskcoil margins and parasite cleaning stations. Most ordinary creatures should have reasons to avoid or limit time spent inside.

**Resources:** Local organisms still need food per local experienced time. Inflow and accumulation must support the chosen community. A blocked supply can alter behavior without changing the time field.

**Stories:** Rescue buys outside intervention time; healing also remains slow relative to outside. Nesting separates parent and offspring ages. Ancient survivors may return to missing food or migration routes. Large narrative time gaps can be authored rather than requiring an entire civilization simulator.

**Acceptance:** Demonstrate one resident feeding routine, one crossing specialist and one reason an ordinary predator declines to pursue into the refuge.

### Rare fast groves

**Build:** Optional scarce sites with resource-rich inflow, rapid Flashfern cycles, debris outflow and exhausted raider exits. These are an expansion after slow time works, not a replacement for the accepted slow-pocket experience.

**Costs:** Fast growth consumes water and nutrients, accumulates waste and exposes visitors to more local elapsed time. It is not free farming with no ecological limits.

**Acceptance:** Removing an authored resource input reduces growth; accelerated lifecycle produces observable litter and changes downstream conditions. World-clock and save behavior must be defined before repeatable farming rewards.

## Terrain made by animals

### Mineral ridges and abandoned burrows

Ridgeback Burrowers deposit porous stone, redirect drainage and leave dry tunnels. Build active works, old ridges and abandoned cave entrances as related landforms. A complete cave system requires geometry beyond an ordinary heightfield.

**Acceptance:** Deposits, tunnels, moisture and resident animals tell the same geological story. A local obstruction can alter drainage through authored states without real-time erosion simulation.

### Cuphorn ponds

Repeated excavation enlarges mineral bowls into ponds, while horns transport plants between them. Build shallow new bowls and old vegetated pools along a plausible movement route.

**Acceptance:** Show digging or fresh excavation beside an older pond, and use similar carried plants to connect separated pools.

### Veilspinner fog gardens

Use targeted moisture-catching webs across fog corridors, with visible drainage toward anchor-fed gardens. These webs irrigate the habitat; they do not supply the accepted ant-trail canopy support.

**Acceptance:** Water or moisture cues connect web to garden; cutting a relevant section changes local irrigation in a staged encounter. Avoid filling every forest with silk.

### Bellroot roads

Hollow root chambers amplify footsteps. Growth retreats from frequent herd traffic and thickens in quiet ground, producing routes negotiated over generations.

**Acceptance:** Roadside roots and acoustics change together. A quest about a refused crossing supplies evidence of a heavy hidden occupant rather than only an objective marker.

### Burial groves

Burial Stags cover dead with earth and living branches, creating wooded mounds over generations. Some settlements unknowingly occupy old burial ground.

**Acceptance:** Repeated mound shapes, bones or planting patterns connect terrain to the herd. An encounter can show a return to an occupied site without requiring universal hostility.

### Uphill feeding terraces

Large animals carry food uphill to avoid lower predators, steadily moving nutrients into the upper valley. Build drag tracks, safe feeding places and vegetation enriched around them.

**Acceptance:** The player can trace food transport uphill. Removing the threat below changes carrying behavior and, in an authored later state, reduces upland fertility.

### Pressure memories and living defense networks

Memory Fungus leaves gaps corresponding to a predator's pressure patterns. Alarm Callers recruit Claspwood defense and can use false alarms to clear competitors. Scent Thieves temporarily change how other organisms recognize a traveler.

**Acceptance:** Each cue predicts a specific interaction: missing fungus suggests a route, a call triggers nearby defenses, and a borrowed scent changes only the organisms that recognize it. Avoid universal invisibility or safety effects.

## Temporary habitats and ecological consequences

### Giant corpse succession

**Build:** A corpse can become a temporary biome: heat, sheltering plates, water-holding bones, specialist fungi and successive waves of consumers. A Ventback corpse creates local meltwater within the fixed winter domain's limits.

**States:** Fresh and defended; opened by specialists; occupied by scavengers and fungi; plant-rich remains. Use bounded authored stages at first. Preserve quest decisions and relevant stage state between visits.

**Acceptance:** Return to a materially changed site with understandable new occupants. Seasonal geography stays fixed while local resources and hazards change.

### Cooperation and safe places

**Build:** Grazed campsites, protected tree clearings, tolerated cleaning stations and paths guarded incidentally by large herbivores. Ordinary travel should include resting and feeding wildlife.

**Interactions:** Safety follows from the protecting organism or relationship. A departing grazer, damaged scent source or disrupted colony can remove protection with readable warning.

**Acceptance:** Show a threatening-looking animal making a camp safer and a clear environmental change when it leaves. Do not make every life form pursue the player on sight.

### Settlements and fey obligations

**Build later:** Giftwillow villages, settlements spanning growing and storage conditions, time-edge towns, corpse management sites and maintained migration crossings. NPC occupations include herd guides, boundary gardeners, time guides, corpse wardens, tree surgeons and seed couriers.

**Stories:** Material obligations sustain relationships: carry seeds, leave a carcass share, keep a path open without widening it, protect a transporter. Fey motives follow those dependencies and may conflict with human convenience or safety.

**Acceptance:** At least one settlement need and one fey bargain are traceable through environment and creature behavior. Breaking the obligation produces a specific ecological consequence rather than an unrelated punishment.

## Placement and art requirements

Generate communities, not isolated decorations. Each placed example should identify its sustaining resource, principal consumer, predator or competitor, environmental evidence and optional disturbance. A place can remain legible with only a few active agents if its traces and layout are coherent.

| Community | Required arrangement | Evidence that ties it together |
| --- | --- | --- |
| Grazed woodland | Feeding trees, open lookout space and nearby ambush cover | Mouth-height scars, low crowns, paired feeding positions and rootknife tracks |
| Snow and lava | Deep connected snow, mineral water, warm stone and cold wet overhang | Tunnels, fungus, cleared nest ledges and moths |
| Boundary scavenger route | Two actual dietary inputs and a reachable crossing | Paired caches, repeated crossings and resource depletion |
| Structural ant grove | Colony, active trails and specific supported junctions | Moving living braces, repairs, creaks and local sagging |
| Time nursery | Several temporal depths, dispersal exits and egg-hunter access | Comparable eggs at different stages and different local ambient pace |
| Hollow Elder | Believable shelter, concealed living parts and traversable escape | Old prey remains, roots crossing dead wood and movement on activation |
| Carnivore flower circuit | Two compatible groves and a viable hunting route | Host-borne blooms, matching grove flowers and transfer behavior |
| Corpse garden | Large body, resource outflow and arrival routes | Successive feeding marks and changed occupants |

Use anatomy and behavior to direct assets. Snow swimmers need snow displacement; tree grazers need matching bark scars; host plants need attachment and motion; time habitats need visible references on both sides. Effects should communicate these rules before decorative density is increased.

## Persistence and performance decisions

Choose the minimum meaningful state per community: support health, restored access, nest progress, corpse stage, food availability or a completed restoration. Do not persist every ambient particle or insect. Keep authoritative outcomes distinct from cosmetic variation.

Far-away systems can advance through bounded coarse updates or authored quest stages. Decide how local time interacts with unloaded regions and offline elapsed time before enabling persistent incubation; avoid unexpectedly spawning predators because the application was closed.

Represent insect density through shared trails and support state rather than one full AI agent per worker. Reuse instancing, culling and distance detail for plants and traces. Validate temporal behavior across update rates so lower visual quality does not change ecological rules.

## Completion and verification

An ecological feature is ready when its rule is observable, its visual and physical state agree, its relevant creatures react correctly, and its consequential state survives the chosen save/reset policy. A pretty habitat with disconnected monster spawns is not sufficient for this direction.

When implementation changes gameplay, run `npm test`; run `npm run build` for production compilation. Check rendering, navigation, effects and ecological encounters in the local browser on port 5174. The documentation itself does not change gameplay or rendering.

Prioritize meaningful checks for fixed habitat identity, adjacency rejection, connected snow routes, shared tree triggers, support restoration and collapse, local time integration, observer-relative presentation, egg movement, resistance bounds, projectile crossings and persistence. Visual review must include both sides of every boundary and each meaningful encounter state.
