// New local place names adapt the canonical Hollow ecology without rewriting it.
// Coordinates keep Willowmere and its first chapter intact in the northwest.
export const EXPANSION_PLACES=[
  {id:'redleaf',name:'Redleaf Post',x:2670,y:850,biome:'autumn',description:'Couriers rest where the leaf road turns toward the flowering east.'},
  {id:'cuphorn-pools',name:'The Cuphorn Pools',x:3500,y:590,biome:'spring',description:'New mineral bowls and old ponds trace the route of horn-borne gardens.'},
  {id:'ant-canopy',name:'The Living Scaffold',x:4210,y:450,biome:'spring',description:'Dense worker trails bind the tallest trees at their cracked roots.'},
  {id:'lantern-fen',name:'Lantern Fen',x:4600,y:1320,biome:'spring',description:'Fog caught in low webs drains into luminous pollinator gardens.'},
  {id:'ridgeback-cut',name:'Ridgeback Cut',x:3470,y:1150,biome:'spring',description:'Porous ridges and old burrow mouths shelter a dry woodland road.'},
  {id:'whitebraid',name:'Whitebraid Grove',x:5440,y:780,biome:'winter',description:'Pale root fans gather below the cold hardwoods.'},
  {id:'cache-hollow',name:'The Frozen Larder',x:5480,y:2050,biome:'winter',description:'Long-lived caches draw small finders and patient listeners.'},
  {id:'cinder-steps',name:'Cinder Steps',x:3610,y:2220,biome:'ember',description:'Mineral terraces climb between warm vents and quiet nesting ledges.'},
  {id:'glassbrood',name:'The Glassbrood Pools',x:4310,y:2500,biome:'ember',description:'Dark plates and shed glass mark the margins of hot nursery pools.'},
  {id:'cold-nest',name:'Coldwater Eaves',x:5280,y:2630,biome:'winter',description:'Warm stone feeds a hanging cold garden at the volcanic border.'},
  {id:'snowwatch',name:'Snowwatch Camp',x:1080,y:2280,biome:'winter',description:'Herd guides share a fire beside a sheltered snowbell road.'},
  {id:'rimebacks',name:'The Rimeback Hollows',x:440,y:2830,biome:'winter',description:'Old feeding tunnels pass beneath quiet ice resonators.'},
  {id:'floodblossom',name:'Floodblossom',x:1030,y:3620,biome:'spring',description:'A seed-courier hamlet grows where meltwater reaches perpetual flowers.'},
  {id:'stillglass',name:'Stillglass Reach',x:1670,y:3600,biome:'spring',description:'Mineral curtains and still pools shelter a patient feeding community.'},
  {id:'burial-crown',name:'Burial Crown',x:2350,y:3100,biome:'autumn',description:'Wooded mounds show where generations of stags returned their dead.'},
  {id:'hush-terraces',name:'The Hush Terraces',x:3350,y:3190,biome:'autumn',description:'Soft anchors and old egg banks sit above the leaf-filled basin.'},
  {id:'corpse-orchard',name:'The Bone Orchard',x:3110,y:3750,biome:'autumn',description:'A great ribcage shelters fungi, rainwater and specialist scavengers.'},
  {id:'pilgrim-hearth',name:'The Pilgrim Hearth',x:4330,y:3530,biome:'winter',description:'A small refuge marks the long route back through the southern snow.'},
];

export const CAMP_SITES=[
  {id:'redleaf',x:2670,y:850,radius:145,biome:'autumn',name:'Redleaf Post'},
  {id:'snowwatch',x:1080,y:2280,radius:130,biome:'winter',name:'Snowwatch Camp'},
  {id:'floodblossom',x:1030,y:3620,radius:155,biome:'spring',name:'Floodblossom'},
  {id:'pilgrim-hearth',x:4330,y:3530,radius:130,biome:'winter',name:'The Pilgrim Hearth'},
];

