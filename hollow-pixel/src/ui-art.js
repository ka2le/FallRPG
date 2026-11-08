// Game-UI icons. Every icon has a vector fallback; when a pixel sprite for it
// exists in public/assets/ui/, add its key to UI_SPRITES and the UI uses it.
// Requested sprites and their descriptions: docs/ui-sprite-requests.md
import { EQUIPMENT_SLOTS, ITEM_TYPES, SLOT_ACCEPTS } from './items.js';
import { pixelItem } from './item-sprites.js';
import { wholeNumber as num, signedWholeNumber } from './display-numbers.js';
export const UI_SPRITES=new Set([
  // e.g. 'stat-health', 'item-reedstaff', 'slot-weapon', 'attr-power'
]);

const P={
  map:'M3 7L11 3L21 8L29 4V25L21 29L11 24L3 28ZM11 3V24M21 8V29',
  coin:'M16 4A12 12 0 1 0 16 28A12 12 0 1 0 16 4ZM16 9V23M12 12Q16 9 20 12M12 20Q16 23 20 20',
  heart:'M16 27C6 20 3 15 3 10A6.5 6.5 0 0 1 16 8A6.5 6.5 0 0 1 29 10C29 15 26 20 16 27Z',
  drop:'M16 3C22 11 25 15 25 20A9 9 0 0 1 7 20C7 15 10 11 16 3ZM12 20A4 4 0 0 0 16 24',
  star:'M16 3L19.5 12H28.5L21.5 18L24 27L16 21.5L8 27L10.5 18L3.5 12H12.5Z',
  regen:'M25 12A10 10 0 0 0 7 11M7 4V11H14M7 20A10 10 0 0 0 25 21M25 28V21H18',
  shield:'M16 3L27 8V16Q26 24 16 29Q6 24 5 16V8ZM16 9V22M11 14L16 19L21 14',
  spark:'M17 2C19 10 8 12 10 20C5 17 5 12 6 10C-1 22 7 30 16 30C29 29 31 17 25 11C26 19 20 21 19 18C23 12 20 6 17 2Z',
  boot:'M10 4H17V16L25 19Q28 20 28 24V27H8V4ZM8 22H28M2 9H6M1 14H5',
  staff:'M8 29L22 8M16 4L24 2L29 9L21 13L16 4ZM6 23L11 27',
  robe:'M12 4L16 7L20 4L26 9L23 13L23 28H9L9 13L6 9ZM16 7V28M12 18H20',
  charm:'M9 3Q16 11 23 3M16 10L22 18L16 28L10 18ZM16 15V23',
  vessel:'M11 3H21M12 3V8Q4 12 4 19A12 9 0 0 0 28 19Q28 12 20 8V3M6 18H26',
  scroll:'M8 5H24V25A3 3 0 0 1 21 28H6A3 3 0 0 1 3 25V22H8ZM8 5A3 3 0 0 0 5 8V10H8M12 11H20M12 16H20M12 21H17',
  hearth:'M4 28H28M7 28V14L16 6L25 14V28M13 28V22Q16 17 19 22V28',
  warn:'M16 4L29 27H3ZM16 12V19M16 23V24',
  plus:'M16 7V25M7 16H25',
  minus:'M7 16H25',
  sprout:'M16 29V14M16 18Q8 18 6 9Q14 8 16 18M16 14Q17 5 26 4Q27 13 16 14',
  gem:'M16 2L29 16L16 30L3 16ZM16 7V25M8 16L16 20L24 16',
  facet:'M16 2L29 16L16 30L3 16ZM16 6L25 16L16 26L7 16Z',
  plain:'M16 2L29 16L16 30L3 16Z',
  check:'M6 17L13 24L26 8',
  bag:'M10 10V8A6 6 0 0 1 22 8V10M5 10H27L25 29H7ZM11 16H21',
  head:'M5 25Q3 4 16 3Q29 4 27 25ZM10 25V16Q16 9 22 16V25',
  cloak:'M12 4Q16 1 20 4L28 27 16 24 4 27ZM12 4Q16 13 20 4',
  gloves:'M8 27V16L5 9 8 7 12 15V4H16L18 15 21 5H25L23 20 28 16 30 19 20 28Z',
  belt:'M3 12Q16 7 29 12V23Q16 18 3 23ZM12 10H21V24H12Z',
  ring:'M22 18A9 9 0 1 1 10 18M10 10L16 3 22 10 19 18H13Z',
  focus:'M25 12A10 10 0 1 1 5 12A10 10 0 0 1 25 12ZM21 21L29 29',
  relic:'M7 3H25M7 29H25M10 4Q10 11 16 16Q22 21 22 28M22 4Q22 11 16 16Q10 21 10 28',
  lantern:'M12 7V5Q16 0 20 5V7M6 12L10 27H22L26 12ZM6 12V8L16 4 26 8V12ZM16 15Q10 23 16 25Q22 23 16 15',
};
export const gicon=(name,cls='')=>`<svg class="gi ${cls}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name]||P.gem}"/></svg>`;

