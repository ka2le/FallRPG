// Needle Piper (species `swarm`) — a bundle of hollow reeds tied with grass twine, wearing a
// birch-bark mask. It walks in broods, swells its moss bellows and blows thorn darts through
// the reed mouthpiece in its mask. Front view; each reed is its own part so the bundle can fan,
// whip and fall apart.
import {ease} from './rig.js';

const OUT='#1b1a10';
const defs=`
<linearGradient id="np-reed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#435f27"/><stop offset=".28" stop-color="#9fb95c"/><stop offset=".42" stop-color="#d6e49b"/><stop offset=".64" stop-color="#8aa848"/><stop offset="1" stop-color="#3a5523"/></linearGradient>
<linearGradient id="np-reedDark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#34481f"/><stop offset=".4" stop-color="#7e9a46"/><stop offset="1" stop-color="#2e421c"/></linearGradient>
<linearGradient id="np-twine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6cb8a"/><stop offset=".55" stop-color="#b8924f"/><stop offset="1" stop-color="#7a5d30"/></linearGradient>
<radialGradient id="np-moss" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#c8e585"/><stop offset=".5" stop-color="#7fae4a"/><stop offset="1" stop-color="#40682c"/></radialGradient>
<radialGradient id="np-bark" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#fffbef"/><stop offset=".6" stop-color="#ebe2cb"/><stop offset="1" stop-color="#bfb193"/></radialGradient>
<radialGradient id="np-eye" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#f4fff2"/><stop offset=".35" stop-color="#8ff6cf"/><stop offset="1" stop-color="#1b8b72"/></radialGradient>
<linearGradient id="np-twig" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b2a1b"/><stop offset=".5" stop-color="#7a5a3a"/><stop offset="1" stop-color="#3a291a"/></linearGradient>
<linearGradient id="np-blade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f0a0"/><stop offset=".5" stop-color="#8fbf55"/><stop offset="1" stop-color="#4c7d33"/></linearGradient>
<filter id="np-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>`;

// One vertical reed tube centred on X, open at the top, with growth nodes.
function reed(X,yt,yb,w=14,grad='np-reed',sheath=0){
  let s=`<path d="M${X-w},${yb} L${X-w+1},${yt} L${X+w-1},${yt} L${X+w},${yb} Z" fill="url(#${grad})" stroke="${OUT}" stroke-width="3.6" stroke-linejoin="round"/>`;
  s+=`<path d="M${X-w*.42},${yt+12} L${X-w*.4},${yb-14}" stroke="#f3f8d2" stroke-width="2.4" opacity=".42" stroke-linecap="round"/>`;
  for(let y=yt+46;y<yb-26;y+=58)s+=`<path d="M${X-w-1.5},${y} Q${X},${y+6} ${X+w+1.5},${y}" stroke="${OUT}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M${X-w+3},${y-3.5} Q${X},${y+1.5} ${X+w-3},${y-3.5}" stroke="#eef6c0" stroke-width="1.6" fill="none" opacity=".55"/>`;
  if(sheath){const y=yt+46+58,k=sheath;s+=`<path d="M${X+k*w},${y} C${X+k*(w+18)},${y-10} ${X+k*(w+30)},${y-40} ${X+k*(w+22)},${y-70} C${X+k*(w+14)},${y-44} ${X+k*(w+4)},${y-22} ${X+k*(w-2)},${y-6} Z" fill="url(#np-blade)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>`;}
  s+=`<ellipse cx="${X}" cy="${yt}" rx="${w-1}" ry="5.5" fill="#dbe8a8" stroke="${OUT}" stroke-width="3"/><ellipse cx="${X}" cy="${yt+1}" rx="${w-5}" ry="3.2" fill="#15150a"/>`;
  return s;
}
// Reeds fan out from the twine binding: [x, top, tilt°, gradient, sheath side]
const REEDS=[[204,176,-13,'np-reedDark',0],[230,132,-6,'np-reed',-1],[256,92,0,'np-reed',0],[282,124,6,'np-reed',1],[308,170,13,'np-reedDark',0]];
const reedPart=(i)=>{const [x,top,tilt,g,sh]=REEDS[i];return {id:'reed'+i,parent:'body',pivot:[x,398],svg:`<g transform="rotate(${tilt} ${x} 398)">${reed(x,top,410,i===2?15:14,g,sh)}</g>`};};

