// Ambient score for Between Seasons, grown from the original four-note chime
// (A3 E4 A4 B4 over a low A). Everything is synthesized; nothing is streamed.
//
//  - composeBar(): pure and deterministic. Returns the notes of one bar.
//  - MusicConductor: pure. Smooths area and health so the music never jumps;
//    a new tune is only chosen at a phrase boundary once an area has settled.
//  - MusicDirector: WebAudio renderer. Tunes share key centre and tempo and
//    crossfade into each other over several bars.

export const BPM=68,BEAT=60/BPM,BAR=BEAT*4,PHRASE_BARS=4;
export const ROOT=57; // A3, the first note of the original chime

export const MODES={
  ionian:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10],
  dorian:[0,2,3,5,7,9,10],aeolian:[0,2,3,5,7,8,10],
};
// Chord shapes as stacked scale degrees above the chord root, in voicing order.
const SHAPES={triad:[0,2,4],sus2:[0,4,8],sus4:[0,3,4],add9:[0,2,4,8],seven:[0,2,4,6],nine:[0,2,4,6,8],six:[0,2,4,5]};

// Every tune is a variation of the same theme in A. The low-health mood keeps
// the progression and swaps to a darker mode of the same root.
export const TUNES={
  hearth:{name:'Hearth',scale:'ionian',low:'aeolian',bell:57,pluck:69,cutoff:1500,pad:1,drone:.9,pluckRate:1,air:.6,shimmer:.22,glass:0,
    a:[[0,'add9'],[3,'add9',0],[5,'seven'],[4,'sus4']],
    b:[[3,'add9'],[4,'triad'],[2,'seven'],[3,'sus2']]},
  spring:{name:'Thaw',scale:'lydian',low:'dorian',bell:69,pluck:76,cutoff:2300,pad:.95,drone:.7,pluckRate:1.3,air:.8,shimmer:.3,glass:.05,
    a:[[0,'add9'],[1,'triad',0],[2,'seven'],[4,'sus2']],
    b:[[4,'add9'],[1,'triad'],[2,'seven'],[4,'sus4']]},
  autumn:{name:'Leaf-fall',scale:'mixolydian',low:'aeolian',bell:57,pluck:69,cutoff:1250,pad:1,drone:1,pluckRate:.9,air:.7,shimmer:.2,glass:0,
    a:[[0,'sus2'],[6,'add9'],[3,'add9',5],[4,'seven']],
    b:[[5,'seven'],[6,'triad'],[3,'sus2'],[4,'sus4']]},
  winter:{name:'Hoarfrost',scale:'dorian',low:'aeolian',bell:69,pluck:76,cutoff:2800,pad:.85,drone:.8,pluckRate:.55,air:.5,shimmer:.32,glass:.09,
    a:[[0,'nine'],[3,'triad',0],[2,'seven'],[6,'six']],
    b:[[4,'seven'],[3,'add9'],[2,'seven'],[4,'sus4']]},
  ember:{name:'Cinder',scale:'aeolian',low:'aeolian',bell:57,pluck:57,cutoff:850,pad:1,drone:1.05,pluckRate:.8,air:.5,shimmer:.14,glass:0,
    a:[[0,'add9'],[5,'seven'],[6,'six'],[4,'sus4']],
    b:[[3,'nine'],[5,'seven'],[2,'seven'],[4,'sus4']]},
};