// A sprite slot: shows public/assets/ui/<key>.png when registered, otherwise the vector icon.
export function art(key,fallback,cls=''){
  if(key==='icon-amber')return pixelItem('amber-coins',cls);
  if(UI_SPRITES.has(key))return `<span class="art ${cls}"><img src="./assets/ui/${key}.png" alt="" draggable="false"/></span>`;
  return `<span class="art ${cls}">${gicon(fallback)}</span>`;
}

export const SLOT_INFO={
  weapon:{name:'Weapon',icon:'staff',hint:'Wands and staves raise magic power and basic spark damage.'},
  robe:{name:'Robe',icon:'robe',hint:'Robes and coats add health and reduce damage taken.'},
  boots:{name:'Boots',icon:'boot',hint:'Boots make you walk and run faster.'},
  charm:{name:'Charm',icon:'charm',hint:'Charms deepen and refill your aether.'},
  head:{name:'Head',icon:'head',hint:'Circlets and hoods tune power, aether flow or Willow Ward.'},
  cloak:{name:'Cloak',icon:'cloak',hint:'Choose light traveling cloth or heavier protective wings.'},
  gloves:{name:'Hands',icon:'gloves',hint:'Steady free sparks, strengthen magic or hold Briarbind longer.'},
  belt:{name:'Belt',icon:'belt',hint:'Carry stronger tonics, deeper reserves or protective roots.'},
  ring:{name:'Ring',icon:'ring',hint:'Small magical bargains: power, recovery and deliberate tradeoffs.'},
  focus:{name:'Focus',icon:'focus',hint:'An off-hand focus specializes Willow Ward, Wildbloom or Aether Lance.'},
  relic:{name:'Relic',icon:'relic',hint:'Shorten spell recovery, strengthen your fox or lengthen Briarbind.'},
  lantern:{name:'Lantern',icon:'lantern',hint:'Carry brighter wards, wider blooms or restorative supplies.'},
};
export const SLOT_ORDER=ITEM_TYPES; // item type order, for sorting
// Body slots on the character: each accepts one or more item types.
export const EQUIP_SLOT_INFO={
  head:{name:'Head',icon:'head'},weapon:{name:'Main hand',icon:'staff'},offhand:{name:'Off hand',icon:'focus'},
  robe:{name:'Body',icon:'robe'},boots:{name:'Feet',icon:'boot'},
  trinket1:{name:'Trinket',icon:'ring'},trinket2:{name:'Trinket',icon:'charm'},trinket3:{name:'Trinket',icon:'relic'},
};
export const slotAccepts=slot=>(SLOT_ACCEPTS[slot]||[]).map(t=>SLOT_INFO[t]?.name||t);
export { EQUIPMENT_SLOTS };

