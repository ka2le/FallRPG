import {SPELLS,ACTIONS,CAMPS,terrain} from './data.js';
import {courtAt,WORLD_HALF} from './landscape.js';
import {HABITATS} from './habitats.js';
export const SLOTS=[['weapon','Wand','✦'],['focus','Focus','◇'],['head','Head','♔'],['robe','Robe','♜'],['boots','Feet','⌁'],['charm','Charm','◈']];
export const ITEMS={
 twig:{lore:'A spark is enough to begin.',name:'Hearth twig',slot:'weapon',icon:'✦',stats:{},detail:'A spark is enough to begin.'},
 wraps:{lore:'Well worn. Ready for another journey.',name:'Wayfarer wraps',slot:'robe',icon:'♜',stats:{},detail:'Well worn. Ready for another journey.'},
 reedwand:{lore:'Hums when the wind crosses its holes.',name:'Singing reed',slot:'weapon',icon:'✦',stats:{power:.08},detail:'+8% spell damage'},
 trailboots:{lore:'The briars part for whoever wears them.',name:'Briarstep boots',slot:'boots',icon:'⌁',stats:{move:.08},detail:'+8% movement speed'},
 wardfocus:{lore:'Ground from a watchstone that never closed its eye.',name:'Watchstone lens',slot:'focus',icon:'◇',stats:{mana:15,regen:1},detail:'+15 mana · +1 mana / sec'},
 winterring:{lore:'Cold to the touch, even in summer.',name:'Rime seed',slot:'charm',icon:'❄',stats:{area:2},detail:'+2m Frostburst radius'},
 mossrobe:{lore:'Still growing, very slowly.',name:'Mosswoven mantle',slot:'robe',icon:'♜',stats:{hp:20},detail:'+20 health'},
 moonhood:{lore:'Woven by moths that only fly at the full moon.',name:'Mothsilk hood',slot:'head',icon:'♔',stats:{mana:15,power:.04},detail:'+15 mana · +4% spell damage'},
 stonefocus:{lore:'It remembers standing guard.',name:'Sentinel fragment',slot:'focus',icon:'◇',stats:{armor:.12,hp:10},detail:'12% less incoming damage · +10 health'},
 emberwand:{lore:'Charred, but it never stopped burning.',name:'Cinder reed',slot:'weapon',icon:'✦',stats:{power:.16},detail:'+16% spell damage'},
 snowboots:{lore:'Leaves no prints on fresh snow.',name:'Snowthread soles',slot:'boots',icon:'⌁',stats:{move:.12,hp:10},detail:'+12% movement speed · +10 health'},
 moonring:{lore:'A tear from the moonwell, kept from falling.',name:'Moonwell tear',slot:'charm',icon:'☽',stats:{siphon:.15},detail:'Siphon heals an extra 15% of damage dealt'},
 thorncrown:{lore:'The brood bowed to whoever wore it.',name:'Crown of the brood',slot:'head',icon:'♔',stats:{bind:2,mana:10},detail:'+2 seconds Bind · +10 mana'},
 ashrobe:{lore:'Woven from what the pyre left behind.',name:'Ashweave',slot:'robe',icon:'♜',stats:{hp:30,armor:.06},detail:'+30 health · 6% less incoming damage'},
 glasswand:{lore:'Sings a single clear note when cast.',name:'Glasswinter branch',slot:'weapon',icon:'✦',stats:{power:.22},detail:'+22% spell damage'},
 springheart:{lore:'Beats once each dawn.',name:'Heart of the grove',slot:'charm',icon:'❧',stats:{bind:3,regen:1},detail:'+3 seconds Bind · +1 mana / sec'},
 tidefocus:{lore:'Fell from the sky and sank. Now it rises.',name:'Drowned star',slot:'focus',icon:'◇',stats:{mana:25,regen:2},detail:'+25 mana · +2 mana / sec'},
 embercrown:{lore:'The last light of the last pyre.',name:'Lastlight diadem',slot:'head',icon:'♔',stats:{power:.12,mana:20},detail:'+12% spell damage · +20 mana'},
 winterheart:{lore:'Everything near it slows to listen.',name:'Heart of stillness',slot:'charm',icon:'❄',stats:{area:3,hp:15},detail:'+3m Frostburst radius · +15 health'},
};

