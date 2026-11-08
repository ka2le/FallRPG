// Cell indices match the exact prompts in docs/art-prompts.json. Sheets stay intact.
export const GEAR_SPRITE_IDS=[
 'twig','wraps','reedstaff','briarcoat','copperwand','wayboots','mosscharm','amberfocus',
 'wintercoat','cinderstaff','eldercharm','frostboots','crownstaff','relic-longbriar','relic-ambermarch','relic-sunken-cinders',
 'relic-mossway','relic-redwood','relic-bellwood','relic-ash-corridor','relic-rime-forest','relic-southern-canopy','relic-burial-road','relic-winter-pilgrimage',
 'relic-ember-deeps','relic-lastwood','sprigcirclet','mothhood','rimecrown','leafcape','duskshroud','auroraveil',
 'reedgrips','briargrips','cindermitts','herbcord','moonspool','rootbuckle','amberloop','dewloop',
 'eclipseloop','watchlens','frostprism','emberorb','pocketglass','foxidol','thornrelic','fireflylamp',
 'wardlamp','frostlamp','mushroom-hat','antler-circlet','sun-shield','bark-buckler','leaf-dagger','crystal-sword',
 'copper-axe','rune-bow','leather-quiver','fishing-rod','gathering-sickle','mining-pick','travel-satchel','bedroll',
];
const equipmentNames=['Mushroom cap','Antler circlet','Sun shield','Bark buckler','Leaf dagger','Crystal sword','Copper axe','Runic bow','Leather quiver','Fishing rod','Gathering sickle','Mining pick','Traveling satchel','Bedroll'];
const supplyRows=[
 ['Consumables',['Health tonic','Aether flask','Antidote','Honey elixir','Dream draught','Frost phial','Ember oil','Dew vial']],
 ['Food',['Bread loaf','Apple','Pear','Blue berries','Mushroom skewer','Grilled fish','Cheese','Honey jar']],
 ['Herbs',['Herb sprig','Sunpetal','Nightbloom','Snowbell','Grain sheaf','Pale root','Tea leaves','Moss clump']],
 ['Foraging',['Ruby cap','Morel','Witchlight mushroom','Truffle','Acorn','Pinecone','Worldseed','Chestnut']],
 ['Materials',['Mossiron ore','Copper ore','Iron ore','Coal','Amber shard','Blue crystal','Amethyst','Moonstone']],
 ['Spellcraft',['Bronze key','Silver key','Briar key','Bone key','Sealed scroll','Rune scroll','Blue spellbook','Purple grimoire']],
 ['Treasure',['Amber coins','Sun medallion','Moon coin','Wooden chest','Iron strongbox','Trail map','Sealed letter','Field notebook']],
 ['Curios',['Firebird feather','Snow plume','Butterfly wing','Lizard scale','Antler fragment','Tiny skull','Spiral shell','Forest egg']],
];
const key=name=>name.toLowerCase().replaceAll(' ','-');
export const ITEM_SPRITES={
 ...Object.fromEntries(GEAR_SPRITE_IDS.map((id,index)=>[id,{sheet:'items-gear-v1',index,...(index>=50?{name:equipmentNames[index-50],category:'Future equipment'}:{})}])),
 ...Object.fromEntries(supplyRows.flatMap(([category,names],row)=>names.map((name,col)=>[key(name),{sheet:'items-supplies-v1',index:row*8+col,name,category}]))),
};
export const spriteStyle=cell=>`--item-sheet:url('./assets/${cell.sheet}.png');--item-x:${cell.index%8*100/7}%;--item-y:${Math.floor(cell.index/8)*100/7}%`;
export function spriteRect(width,height,index){const col=index%8,row=Math.floor(index/8),x=Math.round(col*width/8),y=Math.round(row*height/8);return {x,y,width:Math.round((col+1)*width/8)-x,height:Math.round((row+1)*height/8)-y};}
export function pixelItem(id,cls=''){
 const cell=ITEM_SPRITES[id];if(!cell)return '';
 return `<span class="art pixel-art ${cls}" aria-hidden="true"><span class="item-sprite" style="${spriteStyle(cell)}"></span></span>`;
}
