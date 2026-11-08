# Wilderness combat and balance simulation

The goal is a dangerous world with manageable routes from Willowmere, earned
growth, and useful retreats. Monster levels stay fixed. Initial danger comes
primarily from movement, awareness, range and attack frequency; monster health
is unchanged. Ranged projectile damage is reduced by 20% to compensate for rapid, coordinated volleys.

## Current spell path

The basic spark remains free: 14 base damage, 180-unit reach, one shot every 1.1
seconds. Number keys cast spells; Q/E/F/R are optional bindings, initially matching
slots 1–4. Slots 8 and 9 start empty. Bindings share spell recovery times.

| Slot | Spell | Learn at | Aether | Base effect |
|---|---|---|---:|---|
| 1 | Aether Lance | Pasture reward, normally level 2 | 38 | Next automatic shot deals 56 damage, replacing its ordinary damage |
| 2 | Willow Ward | Level 3, 22 amber | 26 | 45 absorption for 7 seconds |
| 3 | Wildbloom | Level 5, 40 amber | 48 | 56 damage within 112 units of the player; 1-second base stagger |
| 4 | Windrun | Level 7, 40 amber | 32 | +75% movement for 4 seconds |
| 5 | Briarbind | Level 9, 65 amber | 42 | Next basic shot spreads a 105-unit root from its victim; 4.5 seconds |
| 6 | Lantern Fox | Level 11, 95 amber | 65 | One companion, 18 seconds, 7 base bite damage every 1.2 seconds |
| 7 | Verdant Oath | Level 7 after Windrun, 50 amber | 44 | 48 healing over 6 seconds |

Each main lesson requires the preceding main lesson. Healing branches from
Windrun. Buying a later lesson cannot skip the earlier tools. Lance and Briarbind
need no aiming click or preselected target. They wait for a legal automatic shot;
mana and recovery are spent when it fires. Pressing the same spell again cancels
it for free. Shield, area attack, haste, healing and summoning cast immediately.
Shields and healing refresh; summons replace the existing companion. None stack
with themselves. Area attacks and the companion protect peaceful wildlife.

Active recovery times are 1.1–1.5 seconds. Mana starts at 100; combat recovery is
2.2/second, with another 1.8 outside combat. A first-level pool holds two Lances,
three wards, or one Wildbloom and two wards. These compete for the
same pool. Grimoire's automatic Lance option fills unaffordable shots with free
sparks. Sustaining every Lance needs roughly 34.5 aether/second, which a fully
focused recovery build reaches around level 30 before equipment. This is also
covered by a sustained firing test.

The old wall, targeted frost and bell areas, siphon, blink, and alternate casting
style definitions remain in code and retain regression coverage. They are absent
from the current lessons and grimoire. Old saves migrate to the new spell path;
earned equipment, amber, exploration and completed bounties remain.

## Growth and retreat

Every level grants three growth points in Pack (I). A power point adds 2.5% basic
and spell damage; 65% of the accumulated extra power also increases utility
durations. A capacity point adds 7 maximum aether. A recovery point adds 0.38
aether/second. Each free level adds only 1.2% power and four health. Level-ups
restore eight health but do not refill mana. Early weapon bonuses are modest;
the reed gives 10% power and one basic damage instead of 25% and three damage.

Hostile melee fighters notice at 240 units. Seedlings chase at 120 units/second,
ordinary hunters at 126 or more, Prowlers at 135, and dedicated chasers at 143.
The approach rush lasts 1.2 seconds at 150 units/second, with a small level-gap
bonus. Player walk/run speeds are 80/112 before equipment. A lone opening enemy
may die cleanly; pressure comes from surviving pack members, not extreme speed.
Short melee reach, windups and territorial escapes remain.

A sighting or hit alerts compatible allies within **180 units** immediately,
including when the first hit kills its target. Same-species neighbors cooperate,
as do different species in one authored camp or quest group. Peaceful wildlife is
excluded. Calls never relay through a chain across the forest. Packs share a
fixed territory anchor, so rear members can follow the front without abandoning
the encounter early.

Ranged monsters notice at 360, attack at 330, and fire 340-unit/second projectiles.
Their 0.22-second windup and 0.48-second recovery preserve firing pressure, but
per-projectile damage is 20% lighter now that groups engage together.
They route around obstructing scenery to regain a clear firing line. Cover buys
time, but a trunk cannot permanently freeze an enemy inside its attack range.
Firing checks use the projectile's actual launch position.

