import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Game } from '../src/game.js';
import { canWalk, dist } from '../src/world.js';
import { fieldGame } from './balance-fixtures.mjs';
import { PASTURE } from '../src/opening.js';

const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const startSeed=Number(arg('--start-seed',121001)),baseline=arg('--baseline-root',null);
if(!Number.isInteger(startSeed)||startSeed<1)throw Error('Invalid start seed');
const out=resolve('artifacts/opening',new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(out,{recursive:true});
const engines=[{id:'current',Engine:Game}];if(baseline)engines.unshift({id:'previous',Engine:(await import(pathToFileURL(resolve(baseline,'src/game.js')).href)).Game});
const sources={};for(const f of [...(await readdir('src')).filter(f=>f.endsWith('.js')).map(f=>`src/${f}`),'scripts/check-opening.mjs','scripts/balance-fixtures.mjs']){
  const data=await readFile(f);sources[f]=createHash('sha256').update(data).digest('hex');const target=resolve(out,'source',f);await mkdir(dirname(target),{recursive:true});await writeFile(target,data,{flag:'wx'});
}
await writeFile(resolve(out,'source/package.json'),'{"private":true,"type":"module"}',{flag:'wx'});
const manifest={startSeed,seeds:16,engines:engines.map(e=>e.id),baselineRoot:baseline?resolve(baseline):null,sources,tick:.05,wallCap:120,planned:engines.length*98,status:'running',scenarios:['authored opening geometry, stationary basic attacks','authored opening geometry, walking away with basic attacks','six collinear pursuers, attack cooldown held to measure spacing and settling','three ordinary saplings, basic attacks only','five ordinary saplings, basic attacks only','five ordinary saplings, two heavy shots plus basic attacks','actual world: run from Willowmere to each layout’s south pasture edge, then stand and use basic attacks','actual world: backpedal 120 units at first aggro without entering safety or resetting enemies'],limitations:'Fixed hypothesis probes, not human difficulty estimates. No tonics, granted gear or progression. Only the explicitly named five-sapling mana fixture permits two learned heavy shots. Open fixtures retain global ground collision but omit scenery. Full-world smoke uses all authored terrain, actors and rootwalls; relocated layouts use their respective approach goals. Source snapshots and all failures are retained.'};
await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
const rows=[],started=performance.now();
function observe(g,m){for(const e of g.events.splice(0)){if(e.type==='player-damage')m.damage+=e.amount;if(e.type==='respawn')m.deaths++;}for(const c of g.creatures)if(c.aggro&&c.quest!=='herd')m.outsiders.add(c.id);}
try{
  for(let seed=startSeed;seed<startSeed+16;seed++)for(const {id,Engine} of engines){
    const angle=(seed-startSeed)*Math.PI/8,at=(x,y)=>({x:3000+x*Math.cos(angle)-y*Math.sin(angle),y:3000+x*Math.sin(angle)+y*Math.cos(angle)});
    for(const policy of ['stand','walk']){
      const actors=[[-25,-17],[-7,30],[40,-2]].map(([x,y])=>({type:'seedling',...at(x,y),quest:'herd'}));
      actors.push(...[[-150,-140],[-185,-126]].map(([x,y])=>({type:'seedling',...at(x,y),camp:'briar-turn',level:2})),{type:'petalmaw',...at(-90,-235),level:2,opening:true});
      const g=fieldGame(actors,at(0,100),Engine);g.safeZonesEnabled=false;g.autoAttack=true;const m={damage:0,deaths:0,outsiders:new Set()},clearGround=[g.player,...g.creatures].every(c=>canWalk(g.world,c.x,c.y,5));
      let noticed=false,escaped=false;
      while(g.time<35&&!g.herdCleared&&!m.deaths&&!escaped){
        g.update(.05,policy==='walk'?{x:-Math.sin(angle)*80/112,y:Math.cos(angle)*80/112}:{});observe(g,m);
        const herd=g.creatures.filter(c=>c.quest==='herd');noticed||=herd.some(c=>c.aggro);escaped=noticed&&!herd.some(c=>c.aggro)&&herd.some(c=>c.returning);
      }
      rows.push({kind:'opening',seed,engine:id,policy,pass:!m.deaths&&m.damage<=(policy==='stand'?50:90)&&(g.herdCleared||policy==='walk'&&escaped),clear:g.herdCleared,escaped,damage:m.damage,deaths:m.deaths,outsiders:m.outsiders.size,endHp:g.player.hp,seconds:g.time,clearGround});
    }
    for(const [count,heavy,kind] of [[3,0,'sapling-3-basic'],[5,0,'sapling-5-basic'],[5,2,'sapling-5-mana']]){
      const actors=Array.from({length:count},(_,i)=>({type:'seedling',...at(100+Math.cos(i*1.9)*12,Math.sin(i*1.9)*12)})),g=fieldGame(actors,at(0,0),Engine);
      g.safeZonesEnabled=false;g.autoAttack=true;if(heavy)g.learned.add('surge');let used=0;const m={damage:0,deaths:0,outsiders:new Set()};
      while(g.time<25&&!m.deaths&&!g.creatures.every(c=>c.dead)){
        if(used<heavy&&!g.empowered&&!(g.cooldowns.surge>0)){g.cast('1');used++;}g.update(.05);observe(g,m);
      }
      const clear=g.creatures.every(c=>c.dead),basic=rows.find(r=>r.seed===seed&&r.engine===id&&r.kind==='sapling-5-basic');
      const pass=count===3?clear&&!m.deaths&&g.player.hp>=70:heavy?clear&&!m.deaths&&g.player.mana<100&&(basic.deaths>0||g.player.hp>basic.endHp+20):clear||m.deaths>0;
      rows.push({kind,seed,engine:id,pass,clear,damage:m.damage,deaths:m.deaths,endHp:g.player.hp,heavy:used,endMana:g.player.mana,seconds:g.time});
    }
    const g=fieldGame(Array.from({length:6},(_,i)=>({type:'rootknife',...at(130+i*2,0)})),at(0,0),Engine);g.safeZonesEnabled=false;for(const c of g.creatures){c.aggro=true;c.attack=1000;}
    for(let n=0;n<300;n++)g.update(.05);let maxStep=0,travel=0;
    for(let n=0;n<40;n++){const before=g.creatures.map(c=>({x:c.x,y:c.y}));g.update(.05);g.creatures.forEach((c,i)=>{const step=dist(c,before[i]);travel+=step;maxStep=Math.max(step,maxStep);});}
    const gap=Math.min(...g.creatures.flatMap((c,i)=>g.creatures.slice(i+1).map(b=>dist(c,b)))),inReach=g.creatures.every(c=>dist(c,g.player)<53);
    rows.push({kind:'spacing',seed,engine:id,pass:gap>28&&maxStep<.1&&travel/6<.5&&inReach,gap,maxStep,travelPerCreature:travel/6,inReach});
    if(performance.now()-started>120000)throw Error('Opening audit wall cap exceeded');
  }
  for(const {id,Engine} of engines){
    const g=new Engine(),goal=g.snapshot().openingLayout?PASTURE.approach:{x:970,y:640};g.questAction('herd');g.navigateTo(goal.x,goal.y);const m={damage:0,deaths:0,outsiders:new Set()};
    while(g.time<30&&!g.herdCleared&&!m.deaths){g.update(.05,{run:true});observe(g,m);}
    rows.push({kind:'full-world-opening',seed:0,engine:id,goal,pass:g.herdCleared&&!m.deaths&&g.player.hp>=75&&m.outsiders.size===0,clear:g.herdCleared,damage:m.damage,deaths:m.deaths,outsiders:m.outsiders.size,endHp:g.player.hp,seconds:g.time});
    const kite=new Engine();kite.questAction('herd');kite.navigateTo(goal.x,goal.y);let first=null;
    while(kite.time<20&&!first){kite.update(.05,{run:true});if(kite.creatures.some(c=>c.quest==='herd'&&c.aggro))first={x:kite.player.x,y:kite.player.y};}
    let entered=false;for(let n=0;n<30;n++){kite.update(.05,{x:0,y:80/112});entered||=kite.isSafe;}
    const active=kite.creatures.filter(c=>c.quest==='herd'&&!c.dead),moved=first?dist(kite.player,first):0,engaged=active.some(c=>c.aggro),returning=active.some(c=>c.returning);
    rows.push({kind:'full-world-kite',seed:0,engine:id,goal,pass:!!first&&moved>110&&!entered&&engaged&&!returning,first,moved,entered,engaged,returning});
  }
  manifest.status=rows.filter(r=>r.engine==='current').every(r=>r.pass)?'passed':'failed';
}catch(error){manifest.status='error';manifest.error=error.stack;throw error;}
finally{
  manifest.completed=rows.length;manifest.wallSeconds=(performance.now()-started)/1000;await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2));await writeFile(resolve(out,'episodes.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
  const lines=['# Opening and soft spacing audit','',`Current engine: ${manifest.status}. Completed ${rows.length}/${manifest.planned} probes in ${manifest.wallSeconds.toFixed(1)} seconds. Sixteen paired orientation seeds, plus full-world introduction and retreat probes per engine.`, '',manifest.limitations,'','| Engine | Scenario | Pass / n | Mean health lost | Mean closest gap | Mean late travel per creature |','|---|---|---:|---:|---:|---:|'];
  for(const {id} of engines)for(const scenario of ['stand','walk','sapling-3-basic','sapling-5-basic','sapling-5-mana','spacing','full-world-opening','full-world-kite']){
    const a=rows.filter(r=>r.engine===id&&(scenario==='stand'||scenario==='walk'?r.kind==='opening'&&r.policy===scenario:r.kind===scenario)),mean=key=>(a.reduce((sum,r)=>sum+(r[key]||0),0)/a.length).toFixed(2);
    lines.push(`| ${id} | ${scenario} | ${a.filter(r=>r.pass).length}/${a.length} | ${a.some(r=>'damage'in r)?mean('damage'):'—'} | ${a.some(r=>'gap'in r)?mean('gap'):'—'} | ${a.some(r=>'travelPerCreature'in r)?mean('travelPerCreature'):'—'} |`);
  }
  lines.push('','Standing must clear the three-sapling pasture with at least 70 health; the full-world approach must leave at least 75. Walking may clear it or leave its territory alive; fleeing is separate from a clear. The five-sapling basic fixture records a resolved fight; its counterpart must survive using two heavy shots and retain over 20 extra health, or avoid a death suffered by the basic-only player. No fixture uses consumables. Spacing drift is measured over the final two seconds after fifteen seconds of approach/settling. Enemy attacks are held only for that spacing fixture. Opening fights use normal attacks. Full-world outcomes and all failed probes are recorded individually in episodes.jsonl.');
  await writeFile(resolve(out,'report.md'),lines.join('\n'),{flag:'wx'});console.log(out);console.log(lines.slice(6).join('\n'));if(manifest.status!=='passed')process.exitCode=1;
}
