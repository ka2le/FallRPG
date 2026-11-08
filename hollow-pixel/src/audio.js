// Synthesized soundscape: an ambient score (music.js) with a quieter effects
// layer underneath it. Effects are snapped to the music's current scale so
// spells and discoveries sit inside the harmony. No external audio assets.
import { MusicDirector, MODES, ROOT, BEAT, midiToFreq, degreeToSemitone } from './music.js';
import { biomeAt } from './world.js';

const MASTER=.55,SFX=.85;
const CAST_NOTES={bind:260,frost:660,ward:440,wave:140,siphon:310,renew:520,blink:880,fox:740,strike:120,surge:392,nova:587,haste:620};
const BOLT_DEGREES=[0,4,7,8,7,4]; // the chime's own notes, walked softly by auto-attacks

export function musicArea(game){
  if(!game?.player)return null;
  if(game.isSafe)return 'hearth';
  return biomeAt(game.player.x,game.player.y);
}

function impulse(ctx,seconds=3.4,decay=2.8){
  const rate=ctx.sampleRate,n=Math.floor(rate*seconds),buffer=ctx.createBuffer(2,n,rate);
  for(let c=0;c<2;c++){const data=buffer.getChannelData(c);let smooth=0;
    for(let i=0;i<n;i++){smooth=smooth*.55+(Math.random()*2-1)*.45;const fadeIn=Math.min(1,i/(rate*.015));data[i]=smooth*fadeIn*(1-i/n)**decay;}}
  return buffer;
}

export class Soundscape{
  constructor(){this.enabled=false;this.ctx=null;this.music=null;this.timer=null;this.state={area:null,hp:1};this.boltStep=0;}
  setup(){
    const ctx=this.ctx=new AudioContext();
    const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=8;limiter.ratio.value=4;limiter.attack.value=.008;limiter.release.value=.35;
    limiter.connect(ctx.destination);
    this.master=ctx.createGain();this.master.gain.value=0;this.master.connect(limiter);
    // Shared space: a soft reverb and a dotted-eighth echo feeding into it.
    const reverb=ctx.createConvolver(),wet=ctx.createGain();reverb.buffer=impulse(ctx);wet.gain.value=.42;reverb.connect(wet);wet.connect(this.master);
    this.fx=ctx.createGain();this.fx.connect(reverb);
    const delay=ctx.createDelay(2),feedback=ctx.createGain(),tone=ctx.createBiquadFilter(),echo=ctx.createGain();
    delay.delayTime.value=BEAT*.75;feedback.gain.value=.32;tone.type='lowpass';tone.frequency.value=2400;echo.gain.value=.35;
    this.fx.connect(delay);delay.connect(tone);tone.connect(feedback);feedback.connect(delay);tone.connect(echo);echo.connect(this.master);echo.connect(reverb);
    this.musicBus=ctx.createGain();this.musicBus.connect(this.master);
    this.music=new MusicDirector(ctx,{destination:this.musicBus,fx:this.fx});
    // Effects: quieter, rounded off, with a little of the same room.
    this.sfx=ctx.createGain();this.sfx.gain.value=SFX;
    const soften=ctx.createBiquadFilter(),room=ctx.createGain();soften.type='lowpass';soften.frequency.value=2600;soften.Q.value=.4;room.gain.value=.3;
    this.sfx.connect(soften);soften.connect(this.master);soften.connect(room);room.connect(reverb);
  }
  async toggle(){
    if(!this.ctx)this.setup();
    if(this.ctx.state==='suspended')await this.ctx.resume();
    this.enabled=!this.enabled;
    const now=this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);this.master.gain.setValueAtTime(this.master.gain.value,now);
    this.master.gain.setTargetAtTime(this.enabled?MASTER:0,now,this.enabled?.3:.15);
    if(this.enabled){this.music.start(now,this.state.area,this.state.hp);this.tick();clearInterval(this.timer);this.timer=setInterval(()=>this.tick(),200);}
    else{clearInterval(this.timer);this.timer=null;this.music.stop(now+.6);}
    return this.enabled;
  }
  tick(){if(this.enabled&&this.ctx)this.music.tick(this.ctx.currentTime);}
  // Nearest note of the current scale's pentatonic core.
  inKey(freq){
    const scale=this.music?.scale||MODES.mixolydian,core=scale[2]===4?[0,1,2,4,5]:[0,2,3,4,6],midi=69+12*Math.log2(freq/440);
    let best=midi,gap=Infinity;
    for(let octave=-4;octave<=4;octave++)for(const d of core){const m=ROOT+scale[d]+octave*12,g=Math.abs(m-midi);if(g<gap){gap=g;best=m;}}
    return midiToFreq(best);
  }
  degree(d,octave=0){const scale=this.music?.scale||MODES.mixolydian;return midiToFreq(ROOT+12*octave+degreeToSemitone(scale,d));}
  tone(freq,duration=.4,volume=.3,type='sine',delay=0,attack=.03){
    if(!this.enabled||!this.ctx)return;
    const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),v=this.ctx.createGain();
    o.type=type;o.frequency.value=freq;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(volume,t+attack);v.gain.exponentialRampToValueAtTime(.001,t+duration);
    o.connect(v);v.connect(this.sfx);o.start(t);o.stop(t+duration+.05);
  }
  thud(volume=.16){
    if(!this.enabled||!this.ctx)return;
    const t=this.ctx.currentTime,o=this.ctx.createOscillator(),v=this.ctx.createGain();
    o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(75,t+.16);
    v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(volume,t+.012);v.gain.exponentialRampToValueAtTime(.001,t+.24);
    o.connect(v);v.connect(this.sfx);o.start(t);o.stop(t+.3);
  }
  event(e){
    if(!this.enabled||!this.ctx)return;
    if(e.type==='cast'){
      if(e.id==='bolt'){const d=BOLT_DEGREES[this.boltStep++%BOLT_DEGREES.length];this.tone(this.degree(d,1),.45,.055,'triangle',0,.008);return;}
      const f=this.inKey(CAST_NOTES[e.id]||330);
      this.tone(f,.5,.11,e.id==='strike'?'triangle':'sine');this.tone(f*2,.6,.035,'sine',.07);
    }
    if(e.type==='observation'||e.type==='quest'||e.type==='place')[7,8,11].forEach((d,i)=>this.tone(this.degree(d),1.1,.085,'sine',i*.16));
    if(e.type==='levelup'){[7,11,14,15,16].forEach((d,i)=>this.tone(this.degree(d),1.4,.08,'sine',i*.13));this.tone(this.degree(0),2,.07,'sine',.5);}
    if(e.type==='hurt')this.thud();
  }
  update(dt,game){
    if(game?.player){this.state.area=musicArea(game)||this.state.area;this.state.hp=game.player.maxHp?game.player.hp/game.player.maxHp:1;}
    if(this.enabled&&this.music)this.music.observe(this.state.area,this.state.hp,dt);
  }
}
