import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNES,MODES,FORM,LOOP_BARS,BAR,PHRASE_BARS,ROOT,composeBar,chordVoicing,degreeToSemitone,MusicConductor} from '../src/music.js';

const mod12=n=>((n%12)+12)%12;
const progressions=id=>[...TUNES[id].a,...TUNES[id].b];

test('the loop is long and every tune opens with the original chime notes', () => {
  assert.ok(LOOP_BARS*BAR>100,'one pass of the form lasts well over a minute and a half');
  for(const id in TUNES){
    const bell=composeBar(id,0,0).events.filter(e=>e.inst==='bell').map(e=>mod12(e.midi));
    assert.deepEqual(bell,[9,4,9,11],`${id} intro states A E A B`);
    const breath=FORM.findIndex(s=>s.name==='breath')*PHRASE_BARS;
    assert.deepEqual(composeBar(id,breath,0).events.filter(e=>e.inst==='bell').map(e=>e.midi),[ROOT,ROOT+7,ROOT+12,ROOT+14],`${id} recalls the chime at its original pitch`);
  }
});

test('chords keep perfect fifths and no semitone clusters in every mode and mood', () => {
  for(const id in TUNES)for(const mode of [TUNES[id].scale,TUNES[id].low]){
    const scale=MODES[mode];
    for(const chord of progressions(id)){
      const [degree,shape]=chord,root=degreeToSemitone(scale,degree);
      if(shape!=='sus2'&&shape!=='sus4')assert.equal(degreeToSemitone(scale,degree+4)-root,7,`${id} ${mode} chord on degree ${degree} has a perfect fifth`);
      const v=chordVoicing(scale,chord),notes=[...v.upper].sort((a,b)=>a-b);
      for(let i=1;i<notes.length;i++)assert.ok(notes[i]-notes[i-1]>=2,`${id} ${mode} ${degree}/${shape} has no semitone cluster`);
      assert.ok(v.bass>=40&&v.bass<=51&&notes[0]>=54&&notes.at(-1)<=79,`${id} ${mode} voicing stays in register`);
    }
  }
});

test('melody and arpeggios stay in the scale and never sit a semitone above the chord', () => {
  for(const id in TUNES)for(const low of [false,true])for(let loop=0;loop<3;loop++)for(let bar=0;bar<LOOP_BARS;bar++){
    const b=composeBar(id,bar,loop,{low}),scalePcs=b.scale.map(s=>mod12(ROOT+s));
    for(const e of b.events){
      assert.ok(scalePcs.includes(mod12(e.midi)),`${id} bar ${bar} ${e.inst} ${e.midi} is in the scale`);
      assert.ok(e.beat>=0&&e.beat<4&&e.vel>0&&e.vel<=1.2,'event timing and velocity are sane');
      if(e.inst==='bell'){
        assert.ok(e.midi<=86,'bells never get shrill');
        const pc=mod12(e.midi);
        if(!b.chord.pcs.includes(pc))assert.ok(!b.chord.pcs.some(c=>mod12(pc-c)===1),`${id} bar ${bar} bell ${e.midi} avoids a minor ninth`);
      }
    }
  }
});

test('composition is deterministic per loop but varies between loops', () => {
  const sig=(loop)=>Array.from({length:LOOP_BARS},(_,bar)=>composeBar('autumn',bar,loop).events.map(e=>`${e.inst}${e.midi}@${e.beat}`).join()).join('|');
  assert.equal(sig(0),sig(0));
  assert.notEqual(sig(0),sig(1));
});

test('low health keeps the progression but darkens and thins it', () => {
  let normal=0,low=0;
  for(let bar=0;bar<LOOP_BARS;bar++){
    const a=composeBar('hearth',bar,0),b=composeBar('hearth',bar,0,{low:true});
    assert.ok(Math.abs(a.chord.bass-b.chord.bass)<=1,'same bass line, at most lowered by a semitone');
    normal+=a.events.filter(e=>e.inst!=='pad').length;low+=b.events.filter(e=>e.inst!=='pad').length;
  }
  assert.ok(low<normal*.7,'fewer melodic notes while hurt');
  assert.ok(composeBar('hearth',0,0,{low:true}).chord.pcs.includes(0),'hearth turns to A minor (C natural)');
});

function walk(c,area,seconds,hp=1,step=.1){for(let t=0;t<seconds;t+=step)c.observe(area,hp,step);}

test('the conductor waits for an area to settle and holds each tune for a while', () => {
  const c=new MusicConductor();c.prime('hearth');
  assert.equal(c.nextTune(),'hearth');
  walk(c,'spring',3);assert.equal(c.nextTune(),null,'a few seconds outside is not enough');
  walk(c,'spring',40);assert.equal(c.nextTune(),'spring');
  walk(c,'winter',12);assert.equal(c.nextTune(),null,'the minimum dwell time keeps the new tune');
  walk(c,'winter',30);assert.equal(c.nextTune(),'winter');
});

test('patchy landscapes do not make the music flicker', () => {
  const c=new MusicConductor();c.prime('autumn');c.nextTune();
  let changes=0;
  for(let i=0;i<120;i++){walk(c,i%2?'spring':'ember',1.5);if(i%10===0&&c.nextTune())changes++;}
  assert.equal(changes,0);
});

test('low-health mood uses hysteresis and smoothing', () => {
  const c=new MusicConductor();c.prime('autumn',1);
  walk(c,'autumn',1,.2);assert.equal(c.low,false,'a single hit does not flip the mood');
  walk(c,'autumn',6,.2);assert.equal(c.low,true);
  assert.ok(c.heart>.5&&c.cutoff<4000,'heartbeat and muffling follow smoothed health');
  walk(c,'autumn',10,.5);assert.equal(c.low,true,'recovering a little keeps the mood');
  walk(c,'autumn',10,.9);assert.equal(c.low,false);
  assert.equal(c.heart,0);assert.equal(c.cutoff,16000);
});

test('unknown areas keep the current tune', () => {
  const c=new MusicConductor();c.prime('winter');c.nextTune();
  walk(c,undefined,60);assert.equal(c.nextTune(),null);
});
