# The Forge

Cinder, a living lava smith, works at the portal shrine southeast of Willowmere's market, at **1264, 1006**. Click the smith or shrine, or walk close and press Space. The pause menu also opens **The Forge** during this experiment. The world pauses while the workbench is open.

Choose any of the 128 existing item drawings, an item type, a name, description, and numeric bonuses. The item type determines its compatible equipment slots when worn; shields and bucklers use **Shield** and equip in the off hand. Percent fields use **100 = +100%**; mana and health recovery use units per second. All creations are free, available at level one, and have no stat budget. Forged protection and cooldown bonuses bypass ordinary gear caps, up to full immunity and zero cooldown. Ordinary gear retains its existing limits.

**Forge to pack** creates the item without equipping it. Equip it from inventory when you are ready. Forged items have an **Edit at Forge** action in their inventory tooltip; forging an edited item updates that same item and returns it to the pack. Health percentage stays constant when equipping or removing health bonuses. Items, drawings, stats and function source survive the normal game save/reload cycle. Drafts and chat are kept for the current page session. Use **New draft** to start another item.

## Talking to Cinder

The chat creates an editable draft; it does not spend gold, create items or equip anything until you press a Forge button. You can adjust every proposed field. If you edit the draft while the smith is thinking, his answer is held as a suggestion you can explicitly apply.

Examples:

- “Make a crown with extreme mana regeneration.” Uses the existing `regen` stat.
- “Make me a ring that makes me immune to Ventbacks.” Generates a function that checks the attacking species in `onDamage`.
- “Give this ring mana whenever I defeat an enemy.” Can use `onKill` with the live player object.

### Local Codex, the default

Run `npm run dev` and use the game at `http://127.0.0.1:5175`. Vite includes the Forge bridge at `/api/forge`. Install/sign in to the native Codex CLI (`codex login`) using the same account setup as VSAutocomplete. `FORGE_CODEX_PATH` can point to an absolute native executable if discovery fails.

The connection uses VSAutocomplete's native CLI JSON transport and the signed-in ChatGPT account. Every model call uses **`gpt-6-luna` with medium reasoning**, with no model fallback. Fresh ephemeral read-only calls receive the complete current game source as context. Shell, networking, plugins and child agents are disabled for generation. Source is supplied directly so this works on hosts that block shell tools. The application owns the multi-step generation/testing workflow below. It returns item data and JavaScript text; it does not patch repository files. Individual local calls time out after three minutes; the full workflow can be cancelled and has an eight-minute limit.

For the GitHub Pages game, either use API mode below or run the loopback bridge:

```powershell
$env:FORGE_ALLOWED_ORIGIN = 'https://ka2le.github.io'
npm run forge:bridge
```

The standalone bridge binds only `127.0.0.1:5176`. In Forge → Settings leave **Local Codex** selected and use `http://127.0.0.1:5176`. Your browser may require local-network permission. `FORGE_ALLOWED_ORIGIN` accepts comma-separated exact origins for other hosted locations; unknown origins are rejected. `FORGE_PORT` can change the bridge port.

### OpenAI API key on a static page

In Forge → Settings select **OpenAI API key** and enter your personal key. The key stays only in memory until the page closes; it is excluded from game saves and local storage. This mode calls the Responses API directly and uses your API billing. Never embed a shared key in the static site.

The production build includes a lazily loaded snapshot of the complete game source. Luna can request individual files with `read_game_source` while developing an item. Rebuild the site after source changes to refresh this snapshot. The normal workbench needs neither a bridge nor an API key.

## Agent harness

Both connection modes use the same generation loop:

1. Luna translates the request into an intent description, a required canonical `itemType`, explicitly permitted stat changes, and executable behavior tests **before writing the item**. An explicit requested kind overrides the old/default draft type; a ring that grants a magical shield remains a ring. Requests that only refine powers retain the current type and selected look. The harness first runs the plan against a blank item: positive tests must fail assertions and negative checks must pass. Invalid fixtures/API assumptions go back for correction before any candidate is written.
2. Luna writes the draft using the real API reference and source files. The harness rejects a `draft.slot` that differs from the locked `itemType` before simulation, even when the name, drawing and effects look right. The final intent review also checks the planned type against the original request.
3. A disposable browser worker creates fresh instances of the actual `Game` and `ForgeRuntime`, equips the candidate, and runs the tests. The live character, save and API key are never passed to that worker.
4. The harness also checks hook errors, finite vitals, unexpected health loss, hit/damage/kill/cast paths, saving/loading, and unequipping. Positive tests must fail with a blank item, preventing empty tests from proving success.
5. Exact failures and game-state snapshots go back to Luna. It gets up to three implementation attempts while the original tests remain fixed.
6. A separate Luna review compares the original request, candidate, tests and executed evidence. Only a candidate that passes execution and intent review becomes an editable draft. Failure leaves the current draft unchanged.

Each simulation has a four-second worker limit and cancellation terminates it. Ordinary network/timer APIs are disabled in the worker. This provides execution isolation and a bounded preflight, not a proof that arbitrary future code is safe or correct under every possible game state. Actual equipped functions retain the experimental full-game access described below.

The implementation is in `src/forge-agent.js`, `src/forge-simulator.js`, and `src/forge-simulation-*.js`. Test scripts use `makeGame`, `equip`, `tick` and `assert` against the real engine. Fixtures can specify player/creature state, scenery and world interactions. Ordinary actor AI is paused in fixtures by default to keep target boundaries and passive recovery controlled; opt into `actorAI:true` when testing pursuit or attacks. Item hooks, statuses, projectiles, collision and player movement use the actual engine. Tests can exercise novel combinations rather than being restricted to named presets.

