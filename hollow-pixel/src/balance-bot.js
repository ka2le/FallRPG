import { SPECIES, SPELL_BY_ID } from './data.js';
import { LESSONS, GEAR } from './adventure.js';
import { canWalk, dist, lineClear, propsNear } from './world.js';

export const BOT_VERSION='wilderness-v7';
export const BUILD_IDS=['power','mana','spells','balanced'];
export function growBuild(game,build){
  if(build==='capacity'||build==='recovery')build='mana';
  while(game.unspentPoints>0){
    const spent=Object.values(game.attributes).reduce((a,b)=>a+b,0);
    const plans={power:['surge','ward','nova','haste','renew'],mana:['surge','ward','nova','haste','renew'],spells:Object.keys(LESSONS),balanced:Object.keys(LESSONS)};
    const lesson=plans[build].find(id=>game.canLearn(id));if(lesson){game.learn(lesson);continue;}
    const focuses=build==='spells'?Object.keys(LESSONS):build==='power'||build==='mana'?['surge']:build==='balanced'&&game.player.level>=5?['surge','nova']:[];
    const focus=focuses.find(id=>game.learned.has(id)&&!game.spellUpgrades.has(id));if(focus){game.upgradeSpell(focus);continue;}
    const choices={power:['power','power','power','mana'],mana:['mana','mana','mana','power'],spells:['mana','power'],balanced:['power','mana']};
    game.spendPoint(choices[build][spent%choices[build].length]);
  }
}
export function resupply(game,build){
  if(!game.isSafe)return;
  growBuild(game,build);
  // Only legal, earned gear and affordable supplies.
  const score=item=>{const s=item.stats;return item.slot==='weapon'?(s.power||0)*4+(s.damage||0)*.1:item.slot==='robe'?(s.armor||0)*5+(s.health||0)*.015:item.slot==='boots'?(s.speed||0)*5+(s.health||0)*.01:(s.power||0)*(build==='power'?3:1)+(s.mana||0)*(build==='mana'?.03:.01)+(s.regen||0)*(build==='mana'?.8:.3)+(s.health||0)*.005;};
  const equipBest=()=>{for(const slot of ['weapon','robe','boots','charm']){const best=game.inventory.filter(id=>GEAR[id].slot===slot).sort((a,b)=>score(GEAR[b])-score(GEAR[a]))[0];if(best)game.equip(best);}};
  equipBest();
  for(const id of ['copperwand','wayboots','mosscharm'])if(!game.equipment[GEAR[id].slot]||score(GEAR[id])>score(GEAR[game.equipment[GEAR[id].slot]]))game.buyGear(id);
  equipBest();
  // Preserve an upgrade reserve instead of spending every coin on four tonics.
  const reserve=game.player.level>=3&&!game.inventory.includes('copperwand')?30:0;
  while(game.player.tonics<2&&game.player.coins>=12+reserve)game.buyTonic('coins');
  game.rest();
}

