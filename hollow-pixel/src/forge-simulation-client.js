export function simulateForgeItem(request,signal,{timeoutMs=4000}={}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException('Forge request cancelled.','AbortError'));return;}
    const worker=new Worker(new URL('./forge-simulation-worker.js',import.meta.url),{type:'module'});
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();};
    const abort=()=>{cleanup();reject(new DOMException('Forge request cancelled.','AbortError'));};
    const timer=setTimeout(()=>{cleanup();resolve({passed:false,error:'Item or test code exceeded the simulation time limit. Remove unbounded loops and excessive work.',checks:[],cases:[]});},timeoutMs);
    worker.onmessage=event=>{cleanup();resolve(event.data);};
    worker.onerror=event=>{cleanup();resolve({passed:false,error:`Simulation worker failed: ${event.message}`,checks:[],cases:[]});};
    signal?.addEventListener('abort',abort,{once:true});worker.postMessage(request);
  });
}
