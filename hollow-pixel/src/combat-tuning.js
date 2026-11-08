export const TREE_ATTACK={range:40,windup:.3,recovery:.8,damage:6};

export function enemyPressure(creature,species,playerLevel){
  const gap=Math.max(0,Math.min(6,(creature.level||1)-playerLevel));
  const sapling=creature.type==='seedling',apprentice=creature.quest==='herd',opening=apprentice||creature.opening||creature.camp==='briar-turn';
  const early=!species.neutral&&(creature.level||1)<=3,middle=!species.neutral&&(creature.level||1)<=6;
  const chaser=['stalker','grovefang'].includes(creature.type),ranged=species.ranged;
  const speed=species.neutral?species.speed*1.3:apprentice?104:sapling?120:opening&&!ranged?114:chaser?143:ranged?Math.max(54,species.speed*1.5):early?(creature.type==='prowler'?125:116):Math.max(creature.type==='prowler'?135:126,species.speed*1.8);
  return {
    speed,
    // Packs provide pressure without making each individual a sprinting missile.
    // A brief approach gives way to a pace an escape spell can clearly outrun.
    rushSpeed:species.neutral||ranged?speed:apprentice?116:sapling?132:opening||early?132:Math.max(speed,150+gap*2),
    rushDuration:sapling?.55:early?.8:opening?.9:1.2,
    returnSpeed:Math.min(speed,76),
    notice:apprentice?160:opening?(ranged?225:180):ranged?(early?280:middle?330:360):240,
    windup:sapling?.45:opening?.36:early?.3:ranged?(middle?.26:.22):.28,
    recovery:sapling?1.15:opening?.9:early?(ranged?.8:.9):ranged?(middle?.65:.48):.65,
    shotSpeed:early?300:340,
    rangedReach:opening?215:early?260:middle?300:330,
    leash:chaser?Infinity:ranged?560:520,
    homeLeash:chaser?Infinity:creature.type==='seedling'?500:ranged?300:early?500:450,
  };
}
