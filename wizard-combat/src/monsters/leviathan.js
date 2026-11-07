// Lilycrown Leviathan (species `colossus`) — a house-sized axolotl that walked up out of the drowned
// court with a garden on its back. Its gills are coral willow fronds, a ring of lotus crowns its brow,
// and a fallen star glows in its throat. The slow wind-up is the tell: the jaw drops, the gills flare
// and the star shines through before it lobs a huge glowing bubble.
import {ease,mirror} from './rig.js';

const OUT='#0f2226';
const defs=`
<radialGradient id="lv-skin" cx="50%" cy="22%" r="85%"><stop offset="0" stop-color="#8fc7bf"/><stop offset=".4" stop-color="#4f8e8e"/><stop offset=".8" stop-color="#28575f"/><stop offset="1" stop-color="#173339"/></radialGradient>
<linearGradient id="lv-jaw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ec5b4"/><stop offset="1" stop-color="#3d7472"/></linearGradient>
<linearGradient id="lv-belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8ead9"/><stop offset=".6" stop-color="#8fc4b0"/><stop offset="1" stop-color="#4c827a"/></linearGradient>
<linearGradient id="lv-limb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#244c52"/><stop offset=".5" stop-color="#5a9a94"/><stop offset="1" stop-color="#244c52"/></linearGradient>
<linearGradient id="lv-gill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd0d0"/><stop offset=".5" stop-color="#ec8e8c"/><stop offset="1" stop-color="#b04e5c"/></linearGradient>
<radialGradient id="lv-maw" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="#8a3c5a"/><stop offset=".6" stop-color="#3e1830"/><stop offset="1" stop-color="#14080f"/></radialGradient>
<radialGradient id="lv-star" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#fff2b8"/><stop offset="1" stop-color="#ffc35e"/></radialGradient>
<radialGradient id="lv-eye" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#3a3a4a"/><stop offset=".6" stop-color="#0d0f18"/><stop offset="1" stop-color="#000"/></radialGradient>
<linearGradient id="lv-pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6dc78"/><stop offset=".6" stop-color="#6c9d44"/><stop offset="1" stop-color="#3e6a2e"/></linearGradient>
<radialGradient id="lv-petal" cx="50%" cy="85%" r="90%"><stop offset="0" stop-color="#ff9cc0"/><stop offset=".5" stop-color="#ffd8e6"/><stop offset="1" stop-color="#fffafc"/></radialGradient>
<linearGradient id="lv-fin" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#5a9a94" stop-opacity=".9"/><stop offset="1" stop-color="#e3a0a8" stop-opacity=".75"/></linearGradient>
<filter id="lv-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>`;

const f=n=>n.toFixed(1);
// Coral willow-frond gill on the left side: a curving stalk lined with leaves, a glowing tip.
function frond(rx,ry,dx,dy,len,bend){
  const P0=[rx,ry],P2=[rx+dx*len,ry+dy*len],nx=-dy,ny=dx,P1=[rx+dx*len*.55+nx*bend,ry+dy*len*.55+ny*bend];
  const at=t=>[(1-t)**2*P0[0]+2*(1-t)*t*P1[0]+t*t*P2[0],(1-t)**2*P0[1]+2*(1-t)*t*P1[1]+t*t*P2[1]];
  const tan=t=>{const x=2*(1-t)*(P1[0]-P0[0])+2*t*(P2[0]-P1[0]),y=2*(1-t)*(P1[1]-P0[1])+2*t*(P2[1]-P1[1]);return Math.atan2(y,x);};
  let leaves='';for(let i=1;i<=9;i++){const t=i/10.2,[x,y]=at(t),a=tan(t),L=26-i*1.6,W=6.5-i*.3;
    for(const side of [-1,1]){const b=a+side*.9,tx=x+Math.cos(b)*L,ty=y+Math.sin(b)*L,px=-Math.sin(b)*W,py=Math.cos(b)*W;
      leaves+=`<path d="M${f(x)},${f(y)} Q${f(x+Math.cos(b)*L*.5+px)},${f(y+Math.sin(b)*L*.5+py)} ${f(tx)},${f(ty)} Q${f(x+Math.cos(b)*L*.5-px)},${f(y+Math.sin(b)*L*.5-py)} ${f(x)},${f(y)} Z" fill="url(#lv-gill)" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`;}}
  const d=`M${f(P0[0])},${f(P0[1])} Q${f(P1[0])},${f(P1[1])} ${f(P2[0])},${f(P2[1])}`;
  return `<path d="${d}" stroke="${OUT}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#d9767c" stroke-width="6" fill="none" stroke-linecap="round"/>${leaves}<circle cx="${f(P2[0])}" cy="${f(P2[1])}" r="8" fill="#ffe4ea" stroke="${OUT}" stroke-width="2.4"/><circle cx="${f(P2[0]-2)}" cy="${f(P2[1]-2)}" r="3" fill="#fff"/>`;
}
// [root x, root y, dir x, dir y, length, bend]
const GILLS=[[112,262,-.62,-.78,128,-26],[96,298,-.95,-.32,136,-22],[100,338,-.96,.12,120,-18]];
const gillParts=()=>GILLS.flatMap(([x,y,dx,dy,len,bend],i)=>{const svg=frond(x,y,dx,dy,len,bend);return [{id:'gillL'+i,parent:'head',pivot:[x,y],svg},{id:'gillR'+i,parent:'head',pivot:[512-x,y],svg:mirror(svg)}];});
const tipGlow=()=>GILLS.map(([x,y,dx,dy,len])=>[x+dx*len,y+dy*len]);