Small Seedlings are the easiest hostile type: 40 base health, 5 base damage,
0.45-second warnings and 1.15-second recovery between attacks. These lower
damage/tempo values apply to ordinary Seedlings as well as the quest group.
The pasture group pursues at 104, approaches at 116 for 0.55 seconds and notices
at 160. Its 120-unit group call still rallies all three. Wilderness Seedlings
retain their 120-unit pursuit and longer awareness, but share the gentler
damage and attack cadence. Three level-one saplings should be a comfortable
basic-attack fight; five together should demand powerful spells or a retreat.

The pasture now lies farther north at (970,245), approached along a clear path
at (970,425). The neighboring Briar camps, orchid, grazing pair, Giftwillows and
first traveling hedge were repositioned with it. A reserved clearing and
approach lane prevent procedural patrols and solid clutter from spoiling the
introduction. The town protection boundary is unchanged. Existing saves retain
their progress, wounds and respawn deadlines, while relocated living enemies
start in the new locations instead of restoring beside the old town boundary.

Crowded attackers receive damped separation drift, capped at 36 units/second
before slowing effects. A spatial neighborhood and a shared position snapshot
keep the update independent of actor order. Collinear attackers get a stable
side preference; close attackers spread around their attack ring. Melee fighters
stop their approach 32 units from the player rather than overshooting into its
center. This is a soft tendency, with no added collision bodies. It yields to
scenery, narrow passages, roots, stuns and rooted wall formations.

Automatic basic fire resumes whenever a journey loads. Space or the first
hotbar button pauses it for the current session and shows OFF; selecting a
hostile resumes it. SAFE indicates that the haven currently suppresses attacks.
This repairs older saves that silently retained an off toggle. Browser coverage
loads such a save and approaches the pasture with actual keyboard input,
verifying damage without explicitly setting automatic attacks on.

Breaking a leash or entering a haven sends enemies **walking home**, at no more
than 76 units/second. They regenerate 3.5% of maximum health per second, with a
2-health/second minimum, and continue recovering at home. There is no instant
full-health reset. Return paths route around obstacles and continue beyond the
player's active vicinity. Hitting a returning enemy deals real damage. Following
it well into its own territory can provoke a counterattack; the boundary cannot
pin it in an endless immediate-reset loop. Wounds and return state survive saves.

Marching Claspwoods regenerate **18 + 0.6 × level health/second** while rooted,
including trunks still waiting for their release during dispersal. Apprentice
basic attacks cannot outdamage this; a stronger power build can cut a gap.
Attacked walking trees rally nearby grove members and pursue within a bounded
territory. They can cross a seasonal edge to retaliate and then return to the
grove; ordinary migration remains habitat-bound. Automatic attacks and the bot
ignore unprovoked groves until the player deliberately chooses a tree. Damage
spells cannot be cast from a protected haven.

Defeated creatures need **both** five minutes of active game time (eight for
elites) and a haven visit after their defeat. Either condition may happen first.
Outside protected havens, they wait while the player is within 480 units of the
death or spawn position. A haven counts as leaving its adjacent hunting grounds,
so the pasture can repopulate while you are safely home.
Ordinary field creatures, patrols, camps and living walls share these rules.
The introductory pasture waits until Rowan receives the quest. Saved deadlines
and haven eligibility survive reloads; closing or pausing does not advance time.
Camp and bounty completion are historical records, so repopulation never pays
the original bounty again or invalidates its objectives.

## Running the bot

Run commands in `hollow-pixel/`:

```powershell
# Fast controlled comparisons (no full-world expedition)
npm run balance -- --seeds 12 --campaign-seeds 0 --start-seed 2001

# Return immediately and keep a bounded run working in a hidden background process
npm run balance:background -- --seeds 12 --campaign-seeds 1 --start-seed 3001

# Four builds, paired arenas and full-world expeditions, bounded wall time
npm run balance -- --seeds 12 --campaign-seeds 1 --campaign-seconds 1800 --max-wall-seconds 1000 --start-seed 3001

# Restrict the slower campaign portion while keeping all arena comparisons
npm run balance -- --seeds 12 --campaign-seeds 1 --campaign-builds balanced,recovery --campaign-seconds 1800 --max-wall-seconds 650 --start-seed 4001

# Direct-retreat and bounded group/tree/return/cover/resource abuse probes
npm run balance:kiting -- --start-seed 61001
npm run balance:exploits -- --start-seed 63001

# Contained first fight, soft spacing, settling, and actual world introduction
npm run balance:opening -- --start-seed 129001
```

