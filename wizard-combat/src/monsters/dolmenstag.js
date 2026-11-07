// Dolmen Stag (species `titan`) — side-view rig (art faces left; `side:true` flips it toward travel).
// An elk hewn from an old burial dolmen: a mossy capstone back, a lit chamber door in its flank and
// pillar legs lashed with roots. A ring of tiny standing stones floats between its antlers; the ring
// lights up on the wind-up and hurls its runestones in pairs.
import {ease} from './rig.js';

const OUT='#1c1d1a';
const defs=`
<linearGradient id="ds-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9c1ac"/><stop offset=".45" stop-color="#8f8774"/><stop offset="1" stop-color="#4f493e"/></linearGradient>
<linearGradient id="ds-leg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d574b"/><stop offset=".45" stop-color="#a39b86"/><stop offset="1" stop-color="#5a5448"/></linearGradient>
<linearGradient id="ds-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b6558"/><stop offset="1" stop-color="#34302a"/></linearGradient>
<linearGradient id="ds-head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2cab4"/><stop offset=".55" stop-color="#9a927d"/><stop offset="1" stop-color="#5c5547"/></linearGradient>
<linearGradient id="ds-moss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c5e283"/><stop offset=".5" stop-color="#82aa4e"/><stop offset="1" stop-color="#4a6e33"/></linearGradient>
<linearGradient id="ds-antler" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8a7f68"/><stop offset=".6" stop-color="#d8cfb6"/><stop offset="1" stop-color="#f4efdf"/></linearGradient>
<radialGradient id="ds-door" cx="50%" cy="70%" r="70%"><stop offset="0" stop-color="#e9fff2"/><stop offset=".3" stop-color="#8ff0c8"/><stop offset=".75" stop-color="#1f5a4a"/><stop offset="1" stop-color="#0f2420"/></radialGradient>
<radialGradient id="ds-eye" cx="45%" cy="45%" r="60%"><stop offset="0" stop-color="#f2fff8"/><stop offset=".4" stop-color="#9ff5d4"/><stop offset="1" stop-color="#2a9a78"/></radialGradient>
<linearGradient id="ds-menhir" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e6758"/><stop offset=".4" stop-color="#cfc7b0"/><stop offset="1" stop-color="#5f594c"/></linearGradient>
<filter id="ds-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>`;

