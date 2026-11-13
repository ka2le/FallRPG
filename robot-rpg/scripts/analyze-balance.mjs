import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { random } from '../src/world.js';

const directory=process.argv[2];if(!directory)throw Error('Usage: node scripts/analyze-balance.mjs artifacts/balance/<run-id>');
const root=resolve(directory),manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
const rows=(await readFile(resolve(root,'episodes.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
if(manifest.status==='running')throw Error('Wait for the run to finish before reviewing it.');
if(rows.length!==manifest.completed)throw Error('Manifest and saved episode counts differ.');
const ids=new Set();
for(const row of rows){
  const id=[row.kind,row.scenario||'',row.seed,row.build,row.policy].join('/');
  if(ids.has(id))throw Error(`Duplicate episode ${id}`);ids.add(id);
  if(row.kind==='arena'){
    const scenario=manifest.scenarios.find(s=>s.id===row.scenario);if(!scenario)throw Error(`Unknown scenario ${id}`);
    if(row.result==='clear'&&(row.kills!==scenario.types.length||row.deaths!==0))throw Error(`Clear orientation mismatch ${id}`);
    if(row.result==='death'&&row.deaths!==1)throw Error(`Death orientation mismatch ${id}`);
    if(row.policy==='basic'&&(row.manaSpent!==0||row.tonicsUsed!==0))throw Error(`Baseline resource leak ${id}`);
  }
  if(row.manaSpent<0||row.damageTaken<0||row.endMana<-.001)throw Error(`Invalid resources ${id}`);
}
// Retain matching runtime sources. Changed historical sources are reported and
// never substituted for the hashes recorded at the start of collection.
const retained=[],unavailable=[];
for(const [file,hash] of Object.entries(manifest.sources)){
  let content;try{content=await readFile(resolve(file));}catch{unavailable.push(file);continue;}
  if(createHash('sha256').update(content).digest('hex')!==hash){unavailable.push(file);continue;}
  const target=resolve(root,'source',file);await mkdir(dirname(target),{recursive:true});
  try{await writeFile(target,content,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
  retained.push(file);
}
await mkdir(resolve(root,'source'),{recursive:true});
try{await writeFile(resolve(root,'source/package.json'),JSON.stringify({private:true,type:'module',scripts:{balance:'node scripts/balance.mjs'}}),{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
const arenas=rows.filter(r=>r.kind==='arena'),mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const rng=random(58131),quantile=(sorted,q)=>sorted[Math.floor((sorted.length-1)*q)];
const outcomes=[];
for(const build of manifest.builds){
  const cells=arenas.filter(r=>r.build===build),seeds=[...new Set(cells.map(r=>r.seed))];
  const paired=seeds.map(seed=>{
    const family=cells.filter(r=>r.seed===seed),deltas=[];
    for(const scenario of manifest.scenarios){const a=family.find(r=>r.scenario===scenario.id&&r.policy==='tactical'),b=family.find(r=>r.scenario===scenario.id&&r.policy==='basic');if(a&&b)deltas.push(Number(a.result==='clear')-Number(b.result==='clear'));}
    return deltas.length?mean(deltas):null;
  }).filter(x=>x!==null);
  const samples=[];if(paired.length>1)for(let n=0;n<2000;n++)samples.push(mean(paired.map(()=>paired[Math.floor(rng()*paired.length)])));
  samples.sort((a,b)=>a-b);
  const tactical=cells.filter(r=>r.policy==='tactical'),basic=cells.filter(r=>r.policy==='basic');
  outcomes.push({build,tactical,basic,delta:paired.length?mean(paired):0,interval:samples.length?[quantile(samples,.025),quantile(samples,.975)]:null,groups:paired.length});
}
function ratio(rows,result){return `${rows.filter(r=>r.result===result).length}/${rows.length}`;}
const text=[`# Reviewed balance analysis: ${manifest.runId}`,'',`Run status: **${manifest.status}**. Recorded ${rows.length}/${manifest.planned} episodes. Source hashes and raw outcomes are in the manifest and JSONL; this analysis does not alter them.`,'','## Four growth builds','','| Build | Tactical clears | Basic-only clears | Tactical deaths | Tactical disengagements | Paired clear-rate difference (95% descriptive interval) | Independent seed groups |','|---|---:|---:|---:|---:|---:|---:|',...outcomes.map(r=>`| ${r.build} | ${ratio(r.tactical,'clear')} | ${ratio(r.basic,'clear')} | ${ratio(r.tactical,'death')} | ${ratio(r.tactical,'disengaged')} | ${(r.delta*100).toFixed(1)} pp ${r.interval?`[${r.interval.map(x=>(x*100).toFixed(1)).join(', ')}]`:'[insufficient groups]'} | ${r.groups} |`),'','The interval resamples whole paired seed groups (2,000 bootstrap draws), keeping the encounters and policies within each seed together. It describes this fixed scenario suite and policy comparison. It does not establish human difficulty, build equivalence or superiority over untested strategies. Shared deterministic encounters can produce narrow intervals; scenario coverage remains a separate limitation.','','## Expedition outcomes',''];
for(const r of rows.filter(r=>r.kind==='campaign'))text.push(`- **${r.build}, seed ${r.seed}:** ${r.result}, ${(r.seconds/60).toFixed(1)} simulated minutes, level ${r.level}, ${r.camps.length} named camps, ${r.deaths} deaths, ${r.furthest.toFixed(0)} units furthest from Willowmere. Learned: ${r.learned.join(', ')}. Last objective: ${r.checkpoints.at(-1)?.id||'none'}.`);
text.push('','Campaign samples are individual policy probes and have no human difficulty confidence interval. Death, time and wall caps count as incomplete expeditions. Repeated kills and deaths remain in the record.','','## Resource use','','| Build | Mean tactical aether spent per encounter | Tonics per encounter | Time below 10 aether |','|---|---:|---:|---:|',...outcomes.map(r=>`| ${r.build} | ${mean(r.tactical.map(x=>x.manaSpent)).toFixed(1)} | ${mean(r.tactical.map(x=>x.tonicsUsed)).toFixed(2)} | ${mean(r.tactical.map(x=>x.manaEmptySeconds)).toFixed(1)} seconds |`),'','Inspect per-encounter results in report.md before pooling: a safe disengagement is different from a clear, and an open arena is different from a crowded forest.');
text.splice(4,0,`Audit: unique episode IDs, clear/death orientation, baseline resource use and nonnegative resources checked. Retained ${retained.length}/${Object.keys(manifest.sources).length} matching source files. ${unavailable.length?`Current files differ from this run: ${unavailable.join(', ')}.`:'Runtime sources match the saved hashes.'} ${manifest.sourceDrift?.length?`Source changes during collection: ${manifest.sourceDrift.join(', ')}.`:'No recorded source drift during collection.'}`,'');
const path=resolve(root,`analysis-${new Date().toISOString().replace(/[:.]/g,'-')}.md`);await writeFile(path,text.join('\n'),{flag:'wx'});console.log(path);
