// Thorn Prowler — side-view rig (art faces left; `side:true` lets the game flip it toward
// its travel direction). Bark-plated wolf with a moss ruff, thorn spines and sap-lit veins.
// Legs are two segments (upper + lower) so the gallop can flex at elbow and hock.
import {ease} from './rig.js';

const OUT='#1a120d';
const defs=`
<linearGradient id="pw-bark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#806650"/><stop offset=".45" stop-color="#54412f"/><stop offset="1" stop-color="#2b2019"/></linearGradient>
<linearGradient id="pw-leg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2d22"/><stop offset=".45" stop-color="#6a5440"/><stop offset="1" stop-color="#3b2e23"/></linearGradient>
<linearGradient id="pw-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2e25"/><stop offset="1" stop-color="#1b1411"/></linearGradient>
<linearGradient id="pw-moss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c3e083"/><stop offset=".5" stop-color="#7fa24c"/><stop offset="1" stop-color="#43602d"/></linearGradient>
<linearGradient id="pw-mossDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f9142"/><stop offset="1" stop-color="#2f4621"/></linearGradient>
<linearGradient id="pw-head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93785b"/><stop offset=".5" stop-color="#5d4835"/><stop offset="1" stop-color="#33271e"/></linearGradient>
<linearGradient id="pw-spine" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5b4230"/><stop offset=".55" stop-color="#c9b385"/><stop offset="1" stop-color="#f8efd0"/></linearGradient>
<radialGradient id="pw-eye" cx="45%" cy="45%" r="60%"><stop offset="0" stop-color="#fbffd8"/><stop offset=".4" stop-color="#d8fb6a"/><stop offset="1" stop-color="#7fae25"/></radialGradient>
<linearGradient id="pw-maw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a161b"/><stop offset="1" stop-color="#23070a"/></linearGradient>
<filter id="pw-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="pw-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>`;

// Curved thorn leaning back (toward +x).
const spine=(x,y,h,lean=12,w=9)=>`<path d="M${x-w},${y+8} C${x-w*.4},${y-h*.5} ${x+lean*.4},${y-h*.85} ${x+lean},${y-h} C${x+lean*.5+w*.2},${y-h*.6} ${x+w*.7},${y-h*.3} ${x+w},${y+8} Z" fill="url(#pw-spine)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>`;
// Fur/moss tuft: a pointed leaf from (x,y) toward angle a (deg, 0 = +x).
const tuft=(x,y,len,a,w,fill='url(#pw-moss)')=>{const r=a*Math.PI/180,c=Math.cos(r),s=Math.sin(r),tx=x+c*len,ty=y+s*len,nx=-s*w,ny=c*w;
  return `<path d="M${x+nx},${y+ny} Q${x+c*len*.55+nx*1.1},${y+s*len*.55+ny*1.1} ${tx},${ty} Q${x+c*len*.5-nx*.9},${y+s*len*.5-ny*.9} ${x-nx},${y-ny} Z" fill="${fill}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>`;};
const claws=(x,y)=>[0,1,2].map(i=>`<path d="M${x+i*11},${y-7} Q${x+i*11-10},${y-5} ${x+i*11-13},${y+2} Q${x+i*11-4},${y+1} ${x+i*11+3},${y-1} Z" fill="#efe4c4" stroke="${OUT}" stroke-width="1.6"/>`).join('');

