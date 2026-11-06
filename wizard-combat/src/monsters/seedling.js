// Briar Seedling — reference example for the rig format.
// One 512×512 drawing, cut into parts. Each part's `pivot` is the joint it turns around,
// `parent` makes it inherit that part's motion. Parts are listed back to front.
// `animate` receives a state object (see rig.js STATE) and writes offsets per part:
//   x,y translate (SVG units, y down) · r rotation in degrees (clockwise) · sx,sy scale · o opacity.
import {ease} from './rig.js';

const OUT='#21170f';
const defs=`
<radialGradient id="sd-bark" cx="38%" cy="30%" r="78%"><stop offset="0" stop-color="#b48a5c"/><stop offset=".45" stop-color="#7b583c"/><stop offset=".85" stop-color="#4a3424"/><stop offset="1" stop-color="#36261b"/></radialGradient>
<linearGradient id="sd-moss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c2e27a"/><stop offset=".55" stop-color="#86b34e"/><stop offset="1" stop-color="#55803a"/></linearGradient>
<linearGradient id="sd-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8f59a"/><stop offset=".5" stop-color="#93cd5d"/><stop offset="1" stop-color="#4f8c3a"/></linearGradient>
<linearGradient id="sd-leaf2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d0f092"/><stop offset=".5" stop-color="#8cc657"/><stop offset="1" stop-color="#4a8536"/></linearGradient>
<linearGradient id="sd-root" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4c33"/><stop offset="1" stop-color="#33241a"/></linearGradient>
<linearGradient id="sd-thorn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2e3b8"/><stop offset="1" stop-color="#9a7a50"/></linearGradient>
<radialGradient id="sd-eye" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffe37a"/><stop offset="1" stop-color="#f29a2e"/></radialGradient>
<radialGradient id="sd-maw" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#ffb04a"/><stop offset=".5" stop-color="#b8451c"/><stop offset="1" stop-color="#2a0f08"/></radialGradient>
<radialGradient id="sd-petal" cx="30%" cy="30%" r="80%"><stop offset="0" stop-color="#fff0f6"/><stop offset=".6" stop-color="#f3b3cf"/><stop offset="1" stop-color="#cf7aa3"/></radialGradient>
<filter id="sd-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>`;

// Leaf with a midrib and side veins; `flip` mirrors it for the right side.
const leaf=(grad,d,rib,veins,shade)=>`<path d="${d}" fill="url(#${grad})" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
<path d="${shade}" fill="#2c5a22" opacity=".38"/>
<path d="${rib}" fill="none" stroke="#eaffc4" stroke-width="3.2" stroke-linecap="round" opacity=".75"/>
${veins.map(v=>`<path d="${v}" fill="none" stroke="#e3f8b8" stroke-width="2" stroke-linecap="round" opacity=".5"/>`).join('')}
<path d="${d}" fill="none" stroke="#f4ffd8" stroke-width="2" opacity=".25" transform="translate(2 -2)"/>`;

const thorn=(x,y,dx,dy)=>`<path d="M${x},${y-6} Q${x+dx*.6},${y+dy*.4-5} ${x+dx},${y+dy} Q${x+dx*.55},${y+dy*.5+4} ${x},${y+7} Z" fill="url(#sd-thorn)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>`;

