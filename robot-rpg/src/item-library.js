import { ITEM_SPRITES,pixelItem,spriteRect } from './item-sprites.js';
import { GEAR } from './adventure.js';
import { SLOT_INFO,GEAR_STAT } from './ui-art.js';
import './item-library.css';
const $=s=>document.querySelector(s),images=new Map();
const entries=Object.entries(ITEM_SPRITES).map(([id,cell])=>({id,...cell,name:GEAR[id]?.name||cell.name,category:GEAR[id]?SLOT_INFO[GEAR[id].slot].name:cell.category,status:GEAR[id]?'Collectible gear':['health-tonic','amber-coins'].includes(id)?'In use':'Future asset'}));
for(const type of new Set(entries.map(it=>it.category))){const option=document.createElement('option');option.textContent=type;$('#category').append(option);}
async function download(item){
 let img=images.get(item.sheet);if(!img){img=new Image();img.src=`${import.meta.env.BASE_URL}assets/${item.sheet}.png`;images.set(item.sheet,img);}await img.decode();
 const c=document.createElement('canvas'),r=spriteRect(img.naturalWidth,img.naturalHeight,item.index);c.width=r.width;c.height=r.height;
 const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(img,r.x,r.y,r.width,r.height,0,0,r.width,r.height);
 const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png')),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${item.id}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function render(){const search=$('#search').value.toLowerCase().trim(),status=$('#collection').value,category=$('#category').value;
 const found=entries.filter(it=>(!status||it.status===status)&&(!category||it.category===category)&&`${it.name} ${it.id} ${it.category}`.toLowerCase().includes(search));
 $('#count').textContent=`${found.length} drawings shown`;$('#library').replaceChildren();
 for(const it of found){const b=document.createElement('button');b.className='item';b.dataset.sprite=it.id;b.setAttribute('aria-label',`Download ${it.name}`);const gear=GEAR[it.id];
  b.innerHTML=`<div class="drawing">${pixelItem(it.id)}</div><span class="tag ${gear?'live':''}">${it.status}</span><h2>${it.name}</h2><p>${it.category}</p><small>${gear?Object.entries(gear.stats).map(([k,v])=>GEAR_STAT[k]?.text(v)||'').join(' · ')||'A humble beginning':'Prepared for the journey'}</small><code>${it.id}</code>`;
  b.onclick=()=>download(it).catch(()=>$('#count').textContent='Download unavailable. Use the source atlases below.');$('#library').append(b);}
 if(!found.length)$('#library').textContent='No drawings match. Try another search or collection.';
}
for(const id of ['search','collection','category'])$(`#${id}`).addEventListener('input',render);
$('#scale').addEventListener('change',()=>$('#library').style.setProperty('--size',`${$('#scale').value}px`));render();
