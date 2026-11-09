import { spawn } from 'node:child_process';
import { access, readdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { forgeInstructions, FORGE_MODEL, FORGE_EFFORT } from '../src/forge-ai.js';
import { validateForgeDraft } from '../src/forge.js';

export const GAME_ROOT=fileURLToPath(new URL('../',import.meta.url));
export async function readGameSources(root=GAME_ROOT){
  const sources={};
  for(const dir of ['src','scripts'])for(const name of (await readdir(path.join(root,dir))).sort())if(/\.(js|mjs|css)$/.test(name))sources[`${dir}/${name}`]=await readFile(path.join(root,dir,name),'utf8');
  sources['package.json']=await readFile(path.join(root,'package.json'),'utf8');return sources;
}
export async function resolveCodex(){
  if(process.env.FORGE_CODEX_PATH){const candidate=process.env.FORGE_CODEX_PATH;if(!path.isAbsolute(candidate)||/\.(cmd|bat|ps1)$/i.test(candidate))throw new Error('FORGE_CODEX_PATH must name an absolute native Codex executable.');await access(candidate);return candidate;}
  const name=process.platform==='win32'?'codex.exe':'codex',candidates=(process.env.PATH||'').split(path.delimiter).filter(path.isAbsolute).map(dir=>path.join(dir,name));
  if(process.platform==='win32'&&process.env.LOCALAPPDATA){const dir=path.join(process.env.LOCALAPPDATA,'OpenAI','Codex','bin');try{const versions=await Promise.all((await readdir(dir,{withFileTypes:true})).filter(d=>d.isDirectory()).map(async d=>({file:path.join(dir,d.name,name),mtime:(await stat(path.join(dir,d.name))).mtimeMs})));candidates.push(...versions.sort((a,b)=>b.mtime-a.mtime).map(v=>v.file));}catch{/* Try PATH. */}}
  for(const candidate of candidates)try{if((await stat(candidate)).isFile())return candidate;}catch{/* Next native binary. */}
  throw new Error('Codex executable not found. Install/sign in to Codex or set FORGE_CODEX_PATH.');
}
export function codexArgs(){
  // Same native CLI transport as VSAutocomplete. The full source is supplied as
  // context, so code generation also works when the host blocks shell tools.
  const args=['exec','--ephemeral','--ignore-user-config','--ignore-rules','--strict-config','--sandbox','read-only','--skip-git-repo-check','--color','never','--json','--model',FORGE_MODEL];
  for(const setting of [`model_reasoning_effort="${FORGE_EFFORT}"`,'model_provider="openai"','forced_login_method="chatgpt"','approval_policy="never"','web_search="disabled"','mcp_servers={}','apps._default.enabled=false','project_doc_max_bytes=0','history.persistence="none"','notify=[]','analytics.enabled=false','feedback.enabled=false'])args.push('-c',setting);
  for(const feature of ['shell_tool','shell_snapshot','apps','hooks','plugins','multi_agent','multi_agent_v2','browser_use','computer_use','image_generation','memories','goals','daemon_auto_start','code_mode','code_mode_host'])args.push('--disable',feature);
  args.push('--enable','skip_host_skill_discovery');return [...args,'-'];
}
export function codexEnvironment(source=process.env){const allowed=new Set(['PATH','PATHEXT','SYSTEMROOT','SYSTEMDRIVE','WINDIR','USERPROFILE','HOMEDRIVE','HOMEPATH','HOME','LOCALAPPDATA','APPDATA','TEMP','TMP','LANG','LC_ALL','CODEX_HOME']);return Object.fromEntries(Object.entries(source).filter(([key])=>allowed.has(key.toUpperCase())));}
export async function runCodexForge({messages,draft,phase='build'},signal,{spawnProcess=spawn,executable}={}){
  const valid=validateForgeDraft(draft);
  const sources=await readGameSources();
  const sourceContext=Object.entries(sources).map(([file,content])=>`\n--- ${file} ---\n${content}`).join('\n');
  const prompt=`${forgeInstructions()}\nThe COMPLETE game source follows. Inspect the relevant files DIRECTLY IN THIS CONTEXT for novel behavior. All source files are already readable below, so do not call tools or shell commands. Do not edit source files.\n${sourceContext}\nEND OF GAME SOURCE\nHARNESS PHASE: ${phase.toUpperCase()}\nCurrent draft: ${JSON.stringify(valid)}\nConversation: ${JSON.stringify(messages)}\nRespond ONLY with the JSON object required for the current harness phase.`;
  executable ||= await resolveCodex();
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new Error('Forge request cancelled.'));return;}
    let pending='',final='',failure='',bytes=0,stderr='';
    const child=spawnProcess(executable,codexArgs(),{cwd:GAME_ROOT,env:codexEnvironment(),shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    const abort=()=>{failure='Forge request cancelled or timed out.';child.kill();};
    const timer=setTimeout(abort,180000);signal?.addEventListener('abort',abort,{once:true});
    const line=text=>{if(!text.trim())return;try{const event=JSON.parse(text);if(event.type==='item.completed'&&event.item?.type==='agent_message')final=event.item.text;if(event.type==='error'||event.type==='turn.failed')failure=event.message||event.error?.message||'Codex could not finish this request.';}catch{failure='Unexpected output from Codex.';child.kill();}};
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>4*1024*1024){failure='Codex output was too large.';child.kill();return;}pending+=chunk;const lines=pending.split('\n');pending=lines.pop();for(const value of lines)line(value);});
    child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-12000);});
    child.stdin.on('error',()=>{});
    child.on('error',()=>{failure='Unable to start Codex. Check FORGE_CODEX_PATH.';});
    child.on('close',code=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(pending)line(pending);
      if(failure||code!==0||!final){const detail=failure||stderr;if(/model.*(?:not supported|unavailable|not found|does not exist|not available)/i.test(detail))reject(new Error('GPT-6 Luna is unavailable for this Codex login. No other model was used.'));else if(/auth|login|unauthorized|token.*expired/i.test(detail))reject(new Error('Sign in locally with codex login, then ask Cinder again.'));else reject(new Error(failure||`Codex exited without a draft (${code}). Check codex login and GPT-6 Luna access.`));}else resolve(final);
    });
    child.stdin.end(prompt);
  });
}
export function createForgeMiddleware({generate=runCodexForge,allowedOrigins=[]}={}){
  let busy=false;
  const allowed=new Set(['http://127.0.0.1:5175','http://localhost:5175','http://127.0.0.1:4175','http://localhost:4175',...allowedOrigins,...(process.env.FORGE_ALLOWED_ORIGIN||'').split(',').filter(Boolean)]);
  return async(req,res,next)=>{
    if(req.url?.split('?')[0]!=='/api/forge'){if(next)return next();res.writeHead(404);res.end();return;}
    const origin=req.headers.origin;
    if(origin&&!allowed.has(origin)){res.writeHead(403);res.end(JSON.stringify({error:'This game origin is not allowed by the Forge bridge. Set FORGE_ALLOWED_ORIGIN.'}));return;}
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    if(req.method!=='POST'){res.writeHead(405);res.end(JSON.stringify({error:'Use POST.'}));return;}
    if(!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415);res.end(JSON.stringify({error:'Expected JSON.'}));return;}
    const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort();});
    let ownsLock=false;
    try{
      let body='';for await(const chunk of req){body+=chunk;if(body.length>1000000)throw new Error('Forge request is too large.');}
      const request=JSON.parse(body);if(!Array.isArray(request.messages)||!request.messages.length||request.messages.length>32||request.messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>400000)||request.phase&&!['plan','build','review'].includes(request.phase))throw new Error('Invalid Forge conversation.');
      validateForgeDraft(request.draft);
      if(busy){res.writeHead(429);res.end(JSON.stringify({error:'Cinder is already shaping an item. Try again shortly.'}));return;}
      busy=true;ownsLock=true;const text=await generate(request,abort.signal);if(!res.destroyed){res.writeHead(200);res.end(JSON.stringify({text}));}
    }catch(error){if(!res.destroyed){res.writeHead(400);res.end(JSON.stringify({error:String(error.message).slice(0,400)}));}}
    finally{if(ownsLock)busy=false;}
  };
}
export function forgeVitePlugin(){return {name:'hollow-forge',resolveId(id){if(id==='virtual:forge-source')return '\0virtual:forge-source';},async load(id){if(id==='\0virtual:forge-source')return `export default ${JSON.stringify(await readGameSources())};`;},configureServer(server){server.middlewares.use(createForgeMiddleware());},configurePreviewServer(server){server.middlewares.use(createForgeMiddleware());}};}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.FORGE_PORT)||5176;createServer(createForgeMiddleware()).listen(port,'127.0.0.1',()=>console.log(`The Forge bridge is listening at http://127.0.0.1:${port}. Model: ${FORGE_MODEL}, reasoning: ${FORGE_EFFORT}. Set FORGE_ALLOWED_ORIGIN to your hosted game's origin.`));
}
