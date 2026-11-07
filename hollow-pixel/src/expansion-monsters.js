// Ecology comes from the shared Hollow lore. Final body designs for open-ended
// catalog entries are local visual adaptations, not changes to canonical lore.
// The 8x8 atlas stores 32 first poses followed by their 32 matching second poses.
export const WILDLIFE_ATLAS = {
  file:'wildlife-expansion.png', columns:8, rows:8, animationOffset:32,
};

const animal=(sprite,name,size,hp,speed,damage,habitat,neutral,behavior,note,extra={})=>({
  name,sprite,atlas:'wildlife',size,hp,speed,damage,habitat,neutral,behavior,note,...extra,
});

export const MORE_SPECIES = {
  grovefang:animal(0,'Grovefang',56,88,36,13,'spring',false,'flowerCircuit',
    'Peach Groveflowers root in the hunter’s shoulders. Its hunting circuit carries their pollen between separated groves; the animal is still a capable carnivore.'),
  stalker:animal(1,'Overgrowth Stalker',62,112,25,17,'spring',false,'strippingStones',
    'Real plants grow through its skin. A heavy fern mantle conceals an ambush but slows travel. Look for rubbed stones and discarded greenery near its resting places.'),
  pollenhunter:animal(2,'Pollen Hunter',54,82,43,12,'spring',false,'pollenEdge',
    'A second set of eyelids shields this hunter from Crownbloom pollen. The grazer refuges that discourage ordinary predators offer less protection against it.'),
  cuphorn:animal(3,'Cuphorn',64,145,15,14,'spring',true,'pondKeeper',
    'It digs mineral bowls into ponds and carries reeds between them in its hollow horns. Fresh excavation and older planted pools trace the same wandering route.'),
  sapdrinker:animal(4,'Sap Drinker',32,48,22,7,'spring',true,'sapFeeding',
    'It drinks from small wounds in defensive trees. Amber sap stains its chin and sharp warning stripes advertise the bitter meal to would-be predators.'),
  alarmcaller:animal(5,'Alarm Caller',30,35,25,4,'spring',true,'claspwoodCalls',
    'Its inflated throat carries a sharp call through Claspwood groves. The trees’ defensive roots make a useful refuge, and the caller does not always need a real danger to sound an alarm.'),
  veilspinner:animal(6,'Veilspinner',58,76,27,10,'spring',false,'fogGarden',
    'Fan-shaped webs catch passing fog and drain water toward planted anchors. The irrigated gardens draw its prey. These local fog webs are unrelated to the living ants that support the canopy.',{ranged:true}),
  ridgeback:animal(7,'Ridgeback Burrower',65,160,13,16,'spring',true,'burrowWorks',
    'Its digging leaves porous stone and dry tunnels in mineral soil. Old ridges bend the drainage around its communal burrows, making shelter for smaller animals.'),
  burialstag:animal(8,'Burial Stag',72,180,20,20,'autumn',true,'burialMounds',
    'The herd covers its dead with soil and living branches. Centuries of returns build wooded mounds, and a new settlement may unknowingly stand on an old burial route.'),
  uphillcarrier:animal(9,'Uphill Carrier',58,120,18,12,'autumn',true,'feedingTerrace',
    'It drags food uphill before feeding, beyond the hunters below. Repeated journeys enrich the terraces; abandoned drag marks still point toward safe resting ledges.'),
  scentthief:animal(10,'Scent Thief',28,38,38,4,'autumn',true,'grazerCompanion',
    'Cheek rubbing borrows the smell of larger grazers. The protection lasts only while the borrowed scent remains recognizable, so it lingers near tolerated resting groups.'),
  rootfollower:animal(11,'Rootknife Follower',26,30,35,3,'autumn',true,'predatorFollower',
    'A noisy scavenger that shadows Rootknives for scraps. Its squeals may spoil an ambush before there is anything to share.'),
  corpseborer:animal(12,'Corpse Borer',46,100,14,10,'autumn',true,'corpseGarden',
    'Its shovel mandibles open thick plates that ordinary scavengers cannot move. Pale fungal growth and later visitors follow the channels it leaves through old remains.'),
  velvetanchor:animal(13,'Velvet Anchor',74,220,5,18,'autumn',true,'slowGrazer',
    'A patient grazer of sheltered refuges. Its stone-like shell cultivates an edible velvet film; the tiny movements of its pale head reveal the living animal beneath.'),
  eggrunner:animal(14,'Eggrunner',36,58,48,7,'autumn',true,'eggRaider',
    'A light, quick raider of Gradient Brood nests. It inspects the nursery margins before entering and leaves with an egg before the dangerous young can emerge.'),
  broodling:animal(15,'Gradient Broodling',54,115,40,16,'autumn',false,'nurseryPredator',
    'Already dangerous when its banded shell breaks. In the lore, parents spread eggs across time gradients so the young disperse separately rather than exhausting the same hunting ground together.'),
  tappinghunter:animal(16,'Tapping Hunter',48,72,31,12,'winter',false,'falseSnowbell',
    'Black forelimbs tap false Snowbell rhythms into the crust. Underground pollinators approach the sound; the hunter waits above the expected opening.'),
  snowgrazer:animal(17,'Snowbell Grazer',58,120,16,10,'winter',true,'snowbellRoots',
    'Broad listening ears find the roots beneath Snowbell patches. Its digging interrupts the Tapping Hunter, exposing food that the smaller pollinators helped maintain.'),
  cachefinder:animal(18,'Cache Finder',30,42,36,5,'winter',true,'frozenCache',
    'It searches old frozen meals and carries away small pieces. A cache can outlast several generations of finders, while its territorial owner may still return.'),
  coldgarden:animal(19,'Cold Garden Grazer',78,190,12,17,'winter',true,'coldBoundaryRest',
    'A small cold ecosystem grows in its shaggy fur. It sleeps along reliable winter margins, keeping the garden cold while its face reaches warmer feeding ground.'),
  stillglass:animal(20,'Stillglass',44,70,8,8,'spring',true,'debrisFilter',
    'Translucent fan limbs sweep drifting debris toward a glassy body. Dense beds slowly build feeding terraces where a steady inflow sustains their patient filtering.'),
  thresholdheron:animal(21,'Threshold Heron',48,50,25,6,'spring',true,'watersideNest',
    'A marsh hunter associated with the edges of slow refuges. It feeds outside, then returns toward sheltered young, making its repeated crossing route easy to recognize.'),
  duskcoil:animal(22,'Duskcoil',58,96,32,15,'autumn',false,'marginAmbush',
    'Copper rings vanish into shaded litter. A tension wave passes along the coils before it crosses from a concealed resting margin into the open.'),
  glassbrood:animal(23,'Glassbrood',46,82,26,12,'ember',false,'mineralPool',
    'Translucent nodules protect its developing eggs around hot pools. The lore ties their cold transport to mineral-swallowing grazers; the adults themselves cannot follow into winter.',{ranged:true}),
};

