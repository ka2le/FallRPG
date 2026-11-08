// Small synthesized soundscape. No streamed audio or external audio assets.
export class Soundscape{
  constructor(){this.enabled=false;this.ctx=null;this.timer=0;}
  async toggle(){if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.13;this.master.connect(this.ctx.destination);}if(this.ctx.state==='suspended')await this.ctx.resume();this.enabled=!this.enabled;this.master.gain.setTargetAtTime(this.enabled?.13:0,this.ctx.currentTime,.15);if(this.enabled)this.chime();return this.enabled;}
  tone(freq,duration=.4,volume=.3,type='sine',delay=0){if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),v=this.ctx.createGain();o.type=type;o.frequency.value=freq;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(volume,t+.02);v.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(v);v.connect(this.master);o.start(t);o.stop(t+duration+.03);}
  chime(){[220,329.63,440,493.88].forEach((f,i)=>this.tone(f,2.8,.11,'sine',i*.44));}
  event(e){if(e.type==='cast'){const f={bind:260,frost:660,ward:440,wave:140,siphon:310,renew:520,blink:880,fox:740,bolt:220,strike:120}[e.id]||330;this.tone(f,.32,.2,e.id==='strike'?'triangle':'sine');this.tone(f*1.5,.4,.10,'sine',.08);}if(e.type==='observation'||e.type==='quest'||e.type==='place'){[392,493.88,587.33].forEach((f,i)=>this.tone(f,.5,.17,'sine',i*.13));}if(e.type==='levelup'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.tone(f,.9,.16,'triangle',i*.11));this.tone(261.63,1.6,.12,'sine',.44);}if(e.type==='hurt')this.tone(90,.22,.2,'triangle');}
  update(dt){if(!this.enabled)return;this.timer-=dt;if(this.timer<0){this.timer=12;this.chime();this.tone(110,7,.05);}}
}