const lotus=(x,y,k=1)=>`<g transform="translate(${x} ${y}) scale(${k})">${[-62,-36,36,62,-14,14,0].map(a=>`<path d="M0,0 C${-9},-10 ${-8},-26 0,-36 C8,-26 9,-10 0,0 Z" fill="url(#lv-petal)" stroke="${OUT}" stroke-width="2.2" transform="rotate(${a})"/>`).join('')}<ellipse cx="0" cy="-6" rx="7" ry="4" fill="#ffd45e" stroke="${OUT}" stroke-width="1.6"/></g>`;
const pad=(x,y,r,rot)=>`<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse cx="0" cy="0" rx="${r}" ry="${f(r*.34)}" fill="url(#lv-pad)" stroke="${OUT}" stroke-width="2.4"/><path d="M0,0 L${f(r*.95)},-5 L${f(r*.95)},5 Z" fill="#3f7a78" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/><path d="M0,0 L${f(-r*.7)},0 M0,0 L${f(-r*.5)},${f(r*.18)} M0,0 L${f(-r*.5)},${f(-r*.18)}" stroke="#d8f0a8" stroke-width="1.4" opacity=".6"/></g>`;
const arm=(k)=>{const sx=256+k*112,hx=256+k*150;return `<path d="M${sx-k*30},408 C${sx+k*4},404 ${hx+k*14},440 ${hx+k*18},476 L${hx-k*30},480 C${hx-k*28},456 ${sx-k*40},436 ${sx-k*44},424 Z" fill="url(#lv-limb)" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"/>
  ${[-30,-12,8,26].map((dx,i)=>`<path d="M${hx+k*dx-6},474 C${hx+k*dx-8},486 ${hx+k*dx*1.25-6},492 ${hx+k*dx*1.25},494 C${hx+k*dx*1.25+7},492 ${hx+k*dx+8},486 ${hx+k*dx+6},474 Z" fill="#6fa8a0" stroke="${OUT}" stroke-width="2.6"/><circle cx="${hx+k*dx*1.25}" cy="490" r="4" fill="#d6f0e6" stroke="${OUT}" stroke-width="1.6"/>`).join('')}`;};

