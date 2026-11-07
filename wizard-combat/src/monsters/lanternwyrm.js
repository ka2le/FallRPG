// Lantern Wyrm (species `ash`) — a centipede of glowing paper lanterns from the autumn processions,
// each lantern pressed from fallen leaves. It rears like a cobra behind a lacquered festival mask
// with smouldering incense-stick antennae and spits embers. Firebolts only feed its lanterns;
// Frostburst quenches them (state.quench): the glow drops and they steam.
import {ease,mirror} from './rig.js';

const OUT='#230c06';
const defs=`
<radialGradient id="lw-paper" cx="46%" cy="42%" r="62%"><stop offset="0" stop-color="#fff1b8"/><stop offset=".32" stop-color="#ffc35a"/><stop offset=".7" stop-color="#e86a2a"/><stop offset="1" stop-color="#8e2c12"/></radialGradient>
<radialGradient id="lw-paperSmall" cx="46%" cy="42%" r="62%"><stop offset="0" stop-color="#ffd88a"/><stop offset=".45" stop-color="#f08a36"/><stop offset="1" stop-color="#7f2610"/></radialGradient>
<linearGradient id="lw-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a4a26"/><stop offset=".5" stop-color="#5a2412"/><stop offset="1" stop-color="#2e1009"/></linearGradient>
<radialGradient id="lw-lacquer" cx="42%" cy="30%" r="80%"><stop offset="0" stop-color="#d0533a"/><stop offset=".5" stop-color="#8e2418"/><stop offset="1" stop-color="#43100b"/></radialGradient>
<linearGradient id="lw-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a2"/><stop offset=".45" stop-color="#e0a443"/><stop offset="1" stop-color="#8a5a1c"/></linearGradient>
<radialGradient id="lw-ember" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd35e"/><stop offset="1" stop-color="#e55a1c"/></radialGradient>
<linearGradient id="lw-fin" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb04a"/><stop offset=".5" stop-color="#d9481e"/><stop offset="1" stop-color="#7a1a0e"/></linearGradient>
<filter id="lw-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="lw-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.5"/></filter>`;

