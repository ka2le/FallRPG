// Hoarscale (species `ice`) — an upright pangolin of the winter court that grows plates of hoarfrost
// over its scales. It cups a frost crystal between its claws and throws shards that chill. The
// ice armour is drawn as separate layers: when a Firebolt breaks it (state.thaw → 1) the ice fades
// away, leaving warm bark-brown scales and melt drips behind. It curls into a ball when it falls.
import {ease,mirror} from './rig.js';

const OUT='#1a1a24';
const defs=`
<linearGradient id="hs-scale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c39062"/><stop offset=".5" stop-color="#7f5432"/><stop offset="1" stop-color="#43291a"/></linearGradient>
<radialGradient id="hs-body" cx="42%" cy="30%" r="80%"><stop offset="0" stop-color="#9a6a44"/><stop offset=".6" stop-color="#5e3b24"/><stop offset="1" stop-color="#2f1d12"/></radialGradient>
<radialGradient id="hs-fur" cx="45%" cy="30%" r="75%"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#e9dfcb"/><stop offset="1" stop-color="#b9a98c"/></radialGradient>
<linearGradient id="hs-ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4feff"/><stop offset=".35" stop-color="#bff1f7"/><stop offset=".75" stop-color="#78c8de"/><stop offset="1" stop-color="#3d8aae"/></linearGradient>
<linearGradient id="hs-shard" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5fb0cc"/><stop offset=".6" stop-color="#c8f4fb"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<radialGradient id="hs-orb" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#c6f6ff"/><stop offset="1" stop-color="#4fb6dc"/></radialGradient>
<radialGradient id="hs-eye" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#e8fdff"/><stop offset=".5" stop-color="#7fd8f0"/><stop offset="1" stop-color="#1b5d7a"/></radialGradient>
<filter id="hs-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>`;

const f=n=>n.toFixed(1);
// Rounded overlapping scale (bark) and faceted ice plate, both pointing down from (x,y).
const scale=(x,y,w,h,r=0)=>`<g transform="rotate(${r} ${x} ${y})"><path d="M${f(x-w/2)},${y} C${f(x-w/2)},${f(y+h*.6)} ${f(x-w*.12)},${y+h} ${x},${y+h} C${f(x+w*.12)},${y+h} ${f(x+w/2)},${f(y+h*.6)} ${f(x+w/2)},${y} Q${x},${f(y-h*.22)} ${f(x-w/2)},${y} Z" fill="url(#hs-scale)" stroke="${OUT}" stroke-width="2.4"/><path d="M${f(x-w*.22)},${f(y+h*.15)} C${f(x-w*.2)},${f(y+h*.5)} ${f(x-w*.08)},${f(y+h*.75)} ${x},${f(y+h*.82)}" stroke="#e2b98a" stroke-width="1.6" fill="none" opacity=".55"/></g>`;
const plate=(x,y,w,h,r=0)=>`<g transform="rotate(${r} ${x} ${y})"><path d="M${f(x-w/2)},${y} L${f(x-w*.32)},${f(y+h*.7)} L${x},${y+h} L${f(x+w*.32)},${f(y+h*.7)} L${f(x+w/2)},${y} L${x},${f(y-h*.2)} Z" fill="url(#hs-ice)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round" opacity=".95"/><path d="M${x},${f(y-h*.15)} L${x},${y+h*.9} M${f(x-w*.4)},${f(y+h*.05)} L${x},${f(y+h*.45)} L${f(x+w*.4)},${f(y+h*.05)}" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".7"/></g>`;
const shard=(x,y,h,lean=0,w=10)=>`<path d="M${x-w},${y} L${x+lean},${y-h} L${x+w},${y} Z" fill="url(#hs-shard)" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${x},${y-2} L${f(x+lean*.9)},${f(y-h*.85)}" stroke="#fff" stroke-width="1.4" opacity=".8"/>`;

// Body half-width and belly-fur half-width at height y, for laying out scale rows.
const lerp=(pts,y)=>{for(let i=1;i<pts.length;i++)if(y<=pts[i][0]){const [y0,v0]=pts[i-1],[y1,v1]=pts[i];return v0+(v1-v0)*(y-y0)/(y1-y0);}return pts[pts.length-1][1];};
const HALF=[[230,60],[300,86],[380,96],[456,82]],BELLY=[[230,0],[270,26],[360,46],[456,40]];
function bodyScales(){let s='';for(let r=0;r<7;r++){const y=232+r*32,hw=lerp(HALF,y+10),bw=lerp(BELLY,y+10);
  for(const k of [-1,1])for(let x=bw+12+(r%2)*10;x<hw+8;x+=24)s+=scale(256+k*x,y,28,34,k*(x-bw)/(hw-bw+1)*-14);}
  return s;}