// A deterministic, fixed-work policy. It sees nearby living actors and terrain;
// it never reads future attacks, hidden RNG, or enemies through solid cover.
export class BalanceBot{
  constructor(game,{build='balanced',policy='tactical',seed=1}={}){this.game=game;this.build=build;this.policy=policy;this.side=seed%2?1:-1;this.nextDecision=0;this.input={};this.retreating=false;}
  cast(id){const g=this.game,s=SPELL_BY_ID[id],reserved=g.empowered?SPELL_BY_ID[g.empowered].cost:0;if(!g.learned.has(id)||g.cooldowns[id]>0||g.player.mana-reserved<s.cost)return false;const slot=Object.keys(g.bindings).find(k=>g.bindings[k]===id);return slot?g.cast(slot):false;}
  decide({goal=null,retreat=false}={}){
    const g=this.game,p=g.player;g.autoAttack=true;
    if(g.time<this.nextDecision)return this.input;
    this.nextDecision=g.time+.2;
    growBuild(g,this.build);
    if(this.policy==='basic'){this.input={};return this.input;}
    const visible=g.creatures.filter(c=>!c.dead&&!SPECIES[c.type].neutral&&(!SPECIES[c.type].rootwall||c.provoked)&&dist(c,p)<360&&lineClear(g.world,p,c));
    const engaged=visible.filter(c=>c.aggro),close=visible.filter(c=>dist(c,p)<112);
    const enemies=[...engaged,...visible.filter(c=>!c.aggro&&(!goal||dist(c,goal)<160||dist(c,p)<180&&c.level<=p.level+1))].sort((a,b)=>(a.aggro?-150:0)+dist(a,p)+a.hp*.15-((b.aggro?-150:0)+dist(b,p)+b.hp*.15));
    const target=enemies[0];if(target)g.target=target.id;
    if(g.empowered==='surge'&&(retreat||p.hp<p.maxHp*.4))g.cancelCast();
    if(p.hp<p.maxHp*.48)g.tonic();
    const danger=engaged.length>0;
    if(danger&&!this.anchor)this.anchor={x:p.x,y:p.y};if(!danger)this.anchor=null;
    // Commit the escape before maintenance spells can consume its mana.
    if((retreat||p.hp<p.maxHp*.5)&&danger&&!(p.haste>0))this.cast('haste');
    if(danger&&p.hp<p.maxHp*.65&&p.renew<=0)this.cast('renew');
    if(danger&&p.shield<8&&(p.hp<p.maxHp*.8||engaged.length>=2))this.cast('ward');
    this.retreating=retreat;
    if(!g.empowered&&danger&&close.length>=2&&close.some(c=>!SPECIES[c.type].ranged&&!c.root)&&(retreat||p.hp<p.maxHp*.75))this.cast('bind');
    if(close.length>=2&&!g.empowered)this.cast('nova');
    if(danger&&g.learned.has('fox')&&!g.fox&&engaged.some(c=>c.hp>70))this.cast('fox');
    const savingForArea=engaged.length>=2&&g.learned.has('nova')&&!(g.cooldowns.nova>0)&&p.mana-SPELL_BY_ID.surge.cost<SPELL_BY_ID.nova.cost;
    if(!savingForArea&&!g.empowered&&target&&dist(target,p)<180&&target.hp>g.basicDamage*1.5&&(!danger||p.shield>0||p.mana>65))this.cast('surge');
    const ranged=engaged.find(c=>SPECIES[c.type].ranged);
    if(!retreat&&ranged&&(p.hp<p.maxHp*.7||p.mana<p.maxMana*.3)&&g.time>=(this.nextCover||0)){
      const candidates=[];
      for(const prop of propsNear(g.world,p.x,p.y,110)){
        if(!prop.solid||prop.removed||prop.clasp)continue;const d=dist(prop,ranged)||1;
        const candidate={x:prop.x+(prop.x-ranged.x)/d*(prop.solid+18),y:prop.y+(prop.y-ranged.y)/d*(prop.solid+18)};
        if(dist(p,candidate)<140&&canWalk(g.world,candidate.x,candidate.y,9)&&!lineClear(g.world,ranged,candidate))candidates.push(candidate);
      }
      const cover=candidates.sort((a,b)=>dist(p,a)-dist(p,b))[0];
      if(cover){g.navigateTo(cover.x,cover.y);this.coverUntil=g.time+1.8;this.nextCover=g.time+4;}
    }
    if(this.coverUntil>g.time&&g.route.length&&!retreat){this.input={run:true};return this.input;}
    if(goal&&(!target||retreat)){
      const key=`${Math.round(goal.x)},${Math.round(goal.y)}`;
      if(dist(p,goal)>25&&(this.routeKey!==key||!g.route.length&&g.time>(this.nextRoute||0))){g.navigateTo(goal.x,goal.y);this.routeKey=key;this.nextRoute=g.time+3;}
      if(g.route.length){this.input={run:true};return this.input;}
    }
    let vector=goal?{x:goal.x-p.x,y:goal.y-p.y}:null;
    if(target&&!retreat){
      const d=dist(target,p),novaApproach=engaged.length>=2&&g.learned.has('nova')&&p.mana>=SPELL_BY_ID.nova.cost;
      const desired=novaApproach?85:SPECIES[target.type].ranged?150:105;
      if(d<desired&&!target.root){vector={x:p.x-target.x-(target.y-p.y)*this.side*.7,y:p.y-target.y+(target.x-p.x)*this.side*.7};}
      else if(d>(novaApproach?100:165)){vector={x:target.x-p.x,y:target.y-p.y};}
      else vector={x:-(target.y-p.y)*this.side*.35,y:(target.x-p.x)*this.side*.35};
      if(this.anchor&&dist(p,this.anchor)>210){vector.x+=(this.anchor.x-p.x)*1.4;vector.y+=(this.anchor.y-p.y)*1.4;}
    }
    if(vector){
      const length=Math.hypot(vector.x,vector.y)||1,angle=Math.atan2(vector.y,vector.x);
      let best=null;
      for(const offset of [0,.5,-.5,1,-1,1.6,-1.6,2.2,-2.2]){
        const x=Math.cos(angle+offset),y=Math.sin(angle+offset);
        if(canWalk(g.world,p.x+x*22,p.y+y*22,9)&&canWalk(g.world,p.x+x*10,p.y+y*10,9)){best={x:x*Math.min(1,length/18),y:y*Math.min(1,length/18),run:true};break;}
      }
      this.input=best||{};
    }else this.input={};
    return this.input;
  }
}