This is a headless Node process: it runs independently of the browser and can
stay in a background terminal. Speed comes from omitting rendering and wall-clock
waits. Every game tick remains 50 ms; bot decisions happen every 200 ms. It never
increases the engine's delta-time clamp, grants campaign XP, teleports through
the wilderness, removes campaign scenery, or simulates a different damage model.
Arena setup supplies declared levels and loadouts on open ground. The campaign
starts as an apprentice and uses the complete world, legal growth, purchases,
earned equipment, haven services, and visits the relevant bounty givers.

The policy uses nearby visible threats, current health/mana and collision. It
can choose targets, kite, cast, use limited tonics, retreat, learn and equip. Its
baseline stands still with the same growth and equipment, free basic attacks,
and no spells or tonics. Four builds emphasize power, capacity, recovery, or a
balanced distribution; specialist policies still put some points in other needs.
It is a rule-based balance probe, with no neural training or model dependency.

Each invocation creates a separate `artifacts/balance/<UTC timestamp>/` with:

- `manifest.json`: exact source hashes, bot version, scenarios, seed range,
  decision/tick budgets, episode quotas and wall cap.
- `episodes.jsonl`: every encounter and expedition, including deaths, timeouts,
  disengagements and incomplete campaigns.
- `campaign-progress.jsonl`: positions, goals, routes and progress for diagnosing
  navigation stalls independently of combat strength.
- `summary.json` and `report.md`: build comparisons, resource use and expedition
  milestones. A stopped or failed run is marked explicitly.

Use a fresh seed range after tuning. Do not pool runs with different source
hashes or rerun saved losses as replacement outcomes. A `STOP` file in the output
directory stops work at its next checked boundary; Ctrl+C also stops the process,
leaving raw episodes intact. These local artifacts are gitignored and retained
for later review. No recurring task or cloud service is required.

For a reviewed summary with a descriptive interval that resamples whole paired
seed groups, run `node scripts/analyze-balance.mjs artifacts/balance/RUN-ID`.
It writes a new analysis file without replacing the raw results or report.

`balance:background` prints the output directory and PID immediately. Its
`progress.log` holds live milestones, and `owner.json` records the process and
stop instructions. The same episode, time and death caps apply. Create a file
named `STOP` in that run's directory to stop it gracefully; do not kill arbitrary
Node processes. A failed launch or invalid argument appears in its progress log.

Interpret open-ground clears, safe disengagements and full-world progress
separately. A bot can fail because of navigation or resource allocation. Small
samples do not establish a human difficulty rating or that builds are equally
strong. Campaigns may finish at their time/death/wall cap before the final road;
those are measured outcomes, not successful playthroughs.

## Earlier calibration — before the direct-retreat correction

Run `2026-11-08T07-52-29-017Z` completed all **866 episodes**: 864 arena tests
(12 paired seeds × 9 encounters × 4 builds × 2 policies) and two 30-minute
full-world expeditions. It took 416 seconds of wall time. The arena portion took
about four seconds; full-world ecology and navigation dominate campaign cost.
The audit verified outcome orientation, unique episodes and baseline resource
use. All 28 runtime source hashes matched, with copies retained beside the raw
results. Gameplay tests passed 109/109; browser tests passed 14/14; the production
build succeeded. The detached launcher also completed a separate 72-case smoke
run, retained separately from this comparison.

| Build | Tactical clears | Stationary basic-only clears |
|---|---:|---:|
| Power emphasis | 95/108 | 48/108 |
| Capacity emphasis | 104/108 | 48/108 |
| Recovery emphasis | 103/108 | 48/108 |
| Balanced | 98/108 | 48/108 |

All builds handle the opening encounters. Standing exchanges become lethal
against later packs, while the full toolkit makes progress possible. Capacity
and recovery are useful alternatives to raw damage. The power policy has a
clear endurance weakness against the final two-ranged-enemy elite fixture: 0/12
clears, compared with 9/12 for each mana specialist. That is a specific matchup
and policy finding, not evidence that power investment is universally inferior;
it remains a useful target for later offensive-policy and human playtesting.

The balanced expedition reached **level 22**, cleared **18 named camps**, learned
all seven spells and traveled 4,630 units from Willowmere, with **12 deaths**.
The recovery expedition reached **level 15**, cleared **11 camps**, learned all
seven spells and traveled 3,073 units, with **8 deaths**. Both hit their time cap
before completing the whole route. The recovery policy spent time searching and
returning around uncleared camps; its slower campaign does not establish a
weaker combat build. The records retain those stalls and every loss.