const f=n=>n.toFixed(1);
// Three-lobed leaf silhouette pressed into the lantern paper.
const LEAF=[[0,.9],[.05,.35],[.55,.55],[.42,.2],[.85,-.1],[.45,-.2],[.5,-.7],[.18,-.45],[0,-.95],[-.18,-.45],[-.5,-.7],[-.45,-.2],[-.85,-.1],[-.42,.2],[-.55,.55],[-.05,.35]];
const leafPath=(cx,cy,sx,sy)=>'M'+LEAF.map(([x,y])=>`${f(cx+x*sx)},${f(cy+y*sy)}`).join(' L')+' Z';
// Paper lantern centred on (cx,cy); caps point along `rot` (0 = vertical stack).
function lantern(cx,cy,rx,ry,rot=0,grad='lw-paper'){
  let s=`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${grad})" stroke="${OUT}" stroke-width="4"/>`;
  s+=`<path d="${leafPath(cx,cy+ry*.04,rx*.46,ry*.58)}" fill="#b23d16" opacity=".42"/><path d="M${cx},${f(cy+ry*.55)} L${cx},${f(cy-ry*.5)} M${cx},${f(cy)} L${f(cx-rx*.32)},${f(cy-ry*.3)} M${cx},${f(cy)} L${f(cx+rx*.32)},${f(cy-ry*.3)}" stroke="#a5341a" stroke-width="1.8" opacity=".5" fill="none"/>`;
  for(const j of [-.62,-.22,.22,.62]){const hw=rx*Math.sqrt(1-j*j)*.97,y=cy+j*ry;s+=`<path d="M${f(cx-hw)},${f(y)} Q${cx},${f(y+ry*.16)} ${f(cx+hw)},${f(y)}" stroke="#7a2a10" stroke-width="2.2" fill="none" opacity=".55"/>`;}
  s+=`<ellipse cx="${f(cx-rx*.36)}" cy="${f(cy-ry*.34)}" rx="${f(rx*.22)}" ry="${f(ry*.3)}" fill="#fffbe6" opacity=".25" transform="rotate(-20 ${f(cx-rx*.36)} ${f(cy-ry*.34)})"/>`;
  const cw=rx*.62;s+=`<rect x="${f(cx-cw/2)}" y="${f(cy-ry-6)}" width="${f(cw)}" height="12" rx="4" fill="url(#lw-wood)" stroke="${OUT}" stroke-width="3"/><rect x="${f(cx-cw/2)}" y="${f(cy+ry-6)}" width="${f(cw)}" height="12" rx="4" fill="url(#lw-wood)" stroke="${OUT}" stroke-width="3"/><path d="M${f(cx-cw/2+4)},${f(cy-ry-2)} L${f(cx+cw/2-4)},${f(cy-ry-2)}" stroke="#e3a14f" stroke-width="1.6" opacity=".6"/>`;
  return rot?`<g transform="rotate(${rot} ${cx} ${cy})">${s}</g>`:s;
}
const dimAt=(cx,cy,rx,ry,rot=0)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx-2}" ry="${ry-2}" fill="#3d4660" opacity=".62" transform="rotate(${rot} ${cx} ${cy})"/><ellipse cx="${cx-rx*.3}" cy="${cy-ry*.3}" rx="${rx*.25}" ry="${ry*.2}" fill="#dff2ff" opacity=".35"/>`;
const glowAt=(cx,cy,rx,ry)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffae46" filter="url(#lw-blur)" opacity=".8"/>`;
// Twig leg with a leaf-tip foot, from (x,y) by (dx,dy).
function leg(x,y,dx,dy){const ex=x+dx,ey=y+dy,k=Math.sign(dx),d=`M${x},${y} C${x+dx*.4},${y-8} ${ex-dx*.2},${ey-dy*.6} ${ex},${ey}`;
  return `<path d="${d}" stroke="${OUT}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#6e3b1c" stroke-width="3.8" fill="none" stroke-linecap="round"/><path d="M${ex},${ey} q${k*12},-2 ${k*20},6 q${-k*10},6 ${-k*20},-6 Z" fill="#d1662a" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`;}
const LEGS={base:[214,452,-40,36],mid:[210,386,-42,14],neck:[218,326,-38,8]};
const legParts=(seg)=>{const [x,y,dx,dy]=LEGS[seg];return [{id:seg+'LegL',parent:seg,pivot:[x,y],svg:leg(x,y,dx,dy)},{id:seg+'LegR',parent:seg,pivot:[512-x,y],svg:leg(512-x,y,-dx,dy)}];};

const fin=`<path d="M184,232 C162,214 140,204 116,206 C128,214 132,222 128,230 C140,230 146,236 140,246 C152,246 160,254 156,266 C170,262 182,256 190,250 Z" fill="url(#lw-fin)" stroke="${OUT}" stroke-width="3.4" stroke-linejoin="round"/><path d="M180,236 C164,224 146,216 128,214 M178,246 C166,242 156,240 146,242" stroke="#ffd37a" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>`;
const mandible=`<path d="M240,272 C222,280 210,298 216,318 C220,328 232,328 234,318 C230,304 234,290 248,282 Z" fill="url(#lw-gold)" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/><path d="M226,290 C222,300 222,310 226,318" stroke="#fff3c8" stroke-width="1.8" fill="none" opacity=".7"/>`;
const antenna=`<path d="M240,182 C232,150 210,118 190,94" stroke="${OUT}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M240,182 C232,150 210,118 190,94" stroke="#7a2416" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M238,172 C230,148 214,124 196,102" stroke="#c85a3a" stroke-width="1.4" fill="none" opacity=".6"/>
  <circle cx="190" cy="94" r="5.5" fill="#ffcf6a" stroke="${OUT}" stroke-width="2.4"/>
  <path d="M190,88 C182,74 198,64 188,50 C180,38 194,28 186,14" stroke="#efe8e0" stroke-width="4" fill="none" opacity=".38" stroke-linecap="round"/>`;

export const lanternwyrm={
  name:'Lantern Wyrm',view:[512,512],ground:494,scale:1.3,stride:2.4,previewSpeed:4,extra:['quench'],
  defs,
  parts:[
    {id:'tassel',parent:'t4',pivot:[474,386],svg:`<path d="M474,386 C478,374 476,362 470,354" stroke="${OUT}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M474,386 C478,374 476,362 470,354" stroke="#e3a14f" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M462,354 C460,330 470,316 470,300 C476,316 486,330 482,354 Z" fill="#c8321c" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/><path d="M466,350 L468,316 M472,352 L472,310 M478,350 L476,318" stroke="#ff8a5a" stroke-width="1.6" opacity=".7"/><rect x="462" y="350" width="20" height="8" rx="3" fill="url(#lw-gold)" stroke="${OUT}" stroke-width="2"/>`},
    {id:'t4',parent:'t3',pivot:[452,418],svg:lantern(462,400,17,21,-35,'lw-paperSmall')},
    {id:'t3',parent:'t2',pivot:[418,446],svg:lantern(436,430,22,26,-58,'lw-paperSmall')},
    {id:'t2',parent:'t1',pivot:[366,460],svg:lantern(394,454,27,32,-78,'lw-paperSmall')},
    {id:'t1',parent:'base',pivot:[300,460],svg:lantern(340,462,32,38,-86)},
    {id:'t1Glow',parent:'t1',pivot:[340,462],glow:true,pad:30,svg:glowAt(340,462,24,20)},
    {id:'t1Dim',parent:'t1',pivot:[340,462],svg:dimAt(340,462,32,38,-86)},
    ...legParts('base'),
    {id:'base',pivot:[256,470],svg:lantern(256,446,64,44)},
    {id:'baseGlow',parent:'base',pivot:[256,446],glow:true,pad:36,svg:glowAt(256,446,46,30)},
    {id:'baseDim',parent:'base',pivot:[256,446],svg:dimAt(256,446,64,44,0)},
    ...legParts('mid'),
    {id:'mid',parent:'base',pivot:[256,414],svg:lantern(256,382,54,38)},
    {id:'midGlow',parent:'mid',pivot:[256,382],glow:true,pad:36,svg:glowAt(256,382,40,26)},
    {id:'midDim',parent:'mid',pivot:[256,382],svg:dimAt(256,382,54,38,0)},
    ...legParts('neck'),
    {id:'neck',parent:'mid',pivot:[256,352],svg:lantern(256,322,46,34)},
    {id:'neckGlow',parent:'neck',pivot:[256,322],glow:true,pad:36,svg:glowAt(256,322,34,24)},
    {id:'neckDim',parent:'neck',pivot:[256,322],svg:dimAt(256,322,46,34,0)},
    {id:'antL',parent:'head',pivot:[240,182],svg:antenna},
    {id:'antR',parent:'head',pivot:[272,182],svg:mirror(antenna)},
    {id:'tipL',parent:'antL',pivot:[190,94],glow:true,pad:24,svg:`<circle cx="190" cy="94" r="14" fill="#ffa040" filter="url(#lw-blur)"/>`},
    {id:'tipR',parent:'antR',pivot:[322,94],glow:true,pad:24,svg:`<circle cx="322" cy="94" r="14" fill="#ffa040" filter="url(#lw-blur)"/>`},
    {id:'finL',parent:'head',pivot:[188,240],svg:fin},
    {id:'finR',parent:'head',pivot:[324,240],svg:mirror(fin)},
    {id:'mandL',parent:'head',pivot:[242,276],svg:mandible},
    {id:'mandR',parent:'head',pivot:[270,276],svg:mirror(mandible)},
    {id:'head',parent:'neck',pivot:[256,292],svg:`
      <path d="M256,170 C302,170 332,186 336,214 C340,242 330,268 306,284 C290,294 222,294 206,284 C182,268 172,242 176,214 C180,186 210,170 256,170 Z" fill="url(#lw-lacquer)" stroke="${OUT}" stroke-width="5"/>
      <path d="M194,206 C210,186 302,186 318,206" stroke="url(#lw-gold)" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M190,250 C182,240 188,228 198,232 C204,236 200,244 194,242 M322,250 C330,240 324,228 314,232 C308,236 312,244 318,242" stroke="#e3a945" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M256,176 C244,180 238,192 244,200 L256,196 L268,200 C274,192 268,180 256,176 Z" fill="url(#lw-gold)" stroke="${OUT}" stroke-width="2.4"/><path d="M256,196 L256,182 M250,196 L246,184 M262,196 L266,184" stroke="#8a5a1c" stroke-width="1.4"/>
      <path d="M204,230 C212,212 238,210 250,228 C240,242 214,244 204,230 Z" fill="#200805" stroke="${OUT}" stroke-width="2"/>
      <path d="M308,230 C300,212 274,210 262,228 C272,242 298,244 308,230 Z" fill="#200805" stroke="${OUT}" stroke-width="2"/>
      <circle cx="236" cy="204" r="7" fill="#200805"/><circle cx="276" cy="204" r="7" fill="#200805"/>
      <path d="M252,236 L256,256 L260,236" stroke="#e3a945" stroke-width="2.6" fill="none" stroke-linejoin="round"/>
      <path d="M218,262 C234,270 278,270 294,262 C288,290 224,290 218,262 Z" fill="#1a0604" stroke="${OUT}" stroke-width="2.6"/>
      <path d="M222,265 L230,276 L238,268 L246,279 L256,269 L266,279 L274,268 L282,276 L290,265" fill="url(#lw-gold)" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M200,216 C214,212 234,216 250,226 M312,216 C298,212 278,216 262,226" stroke="url(#lw-gold)" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M214,182 C230,174 246,172 258,172" stroke="#ffd6b8" stroke-width="3" fill="none" opacity=".4" stroke-linecap="round"/>
      <ellipse cx="208" cy="208" rx="10" ry="20" fill="#fff" opacity=".08" transform="rotate(30 208 208)"/>`},
    {id:'eyes',parent:'head',pivot:[256,224],svg:`<ellipse cx="228" cy="229" rx="11" ry="8" fill="url(#lw-ember)"/><ellipse cx="284" cy="229" rx="11" ry="8" fill="url(#lw-ember)"/><path d="M228,222 L228,236 M284,222 L284,236" stroke="#5a1408" stroke-width="3" stroke-linecap="round"/><circle cx="236" cy="204" r="3.6" fill="url(#lw-ember)"/><circle cx="276" cy="204" r="3.6" fill="url(#lw-ember)"/>`},
    {id:'eyeGlow',parent:'head',pivot:[256,224],glow:true,pad:30,svg:`<g filter="url(#lw-blur)" fill="#ff9c3a" opacity=".8"><ellipse cx="228" cy="229" rx="24" ry="15"/><ellipse cx="284" cy="229" rx="24" ry="15"/></g>`},
    {id:'maw',parent:'head',pivot:[256,276],glow:true,pad:30,svg:`<ellipse cx="256" cy="276" rx="26" ry="10" fill="#ffb24a" filter="url(#lw-blur)"/><path d="M234,272 Q256,282 278,272 Q256,288 234,272 Z" fill="#ffd47a"/>`},
    {id:'steam',parent:'head',pivot:[256,172],svg:`<g fill="none" stroke="#eef6ff" stroke-linecap="round" opacity=".55" filter="url(#lw-soft)">
      <path d="M226,176 C214,156 236,144 222,124 C212,110 228,96 220,80" stroke-width="7"/><path d="M286,176 C300,158 280,142 294,122 C304,108 290,94 298,78" stroke-width="7"/><path d="M256,168 C248,150 264,136 254,116" stroke-width="5"/></g>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase,q=s.quench,alive=1-d,stun=s.stun?1:0;
    const sway=Math.sin(t*1.5),sway2=Math.sin(t*1.5-1.2),shake=h*Math.sin(t*55),dg=s.dodge;
    const B=P.base;B.x=dg*-44+shake*4;B.r=dg*6+Math.sin(ph)*3*m;B.sy=1+Math.sin(t*2)*.02-w*.05-d*.18;B.sx=1+w*.03+d*.06;B.y=d*6;
    // The rearing column sways as an S-curve; it coils down on the inhale and strikes forward.
    P.mid.r=sway*3.5-dg*12+Math.sin(ph+.8)*5*m+stun*Math.sin(t*6)*5+w*2-d*44;P.mid.y=w*8-a*3;P.mid.sy=1-w*.05;
    P.neck.r=sway2*4.5-dg*10+Math.sin(ph+1.6)*6*m+stun*Math.sin(t*6-1)*6-w*3-d*34;P.neck.y=w*10-a*4;P.neck.sy=1-w*.06;
    const H=P.head;H.r=-sway*3-sway2*2+dg*6+stun*Math.sin(t*7)*12+h*8-d*26;H.y=-w*10+a*18+d*30;H.sx=H.sy=1-w*.05+a*.12;
    // Tail ripples behind, the travelling wave quickening with the gait.
    ['t1','t2','t3','t4'].forEach((id,i)=>{P[id].r=Math.sin(t*1.3-i*.8)*(3+i*1.5)+Math.sin(ph*1.4-i*.9)*(8+i*3)*m-w*(2+i*2)+d*(10+i*8)+(s.root?Math.sin(t*24+i)*2:0);});
    P.tassel.r=Math.sin(t*2.6)*12+Math.sin(ph*1.4-4)*14*m+d*40;
    // Legs ripple front to back; the lifted forelegs flail on the wind-up.
    ['base','mid','neck'].forEach((seg,i)=>{const wave=Math.sin(ph*2-i*1.3)*22*m,idle=Math.sin(t*3.1+i*1.7)*6,fl=(i?w*26:0)+(i?a*-12:0);
      P[seg+'LegL'].r=wave+idle+fl+d*30+(s.root?Math.sin(t*30+i)*4:0);P[seg+'LegR'].r=-wave-idle-fl-d*30-(s.root?Math.sin(t*28+i)*4:0);});
    // Lanterns brighten one after another, base to head, as the shot builds; quench smothers them.
    const flick=i=>.88+.12*Math.sin(t*13+i*2.3)*Math.sin(t*7.1+i),seq=i=>Math.min(1,Math.max(0,w*2.4-i*.55)),damp=(1-q*.82)*alive;
    ['baseGlow','midGlow','neckGlow','t1Glow'].forEach((id,i)=>{const k=i===3?0:i;P[id].o=(.5+seq(k)*.5+a*.3)*flick(i)*damp;P[id].sx=P[id].sy=1+seq(k)*.2+a*.15;});
    P.antL.r=-w*10+Math.sin(t*1.1)*3+a*4-d*30+stun*Math.sin(t*8)*6;P.antR.r=w*10-Math.sin(t*1.1+.6)*3-a*4+d*30-stun*Math.sin(t*8)*6;
    P.tipL.o=P.tipR.o=(.6+.3*Math.sin(t*9))*(1-q*.9)*alive;
    P.finL.r=w*20-a*8+Math.sin(t*3)*5+h*10-d*20;P.finR.r=-w*20+a*8-Math.sin(t*3+.4)*5-h*10+d*20;
    P.mandL.r=w*24-a*14+Math.sin(t*5)*3*(1-w)+d*20;P.mandR.r=-w*24+a*14-Math.sin(t*5)*3*(1-w)-d*20;
    const blink=ease.blink(t,4.4+(s.seed%1));
    P.eyes.sy=Math.max(.1,1-blink*.9-h*.5-(stun?.5:0)-d*.9+w*.15);P.eyes.o=1-q*.35;
    P.eyeGlow.o=(.55+w*.45+a*.3)*flick(5)*(1-q*.6)*alive;P.eyeGlow.sx=P.eyeGlow.sy=1+w*.3;
    P.maw.o=(w*.8+a+Math.max(0,Math.sin(t*1.7))*.15)*(1-q*.7)*alive;P.maw.sx=1+w*.2+a*.2;
    for(const id of ['baseDim','midDim','neckDim','t1Dim'])P[id].o=q*alive;
    P.steam.o=q*alive*.9;P.steam.x=Math.sin(t*2)*4;P.steam.y=-((t*14)%12);P.steam.sy=1+Math.sin(t*1.5)*.08;
  },
};
