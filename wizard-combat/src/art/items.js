// Inventory art: one 64×64 SVG icon per item, plus faint slot silhouettes.
// Gradients are namespaced per item so many icons can share one document.
const O='#1a130e';
const lg=(id,stops,x2=0,y2=1,x1=0,y1=0)=>`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rg=(id,stops,cx=.4,cy=.35,r=.7)=>`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const glow=(id,sd=2.4)=>`<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const svg=(defs,body)=>`<svg viewBox="0 0 64 64" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;

// ---- wands: drawn on a diagonal, grip bottom-left, tip top-right ----
function wand(k,{shaft,dark,band,tip,halo,extra='',tipShape}){
  return svg(lg(`${k}s`,[[0,shaft],[1,dark]],1,1)+rg(`${k}t`,[[0,'#fff'],[.4,tip],[1,halo]],.4,.4,.6)+glow(`${k}g`,3),
  `<circle cx="47" cy="17" r="11" fill="${tip}" opacity=".55" filter="url(#${k}g)"/>
   <path d="M10,58 L44,22 L48,26 L14,61 Q9,62 10,58 Z" fill="url(#${k}s)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M12,57 L44,24" stroke="#fff" stroke-width="1" opacity=".3"/>
   ${band?`<path d="M18,49 L23,54 M21,46 L26,51" stroke="${band}" stroke-width="2.6"/><path d="M18,49 L23,54 M21,46 L26,51" stroke="${O}" stroke-width=".8" opacity=".5"/>`:''}
   ${extra}
   ${tipShape||`<path d="M47,12 L53,18 L49,26 L41,22 Z" fill="url(#${k}t)" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/><path d="M47,13 L49,20" stroke="#fff" stroke-width="1.2" opacity=".8"/>`}`);
}
// ---- robes: front view tunic/mantle ----
function robe(k,{cloth,dark,trim,belt,extra=''}){
  return svg(lg(`${k}c`,[[0,cloth],[1,dark]],.3,1),
  `<path d="M22,8 Q32,13 42,8 L52,16 L48,26 L44,24 L46,56 Q32,60 18,56 L20,24 L16,26 L12,16 Z" fill="url(#${k}c)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M22,8 Q32,20 42,8" fill="none" stroke="${trim}" stroke-width="2.4"/><path d="M32,15 L32,56" stroke="${trim}" stroke-width="1.6" opacity=".8"/>
   <path d="M19,34 Q32,38 45,34 L45,39 Q32,43 19,39 Z" fill="${belt}" stroke="${O}" stroke-width="1.4"/>
   <path d="M24,44 Q26,50 24,56 M40,44 Q38,50 40,56" stroke="${O}" stroke-width="1" fill="none" opacity=".35"/>
   <path d="M15,17 L19,23" stroke="#fff" stroke-width="1" opacity=".25"/>${extra}`);
}
function boots(k,{leather,dark,cuff,sole,extra=''}){
  return svg(lg(`${k}l`,[[0,leather],[1,dark]],.6,1),
  `<path d="M14,10 L28,10 L29,40 Q30,44 36,45 L48,47 Q54,48 54,53 L54,56 L13,56 L13,44 Z" fill="url(#${k}l)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M13,53 L54,53 L54,57 Q34,59 13,57 Z" fill="${sole}" stroke="${O}" stroke-width="1.4"/>
   <path d="M12,9 L30,9 L30,17 L12,17 Z" fill="${cuff}" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
   <path d="M17,22 L26,24 M17,28 L26,30" stroke="${O}" stroke-width="1" opacity=".45"/>
   <path d="M16,20 L16,44" stroke="#fff" stroke-width="1.2" opacity=".2"/>${extra}`);
}
function pendant(k,cord,body){return `<path d="M18,6 Q32,26 46,6" fill="none" stroke="${O}" stroke-width="3"/><path d="M18,6 Q32,26 46,6" fill="none" stroke="${cord}" stroke-width="1.6"/>${body}`;}

