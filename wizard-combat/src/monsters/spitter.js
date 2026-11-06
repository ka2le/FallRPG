// Hex Spitter — front-facing spider. Eight two-segment legs are generated from joint/knee/foot
// points and mirrored, so a symmetric creature only needs its left half described.
import {ease,mirror} from './rig.js';

const OUT='#140b1c';
const defs=`
<radialGradient id="hx-abd" cx="42%" cy="34%" r="70%"><stop offset="0" stop-color="#9a72c6"/><stop offset=".45" stop-color="#5a3a7e"/><stop offset=".85" stop-color="#2e1c44"/><stop offset="1" stop-color="#1d1230"/></radialGradient>
<radialGradient id="hx-tho" cx="45%" cy="30%" r="75%"><stop offset="0" stop-color="#8a68b0"/><stop offset=".5" stop-color="#4a3068"/><stop offset="1" stop-color="#221535"/></radialGradient>
<linearGradient id="hx-leg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5aa3"/><stop offset=".5" stop-color="#3e2759"/><stop offset="1" stop-color="#21142f"/></linearGradient>
<linearGradient id="hx-legFar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4e3768"/><stop offset="1" stop-color="#1a1026"/></linearGradient>
<linearGradient id="hx-fang" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2552"/><stop offset=".55" stop-color="#2a1a3c"/><stop offset=".8" stop-color="#d9c8ef"/><stop offset="1" stop-color="#f5ecff"/></linearGradient>
<radialGradient id="hx-eye" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff2fd"/><stop offset=".35" stop-color="#ff8fe6"/><stop offset="1" stop-color="#8a1f78"/></radialGradient>
<radialGradient id="hx-rune" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd6ff"/><stop offset="1" stop-color="#d77cff"/></radialGradient>
<filter id="hx-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="hx-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>`;

// Tapered, slightly bowed limb segment from A to B with rounded ends.
function limb(A,B,wa,wb,bow=.18,fill='url(#hx-leg)'){
  const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L,nx=-uy,ny=ux,mx=(A[0]+B[0])/2,my=(A[1]+B[1])/2,bw=(wa+wb)/2*(1+bow);
  const p=(x,y)=>`${x.toFixed(1)},${y.toFixed(1)}`;
  const a1=p(A[0]+nx*wa,A[1]+ny*wa),a2=p(A[0]-nx*wa,A[1]-ny*wa),b1=p(B[0]+nx*wb,B[1]+ny*wb),b2=p(B[0]-nx*wb,B[1]-ny*wb);
  const c1=p(mx+nx*bw,my+ny*bw),c2=p(mx-nx*bw*.8,my-ny*bw*.8);
  const d=`M${a1} Q${c1} ${b1} A${wb},${wb} 0 0 1 ${b2} Q${c2} ${a2} A${wa},${wa} 0 0 1 ${a1} Z`;
  const hl=`M${p(A[0]+nx*wa*.45,A[1]+ny*wa*.45)} Q${p(mx+nx*bw*.6,my+ny*bw*.6)} ${p(B[0]+nx*wb*.4,B[1]+ny*wb*.4)}`;
  const bands=[.3,.62].map(f=>{const x=A[0]+dx*f,y=A[1]+dy*f,w=(wa+(wb-wa)*f)*1.05;return `<path d="M${p(x+nx*w,y+ny*w)} Q${p(x+ux*6,y+uy*6)} ${p(x-nx*w,y-ny*w)}" stroke="#c9a6f0" stroke-width="3" fill="none" opacity=".35"/>`;}).join('');
  const hairs=[.2,.45,.7].map(f=>{const x=A[0]+dx*f+nx*(wa+(wb-wa)*f),y=A[1]+dy*f+ny*(wa+(wb-wa)*f);return `<path d="M${p(x,y)} l${(nx*9+ux*5).toFixed(1)},${(ny*9+uy*5).toFixed(1)}" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>`;}).join('');
  return `${hairs}<path d="${d}" fill="${fill}" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>${bands}<path d="${hl}" stroke="#d8c2f7" stroke-width="2.2" fill="none" opacity=".5" stroke-linecap="round"/>`;
}
// Leg layout for the left side: [joint, knee, foot]. Back pairs are drawn darker behind the thorax.
const LEGS={1:[[226,392],[148,316],[146,486]],2:[[216,380],[94,282],[70,476]],3:[[216,366],[84,238],[34,450]],4:[[224,352],[132,208],[100,434]]};
const legParts=(n,far)=>{const [J,K,F]=LEGS[n],fill=far?'url(#hx-legFar)':'url(#hx-leg)',tip=[F[0]+(K[0]-F[0])*.08,F[1]+(K[1]-F[1])*.08];
  const femur=limb(J,K,15,11,.2,fill)+`<circle cx="${K[0]}" cy="${K[1]}" r="11" fill="${far?'#3a2850':'#6d4f92'}" stroke="${OUT}" stroke-width="3"/>`;
  const tibia=limb(K,tip,10,3.5,.12,fill)+`<path d="M${F[0]-2},${F[1]-14} L${F[0]},${F[1]+2} L${F[0]+4},${F[1]-12} Z" fill="#e3d2f7" stroke="${OUT}" stroke-width="1.6"/>`;
  return [
    {id:`L${n}f`,parent:'thorax',pivot:J,svg:femur},{id:`L${n}t`,parent:`L${n}f`,pivot:K,svg:tibia},
    {id:`R${n}f`,parent:'thorax',pivot:[512-J[0],J[1]],svg:mirror(femur)},{id:`R${n}t`,parent:`R${n}f`,pivot:[512-K[0],K[1]],svg:mirror(tibia)},
  ];};