// Display data for gear: rarity follows the level of the encounter that awards the item.
export const RARITY=[{name:'Worn',color:'#b3ab9b'},{name:'Uncommon',color:'#8fd16a'},{name:'Rare',color:'#6cb4ff'},{name:'Epic',color:'#c48cff'},{name:'Legendary',color:'#ffad4a'}];
export function itemLevel(id){return CAMPS.find(c=>c.reward===id)?.level||1;}
export function itemRarity(id){const c=CAMPS.find(c=>c.reward===id);return !c?0:c.level<=3?1:c.level<=6?2:c.level<=8?3:4;}
export const STAT_LINES={power:['Spell power','%'],hp:['Health',''],mana:['Mana',''],regen:['Mana / sec',''],armor:['Damage taken','%',-1],move:['Move speed','%'],bind:['Bind duration',' s'],area:['Frostburst radius',' m'],siphon:['Siphon healing','%']};
export function statText(key,value){const [label,unit,sign=1]=STAT_LINES[key],n=unit==='%'?Math.round(value*100):value;return `${sign*n>0?'+':'−'}${Math.abs(n)}${unit} ${label}`;}
export function gearTotals(equipment){const g={};for(const id of Object.values(equipment)){const it=ITEMS[id];if(it)for(const [key,value] of Object.entries(it.stats))g[key]=(g[key]||0)+value;}return g;}
// Every number the character sheet shows, derived the same way combat uses them.
export function characterStats(level,g){
  const power=1+(level-1)*.09+(g.power||0),fire=SPELLS[0],frost=SPELLS[5],drain=SPELLS[4];
  return {hp:100+(level-1)*4+(g.hp||0),mana:100+(level-1)*3+(g.mana||0),regen:10+(g.regen||0),power,
    fire:fire.damage*power,fireDps:fire.damage*power/fire.rate,burn:4*power,frost:frost.damage*power,radius:frost.blast+(g.area||0),
    bind:6+(g.bind||0),siphon:drain.damage*power,siphonHeal:.65+(g.siphon||0),armor:Math.min(.5,g.armor||0),move:7.5*(1+(g.move||0))};
}
export const QUESTS=[
 {id:'spark',name:'A spark in the briars',detail:'Clear First embers, just north of the Hearth.',need:1,kind:'camp',target:0,xp:35},
 {id:'chase',name:'Catch the hunters',detail:'Defeat two Prowlers on the Briar track. Seeking Bind holds them still.',need:2,kind:'type',target:'prowler',requires:'spark',xp:60},
 {id:'volley',name:'Between the volleys',detail:'Clear the Watchstones. Face incoming projectiles with Shield.',need:1,kind:'camp',target:2,requires:'chase',xp:75},
 {id:'brood',name:'A thousand needles',detail:'Clear the Needle nursery. Frostburst and Shockwave give you room.',need:1,kind:'camp',target:3,requires:'volley',xp:120},
 {id:'seasons',name:'Four winds',detail:'Explore all four seasonal courts, beyond the Hearth.',need:4,kind:'courts',xp:150,knowledge:1},
 {id:'sentinel',name:'An old debt',detail:'Defeat the old sentinel in the deep Bloomwood.',need:1,kind:'camp',target:6,requires:'brood',xp:180,knowledge:1},
 {id:'crowns',name:'Keepers of the wild',detail:'Clear the Drowned Crown, Last Pyre and White Silence.',need:3,kind:'crowns',requires:'sentinel',xp:320,knowledge:2},
 {id:'living-world',name:'Read the living world',detail:'Find the six living habitats: the Giving Grove west of the Hearth, Hungry Shelter, Living Rafters, Thawline, Turning Orchard and Lanternwater Gardens. Observe their residents; no kills are required.',need:6,kind:'habitats',xp:180,knowledge:1},
];
export class Journey{
  constructor(){this.known=new Set(['attack']);this.knowledge=0;this.level=1;this.xp=0;this.inventory=['twig','wraps'];this.equipment={weapon:'twig',robe:'wraps'};this.cleared=new Set();this.discovered=new Set([0]);this.habitats=new Set();this.courts=new Set();this.killTypes={};this.claimed=new Set();this.gear={};this.revision=0;}
  xpNeeded(){return 60+(this.level-1)*45;}
  power(){return 1+(this.level-1)*.09+(this.gear.power||0);}
  gainXp(amount){this.xp+=amount;while(this.xp>=this.xpNeeded()&&this.level<12){this.xp-=this.xpNeeded();this.level++;this.knowledge++;this.recalculate();this.player.mana=this.player.maxMana;this.emit('level');}if(this.level===12)this.xp=Math.min(this.xp,this.xpNeeded());this.revision++;}
  learn(action){const s=SPELLS[ACTIONS[action]];if(!s||this.known.has(action)||this.level<s.level||this.knowledge<1)return false;this.known.add(action);this.knowledge--;this.revision++;this.emit('learn',{action});return true;}
  respec(){if(Math.hypot(this.player.x,this.player.z)>22)return false;this.knowledge+=this.known.size-1;this.known=new Set(['attack']);this.beam.time=0;this.player.ward=0;this.companion.time=0;this.buffs={haste:0,renew:0,recall:0};this.revision++;return true;}
  stats(equipment=this.equipment){return characterStats(this.level,gearTotals(equipment));}
  recalculate(){const g=gearTotals(this.equipment);this.gear=g;if(this.player){this.player.maxHp=100+(this.level-1)*4+(g.hp||0);this.player.maxMana=100+(this.level-1)*3+(g.mana||0);this.player.hp=Math.min(this.player.hp,this.player.maxHp);this.player.mana=Math.min(this.player.mana,this.player.maxMana);}this.revision++;}
  equip(id){const it=ITEMS[id];if(!it||!this.inventory.includes(id))return false;this.equipment[it.slot]=id;this.recalculate();this.emit('equip');return true;}
  unequip(slot){if(!this.equipment[slot])return false;delete this.equipment[slot];this.recalculate();return true;}
  questProgress(q){if(q.kind==='habitats')return this.habitats.size;if(q.kind==='camp')return this.cleared.has(q.target)?1:0;if(q.kind==='type')return Math.min(q.need,this.killTypes[q.target]||0);if(q.kind==='courts')return this.courts.size;if(q.kind==='crowns')return [14,15,16].filter(i=>this.cleared.has(i)).length;return 0;}
  questAvailable(q){return !q.requires||this.claimed.has(q.requires);}
  claimQuest(id){const q=QUESTS.find(q=>q.id===id);if(!q||!this.questAvailable(q)||this.claimed.has(id)||this.questProgress(q)<q.need)return false;this.claimed.add(id);this.knowledge+=q.knowledge||0;this.gainXp(q.xp);this.emit('quest',{name:q.name});return true;}
  recordKill(e){this.killTypes[e.type]=(this.killTypes[e.type]||0)+1;this.gainXp(Math.round(e.xpReward));
    if(e.camp>=0&&!this.cleared.has(e.camp)&&this.enemies.filter(ally=>ally.camp===e.camp).every(ally=>ally.hp<=0)){
      this.cleared.add(e.camp);const camp=CAMPS[e.camp];if(camp.reward&&!this.inventory.includes(camp.reward)){this.inventory.push(camp.reward);this.emit('loot',{item:camp.reward});}this.emit('clear',{camp:e.camp});this.revision++;
    }
  }
  explore(){const p=this.player;if(Math.hypot(p.x,p.z)>50&&!this.courts.has(courtAt(p.x,p.z))){this.courts.add(courtAt(p.x,p.z));this.revision++;}
    for(const h of HABITATS)if(Math.hypot(h.x-p.x,h.z-p.z)<h.r+5&&!this.habitats.has(h.id)){this.habitats.add(h.id);this.emit('habitat',{name:h.name,detail:h.detail});this.revision++;}
    CAMPS.forEach((c,i)=>{if(Math.hypot(c.x-p.x,c.z-p.z)<48&&!this.discovered.has(i)){this.discovered.add(i);this.emit('discover',{camp:i});this.revision++;}});
  }
  save(){return {version:2,level:this.level,xp:this.xp,knowledge:this.knowledge,known:[...this.known],inventory:this.inventory,equipment:this.equipment,cleared:[...this.cleared],discovered:[...this.discovered],habitats:[...this.habitats],courts:[...this.courts],killTypes:this.killTypes,claimed:[...this.claimed],kills:this.kills,deaths:this.deaths,position:{x:this.player.x,z:this.player.z,y:Math.max(this.player.y,terrain(this.player.x,this.player.z)+1.7),yaw:this.player.yaw,pitch:this.player.pitch}};}
  restore(data){if(!data||data.version!==2)return false;
    const num=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
    const list=(v)=>Array.isArray(v)?v:[];
    this.habitats=new Set(list(data.habitats).filter(id=>HABITATS.some(h=>h.id===id)));
    this.level=Math.floor(num(data.level,1,12,1));this.xp=num(data.xp,0,this.xpNeeded(),0);this.knowledge=Math.floor(num(data.knowledge,0,20,0));
    this.known=new Set(['attack',...list(data.known).filter(a=>ACTIONS[a]!==undefined&&SPELLS[ACTIONS[a]].level<=this.level)]);
    this.inventory=[...new Set(['twig','wraps',...list(data.inventory).filter(id=>ITEMS[id])])];this.equipment={};
    for(const [slot,id] of Object.entries(data.equipment||{}))if(ITEMS[id]?.slot===slot&&this.inventory.includes(id))this.equipment[slot]=id;
    this.cleared=new Set(list(data.cleared).filter(i=>CAMPS[i]));this.discovered=new Set([0,...list(data.discovered).filter(i=>CAMPS[i])]);this.courts=new Set(list(data.courts).filter(i=>Number.isInteger(i)&&i>=0&&i<4));
    this.claimed=new Set(list(data.claimed).filter(id=>QUESTS.some(q=>q.id===id)));this.killTypes={};for(const [type,n] of Object.entries(data.killTypes||{}))this.killTypes[type]=Math.floor(num(n,0,100000,0));
    this.kills=Math.floor(num(data.kills,0,100000,0));this.deaths=Math.floor(num(data.deaths,0,100000,0));this.recalculate();
    const p=this.player,loc=data.position||{};p.x=num(loc.x,-WORLD_HALF+15,WORLD_HALF-15,0);p.z=num(loc.z,-WORLD_HALF+15,WORLD_HALF-15,8);p.y=num(loc.y,terrain(p.x,p.z)+1.7,500,terrain(p.x,p.z)+1.7);p.yaw=num(loc.yaw,-100000,100000,0);p.pitch=num(loc.pitch,-1.4,1.4,0);p.hp=p.maxHp;p.mana=p.maxMana;this.revision++;return true;
  }
}
