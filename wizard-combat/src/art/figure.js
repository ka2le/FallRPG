// Paper-doll wanderer for the inventory. Every slot changes what the figure wears or holds.
const O='#15100c';
const ROBES={
  none:{cloth:'#56615f',dark:'#2c3433',trim:'#7c8986',belt:'#3a2f27'},
  wraps:{cloth:'#d6c5a0',dark:'#86704f',trim:'#6e5a3e',belt:'#6b4a2e'},
  mossrobe:{cloth:'#93bf62',dark:'#35562b',trim:'#e1d39a',belt:'#5b4229',leaf:true},
  ashrobe:{cloth:'#57524f',dark:'#1d1a19',trim:'#ff8a3a',belt:'#7a2f17',ember:true},
};
const BOOTS={none:['#3b2f27','#1d1612','#3b2f27'],trailboots:['#9a6e46','#4c321f','#6f8f45'],snowboots:['#e3ecf4','#7c95ad','#ffffff']};
const WANDS={none:null,twig:['#9a7650','#4e3826','#ffb35c'],reedwand:['#b7d47a','#4f7a36','#c8ff9a'],emberwand:['#4a3a35','#1d1513','#ff9a3d'],glasswand:['#e2f6ff','#6a9fc4','#bdf0ff']};
const FOCI={wardfocus:['#bfeeff','#3c86a8','#8fe0ff'],stonefocus:['#a9a59a','#4a4740','#ffbf5e'],tidefocus:['#8ff0ea','#1d5d7c','#4fe0e0']};
const CHARMS={winterring:'#a9e6ff',moonring:'#e4dcff',springheart:'#9fd86a',winterheart:'#bdeeff'};