// Derived character numbers shown in menus. `fmt` turns a raw value into display text.
const pct=v=>`${num(v*100)}%`,signPct=v=>`${signedWholeNumber(v*100)}%`,dec=v=>v.toFixed(1);
export const STAT_INFO={
  health:{name:'Health',icon:'heart',color:'#e07b6a',fmt:num,delta:v=>`${v>0?'+':'−'}${Math.abs(Math.round(v))}`,about:'How much harm you can take before falling.'},
  mana:{name:'Mana',icon:'drop',color:'#6fb7c6',fmt:num,delta:v=>`${v>0?'+':'−'}${Math.abs(Math.round(v))}`,about:'Maximum mana. Each Mana point increases both the pool and regeneration.'},
  regen:{name:'Mana recovery',icon:'regen',color:'#8fd0c7',fmt:v=>`${dec(v)}/s`,delta:v=>`${v>0?'+':'−'}${Math.abs(v).toFixed(2)}/s`,about:'Mana refilled every second in combat. Outside combat, recover another 2/s.'},
  healthRegen:{name:'Health recovery',icon:'heart',color:'#a7ce94',fmt:v=>`${dec(v)}/s`,delta:v=>`${v>0?'+':'−'}${Math.abs(v).toFixed(2)}/s`,about:'Slow passive healing: 0.5/s in combat and 1.2/s while resting or travelling outside combat.'},
  power:{name:'Magic power',icon:'star',color:'#e8c572',fmt:pct,delta:signPct,about:'Scales all spell and spark damage, and how long shields, roots and summons last.'},
  damage:{name:'Spark damage',icon:'spark',color:'#efab69',fmt:num,delta:signedWholeNumber,about:'Damage of each free automatic spark.'},
  armor:{name:'Protection',icon:'shield',color:'#b7c49a',fmt:pct,delta:signPct,about:'Share of incoming damage ignored (up to 60%).'},
  speed:{name:'Movement',icon:'boot',color:'#c9b6e4',fmt:signPct,delta:signPct,about:'Extra walking and running speed.'},
  ward:{name:'Willow Ward',icon:'shield',color:'#bdd79f',fmt:num,delta:signedWholeNumber,about:'Damage absorbed by a fresh Willow Ward.'},
  bloom:{name:'Bloom radius',icon:'sprout',color:'#9fe08a',fmt:v=>`${num(v)} u`,delta:v=>`${signedWholeNumber(v)} u`,about:'Wildbloom reaches this far, with line of sight still required.'},
  bind:{name:'Briarbind',icon:'sprout',color:'#a6cc85',fmt:v=>`${dec(v)}s`,delta:v=>`${v>0?'+':'−'}${Math.abs(v).toFixed(1)}s`,about:'Root duration of the Briarbind empowered spark.'},
  fox:{name:'Fox damage',icon:'spark',color:'#e5bc7d',fmt:num,delta:signedWholeNumber,about:'Damage per attack of a newly summoned Lantern Fox.'},
  lance:{name:'Lance damage',icon:'spark',color:'#efab69',fmt:num,delta:signedWholeNumber,about:'Damage of Aether Lance. Extra spark damage applies only to free sparks.'},
  tonic:{name:'Tonic healing',icon:'heart',color:'#e07b6a',fmt:num,delta:signedWholeNumber,about:'Health restored by one tonic, capped at your maximum health. Recovery remains eight seconds.'},
  cooldown:{name:'Spell recovery',icon:'relic',color:'#c9b6e4',fmt:v=>`${v?'-':''}${pct(v)}`,delta:signPct,about:'Reduction to spell cooldowns, capped at 20%. Aether costs and basic spark timing stay the same.'},
};
export const STAT_ORDER=['health','healthRegen','mana','regen','power','damage','armor','speed','ward','bloom','bind','fox','lance','tonic','cooldown'];

// Raw gear stat → readable line on item cards.
export const GEAR_STAT={
  power:{icon:'star',text:v=>`${signPct(v)} magic power`},
  damage:{icon:'spark',text:v=>`${signedWholeNumber(v)} spark damage`},
  health:{icon:'heart',text:v=>`${v>=0?'+':''}${Math.round(v)} health`},
  armor:{icon:'shield',text:v=>`${pct(v)} protection`},
  mana:{icon:'drop',text:v=>`${v>=0?'+':''}${Math.round(v)} aether`},
  regen:{icon:'regen',text:v=>`${v>=0?'+':''}${v} aether/s`},
  speed:{icon:'boot',text:v=>`${signPct(v)} movement`},
  ward:{icon:'shield',text:v=>`${signedWholeNumber(v)} Willow Ward absorption`},
  bloom:{icon:'sprout',text:v=>`${signedWholeNumber(v)} Wildbloom radius`},
  bind:{icon:'sprout',text:v=>`+${v}s Briarbind`},
  fox:{icon:'spark',text:v=>`${signPct(v)} Lantern Fox damage`},
  lance:{icon:'spark',text:v=>`${signPct(v)} Aether Lance damage`},
  tonic:{icon:'heart',text:v=>`${signedWholeNumber(v)} healing per tonic`},
  cooldown:{icon:'relic',text:v=>`${pct(v)} shorter spell recovery`},
};

export const ATTR_ART={power:'star',mana:'drop'};
export const ATTR_COLOR={power:'#e8c572',mana:'#6fb7c6'};
export const ATTR_SHORT={power:'+5% power · every attack and spell',mana:'+8 maximum mana · +0.65 mana/s'};

export const itemArt=(id,item,cls='')=>pixelItem(id,cls)||art(`item-${id}`,SLOT_INFO[item.slot]?.icon||'gem',cls);