// Eight phrases of four bars, about 1 min 53 s before the form repeats.
// Every repeat reseeds ornaments, so consecutive loops are not identical.
export const FORM=[
  {name:'intro', prog:'a',melody:['motif',null,'echo',null],          pluck:0,  pad:.75,drone:1,  air:0},
  {name:'theme', prog:'a',melody:['motif','answer','motif','fragment'],pluck:.25,pad:.9, drone:.9, air:0},
  {name:'answer',prog:'a',melody:['motif','answer','motifHigh','cadence'],pluck:.45,pad:1,drone:.8,air:0},
  {name:'bridge',prog:'b',melody:['long','fragment','long','fragment'],pluck:.35,pad:1,  drone:.5, air:1},
  {name:'rise',  prog:'b',melody:['long','echo','long','lift'],        pluck:.55,pad:1,  drone:.6, air:1},
  {name:'return',prog:'a',melody:['ornament','answer','motif','cadence'],pluck:.45,pad:1,drone:.9,air:.5},
  {name:'fall',  prog:'a',melody:['motifLow',null,'motifLow','echo'],  pluck:.15,pad:.85,drone:1,  air:0},
  {name:'breath',prog:'a',melody:['chime',null,null,null],             pluck:0,  pad:.65,drone:1,  air:0},
];
export const LOOP_BARS=FORM.length*PHRASE_BARS;

// Melody roles: [eighth, scale degree (relative to the tune's bell A), velocity, beats].
const MELODY={
  motif:r=>[[0,r,.9],[1,r+4,.74],[2,r+7,.68],[3,r+8,.62]],
  motifHigh:r=>[[0,r+7,.6],[1,r+11,.5],[2,r+14,.45],[3,r+15,.4]],
  motifLow:r=>[[0,r-7,.78,5],[2,r-3,.6],[4,r,.55],[6,r+1,.5]],
  chime:()=>[[0,0,.9],[1,4,.74],[2,7,.68],[3,8,.62]],
  echo:r=>[[4,r+11,.3],[5,r+14,.24]],
  answer:(r,R)=>{const top=R()<.5?r+9:r+11,rhythm=R()<.5?[4,5,6]:[3,5,6];return rhythm.map((e,i)=>[e,top-i,.52-i*.06]);},
  fragment:(r,R)=>R()<.5?[[1,r+11,.46],[2,r+9,.4]]:[[2,r+8,.45],[3,r+7,.4],[6,r+4,.34]],
  long:(r,R)=>[[0,R()<.5?r+9:r+11,.5,5.5],[5,r+8,.3]],
  lift:r=>[[0,r+4,.42],[2,r+7,.46],[4,r+8,.5],[6,r+9,.54]],
  cadence:r=>[[0,r+8,.56],[2,r+7,.5,4],[5,r+4,.4]],
  ornament:r=>[[0,r,.88],[1,r+4,.72],[2,r+7,.66],[3,r+8,.6],[3.5,r+9,.36],[4,r+8,.42,4]],
};
const SPARSE={motif:r=>[[0,r,.8],[2,r+7,.6,5]],motifHigh:r=>[[0,r+7,.55],[2,r+11,.42,5]],ornament:r=>[[0,r,.8],[2,r+7,.6,5]]};