This supports the initial direction: early areas remain manageable, deeper
encounters demand resources and retreats, and growth can carry an expedition
well beyond the starting woods. These automated probes do not replace human
judgment about feel, pacing or frustration.


## Earlier direct-retreat correction — superseded by coordinated packs

The earlier clear-rate comparison missed a fundamental requirement: monsters
must actually connect when the player holds away from them. The previous
Seedling chase speed (68) was below walking speed (80), its awareness was shorter
than the basic attack's reach, and melee enemies slowed during windup. Level-one
hunters also lacked an opening rush. Increasing health or damage could not fix
those gaps.

`npm run balance:kiting` now runs **1,152 short real-engine episodes**: six enemy
types, 16 direction seeds, two starting distances (100/175), walking/running/
movement boots, and separate attack-retreat versus escape policies. It saves raw
outcomes, source hashes and a report under `artifacts/kiting/`. No spells, tonics,
cover, instant-ready enemy attacks or extra monster health are used. Permanent
regression tests cover the same tactic, spell-assisted escapes, territorial
safety and line-of-sight cover.

The before/after runs are `2026-11-08T08-09-15-686Z` and
`2026-11-08T08-10-32-818Z`, using paired direction seeds. After the correction,
**all 576 attack-retreat episodes took health damage**, with **zero damage-free
kills** and no terrain-blocked episodes. All 576 escape-only episodes still
reached territorial safety alive. A level-one Seedling costs roughly 8–16 health
during an ordinary retreating fight; spending mana on Lance, roots or Windrun can
still secure a clean kill or escape.

A separate fresh 864-case four-build run (`2026-11-08T08-12-02-668Z`, seeds
12001–12012) keeps the opening manageable: the tactical bot cleared the three
Seedlings in all 12 direction scenarios per build, averaging about one tonic.
The old zero-damage opening no longer qualifies as a successful pressure check.
These are controlled policy probes, not a human difficulty rating.

Final verification passed **119 gameplay tests**, **16 browser tests** (including
holding the retreat key against a Seedling and a Petalmaw), and the production
build. A fresh 1,152-episode probe, seeds 31001–31016, also passed with zero
pressure or escape failures (`2026-11-08T08-14-53-530Z`). The probe now returns a
failing exit code if damage-free direct retreat reappears on clear ground.


## Group, tree and return-home review — 8 November 2026

The subsequent review replaces the overly fast solo-enemy solution with slower
pursuit and coordinated packs. It also removes the instant leash heal and makes
rooted groves resistant to free basic-attack farming. The historical runs above
are retained, but their speed rules and solo-hit criteria are not current balance
requirements.

`npm run balance:exploits` now tests fourteen explicit hypotheses plus twelve
sustained mana streams. The fixed audit uses sixteen paired fixture seeds against
an archived prior engine, retains every failed result, and stores exact source
copies. The latest audit recorded **460/460 planned probes**, with all **236
current-engine checks passing**; failures from the previous engine are retained
for comparison. It caught an additional reload problem: wounded returning enemies
were previously recreated at full health. Enemy wound, return and combat state
and the basic-attack timer are now saved.

The checks cover bounded group alerts, one-shot pulls, mixed camps, pack
backpedaling, moderate pursuit speed, gradual return healing, following a retreat
back into its territory, save consistency, cover stalemates, low-level wall farming, high-power
wall breaking, walking-tree retaliation, accidental automatic tree pulls and
haven-based spell farming. Resource streams confirm that a young mage cannot
sustain heavy shots indefinitely, while a fully focused level-30 recovery build
can. Other builds trade burst damage and reserve capacity against sustained use.

The first two twenty-minute pilot expeditions, before the final ranged/spell
adjustment, each died 23 times. Synchronized ranged packs exposed an excessive
burst. Projectiles were made 20% lighter; Willow Ward now costs 26 aether, and
Wildbloom deals 56 base damage for 48 aether with a one-second base stagger. Enemy
health, basic-attack damage and the level-up curve were left unchanged.

Browser verification also caught an old cached development-server module that
still omitted wall regeneration. The local server was restarted, and actual
browser tests now verify regeneration, retaliation and gradual haven returns in
addition to the headless checks. Final verification passes **135 gameplay tests**,
**18 browser tests**, and the production build. The fresh direct-retreat audit
(`2026-11-08T09-13-19-280Z`, seeds 61001–61016) completed **1,152 episodes** with
zero pressure-rule or escape failures and no terrain-blocked cases. Solo
Seedlings can still die without contact; a surviving pack must create pressure.
The final exploit audit (`2026-11-08T09-17-18-629Z`, seeds 63001–63016) passed
**236/236 current-engine checks**, alongside 224 retained prior-engine probes.