export const leviathan={
  name:'Lilycrown Leviathan',view:[512,512],ground:494,scale:1.12,stride:1.1,previewSpeed:3,
  defs,
  parts:[
    {id:'tail',parent:'body',pivot:[350,262],svg:`
      <path d="M330,270 C372,240 410,200 428,150 C440,118 462,104 482,112 C470,124 466,140 470,158 C456,206 410,256 360,296 Z" fill="url(#lv-skin)" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M352,248 C380,222 404,192 418,152 C426,128 446,110 470,104 C452,92 424,96 410,118 C390,150 374,196 344,232 Z" fill="url(#lv-fin)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M372,228 L390,210 M392,198 L408,176 M408,164 L420,140" stroke="#ffd0d8" stroke-width="2" opacity=".6"/>`},
    {id:'back',parent:'body',pivot:[256,250],svg:`
      <path d="M150,262 C156,214 202,186 256,184 C310,186 356,214 362,262 Z" fill="url(#lv-skin)" stroke="${OUT}" stroke-width="4.5"/>
      <path d="M168,232 C190,210 222,198 256,198 C290,198 322,210 344,232 C326,226 310,234 296,226 C280,236 266,226 252,232 C238,224 222,234 210,226 C196,234 182,226 168,232 Z" fill="url(#lv-pad)" stroke="${OUT}" stroke-width="3" opacity=".95"/>
      <g stroke="${OUT}" stroke-width="2.4">${[[208,206,118],[222,200,124],[300,204,120]].map(([x,y,top])=>`<path d="M${x},${y} C${x-2},${y-30} ${x+2},${top+14} ${x},${top}" fill="none" stroke-width="7"/><path d="M${x},${y} C${x-2},${y-30} ${x+2},${top+14} ${x},${top}" fill="none" stroke="#7aa24c" stroke-width="3.4"/><rect x="${x-4.5}" y="${top-2}" width="9" height="26" rx="4.5" fill="#7a4a2a"/>`).join('')}</g>
      ${lotus(322,212,.7)}<path d="M276,200 C272,180 286,164 296,160 C298,176 290,192 276,200 Z" fill="url(#lv-petal)" stroke="${OUT}" stroke-width="2.4"/>`},
    ...gillParts(),
    {id:'body',pivot:[256,470],svg:`<path d="M160,410 C204,422 308,422 352,410 C360,440 350,476 330,492 L182,492 C162,476 152,440 160,410 Z" fill="url(#lv-belly)" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"/><g fill="none" stroke="#5f978a" stroke-width="2.4" opacity=".6"><path d="M186,446 Q256,460 326,446"/><path d="M194,470 Q256,482 318,470"/></g>`},
    {id:'throatGlow',parent:'body',pivot:[256,452],glow:true,pad:40,svg:`<ellipse cx="256" cy="452" rx="62" ry="30" fill="#ffe19a" filter="url(#lv-blur)" opacity=".7"/>`},
    {id:'armL',parent:'body',pivot:[150,416],svg:arm(-1)},
    {id:'armR',parent:'body',pivot:[362,416],svg:arm(1)},
    {id:'maw',parent:'head',pivot:[256,390],svg:`<path d="M132,362 Q256,420 380,362 C374,404 330,434 256,436 C182,434 138,404 132,362 Z" fill="url(#lv-maw)" stroke="${OUT}" stroke-width="3"/><path d="M200,418 C224,404 288,404 312,418 C296,432 216,432 200,418 Z" fill="#c45c7a" stroke="${OUT}" stroke-width="2.4"/>`},
    {id:'starGlow',parent:'head',pivot:[256,410],glow:true,pad:50,svg:`<circle cx="256" cy="410" r="52" fill="#fff0b0" filter="url(#lv-blur)"/>`},
    {id:'star',parent:'head',pivot:[256,410],svg:`<path d="M256,384 L263,403 L282,410 L263,417 L256,436 L249,417 L230,410 L249,403 Z" fill="url(#lv-star)" stroke="#a86a1c" stroke-width="2"/><circle cx="256" cy="410" r="6" fill="#fff"/>`},
    {id:'head',parent:'body',pivot:[256,420],svg:`
      <path d="M256,224 C334,224 396,250 418,298 C432,330 420,356 396,364 C352,382 304,392 256,392 C208,392 160,382 116,364 C92,356 80,330 94,298 C116,250 178,224 256,224 Z" fill="url(#lv-skin)" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M150,262 C190,238 236,232 280,234" stroke="#d6fff4" stroke-width="5" fill="none" opacity=".35" stroke-linecap="round"/>
      <path d="M124,358 C170,384 220,394 256,394 C292,394 342,384 388,358" stroke="${OUT}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M116,350 C110,356 112,364 122,366 M396,350 C402,356 400,364 390,366" stroke="${OUT}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g fill="#b8fff0" opacity=".75">${[[200,266,3],[226,256,2.4],[290,258,2.6],[318,268,3],[176,290,2],[340,292,2.2],[256,252,2],[150,320,2.4],[362,322,2.4],[236,282,1.8],[278,284,1.8]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
      <g fill="none" stroke="#1f4248" stroke-width="2.4" opacity=".45" stroke-linecap="round"><path d="M220,318 C236,326 276,326 292,318"/><path d="M244,300 L246,306 M268,300 L266,306"/></g>`},
    {id:'crown',parent:'head',pivot:[256,236],svg:`
      ${pad(170,250,36,-14)}${pad(214,238,38,172)}${pad(298,238,38,8)}${pad(342,250,36,194)}${pad(256,232,40,180)}
      ${lotus(184,234,.78)}${lotus(220,222,.9)}${lotus(292,222,.9)}${lotus(328,234,.78)}${lotus(256,214,1.05)}`},
    {id:'eyes',parent:'head',pivot:[256,300],svg:`${[150,362].map(x=>`<circle cx="${x}" cy="300" r="20" fill="#e0b85a" stroke="${OUT}" stroke-width="3.4"/><circle cx="${x}" cy="300" r="14" fill="url(#lv-eye)"/><circle cx="${x-5}" cy="294" r="5" fill="#fff"/><circle cx="${x+5}" cy="306" r="2" fill="#fff" opacity=".7"/>`).join('')}`},
    {id:'eyeGlow',parent:'head',pivot:[256,300],glow:true,pad:30,svg:`<g filter="url(#lv-blur)" fill="#ffd36e" opacity=".6"><circle cx="150" cy="300" r="26"/><circle cx="362" cy="300" r="26"/></g>`},
    {id:'tips',parent:'head',pivot:[256,300],glow:true,pad:30,svg:`<g filter="url(#lv-blur)" fill="#ffb8c6">${tipGlow().flatMap(([x,y])=>[`<circle cx="${f(x)}" cy="${f(y)}" r="16"/>`,`<circle cx="${f(512-x)}" cy="${f(y)}" r="16"/>`]).join('')}</g>`},
    {id:'jaw',parent:'head',pivot:[256,380],svg:`
      <path d="M126,360 C170,386 220,396 256,396 C292,396 342,386 386,360 C384,396 340,436 256,440 C172,436 128,396 126,360 Z" fill="url(#lv-jaw)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M170,396 C206,420 306,420 342,396" stroke="#d8fff0" stroke-width="3" fill="none" opacity=".4" stroke-linecap="round"/>
      <g fill="#b8fff0" opacity=".6"><circle cx="210" cy="410" r="2.4"/><circle cx="302" cy="410" r="2.4"/><circle cx="256" cy="424" r="2"/></g>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase,alive=1-d,stun=s.stun?1:0;
    const breath=Math.sin(t*1.3),rock=Math.sin(ph)*m,shake=h*Math.sin(t*40);
    const B=P.body;B.r=rock*3+shake*1.5+stun*Math.sin(t*3)*2;B.x=shake*4;B.y=-Math.abs(rock)*5+d*30;B.sy=1+breath*.012-d*.12;B.sx=1+d*.06;
    // Heavy waddle: the arm on the lifted side swings forward.
    P.armL.r=Math.max(0,Math.sin(ph))*-16*m-w*6+d*30;P.armL.y=-Math.max(0,Math.sin(ph))*12*m;
    P.armR.r=Math.max(0,-Math.sin(ph))*16*m+w*6-d*30;P.armR.y=-Math.max(0,-Math.sin(ph))*12*m;
    const H=P.head;H.r=-rock*2+Math.sin(t*.7)*1.5+h*3+stun*Math.sin(t*4)*5+d*-6;H.y=breath*3-w*22+a*14+d*46;H.sx=H.sy=1-w*.02+a*.06;
    // The jaw drops through the slow wind-up to show the star, then snaps half shut on the shot.
    const open=Math.max(w,a*.55,d*.4);P.jaw.y=open*52+breath*1.5;P.jaw.sy=1+open*.12;P.jaw.sx=1+open*.04;P.jaw.r=stun*Math.sin(t*5)*3;
    P.maw.sy=.9+open*.3;P.star.r=t*24;P.star.sx=P.star.sy=(.7+w*.6+a*.8)*(1-d*.5);P.star.y=open*20;
    P.starGlow.o=(Math.max(w,a)*1+Math.sin(t*2)*.05)*alive;P.starGlow.sx=P.starGlow.sy=.6+w*.6+a*.9;P.starGlow.y=open*20;
    P.throatGlow.o=(.25+Math.sin(t*1.1)*.1+w*.6+a*.4)*alive;
    // Gills wave like weed in a current, flare on the wind-up, go limp when stunned or dead.
    const limp=Math.max(stun*.7,d);
    GILLS.forEach((_,i)=>{const wave=Math.sin(t*1.6+i*.9)*6+Math.sin(t*3.1+i)*2,flare=w*(10+i*4)-a*8;
      P['gillL'+i].r=(wave+flare+rock*4)*(1-limp)+limp*(16+i*10);P['gillR'+i].r=-(Math.sin(t*1.6+i*.9+1.3)*6+Math.sin(t*3.3+i)*2+flare-rock*4)*(1-limp)-limp*(16+i*10);
      P['gillL'+i].sx=P['gillR'+i].sx=1+w*.06-limp*.08;});
    P.tips.o=(.4+Math.sin(t*2.2)*.15+w*.5)*alive*(1-stun*.6);
    P.crown.r=Math.sin(t*.9)*1.5;P.crown.sx=P.crown.sy=1+w*.06+Math.sin(t*1.7)*.01-d*.2;
    P.back.y=breath*2-w*6+d*20;P.tail.r=Math.sin(t*.8)*5+rock*6-w*4+d*20;
    const blink=ease.blink(t,6.1,.2);P.eyes.sy=Math.max(.1,1-blink*.92-h*.4-(stun?.55:0)-d*.9+w*.1);
    P.eyeGlow.o=(.4+w*.6+a*.3)*alive;
  },
};
