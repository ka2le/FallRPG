import { MORE_SPECIES } from './expansion-monsters.js';
import { EXPANSION_PLACES } from './regions.js';
import { FRONTIER_PLACES } from './frontier.js';

export const BIOMES = {
  spring: { name: 'The Verdant Reach', short: 'Spring', subtitle: 'WHERE THE FOREST FEEDS ITS HERDS', color: '#9dbb77', ground: ['#405f42','#496b47','#53764d','#5e8052','#688653'], accent: '#f0b0ba' },
  autumn: { name: 'Amberfall Woods', short: 'Autumn', subtitle: 'A THOUSAND YEARS OF FALLING LEAVES', color: '#d8a35e', ground: ['#64543c','#756040','#846744','#956e45','#a47a49'], accent: '#eab770' },
  winter: { name: 'The Stillwhite', short: 'Winter', subtitle: 'LIFE STIRS BENEATH THE SILENCE', color: '#a9d4d6', ground: ['#9ab8ba','#acc7c7','#bad0ce','#c9dbd4','#d4e1d8'], accent: '#d2eef1' },
  ember: { name: 'Cindervein', short: 'Ember', subtitle: 'WARM STONE, COLD NESTS', color: '#db9169', ground: ['#45484b','#505051','#5a5553','#665c53','#716457'], accent: '#ffba71' },
};

export const SPELLS = [
  { id:'bramble', name:'Briarwall', glyph:'vine', color:'#a6cc83', cost:24, cooldown:10, range:200, aim:'wall', duration:7, description:'Raise a thorn wall for 7 seconds. Blocks movement and shots.' },
  { id:'bind', name:'Briarbind', kind:'CONTROL', glyph:'vine', color:'#a6cc83', cost:18, cooldown:6, range:200, description:'Living roots hold one threat for 4 seconds. A moment to breathe, or to strike.' },
  { id:'frost', name:'Frostbloom', kind:'AREA / SLOW', glyph:'frost', color:'#9cd6df', cost:26, cooldown:7, range:230, radius:75, damage:28, description:'An icy bloom deals 28 damage in a wide area and slows its victims for 5 seconds.' },
  { id:'ward', name:'Willow Ward', kind:'SHIELD', glyph:'ward', color:'#e4ca84', cost:20, cooldown:9, description:'Wrap yourself in golden leaves. Absorb 45 damage for up to 7 seconds.' },
  { id:'wave', name:'Hollow Bell', kind:'AREA / STUN', glyph:'wave', color:'#b7b0e2', cost:24, cooldown:8, radius:100, damage:14, description:'Ring the old bell. Nearby threats take 14 damage, stagger backward, and are stunned for 2 seconds.' },
  { id:'siphon', name:'Moon Siphon', kind:'DAMAGE / HEAL', glyph:'moon', color:'#d4a5db', cost:22, cooldown:7, range:185, damage:27, description:'Draw 27 life from a threat, restoring 22 health to yourself.' },
  { id:'renew', name:'Verdant Oath', kind:'RESTORATION', glyph:'leaf', color:'#aacf87', cost:28, cooldown:12, description:'Promise the forest you will return. Recover 50 health over 5 seconds.' },
  { id:'blink', name:'Mothstep', kind:'MOVEMENT', glyph:'blink', color:'#f0bad4', cost:14, cooldown:4, description:'Slip 100 paces in your movement direction. Cannot cross water, walls, or solid roots.' },
  { id:'fox', name:'Lantern Fox', kind:'COMPANION', glyph:'fox', color:'#9ddacb', cost:30, cooldown:25, description:'Call a spirit fox for 20 seconds. It follows you and bites only threats already fighting you.' },
];
Object.assign(SPELLS.find(s=>s.id==='frost'),{aim:'ground',description:'28 damage and a 5-second slow in the chosen area.'});
Object.assign(SPELLS.find(s=>s.id==='wave'),{aim:'ground',range:180,radius:68,description:'14 damage, knockback, and a 2-second stun in the chosen area.'});
for(const id of ['bind','siphon'])SPELLS.find(s=>s.id===id).aim='unit';
export const STANCES = [
  {id:'ember',name:'Ember',key:'1',glyph:'fire',color:'#efab69',damage:14,rate:1.1,range:180,description:'Automatically fires at nearby threats. More damage.'},
  {id:'frost',name:'Frost',key:'2',glyph:'frost',color:'#a6d5e5',damage:9,rate:1.25,range:170,slow:1.5,description:'Automatic frost shots slow approaching threats.'},
  {id:'siphon',name:'Siphon',key:'3',glyph:'moon',color:'#c8a4da',damage:8,rate:1.35,range:145,heal:3,description:'Automatic life-drain shots restore a little health on impact.'},
];
export const SPELL_BY_ID = Object.fromEntries(SPELLS.map(s=>[s.id,s]));
export const SLOTS = ['q','e','f','r'];