The bot was also reviewed as a source of measurement error. It now keeps its
strongest earned equipment, reserves some money for a wand instead of endlessly
buying replacement tonics, seeks visible cover, and closes into Wildbloom range
against a pack. The completed v5 run still reached the 24-death cap on all four
expeditions. Its records are retained at
`artifacts/balance/2026-11-08T09-14-32-836Z/`; those are incomplete routes, even
though all 868 scheduled episodes finished.

One concrete policy fault was then isolated: healing and shield casts consumed
the mana needed for Windrun during a retreat. Bot v6 commits the escape first.
A regression fixture with two pursuing hunters confirms it leaves their
territory alive using a legal 60-aether starting reserve. This changes the bot's
decisions, not the player's spell rules or monster statistics.

### Reviewed final batch

The v6 run in `artifacts/balance/2026-11-08T09-21-54-667Z/` completed all
**868 planned episodes** in **357.2 seconds**: 864 arena comparisons on fresh
paired seeds 95001–95012 and four full-world expeditions on seed 105001. Each
expedition was capped at twenty simulated minutes or 24 deaths. The raw-record
audit checked unique episode IDs, clear/death orientation, baseline resource use
and nonnegative resources. All 30 runtime source files match their recorded
hashes, with exact copies retained; there was no source drift during collection.

| Build | Tactical arena clears | Basic-only arena clears | Campaign level | Named camps | Deaths | Stop |
|---|---:|---:|---:|---:|---:|---|
| Power | 105/108 | 39/108 | 12 | 10 | 24 | Death cap |
| Capacity | 103/108 | 39/108 | 14 | 11 | 21 | Time cap |
| Recovery | 86/108 | 39/108 | 13 | 10 | 24 | Death cap |
| Balanced | 103/108 | 39/108 | 14 | 11 | 24 | Death cap |

All four tactical builds cleared all 48 opening encounter fixtures per build
(lone Seedling, pasture pack, Briar Road and orchid ambush). Power and reserve
capacity performed well in short fights. Recovery permits more sustained heavy
shots, but its slower burst still lost more often to later hunter and elite
packs. These findings support distinct tradeoffs, not equal build strength.

The longer routes remain severe. All four expeditions made progress, but none
completed the route; the Cinder approach was a repeated obstacle. The bot's
collision routes do not plan around the danger of distant packs, and it still
makes costly resource and positioning choices. Those losses are retained rather
than counted as successful playthroughs. This batch verifies the specific speed,
group, recovery and spell-system requirements; it does not establish that the
entire wilderness is finally balanced for human play.

The run's `analysis-2026-11-08T09-28-13-777Z.md` includes paired descriptive
intervals and resource use. The exploit and direct-retreat reports remain
separate because their success criteria differ from clearing an expedition.

## Easier opening, soft spacing and automatic-fire review

The previous long-run analysis missed two opening problems: the pasture could
pull the next Seedling camp and the nearby orchid could fire into the fight.
Some earlier browser combat fixtures explicitly enabled automatic fire, so they
also missed a saved off toggle. The opening changes above address the encounter
spillover; the save/UI changes address the separate automatic-fire problem.

`balance:opening` compares the prior archived engine with current code across
sixteen fixed orientations of an opening fixture and a six-enemy crowd, then
runs the actual Willowmere-to-pasture approach in each engine. It uses normal
basic attacks and no spells, tonics, granted gear or progression. These are
repeatable regression fixtures, not independent samples of human performance.

The final run, `artifacts/opening/2026-11-08T11-21-52-292Z/`, recorded **98/98
planned probes**, including **49/49 passing current-engine checks**, with no
terrain-blocked fixture. All source copies and prior-engine failures remain.

| Probe | Previous engine | Current engine |
|---|---:|---:|
| Stationary opening fixture clears, no supplies | 0/16 | 16/16 |
| Mean health lost in that fixture | 120 | 56.6 |
| Mean health lost while walking out | 90 | 30 |
| Mean closest gap in six-enemy spacing fixture | 0.3 units | 36.1 units |
| Mean drift per enemy over the final two seconds | 0 units | 0.02 units |
| Actual-world introduction | Died | Cleared, 48/120 health remaining |