function bodyIce(){let s='';for(let r=0;r<4;r++){const y=232+r*40,hw=lerp(HALF,y+10),bw=lerp(BELLY,y+10)+10;
  for(const k of [-1,1])for(let x=hw-6;x>bw;x-=30)s+=plate(256+k*x,y,30,40,k*-12);}
  s+=shard(194,244,30,-14,10)+shard(318,244,30,14,10)+shard(180,276,22,-16,8)+shard(332,276,22,16,8);return s;}

const legSvg=(k)=>{const x=256+k*38;return `<path d="M${x-24},430 C${x-28},456 ${x-26},476 ${x-22},486 L${x+22},486 C${x+26},476 ${x+26},456 ${x+22},430 Z" fill="url(#hs-body)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
  ${scale(x-8,438,22,24,-6)}${scale(x+10,440,22,24,6)}
  ${[-14,0,14].map(dx=>`<path d="M${x+dx-5},484 C${x+dx-6},492 ${x+dx+2},496 ${x+dx+6},494 C${x+dx+6},490 ${x+dx+5},486 ${x+dx+4},484 Z" fill="#efe6cf" stroke="${OUT}" stroke-width="2"/>`).join('')}`;};
// Arm from the shoulder down to a paw with three long digging claws; k = -1 left / +1 right.
const armSvg=(k)=>{const sx=256+k*58,px=256+k*26,py=328;return `<path d="M${sx-k*16},258 C${sx+k*14},272 ${sx+k*10},306 ${px+k*14},${py-10} C${px+k*4},${py+6} ${px-k*12},${py+2} ${px-k*14},${py-10} C${px-k*4},${py-28} ${sx-k*14},${300} ${sx-k*26},270 Z" fill="url(#hs-body)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
  ${scale(sx,262,24,28,k*-10)}${scale(sx-k*4,286,22,26,k*-20)}${scale(px+k*16,300,20,24,k*-30)}
  ${[-10,0,10].map((dx,i)=>`<path d="M${px+k*dx},${py-4} C${px+k*dx-k*6},${py+10} ${px+k*dx-k*16},${py+18} ${px+k*dx-k*24},${py+16} C${px+k*dx-k*14},${py+8} ${px+k*dx-k*6},${py+2} ${px+k*dx+k*4},${py-6} Z" fill="#f2ead6" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`).join('')}`;};
const armIce=(k)=>{const sx=256+k*58;return plate(sx+k*4,250,40,46,k*-8)+plate(sx-k*2,290,30,34,k*-24)+shard(sx+k*14,252,26,k*14,9);};

