// Stormbell (species `wisp`) — a drifting bluebell that grew too close to a thundercloud. It swims
// through the air with a jellyfish pulse, trails rain-thread tendrils beaded with dew, and fires
// sparks from the crackling pistil hanging inside its bell. Shockwave knocks it to the ground
// (state.grounded), where it slumps with its tendrils splayed.
import {ease} from './rig.js';

const OUT='#151a3a';
const defs=`
<radialGradient id="sb-dome" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#d9e2ff"/><stop offset=".3" stop-color="#9aabf7"/><stop offset=".68" stop-color="#5d66d8"/><stop offset="1" stop-color="#33338c"/></radialGradient>
<linearGradient id="sb-lip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b86e8"/><stop offset=".55" stop-color="#aab8ff"/><stop offset="1" stop-color="#e2e9ff"/></linearGradient>
<radialGradient id="sb-in" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="#4c5bb0"/><stop offset=".5" stop-color="#22286a"/><stop offset="1" stop-color="#0c0f2c"/></radialGradient>
<linearGradient id="sb-stem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3d6a3a"/><stop offset=".5" stop-color="#8ec96d"/><stop offset="1" stop-color="#355e33"/></linearGradient>
<linearGradient id="sb-sepal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9dc7c"/><stop offset="1" stop-color="#447a3b"/></linearGradient>
<radialGradient id="sb-bulb" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#fff6b0"/><stop offset=".7" stop-color="#9fd8ff"/><stop offset="1" stop-color="#4a7fe0"/></radialGradient>
<radialGradient id="sb-eye" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d4f1ff"/><stop offset="1" stop-color="#7fb6ff"/></radialGradient>
<filter id="sb-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="sb-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>`;