Walking out counts as an escape, separately from clearing the pasture. An early
audit incorrectly required that retreat to clear every enemy; its failed record
is retained under `2026-11-08T11-14-00-365Z` rather than replaced or pooled.
The final fixed comparisons apply the same clear/escape distinction to both
engines. Separate gameplay fixtures verify that a pack continues attacking while
spaced out, settles during repeated attacks, can overlap and compress through a
narrow passage, and adds no bodies that block the player.

The prior pack/return/tree/mana audit still passes **236/236 current checks**
(`artifacts/exploit-audit/2026-11-08T11-16-09-575Z/`). The ordinary wilderness
direct-retreat audit passes all **1,152 episodes** with zero pressure or escape
failures (`artifacts/kiting/2026-11-08T11-16-19-224Z/`). Introductory enemies are
explicitly distinguished from ordinary wilderness enemies in the fixtures.

Final verification passes **143 gameplay tests**, **21 browser tests** and the
production build. The browser suite includes the saved-off automatic-fire
regression with actual keyboard input, a complete first fight with default
automatic attacks, smooth spacing during live attacks, all four habitats and
mobile controls. Screenshots include `artifacts/automatic-basic-attack.png`,
`artifacts/opening-pasture.png` and `artifacts/enemy-soft-spacing.png`.

## Comfortable saplings and room beyond town safety

The opening target is now a comfortable win with basic automatic attacks,
rather than merely surviving. Every small Seedling shares 5 base damage and a
1.6-second attack cycle. Health remains 40, so the free 14-damage spark still
takes three hits. The introductory pack uses reduced awareness and approach
speed; larger starting monsters retain their faster attacks and higher damage.

The pasture moved 325 units north. The grazing pair, map location and path moved
with it, and stronger camps and the orchid moved beyond the introductory pocket.
The unchanged town boundary is now separated from the first fight by a clear
retreat lane. The save format records the opening layout version, so reloading
an older save preserves wounds, quests and respawn deadlines while relocating
living opening enemies instead of restoring them at the old town edge.

The stronger acceptance criteria check both quest and ordinary saplings:

- Three ordinary level-one saplings must die to basic sparks alone with at
  least 70/120 health remaining, no tonics and no mana spent.
- Five at once must overwhelm the same stationary apprentice; two heavy shots
  must turn that larger fight into a win. This is a fixed stress fixture, not a
  claim that every five-enemy fight requires the same strategy.
- The full-world walk from town must clear the three-sapling quest with at least
  75 health and no unrelated enemies joining.
- The player must leave the haven unchallenged and be able to walk 120 units
  back toward town after first aggro without entering protection or resetting
  the living pack.
- Standing in the centre or on either side of the actual pasture must also be
  safe from additional camps, with at least 70 health after the basic-only win.

The extra central-position check caught Rootknife Hollow still seeing into the
pasture; it was moved farther out instead of accepting only an ideal firing
position. The fixed comparison retains all earlier failures and source copies.

The relocated Briar Road is a fixed level-two/three starting route. Procedural
frontier attackers and roadside packs are excluded from that corridor, with
neutral wildlife preserved. The nearby authored orchid remains level two.
This avoids accidentally mixing level-five frontier monsters into the relocated
early bounties; their original stronger combat styles remain intact.

The final comparison at `artifacts/opening/2026-11-08T11-55-34-152Z/` completes
**196/196 planned probes**, including **98/98 passing current-engine checks**.
It uses sixteen fixed paired orientations plus actual-world approach and retreat
probes in each archived/current layout. Repeated fixed fixtures are regression
checks, not additional independent estimates of human difficulty.

| Check | Previous engine | Current engine |
|---|---:|---:|
| Three ordinary saplings, stationary basic attacks | Died, 16/16 | Won, 16/16; 75/120 health |
| Five ordinary saplings, stationary basic attacks | Died, 16/16 | Died, 16/16 |
| Five saplings, two heavy shots plus basic attacks | Died, 16/16 | Won, 16/16; 40/120 health |
| Actual-world first quest, no spells or supplies | Won with 48/120 health | Won with 80/120 health |
| Backpedal 120 units after first aggro | Entered town and lost aggro | Stayed outside and kept aggro |

Separate actual-world checks cover the centre and both sides of the pasture:
each basic-only fight ends with 75 health and no extra camp joining. Starting
equipment, health, free-spark damage and enemy health are unchanged. Existing
pack, return, tree, cover and resource probes pass **236/236 current checks**;
all losses and earlier intermediate snapshots remain available for review.
