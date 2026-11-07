import { WORLD_BOUNDS, FRONTIER_DISTRICTS, FRONTIER_LOOPS, FRONTIER_HABITATS, frontierAt } from './frontier.js';

// Local landscapes are a few screens across, independent of bounty territories.
// Jittered Voronoi seeds and warped sampling avoid rectangular tiles or stripes.
export const LANDSCAPE_SPACING=680;
const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const seasons=['spring','autumn','winter','ember'];
export const LANDSCAPE_STYLES={
  spring:[{kind:'deep-grove',cover:1.1,families:['canopy','hollowhost','giftwillow']},{kind:'flower-meadow',cover:.18,families:['blossom','giftwillow']},{kind:'reed-marsh',cover:.3,families:['giftwillow','bellroot'],water:true},{kind:'stone-rise',cover:.5,families:['bellroot','hollowhost']}],
  autumn:[{kind:'amber-grove',cover:1.1,families:['amberoak','sourheart']},{kind:'fern-glade',cover:.2,families:['amberoak']},{kind:'mire-garden',cover:.3,families:['burial','sourheart'],water:true},{kind:'burial-mounds',cover:.5,families:['burial']}],
  winter:[{kind:'fir-thicket',cover:1.1,families:['snowfir']},{kind:'snowfield',cover:.16,families:['frostwood']},{kind:'ice-pools',cover:.28,families:['frostwood'],water:true},{kind:'frost-ridge',cover:.48,families:['snowfir','frostwood']}],
  ember:[{kind:'charred-grove',cover:1.05,families:['embertree']},{kind:'ash-meadow',cover:.18,families:['embertree']},{kind:'meltwater-garden',cover:.28,families:['embertree'],water:true},{kind:'basalt-rise',cover:.48,families:['vent','embertree'],lava:true}],
};
const groundTints={
  'deep-grove':['#294b3c',.3],'flower-meadow':['#a3af66',.38],'reed-marsh':['#426f67',.38],'stone-rise':['#a19b80',.45],
  'amber-grove':['#584430',.28],'fern-glade':['#ada463',.32],'mire-garden':['#536e62',.4],'burial-mounds':['#77745a',.3],
  'fir-thicket':['#699caa',.3],'snowfield':['#f0f1df',.35],'ice-pools':['#78b4c3',.4],'frost-ridge':['#8f9ea6',.35],
  'charred-grove':['#2f373d',.38],'ash-meadow':['#a59b83',.43],'meltwater-garden':['#557f76',.4],'basalt-rise':['#323f50',.4],
};
export function landscapeGroundColor(base,kind){
  const tint=groundTints[kind];if(!tint)return base;
  const a=parseInt(base.slice(1),16),b=parseInt(tint[0].slice(1),16),t=tint[1];
  const channel=shift=>Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t);
  return '#'+((channel(16)<<16)|(channel(8)<<8)|channel(0)).toString(16).padStart(6,'0');
}
const seeds=new Map();
const protectedLandscapes=new WeakMap();
export const FRONTIER_LANDSCAPES=[];
for(let gy=Math.floor(WORLD_BOUNDS.minY/LANDSCAPE_SPACING)-1;gy<=Math.ceil(WORLD_BOUNDS.maxY/LANDSCAPE_SPACING)+1;gy++)for(let gx=Math.floor(WORLD_BOUNDS.minX/LANDSCAPE_SPACING)-1;gx<=Math.ceil(WORLD_BOUNDS.maxX/LANDSCAPE_SPACING)+1;gx++){
  const x=(gx+.18+hash(gx,gy)*.64)*LANDSCAPE_SPACING,y=(gy+.18+hash(gx+71,gy-13)*.64)*LANDSCAPE_SPACING;
  const district=frontierAt(x,y),choice=hash(gx-43,gy+91);let biome=choice<.43?district.biome:seasons[Math.floor(hash(gx+139,gy+47)*4)];
  // Do not let adjacent seeds accidentally rebuild a multi-kilometre domain.
  if((seeds.get(gx-1+gy*128)?.biome===biome&&seeds.get(gx-2+gy*128)?.biome===biome)||(seeds.get(gx+(gy-1)*128)?.biome===biome&&seeds.get(gx+(gy-2)*128)?.biome===biome)){
    const alternatives=seasons.filter(b=>b!==biome);biome=alternatives[Math.floor(hash(gx+211,gy-83)*3)];
  }
  const styleIndex=Math.floor(hash(gx-19,gy-73)*4),style=LANDSCAPE_STYLES[biome][styleIndex];
  const site={id:`landscape-${gx}-${gy}`,x,y,biome,...style,radius:105+hash(gx+5,gy)*70,phase:hash(gx,gy+7)*Math.PI*2};
  seeds.set(gx+gy*128,site);FRONTIER_LANDSCAPES.push(site);
  protectedLandscapes.set(site,Object.fromEntries(seasons.map(b=>[b,{...site,...LANDSCAPE_STYLES[b][style.water||style.lava?1:styleIndex],biome:b,water:false,lava:false,authored:true}])));
}