const RIM={cx:256,cy:302,rx:120,ry:28};
const rimAt=a=>[RIM.cx+RIM.rx*Math.cos(a),RIM.cy+RIM.ry*Math.sin(a)];
const f=n=>n.toFixed(1);
// Scalloped front lip: five petal tips curling out along the lower half of the rim.
function lip(){
  let d='',n=5;const [x0,y0]=rimAt(0);d=`M${f(x0)},${f(y0)}`;
  for(let i=0;i<n;i++){const a0=i/n*Math.PI,a1=(i+1)/n*Math.PI,am=(a0+a1)/2,[mx,my]=rimAt(am),[x1,y1]=rimAt(a1);
    const ox=Math.cos(am)*30,oy=24+Math.sin(am)*10;d+=` Q${f(mx+ox*.3+(rimAt(a0)[0]-mx)*.2)},${f(my+oy*.9)} ${f(mx+ox)},${f(my+oy)} Q${f(mx+ox*.2+(x1-mx)*.3)},${f(my+oy*.5)} ${f(x1)},${f(y1)}`;}
  let back='';for(let i=0;i<=20;i++){const a=Math.PI-i/20*Math.PI;back+=` L${f(RIM.cx+(RIM.rx-10)*Math.cos(a))},${f(RIM.cy-4+(RIM.ry-12)*Math.sin(a))}`;}
  const tips=[...Array(n)].map((_,i)=>{const am=(i+.5)/n*Math.PI,[mx,my]=rimAt(am),ox=Math.cos(am)*30,oy=24+Math.sin(am)*10;return `<path d="M${f(mx+ox*.55)},${f(my+oy*.75)} Q${f(mx+ox*.9)},${f(my+oy*1.02)} ${f(mx+ox)},${f(my+oy)}" stroke="#f4f7ff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;}).join('');
  return `<path d="${d}${back} Z" fill="url(#sb-lip)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>${tips}`;
}
// Tendrils: [x, attach y, upper end dx, joint y, tip dx, tip y]
const TENDRILS=[[168,318,-14,402,-24,476],[202,326,-6,412,-16,488],[234,330,-4,420,6,492],[256,331,2,416,-6,494],[278,330,6,420,-2,490],[310,326,8,410,18,486],[344,318,14,400,26,474]];
const thread=(pts,beads)=>{const d=`M${pts[0]} C${pts[1]} ${pts[2]} ${pts[3]}`;return `<path d="${d}" stroke="${OUT}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#bcd0ff" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#ffffff" stroke-width="1.2" fill="none" opacity=".6" transform="translate(-1 0)"/>`+beads.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#eaf5ff" stroke="${OUT}" stroke-width="1.6"/><circle cx="${x-r*.35}" cy="${y-r*.35}" r="${r*.35}" fill="#fff"/>`).join('');};
function tendrilParts(){const out=[];TENDRILS.forEach(([x,y,dx,jy,tx,ty],i)=>{const jx=x+dx,ex=jx+tx;
  out.push({id:'tu'+i,parent:'bell',pivot:[x,y],svg:thread([`${x},${y}`,`${x+dx*.2+6},${y+(jy-y)*.35}`,`${jx-6},${y+(jy-y)*.7}`,`${jx},${jy}`],[[x+dx*.55+3,y+(jy-y)*.55,3.4]])});
  out.push({id:'tl'+i,parent:'tu'+i,pivot:[jx,jy],svg:thread([`${jx},${jy}`,`${jx+tx*.3-7},${jy+(ty-jy)*.35}`,`${ex+7},${jy+(ty-jy)*.7}`,`${ex},${ty}`],[[jx+tx*.5-2,jy+(ty-jy)*.48,3],[ex,ty,4.2]])});});return out;}

export const stormbell={
  name:'Stormbell',view:[512,512],ground:494,scale:1.4,stride:2,previewSpeed:3,extra:['grounded'],
  defs,
  parts:[
    ...tendrilParts(),
    {id:'bell',pivot:[256,300],svg:`
      <path d="M126,292 C112,288 104,276 108,266 C118,276 130,280 142,282 Z" fill="url(#sb-lip)" stroke="${OUT}" stroke-width="3.4" stroke-linejoin="round"/>
      <path d="M386,292 C400,288 408,276 404,266 C394,276 382,280 370,282 Z" fill="url(#sb-lip)" stroke="${OUT}" stroke-width="3.4" stroke-linejoin="round"/>
      <path d="M256,110 C314,110 342,150 346,206 C350,250 358,278 384,300 Q256,262 128,300 C154,278 162,250 166,206 C170,150 198,110 256,110 Z" fill="url(#sb-dome)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <g fill="none" stroke-linecap="round"><path d="M256,122 C254,170 252,230 256,282" stroke="#e5ebff" stroke-width="2.6" opacity=".35"/>
        <path d="M226,126 C206,170 198,230 194,284 M286,126 C306,170 314,230 318,284" stroke="#e5ebff" stroke-width="2.4" opacity=".3"/>
        <path d="M200,140 C180,180 172,236 162,288 M312,140 C332,180 340,236 350,288" stroke="#2a2c78" stroke-width="2.4" opacity=".45"/></g>
      <path d="M204,138 C222,122 246,118 268,120" stroke="#ffffff" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>
      <ellipse cx="208" cy="180" rx="16" ry="34" fill="#ffffff" opacity=".12" transform="rotate(14 208 180)"/>
      <g fill="#f2f6ff" opacity=".75"><circle cx="300" cy="160" r="3"/><circle cx="314" cy="182" r="2"/><circle cx="190" cy="226" r="2.4"/></g>
      <path d="M214,214 C224,206 238,206 246,212 M298,214 C288,206 274,206 266,212" stroke="#1d2160" stroke-width="5" fill="none" stroke-linecap="round"/>`},
    {id:'inside',parent:'bell',pivot:[256,302],svg:`<ellipse cx="256" cy="302" rx="114" ry="24" fill="url(#sb-in)" stroke="${OUT}" stroke-width="3.6"/><ellipse cx="256" cy="298" rx="46" ry="9" fill="#8fb6ff" opacity=".22"/>`},
    {id:'stamens',parent:'bell',pivot:[256,300],svg:[[222,336],[238,344],[274,344],[290,336],[206,326],[306,326]].map(([x,y])=>`<path d="M${256+(x-256)*.4},300 Q${(x+256)/2},${y-20} ${x},${y}" stroke="#d7e4ff" stroke-width="2.4" fill="none"/><ellipse cx="${x}" cy="${y+3}" rx="4" ry="6" fill="#f5e07a" stroke="${OUT}" stroke-width="1.6"/>`).join('')},
    {id:'pistil',parent:'bell',pivot:[256,298],svg:`<path d="M252,298 C250,320 252,344 253,360 L259,360 C260,344 262,320 260,298 Z" fill="#cfe6c2" stroke="${OUT}" stroke-width="2.6"/>
      <g transform="translate(256 370)">${[-1,0,1].map(k=>`<ellipse cx="${k*9}" cy="${k?2:6}" rx="8" ry="11" fill="url(#sb-bulb)" stroke="${OUT}" stroke-width="2.4" transform="rotate(${k*28})"/>`).join('')}</g>`},
    {id:'lip',parent:'bell',pivot:[256,316],svg:lip()},
    {id:'sparks',parent:'pistil',pivot:[256,372],glow:true,pad:30,svg:`<circle cx="256" cy="372" r="30" fill="#aee0ff" filter="url(#sb-blur)" opacity=".9"/>
      <g fill="none" stroke="#f4fbff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M256,372 L236,384 L242,392 L222,408"/><path d="M256,372 L278,386 L270,392 L292,404"/><path d="M256,372 L254,394 L262,402 L256,424"/><path d="M256,372 L232,362 L222,370"/><path d="M256,372 L282,360 L292,366"/></g>`},
    {id:'stem',parent:'bell',pivot:[256,114],svg:`
      <path d="M252,116 C248,82 262,44 296,36 C328,30 350,52 344,80 C340,96 326,102 318,96" fill="none" stroke="${OUT}" stroke-width="13" stroke-linecap="round"/>
      <path d="M252,116 C248,82 262,44 296,36 C328,30 350,52 344,80 C340,96 326,102 318,96" fill="none" stroke="url(#sb-stem)" stroke-width="7" stroke-linecap="round"/>
      <path d="M262,60 C246,48 226,46 210,54 C226,64 246,66 262,60 Z" fill="url(#sb-sepal)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>
      ${[-58,-24,10,44,78].map(a=>`<path d="M256,116 C${256-9},${100} ${256-6},${86} 256,${78} C${256+6},${86} ${256+9},${100} 256,116 Z" fill="url(#sb-sepal)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round" transform="rotate(${a} 256 116) translate(0 14)"/>`).join('')}`},
    {id:'eyes',parent:'bell',pivot:[256,226],svg:`<path d="M212,228 C220,218 236,218 244,228 C236,238 220,238 212,228 Z" fill="url(#sb-eye)" stroke="${OUT}" stroke-width="2.4"/><path d="M300,228 C292,218 276,218 268,228 C276,238 292,238 300,228 Z" fill="url(#sb-eye)" stroke="${OUT}" stroke-width="2.4"/><circle cx="230" cy="228" r="3.6" fill="#21307a"/><circle cx="282" cy="228" r="3.6" fill="#21307a"/>`},
    {id:'eyeGlow',parent:'bell',pivot:[256,226],glow:true,pad:30,svg:`<g filter="url(#sb-blur)" fill="#bfe6ff" opacity=".75"><ellipse cx="228" cy="228" rx="26" ry="15"/><ellipse cx="284" cy="228" rx="26" ry="15"/></g>`},
  ],
  animate(P,s){
    const t=s.t,m=s.move,w=s.windup,a=s.attack,h=s.hurt,d=s.dead,g=Math.max(s.grounded,d),alive=1-d;
    const limp=Math.max(s.stun?.7:0,g),air=1-g;
    // Jellyfish pulse: the bell squeezes and relaxes, faster while travelling.
    const pulseT=t*(3+m*2.2),pulse=Math.sin(pulseT)*(1-limp*.7),bob=Math.sin(t*2.1)*10*air;
    const B=P.bell,shake=h*Math.sin(t*55);
    B.y=bob-pulse*4+w*-6+a*6+g*134+d*10;B.x=s.dodge*-46+shake*5;
    B.r=s.dodge*16+Math.sin(t*1.2)*2*air+(s.stun?Math.sin(t*5)*7:0)+g*Math.sin(t*1.4+1)*3+d*18+shake*3;
    B.sx=1+pulse*.045-w*.08+a*.14+g*.1;B.sy=1-pulse*.04+w*.05-a*.1-g*.14-d*.08;
    P.lip.sx=1+pulse*.06-w*.1+a*.16;P.lip.sy=1-pulse*.08+a*.2-d*.3;
    P.inside.sx=1+pulse*.04-w*.1+a*.14;
    P.stem.r=Math.sin(t*1.7)*6-pulse*3+m*-8+d*40+g*20;
    P.stamens.sy=1+w*.15-a*.1;
    P.pistil.y=w*14-a*4;P.pistil.sy=1+w*.12;P.pistil.r=Math.sin(t*2.3)*3+(s.stun?Math.sin(t*6)*8:0);
    const flicker=.55+.45*Math.abs(Math.sin(t*23)*Math.sin(t*7.3));
    P.sparks.o=Math.max(w,a,flicker*.45)*alive*(s.stun?.15:1);P.sparks.sx=P.sparks.sy=.7+w*.5+a*.6+flicker*.15;P.sparks.r=Math.sin(t*31)*20;
    // Tendrils trail with a travelling wave; inhale draws them in, the shot flares them out.
    TENDRILS.forEach(([x],i)=>{const k=(x-256)/90,wave=Math.sin(t*2.2-i*.6+(s.seed||0))*air,trail=Math.sin(s.phase*.8-i*.5)*m;
      const U=P['tu'+i],L=P['tl'+i];
      U.r=(wave*5+trail*7+pulse*k*5-w*k*10+a*k*14)*(1-limp)+Math.sign(k)*g*(34+Math.abs(k)*46)+(s.root?Math.sin(t*20+i)*2:0);
      L.r=(Math.sin(t*2.2-i*.6-1.2)*10*air+trail*10-w*k*6+a*k*10)*(1-limp)+Math.sign(k)*g*24;
      U.sy=1-g*.1;L.sy=1-g*.12;L.o=U.o=1-d*.5;});
    const blink=ease.blink(t,4.1+(s.seed%1));
    P.eyes.sy=Math.max(.1,1-blink*.9+w*.2-h*.6-limp*.6-d*.3);P.eyes.sx=1+w*.1;P.eyes.y=w*-2;
    P.eyeGlow.o=(.55+w*.45+a*.3+Math.sin(t*3)*.08)*alive*(1-limp*.6);P.eyeGlow.sx=P.eyeGlow.sy=1+w*.3;
  },
};