// Regional appearances are deliberately distinct drawings, not palette filters.
// World spawns may store one as creature.visual without changing species rules.
export const CREATURE_VARIANTS = {
  barkjaw:[{atlas:'wildlife',sprite:24,habitat:'spring',name:'Pale Barkjaw'}],
  rootknife:[{atlas:'wildlife',sprite:25,habitat:'spring',name:'Birch Rootknife'}],
  mantleback:[{atlas:'wildlife',sprite:26,habitat:'autumn',name:'Violet Mantleback'}],
  antler:[{atlas:'wildlife',sprite:27,habitat:'winter',name:'Slate Rime Antler'}],
  snowkeel:[{atlas:'wildlife',sprite:28,habitat:'winter',name:'Splitfin Snowkeel'}],
  ventback:[{atlas:'wildlife',sprite:29,habitat:'ember',name:'Copper Ventback'}],
  scavenger:[{atlas:'wildlife',sprite:30,habitat:'seam',name:'Ringtail Scavenger'}],
  petalmaw:[{atlas:'wildlife',sprite:31,habitat:'spring',name:'Pale Petalmaw'}],
};

export const WILDLIFE_LORE = {
  source:'../wizard-combat/docs/lore/monster-design.md',
  note:'Ecological identities follow the shared design catalog. Grovefang names a local Groveflower host; Corpse Borer is a local giant-corpse specialist. Unspecified body shapes and regional appearances are local adaptations. Time gradients, incubation, corpse succession and plant dispersal remain design references unless implemented by the game simulation.',
};
