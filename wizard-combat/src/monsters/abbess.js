// Spore Abbess (species `healer`) — a mushroom priestess of the wetland chapels, the one
// mushroom in the bestiary. Her robe is a stem, her mantle the veil ring, and her cap is a hood
// with softly glowing gills. A halo of tiny fairy-ring mushrooms turns behind her. She swings a
// puffball censer from a driftwood crook: at allies to heal them (state.heal) and at you to attack.
import {ease} from './rig.js';

const OUT='#24141c';
const defs=`
<radialGradient id="ab-cap" cx="40%" cy="26%" r="80%"><stop offset="0" stop-color="#fde8f0"/><stop offset=".3" stop-color="#eab0c6"/><stop offset=".7" stop-color="#b8648a"/><stop offset="1" stop-color="#6e3050"/></radialGradient>
<linearGradient id="ab-gill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4a5c"/><stop offset="1" stop-color="#f4cfd8"/></linearGradient>
<linearGradient id="ab-robe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a5947a"/><stop offset=".3" stop-color="#efe6d4"/><stop offset=".55" stop-color="#e2d6be"/><stop offset="1" stop-color="#8f7d63"/></linearGradient>
<linearGradient id="ab-mantle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8ea"/><stop offset=".6" stop-color="#e6d9bf"/><stop offset="1" stop-color="#b9a685"/></linearGradient>
<radialGradient id="ab-face" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#fbf2f4"/><stop offset=".7" stop-color="#e2cfd8"/><stop offset="1" stop-color="#b9a0b0"/></radialGradient>
<linearGradient id="ab-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4d3d2c"/><stop offset=".45" stop-color="#9a8462"/><stop offset="1" stop-color="#46382a"/></linearGradient>
<radialGradient id="ab-puff" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fffaf0"/><stop offset=".5" stop-color="#e8d8b4"/><stop offset="1" stop-color="#a88c5e"/></radialGradient>
<linearGradient id="ab-moss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8d978"/><stop offset="1" stop-color="#4c7434"/></linearGradient>
<radialGradient id="ab-mini" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff4c8"/><stop offset=".6" stop-color="#f2b8d0"/><stop offset="1" stop-color="#b8648a"/></radialGradient>
<filter id="ab-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>`;

const f=n=>n.toFixed(1);
// Halo: tiny mushrooms standing on a circle, caps pointing outward.
const HALO={cx:256,cy:100,r:112};
function halo(){let s=`<circle cx="${HALO.cx}" cy="${HALO.cy}" r="${HALO.r}" fill="none" stroke="#f9e3ef" stroke-width="2" opacity=".35" stroke-dasharray="3 9"/>`;
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2,x=HALO.cx+Math.cos(a)*HALO.r,y=HALO.cy+Math.sin(a)*HALO.r,deg=a*180/Math.PI+90;
    s+=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(deg)})"><path d="M-2,4 L-1.5,-6 L1.5,-6 L2,4 Z" fill="#f6eedd" stroke="${OUT}" stroke-width="1.4"/><path d="M-9,-5 C-9,-15 9,-15 9,-5 Z" fill="url(#ab-mini)" stroke="${OUT}" stroke-width="1.8"/><circle cx="-3" cy="-10" r="1.5" fill="#fff"/></g>`;}
  return s;}
const sleeve=(k,sx,sy,hx,hy)=>`<path d="M${sx-k*16},${sy-6} C${sx-k*24},${sy+40} ${hx-k*30},${hy-36} ${hx-k*26},${hy+6} C${hx-k*8},${hy+14} ${hx+k*16},${hy+8} ${hx+k*22},${hy-4} C${hx+k*10},${hy-40} ${sx+k*20},${sy+20} ${sx+k*16},${sy-6} Z" fill="url(#ab-robe)" stroke="${OUT}" stroke-width="3.8" stroke-linejoin="round"/>
  <path d="M${hx-k*24},${hy+2} C${hx-k*6},${hy+10} ${hx+k*14},${hy+6} ${hx+k*20},${hy-4}" stroke="#7b6a52" stroke-width="2.4" fill="none" opacity=".6"/>`;