const F_UP='M214,296 C206,330 214,368 224,398 C232,404 248,404 254,396 C262,368 266,332 260,298 C250,284 222,284 214,296 Z';
const F_LO='M226,390 C224,418 222,444 220,464 C206,468 194,478 196,490 L246,492 C248,484 244,474 240,466 C242,444 248,420 254,394 Z';
const H_UP='M350,288 C340,318 346,352 358,382 C370,394 392,394 402,382 C418,354 424,318 418,292 C406,272 362,270 350,288 Z';
const H_LO='M360,376 C374,398 392,412 402,426 C404,446 400,466 396,476 C384,478 374,486 378,494 L420,494 C424,486 422,478 418,470 C424,446 428,420 418,402 C408,390 396,380 392,372 Z';
const seg=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>${extra}`;
const far=(d,dx,extra='')=>`<g transform="translate(${dx} -4)">${seg(d,'url(#pw-far)',extra)}</g>`;

export const prowler={
  name:'Thorn Prowler',view:[512,512],ground:494,scale:1.25,stride:1.2,side:true,previewSpeed:5,
  defs,
  parts:[
    {id:'farHindUp',parent:'body',pivot:[370,300],svg:far(H_UP,-22)},
    {id:'farHindLo',parent:'farHindUp',pivot:[374,384],svg:far(H_LO,-22,claws(358,494))},
    {id:'farForeUp',parent:'body',pivot:[256,300],svg:far(F_UP,22)},
    {id:'farForeLo',parent:'farForeUp',pivot:[260,394],svg:far(F_LO,22,claws(196,492))},
    {id:'tail',parent:'body',pivot:[412,272],svg:`
      ${[[432,254,24,10],[452,244,28,12],[472,234,24,12],[490,228,18,10]].map(([x,y,h,l])=>spine(x,y,h,l,7)).join('')}
      <path d="M408,262 C432,248 458,234 482,224 C496,218 510,220 511,230 C503,236 497,242 489,246 C499,250 501,258 493,262 C481,263 471,266 461,272 C449,280 434,292 414,294 Z" fill="url(#pw-bark)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M424,270 C444,262 466,252 488,240" stroke="#a88b66" stroke-width="2.4" fill="none" opacity=".55" stroke-linecap="round"/>
      ${tuft(470,262,30,8,8)}${tuft(486,240,26,-12,7)}${tuft(452,276,24,28,7,'url(#pw-mossDark)')}`},
    {id:'body',pivot:[300,300],svg:`
      ${[[262,236,30,12],[292,236,40,16],[324,240,36,14],[354,244,32,14],[384,250,26,12],[408,262,18,10]].map(([x,y,h,l])=>spine(x,y,h,l)).join('')}
      <path d="M196,276 C206,248 236,232 272,234 C312,236 350,238 386,248 C414,256 428,280 424,308 C420,330 404,344 384,346 C362,346 346,334 330,330 C306,326 290,344 268,360 C250,372 222,372 206,358 C192,344 188,300 196,276 Z" fill="url(#pw-bark)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M248,240 C300,236 352,240 396,254" stroke="#d6e9ff" stroke-width="3" fill="none" opacity=".22" stroke-linecap="round"/>
      <g fill="none" stroke-linecap="round">
        <path d="M262,258 C300,252 342,254 388,266" stroke="#ad916b" stroke-width="2.4" opacity=".5"/>
        <path d="M290,272 C296,294 292,316 284,334 M318,270 C326,290 326,308 320,322 M346,272 C352,288 352,302 348,314" stroke="#1d1510" stroke-width="6" opacity=".5"/>
        <path d="M292,274 C298,294 294,314 286,330 M320,272 C328,290 328,306 322,318 M348,274 C354,288 354,300 350,310" stroke="#a3876a" stroke-width="2" opacity=".45"/>
        <path d="M372,276 C392,280 406,292 412,310" stroke="#1d1510" stroke-width="3" opacity=".45"/>
        <path d="M374,274 C394,278 408,290 414,306" stroke="#a3876a" stroke-width="1.6" opacity=".4"/></g>
      <path d="M210,356 C232,370 258,364 276,352 C296,338 314,328 336,332 C312,334 296,348 276,362 C254,376 226,374 210,356 Z" fill="#140d09" opacity=".55"/>
      <path d="M190,300 C184,266 198,236 226,222 C254,210 284,220 296,240 C300,262 288,284 272,300 C262,318 244,336 222,340 C202,338 192,322 190,300 Z" fill="url(#pw-mossDark)" stroke="${OUT}" stroke-width="4"/>
      ${[[206,236,34,-150,9],[228,226,40,-30,10],[252,226,44,-20,10],[274,234,40,-6,10],[286,252,36,12,9],[280,276,34,30,9],[266,300,34,44,9],[246,318,32,62,9],[224,330,30,86,8],[204,320,30,118,8],[196,292,30,150,8],[200,262,30,-170,8]].map(([x,y,l,a,w])=>tuft(x,y,l,a,w)).join('')}
      ${[[226,262,30,-10,9],[248,282,32,10,9],[232,302,28,40,8],[256,250,30,-8,8]].map(([x,y,l,a,w])=>tuft(x,y,l,a,w)).join('')}
      <g fill="none" stroke="#eaf8bd" stroke-width="1.8" stroke-linecap="round" opacity=".6"><path d="M232,232 C244,226 256,226 266,230"/><path d="M234,266 C244,262 252,262 260,264"/><path d="M252,288 C262,290 270,294 276,300"/></g>`},
    {id:'veins',parent:'body',pivot:[300,300],glow:true,pad:20,svg:`<g fill="none" stroke="#c9ff74" stroke-linecap="round" filter="url(#pw-soft)" opacity=".85"><path d="M292,276 C298,294 294,314 286,330" stroke-width="3"/><path d="M320,274 C328,290 328,306 322,318" stroke-width="3"/><path d="M348,276 C354,288 354,300 350,310" stroke-width="2.5"/><path d="M296,258 C326,256 356,258 384,266" stroke-width="2"/></g>`},
    {id:'hindUp',parent:'body',pivot:[384,300],svg:seg(H_UP,'url(#pw-bark)',`<path d="M366,290 C394,286 410,300 412,326" stroke="#c4a882" stroke-width="2.4" fill="none" opacity=".45" stroke-linecap="round"/><path d="M372,330 C380,350 384,364 382,378" stroke="#1d1510" stroke-width="3" fill="none" opacity=".4"/>${spine(416,320,18,12,6)}`)},
    {id:'hindLo',parent:'hindUp',pivot:[376,384],svg:seg(H_LO,'url(#pw-leg)',`${claws(380,494)}${spine(424,416,16,12,5)}<path d="M406,430 C408,448 404,462 402,470" stroke="#a88b66" stroke-width="2" fill="none" opacity=".5"/>`)},
    {id:'foreUp',parent:'body',pivot:[236,300],svg:seg(F_UP,'url(#pw-bark)',`<path d="M222,306 C220,334 226,364 234,388" stroke="#c4a882" stroke-width="2.4" fill="none" opacity=".45" stroke-linecap="round"/>${spine(260,336,16,12,6)}`)},
    {id:'foreLo',parent:'foreUp',pivot:[240,394],svg:seg(F_LO,'url(#pw-leg)',`${claws(200,492)}<path d="M236,404 C234,426 232,446 230,462" stroke="#a88b66" stroke-width="2" fill="none" opacity=".5"/>`)},
    {id:'head',parent:'body',pivot:[214,262],svg:`
      <path d="M202,232 C212,214 226,196 246,180 C248,204 238,222 224,238 Z" fill="url(#pw-far)" stroke="${OUT}" stroke-width="3"/>
      <path d="M172,282 C150,286 120,286 92,282 L92,302 C120,308 150,306 172,300 Z" fill="url(#pw-maw)"/>
      <path d="M236,244 C228,222 206,208 180,210 C162,212 148,220 134,228 L86,242 C72,246 60,254 62,264 C64,274 76,278 90,278 L140,282 C158,292 184,296 206,290 C228,282 242,266 236,244 Z" fill="url(#pw-head)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M136,230 C112,236 92,240 76,248" stroke="#bea07a" stroke-width="2.6" fill="none" opacity=".6" stroke-linecap="round"/>
      <path d="M152,222 C172,212 198,212 222,222" stroke="#bea07a" stroke-width="2.4" fill="none" opacity=".5" stroke-linecap="round"/>
      <path d="M118,262 C130,256 148,256 162,262 M186,264 C196,256 208,256 220,264" stroke="#1d1510" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>
      <path d="M60,256 C60,248 70,244 80,246 C87,248 89,256 87,263 C83,270 70,270 63,266 Z" fill="#17100c" stroke="${OUT}" stroke-width="2"/>
      <ellipse cx="71" cy="251" rx="5" ry="3" fill="#8f7a66" opacity=".7"/>
      ${[[100,279],[116,280],[134,281],[152,283]].map(([x,y],i)=>`<path d="M${x-5},${y-1} L${x},${y+10+(i===0?6:0)} L${x+5},${y-1} Z" fill="#f2e7c6" stroke="${OUT}" stroke-width="1.5"/>`).join('')}
      <path d="M140,236 C150,226 172,224 186,232 C178,244 154,246 140,236 Z" fill="#0f0a07"/>
      <path d="M132,226 C150,212 180,210 200,224" stroke="${OUT}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M134,224 C152,212 178,210 196,222" stroke="#a48766" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${tuft(214,282,30,70,9)}${tuft(226,270,30,40,9)}${tuft(200,288,26,96,8,'url(#pw-mossDark)')}`},
    {id:'eye',parent:'head',pivot:[163,235],svg:`<path d="M146,236 C154,228 170,228 180,234 C172,242 154,244 146,236 Z" fill="url(#pw-eye)"/><path d="M162,229 C160,233 160,238 162,242 C164,238 164,233 162,229 Z" fill="#1d2a06"/><circle cx="156" cy="233" r="2" fill="#fff"/>`},
    {id:'eyeGlow',parent:'head',pivot:[163,235],glow:true,pad:30,svg:`<ellipse cx="164" cy="235" rx="26" ry="14" fill="#c8ff5c" opacity=".7" filter="url(#pw-blur)"/>`},
    {id:'jaw',parent:'head',pivot:[180,288],svg:`<path d="M184,282 C164,292 132,294 104,288 L88,284 C80,286 82,294 90,296 C116,304 150,308 180,302 C194,298 196,286 184,282 Z" fill="url(#pw-head)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>${[[106,286],[124,288],[144,290]].map(([x,y])=>`<path d="M${x-4},${y+2} L${x},${y-9} L${x+4},${y+2} Z" fill="#f2e7c6" stroke="${OUT}" stroke-width="1.4"/>`).join('')}<path d="M110,298 C130,302 154,302 176,296" stroke="#bea07a" stroke-width="2" fill="none" opacity=".5"/>`},
    {id:'ear',parent:'head',pivot:[206,226],svg:`<path d="M194,234 C202,210 216,190 240,172 C246,198 236,222 216,240 Z" fill="url(#pw-moss)" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/><path d="M206,230 C214,212 224,196 238,182" stroke="#e8f7b9" stroke-width="2" fill="none" opacity=".7"/><path d="M212,212 C218,212 222,210 226,206" stroke="#e8f7b9" stroke-width="1.5" fill="none" opacity=".5"/>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase,dg=Math.abs(s.dodge);
    const run=m*(1-d),stride=Math.sin(ph),lift=Math.max(0,Math.cos(ph)),liftB=Math.max(0,-Math.cos(ph));
    const B=P.body;
    B.y=-Math.abs(Math.sin(ph))*12*run+w*16+d*70-dg*48-Math.max(0,a-.3)*14;
    B.x=-a*42+h*14;
    B.r=Math.cos(ph)*5*run-w*7+a*3+h*6+(s.stun?Math.sin(t*9)*4:0)+d*4-dg*5;
    B.sy=1+Math.sin(t*2.2)*.015*(1-run)-w*.04;
    // Gallop: fore and hind pairs swing in opposition; the lower segment folds while the paw is airborne.
    const fold=d*60,tuck=dg;
    P.foreUp.r=stride*30*run-w*12+a*34-fold*.6+tuck*20;P.foreLo.r=-lift*42*run+w*16-a*10+fold*1.2-tuck*50;
    P.farForeUp.r=Math.sin(ph+.7)*30*run-w*10+a*26-fold*.5+tuck*20;P.farForeLo.r=-Math.max(0,Math.cos(ph+.7))*42*run+w*14+fold-tuck*50;
    P.hindUp.r=-stride*26*run+w*14-a*20+fold*.5-tuck*18;P.hindLo.r=liftB*36*run-w*10+a*14-fold+tuck*44;
    P.farHindUp.r=-Math.sin(ph+.7)*26*run+w*12-a*16+fold*.4-tuck*18;P.farHindLo.r=Math.max(0,-Math.cos(ph+.7))*36*run-w*8-fold*.8+tuck*44;
    if(s.root){const j=Math.sin(t*28)*3;P.foreUp.r+=j;P.hindUp.r-=j;B.x+=Math.sin(t*17)*3;}
    // Head stays level while running, drops to stalk on the wind-up, thrusts on the bite.
    const H=P.head;H.r=-Math.cos(ph)*3*run-run*5+Math.sin(t*.8)*2*(1-run)-w*12+a*10+h*14-d*22+(s.stun?Math.sin(t*7)*10:0);
    H.x=-w*6;H.y=w*6;
    const pant=(3+3*Math.sin(t*8))*Math.max(run,.25);
    P.jaw.r=-pant-w*30-Math.max(0,a-.45)/.55*34-h*10-d*14;
    P.ear.r=ease.blink(t+.7,4.3,.22)*-16+w*14+run*14+h*10+d*10;
    P.eye.sy=Math.max(.1,1-ease.blink(t,3.9,.12)-h*.6-(s.stun?.5:0)-d*.9+w*.1);
    P.eyeGlow.o=(.65+w*.35+a*.3+Math.sin(t*2.6)*.08)*(1-d);P.eyeGlow.sx=P.eyeGlow.sy=1+w*.4;
    P.veins.o=(.35+Math.sin(t*2.1)*.15+w*.5+a*.3)*(1-d);
    P.tail.r=Math.sin(t*1.6)*7*(1-run)+Math.sin(ph*2)*6*run+run*10-w*16+a*8-h*10+d*26;
  },
};
