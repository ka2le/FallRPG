import {generateScenery,generateWilds} from './scenery.js';
import {terrain} from './landscape.js';
import {ECO_SPECIES} from './ecology-species.js';
export {terrain} from './landscape.js';
export const SPELLS = [
  {id:'fire',name:'Firebolt',icon:'✹',color:'#ffa066',cost:0,damage:16,rate:.24,range:72,speed:78,detail:'Straight fire bolts. Ignite targets and melt ice armor.'},
  {id:'bind',name:'Bind',icon:'❧',color:'#a8d875',cost:18,damage:0,rate:3,range:42,speed:46,detail:'A seeking vine pins a target for 6 seconds. Heavy enemies resist some duration. No damage.'},
  {id:'shockwave',name:'Shockwave',icon:'◎',color:'#c1efed',cost:25,damage:0,rate:6,range:16,detail:'Push and interrupt enemies within 16m. Clear nearby incoming shots. No damage.'},
  {id:'shield',name:'Shield',icon:'◇',color:'#a4bbff',cost:22,damage:0,rate:7,range:0,detail:'Block six frontal projectiles over 5 seconds. Melee and rear hits bypass it.'},
  {id:'drain',name:'Siphon',icon:'☽',color:'#cf9af1',cost:24,damage:30,rate:8,range:36,duration:3.6,detail:'Channel a beam. Land a hit to latch on and drain life. Cover or distance breaks the tether.'},
  {id:'frostburst',name:'Frostburst',icon:'❄',color:'#85d9f5',cost:28,damage:40,rate:4,range:60,speed:32,blast:10,detail:'Aim an explosive frost orb. Splash damage and a 2.5-second slow within 10m. Cover blocks the blast.'},
  {id:'blink',name:'Blink',icon:'⌁',color:'#f0b9e0',cost:16,damage:0,rate:3,range:7.5,detail:'Short teleport in your movement direction. Stops at solid cover.'},
];
Object.assign(SPELLS[0],{level:1});
for(const [i,level] of [[1,2],[2,4],[3,3],[4,6],[5,4],[6,5]])SPELLS[i].level=level;
SPELLS.push(
  {id:'companion',name:'Lantern Fox',icon:'♧',color:'#a8e4d5',cost:32,rate:65,duration:55,level:3,detail:'A spirit fox follows for 55 seconds. It harasses nearby enemies and slows your current target. It fights only enemies already engaged with you.'},
  {id:'haste',name:'Tailwind',icon:'»',color:'#f3da93',cost:24,rate:50,duration:22,level:5,detail:'Move 30% faster and cast Firebolt 20% faster for 22 seconds.'},
  {id:'renew',name:'Verdant Oath',icon:'✣',color:'#badd8d',cost:28,rate:60,duration:30,level:7,detail:'Restore 2 health per second for 30 seconds. A quiet reserve for longer expeditions.'},
  {id:'recall',name:'Hearthcall',icon:'⌂',color:'#eacaa0',cost:10,rate:90,level:2,detail:'Return to the Hearth after 3 quiet seconds. Taking damage or casting cancels the channel.'},
);
export const ACTIONS={attack:0,bind:1,shockwave:2,shield:3,drain:4,frostburst:5,blink:6,companion:7,haste:8,renew:9,recall:10};
export const CONTROLS=[
  {action:'attack',key:'LMB',mouse:'left'}, {action:'bind',key:'RMB',mouse:'right'},
  {action:'shield',key:'M5',mouse:'forward'}, {action:'shockwave',key:'Q'},
  {action:'frostburst',key:'E'}, {action:'drain',key:'R'}, {action:'blink',key:'F'},
  {action:'companion',key:'1'}, {action:'haste',key:'2'}, {action:'renew',key:'3'}, {action:'recall',key:'4'},
];
export const SPECIES={
  ...ECO_SPECIES,
  seedling:{name:'Briar Seedling',emoji:'🌱',hp:32,speed:2,damage:6,attack:2.4,reach:27,size:1.4,color:'#c5de88',xp:24,ranged:true,shotSpeed:19,burst:1},
  swarm:{name:'Needle Piper',emoji:'🪲',hp:24,speed:5,damage:6,attack:2.2,reach:28,size:1.3,color:'#a8d8a1',xp:14,ranged:true,shotSpeed:25,burst:1},
  prowler:{name:'Thorn Prowler',emoji:'🐺',hp:40,speed:11.8,damage:18,attack:.95,reach:2.1,size:1.7,color:'#bcce7c',xp:28,dodge:{reaction:.26,speed:13,duration:.4,cooldown:2}},
  titan:{name:'Dolmen Stag',emoji:'🗿',hp:144,speed:3.4,damage:24,attack:2,reach:44,size:3.5,color:'#cdb69a',xp:55,ranged:true,shotSpeed:27,burst:2,cover:true},
  wisp:{name:'Stormbell',emoji:'👻',hp:32,speed:6,damage:9,attack:1.4,reach:38,size:1.6,color:'#c9d9ff',flying:true,ranged:true,xp:28,shotSpeed:33,burst:3,cover:true,dodge:{reaction:.25,speed:8,duration:.4,cooldown:2}},
  spitter:{name:'Hex Spitter',emoji:'🕷️',hp:44,speed:4.3,damage:10,attack:1.5,reach:42,size:1.9,color:'#cdb5e9',ranged:true,xp:30,shotSpeed:31,burst:3,cover:true,dodge:{reaction:.4,speed:5,duration:.4,cooldown:3}},
  colossus:{name:'Lilycrown Leviathan',emoji:'🦑',hp:224,speed:1.3,damage:38,attack:2.4,reach:55,size:5,color:'#d7a093',ranged:true,xp:65,shotSpeed:23,burst:2},
  healer:{name:'Spore Abbess',emoji:'🍄',hp:56,speed:3.6,damage:10,attack:1.9,reach:38,size:2.3,color:'#e5b6c6',ranged:true,xp:40,shotSpeed:28,burst:2,cover:true},
  ice:{name:'Hoarscale',emoji:'🧊',hp:56,speed:4,damage:12,attack:1.8,reach:42,size:2.4,color:'#9ee5ee',xp:35,ranged:true,shotSpeed:35,burst:2,cover:true},
  ash:{name:'Lantern Wyrm',emoji:'🔥',hp:40,speed:5.5,damage:10,attack:1.6,reach:40,size:1.9,color:'#ffa46f',xp:30,ranged:true,shotSpeed:32,burst:3,cover:true,dodge:{reaction:.3,speed:7,duration:.4,cooldown:2.5}},
};
export const CAMPS=[
  {name:'First embers',x:-8,z:-44,level:1,types:['seedling','seedling','seedling'],reward:'reedwand'},
  {name:'Briar track',x:-42,z:-77,level:2,types:['prowler','seedling','prowler'],reward:'trailboots'},
  {name:'The watchstones',x:51,z:-91,level:3,types:['spitter','spitter','spitter'],reward:'wardfocus'},
  {name:'Needle nursery',x:-60,z:-139,level:4,types:Array(8).fill('swarm'),reward:'winterring'},
  {name:'Lantern grove',x:-119,z:-91,level:4,types:['healer','spitter','prowler','seedling'],reward:'mossrobe'},
  {name:'Moonpool',x:111,z:-162,level:5,types:['wisp','wisp','spitter','wisp'],reward:'moonhood'},
  {name:'The old sentinel',x:-177,z:-125,level:6,types:['titan'],reward:'stonefocus'},
  {name:'Amber procession',x:102,z:130,level:5,types:['ash','ash','prowler','ash'],reward:'emberwand'},
  {name:'Winter threshold',x:-112,z:126,level:5,types:['ice','ice','spitter'],reward:'snowboots'},
  {name:'Moth choir',x:195,z:-109,level:6,types:['wisp','wisp','healer','wisp','spitter'],reward:'moonring'},
  {name:'The hollow swarm',x:-160,z:-221,level:7,types:Array(12).fill('swarm'),reward:'thorncrown'},
  {name:'Cinder crossing',x:206,z:164,level:7,types:['ash','ash','prowler','healer','ash'],reward:'ashrobe'},
  {name:'The glass sentry',x:-195,z:232,level:8,types:['titan','ice','ice'],reward:'glasswand'},
  {name:'Rootbound court',x:-258,z:-176,level:8,types:['healer','prowler','prowler','spitter','spitter'],reward:'springheart'},
  {name:'The drowned crown',x:215,z:-278,level:9,types:['colossus'],reward:'tidefocus'},
  {name:'The last pyre',x:270,z:252,level:10,types:['colossus','ash','ash'],reward:'embercrown'},
  {name:'White silence',x:-281,z:242,level:10,types:['ice','ice','wisp','titan'],reward:'winterheart'},
];
export function seeded(seed=19){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export const SCENERY=generateScenery(CAMPS);
export const COVER=SCENERY.cover;
export const WILDS=generateWilds(CAMPS,COVER);

// Shared by the physical intercept and its camera-space visual.
export const SHIELD={distance:1.8,offset:-.3,width:1.25,height:1.15,charges:6,duration:5};
