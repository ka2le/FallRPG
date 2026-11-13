// 8 × 8 source sheets; indexes stay fixed so authored groves keep their identity.
// Shapes vary by age, branching, browsing and local conditions, not just color.
const grove=(art,size,solid=12,extra={})=>({atlas:'groves',art,size,solid,tree:true,...extra});
const family=(start,sizes,solid=12,extra={})=>sizes.map((size,index)=>grove(start+index,size,solid,extra));

export const TREE_FAMILIES={
  giftwillow:family(0,[66,115,87,94,75,111,101,82],13),
  claspwood:family(8,[93,108,86,90],15,{clasp:true}),
  hollowhost:family(12,[107,76,89,121],15,{insects:true}),
  bellroot:family(16,[92,116,98,83],14,{resonant:true}),
  canopy:family(20,[145,157,142,165],22,{insects:true}),
  sourheart:family(24,[78,105,90,98],13),
  amberoak:family(28,[86,112,105,101],14),
  blossom:family(32,[69,97,107,88],12),
  burial:family(36,[78,101,64,118],13),
  snowfir:family(40,[81,121,102,109],13),
  frostwood:family(44,[75,112,97,109],13),
  whitebraid:family(48,[29,43,61,31],7,{tree:false,vegetation:true}),
  snowcache:family(52,[83,45,91,40],11,{tree:false}),
  embertree:family(56,[101,73,85,116],13),
  vent:family(60,[54,72,95,42],15,{tree:false}),
};
TREE_FAMILIES.emberdead=TREE_FAMILIES.embertree;

export const SEASONAL_TREES={
  spring:['giftwillow','claspwood','hollowhost','bellroot','canopy','blossom'],
  autumn:['sourheart','amberoak','burial'],
  winter:['snowfir','frostwood'],
  ember:['embertree','vent'],
};

// Names follow the source atlas row order. Sizes are logical pixels at zoom 1.
const wilds=[
  ['mossrock',35,11],['splitrock',43,12],['limestoneledge',37,14],['brokensteps',26,0],
  ['pebbleheap',17,0],['mineralbowl',28,0],['reedpatch',27,0],['pondplants',18,0],
  ['fallenwillow',35,10],['browsedbranch',22,0],['fernclump',24,0],['lanternorchids',28,0],
  ['crownbloom',25,0],['nectarstump',33,8],['anthill',27,6],['resinroots',27,0],
  ['amberlog',32,10],['leafbank',22,0],['purplefungi',34,0],['shelffungi',36,0],
  ['memoryfungus',21,0],['sourheartsap',31,7],['rootbridge',44,0],['sinkingroots',29,0],
  ['snowrock',41,12],['iceledge',45,14],['snowbell',24,0],['whitebraidpatch',26,0],
  ['frozensmallcache',30,7],['frozenlargecache',44,11],['snowkeeltunnel',24,0],['mineralfungus',23,0],
  ['basaltledge',43,14],['ventchimney',76,17],['warmnest',30,0],['broodeggs',25,0],
  ['amberfungus',25,0],['meltwaterbowl',25,0],['charredlog',34,10],['mineralspires',48,12],
  ['fogwebframe',81,10],['dewcatchergarden',31,0],['burialmound',40,10],['oldbonearch',66,17],
  ['corpseribs',75,19],['mossyplate',40,12],['hollowrootarch',84,17],['slowcrystal',56,12],
  ['willowshelter',90,23],['herbalistshack',94,25],['couriercanopy',75,19],['stonecamp',45,0],
  ['woodenbridge',43,0],['ropebridge',50,0],['trailmarker',36,5],['lanternpost',48,5],
  ['seedbaskets',22,5],['waterskins',23,4],['woodpile',25,6],['splitfence',29,0],
  ['shrine',62,14],['tombstone',31,6],['well',49,12],['restbench',30,7],
];
export const WILDS_ASSETS=Object.fromEntries(wilds.map(([name,size,solid],art)=>[name,{atlas:'wilds',art,size,solid}]));
export const WILDS_NAMES=wilds.map(([name])=>name);
const pool=(...names)=>names.map(name=>({...WILDS_ASSETS[name],name}));
export const DECORATION_POOLS={
  spring:pool('mossrock','splitrock','pebbleheap','fallenwillow','browsedbranch','fernclump','lanternorchids','crownbloom','nectarstump','anthill','resinroots'),
  autumn:pool('limestoneledge','pebbleheap','amberlog','leafbank','purplefungi','shelffungi','memoryfungus','sourheartsap','sinkingroots','burialmound'),
  winter:pool('snowrock','iceledge','snowbell','whitebraidpatch','frozensmallcache','frozenlargecache','snowkeeltunnel','mineralfungus'),
  ember:pool('basaltledge','ventchimney','amberfungus','meltwaterbowl','charredlog','mineralspires','mossyplate'),
  wetland:pool('mineralbowl','reedpatch','pondplants','mossrock','fernclump','dewcatchergarden'),
  settlement:pool('seedbaskets','waterskins','woodpile','splitfence','lanternpost','restbench'),
};

export const ENVIRONMENT_ATLASES={
  groves:{file:'groves-expansion.png',columns:8,rows:8,count:64},
  wilds:{file:'wilds-expansion.png',columns:8,rows:8,count:64},
};
