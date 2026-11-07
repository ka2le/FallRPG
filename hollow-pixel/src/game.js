import { SPECIES, SPELL_BY_ID, SLOTS, QUESTS, PLACES, STANCES } from './data.js';
import { expansionEcology } from './ecology-expansion.js';
import { updateAmbient } from './ambient.js';
import { createWorld, HOME, WIDTH, HEIGHT, biomeAt, seamX, dist, clamp, canWalk, moveBody, lineClear, inVillage } from './world.js';

export const SAVE_KEY='hollow-between-seasons-v1';
export class Game {
  constructor(saved=null){
    this.world=createWorld();this.time=0;this.paused=false;this.events=[];this.effects=[];this.projectiles=[];this.floaters=[];
    this.player={...HOME,hp:120,maxHp:120,mana:100,maxMana:100,shield:0,ward:0,renew:0,level:1,xp:0,tonics:3,herbs:0,coins:24,face:1,moving:false,walk:0,attack:0,invulnerable:0,dx:0,dy:1};
    this.creatures=this.world.creatures.map(c=>({...c,hp:SPECIES[c.type].hp,maxHp:SPECIES[c.type].hp,face:1,moving:false,walk:0,attack:1,windup:0,root:0,stun:0,slow:0,aggro:false,flash:0,dead:false,state:'wandering'}));
    this.bindings={q:'bramble',e:'frost',f:'ward',r:'wave'};this.cooldowns={};this.observed=new Set();this.visited=new Set(['village']);this.defeated=new Set();
    this.quests={herd:'offered',seasons:'locked',seam:'locked'};this.crossingOpen=false;this.target=null;this.autoAttack=true;this.stance='ember';this.aiming=null;this.pointer={x:HOME.x,y:HOME.y-80};this.world.barriers=[];this.safeZonesEnabled=true;this.destination=null;this.route=[];this.nearby=null;this.currentPlace='village';this.stepTimer=0;this.fox=null;this.boltCooldown=0;this.dirty=false;
    if(saved)this.restore(saved);
  }
  emit(type,data={}){this.events.push({type,...data});}
  toast(text,tone='normal'){this.emit('toast',{text,tone});}
  effect(type,x,y,color='#dfd2a2',extra={}){this.effects.push({type,x,y,color,age:0,life:.7,...extra});}
  floater(text,x,y,color='#f0e7c8'){this.floaters.push({text,x,y,color,age:0,life:1.3});}
  get targetCreature(){return this.creatures.find(c=>c.id===this.target&&!c.dead);}
  get isInCombat(){return this.creatures.some(c=>c.aggro&&!c.dead&&dist(c,this.player)<250);}
  get isSafe(){return this.safeZonesEnabled&&inVillage(this.player);}
  get herdCleared(){return this.creatures.filter(c=>c.quest==='herd').every(c=>c.dead);}
  get fieldComplete(){return ['barkjaw','mantleback','snowkeel','ventback'].every(s=>this.observed.has(s));}
  setBinding(slot,id){if(SLOTS.includes(slot)&&SPELL_BY_ID[id]){this.bindings[slot]=id;this.aiming=null;this.dirty=true;this.emit('bindings');return true;}return false;}
  setStance(id){if(!STANCES.some(s=>s.id===id))return false;this.stance=id;this.autoAttack=true;this.dirty=true;return true;}
  chooseTarget(id){const c=this.creatures.find(c=>c.id===id&&!c.dead);if(!c)return;this.target=c.id;this.destination=null;this.route=[];this.emit('target');}
  beginCast(slot){const s=SPELL_BY_ID[this.bindings[slot]];if(!s||this.paused)return false;if(this.cooldowns[s.id]>0){this.toast('Not ready.');return false;}if(this.player.mana<s.cost){this.toast('Not enough aether.');return false;}if(s.aim){this.aiming=this.aiming?.slot===slot?null:{slot,id:s.id};return true;}this.aiming=null;return this.cast(slot);}
  cancelCast(){this.aiming=null;}
  confirmCast(point){if(!this.aiming)return false;const result=this.cast(this.aiming.slot,point);if(result)this.aiming=null;return result;}
  wallAt(point){const p=this.player,d=dist(p,point)||1,dx=-(point.y-p.y)/d*58,dy=(point.x-p.x)/d*58;return {a:{x:point.x-dx,y:point.y-dy},b:{x:point.x+dx,y:point.y+dy},x:point.x,y:point.y,life:7,maxLife:7};}
  placementValid(s,point){if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||dist(this.player,point)>(s.range||200)||!lineClear(this.world,this.player,point))return false;if(s.aim==='wall'){if(dist(this.player,point)<35)return false;const w=this.wallAt(point);for(let i=0;i<=6;i++)if(!canWalk(this.world,w.a.x+(w.b.x-w.a.x)*i/6,w.a.y+(w.b.y-w.a.y)*i/6,5))return false;}return true;}
  cycleTarget(){const list=this.creatures.filter(c=>!c.dead&&!SPECIES[c.type].neutral&&dist(c,this.player)<260).sort((a,b)=>dist(a,this.player)-dist(b,this.player));if(!list.length){this.toast('No threats nearby.');return;}const i=list.findIndex(c=>c.id===this.target);this.chooseTarget(list[(i+1)%list.length].id);}
  spellTarget(range){const chosen=this.targetCreature;if(chosen&&(!SPECIES[chosen.type].neutral||chosen.aggro)&&dist(chosen,this.player)<=range)return chosen;return this.creatures.filter(c=>!c.dead&&(!SPECIES[c.type].neutral||c.aggro)&&dist(c,this.player)<=range).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0];}
  cast(slot,point=null){
    const id=this.bindings[slot],s=SPELL_BY_ID[id],p=this.player;if(!s||this.paused)return false;
    if(this.cooldowns[id]>0){this.toast(`${s.name} is still gathering strength.`);return false;}
    if(p.mana<s.cost){this.toast('Not enough aether. It returns while you wander.');return false;}
    let target=null,center=point;
    if(s.aim==='ground'||s.aim==='wall'){if(!this.placementValid(s,point)){this.toast('Choose clear ground within reach.');return false;}}
    if(['bind','siphon'].includes(id)){target=point?this.creatures.filter(c=>!c.dead&&(!SPECIES[c.type].neutral||c.aggro)&&dist(c,point)<42&&dist(c,p)<s.range).sort((a,b)=>dist(a,point)-dist(b,point))[0]:this.spellTarget(s.range);if(!target){this.toast('No threat there.');return false;}if(!lineClear(this.world,p,target)){this.toast('Blocked.');return false;}}
    p.mana-=s.cost;this.cooldowns[id]=s.cooldown;p.attack=.32;this.dirty=true;this.emit('cast',{id});
    if(target){this.target=target.id;target.aggro=true;}
    if(id==='bind'){target.root=4;target.windup=0;this.effect('roots',target.x,target.y,s.color,{life:4});this.floater('BOUND',target.x,target.y-35,s.color);}
    if(id==='bramble'){this.world.barriers.push(this.wallAt(point));this.effect('leaves',point.x,point.y,s.color,{radius:55});}
    if(id==='frost'){this.effect('bloom',center.x,center.y,s.color,{radius:s.radius,life:1.1});for(const c of this.creatures)if(!c.dead&&(!SPECIES[c.type].neutral||c.aggro)&&dist(c,center)<s.radius&&lineClear(this.world,center,c)){this.hurt(c,s.damage,s.color);c.slow=5;}}
    if(id==='ward'){p.ward=7;p.shield=45;this.effect('ring',p.x,p.y,s.color,{radius:40});this.floater('+45 WARD',p.x,p.y-35,s.color);}
    if(id==='wave'){this.effect('ring',center.x,center.y,s.color,{radius:s.radius});for(const c of this.creatures)if(!c.dead&&(!SPECIES[c.type].neutral||c.aggro)&&dist(c,center)<s.radius&&lineClear(this.world,center,c)){this.hurt(c,s.damage,s.color);c.stun=2;c.windup=0;const d=dist(c,center)||1;moveBody(this.world,c,(c.x-center.x)/d*22,(c.y-center.y)/d*22);}}
    if(id==='siphon'){this.hurt(target,s.damage,s.color);p.hp=Math.min(p.maxHp,p.hp+22);this.effect('beam',p.x,p.y-18,s.color,{tx:target.x,ty:target.y-15,life:.7});this.floater('+22',p.x,p.y-40,'#bddd91');}
    if(id==='renew'){p.renew=5;this.effect('ring',p.x,p.y,s.color,{radius:35});}
    if(id==='blink'){this.effect('bloom',p.x,p.y,s.color,{radius:25,life:.4});const l=Math.hypot(p.dx,p.dy)||1;moveBody(this.world,p,p.dx/l*100,p.dy/l*100);this.destination=null;this.route=[];this.effect('bloom',p.x,p.y,s.color,{radius:25,life:.4});}
    if(id==='fox'){this.fox={x:p.x-22,y:p.y+20,time:20,attack:0,face:1,moving:false,walk:0};this.effect('bloom',p.x-22,p.y+20,s.color,{radius:25});}
    return true;
  }
  shoot(automatic=false){
    if(this.paused||this.boltCooldown>0)return false;
    if(this.isSafe)return false;const stance=STANCES.find(s=>s.id===this.stance),p=this.player;
    const candidates=this.creatures.filter(c=>!c.dead&&(!SPECIES[c.type].neutral||c.aggro)&&dist(c,p)<stance.range&&lineClear(this.world,p,c)&&(!this.safeZonesEnabled||!inVillage(c)));
    const target=candidates.find(c=>c.id===this.target)||candidates.sort((a,b)=>(a.aggro?-60:0)+dist(a,p)-(b.aggro?-60:0)-dist(b,p))[0];
    if(!target){if(!automatic)this.toast('No threat in reach.');return false;}
    this.target=target.id;this.boltCooldown=stance.rate;this.player.attack=.25;this.projectiles.push({x:p.x,y:p.y-14,target:target.id,speed:240,damage:stance.damage+Math.floor((p.level-1)*1.5),slow:stance.slow||0,heal:stance.heal||0,color:stance.color,enemy:false,age:0});this.emit('cast',{id:this.stance==='ember'?'bolt':this.stance});return true;
  }
  hurt(c,damage,color='#f2d39b'){
    if(c.dead)return;c.hp=Math.max(0,c.hp-damage);c.aggro=true;c.flash=.2;this.floater(String(Math.round(damage)),c.x,c.y-30,color);this.effect('hit',c.x,c.y-17,color,{life:.25});
    if(c.hp<=0){c.dead=true;c.deadAt=this.time;c.aggro=false;this.defeated.add(c.id);this.reward(20+(c.type==='prowler'?10:0));this.player.coins+=4;if(this.target===c.id)this.target=null;this.emit('death',{type:c.type});this.dirty=true;if(c.quest==='herd'&&this.herdCleared){this.toast('Return to Rowan.','quest');this.emit('quest');}}
  }
  damagePlayer(amount){const p=this.player;if(p.invulnerable>0||this.isSafe)return;let absorbed=Math.min(p.shield,amount);p.shield-=absorbed;amount-=absorbed;if(absorbed)this.floater(`−${absorbed} WARD`,p.x,p.y-42,'#e4ca84');if(amount){p.hp=Math.max(0,p.hp-amount);this.floater(`−${amount}`,p.x,p.y-24,'#f0a196');this.emit('hurt');}if(!p.hp)this.respawn();}
  reward(xp){const p=this.player;p.xp+=xp;while(p.xp>=100+p.level*40){p.xp-=100+p.level*40;p.level++;p.maxHp+=12;p.hp=p.maxHp;p.mana=p.maxMana;this.toast(`A little wiser. You are now level ${p.level}.`,'quest');this.effect('ring',p.x,p.y,'#e6cf89',{radius:90,life:1.5});}this.dirty=true;}
  respawn(){const p=this.player;Object.assign(p,HOME,{hp:p.maxHp,mana:p.maxMana,shield:0,ward:0,renew:0,invulnerable:3});this.target=null;this.aiming=null;this.destination=null;this.route=[];this.projectiles=[];this.world.barriers=[];for(const c of this.creatures){c.aggro=false;c.windup=0;if(!c.dead)c.hp=c.maxHp;}this.toast('The Hearthstone calls you home. Your discoveries are safe.','quest');this.emit('respawn');}
  tonic(){if(this.paused)return;if(this.player.tonics<=0){this.toast('No tonics left. Gather sprigs and visit the market.');return;}if(this.player.hp>=this.player.maxHp){this.toast('You are already in good health.');return;}this.player.tonics--;this.player.hp=Math.min(this.player.maxHp,this.player.hp+65);this.floater('+65',this.player.x,this.player.y-30,'#b9d48e');this.effect('ring',this.player.x,this.player.y,'#b9d48e',{radius:25});this.dirty=true;}
  observe(c){if(!c||c.dead)return;if(dist(this.player,c)>115){this.toast('Move closer to observe this creature.');return;}if(!this.observed.has(c.type)){this.observed.add(c.type);this.reward(12);this.toast(`Field note added: ${SPECIES[c.type].name}.`,'discovery');this.emit('observation',{species:c.type});}else this.toast(SPECIES[c.type].note);this.dirty=true;}
  interact(){
    if(this.paused)return;
    const c=this.targetCreature;if(c&&SPECIES[c.type].neutral&&dist(c,this.player)<115){this.observe(c);return;}
    const near=this.nearby;if(!near){const animal=this.creatures.filter(c=>!c.dead&&dist(c,this.player)<95).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0];if(animal){this.observe(animal);return;}this.toast('Get closer to a villager, creature, or landmark.');return;}
    if(near.kind==='npc'||near.kind==='lore'){this.emit('dialogue',{npc:near.id});return;}
    if(near.kind==='hearth'){if(this.isInCombat){this.toast('The Hearthstone waits until the danger has passed.');return;}this.player.hp=this.player.maxHp;this.player.mana=this.player.maxMana;this.effect('ring',near.x,near.y,'#a8dacb',{radius:65,life:1.5});this.toast('Rested, restored, and remembered.');this.emit('save');}
    if(near.kind==='market'){this.emit('dialogue',{npc:'market'});}
    if(near.kind==='sign'){this.emit('map');}
    if(near.kind==='crossing'){
      if(this.crossingOpen){this.toast('The Scavengers can feed on both sides again.');return;}
      this.crossingOpen=true;this.world.props.find(p=>p.blockage).removed=true;this.effect('leaves',near.x,near.y,'#d4b978',{radius:40});this.toast('The crossing is open. Watch the Scavengers follow it.','quest');this.emit('quest');this.dirty=true;
    }
    if(near.kind==='elder'){this.toast('The “dead” trunk draws a slow breath. Root arms tighten at the entrance.');this.effect('roots',near.x,near.y,'#c9a16a',{life:2});this.visited.add('elder');}
    if(near.kind==='herb'){near.collected=true;this.player.herbs++;this.floater('+1 sprig',near.x,near.y-10,'#d9d894');this.toast('A fragrant sprig. Trade three for a tonic at Willowmere.');this.dirty=true;}
  }
  questAction(id){
    if(!QUESTS.some(q=>q.id===id))return false;
    if(id==='seam'&&this.quests.herd!=='complete')return false;
    if(id==='seasons'&&this.quests.seam!=='complete')return false;
    if(this.quests[id]==='offered'){this.quests[id]='active';this.toast(`New journal entry: ${QUESTS.find(q=>q.id===id).title}.`,'quest');this.dirty=true;return true;}
    const ready=id==='herd'?this.herdCleared:id==='seasons'?this.fieldComplete:this.crossingOpen;
    if(this.quests[id]==='active'&&ready){this.quests[id]='complete';if(id==='herd'&&this.quests.seam==='locked')this.quests.seam='offered';if(id==='seam'&&this.quests.seasons==='locked')this.quests.seasons='offered';this.reward(id==='herd'?70:id==='seasons'?120:90);this.player.tonics+=id==='herd'?2:id==='seam'?1:0;this.toast(`Completed: ${QUESTS.find(q=>q.id===id).title}.`,'quest');this.emit('quest');this.dirty=true;return true;}return false;
  }
  buyTonic(mode){const p=this.player;if(mode==='herbs'&&p.herbs>=3){p.herbs-=3;p.tonics++;this.dirty=true;this.toast('Three sprigs for one fresh tonic.');return true;}if(mode==='coins'&&p.coins>=12){p.coins-=12;p.tonics++;this.dirty=true;this.toast('One tonic, wrapped for the road.');return true;}this.toast(mode==='herbs'?'You need three sprigs.':'You need 12 amber coins.');return false;}
  navigateTo(x,y){
    if(!canWalk(this.world,x,y)){this.toast('That ground is not passable.');return;}
    this.autoAttack=false;const cell=20,start={x:Math.round(this.player.x/cell),y:Math.round(this.player.y/cell)},goal={x:Math.round(x/cell),y:Math.round(y/cell)};
    const key=n=>`${n.x},${n.y}`,open=[{...start,g:0,f:0}],cost=new Map([[key(start),0]]),from=new Map(),closed=new Set();let found=null;
    for(let count=0;open.length&&count<7000;count++){
      open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=key(cur);if(closed.has(ck))continue;closed.add(ck);
      if(Math.abs(cur.x-goal.x)<=1&&Math.abs(cur.y-goal.y)<=1){found=cur;break;}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
        const n={x:cur.x+dx,y:cur.y+dy},nk=key(n),g=cur.g+Math.hypot(dx,dy);
        if(closed.has(nk)||n.x<1||n.y<2||n.x>WIDTH/cell-1||n.y>HEIGHT/cell-1||!canWalk(this.world,n.x*cell,n.y*cell,9))continue;
        if(dx&&dy&&(!canWalk(this.world,(cur.x+dx)*cell,cur.y*cell,9)||!canWalk(this.world,cur.x*cell,(cur.y+dy)*cell,9)))continue;
        if(g<(cost.get(nk)??Infinity)){cost.set(nk,g);from.set(nk,cur);open.push({...n,g,f:g+Math.hypot(n.x-goal.x,n.y-goal.y)});}
      }
    }
    if(!found){this.toast('No clear route. Try the footpath.');return;}
    const path=[{x,y}];let n=found;while(key(n)!==key(start)){path.push({x:n.x*cell,y:n.y*cell});n=from.get(key(n));if(!n)break;}this.route=path.reverse();this.destination={x,y};this.effect('destination',x,y,'#e8d599',{life:1});
  }
  update(dt,input={}){
    if(this.paused)return;dt=clamp(dt,0,.05);this.time+=dt;const p=this.player;for(const wall of this.world.barriers)wall.life-=dt;this.world.barriers=this.world.barriers.filter(w=>w.life>0);
    p.attack=Math.max(0,p.attack-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.ward=Math.max(0,p.ward-dt);if(!p.ward)p.shield=0;
    if(p.renew>0){const t=Math.min(p.renew,dt);p.hp=Math.min(p.maxHp,p.hp+t*10);p.renew-=t;}
    p.mana=Math.min(p.maxMana,p.mana+dt*(this.isInCombat?3.5:7));this.boltCooldown=Math.max(0,this.boltCooldown-dt);
    for(const id in this.cooldowns)this.cooldowns[id]=Math.max(0,this.cooldowns[id]-dt);
    let dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0),running=input.run;
    if(dx||dy){this.destination=null;this.route=[];}else if(this.route.length){const next=this.route[0],d=dist(p,next);if(d<5)this.route.shift();else {dx=(next.x-p.x)/d;dy=(next.y-p.y)/d;}if(!this.route.length)this.destination=null;}
    const length=Math.hypot(dx,dy);p.moving=length>0;
    if(length){dx/=length;dy/=length;p.dx=dx;p.dy=dy;p.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');if(Math.abs(dx)>.1)p.face=dx>0?1:-1;moveBody(this.world,p,dx*dt*(running?112:80),dy*dt*(running?112:80));p.walk+=dt*(running?10:7);}
    updateAmbient(this.world,p,this.time,dt);
    if(this.autoAttack&&!this.isSafe)this.shoot(true);
    for(const c of this.creatures){
      if(c.dead)continue;const s=SPECIES[c.type];c.root=Math.max(0,c.root-dt);c.stun=Math.max(0,c.stun-dt);c.slow=Math.max(0,c.slow-dt);c.flash=Math.max(0,c.flash-dt);c.attack-=dt;c.moving=false;
      const d=dist(c,p);
      if(d>850&&!c.aggro){if(this.time>=(c.nextIdleTick||0)){c.nextIdleTick=this.time+.5;this.ecology(c,.5);}continue;}
      if(this.isSafe){c.aggro=false;c.windup=0;}else{if(!s.neutral&&d<110&&lineClear(this.world,c,p))c.aggro=true;if(c.nest&&d<49)c.aggro=true;}
      if(c.aggro&&(d>340||dist(c,{x:c.homeX,y:c.homeY})>280)){c.aggro=false;c.windup=0;c.hp=c.maxHp;}
      if(c.stun>0){c.state='stunned';continue;}
      if(c.aggro){
        c.state=c.root?'bound':c.windup?'winding up':'engaged';const reach=s.ranged?165:39;
        if(c.windup>0){c.windup-=dt;if(c.windup<=0){if(s.ranged&&d<220&&lineClear(this.world,c,p))this.projectiles.push({x:c.x,y:c.y-20,target:'player',speed:125,damage:s.damage,color:c.type==='wyrm'?'#eea86f':'#bdd9e7',enemy:true,age:0});else if(d<53)this.damagePlayer(s.damage);c.attack=1.7;}}
        else if(d<=reach&&c.attack<=0&&lineClear(this.world,c,p)){c.windup=.65;this.effect('warning',c.x,c.y,'#e8a079',{life:.65,radius:32});}
        else if(d>reach&&!c.root)this.walkCreature(c,p,dt,s.speed*(c.slow?.42:1));
      }else if(c.root){c.state='bound';}else this.ecology(c,dt);
    }
    if(this.fox){const f=this.fox;f.time-=dt;f.attack-=dt;f.walk+=dt*10;const victim=this.creatures.find(c=>!c.dead&&c.aggro&&dist(c,p)<180);const goal=victim||{x:p.x-25*p.face,y:p.y+22};const d=dist(f,goal);f.moving=d>20;if(d>20){f.x+=(goal.x-f.x)/d*dt*105;f.y+=(goal.y-f.y)/d*dt*105;f.face=goal.x>f.x?1:-1;}if(victim&&d<35&&f.attack<=0){this.hurt(victim,9,'#b3e0d1');f.attack=1.2;}if(f.time<=0)this.fox=null;}
    for(const shot of this.projectiles){
      shot.age+=dt;const goal=shot.enemy?p:this.creatures.find(c=>c.id===shot.target&&!c.dead);
      if(!goal||(shot.enemy&&this.isSafe)){shot.done=true;continue;}
      const dx=goal.x-shot.x,dy=goal.y-16-shot.y,d=Math.hypot(dx,dy),step=Math.min(d,shot.speed*dt),old={x:shot.x,y:shot.y+16};
      if(d){shot.x+=dx/d*step;shot.y+=dy/d*step;}
      if(!lineClear(this.world,old,{x:shot.x,y:shot.y+16},0)||shot.age>4){shot.done=true;continue;}
      if(d<step+8){if(shot.enemy)this.damagePlayer(shot.damage);else{this.hurt(goal,shot.damage,shot.color);if(shot.slow)goal.slow=Math.max(goal.slow,shot.slow);if(shot.heal)p.hp=Math.min(p.maxHp,p.hp+shot.heal);}shot.done=true;}
    }
    this.projectiles=this.projectiles.filter(s=>!s.done);
    for(const group of [this.effects,this.floaters]){for(const e of group)e.age+=dt;for(let i=group.length-1;i>=0;i--)if(group[i].age>=group[i].life)group.splice(i,1);}
    for(const npc of this.world.interactables)if(npc.roaming){npc.moving=false;const goal={x:npc.homeX+Math.sin(this.time*.12)*35,y:npc.homeY+Math.cos(this.time*.09)*18};if((this.time%16)>6)this.walkCreature(npc,goal,dt,13);}
    this.nearby=this.world.interactables.filter(i=>!i.collected&&dist(i,p)<(i.kind==='npc'?65:48)).sort((a,b)=>dist(a,p)-dist(b,p))[0]||null;
    for(const place of PLACES)if(dist(p,place)<135){this.currentPlace=place.id;if(!this.visited.has(place.id)){this.visited.add(place.id);this.reward(20);this.emit('place',{place});this.dirty=true;}}
    for(const prop of this.world.props){if(prop.clasp&&dist(p,prop)<28&&(!prop.lastSnap||this.time-prop.lastSnap>7)){prop.lastSnap=this.time;this.effect('roots',prop.x,prop.y,'#afbf77',{life:.8});this.damagePlayer(6);this.toast('Claspwood roots tighten. Move beyond the exposed root circle.');}}
  }
  walkCreature(c,goal,dt,speed){const d=dist(c,goal);if(d<3)return;const ox=c.x,oy=c.y,dx=(goal.x-c.x)/d*dt*speed,dy=(goal.y-c.y)/d*dt*speed;
    const def=SPECIES[c.type],habitat=def?.neutral&&def.habitat!=='seam'?def.habitat:null;
    if(habitat&&biomeAt(c.x+dx,c.y+dy)!==habitat)return;
    moveBody(this.world,c,dx,dy,5);if(Math.abs(c.x-ox)+Math.abs(c.y-oy)<.01&&(!habitat||biomeAt(c.x-dy,c.y+dx)===habitat))moveBody(this.world,c,-dy,dx,5);
    c.moving=dist(c,{x:ox,y:oy})>.01;if(c.moving){c.walk+=dt*7;c.face=dx>0?1:-1;}
  }
  ecology(c,dt){
    const s=SPECIES[c.type],cycle=(this.time+c.phase*4)%18;
    if(expansionEcology(this,c,dt))return;
    if(c.type==='barkjaw'){
      if(c.separated){
        if(!this.herdCleared){c.state='waiting at the thorns';return;}
        const partner=this.creatures.find(a=>a.type==='barkjaw'&&a.pair===c.pair&&a!==c);
        if(partner&&dist(c,partner)>68){c.state='returning to partner';this.walkCreature(c,{x:partner.x+42,y:partner.y+35},dt,20);return;}
        c.separated=false;
      }
      const feeding=((this.time/9|0)+(c.id.endsWith('0')||c.id.endsWith('2')?0:1))%2===0;
      c.state=feeding?'feeding':'keeping watch';if(feeding){let tree=c.feedingTree;if(!tree||tree.removed){tree=this.world.props.filter(t=>!t.removed&&t.tree&&(t.family==='giftwillow'||(t.sprite===0&&!t.atlas))).reduce((best,t)=>!best||dist(t,c)<dist(best,c)?t:best,null);c.feedingTree=tree;}if(tree&&dist(c,tree)>45)this.walkCreature(c,{x:tree.x+35,y:tree.y+25},dt,12);}
      return;
    }
    if(c.type==='rootknife'){
      const grazers=this.creatures.filter(a=>a.type==='barkjaw'&&!a.dead),prey=grazers.sort((a,b)=>dist(a,c)-dist(b,c))[0];
      const guarded=prey&&grazers.some(a=>a!==prey&&dist(a,prey)<110&&a.state==='keeping watch');
      c.state=guarded?'watching the pair':'stalking';if(prey&&dist(c,prey)<180){const desired=guarded?145:55;if(dist(c,prey)>desired)this.walkCreature(c,prey,dt,12);else if(guarded&&dist(c,prey)<100)this.walkCreature(c,{x:c.homeX,y:c.homeY},dt,20);return;}
    }
    if(c.type==='scavenger'){
      c.cold=Math.max(0,c.cold-dt*.023);c.warm=Math.max(0,c.warm-dt*.026);const toCold=c.cold<c.warm,edge=seamX(1370);
      if(c.crossing&&!c.crossingGoals){const candidates=[];for(let dx=-140;dx<=140;dx+=20)for(let dy=-80;dy<=80;dy+=20){const point={x:c.crossing.x+dx,y:c.crossing.y+dy};if(canWalk(this.world,point.x,point.y,5))candidates.push(point);}c.crossingGoals={};for(const [key,biome] of [['cold','winter'],['warm','ember']])c.crossingGoals[key]=candidates.filter(a=>biomeAt(a.x,a.y)===biome).sort((a,b)=>dist(a,c.crossing)-dist(b,c.crossing))[0];}
      const goal=c.crossing?(c.crossingGoals[toCold?'cold':'warm']||{x:c.homeX,y:c.homeY}):{x:edge+(toCold?-60:75),y:1370},open=c.crossing||this.crossingOpen;
      c.state=open?'crossing the seam':'searching for a crossing';if(open){this.walkCreature(c,goal,dt,28);if(dist(c,goal)<15){if(toCold)c.cold=1;else c.warm=1;c.state='feeding';}}return;
    }
    if(c.type==='ventback'){c.state='guarding the clutch';if(cycle<5)this.walkCreature(c,{x:c.homeX+Math.sin(this.time*.2+c.phase)*25,y:c.homeY+Math.cos(this.time*.2+c.phase)*18},dt,10);return;}
    c.state=c.type==='mantleback'?'turning leaf litter':c.type==='snowkeel'?'feeding beneath snow':c.type==='antler'?'tending antler gardens':cycle<6?'resting':'wandering';
    if(cycle>6){const goal={x:c.homeX+Math.sin(this.time*.06+c.phase)*65,y:c.homeY+Math.cos(this.time*.047+c.phase)*45};if(s.neutral&&c.type!=='scavenger'&&biomeAt(goal.x,goal.y)!==s.habitat)return;this.walkCreature(c,goal,dt,s.speed*.43);}
  }
  snapshot(){const p=this.player;return {version:1,combatVersion:2,stance:this.stance,autoAttack:this.autoAttack,player:{x:p.x,y:p.y,hp:p.hp,mana:p.mana,level:p.level,xp:p.xp,tonics:p.tonics,herbs:p.herbs,coins:p.coins},bindings:{...this.bindings},observed:[...this.observed],visited:[...this.visited],defeated:[...this.defeated],quests:{...this.quests},crossingOpen:this.crossingOpen,harvested:this.world.interactables.filter(i=>i.collected).map(i=>i.id)};}
  restore(s){
    if(s?.version!==1)return;const p=this.player,d=s.player||{};
    for(const key of ['level','xp','tonics','herbs','coins'])if(Number.isFinite(d[key]))p[key]=clamp(Math.floor(d[key]),key==='level'?1:0,key==='level'?50:9999);
    p.maxHp=120+(p.level-1)*12;p.hp=Number.isFinite(d.hp)?clamp(d.hp,1,p.maxHp):p.maxHp;p.mana=Number.isFinite(d.mana)?clamp(d.mana,0,p.maxMana):p.maxMana;
    if(Number.isFinite(d.x)&&Number.isFinite(d.y)&&canWalk(this.world,d.x,d.y)){p.x=d.x;p.y=d.y;}
    for(const slot of SLOTS)if(SPELL_BY_ID[s.bindings?.[slot]])this.bindings[slot]=s.bindings[slot];
    if(!s.combatVersion&&this.bindings.q==='bind')this.bindings.q='bramble';
    if(STANCES.some(a=>a.id===s.stance))this.stance=s.stance;if(typeof s.autoAttack==='boolean')this.autoAttack=s.autoAttack;
    this.observed=new Set((Array.isArray(s.observed)?s.observed:[]).filter(id=>SPECIES[id]));this.visited=new Set((Array.isArray(s.visited)?s.visited:[]).filter(id=>PLACES.some(p=>p.id===id)));
    for(const q of QUESTS)if(['locked','offered','active','complete'].includes(s.quests?.[q.id]))this.quests[q.id]=s.quests[q.id];
    if(this.quests.herd==='complete'&&this.quests.seam==='locked')this.quests.seam='offered';if(this.quests.seam==='complete'&&this.quests.seasons==='locked')this.quests.seasons='offered';
    this.crossingOpen=s.crossingOpen===true;if(this.crossingOpen)this.world.props.find(p=>p.blockage).removed=true;
    this.defeated=new Set((Array.isArray(s.defeated)?s.defeated:[]).filter(id=>this.creatures.some(c=>c.id===id)));for(const c of this.creatures)if(this.defeated.has(c.id)){c.dead=true;c.hp=0;c.deadAt=-100;}
    for(const i of this.world.interactables)if(Array.isArray(s.harvested)&&s.harvested.includes(i.id))i.collected=true;
  }
}
