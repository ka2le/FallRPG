import { SPECIES } from './data.js';
import { dist, biomeAt, propsNear } from './world.js';

const resources={
  flowerCircuit:{families:['blossom'],art:[11,12]},
  strippingStones:{art:[0,1,2]}, pollenEdge:{art:[12]},
  pondKeeper:{art:[5,6,7]}, watersideNest:{art:[6,7,41]},
  sapFeeding:{families:['claspwood','giftwillow'],art:[15,21]},
  claspwoodCalls:{families:['claspwood']}, fogGarden:{art:[40,41]},
  burrowWorks:{art:[2,46]}, burialMounds:{families:['burial'],art:[42,61]},
  feedingTerrace:{art:[2,16,58]}, corpseGarden:{art:[44,45,18,19]},
  slowGrazer:{art:[47,20]}, eggRaider:{art:[35]}, nurseryPredator:{art:[35]},
  falseSnowbell:{art:[26,30]}, snowbellRoots:{art:[26,31]}, frozenCache:{art:[28,29]},
  coldBoundaryRest:{art:[31,37]}, debrisFilter:{art:[5,7,47]},
  marginAmbush:{art:[17,23]}, mineralPool:{art:[34,35,37]},
};
const states={flowerCircuit:'carrying pollen',strippingStones:'shedding greenery',pollenEdge:'watching the refuge',pondKeeper:'tending a mineral bowl',watersideNest:'returning to the reeds',sapFeeding:'drinking sap',claspwoodCalls:'listening for danger',fogGarden:'tending the fog garden',burrowWorks:'working the ridge',burialMounds:'tending a burial mound',feedingTerrace:'carrying food uphill',corpseGarden:'opening old plates',slowGrazer:'grazing velvet',eggRaider:'watching the nursery',nurseryPredator:'guarding the nursery',falseSnowbell:'tapping the crust',snowbellRoots:'listening beneath snow',frozenCache:'searching the cache',coldBoundaryRest:'resting the cold garden',debrisFilter:'filtering debris',marginAmbush:'waiting in the litter',mineralPool:'tending a hot pool'};

function feedingPlaces(game,c,behavior){
  if(c.feedingPlaces)return c.feedingPlaces;
  const rule=resources[behavior],home={x:c.homeX,y:c.homeY},s=SPECIES[c.type];
  c.feedingPlaces=rule?propsNear(game.world,c.homeX,c.homeY,340).filter(p=>!p.removed&&dist(p,home)<340&&(!s.neutral||biomeAt(p.x,p.y)===s.habitat)&&(rule.families?.includes(p.family)||(p.atlas==='wilds'&&rule.art?.includes(p.art))))
    .sort((a,b)=>dist(a,home)-dist(b,home)).slice(0,3):[];
  return c.feedingPlaces;
}

function moveWithinHabitat(game,c,goal,dt,speed){
  const s=SPECIES[c.type];if(dist(goal,{x:c.homeX,y:c.homeY})>400||(s.neutral&&biomeAt(goal.x,goal.y)!==s.habitat))return;
  game.walkCreature(c,goal,dt,speed);
}

// Bounded local routines: the full time-gradient and food-web systems remain lore.
export function expansionEcology(game,c,dt){
  const s=SPECIES[c.type],behavior=s.behavior;if(!behavior)return false;
  const cycle=(game.time+c.phase*4)%18,home={x:c.homeX,y:c.homeY};
  c.feeding=false;c.calling=false;c.state=states[behavior]||'resting';
  if(behavior==='grazerCompanion'||behavior==='predatorFollower'){
    const followed=game.creatures.filter(a=>a!==c&&!a.dead&&dist(a,home)<210&&(behavior==='grazerCompanion'?SPECIES[a.type].neutral&&SPECIES[a.type].size>45:!SPECIES[a.type].neutral)).sort((a,b)=>dist(a,c)-dist(b,c))[0];
    c.state=behavior==='grazerCompanion'?'borrowing a grazer’s scent':'following for scraps';
    if(followed&&dist(c,followed)>48)moveWithinHabitat(game,c,{x:followed.x+30,y:followed.y+28},dt,s.speed*.5);
    return true;
  }
  const sites=feedingPlaces(game,c,behavior),index=Math.floor((game.time+c.phase*4)/18)%Math.max(1,sites.length),site=sites[index];
  let goal=site?{x:site.x+(site.solid||8)+16,y:site.y+18}:{x:home.x+Math.sin(game.time*.07+c.phase)*42,y:home.y+Math.cos(game.time*.05+c.phase)*32};
  if(behavior==='eggRaider'){
    const danger=game.creatures.some(a=>!a.dead&&a.type==='broodling'&&dist(a,c)<115);
    if(danger){c.state='retreating from the brood';goal=home;}
  }
  if(behavior==='claspwoodCalls'&&dist(c,game.player)<110&&game.time>(c.nextCall||0)){
    c.nextCall=game.time+12;c.callUntil=game.time+1.4;
    if(dist(c,game.player)<800)game.effect('ring',c.x,c.y,'#d7c18c',{radius:32,life:.8});
    if(site?.clasp)game.triggerTree(site);
  }
  c.calling=(c.callUntil||0)>game.time;
  if(behavior==='debrisFilter'||behavior==='slowGrazer'){
    c.feeding=cycle<13;if(!c.feeding&&dist(c,goal)>24)moveWithinHabitat(game,c,goal,dt,s.speed*.5);return true;
  }
  if(cycle<5||dist(c,goal)<28){c.feeding=true;return true;}
  if(s.neutral&&biomeAt(goal.x,goal.y)!==s.habitat)return true;
  moveWithinHabitat(game,c,goal,dt,s.speed*(behavior==='eggRaider'?.65:.38));
  return true;
}