const f=n=>n.toFixed(1);
// Pillar leg segments (upper: hip to knee, lower: knee to hoof).
const F_UP='M180,312 C176,346 182,380 188,410 C198,418 220,418 228,410 C232,380 236,346 232,312 C220,298 192,298 180,312 Z';
const F_LO='M190,402 C190,430 188,456 186,476 C180,482 178,490 180,494 L230,494 C232,488 230,482 226,476 C226,456 226,430 228,402 Z';
const H_UP='M350,306 C344,344 350,380 358,410 C368,420 392,420 400,410 C410,378 412,342 406,306 C394,290 362,290 350,306 Z';
const H_LO='M360,402 C362,430 360,456 358,476 C352,482 350,490 352,494 L402,494 C404,488 402,482 398,476 C398,456 398,430 400,402 Z';
const lash=(x,y)=>`<path d="M${x-22},${y-6} C${x-8},${y+4} ${x+10},${y+2} ${x+22},${y-8} M${x-22},${y+6} C${x-6},${y+14} ${x+12},${y+12} ${x+22},${y+2}" stroke="${OUT}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M${x-22},${y-6} C${x-8},${y+4} ${x+10},${y+2} ${x+22},${y-8} M${x-22},${y+6} C${x-6},${y+14} ${x+12},${y+12} ${x+22},${y+2}" stroke="#7a5a3a" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
const hoof=(x)=>`<path d="M${x-26},486 L${x+26},486 L${x+24},494 L${x-24},494 Z" fill="#3a352e" stroke="${OUT}" stroke-width="3"/>`;
const seg=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"/>${extra}`;
const far=(d,dx,extra='')=>`<g transform="translate(${dx} -6)">${seg(d,'url(#ds-far)',extra)}</g>`;
const crack=(d)=>`<path d="${d}" stroke="#3a352d" stroke-width="2.2" fill="none" opacity=".6" stroke-linecap="round"/>`;
// Antler: a thick beam with tines, drawn as layered strokes.
function antler(beam,tines,color='url(#ds-antler)',w=13){const all=[beam,...tines];
  return all.map(d=>`<path d="${d}" stroke="${OUT}" stroke-width="${w+5}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')+all.map((d,i)=>`<path d="${d}" stroke="${color}" stroke-width="${i?w-3:w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')+`<path d="${beam}" stroke="#fffaf0" stroke-width="2" fill="none" opacity=".4" transform="translate(-2 0)"/>`;}
const NEAR=antler('M146,146 C138,112 150,74 178,46 C190,34 204,26 218,22',['M150,104 C136,92 120,84 102,82','M162,72 C152,58 146,44 146,28','M186,40 C190,26 198,14 208,6','M204,28 C222,24 238,28 250,36']);
const FAR=antler('M170,140 C170,106 192,72 222,52 C236,42 250,36 266,34',['M178,98 C168,84 162,70 162,56','M206,62 C204,48 208,34 216,24','M244,40 C258,36 272,40 282,48'],'url(#ds-far)',12);
// Henge: little standing stones around a floating ring above the head.
const HENGE={cx:200,cy:70,rx:66,ry:16};
function henge(front){let s='';for(let i=0;i<7;i++){const a=i/7*Math.PI*2+.3,inFront=Math.sin(a)>0;if(inFront!==front)continue;
  const x=HENGE.cx+Math.cos(a)*HENGE.rx,y=HENGE.cy+Math.sin(a)*HENGE.ry,hgt=30+(i%3)*6,w=13+(i%2)*3;
  s+=`<path d="M${f(x-w/2)},${f(y)} L${f(x-w/2+2)},${f(y-hgt+4)} Q${f(x)},${f(y-hgt-3)} ${f(x+w/2-2)},${f(y-hgt+4)} L${f(x+w/2)},${f(y)} Z" fill="url(#ds-menhir)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><path d="M${f(x)},${f(y-6)} L${f(x)},${f(y-hgt+8)}" stroke="#a6f5d2" stroke-width="2" opacity=".75"/>`;}
  return s;}
const ringPath=(front)=>`<path d="M${HENGE.cx-HENGE.rx},${HENGE.cy} A${HENGE.rx},${HENGE.ry} 0 0 ${front?0:1} ${HENGE.cx+HENGE.rx},${HENGE.cy}" stroke="#a6f5d2" stroke-width="2.4" fill="none" opacity=".55" stroke-dasharray="6 6"/>`;

// The antlers and henge make this the tallest rig, so the whole drawing is scaled about the feet
// to fit the 512 frame (part svgs are wrapped, pivots moved to match; animation offsets unchanged).
const FIT=.84,fx=x=>256+(x-256)*FIT,fy=y=>494+(y-494)*FIT;
const fit=parts=>parts.map(p=>({...p,pivot:[fx(p.pivot[0]),fy(p.pivot[1])],svg:`<g transform="translate(256 494) scale(${FIT}) translate(-256 -494)">${p.svg}</g>`}));

export const dolmenstag={
  name:'Dolmen Stag',view:[512,512],ground:494,scale:1.18/FIT,stride:.9,side:true,previewSpeed:5,
  defs,
  parts:fit([
    {id:'farHindUp',parent:'body',pivot:[378,306],svg:far(H_UP,-24)},
    {id:'farHindLo',parent:'farHindUp',pivot:[380,406],svg:far(H_LO,-24,hoof(376))},
    {id:'farForeUp',parent:'body',pivot:[206,312],svg:far(F_UP,24)},
    {id:'farForeLo',parent:'farForeUp',pivot:[208,406],svg:far(F_LO,24,hoof(206))},
    {id:'tail',parent:'body',pivot:[404,240],svg:`<path d="M402,232 C420,226 434,232 438,246 C432,250 426,252 418,258 C412,252 406,248 400,250 Z" fill="url(#ds-stone)" stroke="${OUT}" stroke-width="3.6" stroke-linejoin="round"/><path d="M414,236 C426,236 436,246 440,262 C432,256 424,254 418,256 Z" fill="url(#ds-moss)" stroke="${OUT}" stroke-width="2.4"/>`},
    {id:'farAntler',parent:'head',pivot:[170,140],svg:FAR},
    {id:'hengeBack',parent:'head',pivot:[200,70],svg:ringPath(false)+henge(false)},
    {id:'body',pivot:[290,300],svg:`
      <path d="M168,256 C166,226 190,212 222,210 L362,206 C394,206 412,224 414,256 L414,318 C414,342 398,354 372,354 L212,356 C184,356 168,340 166,314 Z" fill="url(#ds-stone)" stroke="${OUT}" stroke-width="5.5" stroke-linejoin="round"/>
      <path d="M186,222 C232,214 330,210 398,216" stroke="#f1ead6" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
      ${crack('M330,214 L322,236 L330,252 L320,270')}${crack('M204,330 L218,316 L214,300')}${crack('M392,300 L380,312 L386,330')}
      <path d="M240,352 L240,312 C240,292 252,282 264,282 C276,282 288,292 288,312 L288,352 Z" fill="url(#ds-door)" stroke="${OUT}" stroke-width="4"/>
      <path d="M232,354 L232,306 C232,282 248,272 264,272 C280,272 296,282 296,306 L296,354" stroke="#6b6455" stroke-width="5" fill="none"/>
      <g fill="none" stroke="#a6f5d2" stroke-width="3" stroke-linecap="round" opacity=".85">
        <path d="M342,282 C342,270 356,268 358,278 C360,290 340,294 336,280 C332,262 358,256 366,272"/>
        <path d="M318,250 L318,266 M312,256 L324,256"/><path d="M370,250 L378,262 L386,250"/><path d="M196,268 L204,280 L196,292"/></g>
      <g fill="#dccf8c" opacity=".8">${[[214,246,5],[226,238,3],[380,328,4.5],[392,320,3],[300,330,3.5],[352,236,3]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
      <path d="M170,240 C176,218 196,206 226,204 C270,200 330,198 370,200 C398,202 414,214 418,238 C406,232 398,244 388,236 C378,248 368,236 356,244 C344,234 334,248 322,238 C310,248 298,236 286,244 C274,234 262,246 250,238 C238,248 228,236 216,244 C204,236 194,248 184,238 C178,246 172,246 170,240 Z" fill="url(#ds-moss)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <g stroke="#5a7d3a" stroke-width="3" stroke-linecap="round">${[[200,244,16],[244,242,22],[290,244,14],[338,242,20],[384,240,12]].map(([x,y,l])=>`<path d="M${x},${y} C${x-2},${y+l*.5} ${x+2},${y+l*.7} ${x},${y+l}"/>`).join('')}</g>
      <path d="M200,216 C240,208 300,206 360,206" stroke="#effcc4" stroke-width="2.6" fill="none" opacity=".5" stroke-linecap="round"/>`},
    {id:'runes',parent:'body',pivot:[300,280],glow:true,pad:30,svg:`<g filter="url(#ds-blur)" fill="none" stroke="#8ff0c8" stroke-width="10" stroke-linecap="round"><path d="M342,282 C342,270 356,268 358,278 C360,290 340,294 336,280 C332,262 358,256 366,272"/><path d="M318,250 L318,266"/><path d="M370,250 L378,262 L386,250"/></g>`},
    {id:'door',parent:'body',pivot:[264,330],glow:true,pad:30,svg:`<ellipse cx="264" cy="330" rx="26" ry="30" fill="#8ff0c8" filter="url(#ds-blur)" opacity=".75"/>`},
    {id:'hindUp',parent:'body',pivot:[378,306],svg:seg(H_UP,'url(#ds-leg)',crack('M372,330 L382,350 L376,372')+`<path d="M356,318 C362,312 396,312 402,320 C398,332 360,334 356,318 Z" fill="url(#ds-moss)" stroke="${OUT}" stroke-width="2.4"/>`)},
    {id:'hindLo',parent:'hindUp',pivot:[380,406],svg:seg(H_LO,'url(#ds-leg)',lash(380,412)+hoof(376))},
    {id:'foreUp',parent:'body',pivot:[206,312],svg:seg(F_UP,'url(#ds-leg)',crack('M200,336 L210,356 L204,380')+`<path d="M184,322 C190,316 226,316 230,324 C226,336 188,338 184,322 Z" fill="url(#ds-moss)" stroke="${OUT}" stroke-width="2.4"/>`)},
    {id:'foreLo',parent:'foreUp',pivot:[208,406],svg:seg(F_LO,'url(#ds-leg)',lash(208,412)+hoof(206))},
    {id:'neck',parent:'body',pivot:[204,262],svg:`
      <path d="M232,236 C214,206 190,182 172,160 L130,178 C146,206 162,248 176,300 C196,304 222,290 236,270 Z" fill="url(#ds-stone)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      ${crack('M170,214 L184,226 L178,244')}
      <path d="M176,154 C196,174 214,196 232,228 C224,236 222,226 214,234 C208,222 204,232 198,222 C192,212 190,220 184,208 C178,198 178,206 170,192 Z" fill="url(#ds-moss)" stroke="${OUT}" stroke-width="3.4" stroke-linejoin="round"/>
      <g stroke="#5a7d3a" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M188,212 C186,224 190,232 186,244 M204,226 C202,238 206,246 202,258 M218,236 C218,248 222,254 218,266"/></g>`},
    {id:'head',parent:'neck',pivot:[150,176],svg:`
      <path d="M160,150 C170,132 182,122 194,118 C190,132 182,146 172,156 Z" fill="url(#ds-head)" stroke="${OUT}" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M176,160 C172,140 150,132 126,138 C104,144 82,160 62,180 C48,194 44,212 56,220 C70,226 96,222 118,214 C140,206 162,196 172,184 Z" fill="url(#ds-head)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M140,142 C116,144 94,156 76,172" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>
      <path d="M56,214 C72,214 92,210 110,204" stroke="${OUT}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="58" cy="198" rx="5" ry="4" fill="#2a2620"/>
      <path d="M108,150 C116,146 128,146 134,152" stroke="#3a352d" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M92,170 L100,160 L108,170 M150,170 L156,162 L162,172" stroke="#a6f5d2" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
      ${crack('M140,190 L128,198 L132,208')}`},
    {id:'beard',parent:'head',pivot:[112,212],svg:`<path d="M84,216 C96,214 120,210 140,204 C142,220 136,238 128,250 C122,244 120,256 112,262 C108,250 104,258 98,252 C96,240 90,230 84,216 Z" fill="url(#ds-moss)" stroke="${OUT}" stroke-width="3.4" stroke-linejoin="round"/><path d="M100,222 C104,234 108,242 112,252 M124,216 C124,228 126,236 126,246" stroke="#e8f8b8" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`},
    {id:'eye',parent:'head',pivot:[122,162],svg:`<path d="M110,164 C116,156 128,156 134,164 C128,170 116,170 110,164 Z" fill="url(#ds-eye)" stroke="${OUT}" stroke-width="2.4"/><circle cx="120" cy="164" r="3" fill="#0f3a2c"/>`},
    {id:'eyeGlow',parent:'head',pivot:[122,162],glow:true,pad:26,svg:`<ellipse cx="122" cy="164" rx="20" ry="12" fill="#8ff0c8" filter="url(#ds-blur)" opacity=".75"/>`},
    {id:'nearAntler',parent:'head',pivot:[146,146],svg:NEAR},
    {id:'hengeFront',parent:'head',pivot:[200,70],svg:ringPath(true)+henge(true)},
    {id:'hengeGlow',parent:'head',pivot:[200,70],glow:true,pad:34,svg:`<ellipse cx="200" cy="62" rx="74" ry="26" fill="none" stroke="#a6f5d2" stroke-width="14" filter="url(#ds-blur)"/><circle cx="200" cy="58" r="16" fill="#e6fff4" filter="url(#ds-blur)"/>`},
  ]),
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase,alive=1-d,stun=s.stun?1:0;
    const walk=m*(1-d),stride=Math.sin(ph),lift=Math.max(0,Math.cos(ph)),liftB=Math.max(0,-Math.cos(ph));
    const B=P.body;
    B.y=-Math.abs(Math.sin(ph))*6*walk+w*6+d*62-Math.max(0,a-.4)*4;B.x=a*14+h*6+s.dodge*-20;
    B.r=Math.cos(ph)*2*walk-w*2+h*2+stun*Math.sin(t*4)*2+d*6;B.sy=1+Math.sin(t*1.4)*.008;
    // A heavy four-beat walk; legs fold under the body when it falls.
    const fold=d*56;
    P.foreUp.r=stride*18*walk-w*6-fold*.5;P.foreLo.r=-lift*26*walk+w*6+fold*1.1;
    P.farForeUp.r=Math.sin(ph+.9)*18*walk-w*5-fold*.4;P.farForeLo.r=-Math.max(0,Math.cos(ph+.9))*26*walk+w*5+fold;
    P.hindUp.r=-stride*16*walk+w*5+fold*.5;P.hindLo.r=liftB*22*walk-w*4-fold;
    P.farHindUp.r=-Math.sin(ph+.9)*16*walk+w*4+fold*.4;P.farHindLo.r=Math.max(0,-Math.cos(ph+.9))*22*walk-w*3-fold*.8;
    if(s.root){const j=Math.sin(t*24)*2;P.foreUp.r+=j;P.hindUp.r-=j;B.x+=Math.sin(t*15)*2;}
    // The head rises to raise the henge on the wind-up and nods it forward to throw.
    P.neck.r=Math.sin(ph*2)*2*walk+Math.sin(t*.7)*1.5-w*10+a*12+h*4+stun*Math.sin(t*3)*6-d*-10;
    P.head.r=-Math.cos(ph)*2*walk+Math.sin(t*.9+.5)*2-w*6+a*10+h*6+stun*Math.sin(t*4+1)*8+d*24;
    P.beard.r=Math.sin(t*1.6)*4+Math.sin(ph*2)*4*walk+a*-6;
    P.tail.r=Math.sin(t*1.3)*6+walk*4-h*8;
    const lift2=-Math.sin(t*1.2)*4-w*16+a*-4+d*40,spin=Math.sin(t*.6)*.04;
    for(const id of ['hengeBack','hengeFront'])Object.assign(P[id],{y:lift2,sx:1+spin+a*.14,sy:1+a*.1,o:alive});
    P.hengeGlow.y=lift2;P.hengeGlow.o=(.25+Math.sin(t*2)*.08+w*.75+a*.6)*alive*(1-stun*.7);P.hengeGlow.sx=1+w*.12+a*.25;
    P.runes.o=(.35+Math.sin(t*1.5)*.12+w*.5+a*.3)*alive;P.door.o=(.5+Math.sin(t*1.1)*.12+w*.3)*alive;
    P.eye.sy=Math.max(.15,1-ease.blink(t,5.3,.16)-h*.5-(stun?.5:0)-d*.85);
    P.eyeGlow.o=(.5+w*.5+a*.3)*alive;P.eyeGlow.sx=P.eyeGlow.sy=1+w*.3;
  },
};
