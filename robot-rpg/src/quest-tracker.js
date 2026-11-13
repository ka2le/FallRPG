// HUD quest tracker: the current goal in highlighted words, a compass arrow to it,
// and clear feedback the moment a kill, camp or quest moves forward.
import { questList, knownQuests, trackedQuest, currentStep, questMarkers } from './quests.js';
import { gicon } from './ui-art.js';

const KEY='robot-rpg-tracked-quest';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Drawn pointing straight up; rotated to face the goal on screen.
const arrow='<svg class="qt-arrow" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2L26 17H20V29H12V17H6Z" fill="currentColor" stroke="#1a2a1f" stroke-width="1.8" stroke-linejoin="round"/></svg><i class="qt-here" aria-hidden="true"></i>';

export class QuestTracker{
  constructor(ui){
    this.ui=ui;this.game=ui.game;this.list=[];this.markers={givers:new Map(),mobs:new Set()};this.prev=null;this.states=null;this.sig='';this.until=0;
    try{this.preferred=localStorage.getItem(KEY)||null;}catch{this.preferred=null;}
    document.querySelector('.hud').insertAdjacentHTML('beforeend','<div id="quest-pop" class="quest-pop" role="status" aria-live="polite"></div>');
    const el=this.el=document.getElementById('adventure-status');
    el.addEventListener('pointerenter',()=>el.classList.add('expanded'));
    el.addEventListener('pointerleave',()=>{if(performance.now()>this.until)el.classList.remove('expanded');});
  }
  get tracked(){return trackedQuest(knownQuests(this.game,this.list),this.preferred);}
  track(id){this.preferred=id;try{localStorage.setItem(KEY,id);}catch{}this.sig='';this.tick(true);}
  tick(force=false){
    const g=this.game,list=this.list=questList(g);this.markers=questMarkers(g,list);
    const q=trackedQuest(knownQuests(g,list),this.preferred),step=currentStep(q),idx=q?q.steps.indexOf(step):-1;
    this.feedback(list,q,step,idx);
    if(this.ui.renderer)this.ui.renderer.questFocus=q?.id||null;
    const count=step?.count,sig=q?`${q.id}|${q.state}|${q.ready}|${idx}|${count?.join('/')}|${step?.html}`:'none';
    const el=this.el;
    if(sig!==this.sig||force){
      this.sig=sig;this.until=performance.now()+(q?.id==='herd'&&q.state==='offered'?1e12:8000);
      if(!q){el.innerHTML='';el.classList.remove('expanded');}
      else{
        const glyph=q.state==='offered'?'!':q.ready?'?':'';
        // Collapsed: just the arrow, what it points at, and the count (no box).
        // Expanded: a small card with the quest title and one short instruction.
        const label=step?.targetLabel||q.giver||'';
        el.innerHTML=`<button data-menu="journal" data-open-tab="quests" class="qt ${q.ready?'ready':''} ${q.state}" aria-label="Quest: ${esc(q.title)}. ${esc(label)}">
          <span class="qt-compass" aria-hidden="true">${arrow}</span>
          <span class="qt-main">
            <span class="qt-title">${glyph?`<i class="qt-glyph">${glyph}</i>`:''}${esc(q.title)}</span>
            <span class="qt-label">${glyph?`<i class="qt-glyph">${glyph}</i>`:''}${esc(label)}</span>
            <span class="qt-step">${step?.brief||step?.html||''}</span>
            ${count?`<span class="qt-bar"><i style="width:${count[0]/Math.max(1,count[1])*100}%"></i></span>`:''}
          </span>
          ${count?`<b class="qt-count"><span>${count[0]}</span>/${count[1]}</b>`:''}
        </button>`;
        el.classList.add('expanded');
      }
    }else if(performance.now()>this.until&&!el.matches(':hover'))el.classList.remove('expanded');
    // The compass always points from you to the current goal.
    const c=el.querySelector('.qt-compass');
    if(c){const t=step?.target,p=g.player,far=t&&Math.hypot(t.x-p.x,t.y-p.y)>70;c.classList.toggle('here',!far);
      if(far){
        // Measure on screen (the world is drawn foreshortened vertically) so the arrow
        // matches what you see, and unwrap the angle so it never spins the long way round.
        const r=this.ui.renderer,a=r?.screen?r.screen(p.x,p.y):p,b=r?.screen?r.screen(t.x,t.y):t;
        let deg=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+90;
        if(this.angle!=null)deg=this.angle+((deg-this.angle)%360+540)%360-180;
        this.angle=deg;c.style.setProperty('--a',`${deg}deg`);
      }}
  }
  feedback(list,q,step,idx){
    const states=new Map(list.map(x=>[x.id,x.state+(x.ready?'+':'')]));
    if(this.states){
      for(const x of list){const before=this.states.get(x.id);
        if(before&&before.startsWith('active')&&x.state==='complete')this.pop('complete',`<i class="qp-glyph">✓</i><span><small>Quest complete</small><b>${esc(x.title)}</b></span>`,3600);
        else if(before==='offered'&&x.state==='active'){this.pop('new',`<i class="qp-glyph">!</i><span><small>Quest accepted</small><b>${esc(x.title)}</b></span>`,3000);if(!this.preferred||!list.find(y=>y.id===this.preferred&&y.state==='active'))this.preferred=x.id;}
      }
    }
    this.states=states;
    const now=q&&{id:q.id,idx,n:step?.count?.[0]??null,ready:!!q.ready};
    const was=this.prev;this.prev=now;
    if(!was||!now||was.id!==now.id)return;
    if(now.ready&&!was.ready){this.pop('ready',`<i class="qp-glyph">?</i><span><small>Objective complete</small><b>Return to ${esc(q.giver)}</b></span>`,4200);this.bump();return;}
    if(now.idx>was.idx){const done=q.steps[was.idx];this.pop('step',`<i class="qp-glyph">✓</i><span><small>${esc(q.title)}</small><b>${esc(done?.targetLabel||'Step')} done</b></span>`,3000);this.bump();return;}
    if(now.n!=null&&was.n!=null&&now.n>was.n){
      const [n,t]=step.count;
      this.pop('progress',`<span class="qp-count"><b>${n}</b>/${t}</span><span class="qp-pips">${Array.from({length:t},(_,i)=>`<i class="${i<n?'on':''} ${i===n-1?'new':''}"></i>`).join('')}</span><span class="qp-label">${esc(step.targetLabel||'')}</span>`,2200);
      this.bump();
    }
  }
  bump(){const el=this.el;el.classList.add('expanded');this.until=performance.now()+6000;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
  pop(kind,html,ms){
    const box=document.getElementById('quest-pop');if(!box)return;
    box.className=`quest-pop ${kind}`;box.innerHTML=html;void box.offsetWidth;box.classList.add('shown');
    clearTimeout(this.popTimer);this.popTimer=setTimeout(()=>box.classList.remove('shown'),ms);
  }
  // A quest creature fell: show its count rising right where it died.
  event(e){
    if(e.type!=='death'||!this.markers.mobs.has(e.id))return;
    const g=this.game,c=g.creatures.find(x=>x.id===e.id);if(!c)return;
    const fresh=questList(g);
    for(const q of fresh)for(const s of q.steps)if(s.count&&(s.camp?c.camp===s.camp:c.quest===q.id)){g.effect('float',c.x,c.y,s.done?'#a7e695':'#f6dc94',{text:s.done?'✓':`${s.count[0]}/${s.count[1]}`,life:1.6});return;}
  }
}
