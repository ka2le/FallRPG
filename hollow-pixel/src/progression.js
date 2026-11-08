// Shared by the live game and the accelerated balance runner.
export const PROGRESSION_VERSION=3;
export const ATTRIBUTES={
  power:{name:'Power',description:'+5% power for basic attacks and every spell.'},
  mana:{name:'Mana',description:'+8 maximum mana and +0.65 mana regenerated per second.'},
};
export const pointsAtLevel=level=>Math.max(0,(level-1)*2);
export const xpForLevel=level=>100+level*40;
export function attributesFor(saved={},level=1,reserved=0){
  saved=saved&&typeof saved==='object'?saved:{};
  let remaining=Math.max(0,pointsAtLevel(level)-reserved);const result={};
  for(const id of Object.keys(ATTRIBUTES)){
    result[id]=Math.min(remaining,Number.isFinite(saved[id])?Math.max(0,Math.floor(saved[id])):0);
    remaining-=result[id];
  }
  return result;
}
export function playerStats(level,attributes,gear={}){
  // The first few levels must matter even when points buy mana or new tools.
  // Growth slows after level six; the wilderness keeps its fixed enemy levels.
  const steps=Math.max(0,level-1),levelPower=Math.min(steps,5)*.06+Math.max(0,steps-5)*.03;
  const power=1+levelPower+(attributes.power||0)*.05+(gear.power||0);
  return {
    maxHp:120+(level-1)*8+(gear.health||0),
    maxMana:100+(attributes.mana||0)*8+(gear.mana||0),
    spellPower:power,
    durationPower:1+(power-1)*.65,
    manaRegen:4+(attributes.mana||0)*.65+(gear.regen||0),
    healthRegen:.5,healthRegenRest:1.2,
    cooldownReduction:Math.min(.2,Math.max(0,gear.cooldown||0)),
    wardBonus:gear.ward||0,bloomBonus:gear.bloom||0,bindBonus:gear.bind||0,
    foxBonus:gear.fox||0,lanceBonus:gear.lance||0,tonicHealing:65+(gear.tonic||0),
  };
}