export const EXPANSION_PATHS=[
  [{x:2020,y:820},{x:2380,y:840},{x:2670,y:850},{x:3040,y:740},{x:3500,y:590},{x:3550,y:450},{x:3820,y:450},{x:3890,y:600},{x:4210,y:450}],
  [{x:3500,y:590},{x:3380,y:820},{x:3470,y:1150},{x:3820,y:1280},{x:4250,y:1210},{x:4600,y:1320}],
  [{x:4210,y:450},{x:4650,y:580},{x:5010,y:650},{x:5440,y:780}],
  [{x:4600,y:1320},{x:4660,y:1250},{x:4870,y:1280},{x:4980,y:1420},{x:5380,y:1600},{x:5480,y:2050},{x:5550,y:2300},{x:5280,y:2630}],
  [{x:2670,y:850},{x:2590,y:1000},{x:2710,y:1320},{x:2840,y:1800},{x:3220,y:1940},{x:3610,y:2220}],
  [{x:1845,y:1320},{x:1845,y:1510},{x:1845,y:1720},{x:2240,y:1760},{x:2500,y:1750},{x:2840,y:1800}],
  [{x:3610,y:2220},{x:3850,y:2180},{x:3950,y:2330},{x:4000,y:2630},{x:4310,y:2500},{x:4840,y:2600},{x:5280,y:2630}],
  [{x:710,y:1450},{x:990,y:1770},{x:1080,y:2280},{x:900,y:2550},{x:640,y:2830},{x:516,y:2830},{x:440,y:2830}],
  [{x:1080,y:2280},{x:1550,y:2470},{x:1960,y:2760},{x:2350,y:3100},{x:2800,y:3200},{x:3350,y:3190}],
  [{x:640,y:2830},{x:760,y:3130},{x:1030,y:3620},{x:1370,y:3510},{x:1670,y:3600},{x:2000,y:3450},{x:2350,y:3100}],
  [{x:3610,y:2220},{x:3490,y:2700},{x:3350,y:3190},{x:3270,y:3500},{x:3110,y:3750}],
  [{x:3350,y:3190},{x:3830,y:3370},{x:4330,y:3530},{x:4770,y:3260},{x:5050,y:3020},{x:5280,y:2630}],
  [{x:440,y:2830},{x:350,y:3150},{x:622,y:3150},{x:760,y:3130}],
  [{x:350,y:3150},{x:330,y:3500},{x:330,y:3770},{x:490,y:3700},{x:581,y:3700},{x:710,y:3700},{x:1030,y:3620}],
];