export const seedling={
  name:'Briar Seedling',view:[512,512],ground:494,scale:1.18,stride:2.6,
  defs,
  parts:[
    {id:'leafBack',parent:'stem',pivot:[256,262],svg:`<path d="M257,264 C238,236 240,204 262,178 C276,204 276,236 257,264 Z" fill="#5f9440" stroke="${OUT}" stroke-width="4"/><path d="M258,258 C255,230 257,208 262,188" stroke="#bfe58e" stroke-width="2.5" fill="none" opacity=".6"/>`},
    {id:'stem',parent:'body',pivot:[256,304],svg:`<path d="M249,306 C247,288 250,272 252,256 L262,256 C263,272 266,290 264,306 Z" fill="#6c9d42" stroke="${OUT}" stroke-width="4"/><path d="M255,300 C254,286 256,272 257,260" stroke="#c6eb8c" stroke-width="2.5" opacity=".7"/>`},
    {id:'rootL',pivot:[226,458],svg:`<path d="M238,452 C220,462 198,470 176,480 C166,485 160,492 168,494 C182,494 196,488 206,484 C214,481 222,480 232,478 Z" fill="url(#sd-root)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/><path d="M226,462 C206,472 188,480 172,488" stroke="#9c7650" stroke-width="2.5" fill="none" opacity=".6"/><path d="M190,481 C182,474 176,474 170,476" stroke="${OUT}" stroke-width="3" fill="none"/>`},
    {id:'rootR',pivot:[286,458],svg:`<path d="M274,452 C292,462 314,470 336,480 C346,485 352,492 344,494 C330,494 316,488 306,484 C298,481 290,480 280,478 Z" fill="url(#sd-root)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/><path d="M286,462 C306,472 324,480 340,488" stroke="#9c7650" stroke-width="2.5" fill="none" opacity=".6"/><path d="M322,481 C330,474 336,474 342,476" stroke="${OUT}" stroke-width="3" fill="none"/>`},
    {id:'rootM',pivot:[256,466],svg:`<path d="M246,462 C248,476 246,486 238,494 L262,494 C266,486 268,474 268,462 Z" fill="url(#sd-root)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>`},
    {id:'body',pivot:[256,476],svg:`
      ${thorn(156,396,-50,-10)}${thorn(164,440,-40,18)}${thorn(356,396,50,-10)}${thorn(348,440,40,18)}${thorn(192,334,-30,-26)}${thorn(320,334,30,-26)}${thorn(256,474,-6,22)}
      <path d="M256,300 C322,300 368,350 366,406 C364,452 318,478 256,478 C194,478 148,452 146,406 C144,350 190,300 256,300 Z" fill="url(#sd-bark)" stroke="${OUT}" stroke-width="5"/>
      <g fill="none" stroke="#2a1c12" stroke-width="3" stroke-linecap="round" opacity=".45">
        <path d="M206,334 C190,370 186,420 204,466"/><path d="M306,334 C322,370 326,420 308,466"/><path d="M176,372 C170,402 174,432 188,456"/><path d="M336,372 C342,402 338,432 324,456"/>
        <path d="M232,452 C238,462 250,468 262,466"/></g>
      <g fill="none" stroke="#d6ae7d" stroke-width="2" stroke-linecap="round" opacity=".35"><path d="M214,340 C200,372 196,410 210,450"/><path d="M182,380 C178,404 180,428 190,448"/></g>
      <path d="M256,298 C300,298 336,316 352,346 C340,352 334,344 324,350 C314,356 312,368 300,364 C290,360 288,348 276,352 C266,356 262,372 250,370 C238,368 240,352 228,350 C216,348 210,362 198,358 C186,354 190,342 178,344 C170,346 166,352 160,348 C176,316 212,298 256,298 Z" fill="url(#sd-moss)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M200,318 C220,308 246,304 270,306" stroke="#effcc4" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>
      <g fill="#e9f7b5" opacity=".7"><circle cx="232" cy="330" r="3"/><circle cx="290" cy="326" r="2.5"/><circle cx="318" cy="338" r="2"/><circle cx="204" cy="340" r="2"/></g>
      <ellipse cx="214" cy="392" rx="22" ry="38" fill="#fff6dc" opacity=".09" transform="rotate(-16 214 392)"/>
      <path d="M190,380 C200,364 236,366 246,382 C238,400 200,402 190,380 Z" fill="#1a0f09" stroke="#140b06" stroke-width="2"/>
      <path d="M322,380 C312,364 276,366 266,382 C274,400 312,402 322,380 Z" fill="#1a0f09" stroke="#140b06" stroke-width="2"/>
      <path d="M186,372 C200,356 232,356 248,368" stroke="#2a1b10" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M326,372 C312,356 280,356 264,368" stroke="#2a1b10" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M220,420 C236,416 276,416 292,420 C286,436 226,436 220,420 Z" fill="#1a0f09"/>
      <path d="M170,450 C204,476 308,476 342,450 C322,472 190,472 170,450 Z" fill="#160d07" opacity=".4"/>
      <path d="M334,334 C358,356 368,388 362,424" stroke="#d8f1ff" stroke-width="4" fill="none" opacity=".28" stroke-linecap="round"/>
      <circle cx="188" cy="418" r="6" fill="#2a1a10" stroke="#a07a52" stroke-width="2" opacity=".8"/>
      <g stroke-linecap="round" fill="none"><path d="M156,446 C192,466 240,464 282,450 C314,438 340,428 362,414" stroke="${OUT}" stroke-width="10"/><path d="M156,446 C192,466 240,464 282,450 C314,438 340,428 362,414" stroke="#6f8c3c" stroke-width="5.5"/><path d="M158,444 C194,462 240,460 280,446" stroke="#b7d77a" stroke-width="1.8" opacity=".7"/></g>
      ${[[180,458,-4,-14],[218,463,2,13],[256,458,-2,-15],[296,445,4,13],[334,430,-1,-14]].map(([x,y,dx,dy])=>`<path d="M${x-5},${y} L${x+dx},${y+dy} L${x+5},${y} Z" fill="#e8d6a6" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`).join('')}`},
    {id:'blossom',parent:'body',pivot:[304,318],svg:`<g transform="translate(304 318)">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-13" rx="9" ry="14" fill="url(#sd-petal)" stroke="${OUT}" stroke-width="2.5" transform="rotate(${a})"/>`).join('')}<circle r="6" fill="#ffd96b" stroke="${OUT}" stroke-width="2"/></g>`},
    {id:'eyes',parent:'body',pivot:[256,382],svg:`<path d="M196,380 C206,368 230,368 240,381 C232,393 206,394 196,380 Z" fill="url(#sd-eye)"/><path d="M316,380 C306,368 282,368 272,381 C280,393 306,394 316,380 Z" fill="url(#sd-eye)"/><ellipse cx="222" cy="381" rx="4" ry="7" fill="#5a2a08"/><ellipse cx="290" cy="381" rx="4" ry="7" fill="#5a2a08"/><circle cx="214" cy="376" r="3" fill="#fff"/><circle cx="282" cy="376" r="3" fill="#fff"/>`},
    {id:'eyeGlow',parent:'body',pivot:[256,382],glow:true,pad:34,svg:`<g filter="url(#sd-blur)" fill="#ffb53d" opacity=".75"><ellipse cx="218" cy="381" rx="30" ry="18"/><ellipse cx="294" cy="381" rx="30" ry="18"/></g>`},
    {id:'mouth',parent:'body',pivot:[256,424],svg:`<path d="M222,421 C238,416 274,416 290,421 C284,432 228,432 222,421 Z" fill="url(#sd-maw)" stroke="${OUT}" stroke-width="2.5"/><path d="M226,420 L234,428 L242,419 L250,429 L258,419 L266,429 L274,419 L282,428 L288,420" fill="#efe0b4" stroke="${OUT}" stroke-width="1.5" stroke-linejoin="round"/>`},
    {id:'leafL',parent:'stem',pivot:[254,262],svg:leaf('sd-leaf','M254,262 C232,226 182,198 112,204 C102,206 100,212 106,218 C136,252 196,280 254,262 Z','M250,259 C206,240 160,222 110,210',['M220,246 C214,234 208,226 198,220','M186,232 C178,224 170,218 158,214','M200,252 C188,252 172,246 158,238','M160,230 C148,228 136,224 124,218'],'M254,262 C206,242 160,224 108,212 C136,252 196,280 254,262 Z')},
    {id:'leafR',parent:'stem',pivot:[258,262],svg:leaf('sd-leaf2','M258,262 C278,222 324,188 392,186 C402,186 405,192 400,198 C374,236 316,272 258,262 Z','M262,258 C304,236 346,212 396,192',['M292,244 C296,232 302,222 312,214','M326,226 C332,216 340,210 350,204','M310,250 C322,248 338,240 352,230','M352,218 C364,214 374,206 384,198'],'M258,262 C304,238 346,214 398,194 C374,236 316,272 258,262 Z')},
    {id:'tendril',parent:'stem',pivot:[262,272],svg:`<path d="M262,272 C286,268 304,250 300,232 C296,218 280,218 278,230 C277,238 286,240 288,234" fill="none" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M262,272 C286,268 304,250 300,232 C296,218 280,218 278,230 C277,238 286,240 288,234" fill="none" stroke="#9ccc62" stroke-width="3.5" stroke-linecap="round"/>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase;
    const breath=Math.sin(t*2.3),hop=Math.abs(Math.sin(ph))*m,stun=s.stun?Math.sin(t*13)*(1-d):0,shake=h*Math.sin(t*55);
    const B=P.body;
    B.sy=1+breath*.025-w*.13+a*.16-h*.1-d*.42;B.sx=1-breath*.015+w*.09-a*.07+h*.08+d*.12;
    B.y=-hop*22+d*12;B.r=Math.sin(ph)*6*m+Math.sin(t*1.1)*1.5+stun*9+shake*5+s.dodge*10;B.x=s.dodge*-20;
    // Root feet step with the waddle, brace during the wind-up and splay on death.
    P.rootL.r=-Math.max(0,Math.sin(ph))*18*m+w*8-d*14+(s.root?Math.sin(t*31)*3:0);P.rootL.y=-Math.max(0,Math.sin(ph))*10*m;
    P.rootR.r=Math.max(0,-Math.sin(ph))*18*m-w*8+d*14-(s.root?Math.sin(t*29)*3:0);P.rootR.y=-Math.max(0,-Math.sin(ph))*10*m;
    P.rootM.r=Math.sin(t*1.6)*3;
    P.stem.r=Math.sin(t*1.3+.4)*4+Math.sin(ph*2)*5*m-a*6+stun*6+d*30;P.stem.sy=1+a*.18-w*.1;
    // Leaves: idle flutter, cock back on wind-up, whip forward on the shot, wilt on death.
    const flutter=Math.sin(t*2.1)*6+Math.sin(t*5.3)*2;
    P.leafL.r=flutter+w*30-a*34+hop*14-d*62;P.leafR.r=-flutter*.9-w*30+a*34-hop*14+d*62;
    P.leafL.sx=P.leafR.sx=1+a*.1;P.leafBack.r=Math.sin(t*1.7)*7-a*10;P.tendril.r=Math.sin(t*2.6)*9;P.tendril.sx=1+Math.sin(t*2.6)*.05;
    P.blossom.r=Math.sin(t*1.9)*10;P.blossom.sx=P.blossom.sy=1+Math.sin(t*3.1)*.04-d*.3;
    const blink=ease.blink(t,3.4+(s.seed%1)*1.3);
    P.eyes.sy=Math.max(.08,1-blink*.92-(s.stun?.55:0)+w*.18-h*.5-d*.85);P.eyes.sx=1+w*.06;
    P.eyeGlow.o=(.6+w*.4+a*.4+Math.sin(t*3)*.08)*(1-d);P.eyeGlow.sx=P.eyeGlow.sy=1+w*.35+a*.25;
    P.mouth.sy=1+w*1.4+a*2.6+h*.6;P.mouth.sx=1+w*.12+a*.08;
  },
};