export const midiToFreq=m=>440*2**((m-69)/12);
export function degreeToSemitone(scale,degree){const octave=Math.floor(degree/7),i=degree-octave*7;return scale[i]+octave*12;}
const mod12=n=>((n%12)+12)%12;
function random(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const seedOf=(...values)=>values.reduce((h,v)=>{for(const c of String(v))h=Math.imul(h^c.charCodeAt(0),16777619);return Math.imul(h^0x9e3779b9,2246822519)>>>0;},2166136261);

// Chord tones as MIDI pitches: a bass note plus an upper voicing with no
// semitone clusters. The root is left to the bass under sevenths and ninths.
export function chordVoicing(scale,[degree,shape,bassDegree=degree]){
  const steps=SHAPES[shape],rootSemi=degreeToSemitone(scale,degree);
  const tones=steps.map(s=>degreeToSemitone(scale,degree+s)-rootSemi);
  const extended=steps.some(s=>s===6||s===8)&&shape!=='sus2';
  let bass=45+mod12(degreeToSemitone(scale,bassDegree));if(bass>51)bass-=12;
  const upper=[];let floor=54;
  for(let i=0;i<tones.length;i++){
    if(i===0&&extended&&bassDegree===degree)continue;
    let m=ROOT+mod12(rootSemi+tones[i])-12;while(m<floor)m+=12;
    upper.push(m);floor=m+2;
  }
  return {bass,upper,pcs:[...new Set([bass,...upper].map(mod12))],rootPc:mod12(ROOT+rootSemi),shape};
}

// Keep melody notes away from the chord: no note a semitone above a chord
// tone, no perfect fourth over a chord with a third, no third over a sus4.
function consonant(scale,chord,degree,base){
  const pc=mod12(base+degreeToSemitone(scale,degree));
  if(chord.pcs.includes(pc))return chord.shape!=='sus4'||mod12(pc-chord.rootPc)!==4;
  if(chord.pcs.some(c=>mod12(pc-c)===1))return false;
  const above=mod12(pc-chord.rootPc);
  if(chord.shape==='sus4')return above!==3&&above!==4;
  if(chord.shape!=='sus2'&&above===5)return false;
  return true;
}
function settle(scale,chord,degree,base){for(const step of [0,1,2,-1,-2])if(consonant(scale,chord,degree+step,base))return degree+step;return degree;}

export function composeBar(tuneId,barIndex,loop=0,{low=false}={}){
  const tune=TUNES[tuneId],bar=((barIndex%LOOP_BARS)+LOOP_BARS)%LOOP_BARS;
  const sectionIndex=Math.floor(bar/PHRASE_BARS),inPhrase=bar%PHRASE_BARS,section=FORM[sectionIndex];
  const scale=MODES[low?tune.low:tune.scale],chordDef=tune[section.prog][inPhrase],chord=chordVoicing(scale,chordDef);
  const R=random(seedOf(tuneId,loop,bar,low)),phraseR=random(seedOf(tuneId,loop,sectionIndex,'phrase'));
  const events=[];
  events.push({inst:'pad',beat:0,midi:chord.bass,dur:4.6,vel:section.pad*tune.pad,bass:true});
  for(const m of chord.upper)events.push({inst:'pad',beat:0,midi:m,dur:4.6,vel:section.pad*tune.pad});

  // Bell melody built from the motif.
  let role=section.melody[inPhrase];
  if(low&&role&&!SPARSE[role]&&role!=='chime'&&R()>.45)role=null;
  if(role){
    const r=chordDef[0]>=5?chordDef[0]-7:chordDef[0],base=role==='chime'?ROOT:tune.bell;
    const notes=(low&&SPARSE[role]?SPARSE[role]:MELODY[role])(role==='chime'?0:r,R);
    for(const [eighth,degree,vel,beats=3.2] of notes){
      const d=settle(scale,chord,degree,base);
      let midi=base+degreeToSemitone(scale,d);while(midi>86)midi-=12;
      events.push({inst:'bell',beat:eighth/2,midi,dur:beats,vel:vel*(low?.85:1),pan:(R()-.5)*.7});
    }
  }

  // Soft plucked arpeggio. One rhythm per phrase so the bars belong together.
  const density=section.pluck*tune.pluckRate*(low?.35:1);
  if(density>0){
    const tones=[];for(let m=tune.pluck-3;m<=tune.pluck+14;m++)if(chord.pcs.includes(mod12(m)))tones.push(m);
    const order=phraseR()<.5?1:-1;let at=phraseR()*tones.length|0;
    for(let e=0;e<8;e++)if(phraseR()<density&&tones.length){
      events.push({inst:'pluck',beat:e/2,midi:tones[((at%tones.length)+tones.length)%tones.length],dur:2.2,vel:.32+R()*.18,pan:(R()-.5)*1});
      at+=order;
    }
  }

  // Breathy lead holding chord tones through the bridge.
  if(section.air&&R()<section.air*tune.air*(low?.4:1)){
    const top=chord.upper.filter(m=>m>=60).map(m=>m+12);
    if(top.length){events.push({inst:'air',beat:0,midi:top[R()*top.length|0],dur:3.6,vel:.55});
      if(R()<.6)events.push({inst:'air',beat:2,midi:top[R()*top.length|0],dur:2.4,vel:.45});}
  }
  return {tune:tuneId,bar,section:section.name,sectionIndex,chord,scale,events,drone:section.drone*tune.drone};
}

// Area and health smoothing. Pure, so it can be tested without audio.
export class MusicConductor{
  constructor({tau=6,settle=.65,dwell=32}={}){this.tau=tau;this.settle=settle;this.dwell=dwell;this.weights={};this.tune=null;this.since=0;this.hp=1;this.low=false;this.lowClock=0;}
  prime(area,hp=1){area=TUNES[area]?area:'autumn';this.weights={[area]:1};this.hp=hp;this.low=hp<.38;this.tune=null;}
  observe(area,hpRatio,dt){
    if(!(dt>0))return;
    area=TUNES[area]?area:this.tune||'autumn';
    const k=1-Math.exp(-dt/this.tau);
    for(const id in TUNES){const w=this.weights[id]||0;this.weights[id]=w+((id===area?1:0)-w)*k;}
    this.since+=dt;
    const hp=Math.max(0,Math.min(1,Number.isFinite(hpRatio)?hpRatio:1));
    this.hp+=(hp-this.hp)*(1-Math.exp(-dt/1.5));
    const want=this.low?this.hp<.6:this.hp<.38;
    if(want!==this.low){this.lowClock+=dt;if(this.lowClock>=(this.low?5:2.5)){this.low=want;this.lowClock=0;}}else this.lowClock=0;
  }
  get leader(){let best=this.tune||'autumn',w=-1;for(const id in this.weights)if(this.weights[id]>w){w=this.weights[id];best=id;}return best;}
  // Called at each phrase boundary. Returns a tune id when the music should move.
  nextTune(){
    const lead=this.leader;
    if(!this.tune){this.tune=lead;this.since=0;return lead;}
    if(lead!==this.tune&&this.weights[lead]>=this.settle&&this.since>=this.dwell){this.tune=lead;this.since=0;return lead;}
    return null;
  }
  get heart(){return Math.max(0,Math.min(1,(.42-this.hp)/.25));}
  get cutoff(){return this.hp>=.6?16000:Math.max(900,900*(16000/900)**((this.hp-.15)/.45));}
}

// ---------------------------------------------------------------- rendering
const LEVEL={bell:.15,pad:.034,bass:.05,pluck:.075,air:.04,drone:.075,heart:.3};
const SEND={bell:.55,pad:.35,pluck:.4,air:.5};
// A new tune enters part-way up so the handover never dips; the old one's
// last notes ring out underneath while its bus fades.
const XFADE_IN=7,XFADE_OUT=8,XFADE_FROM=.45,FIRST_FADE=1.5;

function padWave(ctx){const n=8,real=new Float32Array(n),imag=new Float32Array(n);[0,1,.42,.2,.11,.05,.025,.012].forEach((v,i)=>imag[i]=v);return ctx.createPeriodicWave(real,imag);}

class TuneVoice{
  constructor(director,id,time,fade,from=0){
    const ctx=director.ctx;this.director=director;this.id=id;this.tune=TUNES[id];
    this.bus=ctx.createGain();this.send=ctx.createGain();
    for(const g of [this.bus,this.send]){g.gain.setValueAtTime(from,time);g.gain.linearRampToValueAtTime(1,time+fade);}
    this.bus.connect(director.out);this.send.connect(director.fx);
    // Pedal A under everything, as in the original 110 Hz drone.
    this.droneGain=ctx.createGain();this.droneGain.gain.setValueAtTime(0,time);
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=480;filter.Q.value=.3;
    this.drones=[[55,'sine',.6],[110,'triangle',.42],[110.4,'sine',.35]].map(([f,type,level])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;g.gain.value=level;o.connect(g);g.connect(filter);o.start(time);return o;});
    const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=.07;depth.gain.value=.25;lfo.connect(depth);
    const breath=ctx.createGain();breath.gain.value=1;depth.connect(breath.gain);lfo.start(time);this.drones.push(lfo);
    filter.connect(breath);breath.connect(this.droneGain);this.droneGain.connect(this.bus);
  }
  setDrone(level,time){this.droneGain.gain.setTargetAtTime(level*LEVEL.drone,time,2.5);}
  fadeOut(time,duration){
    for(const g of [this.bus,this.send]){g.gain.setValueAtTime(1,time);g.gain.linearRampToValueAtTime(0,time+duration);}
    const end=time+duration+4;for(const o of this.drones)o.stop(end);
    this.drones[0].onended=()=>{this.bus.disconnect();this.send.disconnect();};
  }
}