export const hoarscale={
  name:'Hoarscale',view:[512,512],ground:494,scale:1.12,stride:2.2,previewSpeed:4,extra:['thaw'],
  defs,
  parts:[
    {id:'tail',parent:'body',pivot:[318,440],svg:`
      <path d="M300,420 C340,428 386,438 418,458 C444,474 458,470 466,454 C474,438 468,420 456,412 C462,430 452,444 436,440 C404,428 364,414 318,404 Z" fill="url(#hs-body)" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"/>
      ${[[330,410,26,30,-70],[356,418,26,30,-66],[382,428,24,28,-60],[406,440,22,26,-52],[428,450,20,24,-40],[448,452,18,20,-10]].map(a=>scale(...a)).join('')}`},
    {id:'iceTail',parent:'tail',pivot:[318,440],svg:`${shard(346,414,24,8,9)}${shard(376,422,26,10,9)}${shard(404,434,22,12,8)}${shard(430,446,18,14,7)}${plate(452,440,22,26,20)}`},
    {id:'legL',parent:'body',pivot:[218,432],svg:legSvg(-1)},
    {id:'legR',parent:'body',pivot:[294,432],svg:legSvg(1)},
    {id:'body',pivot:[256,470],svg:`
      <path d="M256,222 C304,222 330,250 340,300 C350,350 356,410 340,446 C326,472 290,476 256,476 C222,476 186,472 172,446 C156,410 162,350 172,300 C182,250 208,222 256,222 Z" fill="url(#hs-body)" stroke="${OUT}" stroke-width="5"/>
      <path d="M256,254 C282,256 300,300 302,360 C304,410 290,446 256,450 C222,446 208,410 210,360 C212,300 230,256 256,254 Z" fill="url(#hs-fur)" stroke="${OUT}" stroke-width="3.6"/>
      <g fill="none" stroke="#b5a487" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M236,300 C232,320 232,340 236,356 M276,300 C280,320 280,340 276,356 M246,380 C244,400 246,420 250,434 M266,380 C268,400 266,420 262,434"/></g>
      ${bodyScales()}`},
    {id:'iceBody',parent:'body',pivot:[256,350],svg:bodyIce()},
    {id:'melt',parent:'body',pivot:[256,300],svg:`<g fill="#bfeefa" stroke="${OUT}" stroke-width="1.6">${[[196,300],[318,292],[184,352],[330,362],[206,408],[312,414]].map(([x,y])=>`<path d="M${x},${y} C${x-4},${y+8} ${x-4},${y+14} ${x},${y+15} C${x+4},${y+14} ${x+4},${y+8} ${x},${y} Z"/>`).join('')}</g><g fill="#ffffff" opacity=".5">${[[198,282],[314,276],[188,334]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="7" ry="3"/>`).join('')}</g>`},
    {id:'orbGlow',parent:'orb',pivot:[256,318],glow:true,pad:40,svg:`<circle cx="256" cy="318" r="40" fill="#9be8ff" filter="url(#hs-blur)" opacity=".85"/>`},
    {id:'orb',parent:'body',pivot:[256,318],svg:`<g transform="translate(256 318)">${[0,60,120].map(a=>`<path d="M0,-26 L6,0 L0,26 L-6,0 Z" fill="url(#hs-orb)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round" transform="rotate(${a})"/>`).join('')}<path d="M0,-14 L12,-7 L12,7 L0,14 L-12,7 L-12,-7 Z" fill="url(#hs-orb)" stroke="${OUT}" stroke-width="2.6"/><path d="M-6,-6 L0,-10 L6,-6" stroke="#fff" stroke-width="2" fill="none"/></g>`},
    {id:'armL',parent:'body',pivot:[204,262],svg:armSvg(-1)},
    {id:'armR',parent:'body',pivot:[308,262],svg:armSvg(1)},
    {id:'iceArmL',parent:'armL',pivot:[204,262],svg:armIce(-1)},
    {id:'iceArmR',parent:'armR',pivot:[308,262],svg:armIce(1)},
    {id:'head',parent:'body',pivot:[256,236],svg:`
      <path d="M214,168 C204,158 206,146 216,146 C226,148 230,160 226,170 Z M298,168 C308,158 306,146 296,146 C286,148 282,160 286,170 Z" fill="#c99a76" stroke="${OUT}" stroke-width="3"/>
      <path d="M256,136 C290,136 306,160 306,190 C306,216 290,236 270,248 C264,256 262,262 256,266 C250,262 248,256 242,248 C222,236 206,216 206,190 C206,160 222,136 256,136 Z" fill="url(#hs-fur)" stroke="${OUT}" stroke-width="4.5"/>
      <path d="M216,176 C220,150 238,140 256,140 C274,140 292,150 296,176 C286,170 270,166 256,168 C242,166 226,170 216,176 Z" fill="url(#hs-body)" stroke="${OUT}" stroke-width="3"/>
      ${scale(236,146,22,24,-14)}${scale(256,142,24,26)}${scale(276,146,22,24,14)}${scale(224,160,20,20,-24)}${scale(246,158,20,22,-6)}${scale(266,158,20,22,6)}${scale(288,160,20,20,24)}
      <path d="M246,232 C250,250 252,258 256,266 C260,258 262,250 266,232" stroke="#b8a68a" stroke-width="2.4" fill="none"/>
      <ellipse cx="256" cy="262" rx="7" ry="5" fill="#3a2a2a" stroke="${OUT}" stroke-width="2"/><circle cx="254" cy="260" r="1.6" fill="#fff" opacity=".6"/>
      <path d="M220,184 C228,180 236,180 242,184 M292,184 C284,180 276,180 270,184" stroke="#8d7a60" stroke-width="2.4" fill="none" stroke-linecap="round"/>`},
    {id:'eyes',parent:'head',pivot:[256,196],svg:`<ellipse cx="232" cy="198" rx="8" ry="7.5" fill="url(#hs-eye)" stroke="${OUT}" stroke-width="2.4"/><ellipse cx="280" cy="198" rx="8" ry="7.5" fill="url(#hs-eye)" stroke="${OUT}" stroke-width="2.4"/><circle cx="233" cy="199" r="3.4" fill="#0e2836"/><circle cx="279" cy="199" r="3.4" fill="#0e2836"/><circle cx="229" cy="195" r="2" fill="#fff"/><circle cx="276" cy="195" r="2" fill="#fff"/>`},
    {id:'eyeGlow',parent:'head',pivot:[256,196],glow:true,pad:26,svg:`<g filter="url(#hs-blur)" fill="#8fe6ff" opacity=".6"><ellipse cx="232" cy="198" rx="17" ry="12"/><ellipse cx="280" cy="198" rx="17" ry="12"/></g>`},
    {id:'iceHead',parent:'head',pivot:[256,150],svg:`${shard(256,148,54,0,12)}${shard(232,152,40,-10,10)}${shard(280,152,40,10,10)}${shard(212,162,28,-16,8)}${shard(300,162,28,16,8)}${plate(230,160,22,22,-20)}${plate(282,160,22,22,20)}<path d="M214,176 C236,166 276,166 298,176" stroke="#e6fbff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>`},
    {id:'breath',parent:'head',pivot:[256,266],glow:true,pad:30,svg:`<g filter="url(#hs-blur)" fill="#e4f8ff" opacity=".7"><ellipse cx="250" cy="280" rx="20" ry="10"/><ellipse cx="270" cy="292" rx="16" ry="8"/></g>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase,th=s.thaw,alive=1-d,stun=s.stun?1:0;
    const breath=Math.sin(t*2),wad=Math.sin(ph)*m,shake=h*Math.sin(t*50)*(1-th*.0);
    // Curling into a ball on death: body rounds out, head tucks, legs and arms fold away.
    const B=P.body;B.r=wad*5+s.dodge*10+stun*Math.sin(t*5)*5+shake*3;B.x=s.dodge*-34+shake*4;
    B.y=-Math.abs(wad)*6-w*8+a*4+d*24;B.sy=1+breath*.015+w*.04-a*.04-d*.24;B.sx=1-breath*.008+a*.03+d*.08;
    P.legL.r=Math.max(0,Math.sin(ph))*-18*m+d*-30+(s.root?Math.sin(t*28)*3:0);P.legL.y=-Math.max(0,Math.sin(ph))*10*m-d*26;
    P.legR.r=Math.max(0,-Math.sin(ph))*18*m+d*30-(s.root?Math.sin(t*26)*3:0);P.legR.y=-Math.max(0,-Math.sin(ph))*10*m-d*26;
    P.tail.r=Math.sin(t*1.2)*4+wad*-6-w*4+a*3+d*-48;P.tail.sx=1-d*.1;
    // Arms raise the crystal on the wind-up and push it forward on the throw.
    P.armL.r=w*-22+a*12+Math.sin(t*1.8)*2+wad*4+d*40;P.armR.r=w*22-a*12-Math.sin(t*1.8)*2+wad*4-d*40;
    P.armL.y=P.armR.y=-w*8+a*6+d*10;
    const O=P.orb;O.y=Math.sin(t*2.4)*4-w*14+a*-4+d*40+stun*Math.sin(t*3)*8;O.r=t*30;O.sx=O.sy=(1+w*.35+a*.5)*(1-d*.6);O.o=alive;
    P.orbGlow.o=(.45+Math.sin(t*3.1)*.12+w*.55+a*.6)*alive*(1-stun*.6);P.orbGlow.sx=P.orbGlow.sy=1+w*.4+a*.5;
    const H=P.head;H.r=Math.sin(t*.8)*3+wad*-3+h*8+stun*Math.sin(t*6)*9;H.y=w*-4+a*4+d*44;H.sy=1-d*.15;
    const blink=ease.blink(t,3.8+(s.seed%1));
    P.eyes.sy=Math.max(.1,1-blink*.9+w*.15-h*.6-(stun?.6:0)-d*.95);P.eyes.sx=1-th*.08;
    P.eyeGlow.o=(.5+w*.5+a*.3)*alive*(1-th*.6);
    P.breath.o=(Math.max(0,Math.sin(t*1.3))*.5+w*.3)*alive*(1-th*.7);P.breath.y=Math.sin(t*1.3)*4;P.breath.sx=1+Math.max(0,Math.sin(t*1.3))*.4;
    // Ice layers fade as the armour breaks; the crest bristles on the wind-up.
    const ice=(1-th)*alive;for(const id of ['iceBody','iceHead','iceArmL','iceArmR','iceTail'])P[id].o=ice;
    P.iceHead.sy=1+w*.12;P.iceBody.sx=1+breath*.01;
    P.melt.o=th*alive;P.melt.y=(t*18)%6;
  },
};
