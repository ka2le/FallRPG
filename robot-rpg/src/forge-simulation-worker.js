import { runForgeSimulation } from './forge-simulator.js';

// The simulation never receives the live game, saves or connection credentials.
// Keep ordinary I/O and asynchronous side effects out of generated test code.
const send=self.postMessage.bind(self);
self.onmessage=event=>{
  const blocked=()=>{throw new Error('Simulation code cannot use networking, storage or timers.');};
  for(const name of ['fetch','WebSocket','EventSource','XMLHttpRequest','importScripts','setTimeout','setInterval','BroadcastChannel'])try{Object.defineProperty(self,name,{value:blocked,configurable:false,writable:false});}catch{/* Unavailable in this worker. */}
  try{send(runForgeSimulation(event.data));}catch(error){send({passed:false,error:String(error.message||error),checks:[],cases:[]});}
};