const leg=(k)=>{const x=256+k*22,fx=256+k*36;return `<path d="M${x-5},446 C${x-4+k*6},462 ${fx-6},474 ${fx-5},490 L${fx+5},490 C${fx+5},474 ${x+6+k*6},462 ${x+6},446 Z" fill="url(#np-twig)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M${fx-2},488 C${fx-14},490 ${fx-22},492 ${fx-26},495 M${fx},489 C${fx+k*2},492 ${fx+k*4},494 ${fx+k*6},496 M${fx+2},488 C${fx+12},490 ${fx+20},492 ${fx+24},495" stroke="${OUT}" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M${fx-2},488 C${fx-14},490 ${fx-22},492 ${fx-26},495 M${fx},489 C${fx+k*2},492 ${fx+k*4},494 ${fx+k*6},496 M${fx+2},488 C${fx+12},490 ${fx+20},492 ${fx+24},495" stroke="#6d5034" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;};
// Twig arm ending in a three-leaf hand, k = -1 left / +1 right.
const arm=(k)=>{const x=256+k*62,hx=256+k*92,hy=426;return `<path d="M${x},380 C${x+k*14},392 ${hx-k*8},${hy-20} ${hx},${hy}" stroke="${OUT}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M${x},380 C${x+k*14},392 ${hx-k*8},${hy-20} ${hx},${hy}" stroke="#7a5a3a" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  ${[-30,0,30].map(a=>`<path d="M${hx},${hy} q${k*4},10 0,24 q${-k*8},-10 0,-24 Z" fill="url(#np-blade)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round" transform="rotate(${a+k*-10} ${hx} ${hy})"/>`).join('')}`;};
// Long grass-blade ear hanging from the mask, k = -1 left / +1 right.
const ear=(k)=>{const x=256+k*46;return `<path d="M${x},262 C${x+k*30},250 ${x+k*70},258 ${x+k*104},286 C${x+k*78},282 ${x+k*44},280 ${x+k*4},284 Z" fill="url(#np-blade)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M${x+k*6},272 C${x+k*40},266 ${x+k*70},272 ${x+k*96},284" stroke="#eefcc6" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>`;};

export const piper={
  name:'Needle Piper',view:[512,512],ground:494,scale:1.2,stride:3.2,previewSpeed:5,
  defs,
  parts:[
    {id:'legL',parent:'body',pivot:[234,446],svg:leg(-1)},
    {id:'legR',parent:'body',pivot:[278,446],svg:leg(1)},
    reedPart(0),reedPart(4),reedPart(1),reedPart(3),reedPart(2),
    {id:'armL',parent:'body',pivot:[194,380],svg:arm(-1)},
    {id:'armR',parent:'body',pivot:[318,380],svg:arm(1)},
    {id:'belly',parent:'body',pivot:[256,402],svg:`
      <path d="M190,404 C186,430 204,456 228,460 C236,466 246,458 256,464 C266,458 276,466 284,460 C308,456 326,430 322,404 Z" fill="url(#np-moss)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M204,414 C210,436 226,448 244,450" stroke="#eaffbe" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>
      <g fill="#e2f6b2" opacity=".7"><circle cx="228" cy="424" r="2.6"/><circle cx="276" cy="432" r="2.2"/><circle cx="300" cy="416" r="2"/><circle cx="250" cy="442" r="1.8"/></g>
      <g fill="#2f4d22" opacity=".45"><circle cx="292" cy="440" r="3"/><circle cx="214" cy="440" r="2.4"/></g>`},
    {id:'body',pivot:[256,446],svg:`
      <path d="M192,360 Q256,374 320,360 L322,404 Q256,418 190,404 Z" fill="url(#np-twine)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <g stroke="#6e5229" stroke-width="2.2" opacity=".8" fill="none">${[...Array(13)].map((_,i)=>{const x=198+i*10;return `<path d="M${x},${364+Math.abs(i-6)*.2} L${x+8},${406-Math.abs(i-6)*.4}"/>`;}).join('')}</g>
      <path d="M196,372 Q256,386 316,372" stroke="#fff0c4" stroke-width="2.4" fill="none" opacity=".5"/>
      <path d="M194,390 Q256,404 318,390" stroke="${OUT}" stroke-width="2.4" fill="none" opacity=".45"/>
      <g transform="translate(300 380)">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-8" rx="5.5" ry="8.5" fill="#fff4c9" stroke="${OUT}" stroke-width="2" transform="rotate(${a})"/>`).join('')}<circle r="4" fill="#f0b43e" stroke="${OUT}" stroke-width="1.6"/></g>`},
    {id:'earL',parent:'mask',pivot:[214,268],svg:ear(-1)},
    {id:'earR',parent:'mask',pivot:[298,268],svg:ear(1)},
    {id:'mask',parent:'body',pivot:[256,344],svg:`
      <path d="M256,232 C292,232 314,254 314,286 C314,318 290,346 256,350 C222,346 198,318 198,286 C198,254 220,232 256,232 Z" fill="url(#np-bark)" stroke="${OUT}" stroke-width="4.5"/>
      <g fill="#3a3226" opacity=".8">${[[222,252,14],[266,246,18],[294,264,10],[212,312,12],[288,322,16],[244,338,10],[300,296,8]].map(([x,y,w])=>`<rect x="${x}" y="${y}" width="${w}" height="3" rx="1.5"/>`).join('')}</g>
      <path d="M302,244 C312,236 322,240 318,250 C314,246 308,246 302,250 Z" fill="#d8ccad" stroke="${OUT}" stroke-width="2"/>
      <path d="M212,262 C220,246 238,238 254,238" stroke="#ffffff" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
      <path d="M214,286 C222,272 240,272 248,286 C240,298 222,298 214,286 Z" fill="#171309"/>
      <path d="M298,286 C290,272 272,272 264,286 C272,298 290,298 298,286 Z" fill="#171309"/>
      <path d="M212,276 C222,266 240,266 250,276" stroke="#5b4c34" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M300,276 C290,266 272,266 262,276" stroke="#5b4c34" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M206,300 C200,290 196,312 204,320 M306,300 C312,290 316,312 308,320" stroke="#8a6f4b" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g fill="#5fae8a" opacity=".85"><path d="M222,300 l4,10 l4,-10 Z"/><path d="M282,300 l4,10 l4,-10 Z"/></g><g fill="#c9604a" opacity=".7"><circle cx="256" cy="258" r="4"/><circle cx="246" cy="250" r="2.4"/><circle cx="266" cy="250" r="2.4"/></g>
      <path d="M200,292 C188,296 184,306 186,316 M312,292 C324,296 328,306 326,316" stroke="url(#np-twine)" stroke-width="4" fill="none" stroke-linecap="round"/>`},
    {id:'eyes',parent:'mask',pivot:[256,286],svg:`<ellipse cx="231" cy="286" rx="9" ry="7" fill="url(#np-eye)"/><ellipse cx="281" cy="286" rx="9" ry="7" fill="url(#np-eye)"/><circle cx="234" cy="286" r="3" fill="#0d3f33"/><circle cx="278" cy="286" r="3" fill="#0d3f33"/><circle cx="228" cy="283" r="2" fill="#fff"/><circle cx="284" cy="283" r="2" fill="#fff"/>`},
    {id:'eyeGlow',parent:'mask',pivot:[256,286],glow:true,pad:30,svg:`<g filter="url(#np-blur)" fill="#6ff0c4" opacity=".7"><ellipse cx="231" cy="286" rx="20" ry="13"/><ellipse cx="281" cy="286" rx="20" ry="13"/></g>`},
    {id:'mouth',parent:'mask',pivot:[256,322],svg:`<circle cx="256" cy="322" r="15" fill="url(#np-reed)" stroke="${OUT}" stroke-width="3.4"/><circle cx="256" cy="322" r="9.5" fill="#cfdf98" stroke="${OUT}" stroke-width="2.2"/><circle cx="256" cy="322" r="6" fill="#120f07"/><path d="M247,314 A12,12 0 0 1 262,311" stroke="#f4fadc" stroke-width="2" fill="none" opacity=".7"/>`},
    {id:'puff',parent:'mask',pivot:[256,322],glow:true,pad:40,svg:`<g filter="url(#np-blur)"><circle cx="256" cy="322" r="26" fill="#e8ffb0" opacity=".85"/></g><g fill="#fbffd9"><circle cx="232" cy="306" r="4"/><circle cx="284" cy="310" r="3.5"/><circle cx="270" cy="340" r="3"/><circle cx="238" cy="340" r="3.2"/><circle cx="256" cy="296" r="2.6"/></g>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase,alive=1-d;
    const breath=Math.sin(t*3.1),hop=Math.abs(Math.sin(ph))*m*alive,stun=s.stun?Math.sin(t*9):0,shake=h*Math.sin(t*60);
    const B=P.body;
    B.y=-hop*24+w*6-a*4+d*28;B.x=s.dodge*-34+shake*4;
    B.r=Math.cos(ph)*7*m+stun*8+s.dodge*14+shake*3+d*-8;
    B.sy=1+breath*.015-w*.05+a*.06-d*.1;B.sx=1-w*.02+d*.06;
    // Quick little steps: the lifted leg tucks while the body is high.
    const lift=Math.sin(ph);
    P.legL.r=Math.max(0,lift)*-26*m-w*6+d*40+(s.root?Math.sin(t*30)*4:0);P.legL.y=-Math.max(0,lift)*8*m;
    P.legR.r=Math.max(0,-lift)*26*m+w*6-d*40-(s.root?Math.sin(t*27)*4:0);P.legR.y=-Math.max(0,-lift)*8*m;
    // Reeds lag behind the hop, fan out on the inhale, whip on the shot and topple on death.
    const lag=-Math.cos(ph)*m*5,sway=k=>Math.sin(t*1.8+k*1.1)*2.2;
    [-2,-1,0,1,2].forEach((k,i)=>{const R=P['reed'+i];R.r=sway(i)+lag*(k===0?.5:1)+k*(w*5-a*3)+stun*k*2+d*(k?k*24:8)+h*k*3;R.y=d*k*k*4;R.sy=1-d*.06;});
    P.belly.sx=1+breath*.03+w*.13-a*.14+h*.06-d*.2;P.belly.sy=1+breath*.04+w*.22-a*.2-d*.35;
    P.armL.r=w*95-a*20+Math.sin(ph)*16*m+Math.sin(t*2.3)*4+d*50;P.armR.r=-w*95+a*20+Math.sin(ph)*16*m-Math.sin(t*2.3+1)*4-d*50;
    const M=P.mask;M.y=-w*8+a*4+d*26;M.r=Math.sin(t*1.3)*2+stun*6+h*5;M.sx=M.sy=1+a*.07-w*.02;
    P.earL.r=Math.sin(t*2.4)*5-hop*14+w*-24+a*16+h*12+(s.stun?20:0)+d*30;P.earR.r=-Math.sin(t*2.4+.5)*5+hop*14+w*24-a*16-h*12-(s.stun?20:0)-d*30;
    const blink=ease.blink(t,3.2+(s.seed%1)*1.4);
    P.eyes.sy=Math.max(.1,1-blink*.9+w*.25-h*.6-(s.stun?.6:0)-d*.9);P.eyes.sx=1+w*.12;
    P.eyeGlow.o=(.55+w*.45+a*.3+Math.sin(t*3.4)*.08)*alive;P.eyeGlow.sx=P.eyeGlow.sy=1+w*.3;
    P.mouth.sx=P.mouth.sy=1+w*.18+a*.22;
    P.puff.o=a*alive;P.puff.sx=P.puff.sy=.6+(1-a)*.9;
  },
};
