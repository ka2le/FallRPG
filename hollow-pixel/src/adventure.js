// Authored progression uses the existing creatures and atlas drawings.
import { FRONTIER_HUNTS, FRONTIER_REWARDS, frontierAt, inFrontier } from './frontier.js';
import { PASTURE, BRIAR_CAMPS, inOpeningRunway, inBriarRoad } from './opening.js';
import { NEW_GEAR } from './items.js';
export const GEAR={
  ...FRONTIER_REWARDS,
  ...NEW_GEAR,
  twig:{name:'Apprentice twig',slot:'weapon',stats:{},description:'A small spark. Your first wand.'},
  wraps:{name:'Travel-worn wraps',slot:'robe',stats:{},description:'Enough to begin the journey.'},
  reedstaff:{name:'Rowan’s singing reed',slot:'weapon',stats:{power:.10,damage:1},description:'+10% magic power · +1 basic damage. Pasture reward.'},
  briarcoat:{name:'Briarwarden coat',slot:'robe',stats:{health:30,armor:.12},description:'+30 health · 12% damage reduction. Forest bounty.'},
  copperwand:{name:'Copperheart wand',slot:'weapon',price:85,level:3,stats:{power:.18,damage:2},description:'+18% magic power · +2 basic damage.'},
  wayboots:{name:'Courier’s boots',slot:'boots',price:45,level:2,stats:{speed:.16},description:'+16% walking and running speed.'},
  mosscharm:{name:'Living moss pendant',slot:'charm',price:65,level:2,stats:{health:18,regen:1.2},description:'+18 health · +1.2 aether each second.'},
  amberfocus:{name:'Redleaf sunstone',slot:'charm',stats:{power:.12,mana:30},description:'+12% magic power · +30 aether. Redleaf bounty.'},
  wintercoat:{name:'Snowwatch greatcoat',slot:'robe',stats:{health:60,armor:.22},description:'+60 health · 22% damage reduction. Snowwatch bounty.'},
  cinderstaff:{name:'Cindervein heartwood',slot:'weapon',stats:{power:.32,damage:3},description:'+32% magic power · +3 basic damage. Cinder bounty.'},
  eldercharm:{name:'Heart of the canopy',slot:'charm',stats:{power:.18,mana:45,regen:2},description:'+18% magic power · +45 aether · +2 aether/sec.'},
  frostboots:{name:'Stillwhite pilgrim boots',slot:'boots',stats:{speed:.25,health:30},description:'+25% movement speed · +30 health.'},
  crownstaff:{name:'The last lantern',slot:'weapon',stats:{power:.44,damage:4},description:'+44% magic power · +4 basic damage. Crownless Road reward.'},
};
export const LESSONS={
  surge:{level:2,points:1},ward:{level:3,points:1,requires:'surge'},
  nova:{level:5,points:1,requires:'ward'},haste:{level:7,points:1,requires:'nova'},
  bind:{level:9,points:1,requires:'haste'},fox:{level:11,points:1,requires:'bind'},
  renew:{level:7,points:1,requires:'haste'},
};
// Legacy casting styles remain available to prototypes, outside this progression.
export const STANCE_LESSONS={};
export const ADVENTURE_PATHS=[
  [PASTURE,{x:880,y:170},BRIAR_CAMPS.turn,BRIAR_CAMPS.hollow,{x:1400,y:-350},BRIAR_CAMPS.den],
  [{x:2020,y:820},{x:2220,y:650},{x:2460,y:620},{x:2670,y:650},{x:2670,y:850}],
  [{x:5440,y:780},{x:5810,y:620},{x:6160,y:820},{x:6520,y:660},{x:6910,y:950}],
];
export const HUNTS=[
  {id:'briar-road',title:'Reopen the Briar Road',giver:'Rowan',level:2,requires:'herd',xp:130,coins:45,item:'briarcoat',detail:'Follow the winding north path beyond the Paired Pasture. Clear all three thorn camps, then return to Rowan.',camps:[
    {id:'briar-turn',name:'The Briar Turn',...BRIAR_CAMPS.turn,level:2,types:['seedling','seedling']},
    {id:'root-hollow',name:'Rootknife Hollow',...BRIAR_CAMPS.hollow,level:2,types:['rootknife','seedling']},
    {id:'thorn-den',name:'The Thorn Den',...BRIAR_CAMPS.den,level:3,types:['rootknife','rootknife','seedling'],elite:true},
  ]},
  {id:'redleaf-road',title:'The Redleaf patrol',giver:'Neris',level:4,requires:'briar-road',xp:230,coins:65,item:'amberfocus',detail:'Clear the three ambushes on the east road between the Elderwood and Redleaf Post. Return to Neris at Redleaf.',camps:[
    {id:'leaf-gate',name:'Leaf Gate',x:2110,y:760,level:3,types:['prowler','prowler']},
    {id:'courier-bend',name:'Courier’s Bend',x:2300,y:635,level:4,types:['prowler','prowler','prowler']},
    {id:'redleaf-den',name:'Redleaf Matriarch',x:2500,y:670,level:5,types:['prowler','prowler'],elite:true},
  ]},
  {id:'snowwatch-road',title:'Bells beneath the snow',giver:'Orren',level:5,requires:'briar-road',xp:280,coins:75,item:'wintercoat',detail:'Clear three Stormbell gatherings along the southern snow road. Return to Orren at Snowwatch Camp.',camps:[
    {id:'snow-road',name:'Snowbell Descent',x:880,y:1650,level:4,types:['stormbell','stormbell']},
    {id:'cold-turn',name:'The Cold Turn',x:1025,y:1920,level:5,types:['stormbell','stormbell','stormbell']},
    {id:'bell-keeper',name:'The Bell Keeper',x:1120,y:2090,level:6,types:['stormbell','stormbell'],elite:true},
  ]},
  {id:'cinder-road',title:'Fire along the courier road',giver:'Mara',level:6,requires:'redleaf-road',xp:350,coins:95,item:'cinderstaff',detail:'Drive the wyrms from three terraces leading south from Redleaf toward Cinder Steps. Report to Mara in Willowmere.',camps:[
    {id:'warm-road',name:'Warm Road',x:2740,y:1430,level:5,types:['wyrm','wyrm']},
    {id:'basalt-turn',name:'Basalt Turn',x:2980,y:1830,level:6,types:['wyrm','wyrm','wyrm']},
    {id:'cinder-warden',name:'Cinder Warden',x:3450,y:2110,level:7,types:['wyrm','glassbrood'],elite:true},
  ]},
  {id:'canopy-road',title:'Teeth in the high branches',giver:'Neris',level:7,requires:'redleaf-road',xp:420,coins:100,item:'eldercharm',detail:'Clear three hunting grounds between the Cuphorn Pools and the Living Scaffold. Return to Neris at Redleaf.',camps:[
    {id:'pool-edge',name:'The Pool Edge',x:3790,y:460,level:6,types:['rootknife','rootknife']},
    {id:'high-roots',name:'The High Roots',x:4010,y:530,level:7,types:['grovefang','stalker']},
    {id:'canopy-keeper',name:'Canopy Keeper',x:4300,y:390,level:8,types:['grovefang','grovefang'],elite:true},
  ]},
  {id:'larder-road',title:'The hungry Stillwhite',giver:'Tal',level:9,requires:'snowwatch-road',xp:500,coins:120,item:'frostboots',detail:'Clear the hunters around Whitebraid and the Frozen Larder. Return to Tal at the Pilgrim Hearth.',camps:[
    {id:'whitebraid-watch',name:'Whitebraid Watch',x:5540,y:1050,level:8,types:['tappinghunter','stormbell']},
    {id:'larder-mouth',name:'Larder Mouth',x:5430,y:1780,level:9,types:['tappinghunter','tappinghunter']},
    {id:'larder-keeper',name:'The Larder Keeper',x:5630,y:2090,level:10,types:['tappinghunter','stormbell'],elite:true},
  ]},
  {id:'crown-road',title:'The Crownless Road',giver:'Mara',level:11,requires:'cinder-road',xp:800,coins:180,item:'crownstaff',detail:'Beyond Whitebraid, take the long eastern trail. Clear its three ancient guardians, then return to Mara.',camps:[
    {id:'crown-gate',name:'Crownless Gate',x:6160,y:820,level:10,types:['wyrm','wyrm','glassbrood']},
    {id:'last-ascent',name:'The Last Ascent',x:6520,y:660,level:11,types:['glassbrood','wyrm','wyrm']},
    {id:'last-lantern',name:'The Last Lantern',x:6910,y:950,level:12,types:['glassbrood','glassbrood'],elite:true},
  ]},
];
HUNTS.push(...FRONTIER_HUNTS);
export const ENCOUNTERS=HUNTS.flatMap(h=>h.camps.map(c=>({...c,hunt:h.id})));
export function dangerAt(x,y){
  if(Math.hypot(x-1080,y-855)<220)return {name:'Willowmere',level:1};
  const camp=ENCOUNTERS.find(c=>Math.hypot(x-c.x,y-c.y)<120);
  if(camp)return {name:camp.name,level:camp.level};
  if(inOpeningRunway({x,y})||Math.hypot(x-PASTURE.x,y-PASTURE.y)<170)return {name:'The Paired Pasture',level:1};
  if(inBriarRoad({x,y}))return {name:'The Briar Road',level:Math.hypot(x-BRIAR_CAMPS.den.x,y-BRIAR_CAMPS.den.y)<360?3:2};
  if(inFrontier(x,y)){const d=frontierAt(x,y);return {name:d.name,level:d.level};}
  if(x>6000)return {name:'The Crownless Road',level:11};
  if(x<1250&&y<1000)return {name:'The Verdant Reach',level:Math.hypot(x-1080,y-855)<450?1:2};
  const d=Math.hypot(x-1080,y-855);
  return {name:d<1500?(y>1050?(x<1250?'The Stillwhite':'Cindervein'):'Amberfall Woods'):'The Deep Wilds',level:d<1000?(y>1050?4:3):d<1800?5:d<2700?7:9};
}
export function creatureStats(c,s){
  const level=c.level||dangerAt(c.homeX,c.homeY).level,elite=!!c.elite;
  const pressure=!s.neutral&&c.type!=='seedling'?(level<=3?.75:level<=6?.88:1):1;
  return {level,maxHp:Math.round(s.hp*(1+(level-1)*.24)*(elite?1.65:1)),damage:Math.round(s.damage*pressure*(s.ranged?.8:1)*(1+(level-1)*.27)*(elite?1.25:1)),xp:Math.round((20+(level-1)*7)*(elite?2:1)),coins:3+level*(elite?3:1)};
}
