import {ECO_SPECIES} from '../ecology-species.js';
// Field-guide illustrations for the codex; the world uses articulated 3D models.
function portrait(type,s){
  const low=['rootknife','snowkeel'].includes(type),y=low?324:270;
  const legs=[130,190,300,355].map((x,i)=>`<path d="M${x} ${y+28}l${i%2?24:-18} 95 30 8 9-18-15-10 5-70" fill="#5a6455" stroke="#293b32" stroke-width="7"/>`).join('');
  let details='';
  if(type==='barkjaw')details=Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2,x=400+Math.cos(a)*28,yy=y+Math.sin(a)*25;return `<path d="M${x} ${yy}l${Math.cos(a)*40} ${Math.sin(a)*42} -10 40" fill="none" stroke="#e1cba4" stroke-width="12" stroke-linejoin="round"/>`;}).join('');
  if(type==='ventback')details=Array.from({length:5},(_,i)=>`<path d="M${130+i*40} ${y-46}v-60l22-9 5 69" fill="#777160" stroke="#293b32" stroke-width="6"/><ellipse cx="${142+i*40}" cy="${y-109}" rx="12" ry="6" fill="#f4a45e"/>`).join('');
  if(type==='mantleback')details=Array.from({length:7},(_,i)=>`<path d="M${127+i*32} ${y-48}v-${25+i%3*12}" stroke="#e4cf9b" stroke-width="8"/><ellipse cx="${127+i*32}" cy="${y-77-i%3*12}" rx="22" ry="12" fill="${i%2?'#e5b16f':'#b6cd80'}" stroke="#4a5340" stroke-width="4"/>`).join('');
  if(type==='snowkeel')details=`<path d="M142 ${y-17}L255 138 289 ${y-22}" fill="#c9e9e5" stroke="#7ba4b2" stroke-width="8"/>`;
  if(type==='rootknife')details=`<path d="M135 300l-45-42 76 16 26-55 32 53 72-29-20 55M338 345l-25 60 101-22" fill="#809a59" stroke="#334737" stroke-width="7"/>`;
  if(type==='scavenger')details=`<ellipse cx="211" cy="${y+4}" rx="60" ry="61" fill="#8bb8b7" opacity=".85"/><ellipse cx="285" cy="${y+4}" rx="45" ry="61" fill="#d1a36f" opacity=".9"/>`;
  return {name:s.name,view:[512,512],ground:440,scale:1,stride:3,defs:`<radialGradient id="eco-${type}"><stop stop-color="${s.color}"/><stop offset="1" stop-color="#58634e"/></radialGradient>`,parts:[{id:'body',pivot:[256,320],svg:`${legs}<path d="M103 ${y+14}Q77 ${y-60} 174 ${y-77}Q309 ${y-113} 367 ${y-36}L421 ${y-21}Q458 ${y+39} 397 ${y+55}L332 ${y+38}Q210 ${y+98} 103 ${y+14}Z" fill="url(#eco-${type})" stroke="#293b32" stroke-width="8"/>${details}<ellipse cx="410" cy="${y+18}" rx="15" ry="20" fill="#24382b"/><circle cx="387" cy="${y-11}" r="8" fill="#eff3ab"/><path d="M120 ${y-10}Q221 ${y-54} 331 ${y-16}" fill="none" stroke="#e6d5a8" stroke-width="5" opacity=".5"/>`}],animate(p,st){p.body.y=Math.sin(st.t*2)*2+Math.sin(st.phase)*st.move*5;p.body.r=st.windup*-5+st.attack*7+st.dead*80;p.body.o=1-st.dead*.8;}};
}
export const ECO_PORTRAITS=Object.fromEntries(Object.entries(ECO_SPECIES).map(([type,s])=>[type,portrait(type,s)]));