export const REGION_SITES=[
  {id:'cuphorn-pools',x:3500,y:590,radius:330,kind:'mineral-ponds',biome:'spring',families:['giftwillow','bellroot'],species:['cuphorn','thresholdheron','sapdrinker'],threats:['pollenhunter'],evidence:['mineralbowl','reedpatch','pondplants','browsedbranch']},
  {id:'ant-canopy',x:4210,y:450,radius:350,kind:'ant-canopy',biome:'spring',families:['canopy','hollowhost'],species:['alarmcaller','sapdrinker'],threats:['grovefang','stalker'],evidence:['anthill','resinroots','browsedbranch','nectarstump']},
  {id:'lantern-fen',x:4600,y:1320,radius:330,kind:'fog-garden',biome:'spring',families:['blossom','giftwillow'],species:['thresholdheron','cuphorn'],threats:['veilspinner','petalmaw'],evidence:['fogwebframe','dewcatchergarden','lanternorchids','crownbloom']},
  {id:'ridgeback-cut',x:3470,y:1150,radius:270,kind:'burrow-ridges',biome:'spring',families:['bellroot','claspwood'],species:['ridgeback','alarmcaller'],threats:['rootknife','stalker'],evidence:['limestoneledge','splitrock','hollowrootarch','pebbleheap']},
  {id:'whitebraid',x:5440,y:780,radius:350,kind:'whitebraid',biome:'winter',families:['whitebraid','frostwood'],species:['snowgrazer','cachefinder'],threats:['tappinghunter'],evidence:['whitebraidpatch','snowbell','iceledge','mineralfungus']},
  {id:'cache-hollow',x:5480,y:2050,radius:340,kind:'frozen-cache',biome:'winter',families:['snowfir','snowcache'],species:['cachefinder','snowgrazer','antler'],threats:['tappinghunter','stormbell'],evidence:['frozensmallcache','frozenlargecache','snowbell','snowrock']},
  {id:'cinder-steps',x:3610,y:2220,radius:320,kind:'vent-terraces',biome:'ember',families:['vent','emberdead'],species:['ventback'],threats:['wyrm','glassbrood'],evidence:['basaltledge','ventchimney','warmnest','mineralspires']},
  {id:'glassbrood',x:4310,y:2500,radius:300,kind:'glass-pools',biome:'ember',families:['vent','emberdead'],species:['ventback'],threats:['glassbrood','wyrm'],evidence:['broodeggs','mineralspires','meltwaterbowl','warmnest']},
  {id:'cold-nest',x:5280,y:2630,radius:270,kind:'cold-garden',biome:'winter',families:['frostwood','snowcache'],species:['coldgarden','antler'],threats:['stormbell'],evidence:['meltwaterbowl','snowbell','mineralfungus','snowrock']},
  {id:'rimebacks',x:440,y:2830,radius:340,kind:'snow-tunnels',biome:'winter',families:['snowfir','snowcache'],species:['snowkeel','snowgrazer'],threats:['tappinghunter'],evidence:['snowkeeltunnel','snowbell','frozensmallcache','mineralfungus']},
  {id:'stillglass',x:1670,y:3600,radius:280,kind:'stillglass',biome:'spring',families:['blossom','giftwillow'],species:['stillglass','thresholdheron'],threats:['pollenhunter'],evidence:['slowcrystal','mineralbowl','pondplants','lanternorchids']},
  {id:'burial-crown',x:2350,y:3100,radius:350,kind:'burial-mounds',biome:'autumn',families:['burial','amberoak'],species:['burialstag','scentthief','uphillcarrier'],threats:['prowler'],evidence:['burialmound','oldbonearch','leafbank','memoryfungus']},
  {id:'hush-terraces',x:3350,y:3190,radius:340,kind:'hush-refuge',biome:'autumn',families:['sourheart','burial'],species:['velvetanchor','eggrunner','uphillcarrier'],threats:['broodling','duskcoil'],evidence:['slowcrystal','broodeggs','shelffungi','memoryfungus']},
  {id:'corpse-orchard',x:3110,y:3750,radius:300,kind:'corpse-garden',biome:'autumn',families:['amberoak','sourheart'],species:['corpseborer','rootfollower','mantleback'],threats:['prowler'],evidence:['corpseribs','mossyplate','purplefungi','shelffungi']},
];

// Fixed pools are authored around, rather than over, the footpaths.
export const WATER_PATCHES=[
  {x:3400,y:470,rx:85,ry:63},{x:3650,y:600,rx:105,ry:76},{x:3535,y:780,rx:57,ry:50},
  {x:4510,y:1180,rx:85,ry:105},{x:4730,y:1405,rx:115,ry:68},{x:4615,y:1570,rx:63,ry:53},
  {x:1740,y:3730,rx:87,ry:57},{x:1550,y:3490,rx:48,ry:42},{x:3030,y:3890,rx:65,ry:42},
  {x:5350,y:2220,rx:85,ry:65},{x:5000,y:2745,rx:45,ry:35},
];
export const LAVA_PATCHES=[
  {x:3590,y:2060,rx:100,ry:65},{x:3740,y:2340,rx:83,ry:103},{x:4180,y:2450,rx:68,ry:95},{x:4440,y:2630,rx:110,ry:65},
];