The authoritative hook/method reference is **`src/forge-api.js`**, shared with the agent prompt. `tests/forge-capabilities.test.js` exercises thirty effect families through this same simulator: conditional stats, critical/execute damage, immunity, damage-to-mana, wards, healing, tonic modifiers, free spells, empowered sparks, spell radius/summons, cast procs, movement, teleport visuals, projectiles, reward modifiers, last stands, discoveries, gathering, roots, knockback, chain hits and timed stacks.

## Function contract

The function slot contains a synchronous JavaScript **function body** that returns an object of hooks. Code runs directly in the browser with full game access: this is an experimental extension point, **not a sandbox**. Only equip code you trust. Catchable exceptions disable that item's function and show a notice. Arbitrary loops and global side effects cannot be contained by this runtime.

```js
return {
  onDamage(ctx) {
    if (ctx.source?.type === 'ventback') ctx.cancel = true;
  }
};
```

All hooks receive `{game, player, item, state, ...event}`. Normal method hooks also bind `this` to that same context, so `this.state` works; arrow functions should destructure the argument. `state` belongs to that equipped instance; it resets on unequip/reload. Hook state is not serialized. Persistent item definitions and code are serialized.

| Hook | Event fields | Purpose |
| --- | --- | --- |
| `onEquip` | — | Initialize the effect; capture temporary values in `state`. |
| `onUnequip` | — | Undo any temporary modifications. |
| `onUpdate` | `dt` in seconds | Per simulation step, after pausing is checked. |
| `onDamage` | `amount`, `source`, `cancel` | Before armor/ward; change `ctx.amount` or set `ctx.cancel = true`. Returning `false` also cancels. |
| `onHit` | `target`, `damage` | After a player/companion attack damages a creature. |
| `onKill` | `target` | After a creature dies and grants the normal rewards. |
| `onCast` | `spell` ID | After a spell or spark is cast. |
| `onStats` | `stats` | Pure modifier of derived stats. No side effects or recursive stat queries. |
| `onSpell` | `spell`, `values` | Pure modifier of actual spell cost, cooldown, damage, radius, healing, shield and duration. |
| `onBeforeHit` | `target`, `damage`, `color`, `cancel` | Modify/cancel outgoing damage before it lands. |
| `onDamaged` | `source`, `amount`, `absorbed` | React to actual lost HP and consumed ward. |
| `onBeforeHeal` | `amount`, `source`, `cancel` | Modify healing before its capacity cap. |
| `onHeal` | `amount`, `source` | React to actual health restored. |
| `onBeforeMove` | `dx`, `dy`, `speed`, `dt`, `running`, `cancel` | Modify movement while preserving normal collision. |
| `onMove` | `from`, `to`, `distance`, `dt`, `running`, `teleport` | React to actual distance travelled. |
| `onProjectile` | `projectile`, `cancel` | Modify or absorb friendly/enemy projectiles. |
| `onBeforeReward` | `xp`, `coins`, `source`, `cancel` | Modify/cancel rewards. |
| `onReward` | `xp`, `coins`, `source` | React to actual rewards. |
| `onBeforeDeath` | `source`, `health`, `cancel` | Prevent lethal damage/respawn, optionally using state for charges/cooldowns. |
| `onEvent` | `event` | Observe ordinary game events such as discoveries, gathering, quests and respawning. |

Damage sources are the actual melee attacker, the original enemy projectile attacker, an attacking tree, or `null`. Hooks must tolerate missing sources. Use `game.nearbyCreatures(radius)` for all living creatures in range (or `{hostileOnly:true}` for hostiles), and `game.killCreature(target)` for an instant kill through normal reward handling. `game.creatures` never includes the player. The **Death aura** preset demonstrates this without an aggro filter. Use `game.effect`, `game.floater`, `game.hurt`, `game.creatures`, and other existing APIs after inspecting their source. Imports, async hooks and top-level side effects are unsupported. Numeric attributes should use stats rather than code. Function effects should restore any temporary game modifications in `onUnequip`.

General helpers include `healPlayer`, `restoreMana`, `applyStatus`, `knockback`, `teleportPlayer`, `launchProjectile`, `nearbyInteractables`, `gatherHerb`, and `grantReward`. They go through the real game paths and compose with other item hooks. Per-item reentrancy guards suppress direct recursive calls to the same hook; use explicit state guards when designing chains or multiple interacting effects. Pure `onStats`/`onSpell` modifiers need no cleanup: they stop when the item is removed. Imperative temporary mutations need explicit cleanup.

## Assets and validation

`public/assets/forge-v1.png` contains four portal animation frames and four smith poses in a transparent 4×2 sheet. World animation uses shared frame bounds to keep the smith's body stable when his hammer rises. The exact built-in imagegen prompt is recorded in `docs/art-prompts.json`.

Run `npm test`, `npm run build`, and `npm run test:browser`. Forge tests cover free stats, saves, actual damage immunity, lifecycle hooks, error containment, CLI configuration, bridge origins, all drawings, chat drafts, keyboard input and mobile layout.

With the development server running, `npm run forge:validate-agent` exercises the actual local Luna connection in its own browser. It checks item identity (a selected shield with a stale Ring type, a crown, a ring that strengthens a magic shield, and an unnamed refinement of existing boots), plus four novel effects: a proximity execution aura, a free/doubled Ward ring, boots that heal by distance walked, and gloves that pay amber per outgoing hit. Each result must pass an additional independently written gameplay check, and the live character snapshot must remain unchanged. Reports are saved under `artifacts/forge-agent-*.json`. Pass a case name to repeat one scenario, or `npm run forge:validate-agent -- identity` to run the four identity checks.

Connection references: [Codex CLI](https://developers.openai.com/codex/cli/reference), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Responses API](https://developers.openai.com/api/docs/guides/text).