// Keep the actual hunting grounds, refuge buildings and migrating hedges in
// their authored habitats, without preserving a huge uniform disk around town.
const anchors=FRONTIER_DISTRICTS.flatMap((d,index)=>[
  {...d,radius:85},{...d.hub,biome:d.biome,radius:235},...d.camps.map(c=>({...c,biome:d.biome,radius:195})),
  ...(d.biome==='spring'?[2,4,6].flatMap(segment=>{
    const path=FRONTIER_LOOPS[index],a=path[segment-1],b=path[segment];
    return [.3,.7].map(t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,biome:d.biome,radius:440}));
  }):[]),
  ...FRONTIER_HABITATS.filter(s=>s.district===d.id).map(s=>({...s,radius:s.radius+110})),
]);
const anchorIndex=new Map(),ANCHOR_CELL=512;
for(const a of anchors)for(let gx=Math.floor((a.x-a.radius)/ANCHOR_CELL);gx<=Math.floor((a.x+a.radius)/ANCHOR_CELL);gx++)for(let gy=Math.floor((a.y-a.radius)/ANCHOR_CELL);gy<=Math.floor((a.y+a.radius)/ANCHOR_CELL);gy++){
  const key=`${gx},${gy}`;if(!anchorIndex.has(key))anchorIndex.set(key,[]);anchorIndex.get(key).push(a);
}
export function frontierLandscapeAt(x,y){
  const wx=x+Math.sin(y*.005)*130+Math.sin(y*.017)*27+Math.sin((x+y)*.008)*45;
  const wy=y+Math.sin(x*.006)*125+Math.sin((y-x)*.012)*32;
  const gx=Math.floor(wx/LANDSCAPE_SPACING),gy=Math.floor(wy/LANDSCAPE_SPACING);let nearest=null,best=Infinity;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const s=seeds.get(gx+dx+(gy+dy)*128);if(!s)continue;
    const d=(wx-s.x)**2+(wy-s.y)**2;if(d<best){best=d;nearest=s;}
  }
  if(!nearest)return null;
  for(const a of anchorIndex.get(`${Math.floor(x/ANCHOR_CELL)},${Math.floor(y/ANCHOR_CELL)}`)||[])if((x-a.x)**2+(y-a.y)**2<a.radius**2){
    // Retain local woodland/glade variation even inside an authored season.
    return protectedLandscapes.get(nearest)[a.biome];
  }
  return nearest;
}

export function landscapePoolAt(x,y,site){
  if(!site||site.authored)return false;
  const dx=x-site.x,dy=y-site.y,c=Math.cos(site.phase),s=Math.sin(site.phase),u=dx*c+dy*s,v=-dx*s+dy*c;
  return (u/(site.radius*1.35))**2+(v/(site.radius*.72))**2<1+Math.sin(u*.034+site.phase)*.12;
}