let uid=0;
export function paperdoll(eq={}){
  const u=`pd${uid++}`;
  const r=ROBES[eq.robe]||ROBES.none,b=BOOTS[eq.boots]||BOOTS.none,w=WANDS[eq.weapon],f=FOCI[eq.focus],c=CHARMS[eq.charm];
  const defs=`
    <linearGradient id="${u}-robe" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="${r.cloth}"/><stop offset="1" stop-color="${r.dark}"/></linearGradient>
    <linearGradient id="${u}-sleeve" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${r.dark}"/><stop offset=".6" stop-color="${r.cloth}"/><stop offset="1" stop-color="${r.dark}"/></linearGradient>
    <linearGradient id="${u}-boot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b[0]}"/><stop offset="1" stop-color="${b[1]}"/></linearGradient>
    <radialGradient id="${u}-skin" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e6c29c"/><stop offset="1" stop-color="#a87a58"/></radialGradient>
    <radialGradient id="${u}-aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${f?f[2]:'#cfe4d6'}" stop-opacity=".22"/><stop offset="1" stop-color="${f?f[2]:'#cfe4d6'}" stop-opacity="0"/></radialGradient>
    ${f?`<radialGradient id="${u}-orb" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${f[0]}"/><stop offset="1" stop-color="${f[1]}"/></radialGradient>`:''}
    <filter id="${u}-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>`;
  const hem=r.ember?`<path d="M50,372 Q85,362 120,372 Q155,362 190,372" stroke="${r.trim}" stroke-width="3" fill="none"/><g fill="#ffb05c"><circle cx="88" cy="350" r="1.6"/><circle cx="150" cy="340" r="1.4"/><circle cx="132" cy="360" r="1.2"/><circle cx="70" cy="330" r="1.2"/></g>`
    :r.leaf?[60,84,108,132,156,180].map((x,i)=>`<path d="M${x},${372-(i%2)*4} q-8,14 2,22 q8,-10 -2,-22 Z" fill="#7fb04e" stroke="${O}" stroke-width="1.5"/>`).join(''):'';
  const head=eq.head==='moonhood'
    ?`<path d="M100,52 Q84,26 76,26 Q86,36 96,58 Z M140,52 Q156,26 164,26 Q154,36 144,58 Z" fill="#ece3fb" stroke="${O}" stroke-width="2"/>
      <path d="M120,36 Q154,38 158,78 Q160,104 148,118 L92,118 Q80,104 82,78 Q86,38 120,36 Z" fill="#a597d1" stroke="${O}" stroke-width="2.5"/><path d="M92,74 Q96,46 120,42" stroke="#fff" stroke-width="2.4" fill="none" opacity=".35"/>
      <path d="M120,54 Q140,56 141,80 Q140,100 120,104 Q100,100 99,80 Q100,56 120,54 Z" fill="#1d1730"/>`
    :`<path d="M96,70 Q92,40 120,38 Q148,40 144,70 Q140,52 120,52 Q100,52 96,70 Z" fill="#3b2b22" stroke="${O}" stroke-width="2.4"/>`;
  const crown=eq.head==='thorncrown'?`<path d="M94,58 Q120,68 146,58 L144,64 Q120,74 96,64 Z" fill="#3f5a28" stroke="${O}" stroke-width="2"/>${[[98,60,92,40],[110,64,108,40],[120,66,120,34],[130,64,132,40],[142,60,148,40]].map(([x,y,tx,ty])=>`<path d="M${x-3},${y} L${tx},${ty} L${x+3},${y} Z" fill="#4f6e30" stroke="${O}" stroke-width="1.6"/>`).join('')}<circle cx="120" cy="64" r="3" fill="#a86ad6" stroke="${O}"/>`
    :eq.head==='embercrown'?`<path d="M94,56 Q120,48 146,56 L145,63 Q120,56 95,63 Z" fill="#e3b64e" stroke="${O}" stroke-width="2"/><circle cx="120" cy="54" r="10" fill="#ff8a3a" opacity=".6" filter="url(#${u}-glow)"/><path d="M120,46 L125,54 L120,62 L115,54 Z" fill="#ffb44a" stroke="${O}" stroke-width="1.6"/>`:'';
  const face=eq.head==='moonhood'
    ?`<g fill="#c7f2ff"><circle cx="111" cy="80" r="2.6"/><circle cx="129" cy="80" r="2.6"/></g>`
    :`<path d="M98,74 Q98,104 120,108 Q142,104 142,74 Q140,58 120,56 Q100,58 98,74 Z" fill="url(#${u}-skin)" stroke="${O}" stroke-width="2.4"/><path d="M98,74 Q104,62 120,60 Q136,62 142,74 Q130,68 120,68 Q110,68 98,74 Z" fill="#3b2b22"/><g fill="#2a1d14"><ellipse cx="111" cy="82" rx="2.4" ry="3"/><ellipse cx="129" cy="82" rx="2.4" ry="3"/></g><path d="M114,96 Q120,99 126,96" stroke="#7a4f36" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const wandSvg=w?`<g transform="rotate(28 186 246)"><path d="M182,288 L182,170 L190,170 L190,288 Z" fill="${w[0]}" stroke="${O}" stroke-width="2.4"/><path d="M184,286 L184,172" stroke="#fff" stroke-width="1" opacity=".3"/><circle cx="186" cy="164" r="12" fill="${w[2]}" opacity=".7" filter="url(#${u}-glow)"/><path d="M186,152 L193,164 L186,176 L179,164 Z" fill="${w[2]}" stroke="${O}" stroke-width="2"/></g>`:'';
  const focusSvg=f?`<circle cx="56" cy="214" r="22" fill="${f[2]}" opacity=".45" filter="url(#${u}-glow)"/><circle cx="56" cy="214" r="13" fill="url(#${u}-orb)" stroke="${O}" stroke-width="2.2"/><path d="M48,208 Q52,203 58,203" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>`:'';
  const charmSvg=c?`<path d="M106,122 Q120,146 134,122" stroke="#c9b48a" stroke-width="1.6" fill="none"/><circle cx="120" cy="150" r="9" fill="${c}" opacity=".6" filter="url(#${u}-glow)"/><path d="M120,140 Q128,150 120,160 Q112,150 120,140 Z" fill="${c}" stroke="${O}" stroke-width="1.8"/>`:'';
  return `<svg viewBox="0 0 240 440" aria-hidden="true"><defs>${defs}</defs>
    <ellipse cx="120" cy="230" rx="118" ry="210" fill="url(#${u}-aura)"/>
    <ellipse cx="122" cy="420" rx="70" ry="10" fill="#000" opacity=".3"/>
    <path d="M98,388 L96,416 Q96,422 102,422 L120,422 L120,388 Z M122,388 L122,422 L142,422 Q148,422 146,414 L144,388 Z" fill="url(#${u}-boot)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M96,392 L120,392 M122,392 L146,392" stroke="${b[2]}" stroke-width="6"/>
    <path d="M78,116 Q120,104 162,116 L170,170 L196,376 Q120,392 44,376 L70,170 Z" fill="url(#${u}-robe)" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M120,124 L120,382" stroke="${r.trim}" stroke-width="3" opacity=".75"/><path d="M96,118 L120,150 L144,118" stroke="${r.trim}" stroke-width="3" fill="none"/>
    <path d="M74,212 Q120,224 166,212 L168,226 Q120,238 72,226 Z" fill="${r.belt}" stroke="${O}" stroke-width="2"/><rect x="113" y="214" width="14" height="14" rx="2" fill="#c9a85a" stroke="${O}" stroke-width="1.6"/>
    <path d="M86,140 Q80,250 68,360 M154,140 Q160,250 172,360" stroke="${O}" stroke-width="1.6" fill="none" opacity=".25"/>
    <path d="M82,130 Q96,122 110,124" stroke="#fff" stroke-width="2" fill="none" opacity=".25"/>
    ${hem}
    <path d="M78,118 Q60,128 56,170 Q50,206 40,240 Q58,252 78,240 Q78,206 84,172 Z" fill="url(#${u}-sleeve)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M162,118 Q180,128 184,170 Q190,204 202,236 Q184,250 164,238 Q164,204 156,172 Z" fill="url(#${u}-sleeve)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
    ${wandSvg}
    <ellipse cx="62" cy="246" rx="10" ry="9" fill="url(#${u}-skin)" stroke="${O}" stroke-width="2"/>
    <ellipse cx="182" cy="244" rx="10" ry="10" fill="url(#${u}-skin)" stroke="${O}" stroke-width="2"/>
    ${focusSvg}${charmSvg}
    <path d="M108,100 L108,116 L132,116 L132,100 Z" fill="#a87a58" stroke="${O}" stroke-width="2"/>
    ${head}${eq.head==='moonhood'?'':face}${crown}${eq.head==='moonhood'?face:''}
  </svg>`;
}