const eyes=`
  <circle cx="236" cy="352" r="13" fill="url(#hx-eye)" stroke="${OUT}" stroke-width="3"/><circle cx="276" cy="352" r="13" fill="url(#hx-eye)" stroke="${OUT}" stroke-width="3"/>
  <circle cx="214" cy="340" r="7" fill="url(#hx-eye)" stroke="${OUT}" stroke-width="2.4"/><circle cx="298" cy="340" r="7" fill="url(#hx-eye)" stroke="${OUT}" stroke-width="2.4"/>
  <circle cx="242" cy="331" r="6" fill="url(#hx-eye)" stroke="${OUT}" stroke-width="2.2"/><circle cx="270" cy="331" r="6" fill="url(#hx-eye)" stroke="${OUT}" stroke-width="2.2"/>
  <g fill="#fff"><circle cx="232" cy="347" r="3.6"/><circle cx="272" cy="347" r="3.6"/><circle cx="212" cy="338" r="2"/><circle cx="296" cy="338" r="2"/><circle cx="240" cy="329" r="1.8"/><circle cx="268" cy="329" r="1.8"/></g>`;
const fang=`<path d="M236,390 C222,392 214,404 216,418 C218,428 226,432 234,428 C232,446 236,462 248,472 C244,456 246,440 252,426 C258,412 254,394 236,390 Z" fill="url(#hx-fang)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M226,400 C222,408 222,416 226,422" stroke="#a789cc" stroke-width="2" fill="none" opacity=".6"/>`;
const palp=limb([224,396],[196,428],8,5,.2)+limb([196,428],[204,452],5,3,.1)+`<circle cx="196" cy="428" r="6" fill="#6d4f92" stroke="${OUT}" stroke-width="2"/>`;
const hexRune=`<g transform="translate(256 252)"><circle r="38" fill="none" stroke="url(#hx-rune)" stroke-width="4"/><path d="M-27,0 Q0,-24 27,0 Q0,24 -27,0 Z" fill="none" stroke="url(#hx-rune)" stroke-width="3.6" stroke-linejoin="round"/><path d="M0,-13 Q6,0 0,13 Q-6,0 0,-13 Z" fill="#ffd6ff"/>${[0,60,120,180,240,300].map(a=>{const r=a*Math.PI/180,s=Math.sin(r),c=Math.cos(r);return `<path d="M${(s*44).toFixed(1)},${(-c*44).toFixed(1)} L${(s*54).toFixed(1)},${(-c*54).toFixed(1)}" stroke="#f0b7ff" stroke-width="3.4" stroke-linecap="round"/>`;}).join('')}</g>`;

