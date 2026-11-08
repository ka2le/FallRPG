import { mkdir,readdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve,dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Game } from '../src/game.js';
import { SPECIES } from '../src/data.js';
import { LESSONS,HUNTS } from '../src/adventure.js';
import { dist,HOME } from '../src/world.js';
import { PASTURE,BRIAR_CAMPS } from '../src/opening.js';
import { fieldGame } from './balance-fixtures.mjs';

const args=process.argv.slice(2),arg=(k,f)=>{const i=args.indexOf(k);return i<0?f:args[i+1];};
const baseline=arg('--baseline-root',null),seedStart=Number(arg('--start-seed',231001)),wallCap=Number(arg('--max-wall-seconds',360));
if(!Number.isInteger(seedStart)||seedStart<1||!Number.isFinite(wallCap)||wallCap<10||wallCap>900)throw Error('Invalid seed or wall cap');
const engines=[{id:'current',Engine:Game}];if(baseline)engines.unshift({id:'previous',Engine:(await import(pathToFileURL(resolve(baseline,'src/game.js')).href)).Game});
const builds=['power','mana','spells'],policies=['basic','lance'],seeds=8,dt=.05;
const scenarios=[
  {id:'one-sapling',player:1,enemy:1,types:['seedling']},
  {id:'three-saplings',player:1,enemy:1,types:['seedling','seedling','seedling']},
  {id:'one-rootknife',player:1,enemy:1,types:['rootknife']},
  {id:'one-orchid',player:1,enemy:1,types:['petalmaw']},
  {id:'first-road',player:2,enemy:2,types:['rootknife','seedling'],reed:true},
  {id:'first-elite-pack',player:3,enemy:3,types:['rootknife','rootknife','seedling'],elite:true,reed:true},
  {id:'return-saplings-level3',player:3,enemy:1,types:['seedling','seedling','seedling'],reed:true},
  {id:'return-saplings-level5',player:5,enemy:1,types:['seedling','seedling','seedling'],reed:true},
  {id:'root-pair-level3',player:3,enemy:2,types:['rootknife','rootknife'],reed:true},
  {id:'root-pair-level5',player:5,enemy:2,types:['rootknife','rootknife'],reed:true},
  {id:'harder-hunters',player:5,enemy:4,types:['prowler','prowler','prowler'],reed:true},
  {id:'harder-bells',player:5,enemy:5,types:['stormbell','stormbell'],reed:true},
];
const out=resolve('artifacts/progression',new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(out,{recursive:true});
const sources={};for(const file of [...(await readdir('src')).filter(f=>f.endsWith('.js')).map(f=>`src/${f}`),'scripts/check-progression.mjs','scripts/balance-fixtures.mjs']){
  const data=await readFile(file);sources[file]=createHash('sha256').update(data).digest('hex');await mkdir(dirname(resolve(out,'source',file)),{recursive:true});await writeFile(resolve(out,'source',file),data,{flag:'wx'});
}
await writeFile(resolve(out,'source/package.json'),'{"type":"module"}',{flag:'wx'});
const manifest={seedStart,seeds,scenarios,builds,policies,engines:engines.map(e=>e.id),baselineRoot:baseline?resolve(baseline):null,sources,tick:dt,wallCap,planned:engines.length*(seeds*scenarios.length*builds.length*policies.length+builds.length),status:'running',limits:'Low-input policy stands and auto-attacks; lance only adds the next-shot spell when a target needs more than two sparks. No arena potions, shields, kiting, purchased equipment or bounty rewards. Level 2+ fixtures have only the explicitly earned first wand. The full-world road starts fresh and turns in real quests; it may rest at Rowan and use its finite earned tonics. Eight paired fixture orientations, one deterministic full-world route per build, not human win rates.'};
await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});console.log(`${out}\n${manifest.planned} planned probes, ${wallCap}s wall cap`);
const rows=[],started=performance.now();
function grow(g,build){
  while(g.unspentPoints>0){
    if(g.canLearn('surge')){g.learn('surge');continue;}
    if(build==='spells'){
      const lesson=Object.keys(LESSONS).find(id=>g.canLearn(id));if(lesson){g.learn(lesson);continue;}
      const focus=[...g.learned].find(id=>!g.spellUpgrades.has(id));if(focus){g.upgradeSpell(focus);continue;}
    }
    const spent=Object.values(g.attributes).reduce((n,v)=>n+v,0),pattern=build==='power'?['power','power','power','mana']:build==='mana'?['mana','mana','mana','power']:['power','mana'];
    g.spendPoint(pattern[spent%pattern.length]);
  }
}
function lance(g){
  const c=g.creatures.filter(c=>!c.dead&&!SPECIES[c.type].neutral&&!SPECIES[c.type].rootwall&&dist(c,g.player)<175).sort((a,b)=>dist(a,g.player)-dist(b,g.player))[0];
  if(c&&c.hp>g.basicDamage*2&&!g.empowered&&g.player.mana>=38)g.cast('1');
}
function observe(g,m){for(const e of g.events.splice(0)){if(e.type==='respawn')m.deaths++;if(e.type==='player-damage')m.damage+=e.amount;if(e.type==='cast'&&e.id==='surge')m.heavy++;if(e.type==='death')m.kills++;}m.minHp=Math.min(m.minHp,g.player.hp);}
function meter(g){return {damage:0,deaths:0,heavy:0,kills:0,minHp:g.player.hp};}
function fight(s,seed,Engine,build,policy){
  const angle=(seed-seedStart)*Math.PI/4,base=105+(seed-seedStart)%3*9;
  const actors=s.types.map((type,i)=>{const a=angle+(i-(s.types.length-1)/2)*.4,d=base+i*8;return {type,level:s.enemy,elite:s.elite&&i===0,x:3000+Math.cos(a)*d,y:3000+Math.sin(a)*d};});
  const g=fieldGame(actors,{x:3000,y:3000},Engine);g.safeZonesEnabled=false;g.autoAttack=true;g.player.level=s.player;grow(g,build);
  if(s.reed){g.awardItem('reedstaff');g.equip('reedstaff');}g.recalculate();g.player.hp=g.player.maxHp;g.player.mana=g.player.maxMana;const m=meter(g),initial={power:g.spellPower,maxHp:g.player.maxHp,attributes:{...g.attributes},learned:[...g.learned],upgrades:[...g.spellUpgrades],enemyHp:g.creatures.map(c=>c.maxHp)};
  while(g.time<45&&!m.deaths&&!g.creatures.every(c=>c.dead)){if(policy==='lance')lance(g);g.update(dt);observe(g,m);}
  return {kind:'arena',scenario:s.id,seed,build,policy,clear:g.creatures.every(c=>c.dead),seconds:g.time,endHp:g.player.hp,endMana:g.player.mana,hpFraction:m.deaths?0:g.player.hp/g.player.maxHp,initial,...m};
}
async function road(Engine,build){
  const g=new Engine();g.questAction('herd');const rowan=g.world.interactables.find(n=>n.id==='rowan'),goals=[{id:'herd',...PASTURE.approach},{id:'reward',x:rowan.x,y:rowan.y+20},{id:'briar-turn',...BRIAR_CAMPS.turn},{id:'root-hollow',...BRIAR_CAMPS.hollow},{id:'thorn-den',...BRIAR_CAMPS.den},{id:'turnin',x:rowan.x,y:rowan.y+20}];
  const m=meter(g),checkpoints=[];let index=0,nextRoute=0,routeKey=null,tonics=0;
  while(g.time<180&&index<goals.length&&!m.deaths){
    if(performance.now()-started>wallCap*1000)throw Error('Progression audit wall cap');
    const goal=goals[index];grow(g,build);
    if(g.isSafe&&dist(g.player,goal)<55&&(goal.id==='reward'||goal.id==='turnin')){
      if(goal.id==='reward'){g.questAction('herd');g.equip('reedstaff');g.questAction('briar-road');g.rest();}
      else g.questAction('briar-road');
      checkpoints.push({id:goal.id,time:g.time,level:g.player.level,hp:g.player.hp});index++;continue;
    }
    const clear=goal.id==='herd'?g.herdCleared:g.cleared.has(goal.id);
    if(clear){checkpoints.push({id:goal.id,time:g.time,level:g.player.level,hp:g.player.hp});index++;continue;}
    lance(g);if(g.player.hp<g.player.maxHp*.35&&g.player.tonics>0&&!g.potionCooldown){g.tonic();tonics++;}
    const inFight=g.creatures.some(c=>c.aggro&&!c.dead&&!SPECIES[c.type].neutral&&dist(c,g.player)<170);
    if(inFight&&!g.isSafe){g.route=[];g.destination=null;}
    else if(routeKey!==goal.id||!g.route.length&&g.time>=nextRoute){g.navigateTo(goal.x,goal.y);routeKey=goal.id;nextRoute=g.time+1;}
    g.update(dt,{run:true});observe(g,m);
    if(Math.round(g.time/dt)%1200===0)await new Promise(r=>setImmediate(r));
  }
  return {kind:'full-world-road',seed:seedStart,build,policy:'lance',clear:g.quests['briar-road']==='complete',seconds:g.time,checkpoints,level:g.player.level,endHp:g.player.hp,endMana:g.player.mana,tonicsUsed:tonics,tonicsLeft:g.player.tonics,inventory:[...g.inventory],equipment:{...g.equipment},attributes:g.attributes,learned:[...g.learned],...m};
}
try{
  for(let seed=seedStart;seed<seedStart+seeds;seed++)for(const s of scenarios)for(const build of builds)for(const policy of policies)for(const {id,Engine} of engines){
    if(performance.now()-started>wallCap*1000)throw Error('Progression audit wall cap');rows.push({engine:id,...fight(s,seed,Engine,build,policy)});
  }
  console.log(`Arenas ${rows.length} complete in ${((performance.now()-started)/1000).toFixed(1)}s`);
  for(const {id,Engine} of engines)for(const build of builds){const r={engine:id,...await road(Engine,build)};rows.push(r);console.log(`${id} ${build}: ${r.clear?'road clear':r.deaths?'death':'time cap'}, Lv ${r.level}, ${r.checkpoints.length} checkpoints, ${r.tonicsUsed} tonics`);}
  manifest.status='complete';
}catch(error){manifest.status='error';manifest.error=error.stack;process.exitCode=1;}
finally{
  manifest.completed=rows.length;manifest.wallSeconds=(performance.now()-started)/1000;manifest.sourceDrift=[];for(const [f,h]of Object.entries(sources))if(createHash('sha256').update(await readFile(f)).digest('hex')!==h)manifest.sourceDrift.push(f);
  await writeFile(resolve(out,'episodes.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2));
  const lines=['# Early combat and return-trip progression','',`${manifest.status}: ${rows.length}/${manifest.planned} probes, ${manifest.wallSeconds.toFixed(1)} seconds wall time.`,'',manifest.limits,'','| Engine | Fight | Policy | Clears / n | Mean damage taken | Mean seconds | Mean remaining health |','|---|---|---|---:|---:|---:|---:|'];
  for(const {id} of engines)for(const s of scenarios)for(const policy of policies){const a=rows.filter(r=>r.engine===id&&r.scenario===s.id&&r.policy===policy),avg=k=>a.reduce((n,r)=>n+r[k],0)/a.length;lines.push(`| ${id} | ${s.id} | ${policy} | ${a.filter(r=>r.clear).length}/${a.length} | ${avg('damage').toFixed(1)} | ${avg('seconds').toFixed(1)} | ${(avg('hpFraction')*100).toFixed(1)}% |`);}
  lines.push('','## Fresh-world first road','','| Engine | Build | Road cleared | Level | Checkpoints | Deaths | Tonics | Seconds |','|---|---|---|---:|---:|---:|---:|---:|',...rows.filter(r=>r.kind==='full-world-road').map(r=>`| ${r.engine} | ${r.build} | ${r.clear} | ${r.level} | ${r.checkpoints.map(c=>c.id).join(', ')} | ${r.deaths} | ${r.tonicsUsed} | ${r.seconds.toFixed(1)} |`),'','Results include all failures. A road time cap is not a successful expedition. Fixtures at level 3 and 5 measure returning to the same fixed-level early monsters; their XP is declared setup, never granted during the fresh-world road.');
  await writeFile(resolve(out,'report.md'),lines.join('\n'),{flag:'wx'});console.log(out);if(manifest.sourceDrift.length)console.log('Source drift:',manifest.sourceDrift.join(', '));
}
