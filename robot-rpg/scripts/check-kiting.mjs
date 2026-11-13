import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Game } from '../src/game.js';
import { dist, canWalk, random } from '../src/world.js';

// A deliberately simple adversary: auto-attack and move directly away. No
// spells, healing, cover, stutter steps, or changes to monster health/damage.
const runId=new Date().toISOString().replace(/[:.]/g,'-'),out=resolve(`artifacts/kiting/${runId}`),started=performance.now();
const seedArg=process.argv.indexOf('--start-seed'),startSeed=seedArg<0?21001:Number(process.argv[seedArg+1]);
if(!Number.isInteger(startSeed)||startSeed<1)throw Error('--start-seed needs a positive integer');
await mkdir(out,{recursive:true});
const sources={};for(const f of [...(await readdir('src')).filter(f=>f.endsWith('.js')).map(f=>`src/${f}`),'scripts/check-kiting.mjs'])sources[f]=createHash('sha256').update(await readFile(f)).digest('hex');
const types=['seedling','rootknife','prowler','petalmaw','stormbell','wyrm'],modes=[{id:'walk',speed:80},{id:'run',speed:112},{id:'boots',speed:112*1.16,gear:'wayboots'}];
const manifest={runId,seeds:[startSeed,startSeed+15],types,modes,distances:[100,175],policies:['retreat-shoot','escape'],tick:.05,decision:.2,episodeSeconds:15,wallCap:60,sources,limitations:'Open-ground, level-one, one-enemy probes. Fixed retreat policy; no player spells or consumables. Escape is separate from a damage-free kill.'};
const rows=[];
for(let seed=startSeed;seed<startSeed+16;seed++)for(const type of types)for(const mode of modes)for(const distance of manifest.distances)for(const policy of manifest.policies){
  if(performance.now()-started>60000)throw Error('Kiting probe exceeded its 60-second wall cap');
  const rng=random(seed),angle=(seed-startSeed)*Math.PI/8+(rng()-.5)*.08,origin={x:3000,y:3000};
  const world={props:[],interactables:[],ambient:[],rootwallGroups:[],creatures:[{id:'probe',type,x:origin.x+Math.cos(angle)*distance,y:origin.y+Math.sin(angle)*distance,homeX:origin.x+Math.cos(angle)*distance,homeY:origin.y+Math.sin(angle)*distance,level:1,phase:0}]};
  const g=new Game(null,{world});Object.assign(g.player,origin);g.wasSafe=false;g.autoAttack=policy==='retreat-shoot';g.safeZonesEnabled=false;
  if(mode.gear){g.inventory.push(mode.gear);g.equip(mode.gear);}const c=g.creatures[0];g.target=c.id;
  let nextDecision=0,input={},damage=0,deaths=0,shots=0,firstHit=null,blockedSeconds=0,noticed=false;
  while(g.time<15){
    if(g.time>=nextDecision){const d=dist(g.player,c)||1;input={x:(g.player.x-c.x)/d,y:(g.player.y-c.y)/d,run:mode.id!=='walk'};
      nextDecision=g.time+.2;}
    const before={x:g.player.x,y:g.player.y};
    // Keyboard vector uses normalized directions. For arbitrary headings, scale
    // the analog magnitude by walking/running speed to reproduce an 80-unit walk.
    const movement=mode.id==='walk'?{x:input.x*80/112,y:input.y*80/112}:input;
    g.update(.05,movement);noticed||=c.aggro;
    if(dist(before,g.player)<mode.speed*.05*.9)blockedSeconds+=.05;
    for(const e of g.events.splice(0)){if(e.type==='player-damage'){damage+=e.amount;firstHit??=g.time;}if(e.type==='respawn')deaths++;if(e.type==='cast')shots++;}
    if(c.dead||deaths||noticed&&!c.aggro&&c.returning)break;
  }
  rows.push({seed,type,mode:mode.id,distance,policy,result:c.dead?'kill':deaths?'death':noticed&&!c.aggro?'escaped':'time-cap',damage,firstHit,shots,seconds:g.time,blockedSeconds,clearGround:canWalk(world,origin.x,origin.y),zeroDamageKill:c.dead&&damage===0});
}
manifest.wallSeconds=(performance.now()-started)/1000;manifest.completed=rows.length;
manifest.pressureRule='Ranged enemies must pressure retreat; melee hunters must pressure walking. A lone early enemy may die before contact; surviving pursuers must still connect. Sprinting may abandon a fight. Pack behavior is checked separately in exploit-audit.';
manifest.pressureFailures=rows.filter(r=>r.policy==='retreat-shoot'&&r.type!=='seedling'&&(r.mode==='walk'||['petalmaw','stormbell','wyrm'].includes(r.type))&&r.result!=='kill'&&r.damage===0&&r.blockedSeconds<=.1).length;
manifest.escapeFailures=rows.filter(r=>r.policy==='escape'&&r.result!=='escaped'&&r.blockedSeconds<=.1).length;
manifest.status=manifest.pressureFailures||manifest.escapeFailures?'failed':'passed';
await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
await writeFile(resolve(out,'episodes.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
const groups=[];for(const type of types)for(const mode of modes)for(const policy of manifest.policies){const a=rows.filter(r=>r.type===type&&r.mode===mode.id&&r.policy===policy);groups.push({type,mode:mode.id,policy,n:a.length,kills:a.filter(r=>r.result==='kill').length,zeroDamageKills:a.filter(r=>r.zeroDamageKill).length,damaged:a.filter(r=>r.damage>0).length,escaped:a.filter(r=>r.result==='escaped').length,meanDamage:a.reduce((s,r)=>s+r.damage,0)/a.length,blocked:a.filter(r=>r.blockedSeconds>.1).length});}
await writeFile(resolve(out,'summary.json'),JSON.stringify(groups,null,2),{flag:'wx'});
const lines=['# Direct-retreat pressure check','',`Run ${runId}: ${rows.length} episodes in ${manifest.wallSeconds.toFixed(2)} seconds. Sixteen paired direction seeds; two starting distances per cell. No spells or tonics.`,'','| Enemy | Movement | Policy | Kills | Damage-free kills | Took damage | Escaped | Mean health lost | Terrain-blocked episodes |','|---|---|---|---:|---:|---:|---:|---:|---:|',...groups.map(g=>`| ${g.type} | ${g.mode} | ${g.policy} | ${g.kills}/${g.n} | ${g.zeroDamageKills}/${g.n} | ${g.damaged}/${g.n} | ${g.escaped}/${g.n} | ${g.meanDamage.toFixed(1)} | ${g.blocked} |`)];
await writeFile(resolve(out,'report.md'),lines.join('\n'),{flag:'wx'});
console.log(out);console.log(lines.slice(4).join('\n'));
console.log(`${manifest.status}: ${manifest.pressureFailures} pressure failures, ${manifest.escapeFailures} escape failures. Raw outcomes retained.`);
if(manifest.status==='failed')process.exitCode=1;