export const ITEM_ART={
  twig:wand('ia-tw',{shaft:'#9a7650',dark:'#4e3826',tip:'#ffb35c',halo:'#e1601d',
    extra:`<path d="M30,38 Q24,34 22,28 Q28,30 31,35 Z" fill="#8cc35c" stroke="${O}" stroke-width="1.2"/><circle cx="36" cy="31" r="2" fill="#5a4030" stroke="${O}" stroke-width="1"/>`,
    tipShape:`<path d="M44,24 Q47,15 52,12 Q50,20 47,26 Z" fill="#7c5c3e" stroke="${O}" stroke-width="1.4"/><circle cx="51" cy="13" r="4" fill="url(#ia-twt)"/><path d="M51,6 L51,9 M57,13 L54,13 M55,8 L53,10" stroke="#ffd28c" stroke-width="1.4" stroke-linecap="round"/>`}),
  reedwand:wand('ia-rd',{shaft:'#b7d47a',dark:'#4f7a36',band:'#3e5f2a',tip:'#c8ff9a',halo:'#3fae5a',
    extra:`<g fill="${O}"><circle cx="31" cy="38" r="1.4"/><circle cx="35" cy="34" r="1.4"/><circle cx="39" cy="30" r="1.4"/></g><path d="M42,26 Q50,26 56,32 Q48,34 42,28 Z" fill="#8fd05e" stroke="${O}" stroke-width="1.3"/>`}),
  emberwand:wand('ia-em',{shaft:'#4a3a35',dark:'#1d1513',tip:'#ffcf6e',halo:'#ff5a1f',band:'#8a3a1a',
    extra:`<path d="M16,54 L20,50 L19,47 L24,44 M28,40 L31,38 L30,35 L35,31" stroke="#ff8a3a" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M16,54 L20,50 L19,47 L24,44 M28,40 L31,38 L30,35 L35,31" stroke="#ffd18a" stroke-width=".6" fill="none"/>`,
    tipShape:`<path d="M47,8 Q55,16 50,26 Q46,22 42,22 Q44,14 47,8 Z" fill="url(#ia-emt)" stroke="${O}" stroke-width="1.5"/><path d="M48,13 Q51,18 48,22" stroke="#fff6d0" stroke-width="1.3" fill="none"/>`}),
  glasswand:wand('ia-gl',{shaft:'#dff4ff',dark:'#6a9fc4',tip:'#e8fbff',halo:'#5cc8ff',
    extra:`<path d="M30,38 L24,30 L27,29 Z M36,32 L40,24 L41,28 Z M22,46 L16,42 L19,40 Z" fill="#c9ecff" stroke="${O}" stroke-width="1.1" stroke-linejoin="round"/>`,
    tipShape:`<path d="M48,6 L55,16 L50,27 L42,20 Z" fill="url(#ia-glt)" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/><path d="M48,6 L48,22 L55,16 M42,20 L48,22" stroke="#fff" stroke-width=".9" opacity=".7" fill="none"/>`}),
  wardfocus:svg(rg('ia-wf',[[0,'#f2fdff'],[.5,'#9fdcf2'],[1,'#3c86a8']])+lg('ia-wfb',[[0,'#f0d48e'],[1,'#8a6a2c']],1,1)+glow('ia-wfg',3),
    `<circle cx="32" cy="32" r="19" fill="#8fe0ff" opacity=".35" filter="url(#ia-wfg)"/><circle cx="32" cy="32" r="20" fill="url(#ia-wfb)" stroke="${O}" stroke-width="1.8"/><circle cx="32" cy="32" r="14" fill="url(#ia-wf)" stroke="${O}" stroke-width="1.6"/>
     ${[0,45,90,135,180,225,270,315].map(a=>`<path d="M32,13.5 L32,16.5" stroke="${O}" stroke-width="1.6" transform="rotate(${a} 32 32)"/>`).join('')}<path d="M24,26 Q28,21 35,21" stroke="#fff" stroke-width="2" fill="none" opacity=".8" stroke-linecap="round"/><path d="M32,46 L32,58" stroke="${O}" stroke-width="3"/><path d="M32,46 L32,58" stroke="#c9a85a" stroke-width="1.5"/>`),
  stonefocus:svg(lg('ia-sf',[[0,'#b9b6aa'],[.6,'#77736a'],[1,'#3f3c37']],.5,1)+glow('ia-sfg',2.2),
    `<path d="M26,6 L42,12 L50,32 L40,58 L22,54 L14,30 Z" fill="url(#ia-sf)" stroke="${O}" stroke-width="1.9" stroke-linejoin="round"/><path d="M26,6 L30,30 L22,54 M30,30 L50,32" stroke="${O}" stroke-width="1" opacity=".35" fill="none"/>
     <g filter="url(#ia-sfg)" stroke="#ffbf5e" stroke-width="2.6" fill="none" stroke-linecap="round"><path d="M32,20 L32,42 M25,27 L32,31 L39,27 M27,40 L37,40"/></g><g stroke="#fff1c8" stroke-width="1.2" fill="none" stroke-linecap="round"><path d="M32,20 L32,42 M25,27 L32,31 L39,27 M27,40 L37,40"/></g><path d="M27,10 L40,15" stroke="#fff" stroke-width="1.2" opacity=".35"/>`),
  tidefocus:svg(rg('ia-td',[[0,'#e9ffff'],[.45,'#58d6d0'],[1,'#1d5d7c']])+glow('ia-tdg',3),
    `<circle cx="32" cy="32" r="18" fill="#4fe0e0" opacity=".4" filter="url(#ia-tdg)"/><path d="M32,6 L38,24 L57,26 L42,37 L47,56 L32,45 L17,56 L22,37 L7,26 L26,24 Z" fill="url(#ia-td)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="M32,6 L32,45 M7,26 L42,37 M57,26 L22,37" stroke="#fff" stroke-width=".7" opacity=".35"/><g fill="#e8ffff" opacity=".85"><circle cx="27" cy="20" r="2"/><circle cx="44" cy="44" r="1.4"/><circle cx="50" cy="16" r="1.6"/></g>`),
  moonhood:svg(lg('ia-mh',[[0,'#d9cdf5'],[.6,'#8f7fbf'],[1,'#4b4078']],.4,1),
    `<path d="M24,14 Q14,4 10,6 Q16,10 22,18 Z M40,14 Q50,4 54,6 Q48,10 42,18 Z" fill="#e8def9" stroke="${O}" stroke-width="1.4"/><path d="M32,8 Q50,10 52,36 Q52,52 46,58 L18,58 Q12,52 12,36 Q14,10 32,8 Z" fill="url(#ia-mh)" stroke="${O}" stroke-width="1.8"/><path d="M32,22 Q42,22 43,38 Q42,50 32,52 Q22,50 21,38 Q22,22 32,22 Z" fill="#1a1428" stroke="${O}" stroke-width="1.4"/><path d="M18,30 Q20,16 32,13" stroke="#fff" stroke-width="1.6" fill="none" opacity=".4"/><g fill="#c7f2ff"><circle cx="28" cy="38" r="1.6"/><circle cx="36" cy="38" r="1.6"/></g><path d="M12,50 Q22,58 32,56 Q42,58 52,50" stroke="#f3e9ff" stroke-width="1.6" fill="none" opacity=".7"/>`),
  thorncrown:svg(lg('ia-tc',[[0,'#6d8f3e'],[1,'#2c3f1c']]),
    `<path d="M8,40 Q32,52 56,40 L54,46 Q32,58 10,46 Z" fill="url(#ia-tc)" stroke="${O}" stroke-width="1.8"/>
     ${[[12,42,8,20],[22,46,20,14],[32,48,32,10],[42,46,44,14],[52,42,56,20]].map(([x,y,tx,ty])=>`<path d="M${x-4},${y} Q${tx-2},${(y+ty)/2} ${tx},${ty} Q${tx+3},${(y+ty)/2} ${x+4},${y} Z" fill="url(#ia-tc)" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>`).join('')}
     <path d="M12,44 Q32,54 52,44" stroke="#b9db7a" stroke-width="1.1" fill="none" opacity=".6"/><g fill="#a86ad6" stroke="${O}" stroke-width="1"><circle cx="22" cy="44" r="2.6"/><circle cx="42" cy="44" r="2.6"/><circle cx="32" cy="47" r="3.2"/></g><g fill="#fff" opacity=".7"><circle cx="31" cy="46" r="1"/></g>`),
  embercrown:svg(lg('ia-ec',[[0,'#fff0b8'],[.5,'#e3b64e'],[1,'#8a5a1a']])+rg('ia-ecg',[[0,'#fff6d6'],[.4,'#ffad4a'],[1,'#c2410c']])+glow('ia-ecf',2.6),
    `<g stroke="#ffcf7a" stroke-width="1.6" stroke-linecap="round" opacity=".8"><path d="M32,6 L32,13 M20,10 L23,16 M44,10 L41,16 M12,18 L17,21 M52,18 L47,21"/></g><path d="M8,36 Q32,26 56,36 L54,46 Q32,38 10,46 Z" fill="url(#ia-ec)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="M24,31 L32,18 L40,31 Z" fill="url(#ia-ec)" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="32" cy="32" r="8" fill="#ff8a3a" filter="url(#ia-ecf)" opacity=".8"/><path d="M32,25 L37,32 L32,39 L27,32 Z" fill="url(#ia-ecg)" stroke="${O}" stroke-width="1.4"/><path d="M12,40 Q32,32 52,40" stroke="#fff6d0" stroke-width="1" fill="none" opacity=".7"/>`),
  wraps:robe('ia-wr',{cloth:'#d8c7a2',dark:'#8f7a58',trim:'#6e5a3e',belt:'#6b4a2e'}),
  mossrobe:robe('ia-mr',{cloth:'#9cc56a',dark:'#3e6431',trim:'#e1d39a',belt:'#5b4229',extra:`<path d="M14,18 Q8,24 10,30 Q14,26 16,22 Z M50,18 Q56,24 54,30 Q50,26 48,22 Z" fill="#7fb04e" stroke="${O}" stroke-width="1.2"/><circle cx="32" cy="16" r="3" fill="#e6c766" stroke="${O}" stroke-width="1.2"/>`}),
  ashrobe:robe('ia-ar',{cloth:'#5a5552',dark:'#211e1d',trim:'#ff8a3a',belt:'#7a2f17',extra:`<path d="M18,56 Q24,52 30,56 Q36,52 46,56" stroke="#ff9d4a" stroke-width="1.4" fill="none"/><g fill="#ffb05c"><circle cx="26" cy="48" r=".9"/><circle cx="38" cy="45" r=".9"/><circle cx="35" cy="52" r=".7"/></g>`}),
  trailboots:boots('ia-tb',{leather:'#9a6e46',dark:'#4c321f',cuff:'#6f8f45',sole:'#2e2118',extra:`<path d="M12,22 Q22,18 30,26 Q20,30 14,36 Q22,38 30,44" stroke="${O}" stroke-width="3" fill="none"/><path d="M12,22 Q22,18 30,26 Q20,30 14,36 Q22,38 30,44" stroke="#7da34a" stroke-width="1.6" fill="none"/><path d="M20,20 l-2,-4 M26,30 l3,-3 M18,37 l-3,2" stroke="#e8d6a6" stroke-width="1.6" stroke-linecap="round"/>`}),
  snowboots:boots('ia-sb',{leather:'#dfe9f2',dark:'#7c95ad',cuff:'#ffffff',sole:'#3d4c5c',extra:`<path d="M12,17 Q16,21 20,17 Q24,21 28,17 Q30,19 30,17" stroke="#b8cadb" stroke-width="1.2" fill="none"/><path d="M38,46 l2,-3 l2,3 l-2,3 Z M20,30 l1.6,-2.4 l1.6,2.4 l-1.6,2.4 Z" fill="#9ed6f5" stroke="${O}" stroke-width=".8"/>`}),
  winterring:svg(lg('ia-ws',[[0,'#f2fcff'],[.5,'#9fdcf5'],[1,'#3f86b8']],1,1)+glow('ia-wsg',2.6),
    pendant('ia-ws','#c9d9e6',`<circle cx="32" cy="40" r="12" fill="#9fe6ff" opacity=".45" filter="url(#ia-wsg)"/><path d="M32,22 Q44,38 38,50 Q32,56 26,50 Q20,38 32,22 Z" fill="url(#ia-ws)" stroke="${O}" stroke-width="1.7"/><path d="M30,30 Q27,38 28,46" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/><path d="M36,42 l3,-2 M34,48 l3,1" stroke="#e6faff" stroke-width="1.1"/>`)),
  moonring:svg(lg('ia-mt',[[0,'#ffffff'],[1,'#a7b3d6']],1,1)+rg('ia-mtp',[[0,'#ffffff'],[.6,'#d4c8ff'],[1,'#7e6bc4']])+glow('ia-mtg',2.6),
    pendant('ia-mt','#c9c9e0',`<circle cx="32" cy="40" r="13" fill="#c9b6ff" opacity=".45" filter="url(#ia-mtg)"/><path d="M40,24 A16,16 0 1 0 44,50 A12,12 0 1 1 40,24 Z" fill="url(#ia-mt)" stroke="${O}" stroke-width="1.7"/><path d="M34,34 Q40,42 36,48 Q32,51 29,47 Q27,41 34,34 Z" fill="url(#ia-mtp)" stroke="${O}" stroke-width="1.4"/>`)),
  springheart:svg(rg('ia-sh',[[0,'#e9ffb8'],[.5,'#86c85a'],[1,'#3a6e2a']])+glow('ia-shg',2.6),
    pendant('ia-sh','#a88a5e',`<circle cx="32" cy="40" r="13" fill="#b6f07a" opacity=".4" filter="url(#ia-shg)"/><path d="M32,54 Q16,44 18,34 Q20,26 27,27 Q31,28 32,32 Q33,28 37,27 Q44,26 46,34 Q48,44 32,54 Z" fill="url(#ia-sh)" stroke="${O}" stroke-width="1.7"/><path d="M32,24 Q26,18 22,20 Q26,26 32,26 Z M32,24 Q38,16 43,19 Q38,26 32,26 Z" fill="#7fbf4e" stroke="${O}" stroke-width="1.2"/><path d="M23,34 Q24,30 28,30" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7"/>`)),
  winterheart:svg(lg('ia-wh',[[0,'#ffffff'],[.45,'#a9e4ff'],[1,'#2f6f9e']],1,1)+glow('ia-whg',2.8),
    pendant('ia-wh','#c9d9e6',`<circle cx="32" cy="40" r="14" fill="#a6e8ff" opacity=".5" filter="url(#ia-whg)"/><path d="M32,55 L17,40 L19,30 L26,26 L32,32 L38,26 L45,30 L47,40 Z" fill="url(#ia-wh)" stroke="${O}" stroke-width="1.7" stroke-linejoin="round"/><path d="M32,32 L32,55 M17,40 L32,42 L47,40 M26,26 L32,42 L38,26" stroke="#fff" stroke-width=".8" fill="none" opacity=".5"/><path d="M14,30 l4,1 M50,30 l-4,1 M32,22 l0,3" stroke="#e6faff" stroke-width="1.4" stroke-linecap="round"/>`)),
};
export const SLOT_ART={
  weapon:'<path d="M12,56 L46,20 M44,14 L52,22" />',
  focus:'<circle cx="32" cy="30" r="15"/><path d="M32,45 L32,56"/>',
  head:'<path d="M14,52 Q12,12 32,10 Q52,12 50,52 Z M22,52 Q22,26 32,24 Q42,26 42,52"/>',
  robe:'<path d="M22,10 Q32,15 42,10 L52,18 L46,26 L46,56 L18,56 L18,26 L12,18 Z"/>',
  boots:'<path d="M16,10 L28,10 L29,40 L48,46 Q54,48 54,56 L14,56 Z"/>',
  charm:'<path d="M18,8 Q32,26 46,8"/><path d="M32,28 Q44,40 32,54 Q20,40 32,28 Z"/>',
};
export const slotIcon=slot=>`<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${SLOT_ART[slot]}</svg>`;
export const itemIcon=id=>ITEM_ART[id]||'';
