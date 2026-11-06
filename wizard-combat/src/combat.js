import {Journey} from './journey.js';
import {SPELLS,SPECIES,CAMPS,WILDS,ACTIONS,SHIELD,terrain} from './data.js';
import {clamp,subtract,length,dot,normalize,pointAt,sphereHit,wallHit,blocked,inside,floorAt,clearBody,moveBody,navigate,shieldHit,nearbyCover} from './physics.js';
export {blocked,sphereHit} from './physics.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const EYE=1.7;
export class Combat extends Journey{
  constructor(){
    super();
    this.time=0;this.events=[];this.enemies=[];this.projectiles=[];this.nextId=0;this.cooldowns=SPELLS.map(()=>0);this.attackMode=0;
    this.kills=0;this.deaths=0;this.xp=0;this.level=1;this.damageScale=1;this.respawn=true;
    this.player={x:0,z:8,y:terrain(0,8)+EYE,yaw:0,pitch:0,hp:100,maxHp:100,mana:100,maxMana:100,ward:0,wardHits:0,invuln:0,lastHit:-100,lastMana:-100,moving:false,vx:0,vz:0,vy:0,grounded:true,slow:0};
    this.beam={time:0,target:null,end:null,broken:false};this.buffs={haste:0,renew:0,recall:0};this.companion={time:0,attack:0,x:0,y:4,z:8};this.aiAccumulator=0;this.exploreTimer=0;this.recalculate();this.resetEncounters();
  }
  get selected(){return this.attackMode;}
  emit(type,props={}){this.events.push({type,...props});}
  resetEncounters(){
    this.enemies=[];this.projectiles=[];this.beam.time=0;
    CAMPS.forEach((c,i)=>this.spawnGroup(c,i));
    WILDS.forEach(c=>this.spawnGroup(c,-1));
  }
  spawnGroup(c,camp){
    c.types.forEach((type,j)=>{
      const size=SPECIES[type].size;let x,z,found=false;
      for(let n=0;n<160;n++){
        const angle=j*2.4+n*.7,r=j===0&&n===0?0:3.5+Math.floor(n/8)*1.5;
        x=c.x+Math.sin(angle)*r;z=c.z+Math.cos(angle)*r;
        if(clearBody(x,z,terrain(x,z),size*.23,Math.max(1.7,size))&&!this.enemies.some(e=>distance(e,{x,z})<(SPECIES[e.type].size+size)*.3+1.2)){found=true;break;}
      }
      if(!found)return;
      const e=this.spawn(type,x,z,camp,c.level);
      if(camp<0){e.wild=c.id;e.roam=c.roam;e.xpReward*=.65;}
    });
  }
  spawn(type,x,z,camp=-1,worldLevel=null){
    const s=SPECIES[type],level=worldLevel??CAMPS[camp]?.level??1,maxHp=Math.round(s.hp*(1+(level-1)*.1)),e={level,maxHp,xpReward:s.xp*(1+(level-1)*.14),attackDamage:s.damage*(1+(level-1)*.085),id:this.nextId++,type,x,z,y:terrain(x,z)+s.size*.5+(s.flying?2.6:0),homeX:x,homeZ:z,camp,hp:maxHp,root:0,slow:0,freeze:0,ground:0,burn:0,quench:0,shell:type==='ice',attackTimer:.6,healTimer:3,windup:0,aggro:false,dead:0,flash:0,dodgeTime:0,dodgeCooldown:0,threat:null,seenFor:0,lastDamage:-100,aiState:'idle',stateTime:0,coverPlan:null,coverTimer:0,burstLeft:0,burstTimer:0,strafeSign:1,waypoint:null};
    this.enemies.push(e);return e;
  }
  aim(){const p=this.player,c=Math.cos(p.pitch);return{x:-Math.sin(p.yaw)*c,y:Math.sin(p.pitch),z:-Math.cos(p.yaw)*c};}
  // Exact ray/body intersection. No aim cone, magnetic aim, or projectile steering.
  trace(range=72,origin=this.player,direction=this.aim(),radius=0){
    const end={x:origin.x+direction.x*range,y:origin.y+direction.y*range,z:origin.z+direction.z*range};
    let fraction=wallHit(origin,end)??1,enemy=null;
    for(const e of this.enemies){if(e.hp<=0)continue;const t=sphereHit(origin,end,e,SPECIES[e.type].size*.34+radius);if(t!==null&&t<fraction){fraction=t;enemy=e;}}
    return{enemy,end:pointAt(origin,end,fraction),distance:fraction*range};
  }
  target(range=72){return this.trace(range).enemy;}
  move(dx,dz,dt,sprint=false){
    const p=this.player,l=Math.hypot(dx,dz)||1,speed=(sprint?10.4:7.5)*(p.slow>0?.7:1)*(1+(this.gear.move||0))*(this.buffs.haste>0?1.3:1),oldX=p.x,oldZ=p.z;dx/=l;dz/=l;
    const level=moveBody(p,(dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw))*speed*dt,(-dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))*speed*dt,.42,p.y-EYE,EYE,p.grounded?.28:0);
    if(level>p.y-EYE)p.y=level+EYE;
    p.vx=(p.x-oldX)/(dt||1);p.vz=(p.z-oldZ)/(dt||1);p.moving=Math.hypot(p.vx,p.vz)>.1;
  }
  jump(){const p=this.player;if(!p.grounded)return false;p.vy=8.6;p.grounded=false;this.emit('jump');return true;}
  vertical(dt){
    if(this.testing?.enabled&&this.testing.flying)return;
    const p=this.player,feet=p.y-EYE,ground=floorAt(p.x,p.z,feet+.05,.42);
    if(p.grounded&&feet-ground>.08)p.grounded=false;
    if(p.grounded){p.y=ground+EYE;p.vy=0;return;}
    p.vy-=21*dt;let next=feet+p.vy*dt;const landing=floorAt(p.x,p.z,feet+.04,.42);
    if(p.vy<=0&&next<=landing){next=landing;p.vy=0;p.grounded=true;this.emit('land');}
    p.y=next+EYE;
  }
  use(action,move={x:0,z:-1}){
    const index=ACTIONS[action];if(index===undefined)return false;if(!this.known.has(action)){if(this.time-(this.lockedAt??-10)>2){this.emit('locked',{action});this.lockedAt=this.time;}return false;}
    if(action==='drain'&&this.beam.time>0){this.beam.time=0;return true;}
    if(this.cooldowns[index]>0)return false;
    if(this.beam.time>0&&['attack','bind'].includes(action))return false;
    const i=action==='attack'?this.attackMode:index,s=SPELLS[i],p=this.player;
    if(p.mana<s.cost){if(this.time-(this.emptyAt??-10)>.2){this.emit('empty');this.emptyAt=this.time;}return false;}
    p.mana-=s.cost;if(s.cost)p.lastMana=this.time;this.cooldowns[index]=s.rate*(action==='attack'&&this.buffs.haste>0?1/1.2:1);
    if(action!=='recall')this.buffs.recall=0;
    this.emit('cast',{spell:i,from:{x:p.x,y:p.y,z:p.z}});
    if(action==='companion'){Object.assign(this.companion,{time:s.duration,attack:0,x:p.x+1.5,y:p.y-.7,z:p.z+1});return true;}
    if(['haste','renew'].includes(action)){this.buffs[action]=s.duration;return true;}
    if(action==='recall'){this.beam.time=0;this.buffs.recall=3;return true;}
    if(action==='shield'){p.ward=SHIELD.duration;p.wardHits=SHIELD.charges;return true;}
    if(action==='blink'){
      let {x:dx,z:dz}=move;if(!dx&&!dz)dz=-1;const l=Math.hypot(dx,dz),wx=(dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw))/l,wz=(-dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))/l;
      for(let n=0;n<38;n++){const level=moveBody(p,wx*s.range/38,wz*s.range/38,.42,p.y-EYE,EYE,p.grounded?.28:0);p.y=Math.max(p.y,level+EYE);}
      p.invuln=.25;p.slow=0;this.emit('blink');return true;
    }
    if(action==='shockwave'){
      this.beam.time=0;
      for(const e of this.enemies){if(e.hp<=0||length(subtract(e,p))>s.range||blocked(p,e))continue;
        const d=distance(p,e)||1,push=['titan','colossus'].includes(e.type)?3:8,dx=(e.x-p.x)/d,dz=(e.z-p.z)/d;
        for(let n=0;n<32;n++)this.moveEnemy(e,dx*push/32,dz*push/32);
        e.freeze=2.4;e.windup=0;e.burstLeft=0;e.dodgeTime=0;if(SPECIES[e.type].flying)e.ground=4;e.aggro=true;
      }
      for(const b of this.projectiles)if(b.team==='enemy'&&length(subtract(b,p))<s.range&&!blocked(p,b))b.life=0;
      this.emit('burst',{at:{x:p.x,y:p.y-EYE+.15,z:p.z},color:s.color,radius:s.range});return true;
    }
    if(action==='drain'){this.beam={time:s.duration,target:null,end:this.trace(s.range).end,broken:false};return true;}
    const dir=this.aim(),seeking=action==='bind'?this.bindTarget():null;this.projectiles.push({id:this.nextId++,team:'player',spell:i,targetId:seeking?.id??null,x:p.x,y:p.y,z:p.z,vx:dir.x*s.speed,vy:dir.y*s.speed,vz:dir.z*s.speed,remaining:s.range,life:s.range/s.speed+.1,age:0,damage:s.damage,radius:action==='bind'?.12:action==='frostburst'?.2:.065,hitIds:new Set(),color:s.color});return true;
  }
  applySpell(e,i){
    if(e.hp<=0)return;const s=SPELLS[i];
    if(s.id==='bind'){e.root=(['titan','colossus'].includes(e.type)?3.5:6)+(this.gear.bind||0);e.dodgeTime=0;e.aggro=true;this.emit('hit',{enemy:e.id});return;}
    let damage=s.damage*this.power();
    if(s.id==='fire'){if(e.type==='ice'){e.shell=false;damage*=1.2;}if(e.type==='ash')damage*=.7;else e.burn=1.2;}
    this.hurtEnemy(e,damage,s.color);
  }
  hurtEnemy(e,amount,color='#fff',tick=false){
    if(e.hp<=0)return 0;if(e.shell)amount*=.6;const actual=Math.min(e.hp,amount);e.hp-=amount;e.aggro=true;e.lastDamage=this.time;if(!tick){e.flash=.1;this.emit('hit',{enemy:e.id,amount:actual,color});}else{e.tickPool=(e.tickPool||0)+actual;e.tickColor=color;}
    for(const ally of this.enemies)if(ally.hp>0&&distance(e,ally)<14)ally.aggro=true;
    if(e.hp<=0){e.hp=0;e.dead=e.wild!==undefined?180:90;e.windup=0;e.burstLeft=0;this.kills++;this.emit('kill',{enemy:e.id});this.recordKill(e);}

    return actual;
  }
  hurtPlayer(amount){
    const p=this.player;if(p.invuln>0)return;p.hp-=amount*this.damageScale*(1-Math.min(.5,this.gear.armor||0));this.buffs.recall=0;p.lastHit=this.time;this.emit('hurt',{amount});
    if(p.hp<=0){this.deaths++;p.hp=p.maxHp;p.mana=p.maxMana;p.invuln=2.5;this.beam.time=0;for(const b of this.projectiles)b.life=0;this.emit('death');}
  }
  updateBeam(dt){
    const b=this.beam,p=this.player,s=SPELLS[4];if(b.time<=0)return;
    b.time-=dt;if(p.mana<5*dt){b.time=0;return;}p.mana-=5*dt;p.lastMana=this.time;
    let e=this.enemies.find(e=>e.id===b.target&&e.hp>0);
    if(b.target!==null){if(!e||length(subtract(e,p))>s.range||blocked(p,e)){b.time=0;b.broken=true;b.target=null;this.emit('beam-break');return;}}
    else {const hit=this.trace(s.range);b.end=hit.end;e=hit.enemy;if(e){b.target=e.id;this.emit('latch',{enemy:e.id});}}
    if(e){b.end={x:e.x,y:e.y,z:e.z};const actual=this.hurtEnemy(e,s.damage*this.power()*dt,s.color,true);p.hp=Math.min(p.maxHp,p.hp+actual*(.65+(this.gear.siphon||0)));if(e.hp<=0)b.time=0;}
  }
  moveEnemy(e,dx,dz){const s=SPECIES[e.type];moveBody(e,dx,dz,s.size*.23,terrain(e.x,e.z),Math.max(1.7,s.size),.3);}
  shoot(e){
    const p=this.player,s=SPECIES[e.type],speed=s.shotSpeed,lead=Math.min(.25,distance(e,p)/speed*.22);
    const aim={x:p.x+p.vx*lead,y:p.y-.4+p.vy*lead*.35,z:p.z+p.vz*lead};
    const dir=normalize(subtract(aim,e));
    this.projectiles.push({id:this.nextId++,team:'enemy',x:e.x,y:e.y,z:e.z,vx:dir.x*speed,vy:dir.y*speed,vz:dir.z*speed,remaining:s.reach,life:s.reach/speed+.1,age:0,damage:e.attackDamage,owner:e.id,radius:e.type==='colossus'?.32:.15,hitIds:new Set(),color:s.color});this.emit('shot',{enemy:e.id});
  }
  planCover(e){
    const p=this.player,s=SPECIES[e.type],radius=s.size*.23,choices=[];
    for(const r of nearbyCover(e.x,e.z,19)){if(distance(e,r)>19||r.top<terrain(r.x,r.z)+s.size*.5+(s.flying?2.6:0)+.2)continue;
      const away=normalize({x:r.x-p.x,y:0,z:r.z-p.z}),side={x:-away.z,z:away.x};
      const back=Math.abs(away.x)*r.w/2+Math.abs(away.z)*r.d/2+radius+.65;
      const extent=Math.abs(side.x)*r.w/2+Math.abs(side.z)*r.d/2+radius+1.5;
      const hide={x:r.x+away.x*back,z:r.z+away.z*back};hide.y=terrain(hide.x,hide.z)+s.size*.5+(s.flying?2.6:0);
      if(!clearBody(hide.x,hide.z,terrain(hide.x,hide.z),radius)||!blocked(p,hide))continue;
      for(const sign of [-1,1]){const peek={x:hide.x+side.x*extent*sign,z:hide.z+side.z*extent*sign};peek.y=terrain(peek.x,peek.z)+s.size*.5+(s.flying?2.6:0);
        if(distance(p,peek)>s.reach*.95||distance(p,peek)<7||!clearBody(peek.x,peek.z,terrain(peek.x,peek.z),radius)||blocked(p,peek))continue;
        choices.push({hide,peek,id:r.id,score:this.enemies.filter(ally=>ally!==e&&ally.hp>0&&ally.coverPlan?.id===r.id).length*12+distance(e,hide)+distance(e,peek)*.25+Math.abs(distance(p,peek)-s.reach*.6)*.2});
      }
    }
    choices.sort((a,b)=>a.score-b.score);return choices[0]||null;
  }
  dodge(e,dt){
    const s=SPECIES[e.type],d=s.dodge;if(!d||e.root>0||e.freeze>0){e.dodgeTime=0;e.threat=null;e.seenFor=0;return false;}
    if(e.dodgeTime>0){e.dodgeTime-=dt;this.moveEnemy(e,e.dodgeX*d.speed*dt*(e.slow>0?.65:1),e.dodgeZ*d.speed*dt*(e.slow>0?.65:1));return true;}
    if(e.dodgeCooldown>0||distance(e,this.player)<8)return false;
    let threat=null;
    for(const b of this.projectiles){if(b.team!=='player'||b.life<=0)continue;const offset=subtract(e,b),speed=Math.hypot(b.vx,b.vy,b.vz),v={x:b.vx/speed,y:b.vy/speed,z:b.vz/speed},along=dot(offset,v),eta=along/speed;
      if(eta<.1||eta>1||length(offset)>35||blocked(b,e))continue;
      const miss=length({x:offset.x-v.x*along,y:offset.y-v.y*along,z:offset.z-v.z*along});if(miss<s.size*.34+.3){threat=b;break;}}
    if(!threat){e.threat=null;e.seenFor=0;return false;}if(e.threat!==threat.id){e.threat=threat.id;e.seenFor=0;}e.seenFor+=dt;if(e.seenFor<d.reaction)return false;
    const l=Math.hypot(threat.vx,threat.vz)||1,sign=(e.id+threat.id)%2?1:-1;e.dodgeX=-threat.vz/l*sign;e.dodgeZ=threat.vx/l*sign;e.dodgeTime=d.duration;e.dodgeCooldown=d.cooldown;e.windup=0;e.burstLeft=0;this.emit('dodge',{enemy:e.id});return true;
  }
  updateRanged(e,dt,visible){
    const s=SPECIES[e.type],p=this.player,d=distance(e,p),speed=s.speed*(e.slow>0?.65:1),radius=s.size*.23;
    e.coverTimer-=dt;e.stateTime-=dt;
    if(s.cover&&e.coverTimer<=0&&(!e.coverPlan||e.aiState==='hide'&&visible||distance(e,e.coverPlan.hide)>24)){
      e.coverPlan=this.planCover(e);e.coverTimer=2.5;if(e.coverPlan){e.aiState='seek';e.stateTime=5;e.waypoint=null;}
    }
    let allowed=false,goal=null;
    if(e.coverPlan){
      if(e.aiState==='seek'||e.aiState==='retreat'){
        goal=e.coverPlan.hide;
        if(distance(e,goal)<.75){e.aiState='hide';e.stateTime=.8+(e.id%3)*.25;e.waypoint=null;}
        else if(e.stateTime<0){e.coverPlan=null;e.coverTimer=1;e.aiState='strafe';}
      }else if(e.aiState==='hide'){
        if(e.stateTime<=0){e.aiState='peek';e.stateTime=3.5;e.waypoint=null;}
      }else if(e.aiState==='peek'){
        goal=e.coverPlan.peek;allowed=visible&&distance(e,goal)<1.3;
        if(e.stateTime<=0){e.aiState='retreat';e.stateTime=5;e.waypoint=null;}
      }
    }else{
      e.aiState='strafe';allowed=visible&&d<s.reach;
      const dx=(p.x-e.x)/(d||1),dz=(p.z-e.z)/(d||1),sign=(Math.floor(this.time/2.5)+e.id)%2?1:-1;
      if(d>s.reach*.8||!visible)goal={x:p.x-dx*s.reach*.6,z:p.z-dz*s.reach*.6};
      else if(d<11)goal={x:e.x-dx*5,z:e.z-dz*5};
      else if(e.type!=='colossus')goal={x:e.x-dz*sign*3,z:e.z+dx*sign*3};
    }
    if(goal&&e.root<=0&&e.windup<=0&&e.burstLeft<=0)navigate(e,goal,speed*dt,radius);
    if(e.burstLeft>0){
      e.burstTimer-=dt;
      if(e.burstTimer<=0){if(visible&&d<s.reach)this.shoot(e);e.burstLeft--;e.burstTimer=.22;
        if(!e.burstLeft){e.attackTimer=s.attack;if(e.coverPlan){e.aiState='retreat';e.stateTime=5;e.waypoint=null;}}}
      return;
    }
    if(e.windup>0){e.windup-=dt;if(e.windup<=0){if(visible&&d<s.reach){e.burstLeft=s.burst;e.burstTimer=0;}else e.attackTimer=.3;}return;}
    e.attackTimer-=dt;
    if(allowed&&e.attackTimer<=0){e.windup=e.type==='colossus'?.8:.35;this.emit('windup',{enemy:e.id});}
  }
  updateEnemies(dt){
    const p=this.player;let engaged=false;
    for(const e of this.enemies){const s=SPECIES[e.type];
      if(e.hp<=0){if(this.respawn){e.dead-=dt;if(e.dead<=0&&(e.wild===undefined||distance(e,p)>60))Object.assign(e,{x:e.homeX,z:e.homeZ,hp:e.maxHp,root:0,slow:0,freeze:0,ground:0,burn:0,quench:0,shell:e.type==='ice',aggro:false,attackTimer:.8,healTimer:3,dodgeTime:0,dodgeCooldown:0,threat:null,seenFor:0,aiState:'idle',coverPlan:null,coverTimer:0,burstLeft:0,windup:0,waypoint:null});}continue;}
      for(const key of ['root','slow','freeze','ground','burn','quench','flash','dodgeCooldown'])e[key]=Math.max(0,e[key]-dt);
      if(e.burn>0)this.hurtEnemy(e,4*this.power()*dt,'#ff9a51',true);if(e.hp<=0)continue;
      const d=distance(e,p);if(d>100){e.aggro=false;continue;}const visible=!blocked(e,p);if(d<32&&visible)e.aggro=true;if(d>95)e.aggro=false;if(e.aggro)engaged=true;
      if(e.type==='healer'&&e.freeze<=0){e.healTimer-=dt;if(e.healTimer<=0){e.healTimer=3.2;for(const ally of this.enemies)if(ally.hp>0&&distance(e,ally)<16)ally.hp=Math.min(ally.maxHp,ally.hp+10*(this.beam.time>0&&this.beam.target===ally.id?.2:1));this.emit('heal',{enemy:e.id});}}
      if(e.wild!==undefined&&distance(e,{x:e.homeX,z:e.homeZ})>55&&d>18){e.aggro=false;e.coverPlan=null;e.windup=0;e.burstLeft=0;}
      if(!e.aggro&&e.wild!==undefined&&e.freeze<=0&&e.root<=0){
        const angle=this.time*.055+e.wild*2.4,goal={x:e.homeX+Math.cos(angle)*e.roam,z:e.homeZ+Math.sin(angle)*e.roam};
        e.aiState='roam';navigate(e,goal,Math.min(1.6,s.speed*.4)*dt,s.size*.23);
      }
      if(this.dodge(e,dt)||!e.aggro||e.freeze>0)continue;
      if(s.ranged){this.updateRanged(e,dt,visible);continue;}
      e.aiState='rush';
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){if(d<s.reach+.5&&Math.abs(e.y-(p.y-.7))<2.1&&visible)this.hurtPlayer(e.attackDamage);e.attackTimer=s.attack;}continue;}
      e.attackTimer-=dt;if(e.root<=0&&d>s.reach*.8)navigate(e,p,s.speed*(e.slow>0?.65:1)*dt,s.size*.23);
      if(d<s.reach&&Math.abs(e.y-(p.y-.7))<2.1&&visible&&e.attackTimer<=0)e.windup=.28;
    }
    for(const e of this.enemies){const s=SPECIES[e.type],hover=s.flying&&e.ground<=0?2.6+(e.root>0?0:Math.sin(this.time*2+e.id)*.25):0;const y=terrain(e.x,e.z)+s.size*.5+hover;e.y+=(y-e.y)*(1-Math.exp(-16*dt));}
    if(!engaged&&this.time-p.lastHit>5)p.hp=Math.min(p.maxHp,p.hp+10*dt);
  }
  explode(b){
    const s=SPELLS[b.spell],radius=s.blast+(this.gear.area||0),at={x:b.x,y:b.y,z:b.z};
    for(const e of this.enemies){
      if(e.hp<=0)continue;const d=length(subtract(e,at));if(d>radius||blocked(at,e))continue;
      e.slow=2.5;if(e.type==='ash')e.quench=5;
      this.hurtEnemy(e,s.damage*this.power()*(1-.5*d/radius)*(e.type==='ash'?1.2:1),s.color);
    }
    this.emit('explosion',{at,color:s.color,radius});
  }
  updateProjectiles(dt){
    const p=this.player;
    for(const b of this.projectiles){if(b.life<=0)continue;
      if(b.targetId!==null&&b.targetId!==undefined){const target=this.enemies.find(e=>e.id===b.targetId&&e.hp>0);if(!target||blocked(b,target))b.targetId=null;else{const desired=normalize(subtract(target,b)),speed=Math.hypot(b.vx,b.vy,b.vz),blend=1-Math.exp(-9*dt),v=normalize({x:b.vx/speed*(1-blend)+desired.x*blend,y:b.vy/speed*(1-blend)+desired.y*blend,z:b.vz/speed*(1-blend)+desired.z*blend});b.vx=v.x*speed;b.vy=v.y*speed;b.vz=v.z*speed;}}
      const old={x:b.x,y:b.y,z:b.z},speed=Math.hypot(b.vx,b.vy,b.vz),step=Math.min(dt,b.remaining/speed),end={x:b.x+b.vx*step,y:b.y+b.vy*step,z:b.z+b.vz*step};
      b.remaining-=speed*step;b.life-=dt;b.age+=dt;const wall=wallHit(old,end);let hit=null;
      if(b.team==='player'){for(const e of this.enemies){if(e.hp<=0)continue;const t=sphereHit(old,end,e,SPECIES[e.type].size*.34+b.radius);if(t!==null&&(wall===null||t<wall)&&(!hit||t<hit.t))hit={t,e};}}
      else{
        if(p.ward>0&&p.wardHits>0){const t=shieldHit(old,end,p,b.radius);if(t!==null&&(wall===null||t<wall))hit={t,shield:true};}
        for(const offset of [.35,.8,1.25]){const t=sphereHit(old,end,{x:p.x,y:p.y-offset,z:p.z},.45+b.radius);if(t!==null&&(wall===null||t<wall)&&(!hit||t<hit.t))hit={t,e:null};}
      }
      if(hit||wall!==null){
        // Offset blast origins onto the incoming side of a surface, so cover reliably occludes splash.
        const fraction=hit?hit.t:wall;Object.assign(b,pointAt(old,end,fraction));
        if(b.team==='player'&&SPELLS[b.spell].blast){const dir=normalize(subtract(end,old));b.x-=dir.x*.04;b.y-=dir.y*.04;b.z-=dir.z*.04;this.explode(b);}
        else if(hit?.shield){p.wardHits--;if(!p.wardHits)p.ward=0;this.emit('block',{at:{x:b.x,y:b.y,z:b.z},yaw:p.yaw,pitch:p.pitch,broken:!p.wardHits});}
        else{
          if(hit&&b.team==='player')this.applySpell(hit.e,b.spell);
          else if(hit){this.hurtPlayer(b.damage);const owner=this.enemies.find(e=>e.id===b.owner);if(owner?.type==='ice')p.slow=1.2;}
          this.emit('impact',{at:{...b},color:b.color});
        }
        b.life=0;continue;
      }
      Object.assign(b,end);if(b.remaining<=0||b.life<=0){if(b.team==='player'&&SPELLS[b.spell].blast)this.explode(b);b.life=0;}
    }
    this.projectiles=this.projectiles.filter(b=>b.life>0);
  }
  update(dt){
    let remaining=Math.min(dt,.1);
    while(remaining>1e-7){const step=Math.min(remaining,1/120);remaining-=step;this.time+=step;this.cooldowns=this.cooldowns.map(n=>Math.max(0,n-step));const p=this.player;
      for(const key of ['invuln','ward','slow'])p[key]=Math.max(0,p[key]-step);
      if(this.time-p.lastMana>.8)p.mana=Math.min(p.maxMana,p.mana+(10+(this.gear.regen||0))*step);
      this.vertical(step);this.aiAccumulator+=step;if(this.aiAccumulator>=1/30-1e-7){this.updateEnemies(this.aiAccumulator);this.aiAccumulator=0;}this.updateProjectiles(step);this.updateBeam(step);this.updateUtility(step);
    }
  }
  bindTarget(){
    const p=this.player,dir=this.aim();let target=null,best=.94;
    for(const e of this.enemies){if(e.hp<=0)continue;const offset=subtract(e,p),d=length(offset);if(d>SPELLS[1].range||blocked(p,e))continue;const score=dot(normalize(offset),dir);if(score>best){target=e;best=score;}}
    return target;
  }
  updateUtility(dt){
    const p=this.player;
    for(const key of ['haste','renew'])this.buffs[key]=Math.max(0,this.buffs[key]-dt);
    if(this.buffs.renew>0)p.hp=Math.min(p.maxHp,p.hp+2*dt);
    if(this.buffs.recall>0){this.buffs.recall=Math.max(0,this.buffs.recall-dt);if(this.buffs.recall===0){Object.assign(p,{x:0,z:8,y:terrain(0,8)+1.7,yaw:0,pitch:0,vy:0,grounded:true,ward:0,invuln:2});this.projectiles=[];this.enemies.forEach(e=>e.aggro=false);this.emit('recall');}}
    const c=this.companion;
    if(c.time>0){c.time-=dt;c.attack-=dt;const desired={x:p.x+Math.cos(p.yaw)*1.8,y:p.y-.65,z:p.z-Math.sin(p.yaw)*1.8};for(const axis of ['x','y','z'])c[axis]+=(desired[axis]-c[axis])*(1-Math.exp(-5*dt));
      if(c.attack<=0){const aimed=this.target(23),e=this.enemies.filter(e=>e.hp>0&&e.aggro&&distance(e,p)<23&&!blocked(c,e)).sort((a,b)=>(a===aimed?-100:distance(a,p))-(b===aimed?-100:distance(b,p)))[0];if(e){this.hurtEnemy(e,6*this.power(),'#a8e4d5',true);e.slow=Math.max(e.slow,1);this.emit('fox-shot',{from:{...c},at:{x:e.x,y:e.y,z:e.z}});}c.attack=.9;}}
    this.exploreTimer-=dt;if(this.exploreTimer<=0){this.explore();this.exploreTimer=.5;}
  }
  travel(index){
    const c=CAMPS[index],p=this.player,range=c.types[0]==='colossus'?45:25;p.x=c.x;p.z=c.z+range;p.y=floorAt(p.x,p.z)+EYE;p.vx=p.vz=p.vy=0;p.grounded=true;p.yaw=0;
    const s=SPECIES[c.types[0]];p.pitch=Math.atan2(terrain(c.x,c.z)+s.size*.5+(s.flying?2.6:0)-p.y,range);p.hp=p.maxHp;p.mana=p.maxMana;p.invuln=2;p.slow=0;this.projectiles=[];this.beam.time=0;this.enemies.forEach(e=>e.aggro=false);
  }
}
