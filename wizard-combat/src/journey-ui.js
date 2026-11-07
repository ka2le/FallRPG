import {SPELLS,ACTIONS,CONTROLS,CAMPS,SPECIES} from './data.js';
import {ITEMS,SLOTS,QUESTS,RARITY,itemRarity,itemLevel,statText,characterStats,gearTotals} from './journey.js';
import {COURTS,WORLD_HALF,terrain,courtAt,pathDistance} from './landscape.js';
import {itemIcon,slotIcon} from './art/items.js';
import {spellIcon} from './art/spells.js';
import {paperdoll} from './art/figure.js';
import {MONSTER_ART} from './monsters/index.js';
import {mountSvg,svgMarkup,restPose,STATE} from './monsters/rig.js';
import {HABITATS} from './habitats.js';

const $=s=>document.querySelector(s);
const el=(tag,cls,html='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.innerHTML=html;return n;};
const fmt=(n,d=0)=>Number(n).toFixed(d).replace(/\.0+$/,'');
const pct=n=>`${Math.round(n*100)}%`;
const slotName=slot=>SLOTS.find(s=>s[0]===slot)[1];

// Where each equipment slot sits around the paper doll, and the body point it connects to.
const DOLL={head:[188,0,220,112],charm:[318,120,222,190],robe:[58,170,196,250],focus:[58,276,164,246],weapon:[318,250,282,236],boots:[188,452,220,420]};
// Spell tiers for the spellbook tree.
const TIERS=[...new Set(SPELLS.map(s=>s.level))].sort((a,b)=>a-b);
const ROMAN=['','I','II','III','IV','V','VI','VII','VIII','IX','X'];

export class JourneyUI{
  constructor(game,onChange){
    this.game=game;this.onChange=onChange;this.tab='spells';this.preview=null;this.beast=null;this.mapBackground=null;
    this.tip=$('#tip');this.dialog=$('#book');
    document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>this.show(b.dataset.page));
    // One tooltip for the whole codex: elements provide content through `_tip` or `data-tip`.
    this.dialog.addEventListener('pointermove',e=>this.hover(e));this.dialog.addEventListener('pointerleave',()=>this.hideTip());
    this.dialog.addEventListener('close',()=>{this.hideTip();this.stopStage();});
    this.setupDrag();this.render();
  }
  show(tab){this.tab=tab;document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===tab));document.querySelectorAll('.journey-page').forEach(p=>p.hidden=p.id!==`page-${tab}`);this.hideTip();this.render();}
  render(){const g=this.game;
    if(this.tab!=='bestiary')this.stopStage();
    const k=$('#knowledge');k.innerHTML=g.knowledge?Array.from({length:Math.min(g.knowledge,6)},()=>'<i></i>').join('')+(g.knowledge>6?`<b>${g.knowledge}</b>`:''):'';k._tip=()=>`<h4>Spell knowledge · ${g.knowledge}</h4><p>One per level. Spend it in the spellbook.</p>`;
    $('[data-page="spells"]').classList.toggle('alert',g.knowledge>0&&SPELLS.some((s,i)=>s.level<=g.level&&!g.known.has(Object.keys(ACTIONS).find(a=>ACTIONS[a]===i))));
    $('[data-page="journal"]').classList.toggle('alert',QUESTS.some(q=>g.questAvailable(q)&&!g.claimed.has(q.id)&&g.questProgress(q)>=q.need));
    if(this.tab==='spells')this.spells();if(this.tab==='equipment')this.equipment();if(this.tab==='journal')this.journal();if(this.tab==='map')this.map();if(this.tab==='bestiary')this.bestiary();
  }

  // ---------- tooltip ----------
  hover(e){if(this.drag?.active)return;const t=e.target.closest('[data-tip],.tipped');if(!t){this.hideTip();this.setPreview(null);return;}
    const html=t._tip?t._tip():`<p class="tip-line">${t.dataset.tip}</p>`;if(!html){this.hideTip();return;}
    if(this.tipFor!==t){this.tipFor=t;this.tip.innerHTML=html;this.tip.hidden=false;this.setPreview(t.dataset.item&&!t.dataset.slot?t.dataset.item:null);}
    const r=this.tip.getBoundingClientRect(),x=e.clientX+18,y=e.clientY+16;
    this.tip.style.transform=`translate(${Math.min(x,innerWidth-r.width-8)}px,${Math.min(y,innerHeight-r.height-8)}px)`;}
  hideTip(){this.tip.hidden=true;this.tipFor=null;}

  // ---------- spellbook ----------
  spells(){const g=this.game,tree=$('#spell-tree'),power=g.stats().power;tree.replaceChildren();
    for(const level of TIERS){const col=el('div',`tier ${g.level>=level?'open':''}`,`<span class="tier-level">${ROMAN[level]}</span>`);
      for(const control of CONTROLS){const i=ACTIONS[control.action],s=SPELLS[i];if(s.level!==level)continue;
        const known=g.known.has(control.action),reached=g.level>=s.level,learnable=!known&&reached&&g.knowledge>0;
        const node=el('button',`spell-node tipped ${known?'known':learnable?'learnable':reached?'reached':'locked'}`,`${spellIcon(i)}<kbd>${control.key}</kbd>${!reached?`<span class="lock">${s.level}</span>`:''}`);
        node.style.setProperty('--spell',s.color);node._tip=()=>this.spellTip(i,control,power,{known,learnable,reached});
        node.onclick=()=>{if(learnable&&g.learn(control.action)){this.render();this.onChange();this.tipFor=null;}};col.append(node);}
      tree.append(col);}
    const respec=$('#respec'),home=Math.hypot(g.player.x,g.player.z)<=22;respec.disabled=!home||g.known.size<2;respec._tip=()=>`<h4>Relearn</h4><p>Refund ${g.known.size-1} spent knowledge.</p><p class="${home?'ok':'warn'}">${home?'Click to reset':'Only at the Hearth'}</p>`;
    respec.onclick=()=>{if(g.respec()){this.render();this.onChange();}};
  }
  spellTip(i,control,power,state){const s=SPELLS[i],rows=[],c=this.game.stats();
    const row=(label,value)=>rows.push(`<div class="tip-stat"><span>${label}</span><b>${value}</b></div>`);
    if(s.id==='fire'){row('Damage',fmt(c.fire,1));row('Per second',fmt(c.fireDps));row('Burn',`${fmt(c.burn,1)} / s`);row('Fire rate',`${fmt(1/s.rate,1)} / s`);}
    if(s.id==='frostburst'){row('Damage',`${fmt(c.frost)} → ${fmt(c.frost/2)}`);row('Radius',`${c.radius} m`);row('Slow','2.5 s');}
    if(s.id==='drain'){row('Drain',`${fmt(c.siphon,1)} / s`);row('Heals',pct(c.siphonHeal));row('Channel',`${s.duration} s`);}
    if(s.id==='bind'){row('Root',`${fmt(c.bind,1)} s`);row('Heavy targets',`${fmt(3.5+(this.game.gear.bind||0),1)} s`);}
    if(s.id==='shield'){row('Blocks','6 shots');row('Lasts','5 s');}
    if(s.id==='shockwave'){row('Radius',`${s.range} m`);row('Stagger','2.4 s');}
    if(s.id==='blink')row('Distance',`${s.range} m`);
    if(s.id==='companion'){row('Bite',`${fmt(6*power,1)} / 0.9 s`);row('Lasts',`${s.duration} s`);}
    if(s.id==='haste'){row('Move','+30%');row('Fire rate','+20%');row('Lasts',`${s.duration} s`);}
    if(s.id==='renew'){row('Heals','2 / s');row('Total',`${2*s.duration}`);}
    if(s.id==='recall')row('Channel','3 s');
    if(s.range&&!['shockwave','blink'].includes(s.id))row('Range',`${s.range} m`);
    const hint=state.known?'<p class="ok">Learned</p>':state.learnable?'<p class="gold">Click to learn · 1 ✧</p>':state.reached?'<p class="warn">Needs 1 ✧</p>':`<p class="warn">Unlocks at level ${s.level}</p>`;
    return `<h4 style="color:${s.color}">${s.name}</h4><p class="tip-sub"><kbd>${control.key}</kbd> ${s.cost?`${s.cost} mana`:'Free'} · ${s.rate}s cooldown</p>${rows.join('')}<p class="tip-desc">${s.detail}</p>${hint}`;}

  // ---------- inventory ----------
  equipment(){const g=this.game,doll=$('#paperdoll'),pack=$('#pack-grid');
    doll.querySelector('.doll-figure').innerHTML=paperdoll(g.equipment);
    const lines=doll.querySelector('.doll-lines');lines.innerHTML=Object.entries(DOLL).map(([slot,[x,y,ax,ay]])=>`<path class="${g.equipment[slot]?'on':''}" d="M${x+32},${y+32} L${ax},${ay}"/><circle cx="${ax}" cy="${ay}" r="2.5" class="${g.equipment[slot]?'on':''}"/>`).join('');
    doll.querySelectorAll('.slot').forEach(n=>n.remove());
    for(const [slot] of SLOTS){const id=g.equipment[slot],[x,y]=DOLL[slot],n=el('button',`slot item-slot ${id?'filled r'+itemRarity(id):''}`,id?itemIcon(id):`<span class="ghost">${slotIcon(slot)}</span>`);
      n.style.left=`${x}px`;n.style.top=`${y}px`;n.dataset.slot=slot;if(id)n.dataset.item=id;n.classList.add('tipped');
      n._tip=()=>id?this.itemTip(id,{equipped:true}):`<h4>${slotName(slot)}</h4><p class="tip-sub">Empty</p>`;doll.append(n);}
    pack.replaceChildren();const bag=g.inventory.filter(id=>g.equipment[ITEMS[id].slot]!==id);
    for(let i=0;i<Math.max(20,Math.ceil(bag.length/4)*4);i++){const id=bag[i],n=el('button',`cell item-slot ${id?'filled r'+itemRarity(id):''}`,id?itemIcon(id):'');
      if(id){n.dataset.item=id;n.classList.add('tipped');n._tip=()=>this.itemTip(id,{});}else n.disabled=true;pack.append(n);}
    this.statSheet();
  }
  itemTip(id,{equipped}){const it=ITEMS[id],r=RARITY[itemRarity(id)],g=this.game,worn=g.equipment[it.slot],cur=worn&&worn!==id?ITEMS[worn].stats:{};
    const keys=[...new Set([...Object.keys(it.stats),...(equipped?[]:Object.keys(cur))])];
    const lines=keys.map(k=>{const v=it.stats[k]||0,d=v-(cur[k]||0),compare=!equipped&&worn&&worn!==id&&d;
      return `<div class="tip-stat ${v?'':'lost'}"><span>${statText(k,v||-cur[k])}</span>${compare?`<b class="${d>0?'up':'down'}">${d>0?'▲':'▼'}</b>`:''}</div>`;}).join('');
    return `<div class="tip-item"><div class="tip-icon r${itemRarity(id)}">${itemIcon(id)}</div><div><h4 style="color:${r.color}">${it.name}</h4><p class="tip-sub">${r.name} ${slotName(it.slot).toLowerCase()} · item level ${itemLevel(id)}</p></div></div>
      ${lines||'<p class="tip-sub">No bonuses</p>'}<p class="tip-desc">${it.lore||''}</p>
      ${equipped?'<p class="hint">Click or drag to the satchel to remove</p>':`${worn&&worn!==id?`<p class="tip-sub">Replaces ${ITEMS[worn].name}</p>`:''}<p class="hint">Click to equip · drag to the ${slotName(it.slot).toLowerCase()} slot</p>`}`;}
  setPreview(id){if(this.preview===id)return;this.preview=id;if(this.tab==='equipment')this.statSheet();}
  statSheet(){const g=this.game,base=g.stats(),eq={...g.equipment};if(this.preview)eq[ITEMS[this.preview].slot]=this.preview;
    const next=this.preview?characterStats(g.level,gearTotals(eq)):base;
    const row=(key,icon,label,f,lowerBetter=false)=>{const a=f(base),b=f(next),d=b.n-a.n;
      return `<div class="stat ${d?(d>0)!==lowerBetter?'up':'down':''}"><i>${icon}</i><span>${label}</span><b>${b.text}</b>${d?`<em>${d>0?'+':'−'}${b.unit==='%'?Math.round(Math.abs(d)*100):fmt(Math.abs(d),b.digits)}${b.unit==='%'?'%':''}</em>`:''}</div>`;};
    const v=(n,text,digits=0,unit='')=>({n,text,digits,unit});
    $('#char-stats').innerHTML=`
      <div class="char-level"><b>${g.level}</b><div><span class="xp-bar"><i style="width:${Math.min(100,g.xp/g.xpNeeded()*100)}%"></i></span><small>${Math.floor(g.xp)} / ${g.xpNeeded()} xp</small></div></div>
      ${row('hp','<svg viewBox="0 0 16 16"><path d="M8 14 2 8a3.3 3.3 0 0 1 6-4 3.3 3.3 0 0 1 6 4Z" fill="#e2a38b"/></svg>','Health',s=>v(s.hp,fmt(s.hp)))}
      ${row('mana','<svg viewBox="0 0 16 16"><path d="M8 1 13 8 8 15 3 8Z" fill="#b9b3ed"/></svg>','Mana',s=>v(s.mana,fmt(s.mana)))}
      ${row('regen','<svg viewBox="0 0 16 16"><path d="M8 2v9M4 7l4 4 4-4" stroke="#b9b3ed" stroke-width="2" fill="none" transform="rotate(180 8 8)"/></svg>','Mana / sec',s=>v(s.regen,fmt(s.regen)))}
      <hr>
      ${row('power','<svg viewBox="0 0 16 16"><path d="M8 1l1.8 5.2L15 8l-5.2 1.8L8 15l-1.8-5.2L1 8l5.2-1.8Z" fill="#ffd28c"/></svg>','Spell power',s=>v(s.power,pct(s.power),0,'%'))}
      ${row('fire',`<span class="mini">${spellIcon(0)}</span>`,'Firebolt',s=>v(s.fire,fmt(s.fire,1),1))}
      ${row('dps',`<span class="mini">${spellIcon(0)}</span>`,'Fire / sec',s=>v(s.fireDps,fmt(s.fireDps)))}
      ${g.known.has('frostburst')||this.preview&&ITEMS[this.preview].stats.area?row('frost',`<span class="mini">${spellIcon(5)}</span>`,'Frostburst',s=>v(s.frost,`${fmt(s.frost)} · ${s.radius} m`)):''}
      ${g.known.has('drain')||this.preview&&ITEMS[this.preview].stats.siphon?row('siph',`<span class="mini">${spellIcon(4)}</span>`,'Siphon heal',s=>v(s.siphonHeal,pct(s.siphonHeal),0,'%')):''}
      ${g.known.has('bind')||this.preview&&ITEMS[this.preview].stats.bind?row('bind',`<span class="mini">${spellIcon(1)}</span>`,'Bind',s=>v(s.bind,`${fmt(s.bind,1)} s`,1)):''}
      <hr>
      ${row('armor','<svg viewBox="0 0 16 16"><path d="M8 1l6 2.5c0 6-3 9.5-6 11.5C5 13 2 9.5 2 3.5Z" fill="#a8b8c8"/></svg>','Damage reduction',s=>v(s.armor,pct(s.armor),0,'%'))}
      ${row('move','<svg viewBox="0 0 16 16"><path d="M2 9h8M4 5h9M5 13h6" stroke="#cfe6c6" stroke-width="2" stroke-linecap="round"/></svg>','Move speed',s=>v(s.move,`${fmt(s.move,1)} m/s`,1))}`;
  }
  setupDrag(){
    const dlg=this.dialog,ghost=$('#drag-ghost');
    dlg.addEventListener('pointerdown',e=>{const n=e.target.closest('.item-slot.filled');if(!n||e.button!==0||this.tab!=='equipment')return;this.drag={n,id:n.dataset.item,fromSlot:n.dataset.slot,x:e.clientX,y:e.clientY,active:false};});
    dlg.addEventListener('pointermove',e=>{const d=this.drag;if(!d)return;
      if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>5){d.active=true;this.hideTip();ghost.innerHTML=itemIcon(d.id);ghost.hidden=false;d.n.classList.add('lifted');
        const slot=ITEMS[d.id].slot;dlg.querySelectorAll('.slot').forEach(s=>s.classList.toggle(d.fromSlot?'dim':s.dataset.slot===slot?'drop-ok':'dim',true));if(d.fromSlot)$('#pack-grid').classList.add('drop-ok');}
      if(d.active){ghost.style.transform=`translate(${e.clientX-30}px,${e.clientY-30}px)`;const over=document.elementFromPoint(e.clientX,e.clientY);dlg.querySelectorAll('.hot').forEach(h=>h.classList.remove('hot'));over?.closest('.drop-ok')?.classList.add('hot');}});
    const end=e=>{const d=this.drag;if(!d)return;this.drag=null;ghost.hidden=true;dlg.querySelectorAll('.drop-ok,.dim,.hot,.lifted').forEach(s=>s.classList.remove('drop-ok','dim','hot','lifted'));
      const g=this.game;let changed=false;
      if(!d.active){if(d.fromSlot)changed=g.unequip(d.fromSlot);else changed=g.equip(d.id);}
      else{const over=document.elementFromPoint(e.clientX,e.clientY);
        if(d.fromSlot&&over?.closest('#pack-grid'))changed=g.unequip(d.fromSlot);
        else if(!d.fromSlot&&over?.closest('.slot')?.dataset.slot===ITEMS[d.id].slot)changed=g.equip(d.id);}
      if(changed){this.preview=null;this.tipFor=null;this.equipment();this.onChange();this.dialog.dispatchEvent(new CustomEvent('equip'));}};
    dlg.addEventListener('pointerup',end);dlg.addEventListener('pointercancel',()=>{this.drag=null;ghost.hidden=true;});
  }

  // ---------- journal ----------
  journal(){const g=this.game,list=$('#quest-list');list.replaceChildren();
    const order=[...QUESTS].sort((a,b)=>(g.claimed.has(a.id)-g.claimed.has(b.id))||(!g.questAvailable(a)-!g.questAvailable(b)));
    for(const q of order){const available=g.questAvailable(q),done=g.claimed.has(q.id),progress=g.questProgress(q),ready=available&&!done&&progress>=q.need;
      const row=el('div',`quest ${done?'done':''} ${!available?'locked':''} ${ready?'ready':''} tipped`,`
        <span class="quest-mark">${done?'<svg viewBox="0 0 16 16"><path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>':available?'<i></i>':'<svg viewBox="0 0 16 16"><rect x="3.5" y="7" width="9" height="7" rx="1" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>'}</span>
        <b>${q.name}</b>
        <span class="quest-progress"><span class="bar"><i style="width:${progress/q.need*100}%"></i></span><small>${progress}/${q.need}</small></span>
        <span class="quest-reward">${q.xp}<small>xp</small>${q.knowledge?` <span class="kn">${'<i></i>'.repeat(q.knowledge)}</span>`:''}</span>
        ${ready?'<button class="claim">Claim</button>':''}`);
      row._tip=()=>`<h4>${q.name}</h4><p class="tip-desc">${q.detail}</p><div class="tip-stat"><span>Progress</span><b>${progress} / ${q.need}</b></div><div class="tip-stat"><span>Reward</span><b>${q.xp} xp${q.knowledge?` · ${q.knowledge} ✧`:''}</b></div>${!available?'<p class="warn">Finish the previous quest first</p>':''}`;
      row.querySelector('.claim')?.addEventListener('click',()=>{g.claimQuest(q.id);this.render();this.onChange();});list.append(row);}
  }

  // ---------- map ----------
  map(){const g=this.game,canvas=$('#world-map'),ctx=canvas.getContext('2d'),size=640,scale=size/(WORLD_HALF*2),c=size/2;canvas.width=canvas.height=size;
    if(!this.mapBackground){const bg=document.createElement('canvas');bg.width=bg.height=size;const m=bg.getContext('2d');
      const raw=document.createElement('canvas');raw.width=raw.height=size;const r=raw.getContext('2d');for(let z=0;z<size;z+=2)for(let x=0;x<size;x+=2){const wx=(x-c)/scale,wz=(z-c)/scale;r.fillStyle=COURTS[courtAt(wx,wz)].ground;r.globalAlpha=.7+Math.min(.3,terrain(wx,wz)/50);r.fillRect(x,z,2,2);if(pathDistance(wx,wz)<4.5){r.globalAlpha=.5;r.fillStyle='#ece2bd';r.fillRect(x,z,2,2);}}
      m.filter='blur(1.2px)';m.drawImage(raw,0,0);m.filter='none';
      m.globalAlpha=1;const v=m.createRadialGradient(c,c,size*.3,c,c,size*.72);v.addColorStop(0,'#0000');v.addColorStop(1,'#0b1210ee');m.fillStyle=v;m.fillRect(0,0,size,size);this.mapBackground=bg;}
    ctx.drawImage(this.mapBackground,0,0);ctx.textAlign='center';
    ctx.font='italic 20px "Cormorant Garamond", Georgia';ctx.fillStyle='#f2ecd4aa';for(const [i,court] of COURTS.entries()){const x=i===0||i===3?c-180:c+180,y=i<2?c-200:c+210;ctx.fillText(court.name,x,y);}
    ctx.fillStyle='#ffe8b0';ctx.shadowColor='#ffcf70';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(c,c,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    this.mapMarks=[];
    for(const h of HABITATS){const found=g.habitats.has(h.id),x=c+h.x*scale,y=c+h.z*scale;ctx.strokeStyle=found?h.color:'#b5c5a966';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,h.r*scale,0,Math.PI*2);ctx.stroke();ctx.fillStyle=found?h.color:'#b5c5a988';ctx.font='11px Georgia';ctx.fillText(found?h.name:'?',x,y-h.r*scale-5);this.mapMarks.push({habitat:h,x,y,found});}
    for(const [i,camp] of CAMPS.entries()){const found=g.discovered.has(i),done=g.cleared.has(i),x=c+camp.x*scale,y=c+camp.z*scale;this.mapMarks.push({i,x,y,found,done});
      if(!found){ctx.fillStyle='#0e1a1688';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();continue;}
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle=done?'#e3cf8e':'#14201d';ctx.strokeStyle=done?'#5b4a24':'#e9dcb0';ctx.lineWidth=2;ctx.fillRect(-7,-7,14,14);ctx.strokeRect(-7,-7,14,14);ctx.restore();
      ctx.font='600 10px Inter, sans-serif';ctx.fillStyle=done?'#2a2010':'#f4ead0';ctx.fillText(done?'✓':String(camp.level),x,y+3.5);}
    const p=g.player,x=c+p.x*scale,y=c+p.z*scale;ctx.save();ctx.translate(x,y);ctx.rotate(-p.yaw);ctx.fillStyle='#ffffff';ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,3);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();
    canvas._tip=()=>{const m=this.mapHover;if(!m)return '';if(m.habitat)return m.found?`<h4>${m.habitat.name}</h4><p class="tip-desc">${m.habitat.detail}</p>`:'<p class="tip-sub">An unexplored living habitat</p>';const camp=CAMPS[m.i];if(!m.found)return '<p class="tip-sub">Undiscovered</p>';
      const counts={};camp.types.forEach(t=>counts[t]=(counts[t]||0)+1);
      return `<h4>${camp.name}</h4><p class="tip-sub">Level ${camp.level} · ${m.done?'Cleared':'Hostile'}</p><div class="tip-foes">${Object.entries(counts).map(([t,n])=>`<span>${this.portrait(t,'tiny')}<b>${n>1?n+'×':''}</b></span>`).join('')}</div>
        ${camp.reward?`<div class="tip-reward ${m.done?'claimed':''}"><span class="tip-icon r${itemRarity(camp.reward)}">${itemIcon(camp.reward)}</span><span>${ITEMS[camp.reward].name}</span></div>`:''}`;};
    canvas.onpointermove=e=>{const r=canvas.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*size,my=(e.clientY-r.top)/r.height*size;const hit=this.mapMarks.filter(m=>Math.hypot(m.x-mx,m.y-my)<12).sort((a,b)=>Math.hypot(a.x-mx,a.y-my)-Math.hypot(b.x-mx,b.y-my))[0]||null;
      if(hit!==this.mapHover){this.mapHover=hit;this.tipFor=null;}canvas.classList.toggle('tipped',!!hit);};
  }

  // ---------- bestiary ----------
  portrait(type,cls=''){const art=MONSTER_ART[type];return art?`<span class="portrait ${cls}">${svgMarkup(art,restPose(art))}</span>`:`<span class="portrait emoji ${cls}">${SPECIES[type].emoji}</span>`;}
  seenTypes(){const g=this.game,seen=new Set();for(const i of g.discovered)CAMPS[i].types.forEach(t=>seen.add(t));for(const h of HABITATS)if(g.habitats.has(h.id))h.types.forEach(t=>seen.add(t));for(const t of Object.keys(g.killTypes))seen.add(t);return seen;}
  bestiary(){const g=this.game,seen=this.seenTypes(),grid=$('#beast-grid');if(!this.beast||!seen.has(this.beast))this.beast=[...seen][0];grid.replaceChildren();
    for(const type of Object.keys(SPECIES)){const known=seen.has(type),n=el('button',`beast ${known?'':'unknown'} ${type===this.beast?'active':''}`,known?this.portrait(type):'<span class="portrait emoji">?</span>');
      n.setAttribute('aria-label',known?SPECIES[type].name:'Undiscovered creature');n.setAttribute('aria-pressed',String(type===this.beast));
      if(known){n.onclick=()=>{this.beast=type;this.bestiary();};n.classList.add('tipped');n._tip=()=>`<h4>${SPECIES[type].name}</h4><p class="tip-sub">${g.killTypes[type]||0} defeated</p>`;}grid.append(n);}
    this.beastDetail();}
  beastDetail(){const type=this.beast,box=$('#beast-stage'),info=$('#beast-info');if(!type){box.innerHTML='';info.innerHTML='';return;}
    const s=SPECIES[type],levels=[...CAMPS.filter(c=>c.types.includes(type)),...HABITATS.filter(h=>h.types.includes(type))].map(c=>c.level),lv=Math.min(...levels),hp=Math.round(s.hp*(1+(lv-1)*.1)),dmg=s.damage*(1+(lv-1)*.085),fire=this.game.stats().fire;
    if(this.stageType!==type){this.stopStage();this.stageType=type;const art=MONSTER_ART[type];
      if(art){this.stage=mountSvg(art,box);this.stageState=STATE();this.stageT0=performance.now();const loop=now=>{this.stageRaf=requestAnimationFrame(loop);this.animateStage(art,(now-this.stageT0)/1000);};this.stageRaf=requestAnimationFrame(loop);}
      else box.innerHTML=`<span class="emoji-big">${s.emoji}</span>`;}
    const trait=(on,label)=>on?`<span class="trait">${label}</span>`:'';
    const stat=(label,value)=>`<div class="stat"><span>${label}</span><b>${value}</b></div>`;
    info.innerHTML=`<h3>${s.name}</h3><p class="levels">Level ${[...new Set(levels)].join(', ')}</p>${s.ecology?`<p>${s.ecology}</p><p class="levels">${s.neutral?'Peaceful · defends itself or its nest':'Ambush predator · watch its hooks'}</p>`:''}
      ${stat('Health',`${hp}`)}${stat('Firebolts to defeat',`${Math.ceil(hp/fire)}`)}${stat('Damage',`${fmt(dmg)}${s.burst>1?` × ${s.burst}`:''}`)}${stat('Attack every',`${s.attack} s`)}${stat('Reach',`${s.reach} m`)}${stat('Speed',`${s.speed} m/s`)}${stat('Experience',`${Math.round(s.xp*(1+(lv-1)*.14))}`)}${stat('Defeated',`${this.game.killTypes[type]||0}`)}
      <div class="traits">${trait(s.ranged,'Ranged')}${trait(!s.ranged,'Melee')}${trait(s.dodge,'Dodges')}${trait(s.cover,'Uses cover')}${trait(s.flying,'Flying')}${trait(type==='healer','Heals allies')}${trait(type==='ice','Ice shell')}${trait(type==='ash','Fire resistant')}${trait(['titan','colossus'].includes(type),'Heavy')}</div>`;
  }
  // Demo reel for the selected creature: idle, walk, wind-up and strike, flinch.
  animateStage(art,t){const s=this.stageState,k=t%7.2;Object.assign(s,STATE());s.t=t;s.seed=1;
    if(k>2&&k<4){s.move=Math.min(1,(k-2)*3,(4-k)*3);s.phase=t*(art.stride||3)*4;}
    if(k>4.4&&k<4.9)s.windup=(k-4.4)/.5;if(k>=4.9&&k<5.4)s.attack=1-(k-4.9)/.5;
    if(k>6&&k<6.35)s.hurt=1-(k-6)/.35;if(art.extra?.includes('heal')&&k>6.4&&k<7.2)s.heal=Math.sin((k-6.4)/.8*Math.PI);this.stage.update(s);}
  stopStage(){if(this.stageRaf)cancelAnimationFrame(this.stageRaf);this.stageRaf=null;this.stageType=null;}
}
