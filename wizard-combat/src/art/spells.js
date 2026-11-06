// Ability icons: painted 64×64 tiles used by the action bar and the spellbook.
const O='#120d0a';
const tile=(k,bg,fg,body)=>`<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
  <radialGradient id="${k}b" cx=".5" cy=".45" r=".72"><stop offset="0" stop-color="${bg[1]}"/><stop offset=".7" stop-color="${bg[2]}"/><stop offset="1" stop-color="#050307"/></radialGradient>
  <radialGradient id="${k}f" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${fg[0]}"/><stop offset="1" stop-color="${fg[1]}"/></radialGradient>
  <filter id="${k}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
  <rect width="64" height="64" fill="url(#${k}b)"/>${body}</svg>`;
const glowing=(k,shape,color)=>`<g filter="url(#${k}g)" opacity=".9">${shape.replace(/fill="url\(#[^)]+\)"/g,`fill="${color}"`).replace(/stroke="url\(#[^)]+\)"/g,`stroke="${color}"`)}</g>${shape}`;

const FIRE='<path d="M46,14 Q38,26 30,30 Q20,36 16,48 Q14,54 18,54 Q12,44 24,40 Q20,48 26,50 Q28,40 36,36 Q34,44 40,44 Q44,34 52,30 Q44,30 46,14 Z" fill="url(#sp0f)" stroke="'+O+'" stroke-width="1.6" stroke-linejoin="round"/><circle cx="21" cy="47" r="7" fill="url(#sp0f)" stroke="'+O+'" stroke-width="1.6"/><circle cx="19" cy="45" r="2.6" fill="#fff"/>';
const BIND='<path d="M32,54 C14,50 12,30 26,24 C38,19 46,30 38,36 C32,40 26,34 30,30" fill="none" stroke="'+O+'" stroke-width="6" stroke-linecap="round"/><path d="M32,54 C14,50 12,30 26,24 C38,19 46,30 38,36 C32,40 26,34 30,30" fill="none" stroke="url(#sp1f)" stroke-width="3.4" stroke-linecap="round"/><path d="M40,14 Q52,10 54,20 Q44,22 40,14 Z M16,20 Q12,10 22,10 Q24,18 16,20 Z M46,44 Q56,46 54,54 Q46,52 46,44 Z" fill="url(#sp1f)" stroke="'+O+'" stroke-width="1.3"/><path d="M18,40 l-4,-1 M24,50 l-2,4 M44,30 l4,-2" stroke="#efe2b8" stroke-width="2" stroke-linecap="round"/>';
const SHOCK='<circle cx="32" cy="32" r="22" fill="none" stroke="url(#sp2f)" stroke-width="2.4" opacity=".55"/><circle cx="32" cy="32" r="15" fill="none" stroke="url(#sp2f)" stroke-width="3.2" opacity=".8"/><circle cx="32" cy="32" r="7" fill="url(#sp2f)" stroke="'+O+'" stroke-width="1.4"/>'+[0,45,90,135,180,225,270,315].map(a=>`<path d="M32,4 L34,10 L30,10 Z" fill="#e8ffff" transform="rotate(${a} 32 32)"/>`).join('');
const SHIELD='<path d="M32,8 L52,16 Q52,40 32,56 Q12,40 12,16 Z" fill="url(#sp3f)" stroke="'+O+'" stroke-width="1.8" stroke-linejoin="round" opacity=".92"/><g fill="none" stroke="#f2f6ff" stroke-width="1.2" opacity=".75"><path d="M32,16 l6,3.5 v7 l-6,3.5 l-6,-3.5 v-7 Z"/><path d="M26,30 l-6,3.5 v7 M38,30 l6,3.5 v7 M32,37 v8 M20,19.5 l6,-3.5 M44,19.5 l-6,-3.5"/></g><path d="M16,18 Q18,30 24,40" stroke="#fff" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/>';
const SIPHON='<path d="M40,10 A20,20 0 1 0 50,44 A15,15 0 1 1 40,10 Z" fill="url(#sp4f)" stroke="'+O+'" stroke-width="1.8"/><g fill="#f3dcff">'+[[52,52,3.4],[44,56,2.4],[56,44,2],[36,58,1.6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')+'</g><path d="M22,22 Q20,32 26,40" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>';
const FROST='<g stroke="'+O+'" stroke-width="5" stroke-linecap="round">'+[0,60,120].map(a=>`<path d="M32,8 L32,56" transform="rotate(${a} 32 32)"/>`).join('')+'</g><g stroke="url(#sp5f)" stroke-width="3" stroke-linecap="round" fill="none">'+[0,60,120,180,240,300].map(a=>`<path d="M32,32 L32,8 M32,16 L26,11 M32,16 L38,11" transform="rotate(${a} 32 32)"/>`).join('')+'</g><circle cx="32" cy="32" r="8" fill="url(#sp5f)" stroke="'+O+'" stroke-width="1.6"/>';
const BLINK='<g opacity=".35"><circle cx="16" cy="40" r="7" fill="url(#sp6f)"/></g><g opacity=".6"><circle cx="26" cy="34" r="7" fill="url(#sp6f)"/></g><path d="M32,30 L50,18 L46,30 L54,34 L36,44 L40,34 Z" fill="url(#sp6f)" stroke="'+O+'" stroke-width="1.6" stroke-linejoin="round"/><g fill="#fff"><path d="M50,46 l1.5,4 l4,1.5 l-4,1.5 l-1.5,4 l-1.5,-4 l-4,-1.5 l4,-1.5 Z"/><path d="M14,16 l1,3 l3,1 l-3,1 l-1,3 l-1,-3 l-3,-1 l3,-1 Z"/></g>';
const FOX='<path d="M14,14 L26,26 Q32,22 38,26 L50,14 L48,34 Q46,48 32,54 Q18,48 16,34 Z" fill="url(#sp7f)" stroke="'+O+'" stroke-width="1.8" stroke-linejoin="round"/><path d="M18,18 L25,26 M46,18 L39,26" stroke="'+O+'" stroke-width="1.2" opacity=".5"/><path d="M24,40 Q32,36 40,40 Q36,48 32,50 Q28,48 24,40 Z" fill="#f4fffb"/><g fill="#0d2a26"><path d="M22,34 Q26,30 30,34 Q26,36 22,34 Z"/><path d="M34,34 Q38,30 42,34 Q38,36 34,34 Z"/><circle cx="32" cy="44" r="2.4"/></g>';
const WIND='<g fill="none" stroke-linecap="round"><path d="M8,24 L38,24 Q50,24 48,14 Q46,8 40,10" stroke="'+O+'" stroke-width="6"/><path d="M8,24 L38,24 Q50,24 48,14 Q46,8 40,10" stroke="url(#sp8f)" stroke-width="3.4"/><path d="M12,36 L48,36 Q58,36 56,46 Q54,52 48,50" stroke="'+O+'" stroke-width="6"/><path d="M12,36 L48,36 Q58,36 56,46 Q54,52 48,50" stroke="url(#sp8f)" stroke-width="3.4"/><path d="M18,48 L32,48" stroke="'+O+'" stroke-width="5"/><path d="M18,48 L32,48" stroke="url(#sp8f)" stroke-width="2.6"/></g>';
const OATH='<path d="M32,56 Q10,44 12,26 Q14,10 32,8 Q50,10 52,26 Q54,44 32,56 Z" fill="url(#sp9f)" stroke="'+O+'" stroke-width="1.8"/><path d="M32,14 L32,52 M32,24 L22,18 M32,32 L20,26 M32,40 L22,36 M32,24 L42,18 M32,32 L44,26 M32,40 L42,36" stroke="#2d5a22" stroke-width="1.6" fill="none" opacity=".7"/><path d="M46,40 h10 M51,35 v10" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>';
const HEARTH='<path d="M10,56 L10,30 Q10,10 32,10 Q54,10 54,30 L54,56 Z" fill="#4a3a30" stroke="'+O+'" stroke-width="1.8"/><path d="M18,56 L18,32 Q18,18 32,18 Q46,18 46,32 L46,56 Z" fill="#1c1310" stroke="'+O+'" stroke-width="1.4"/><g stroke="'+O+'" stroke-width="1" opacity=".5"><path d="M10,40 L18,40 M46,40 L54,40 M14,24 L20,28 M50,24 L44,28 M32,10 L32,18"/></g><path d="M32,54 Q22,50 24,40 Q26,34 30,30 Q30,38 34,38 Q32,30 38,24 Q42,36 42,44 Q42,52 32,54 Z" fill="url(#sp10f)" stroke="'+O+'" stroke-width="1.4"/>';

const DEF=[
  ['#ffd7a8','#a8471c','#2a0f08',['#ffc27a','#e0571c'],FIRE],
  ['#d6f0b0','#3f6a2a','#0f1d0b',['#c6ef8c','#4c8a2e'],BIND],
  ['#e2fffd','#3d7d82','#0b1d20',['#d8ffff','#6cc7cf'],SHOCK],
  ['#dce6ff','#3a4f96','#0b1024',['#d4e0ff','#6f8ae6'],SHIELD],
  ['#ead2ff','#6a3b94','#170b22',['#f1e2ff','#a26bd8'],SIPHON],
  ['#dcf6ff','#2f7ea0','#081a24',['#e8fbff','#5cc4ec'],FROST],
  ['#ffd9f1','#8a3f76','#1d0b18',['#ffe6f6','#e889c9'],BLINK],
  ['#d8fff4','#2f7a6a','#0a1d19',['#e8fff9','#7fd9c3'],FOX],
  ['#fff1c4','#93762d','#1f180a',['#fff5d6','#e9c665'],WIND],
  ['#e6f7c8','#527a33','#111c0b',['#dff5b4','#7fb550'],OATH],
  ['#ffe0b8','#8a5a2c','#1d130a',['#fff0c0','#ff9a3d'],HEARTH],
];
export const SPELL_ART=DEF.map(([a,b,c,fg,body],i)=>tile(`sp${i}`,[a,b,c],fg,glowing(`sp${i}`,body,fg[1])));
export const spellIcon=i=>SPELL_ART[i]||'';
