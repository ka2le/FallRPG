import { spawn } from 'node:child_process';
import { mkdir, open, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
const requested=args.indexOf('--out'),out=requested<0?resolve(project,'artifacts/balance',new Date().toISOString().replace(/[:.]/g,'-')):resolve(project,args[requested+1]||'');
if(requested>=0&&!args[requested+1])throw Error('--out needs a directory');
await mkdir(out,{recursive:true});
const log=await open(resolve(out,'progress.log'),'wx');
try{
  const child=spawn(process.execPath,[resolve(project,'scripts/balance.mjs'),...args,...(requested<0?['--out',out]:[])],{cwd:project,detached:true,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
  await new Promise((done,fail)=>{child.once('spawn',done);child.once('error',fail);});
  await writeFile(resolve(out,'owner.json'),JSON.stringify({pid:child.pid,started:new Date().toISOString(),directory:out,log:resolve(out,'progress.log'),args,stop:'Create a file named STOP in this directory. The runner checks it between episodes and every simulated minute.'},null,2),{flag:'wx'});
  child.unref();
  console.log(`Balance runner started in the background (PID ${child.pid}).\nResults: ${out}\nProgress: ${resolve(out,'progress.log')}\nTo stop: create ${resolve(out,'STOP')}`);
}finally{await log.close();}
