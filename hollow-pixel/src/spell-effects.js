import { SPELL_BY_ID } from './data.js';

export const SPELL_UPGRADES={
  surge:{name:'Overcharge',summary:'+50% damage · slows for 1.5s',damage:1.5,slow:1.5},
  ward:{name:'Heartwood',summary:'+60% shield · +40% duration',shield:1.6,duration:1.4},
  nova:{name:'Full bloom',summary:'+45% damage · +25% radius',damage:1.45,radius:1.25,stagger:.5},
  haste:{name:'Wild wind',summary:'+2 seconds · faster movement',extraDuration:2,speed:2.05},
  bind:{name:'Deep roots',summary:'+2 seconds · +35% spread',extraDuration:2,radius:1.35},
  fox:{name:'Pack spirit',summary:'+50% damage · +6 seconds',damage:1.5,extraDuration:6},
  renew:{name:'Regrowth',summary:'+65% healing · heals in 4 seconds',healing:1.65,healDuration:4},
};

// One calculation shared by combat and the character screen's previews.
export function effectiveSpell(id,stats,upgraded=false){
  const base=SPELL_BY_ID[id],u=upgraded?SPELL_UPGRADES[id]||{}:{};
  const bonus=id==='surge'?stats.lanceBonus||0:id==='fox'?stats.foxBonus||0:0;
  return {...base,
    damage:(base.damage||0)*stats.spellPower*(u.damage||1)*(1+bonus),
    duration:((base.duration||0)+(u.extraDuration||0))*stats.durationPower*(u.duration||1)+(id==='bind'?stats.bindBonus||0:0),
    radius:(base.radius||0)*(u.radius||1)+(id==='nova'?stats.bloomBonus||0:0),
    shield:((base.shield||0)*(1+(stats.spellPower-1)*.5)+(stats.wardBonus||0))*(u.shield||1),
    healing:(base.healing||0)*stats.spellPower*(u.healing||1),
    healDuration:u.healDuration||base.duration||0,
    hasteSpeed:u.speed||1.75,stagger:(1+(u.stagger||0))*stats.durationPower,
    slow:(u.slow||0)*stats.durationPower,
  };
}