export const abbess={
  name:'Spore Abbess',view:[512,512],ground:494,scale:1.18,stride:2,previewSpeed:3,extra:['heal'],
  defs,
  parts:[
    {id:'haloGlow',parent:'head',pivot:[256,100],glow:true,pad:30,svg:`<circle cx="256" cy="100" r="112" fill="none" stroke="#ffd0ea" stroke-width="14" filter="url(#ab-blur)" opacity=".7"/>`},
    {id:'halo',parent:'head',pivot:[256,100],svg:halo()},
    {id:'healRing',parent:'robe',pivot:[256,488],glow:true,pad:30,svg:`<ellipse cx="256" cy="488" rx="150" ry="20" fill="none" stroke="#ffc9e6" stroke-width="10" filter="url(#ab-blur)"/><g fill="#fff0f8">${[...Array(12)].map((_,i)=>{const a=i/12*Math.PI*2;return `<circle cx="${f(256+Math.cos(a)*150)}" cy="${f(488+Math.sin(a)*20)}" r="4"/>`;}).join('')}</g>`},
    {id:'staff',parent:'robe',pivot:[372,490],svg:`
      <path d="M366,490 C362,420 370,350 366,280 C362,200 370,130 368,66 C366,40 384,26 404,30 C424,34 432,54 422,70 C416,78 408,78 404,72" fill="none" stroke="${OUT}" stroke-width="15" stroke-linecap="round"/>
      <path d="M366,490 C362,420 370,350 366,280 C362,200 370,130 368,66 C366,40 384,26 404,30 C424,34 432,54 422,70 C416,78 408,78 404,72" fill="none" stroke="url(#ab-wood)" stroke-width="9" stroke-linecap="round"/>
      <path d="M364,460 C362,400 368,330 365,270 M366,240 C364,180 368,120 367,80" stroke="#c9b48c" stroke-width="2" fill="none" opacity=".5"/>
      <path d="M368,180 C384,170 396,174 404,182 C392,186 380,186 368,180 Z M366,330 C350,320 338,324 332,332 C344,336 356,336 366,330 Z" fill="url(#ab-moss)" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>`},
    {id:'censer',parent:'staff',pivot:[406,74],svg:`
      <path d="M406,74 C402,90 410,104 406,120 C402,134 408,142 406,150" stroke="${OUT}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M406,74 C402,90 410,104 406,120 C402,134 408,142 406,150" stroke="#7aa24c" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M406,100 C416,94 424,96 428,102 C420,106 412,106 406,100 Z" fill="url(#ab-moss)" stroke="${OUT}" stroke-width="2"/>
      <path d="M380,180 C378,160 392,148 406,148 C420,148 434,160 432,180 C430,200 418,208 406,208 C394,208 382,200 380,180 Z" fill="url(#ab-puff)" stroke="${OUT}" stroke-width="4"/>
      <path d="M396,150 C400,144 412,144 416,150 L412,156 L400,156 Z" fill="#8f7550" stroke="${OUT}" stroke-width="2.4"/>
      <g fill="#6b5536">${[[394,170],[406,166],[418,170],[390,184],[402,182],[414,182],[424,186],[398,196],[412,196]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g>
      <path d="M388,168 C392,158 400,154 406,154" stroke="#fff" stroke-width="2.4" fill="none" opacity=".6" stroke-linecap="round"/>`},
    {id:'censerGlow',parent:'censer',pivot:[406,178],glow:true,pad:40,svg:`<circle cx="406" cy="178" r="40" fill="#ffd2ea" filter="url(#ab-blur)" opacity=".8"/><g fill="#fff6fb">${[[380,150,3],[432,156,2.6],[436,196,3.2],[378,204,2.4],[406,138,2.2],[420,214,2.8],[392,220,2]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`},
    {id:'robe',pivot:[256,490],svg:`
      <path d="M218,216 C206,280 186,380 160,470 C176,492 336,492 352,470 C326,380 306,280 294,216 Z" fill="url(#ab-robe)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <g fill="none" stroke-linecap="round"><path d="M236,250 C230,320 218,400 206,474 M276,250 C282,320 294,400 306,474" stroke="#8c7a60" stroke-width="2.6" opacity=".55"/><path d="M256,262 C256,340 256,410 256,482" stroke="#8c7a60" stroke-width="2" opacity=".4"/><path d="M226,264 C220,330 206,410 188,470" stroke="#fffaf0" stroke-width="3" opacity=".45"/></g>
      <path d="M212,332 C240,342 272,342 300,332" stroke="${OUT}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M212,332 C240,342 272,342 300,332" stroke="#7aa24c" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      <path d="M268,340 C270,356 266,368 262,376" stroke="#7aa24c" stroke-width="3" fill="none"/><ellipse cx="262" cy="382" rx="7" ry="9" fill="#a6784a" stroke="${OUT}" stroke-width="2"/><path d="M255,377 C258,372 266,372 269,377 Z" fill="#6b4a2c" stroke="${OUT}" stroke-width="1.6"/>`},
    {id:'hem',parent:'robe',pivot:[256,470],svg:`
      <path d="M164,458 C176,476 196,470 210,482 C226,476 240,490 256,482 C272,490 286,476 302,482 C316,470 336,476 348,458 C350,476 340,490 330,492 L182,492 C172,490 162,476 164,458 Z" fill="url(#ab-moss)" stroke="${OUT}" stroke-width="3.6" stroke-linejoin="round"/>
      <g stroke="#f3ead6" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"><path d="M190,490 C176,492 160,490 140,494 M210,492 C204,494 196,494 186,496 M322,490 C336,492 352,490 372,494 M302,492 C308,494 316,494 326,496 M256,492 L256,496"/></g>
      <g fill="#f6b6d0" stroke="${OUT}" stroke-width="1.6">${[[198,470],[318,468],[262,478]].map(([x,y])=>`<path d="M${x-7},${y} C${x-7},${y-9} ${x+7},${y-9} ${x+7},${y} Z"/>`).join('')}</g>`},
    {id:'armR',parent:'robe',pivot:[290,226],svg:`${sleeve(1,290,226,358,296)}<path d="M352,284 C360,278 374,280 378,290 C378,302 368,308 358,304 C350,300 348,292 352,284 Z" fill="url(#ab-face)" stroke="${OUT}" stroke-width="3"/><path d="M358,288 L376,288 M358,296 L376,297" stroke="#9b8090" stroke-width="1.8"/>`},
    {id:'mantle',parent:'robe',pivot:[256,206],svg:`
      <path d="M226,198 C210,212 194,232 184,258 C196,268 206,262 214,270 C222,262 234,272 244,266 C252,274 262,274 270,266 C280,272 292,262 300,270 C308,262 318,268 330,258 C320,232 304,212 288,198 Z" fill="url(#ab-mantle)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <g fill="none" stroke="#a8966f" stroke-width="2" opacity=".7" stroke-linecap="round"><path d="M214,266 C220,244 230,222 240,204 M244,266 C246,244 250,222 252,202 M270,266 C268,244 264,222 262,202 M300,268 C294,244 284,222 274,204"/></g>
      <path d="M200,246 C212,226 226,210 240,202" stroke="#fff" stroke-width="2.6" fill="none" opacity=".55"/>`},
    {id:'armL',parent:'robe',pivot:[222,228],svg:`${sleeve(-1,222,228,198,330)}<g transform="translate(196 334)"><path d="M-10,-2 C-12,-14 -6,-24 0,-30 C4,-24 6,-16 4,-8 C10,-14 14,-10 12,-2 C10,8 0,12 -6,8 Z" fill="url(#ab-face)" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/></g>`},
    {id:'blessing',parent:'armL',pivot:[196,300],glow:true,pad:34,svg:`<circle cx="196" cy="300" r="26" fill="#ffd8ee" filter="url(#ab-blur)"/><circle cx="196" cy="300" r="6" fill="#fff"/>`},
    {id:'head',parent:'robe',pivot:[256,212],svg:`
      <path d="M240,198 L240,222 L272,222 L272,198 Z" fill="#cdb7c4" stroke="${OUT}" stroke-width="3"/>
      <path d="M256,140 C282,140 292,162 290,186 C288,206 274,218 256,218 C238,218 224,206 222,186 C220,162 230,140 256,140 Z" fill="url(#ab-face)" stroke="${OUT}" stroke-width="4"/>
      <path d="M248,198 C252,202 260,202 264,198" stroke="#7a5068" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <g fill="#f2a6c6" opacity=".55"><ellipse cx="234" cy="196" rx="7" ry="4"/><ellipse cx="278" cy="196" rx="7" ry="4"/></g>
      <g fill="#ffe7f4"><circle cx="230" cy="174" r="1.8"/><circle cx="282" cy="174" r="1.8"/><circle cx="256" cy="210" r="1.6"/></g>`},
    {id:'lids',parent:'head',pivot:[256,180],svg:`<path d="M234,182 C238,188 248,188 252,182 M260,182 C264,188 274,188 278,182" stroke="#5a3848" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M236,190 L234,194 M276,190 L278,194" stroke="#5a3848" stroke-width="1.6"/>`},
    {id:'eyes',parent:'head',pivot:[256,182],svg:`<ellipse cx="243" cy="182" rx="8" ry="6.5" fill="#fff6fb" stroke="${OUT}" stroke-width="2"/><ellipse cx="269" cy="182" rx="8" ry="6.5" fill="#fff6fb" stroke="${OUT}" stroke-width="2"/><circle cx="244" cy="182" r="3.6" fill="#c2367e"/><circle cx="268" cy="182" r="3.6" fill="#c2367e"/><circle cx="242" cy="180" r="1.4" fill="#fff"/><circle cx="266" cy="180" r="1.4" fill="#fff"/>`},
    {id:'eyeGlow',parent:'head',pivot:[256,182],glow:true,pad:26,svg:`<g filter="url(#ab-blur)" fill="#ff9ad0" opacity=".7"><ellipse cx="243" cy="182" rx="16" ry="11"/><ellipse cx="269" cy="182" rx="16" ry="11"/></g>`},
    {id:'cap',parent:'head',pivot:[256,150],svg:`<g transform="translate(0 -18)">
      <path d="M150,174 C156,182 176,184 196,178 C214,190 236,186 256,182 C276,186 298,190 316,178 C336,184 356,182 362,174 C340,164 172,164 150,174 Z" fill="url(#ab-gill)" stroke="${OUT}" stroke-width="3"/>
      <g stroke="#5a3040" stroke-width="1.6" opacity=".6">${[...Array(17)].map((_,i)=>{const x=164+i*11.5;return `<path d="M${f(256+(x-256)*.55)},168 L${f(x)},${f(176+Math.sin(i*.9)*2)}"/>`;}).join('')}</g>
      <path d="M256,40 C268,40 274,50 276,58 C326,70 360,120 372,168 C362,176 340,178 316,172 C296,178 276,176 256,174 C236,176 216,178 196,172 C172,178 150,176 140,168 C152,120 186,70 236,58 C238,50 244,40 256,40 Z" fill="url(#ab-cap)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M204,90 C224,72 248,66 270,68" stroke="#fff4f8" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"/>
      <g fill="#fff3e0" stroke="${OUT}" stroke-width="1.6">${[[214,112,9,6],[256,92,11,7],[300,110,10,6],[186,146,8,5],[330,146,8,5],[246,134,7,4.5],[280,148,6,4]].map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>
      <path d="M150,164 C180,158 226,160 256,164 C286,160 332,158 362,164" stroke="#5a2440" stroke-width="2.4" fill="none" opacity=".5"/></g>`},
    {id:'gillGlow',parent:'cap',pivot:[256,156],glow:true,pad:30,svg:`<path d="M160,156 C200,168 312,168 352,156" stroke="#ffc6e2" stroke-width="12" fill="none" filter="url(#ab-blur)" opacity=".7"/>`},
    {id:'motes',parent:'robe',pivot:[256,300],glow:true,pad:30,svg:`<g fill="#ffe6f4">${[[170,360,4],[340,300,3.4],[200,250,3],[312,410,3.6],[230,430,2.8],[296,236,2.6],[156,290,3],[352,380,2.8],[260,120,3],[214,170,2.4],[300,150,2.6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${x}" cy="${y}" r="${r*3}" opacity=".25"/>`).join('')}</g>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,ph=s.phase,he=s.heal,alive=1-d,stun=s.stun?1:0;
    const breath=Math.sin(t*1.9),glide=Math.sin(ph)*m,shake=h*Math.sin(t*50);
    const R=P.robe;R.r=glide*3+s.dodge*8+shake*2+stun*Math.sin(t*4)*3+d*6;R.x=s.dodge*-30+shake*4;R.sy=1+breath*.012-d*.32+w*.01;R.sx=1+d*.14;R.y=-Math.abs(glide)*4;
    P.hem.sx=1+Math.sin(ph*2)*.04*m+Math.sin(t*2.2)*.015;P.hem.r=-glide*2;
    P.mantle.sy=1+breath*.03+he*.05;P.mantle.r=-glide*2;
    // Serene by default: eyes closed, opening for a heal or a strike.
    const open=Math.min(1,Math.max(w,a,he*1.4,h));
    const H=P.head;H.r=Math.sin(t*.9)*3+glide*-2+stun*(10+Math.sin(t*3)*4)-h*6+d*24-a*5;H.y=w*2+a*4+d*40+stun*6;
    P.lids.o=1-open;P.eyes.o=open;P.eyes.sy=Math.max(.1,1-ease.blink(t,5.1)*.9*open-h*.4);
    P.eyeGlow.o=(open*.7+he*.3)*alive;
    P.cap.r=Math.sin(t*1.1)*2-h*4+d*38;P.cap.y=d*30;P.cap.x=d*40;P.cap.sy=1+breath*.01;
    P.gillGlow.o=(.4+Math.sin(t*1.7)*.12+w*.4+he*.6)*alive*(1-stun*.6);
    P.halo.r=t*8;P.halo.sx=P.halo.sy=1+he*.12-d*.4;P.halo.o=alive*(1-stun*.5);
    P.haloGlow.o=(.3+Math.sin(t*1.3)*.1+he*.7+w*.2)*alive*(1-stun*.7);P.haloGlow.sx=P.haloGlow.sy=1+he*.12;
    // Censer: pendulum at rest, hauled back on the wind-up, flung forward on the shot.
    const swing=Math.sin(t*1.8)*10*(1-w)+glide*12;
    P.staff.r=Math.sin(t*1.3)*1.5+w*-6+a*8+he*-4+d*-28+shake*2;
    P.censer.r=swing-w*34+a*42+he*Math.sin(t*6)*22+stun*Math.sin(t*7)*28+d*30;
    P.censerGlow.o=(.25+Math.sin(t*2.4)*.1+w*.4+a*.9+he*.6)*alive;P.censerGlow.sx=P.censerGlow.sy=.8+a*.6+he*.4;
    P.armR.r=w*-4+a*6+he*-3+glide*2+d*20;
    P.armL.r=Math.sin(t*1.5)*3+he*96+w*10-a*6+glide*-3+d*-20;P.blessing.o=he*alive;P.blessing.sx=P.blessing.sy=.6+he*.6;
    P.healRing.o=he*alive;P.healRing.sx=P.healRing.sy=.7+he*.4;
    P.motes.o=Math.max(he,a*.4)*alive;P.motes.y=-he*28-((t*12)%10);P.motes.sx=1+he*.1;
  },
};
