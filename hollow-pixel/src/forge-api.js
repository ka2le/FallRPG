// Authoritative contract shared by the runtime, agent prompt and simulations.
// New item behaviors use composable hooks and real game methods, not item-name
// special cases. Mutating hooks edit the named event fields synchronously.
export const FORGE_HOOK_API={
  onEquip:'Once after equipping and recalculating stats. Initialize state; no automatic repeat on recalculate.',
  onUnequip:'Once on removal/replacement. Undo temporary changes. Per-item state then disappears.',
  onUpdate:'{dt}. Every unpaused simulation frame, including safe havens. dt is seconds, at most .05.',
  onStats:'{stats}. PURE modifier: edit derived stats such as spellPower, manaRegen, maxHp, maxMana, healthRegen, healthRegenRest, speed, armor, cooldownReduction. speed/armor are fractions (0.5 = +50% speed or 50% protection). Called by stats queries; no side effects, and do not call game.stats/recalculate inside it. Applies only while equipped.',
  onSpell:'{spell,values}. PURE modifier of a spell’s effective values: cost, cooldown, damage, radius, shield, duration, healing, etc. Applies to checks AND consumption, including empowered automatic attacks. Do not call spellValues inside this hook.',
  onBeforeHit:'{target,damage,color,cancel}. Before outgoing creature damage; modify damage or cancel. Includes sparks, spells, companion and explicit game.hurt calls.',
  onHit:'{target,damage}. After outgoing damage and normal death/rewards; target may be dead. damage is the actual health lost.',
  onDamage:'{amount,source,cancel}. Before incoming armor/ward. Change amount, cancel=true, or return false. source may be null.',
  onDamaged:'{source,amount,absorbed}. After incoming health loss/ward absorption. amount is actual HP lost; absorbed is ward consumed.',
  onBeforeHeal:'{amount,source,cancel}. Before healing from passive recovery, tonic, spells or game.healPlayer. Edit amount or cancel.',
  onHeal:'{amount,source}. After actual healing (capped at maxHp). Does not fire when no HP was restored.',
  onCast:'{spell}. After a successful cast or spark, after normal mana/cooldown consumption.',
  onBeforeMove:'{dx,dy,speed,dt,running,cancel}. Before keyboard/route movement. Change direction/speed or cancel; collision remains active.',
  onMove:'{from,to,distance,dt,running,teleport}. After actual player movement; use distance for distance-based effects.',
  onProjectile:'{projectile,cancel}. Before insertion into game.projectiles. Edit speed, damage, radius, root, slow, heal, color; inspect enemy/source/target. Applies to friendly AND enemy projectiles, so filter enemy deliberately.',
  onBeforeReward:'{xp,coins,source,cancel}. Before creature/bounty rewards. Edit rewards; cancel omits them.',
  onReward:'{xp,coins,source}. After real reward grant. source is the creature or quest descriptor.',
  onBeforeDeath:'{source,health,cancel}. After a lethal hit, before respawn. cancel=true keeps the player alive with health (default 1). Use state/time for cooldowns.',
  onKill:'{target}. After creature death and modified rewards. Runs once per actual death.',
  onEvent:'{event}. General Game.emit observer. event.type includes cast, player-damage, player-heal, death, respawn, observation, interact, gather, quest, place, bindings, toast, etc. Payload fields vary; inspect source. Reentrant calls to the same hook are suppressed.',
};
export const FORGE_HOOK_NAMES=Object.keys(FORGE_HOOK_API);
export const FORGE_METHOD_API={
  'nearbyCreatures(radius,{hostileOnly=false})':'Living creatures around player. Hostile means species aggression OR provoked neutral; not merely currently aggro.',
  'hurt(target,damage,color)':'Normal outgoing damage, before-hit/hit hooks, deaths, rewards and quest progress.',
  'killCreature(target,color)':'Guaranteed ordinary creature kill (still respects onBeforeHit). Never accepts the player.',
  'damagePlayer(amount,source)':'Normal incoming damage, armor/ward, damage/death hooks and respawn; safe havens/invulnerability still apply.',
  'healPlayer(amount,source)':'Healing through before/after-heal hooks. Returns actual healing; caps at maxHp.',
  'restoreMana(amount,source)':'Restore mana up to capacity. Returns actual amount; emits mana-restore.',
  'applyStatus(target,status,seconds)':'Extend root, stun, or slow. Does not shorten an existing stronger duration. Root/stun cancel an attack windup.',
  'knockback(target,distance,origin=player)':'Move a creature away from origin with normal collision.',
  'teleportPlayer(x,y)':'Move to walkable ground, cancel route, dispatch onMove with teleport=true. Returns false on invalid ground.',
  'launchProjectile(projectile)':'Dispatch projectile modifiers and insert the shot. For extra shots, provide normal shot fields and use a state guard if needed.',
  'nearbyInteractables(radius,kind)':'Uncollected world interactions around player; kind is optional.',
  'gatherHerb(target)':'Collect a nearby herb through normal resource/event handling (max 100 units). Returns success.',
  'grantReward({xp,coins,source})':'Before/after reward hooks plus real XP/level and amber grant.',
  'effect(type,x,y,color,extra)':'Visual effect; existing types include ring, bloom, beam, hit, roots, leaves, destination, warning. Inspect renderer before inventing types.',
  'spellValues(id), spellCooldown(id), cast(slot), recalculate()':'Real spell and stat paths. Recalculate after changing persistent inputs; never from pure modifier hooks.',
};
export const FORGE_ITEM_FAMILIES=[
  ['conditional stats','low-health power, moving mana recovery, species-dependent ward',['onStats','onUpdate']],
  ['outgoing combat','critical strikes, executions, damage conversion, chain attacks',['onBeforeHit','onHit']],
  ['incoming combat','species immunity, reflection, mana shields, retaliatory roots',['onDamage','onDamaged']],
  ['healing','lifesteal, healing amplification, overheal-to-ward, recovery pulses',['onBeforeHeal','onHeal','onHit','onUpdate']],
  ['spellcraft','free spell types, larger blooms, longer summons, spell-specific cooldowns',['onSpell','onCast']],
  ['movement','speed conditions, walking heals, blink-on-hit, ember trails',['onBeforeMove','onMove','onHit']],
  ['projectiles','faster sparks, split shots, freezing bolts, projectile absorption',['onProjectile']],
  ['rewards','double amber, bonus XP, kill streaks, healing on bounty turn-in',['onBeforeReward','onReward','onKill']],
  ['survival','one-use rescue, cooldown-based last stand, revive with ward',['onBeforeDeath','onEvent']],
  ['world interaction','herb magnets, gathering bonuses, discovery mana, region changes',['onUpdate','onEvent']],
  ['state and visuals','auras, orbiting effects, stack counters, timed procs',['onUpdate','onEquip','onUnequip']],
];
export function forgeApiReference(){return `HOOK CONTRACT:\n${Object.entries(FORGE_HOOK_API).map(([k,v])=>`${k}: ${v}`).join('\n')}\nGAME METHODS:\n${Object.entries(FORGE_METHOD_API).map(([k,v])=>`game.${k}: ${v}`).join('\n')}\nEFFECT FAMILIES (examples, not a preset restriction):\n${FORGE_ITEM_FAMILIES.map(([name,examples,hooks])=>`${name}: ${examples}; hooks ${hooks.join(', ')}`).join('\n')}\nAll hooks receive {game,player,item,state,...event}, and normal methods bind this to that context. Only state persists between calls. Multiple items compose in equipment order. Mutable fields apply sequentially; cancellation remains cancelled. Synchronous only. Use state guards/cooldowns for recursive damage, extra projectiles, healing and event observers. A function-slot body returns an object containing only supported hook names; do not invent handlers. Read source for details and test actual gameplay paths, not a direct call to a hook.`;}