export const SPECIES = {
  ...MORE_SPECIES,
  wallroot:{name:'Marching Claspwood',sprite:8,atlas:'groves',size:88,hp:96,speed:18,damage:6,xp:28,habitat:'spring',rootwall:true,note:'A walking Claspwood belonging to a traveling hedge. The group spreads through the woods, gathers across a trail and roots into a living wall for about a minute. Then it peels away one trunk at a time, migrating to its next gathering place. Leave the warning root circle quickly; cutting down a trunk opens a gap.'},
  barkjaw: { name:'Barkjaw', sprite:0, size:56, hp:100, speed:16, damage:12, neutral:true, habitat:'spring', note:'Its six mouth-limbs wrestle the trees it eats. A pair alternates feeding and keeping watch; the lookout drives Rootknives away.' },
  rootknife: { name:'Rootknife', sprite:1, size:56, hp:64, speed:39, damage:12, habitat:'spring', note:'This root-shaped hunter waits for a grazer to commit its mouth-limbs to a tree. A healthy feeding pair makes it hesitate.' },
  mantleback: { name:'Mantleback', sprite:2, size:64, hp:120, speed:12, damage:10, neutral:true, habitat:'autumn', note:'The garden on its back is its pantry. Fungi break down the endless autumn litter; smaller animals shelter between the mushrooms.' },
  antler: { name:'Rime Antler', sprite:3, size:54, hp:85, speed:24, damage:12, neutral:true, habitat:'winter', note:'Mineral antlers grow in the cold. The animal dips them into warm mist to cultivate the tiny hanging gardens it eats.' },
  snowkeel: { name:'Snowkeel', sprite:4, size:58, hp:90, speed:22, damage:12, neutral:true, habitat:'winter', note:'A blade-backed swimmer in deep snow. Its feeding tunnels aerate the mineral fungus, but it cannot travel across exposed warm ground.' },
  ventback: { name:'Ventback', sprite:5, size:66, hp:135, speed:19, damage:17, neutral:true, habitat:'ember', note:'A parent of the boundary. Its eggs need hot stone underneath and cold, wet snow overhead. Approach the nesting ledge carefully.' },
  scavenger: { name:'Boundary Scavenger', sprite:6, size:41, hp:55, speed:30, damage:8, neutral:true, habitat:'seam', note:'Two gut cultures need food from opposite sides of the seasonal seam. Watch it replenish the blue and amber reserves in turn.' },
  petalmaw: { name:'Petalmaw', sprite:7, size:47, hp:48, speed:23, damage:10, habitat:'spring', ranged:true, note:'A false lantern orchid. Its pulse is just slightly wrong. A hungry pollinator often notices the difference too late.' },
  seedling: { name:'Briar Seedling', sprite:8, size:36, hp:40, speed:25, damage:8, habitat:'spring', note:'A walking knot of defensive growth. It tests new clearings, then takes root where the grazers no longer pass.' },
  prowler: { name:'Thorn Prowler', sprite:9, size:53, hp:78, speed:45, damage:14, habitat:'autumn', note:'Thorny shoulders and a leaf-heavy mane break up its outline in the litter. Its crouch gives away the coming strike.' },
  stormbell: { name:'Stormbell', sprite:10, size:46, hp:58, speed:28, damage:11, habitat:'winter', ranged:true, note:'A floating bell with a heart of cold light. Its tendrils gather static above frozen pools before releasing a measured volley.' },
  wyrm: { name:'Lantern Wyrm', sprite:11, size:53, hp:72, speed:29, damage:13, habitat:'ember', ranged:true, note:'A warm throat glows beneath the basalt-colored scales. These small wyrms cluster around the mineral heat of Cindervein.' },
};

export const PLACES = [
  {id:'village', name:'Willowmere', x:1080, y:785, description:'A village kept open by its grazing herds.', biome:'spring'},
  {id:'pasture', name:'The Paired Pasture', x:810, y:565, description:'Giftwillows feed the herd. The herd keeps the road clear.', biome:'spring'},
  {id:'orchard', name:'The Listening Grove', x:465, y:390, description:'The flowers turn toward movement, not the sun.', biome:'spring'},
  {id:'elder', name:'The Hollow Elder', x:1810, y:415, description:'The shelter is alive. Listen before you enter.', biome:'autumn'},
  {id:'winter', name:'Snowbell Hollow', x:710, y:1405, description:'Beneath every quiet drift, a second world.', biome:'winter'},
  {id:'seam', name:'The Steamward', x:1275, y:1370, description:'Some lives belong to both sides of a boundary.', biome:'winter'},
  {id:'ember', name:'Cinderwatch', x:1845, y:1320, description:'Nest ledges warm below, cold and wet above.', biome:'ember'},
  ...EXPANSION_PLACES,
  ...FRONTIER_PLACES,
  {id:'crownless',name:'The Crownless Road · Lv 11',x:6520,y:660,biome:'ember',description:'Ancient guardians bar the long road beyond Whitebraid. Bring your best equipment.'},
];

export const QUESTS = [
  {id:'herd', title:'Room for two', giver:'Rowan', detail:'Clear the three Briar Seedlings at the pasture north of Willowmere, then return to Rowan for your first spell and wand.', reward:'90 memories · Briarbind · Singing reed · 35 amber · 2 tonics'},
  {id:'seasons', title:'A world between seasons', giver:'Mara', detail:'Record wildlife in all four habitats. Observe a Barkjaw, Mantleback, Snowkeel, and Ventback, then return to Mara.', reward:'120 memories · the Wayfarer title'},
  {id:'seam', title:'Two sides of a meal', giver:'Mara', detail:'At the Steamward, clear the fallen branches from the narrow crossing. The Boundary Scavenger needs food from both sides.', reward:'90 memories · 1 tonic'},
];