export const spitter={
  name:'Hex Spitter',view:[512,512],ground:494,scale:1.18,stride:2.2,previewSpeed:5,
  defs,
  parts:[
    {id:'thorax',pivot:[256,372],svg:''},
    {id:'abdomen',parent:'thorax',pivot:[256,330],svg:`
      <g stroke="${OUT}" stroke-width="2" stroke-linecap="round">${Array.from({length:15},(_,i)=>{const a=(-160+i*20)*Math.PI/180,x=256+Math.cos(a)*104,y=250+Math.sin(a)*94;return `<path d="M${x.toFixed(1)},${y.toFixed(1)} l${(Math.cos(a)*12).toFixed(1)},${(Math.sin(a)*12-3).toFixed(1)}"/>`;}).join('')}</g>
      <ellipse cx="256" cy="252" rx="106" ry="96" fill="url(#hx-abd)" stroke="${OUT}" stroke-width="5"/>
      <g fill="none" stroke="#1a0f27" stroke-width="7" opacity=".45"><path d="M168,214 C196,196 316,196 344,214"/><path d="M156,268 C190,290 322,290 356,268"/></g>
      <g fill="none" stroke="#b996e2" stroke-width="2.4" opacity=".35"><path d="M170,210 C200,192 312,192 342,210"/><path d="M158,264 C192,286 320,286 354,264"/></g>
      <path d="M190,190 C210,170 244,162 270,166" stroke="#e6d6ff" stroke-width="5" fill="none" opacity=".35" stroke-linecap="round"/>
      <g fill="#2a1a3d" opacity=".75"><circle cx="184" cy="236" r="7"/><circle cx="328" cy="236" r="7"/><circle cx="196" cy="300" r="5"/><circle cx="316" cy="300" r="5"/></g>
      ${hexRune.replace(/url\(#hx-rune\)/g,'#3a2352').replace('fill="#ffd6ff"','fill="#3a2352"').replace(/stroke="#f0b7ff"/g,'stroke="#3a2352"')}`},
    {id:'rune',parent:'abdomen',pivot:[256,252],glow:true,pad:40,svg:`<g filter="url(#hx-soft)">${hexRune}</g><circle cx="256" cy="252" r="40" fill="#d77cff" opacity=".35" filter="url(#hx-blur)"/>`},
    ...legParts(4,true),...legParts(3,true),
    {id:'body',parent:'thorax',pivot:[256,372],svg:`
      <path d="M256,318 C296,318 318,340 318,372 C318,404 292,420 256,420 C220,420 194,404 194,372 C194,340 216,318 256,318 Z" fill="url(#hx-tho)" stroke="${OUT}" stroke-width="5"/>
      <g fill="none" stroke="#1a0f27" stroke-width="3" opacity=".5"><path d="M256,334 L256,360"/><path d="M226,334 C234,344 242,352 250,360"/><path d="M286,334 C278,344 270,352 262,360"/></g>
      <path d="M220,332 C232,322 256,320 272,324" stroke="#e6d6ff" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/>
      <path d="M210,380 C222,404 290,404 302,380" stroke="#1a0f27" stroke-width="4" fill="none" opacity=".45"/>`},
    ...legParts(2,false),...legParts(1,false),
    {id:'palpL',parent:'thorax',pivot:[224,396],svg:palp},
    {id:'palpR',parent:'thorax',pivot:[288,396],svg:mirror(palp)},
    {id:'fangL',parent:'thorax',pivot:[238,394],svg:fang},
    {id:'fangR',parent:'thorax',pivot:[274,394],svg:mirror(fang)},
    {id:'venom',parent:'thorax',pivot:[256,470],glow:true,pad:24,svg:`<g filter="url(#hx-soft)" fill="#e9a3ff"><circle cx="247" cy="470" r="5"/><circle cx="265" cy="470" r="5"/></g><ellipse cx="256" cy="462" rx="34" ry="16" fill="#c76bff" opacity=".45" filter="url(#hx-blur)"/>`},
    {id:'eyes',parent:'thorax',pivot:[256,344],svg:eyes},
    {id:'eyeGlow',parent:'thorax',pivot:[256,344],glow:true,pad:34,svg:`<g filter="url(#hx-blur)" fill="#ff7ce0" opacity=".8"><ellipse cx="256" cy="348" rx="44" ry="20"/><circle cx="214" cy="340" r="10"/><circle cx="298" cy="340" r="10"/></g>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase,dg=s.dodge,alive=1-d;
    const T=P.thorax;
    T.y=Math.sin(t*2)*3*(1-m)-Math.abs(Math.sin(ph*2))*5*m-w*26+a*12+h*8+d*44;T.x=Math.sin(ph)*6*m+dg*44+(s.stun?Math.sin(t*11)*6:0);
    T.r=dg*9+(s.stun?Math.sin(t*7)*5:0)+h*Math.sin(t*50)*3;
    P.abdomen.sy=1+Math.sin(t*2.2)*.03+w*.06-a*.09;P.abdomen.sx=1-Math.sin(t*2.2)*.015+a*.06;P.abdomen.y=-w*14+a*6+d*10;P.abdomen.r=Math.sin(t*.9)*2;
    P.rune.o=(.45+Math.sin(t*2.8)*.2+w*.55+a*.6)*alive;P.rune.sx=P.rune.sy=1+a*.12+w*.06;P.rune.r=t*12;
    // Alternating tetrapod gait: L1 R2 L3 R4 lift together, then the other four.
    const gait={L1:0,R2:0,L3:0,R4:0,R1:Math.PI,L2:Math.PI,R3:Math.PI,L4:Math.PI};
    for(const side of ['L','R'])for(const n of [1,2,3,4]){const k=side==='L'?1:-1,id=side+n,lift=Math.max(0,Math.sin(ph+gait[id]))*m;
      const front=n===1?w:n===2?w*.35:0,idle=Math.sin(t*1.7+n*1.3+(k>0?0:2))*2.5;
      P[id+'f'].r=k*(lift*16+idle+front*38-h*12+d*30+(s.stun?14:0))+k*a*(n===1?-12:0);
      P[id+'t'].r=k*(-lift*14+front*26+h*10-d*95+(s.stun?-10:0));
      if(s.root)P[id+'f'].r+=Math.sin(t*30+n)*2;}
    const palp=Math.sin(t*4.5)*7+Math.sin(t*11)*3*w;
    P.palpL.r=palp+w*18-d*30;P.palpR.r=-palp-w*18+d*30;
    const spread=w*20-a*14+h*8;P.fangL.r=spread+Math.sin(t*3)*2;P.fangR.r=-spread-Math.sin(t*3)*2;
    P.venom.o=(w*.9+a*.8+Math.max(0,Math.sin(t*1.3))*.25)*alive;P.venom.y=w*6;
    const blink=ease.blink(t,4.6,.12);P.eyes.sy=Math.max(.15,1-blink*.85-h*.5-d*.8);
    P.eyeGlow.o=(.6+w*.4+a*.35+Math.sin(t*3.3)*.1)*alive;P.eyeGlow.sx=P.eyeGlow.sy=1+w*.3+a*.2;
  },
};
