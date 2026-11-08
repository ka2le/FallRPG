// Equipment identities and rewards belong to Between Seasons, independent of the 3D game.
// Item types keep their identity; fewer body slots each accept several types.
export const ITEM_TYPES=['weapon','head','robe','cloak','gloves','belt','boots','charm','ring','focus','relic','lantern'];
const TRINKET=['ring','charm','relic','belt','gloves'];
export const SLOT_ACCEPTS={head:['head'],weapon:['weapon'],offhand:['focus','lantern'],robe:['robe','cloak'],boots:['boots'],trinket1:TRINKET,trinket2:TRINKET,trinket3:TRINKET};
export const EQUIPMENT_SLOTS=Object.keys(SLOT_ACCEPTS);
export const slotsForType=type=>EQUIPMENT_SLOTS.filter(s=>SLOT_ACCEPTS[s].includes(type));
const item=(name,slot,stats,description,level,price)=>({name,slot,stats,description,level,...(price?{price}:{})});
export const NEW_GEAR={
 sprigcirclet:item('Sprigkeeper circlet','head',{power:.025,mana:5},'A living sprig tucked behind each ear. A gentle beginning for a hedge mage.',2,32),
 mothhood:item('Mothsilk cowl','head',{power:.04,regen:.45},'The lining hums softly whenever aether returns.',5),
 rimecrown:item('Crown of thawing bells','head',{ward:12,mana:12},'The bells ring inside your ward instead of against your skin.',10),
 leafcape:item('Leafdrift cape','cloak',{speed:.035,mana:6},'Light enough to follow the wind; deep pockets catch wandering magic.',2,34),
 duskshroud:item('Duskwing shroud','cloak',{armor:.035,speed:-.015,health:8},'Folded wings cushion the blow, but weigh on each footstep.',3),
 auroraveil:item('Aurora veil','cloak',{regen:.7,mana:10},'The northern lights, folded at the shoulders.',13),
 reedgrips:item('Reedweaver grips','gloves',{damage:1},'A firm grip steadies every free spark.',4,52),
 briargrips:item('Briarkeeper gloves','gloves',{bind:.6,mana:6},'The thorns remember the shape of a closing hand.',9),
 cindermitts:item('Kilnhand mitts','gloves',{power:.06,mana:-8},'A little more brilliance, a little less reserve.',6),
 herbcord:item('Herbalist pocket belt','belt',{tonic:12,health:8},'Keeps dried herbs close. Each tonic restores twelve more health.',2,30),
 moonspool:item('Moonspool sash','belt',{regen:.5,mana:8},'An extra hour of moonlight wound around your waist.',6),
 rootbuckle:item('Oathroot buckle','belt',{armor:.035,speed:-.02,health:12},'It tightens whenever you forget a promise.',8),
 amberloop:item('Amber spark band','ring',{power:.03},'A tiny spark sleeping inside a drop of summer.',2,36),
 dewloop:item('Dewcatcher loop','ring',{regen:.55,power:-.02},'Catch the slow drip of aether; let a little brightness go.',7),
 eclipseloop:item('Eclipse covenant','ring',{power:.08,health:-12},'Borrowed brilliance asks for something in return.',12),
 watchlens:item('Watchstone lens','focus',{ward:8,mana:6},'A watchful eye, held in the off hand. Strengthens Willow Ward.',3,42),
 frostprism:item('Frostgarden prism','focus',{bloom:12,power:.025},'A frozen flower that opens when Wildbloom is cast.',8),
 emberorb:item('Caged emberheart','focus',{lance:.08,regen:-.3},'Makes Aether Lance burn brighter while its cage drinks the flow.',10),
 pocketglass:item('Pocket hourglass','relic',{cooldown:.06},'The sand falls toward the spell you have not cast.',5,70),
 foxidol:item('Nine-tail keepsake','relic',{fox:.2,mana:6},'Your lantern companion remembers the carver’s patient hands.',11),
 thornrelic:item('Briar spiral','relic',{bind:1.2,speed:-.02},'A little of the root stays with whoever binds it.',10),
 fireflylamp:item('Firefly refuge','lantern',{tonic:8,regen:.25},'A quiet traveling light; makes each tonic go a little further.',3,40),
 wardlamp:item('Watchfire cage','lantern',{ward:12,mana:-6},'A flame that stands guard, fed from your aether reserve.',5),
 frostlamp:item('Stillwinter beacon','lantern',{bloom:18,speed:-.015},'The cold light draws Wildbloom farther from the caster.',12),
};
// Bonus rewards accompany the original bounty item. Purchases offer earlier alternatives.
export const EXTRA_REWARDS={
 'briar-road':['duskshroud'],'redleaf-road':['mothhood'],'snowwatch-road':['wardlamp'],
 'cinder-road':['cindermitts'],'canopy-road':['moonspool'],'larder-road':['rimecrown'],
 'crown-road':['eclipseloop'],'road-longbriar':['briargrips'],'road-ambermarch':['dewloop'],
 'road-sunken-cinders':['emberorb'],'road-mossway':['frostprism'],'road-redwood':['rootbuckle'],
 'road-bellwood':['thornrelic'],'road-ash-corridor':['foxidol'],'road-rime-forest':['frostlamp'],
 'road-southern-canopy':['auroraveil'],
};
