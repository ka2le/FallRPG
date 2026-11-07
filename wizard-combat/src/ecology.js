import {HABITATS,THAWLINE,ECO_TREES,HOLLOW} from './habitats.js';
import {HAZARDS} from './ecology-layout.js';
import {terrain,acceptsHabitat} from './landscape.js';
import {navigate,clearBody,blocked} from './physics.js';
import {ECO_SPECIES} from './ecology-species.js';
import {SPECIES} from './data.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const sites=new Map(HABITATS.map(h=>[h.id,h]));
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function face(e,x,z,dt){const target=Math.atan2(x-e.x,z-e.z);e.heading=(e.heading||0)+angleDelta(e.heading||0,target)*Math.min(1,dt*6);}
function reachable(h,o){
  // Claspwood roots begin outside the solid trunk, facing the threatened actor.
  const d=dist(h,o)||1,offset=h.kind==='claspwood'?Math.min(d,h.r*.23):0;
  const x=h.x+(o.x-h.x)/d*offset,z=h.z+(o.z-h.z)/d*offset;
  return !blocked({x,y:terrain(x,z)+.65,z},{x:o.x,y:terrain(o.x,o.z)+.65,z:o.z});
}
export function resetEcology(game){
  game.ecology={hazards:HAZARDS.map(h=>({...h,state:'rest',timer:0,phase:0,hits:0})),trees:ECO_TREES.map(t=>({...t,food:1,defense:0,pulse:0})),clock:0};
  const placements=[
    ['barkjaw',-75,-35,'pasture',0],['barkjaw',-70,-35,'pasture',1],
    ['barkjaw',-57,-40,'pasture',2],['rootknife',-87,-48,'pasture',0],
    ['rootknife',HOLLOW.x,HOLLOW.z+25,'elder',0],
    ['barkjaw',-245,-265,'canopy',0],['barkjaw',-240,-265,'canopy',1],
    ['snowkeel',258,311,'seam',0],['snowkeel',261,330,'seam',1],
    ['ventback',THAWLINE.nest.x,THAWLINE.nest.z-4,'seam',0],
    ['scavenger',THAWLINE.cold.x,THAWLINE.cold.z,'seam',0],
    ['mantleback',125,235,'litter',0],['mantleback',134,244,'litter',1],
    ['barkjaw',150,-40,'orchids',0],['barkjaw',156,-40,'orchids',1],
  ];
  for(const [type,sx,sz,site,role] of placements){
    const s=ECO_SPECIES[type];let x=sx,z=sz;
    for(let i=0;i<30&&!clearBody(x,z,terrain(x,z),s.size*.23,s.size);i++){x=sx+Math.cos(i*2.4)*(2+i*.2);z=sz+Math.sin(i*2.4)*(2+i*.2);}
    if(!acceptsHabitat(type,x,z)||!clearBody(x,z,terrain(x,z),s.size*.23,s.size))continue;
    const e=game.spawn(type,x,z,-1,sites.get(site).level);
    Object.assign(e,{eco:site,role,heading:0,routine:'rest',reserveCold:1,reserveWarm:.4,meal:0,ecoClock:0});
  }
}
export function grazerProtected(game,prey){return game.enemies.some(e=>e!==prey&&e.type==='barkjaw'&&e.hp>0&&e.eco===prey.eco&&e.routine==='lookout'&&dist(e,prey)<9&&!blocked(e,prey));}
function walk(e,goal,dt,speed){
  const s=ECO_SPECIES[e.type],dx=goal.x-e.x,dz=goal.z-e.z;
  if(Math.hypot(dx,dz)>.4)face(e,goal.x,goal.z,dt);
  if(e.root>0||e.freeze>0)return;
  if(e.type==='snowkeel'){
    const d=Math.hypot(dx,dz)||1,step=Math.min(d,speed*dt);
    if(!acceptsHabitat('snowkeel',e.x+dx/d*step,e.z+dz/d*step)){e.routine='turn';return;}
  }
  const old={x:e.x,z:e.z};navigate(e,goal,speed*dt*(e.slow>0?.65:1),s.size*.23,dt);
  if(e.type==='snowkeel'&&!acceptsHabitat(e.type,e.x,e.z)){Object.assign(e,old);e.waypoint=null;e.routine='turn';}
}
// Natural damage neither awards player XP nor recruits nearby creatures into a
// fight against the player. Attribution is kept separate from spell damage.
export function hurtWildlife(game,e,damage){
  if(e.hp<=0)return;e.hp=Math.max(0,e.hp-damage);e.flash=.15;
  if(e.hp===0){e.dead=240;e.aggro=false;e.windup=0;e.burstLeft=0;game.emit('ecology-death',{enemy:e.id});}
}
export function updateEcologicalCreature(game,e,dt){
  const s=ECO_SPECIES[e.type];if(!s||!e.eco)return false;
  e.ecoClock+=dt;
  const p=game.player,site=sites.get(e.eco),d=dist(e,p),close=dist(e,site)<site.r+12;
  if(e.freeze>0){e.routine='stunned';e.windup=0;e.huntWindup=0;return true;}
  e.panic=Math.max(0,(e.panic||0)-dt);e.meal=Math.max(0,(e.meal||0)-(e.type==='rootknife'?dt:0));
  // Leash retaliation to the habitat, and keep death recovery free of new attacks.
  const recovery=(p.recovery||0)>0;
  const provoked=game.time-e.lastDamage<12&&d<26&&close;
  const nestDistance=dist(p,THAWLINE.nest);
  const defending=e.type==='ventback'&&nestDistance<(e.aggro?10:7.5)&&Math.abs(p.y-e.y)<5;
  const huntingPlayer=e.type==='rootknife'&&d<(e.aggro?17:10)&&close&&!blocked(e,p);
  const wantsAttack=!recovery&&(provoked||defending||huntingPlayer);
  if(wantsAttack&&!e.aggro&&e.alert===undefined){e.alert=.85;game.emit('ecology-cue',{text:e.type==='ventback'?'The Ventback flares its vents. Back away from the clutch.':e.type==='rootknife'?'The Rootknife lifts its hooks. Keep your distance.':`${s.name} braces to defend itself. Step back.`,at:e});}
  e.aggro=wantsAttack;
  if(e.aggro){
    e.routine=defending?'defend':'attack';e.huntWindup=0;
    if(e.alert>0){e.alert=Math.max(0,e.alert-dt);e.routine='warn';face(e,p.x,p.z,dt);return true;}
    if(e.windup>0){
      e.windup=Math.max(0,e.windup-dt);
      if(e.windup===0){
        const facing=Math.abs(angleDelta(e.strikeHeading??e.heading,Math.atan2(p.x-e.x,p.z-e.z)))<.78;
        if(facing&&d<s.reach+.45&&Math.abs(e.y-p.y)<3&&!blocked(e,p))game.hurtPlayer(e.attackDamage);
        e.attackTimer=s.attack;
      }
      return true;
    }
    e.attackTimer-=dt;face(e,p.x,p.z,dt);
    if(d>s.reach*.8)walk(e,p,dt,s.speed);
    if(d<s.reach&&e.attackTimer<=0){e.windup=s.windup||.75;e.strikeHeading=e.heading;}
    return true;
  }
  e.alert=undefined;e.windup=0;e.aiState='ecology';
  if(e.panic>0){e.routine='flee';walk(e,{x:e.homeX+(e.fleeX||0)*7,z:e.homeZ+(e.fleeZ||0)*7},dt,s.speed);return true;}
  if(e.type==='barkjaw'){
    const food=game.ecology.trees.filter(t=>t.kind==='giftwillow'&&t.food>.12&&dist(t,site)<site.r+5);
    if(!food.length)food.push(...game.ecology.trees.filter(t=>t.kind==='sourheart'&&t.defense<=0&&dist(t,site)<site.r+5));
    const paired=game.enemies.some(a=>a!==e&&a.hp>0&&a.type==='barkjaw'&&a.eco===e.eco&&Math.floor(a.role/2)===Math.floor(e.role/2));
    const feeding=!paired||Math.floor(game.ecology.clock/9)%2===e.role%2;e.routine=feeding?'feed':'lookout';
    const tree=food[Math.floor(e.role/2)%food.length];
    const goal=tree?{x:tree.x+(e.role%2?3.8:0),z:tree.z+4.4}:{x:e.homeX+Math.sin(e.ecoClock*.1)*3,z:e.homeZ};
    if(dist(e,goal)>1){if(feeding)e.routine='graze';walk(e,goal,dt,1.5);}else if(tree){face(e,feeding?tree.x:2*e.x-tree.x,feeding?tree.z:2*e.z-tree.z,dt);if(feeding){if(tree.kind==='giftwillow')tree.food=Math.max(0,tree.food-dt*.028);else{tree.pulse+=dt;if(tree.pulse>2){tree.defense=12;tree.pulse=0;}}}}
  }else if(e.type==='rootknife'){
    let prey=null,best=38;
    if(e.meal<=0)for(const a of game.enemies){if(a.hp<=0||a.type!=='barkjaw'||a.routine!=='feed'||a.eco!==e.eco)continue;const d=dist(a,e);if(d<best&&!grazerProtected(game,a)){prey=a;best=d;}}
    if(prey){
      e.routine='stalk';
      if(e.preyId!==prey.id)e.huntWindup=0;e.preyId=prey.id;
      if(e.huntWindup>0){
        e.routine='strike';e.huntWindup=Math.max(0,e.huntWindup-dt);
        if(e.huntWindup===0){
          if(dist(e,prey)<3.4&&!blocked(e,prey)&&!grazerProtected(game,prey)){
            hurtWildlife(game,prey,14);const length=dist(e,prey)||1;
            Object.assign(prey,{routine:'flee',panic:5,fleeX:(prey.x-e.x)/length,fleeZ:(prey.z-e.z)/length});
            game.emit('ecology-cue',{text:'A Rootknife strikes. The grazer bolts for shelter.',at:e});
          }
          e.meal=9;
        }
      }else{walk(e,prey,dt,3.6);if(dist(e,prey)<3)e.huntWindup=.85;}
    }else{
      e.huntWindup=0;e.preyId=null;e.routine=e.meal>0?'withdraw':'ambush';
      const goal=e.eco==='elder'?{x:HOLLOW.x,z:HOLLOW.z+Math.sin(e.ecoClock*.08)*16}:{x:e.homeX+Math.sin(e.ecoClock*.13)*4,z:e.homeZ};walk(e,goal,dt,1.3);
    }
  }else if(e.type==='scavenger'){
    e.reserveCold=Math.max(0,e.reserveCold-dt*.012);e.reserveWarm=Math.max(0,e.reserveWarm-dt*.012);
    const cold=e.reserveCold<e.reserveWarm,goal=cold?THAWLINE.cold:THAWLINE.warm;e.routine=cold?'cold meal':'warm meal';
    walk(e,goal,dt,2.6);if(dist(e,goal)<2){e.meal+=dt;if(e.meal>3){e[cold?'reserveCold':'reserveWarm']=1;e.meal=0;}}
    else e.meal=0;
  }else if(e.type==='snowkeel'){
    e.routine='burrow';const a=e.ecoClock*.12+e.role*Math.PI,goal={x:258+Math.cos(a)*5,z:319+Math.sin(a)*15};walk(e,goal,dt,2.4);
  }else if(e.type==='ventback'){
    e.routine='nest';const a=e.ecoClock*.1;walk(e,{x:THAWLINE.nest.x+Math.cos(a)*3,z:THAWLINE.nest.z+Math.sin(a)*5},dt,1);
  }else{
    e.routine=Math.sin(e.ecoClock*.2)>.5?'turn litter':'forage';const a=e.ecoClock*.08+e.role*Math.PI;walk(e,{x:site.x+Math.cos(a)*10,z:site.z+Math.sin(a)*9},dt,1.2);
  }
  return true;
}
export function updateEcology(game,dt){
  if(!game.ecology)return;game.ecology.clock+=dt;
  const actors=game.enemies.filter(e=>e.hp>0&&dist(e,game.player)<120);
  if(!(game.player.recovery>0))actors.push(game.player);
  for(const t of game.ecology.trees){
    if(t.kind==='giftwillow')t.food=Math.min(1,t.food+dt*.009);
    if(t.defense>0){t.defense=Math.max(0,t.defense-dt);t.pulse-=dt;
      if(t.pulse<=0){t.pulse=1;const radius=t.kind==='hollowhost'?5:2.4;
        if(dist(t,game.player)<radius&&Math.abs(game.player.y-terrain(t.x,t.z))<6)game.hurtPlayer(t.kind==='hollowhost'?4:3);
        for(const e of actors)if(e!==game.player&&e.hp>0&&dist(t,e)<radius&&Math.abs(e.y-terrain(t.x,t.z))<6)hurtWildlife(game,e,4);
      }
    }
  }
  for(const h of game.ecology.hazards){
    const near=dist(h,game.player)<100;if(!near)continue;
    h.timer=Math.max(0,h.timer-dt);
    const ground=terrain(h.x,h.z),occupants=actors.filter(e=>dist(e,h)<h.r&&Math.abs(e.y-(e===game.player?1.7:SPECIES[e.type].size*.5)-ground)<1.4&&reachable(h,e));
    if(h.state==='rest'&&occupants.length){h.state='warning';h.timer=h.warning=h.kind==='elder'?1.6:1.4;game.emit('ecology-cue',{text:h.kind==='elder'?'The dead wood is breathing. Roots are tightening.':'The fallen vines pull taut. Step away.',at:h});}
    else if(h.state==='warning'&&h.timer<=0){h.state='strike';h.timer=.5;for(const o of occupants){if(o===game.player){game.hurtPlayer(h.kind==='elder'?21:12);if(!(o.recovery>0))o.slow=.7;}else{hurtWildlife(game,o,24);o.root=1.5;}}h.hits++;}
    else if(h.state==='strike'&&h.timer<=0){h.state='recover';h.timer=9;}
    else if(h.state==='recover'&&h.timer<=0){h.state='rest';}
    h.phase=h.state==='warning'?1-h.timer/(h.warning||1.6):h.state==='strike'?1:h.state==='recover'?Math.min(1,h.timer/9)*.25:0;
  }
}
export function interruptRoots(game,at,radius){for(const h of game.ecology?.hazards||[])if(dist(h,at)<radius+h.r&&Math.abs(at.y-terrain(h.x,h.z))<4&&reachable(h,at)){h.state='recover';h.timer=9;h.phase=.25;}}
export function strikeEcology(game,at,spell){
  if(spell===1){interruptRoots(game,at,1);return;}
  if(spell!==0)return;
  for(const t of game.ecology?.trees||[]){
    if(!['sourheart','hollowhost'].includes(t.kind)||dist(t,at)>1.5*t.scale||Math.abs(at.y-terrain(t.x,t.z))>8*t.scale)continue;
    if(t.defense<=0)game.emit('ecology-cue',{text:t.kind==='hollowhost'?'The wounded trunk whistles. Its defenders are waking.':'Bitter sap wells from the wounded Sourheart.',at:t});
    t.defense=10;t.pulse=1;
  }
}
