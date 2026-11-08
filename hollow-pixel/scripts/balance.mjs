import { mkdir, readFile, writeFile, appendFile, access, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Game } from '../src/game.js';
import { SPECIES } from '../src/data.js';
import { LESSONS, HUNTS } from '../src/adventure.js';
import { HOME, dist, random, inVillage } from '../src/world.js';
import { BalanceBot, BUILD_IDS, BOT_VERSION, growBuild, resupply } from '../src/balance-bot.js';
import { PASTURE } from '../src/opening.js';

const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(`--${name}`);return i<0?fallback:args[i+1];};
const integer=(name,fallback,min,max)=>{const n=Number(arg(name,fallback));if(!Number.isInteger(n)||n<min||n>max)throw Error(`--${name} must be ${min}..${max}`);return n;};
const seeds=integer('seeds',12,1,100),campaignSeeds=integer('campaign-seeds',1,0,12),startSeed=integer('start-seed',1001,1,1e8),campaignSeconds=integer('campaign-seconds',1800,60,7200),wallCap=integer('max-wall-seconds',1000,10,3600),deathCap=integer('death-cap',24,1,100);
const campaignBuilds=arg('campaign-builds',BUILD_IDS.join(',')).split(',');if(campaignBuilds.some(b=>!BUILD_IDS.includes(b)))throw Error('Unknown campaign build');
const dt=.05,started=performance.now(),runId=new Date().toISOString().replace(/[:.]/g,'-'),out=resolve(arg('out',`artifacts/balance/${runId}`));
await mkdir(out,{recursive:true});
// All outputs are run-owned. Existing records cannot be overwritten/resumed.
const raw=resolve(out,'episodes.jsonl');await writeFile(raw,'',{flag:'wx'});
const sourceFiles=[...(await readdir(resolve('src'))).filter(f=>f.endsWith('.js')).sort().map(f=>`src/${f}`),'scripts/balance.mjs'];
const sources={};for(const file of sourceFiles)sources[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const scenarios=[
  {id:'lone-seedling',player:1,level:1,types:['seedling']},
  {id:'pasture-cluster',player:1,level:1,types:['seedling','seedling','seedling']},
  {id:'briar-road',player:3,level:2,types:['rootknife','seedling']},
  {id:'orchid-ambush',player:3,level:2,types:['petalmaw','seedling']},
  {id:'redleaf-hunters',player:5,level:4,types:['prowler','prowler','prowler']},
  {id:'snowwatch-volley',player:7,level:5,types:['stormbell','stormbell']},
  {id:'deep-wyrms',player:11,level:7,types:['wyrm','glassbrood']},
  {id:'relentless-hunters',player:11,level:8,types:['stalker','grovefang']},
  {id:'crownless-elite',player:16,level:12,types:['glassbrood','glassbrood'],elite:true},
];
const planned=seeds*scenarios.length*BUILD_IDS.length*2+campaignSeeds*campaignBuilds.length;
const manifest={runId,bot:BOT_VERSION,engine:'Game.update, real spells/projectiles/terrain/collision; 50 ms fixed ticks',decisionSeconds:.2,seedStart:startSeed,seeds,campaignSeeds,campaignBuilds,campaignSeconds,deathCap,wallCap,planned,scenarios,builds:BUILD_IDS,policies:['basic (stationary, no spells or consumables)','tactical (movement, spells, tonics, retreat)'],sources,limitations:['Arena fixtures use open ground, fixed loadouts and no safe zones; campaign uses the full authored world.','Rule-based policy is not a human playtester; arena victories and campaign progression are separate measures.','All intervals are descriptive; seeds are paired across builds/policies. No Elo or human difficulty estimate.','No UI/transport latency; game time advances only through real 50 ms ticks.'],status:'running'};
await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
console.log(`Balance run ${runId}\n${planned} planned episodes; wall cap ${wallCap}s; output ${out}`);

function arena(scenario,seed){
  const rng=random(seed),x=1680,y=855;
  const creatures=scenario.types.map((type,i)=>{const angle=(i-(scenario.types.length-1)/2)*.42+(rng()-.5)*.3,d=105+rng()*50;return {id:`arena-${i}`,type,x:x+Math.cos(angle)*d,y:y+Math.sin(angle)*d,homeX:x+Math.cos(angle)*d,homeY:y+Math.sin(angle)*d,level:scenario.level,elite:scenario.elite&&i===0,phase:rng()*6.28};});
  const world={creatures,props:[],interactables:[],ambient:[],places:[],rootwallGroups:[]};
  const g=new Game(null,{world});g.safeZonesEnabled=false;g.wasSafe=false;Object.assign(g.player,{x,y,level:scenario.player,tonics:3});
  return g;
}
function loadout(g,build){
  g.quests.herd=g.player.level>=2?'complete':'active';growBuild(g,build);
  for(const [level,id] of [[2,'reedstaff'],[3,'briarcoat'],[5,'copperwand'],[7,'amberfocus'],[9,'wintercoat'],[11,'cinderstaff'],[14,'eldercharm']])if(g.player.level>=level){g.inventory.push(id);g.equip(id);}
  g.recalculate();g.player.hp=g.player.maxHp;g.player.mana=g.player.maxMana;
}
function meter(g){
  const record={deaths:0,kills:0,casts:{},manaSpent:0,damageTaken:0,tonicsUsed:0,minHp:g.player.hp,manaEmptySeconds:0};
  const cast=g.cast.bind(g),shoot=g.shoot.bind(g),tonic=g.tonic.bind(g);
  g.cast=(...a)=>{const before=g.player.mana,result=cast(...a);record.manaSpent+=Math.max(0,before-g.player.mana);return result;};
  g.shoot=(...a)=>{const before=g.player.mana,result=shoot(...a);record.manaSpent+=Math.max(0,before-g.player.mana);return result;};
  g.tonic=(...a)=>{const before=g.player.tonics,result=tonic(...a);record.tonicsUsed+=before-g.player.tonics;return result;};
  const tick=()=>{for(const e of g.events.splice(0)){if(e.type==='respawn'){record.deaths++;record.minHp=0;}if(e.type==='player-damage')record.damageTaken+=e.amount;if(e.type==='death')record.kills++;if(e.type==='cast')record.casts[e.id]=(record.casts[e.id]||0)+1;}record.minHp=Math.min(record.minHp,g.player.hp);if(g.player.mana<10)record.manaEmptySeconds+=dt;};
  return {record,tick};
}
function fight(scenario,seed,build,policy){
  const g=arena(scenario,seed);loadout(g,build);const bot=new BalanceBot(g,{seed,build,policy}),{record,tick}=meter(g);
  let result='timeout';
  while(g.time<90){g.update(dt,bot.decide());tick();if(record.deaths){result='death';break;}if(g.creatures.every(c=>c.dead)){result='clear';break;}if(g.time>10&&g.creatures.every(c=>!c.aggro)&&g.creatures.some(c=>c.returning)){result='disengaged';break;}}
  return {kind:'arena',scenario:scenario.id,seed,build,policy,result,seconds:g.time,level:g.player.level,endHp:g.player.hp,endMana:g.player.mana,maxHp:g.player.maxHp,maxMana:g.player.maxMana,attributes:g.attributes,equipment:{...g.equipment},learned:[...g.learned],...record};
}

async function campaign(seed,build){
  const g=new Game(),bot=new BalanceBot(g,{seed,build}),{record,tick}=meter(g);g.questAction('herd');
  const turnin=h=>{const npc=g.world.interactables.find(n=>n.name===h.giver);if(!npc)throw Error(`Missing giver ${h.giver}`);return {id:`turnin-${h.id}`,quest:h.id,x:npc.x,y:npc.y+20};};
  const targets=[{id:'herd',...PASTURE.approach},turnin({id:'herd',giver:'Rowan'}),...HUNTS.filter(h=>['briar-road','redleaf-road','snowwatch-road','cinder-road','canopy-road','larder-road','crown-road'].includes(h.id)).flatMap(h=>[...h.camps,turnin(h)])];
  let index=0,returning=false,expeditions=0,lastProgress=0,stalls=0,furthest=0,lastDeaths=0,lastKills=0,nextLog=120;
  let returnGoal=HOME,lastHaven=false;
  const checkpoints=[];
  while(g.time<campaignSeconds){
    if(performance.now()-started>wallCap*1000)break;
    const current=targets[index];if(!current)break;
    if(g.isSafe){
      if(current.quest&&dist(g.player,current)<55)g.questAction(current.quest);
      for(const h of HUNTS)if(g.quests[h.id]==='offered')g.questAction(h.id);
      if(returning||!lastHaven||g.time===0){resupply(g,build);expeditions++;returning=false;}
    }
    lastHaven=g.isSafe;
    const done=current.quest?g.quests[current.quest]==='complete':current.id==='herd'?g.herdCleared:g.cleared.has(current.id);
    if(done){checkpoints.push({id:current.id,time:g.time,level:g.player.level});index++;lastProgress=g.time;if(!targets[index])break;}
    if(!returning&&!g.isSafe&&(g.player.hp<g.player.maxHp*.6&&(g.player.tonics===0||g.potionCooldown>1)||done&&g.player.hp<g.player.maxHp*.65||g.time-lastProgress>240)){
      returning=true;returnGoal=[HOME,...g.world.interactables.filter(i=>i.kind==='hearth'&&inVillage(i))].sort((a,b)=>dist(g.player,a)-dist(g.player,b))[0];
      if(g.time-lastProgress>240){stalls++;lastProgress=g.time;}
    }
    if(record.deaths>lastDeaths){lastDeaths=record.deaths;returning=false;lastProgress=g.time;resupply(g,build);}
    const goal=returning?returnGoal:targets[index];
    g.update(dt,bot.decide({goal,retreat:returning}));tick();furthest=Math.max(furthest,dist(g.player,HOME));
    if(record.kills>lastKills){lastKills=record.kills;lastProgress=g.time;}
    if(g.time>=nextLog){
      const progress={seed,build,seconds:g.time,x:g.player.x,y:g.player.y,level:g.player.level,hp:g.player.hp,mana:g.player.mana,target:targets[index]?.id,returning,goal,route:g.route.slice(0,2),kills:record.kills,deaths:record.deaths,objectives:index};
      await appendFile(resolve(out,'campaign-progress.jsonl'),JSON.stringify(progress)+'\n');
      console.log(`Expedition ${build}: ${(g.time/60).toFixed(0)} min simulated · Lv ${g.player.level} · ${index} objectives · ${record.deaths} deaths`);nextLog+=120;
    }
    if(record.deaths>=deathCap)break;
    // Yield between chunks so Ctrl+C/STOP and background output remain responsive.
    if(Math.round(g.time/dt)%1200===0){if(await stop())break;await new Promise(r=>setImmediate(r));}
  }
  return {kind:'campaign',seed,build,policy:'tactical',result:index===targets.length?'complete':record.deaths>=deathCap?'death-cap':g.time>=campaignSeconds?'time-cap':'stopped',seconds:g.time,level:g.player.level,xp:g.player.xp,checkpoints,camps:[...g.cleared],quests:g.quests,learned:[...g.learned],attributes:g.attributes,furthest,expeditions,stalls,endHp:g.player.hp,endMana:g.player.mana,equipment:{...g.equipment},coins:g.player.coins,...record};
}
const records=[];let stopped=false;
async function save(record){records.push(record);await appendFile(raw,JSON.stringify(record)+'\n');if(records.length%48===0||record.kind==='campaign')console.log(`${records.length}/${planned} · ${((performance.now()-started)/1000).toFixed(1)}s elapsed${record.kind==='campaign'?` · ${record.build}: Lv ${record.level}, ${record.checkpoints.length} objectives, ${record.deaths} deaths`:''}`);}
async function stop(){if(performance.now()-started>wallCap*1000)return true;try{await access(resolve(out,'STOP'));return true;}catch{return false;}}
try{
  for(let n=0;n<seeds;n++)for(const s of scenarios)for(const build of BUILD_IDS)for(const policy of ['basic','tactical']){
    if(await stop()){stopped=true;break;}
    await save(fight(s,startSeed+n,build,policy));
  }
  for(let n=0;n<campaignSeeds;n++)for(const build of campaignBuilds){if(await stop()){stopped=true;break;}const row=await campaign(startSeed+10000+n,build);await save(row);if(row.result==='stopped')stopped=true;}
  manifest.status=stopped?'stopped':'complete';
}catch(error){manifest.status='failed';manifest.error=error.stack;throw error;}
finally{
  manifest.sourceDrift=[];for(const file of sourceFiles)if(createHash('sha256').update(await readFile(file)).digest('hex')!==sources[file])manifest.sourceDrift.push(file);
  manifest.completed=records.length;manifest.wallSeconds=(performance.now()-started)/1000;
  await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2));
  const groups=[];
  for(const s of scenarios)for(const build of BUILD_IDS)for(const policy of ['basic','tactical']){
    const rows=records.filter(r=>r.kind==='arena'&&r.scenario===s.id&&r.build===build&&r.policy===policy);if(!rows.length)continue;
    const average=key=>rows.reduce((a,r)=>a+r[key],0)/rows.length;
    groups.push({scenario:s.id,build,policy,n:rows.length,clears:rows.filter(r=>r.result==='clear').length,deaths:rows.filter(r=>r.result==='death').length,disengaged:rows.filter(r=>r.result==='disengaged').length,seconds:average('seconds'),damage:average('damageTaken'),mana:average('manaSpent'),tonics:average('tonicsUsed')});
  }
  const report=[`# Wilderness balance run ${runId}`,'',`${manifest.status}: ${records.length}/${planned} episodes, ${manifest.wallSeconds.toFixed(1)} seconds wall time. Paired seeds ${startSeed}–${startSeed+seeds-1}.`,'',...manifest.limitations.map(s=>`- ${s}`),'','## Open-ground encounters','','| Encounter | Build | Policy | Clear / n | Deaths | Disengaged | Mean seconds | Damage taken | Aether spent | Tonics |','|---|---|---|---:|---:|---:|---:|---:|---:|---:|',...groups.map(r=>`| ${r.scenario} | ${r.build} | ${r.policy} | ${r.clears}/${r.n} | ${r.deaths} | ${r.disengaged} | ${r.seconds.toFixed(1)} | ${r.damage.toFixed(1)} | ${r.mana.toFixed(1)} | ${r.tonics.toFixed(1)} |`),'','## Full-world expeditions','','| Build | Seed | Result | Minutes | Level | Objectives | Deaths | Furthest from home |','|---|---:|---|---:|---:|---:|---:|---:|',...records.filter(r=>r.kind==='campaign').map(r=>`| ${r.build} | ${r.seed} | ${r.result} | ${(r.seconds/60).toFixed(1)} | ${r.level} | ${r.checkpoints.map(c=>c.id).join(', ')||'none'} | ${r.deaths} | ${r.furthest.toFixed(0)} |`),'','Raw episodes, failed expeditions and source hashes are retained alongside this report.'];
  await writeFile(resolve(out,'report.md'),report.join('\n'),{flag:'wx'});
  await writeFile(resolve(out,'summary.json'),JSON.stringify({groups,campaigns:records.filter(r=>r.kind==='campaign')},null,2),{flag:'wx'});
  console.log(`${manifest.status}: ${records.length}/${planned}; report ${resolve(out,'report.md')}`);
}