export class MusicDirector{
  constructor(ctx,{destination,fx},conductor=new MusicConductor()){
    this.ctx=ctx;this.conductor=conductor;
    // Low health closes one lowpass on the dry mix and one on the reverb send.
    const lowpass=()=>{const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=16000;f.Q.value=.4;return f;};
    this.out=ctx.createGain();this.filter=lowpass();this.out.connect(this.filter);this.filter.connect(destination);
    this.fx=ctx.createGain();this.fxFilter=lowpass();this.fx.connect(this.fxFilter);this.fxFilter.connect(fx||destination);
    this.heartBus=ctx.createGain();this.heartBus.gain.value=0;this.heartBus.connect(this.out);
    this.wave=padWave(ctx);this.voice=null;this.nextBar=null;this.bar=0;this.loop=0;this.lastCutoff=16000;this.lastHeart=0;
    this.panners=typeof ctx.createStereoPanner==='function';
  }
  get scale(){const t=this.voice?.tune;return t?MODES[this.conductor.low?t.low:t.scale]:MODES.mixolydian;}
  start(time,area,hp){this.conductor.prime(area,hp);this.nextBar=time+.12;this.bar=0;}
  observe(area,hp,dt){this.conductor.observe(area,hp,dt);}
  stop(time=this.ctx.currentTime){if(this.voice)this.voice.fadeOut(time,1.5);this.voice=null;this.nextBar=null;}
  tick(now,lookahead=1.5){
    if(this.nextBar==null)return;
    if(this.nextBar<now-.05){const skipped=Math.ceil((now-this.nextBar)/BAR);this.nextBar+=skipped*BAR;this.bar+=skipped;}
    const c=this.conductor,cutoff=c.cutoff,heart=c.heart;
    if(Math.abs(cutoff/this.lastCutoff-1)>.03){for(const f of [this.filter,this.fxFilter])f.frequency.setTargetAtTime(cutoff,now,1.4);this.lastCutoff=cutoff;}
    if(Math.abs(heart-this.lastHeart)>.02){this.heartBus.gain.setTargetAtTime(heart,now,1.8);this.lastHeart=heart;}
    while(this.nextBar<now+lookahead){this.playBar(this.nextBar);this.nextBar+=BAR;this.bar++;}
  }
  playBar(time){
    if(this.bar%PHRASE_BARS===0){
      const next=this.conductor.nextTune();
      if(next&&next!==this.voice?.id){const old=this.voice;if(old)old.fadeOut(time,XFADE_OUT);this.voice=old?new TuneVoice(this,next,time,XFADE_IN,XFADE_FROM):new TuneVoice(this,next,time,FIRST_FADE);this.bar=0;}
    }
    if(this.bar>0&&this.bar%LOOP_BARS===0)this.loop++;
    const v=this.voice;if(!v)return;
    const bar=composeBar(v.id,this.bar,this.loop,{low:this.conductor.low});
    v.setDrone(bar.drone,time);
    for(const e of bar.events)this.note(v,e,time+e.beat*BEAT);
    if(this.lastHeart>.02)for(let b=0;b<4;b++){this.thump(time+b*BEAT,1);this.thump(time+b*BEAT+.24,.6);}
  }
  route(v,node,time,end,pan,send){
    const ctx=this.ctx;let out=node;
    if(this.panners&&pan){const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));node.connect(p);out=p;}
    out.connect(v.bus);
    if(send){const s=ctx.createGain();s.gain.value=send;out.connect(s);s.connect(v.send);}
  }
  note(v,e,time){
    const ctx=this.ctx,f=midiToFreq(e.midi),dur=e.dur*BEAT,t=v.tune;
    if(e.inst==='bell'){
      const g=ctx.createGain(),peak=LEVEL.bell*e.vel;g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(peak,time+.018);g.gain.exponentialRampToValueAtTime(.0005,time+dur);
      const o=ctx.createOscillator();o.frequency.value=f;o.connect(g);o.start(time);o.stop(time+dur+.05);
      const partial=(ratio,level,length)=>{if(!level)return;const p=ctx.createOscillator(),pg=ctx.createGain();p.frequency.value=f*ratio;pg.gain.setValueAtTime(level,time);pg.gain.exponentialRampToValueAtTime(.001,time+length);p.connect(pg);pg.connect(g);p.start(time);p.stop(time+length+.05);};
      partial(2,t.shimmer,dur*.45);partial(3.01,t.glass,dur*.3);
      this.route(v,g,time,time+dur,e.pan,SEND.bell);
    }else if(e.inst==='pad'){
      const g=ctx.createGain(),level=(e.bass?LEVEL.bass:LEVEL.pad)*e.vel,filter=ctx.createBiquadFilter(),hold=time+BAR-.15,end=hold+2.4;
      filter.type='lowpass';filter.Q.value=.5;filter.frequency.setValueAtTime(t.cutoff*.6,time);filter.frequency.linearRampToValueAtTime(t.cutoff,time+1.8);filter.frequency.linearRampToValueAtTime(t.cutoff*.7,end);
      g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(level,time+1.4);g.gain.setValueAtTime(level,hold);g.gain.linearRampToValueAtTime(0,end);
      for(const cents of e.bass?[0]:[-7,7]){const o=ctx.createOscillator();if(e.bass)o.type='triangle';else o.setPeriodicWave(this.wave);o.frequency.value=f;o.detune.value=cents;o.connect(filter);o.start(time);o.stop(end+.05);}
      filter.connect(g);this.route(v,g,time,end,0,e.bass?0:SEND.pad);
    }else if(e.inst==='pluck'){
      const g=ctx.createGain(),filter=ctx.createBiquadFilter(),peak=LEVEL.pluck*e.vel;filter.type='lowpass';filter.frequency.value=Math.min(4200,f*4);
      g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(peak,time+.006);g.gain.exponentialRampToValueAtTime(.0005,time+dur);
      const o=ctx.createOscillator();o.type='triangle';o.frequency.value=f;o.connect(filter);filter.connect(g);o.start(time);o.stop(time+dur+.05);
      this.route(v,g,time,time+dur,e.pan,SEND.pluck);
    }else if(e.inst==='air'){
      const g=ctx.createGain(),filter=ctx.createBiquadFilter(),peak=LEVEL.air*e.vel,end=time+dur+1;filter.type='lowpass';filter.frequency.value=1900;
      g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(peak,time+.6);g.gain.setValueAtTime(peak,time+dur);g.gain.linearRampToValueAtTime(0,end);
      const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=4.4;depth.gain.value=7;lfo.connect(depth);lfo.start(time);lfo.stop(end+.05);
      for(const [type,level] of [['triangle',1],['sine',.6]]){const o=ctx.createOscillator(),og=ctx.createGain();o.type=type;o.frequency.value=f;og.gain.value=level;depth.connect(o.detune);o.connect(og);og.connect(filter);o.start(time);o.stop(end+.05);}
      filter.connect(g);this.route(v,g,time,end,.15,SEND.air);
    }
  }
  // Low, felt-more-than-heard heartbeat while health is low.
  thump(time,strength){
    const ctx=this.ctx,o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.setValueAtTime(62,time);o.frequency.exponentialRampToValueAtTime(38,time+.18);
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(LEVEL.heart*strength,time+.012);g.gain.exponentialRampToValueAtTime(.0005,time+.26);
    o.connect(g);g.connect(this.heartBus);o.start(time);o.stop(time+.3);
  }
}
