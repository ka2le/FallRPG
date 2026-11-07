export const TREE_ATTACK={range:40,windup:.3,recovery:.8,damage:6};

export function enemyPressure(creature,species,playerLevel){
  const gap=Math.max(0,Math.min(6,(creature.level||1)-playerLevel));
  const speed=species.speed*1.3;
  return {
    speed,
    // A short opening rush punishes brushing past over-level enemies. It ends
    // after two seconds so escaping with control, cover or movement still works.
    rushSpeed:gap>=2?Math.max(speed*1.5,100+gap*4):speed,
    notice:145+gap*14,
    windup:Math.max(.35,.45-gap*.015),
    recovery:Math.max(.75,1.05-gap*.05),
    shotSpeed:180+gap*10,
    rangedReach:190+gap*5,
    leash:380+gap*15,
    homeLeash:320+gap*20,
  };
}
