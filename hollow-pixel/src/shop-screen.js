// Market: what you carry, supplies, and a grid of gear with price tags.
// Hover shows exact stats against what you wear; pick a tile, then buy or equip it.
import { GEAR } from './adventure.js';
import { itemArt, gicon, SLOT_INFO, EQUIP_SLOT_INFO } from './ui-art.js';
import { pixelItem } from './item-sprites.js';
import { wholeNumber } from './display-numbers.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const coin=(cls='')=>pixelItem('amber-coins',`shop-coin ${cls}`)||gicon('coin');

export function shopStock(game){
  const owned=id=>game.inventory.includes(id);
  return Object.entries(GEAR).filter(([,it])=>it.price).map(([id])=>id)
    .sort((a,b)=>owned(a)-owned(b)||(GEAR[a].level||0)-(GEAR[b].level||0)||GEAR[a].price-GEAR[b].price);
}
export function shopWindow(ui){
  const g=ui.game,p=g.player,stock=shopStock(g);
  if(!stock.includes(ui.shopPick))ui.shopPick=stock.find(id=>!g.inventory.includes(id)&&p.level>=(GEAR[id].level||1)&&p.coins>=GEAR[id].price)||stock.find(id=>!g.inventory.includes(id))||stock[0];
  const pick=ui.shopPick,it=GEAR[pick];
  const tiles=stock.map(id=>{const item=GEAR[id],owned=g.inventory.includes(id),locked=p.level<(item.level||1),poor=!owned&&!locked&&p.coins<item.price;
    return `<button class="tile shop-tile ${owned?'owned':''} ${locked?'locked':''} ${poor?'poor':''} ${id===pick?'picked':''}" data-shop-pick="${id}" data-tip="shop" data-tip-pos="below" data-tip-id="${id}" aria-pressed="${id===pick}" aria-label="${esc(item.name)} · ${owned?'owned':locked?`level ${item.level}`:`${item.price} amber`}">${itemArt(id,item)}${owned?`<i class="worn-mark">${gicon('check')}</i>`:locked?`<i class="shop-lock">Lv ${item.level}</i>`:`<i class="shop-price">${coin()}${item.price}</i>`}</button>`;}).join('');
  let action='';
  if(it){
    const owned=g.inventory.includes(pick),worn=!!g.wornSlot(pick),need=it.price-p.coins;
    if(worn)action=`<span class="shop-state">${gicon('check')}Worn</span>`;
    else if(owned)action=`<button class="primary" data-shop-equip="${pick}">Equip</button>`;
    else if(p.level<(it.level||1))action=`<button class="primary" disabled>Reach level ${it.level}</button>`;
    else if(need>0)action=`<button class="primary" disabled>Need ${coin()}${need} more</button>`;
    else action=`<button class="primary" data-gear-buy="${pick}">Buy ${coin()}${it.price}</button>`;
  }
  const slot=it?EQUIP_SLOT_INFO[g.slotFor(pick)]?.name:'';
  return `<div class="shop-window">
    <div class="shop-top">
      <div class="shop-purse"><span title="Amber">${coin()}<b>${p.coins}</b></span><span title="Herb sprigs">${pixelItem('herb-sprig','shop-ico')}<b>${p.herbs}</b></span><span title="Tonics carried">${pixelItem('health-tonic','shop-ico')}<b>${p.tonics}</b></span></div>
      <span class="shop-links"><button data-menu="equipment" title="Character · I" aria-label="Character">${gicon('bag')}</button><button data-menu="journal" title="Journal · J" aria-label="Journal">${gicon('scroll')}</button></span>
    </div>
    <section class="shop-supply" data-tip-none>
      ${pixelItem('health-tonic','shop-supply-art')}
      <div><b>Wildflower tonic</b><small>Heals <b class="qh qh-num">${wholeNumber(g.stats.tonicHealing)}</b> · 8 s apart</small></div>
      <button data-buy="coins" ${p.coins<12?'disabled':''} aria-label="Buy a tonic for 12 amber">${coin()}12</button>
      <button data-buy="herbs" ${p.herbs<3?'disabled':''} aria-label="Trade 3 sprigs for a tonic">${pixelItem('herb-sprig','shop-ico')}3</button>
    </section>
    <div class="shop-grid">${tiles}</div>
    ${it?`<div class="shop-bar">${itemArt(pick,it,'shop-bar-art')}<div><b>${esc(it.name)}</b><small>${SLOT_INFO[it.slot].name} · ${slot}</small></div>${action}</div>`:''}
  </div>`;
}
