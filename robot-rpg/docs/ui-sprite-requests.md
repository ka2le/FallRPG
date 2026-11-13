# UI sprite requests (Between Seasons)

The Character screen, loot pop-ups, market gear, tonic button and amber display now use generated pixel item art. Growth, stat and general UI symbols still use the vector fallbacks described below.

## Implemented item art

- `public/assets/items-gear-v1.png`: 64 cells, including a distinct sprite for each of the 50 collectible equipment pieces and 14 future equipment/tool drawings. Frontier rewards each have their own art.
- `public/assets/items-supplies-v1.png`: 64 cells for tonics, food, herbs, foraging, materials, spellcraft, treasure and curios. The health tonic and amber coins are already used by the UI; the remaining supply systems are future work.
- Both sheets are transparent PNGs on exact 8×8 grids. Retain the source sheets intact. `src/item-sprites.js` maps stable IDs to sheet/cell coordinates; the CSS uses nearest-neighbour display.
- `public/assets/items-manifest.json` is the reusable sprite index. Regenerate it with `npm run sprites` after changing the registry.
- `item-library.html` shows all 128 drawings with search, category filters, 32/64/96px previews and individual transparent PNG downloads. It is linked from Character → Equipment.
- Exact built-in image-generation prompts are retained in `docs/art-prompts.json` and `docs/item-art-prompts.json`.

The remaining entries below describe optional standalone replacements for general UI icons and the original item-art brief.

## How to add a sprite

1. Save a transparent PNG to `public/assets/ui/<key>.png`.
2. Add `'<key>'` to `UI_SPRITES` in `src/ui-art.js`.
3. Record the prompt in `docs/art-prompts.json`, as for the other assets.

Keys without a PNG keep the vector fallback, so sprites can arrive one at a time.

## Shared style

- Match the game's existing pixel art: chunky 1-px outlines in dark green-black (#10211a), warm highlights and limited palettes.
- **Item and attribute icons:** 32×32 art, exported at 64×64 with nearest-neighbour scaling. **Stat icons:** 16×16, exported at 32×32.
- Centre the subject and leave about 2 px of padding. Use a transparent background with no frame, because the UI draws the slot frame and glow.
- Light comes from the upper left. Items should read clearly at 40 px on a dark green background (#1f362d).

## Items (`item-<id>`, 32×32)

| Key | Slot | Description |
| --- | --- | --- |
| `item-twig` | Weapon | Apprentice twig: a short, knobbly birch twig with one tiny pale-yellow spark at the tip. Humble. |
| `item-reedstaff` | Weapon | Rowan’s singing reed: a slender green-gold reed staff, with small holes like a flute and a ribbon tied near the top. |
| `item-copperwand` | Weapon | Copperheart wand: a polished dark-wood wand wrapped in copper wire, with a glowing orange heart-shaped stone set in the head. |
| `item-cinderstaff` | Weapon | Cindervein heartwood: a charred black staff with cracks of molten orange light running along it and ember sparks at the crown. |
| `item-crownstaff` | Weapon | The last lantern: a tall ornate staff with a small brass lantern hanging from a hooked crown and a warm white flame. Legendary feel, with a faint gold aura. |
| `item-wraps` | Robe | Travel-worn wraps: a patched beige and brown cloth tunic with a rope belt. |
| `item-briarcoat` | Robe | Briarwarden coat: a forest-green long coat with thorny briar vines stitched along the hem and a bark-brown collar. |
| `item-wintercoat` | Robe | Snowwatch greatcoat: a heavy pale-blue greatcoat with a white fur hood, silver clasps and frost on the shoulders. |
| `item-wayboots` | Boots | Courier’s boots: light tan leather boots with small wing-like flaps at the ankle and a red lace. |
| `item-frostboots` | Boots | Stillwhite pilgrim boots: tall white wool-lined boots with pale-blue frost runes and fur trim. |
| `item-mosscharm` | Charm | Living moss pendant: a round wooden locket overgrown with bright moss and one tiny white flower, on a cord. |
| `item-amberfocus` | Charm | Redleaf sunstone: a teardrop of glowing amber set in a red-leaf metal clasp, with a warm inner sun. |
| `item-eldercharm` | Charm | Heart of the canopy: an emerald seed-shaped gem cradled by golden roots, pulsing with soft green light. |
| `item-relic-weapon` | Weapon | Frontier heartwood: a twisted living-wood staff with a pale glowing knot. Shared by all frontier weapon rewards. |
| `item-relic-robe` | Robe | Frontier mantle: a hooded mantle of layered leaves and grey wool. |
| `item-relic-boots` | Boots | Frontier boots: moss-soled walking boots with bark greaves. |
| `item-relic-charm` | Charm | Frontier keystone: a small carved stone disc with a glowing rune and a leather thong. |

## Empty equipment slots (`slot-<slot>`, 32×32, drawn as a faint silhouette)

`slot-weapon` (staff outline), `slot-robe` (tunic outline), `slot-boots` (boot outline), `slot-charm` (pendant outline). Use one desaturated green-grey (#5d6d55) at about 70% opacity, so the slot clearly reads as empty.

## Growth attributes (`attr-<id>`, 32×32, drawn inside a rotated diamond frame)

| Key | Description |
| --- | --- |
| `attr-power` | Magic power: a golden four-pointed star bursting from an open palm, in warm yellow (#e8c572). |
| `attr-capacity` | Mana capacity: a round glass flask filled with swirling teal aether (#6fb7c6), with a cork stopper. |
| `attr-recovery` | Mana recovery: two curved teal-mint arrows chasing each other around a droplet (#8fd0c7). |

## Stat icons (`stat-<id>`, 16×16)

`stat-health` (red heart), `stat-mana` (teal droplet), `stat-regen` (mint circular arrows), `stat-power` (gold star), `stat-damage` (orange spark/flame), `stat-armor` (sage-green shield), `stat-speed` (lilac winged boot).

## Other

| Key | Size | Description |
| --- | --- | --- |
| `icon-amber` | 16×16 | Amber currency: a small faceted honey-orange gem with a white glint. |

The level gem, level-up rays and memory bar are drawn with CSS and need no sprites. Optional extras, which need a small code hookup: a 96×96 `levelup-crest` (an ornate gold diamond crest with leaves behind the level number) and a pixel-frame 9-slice for panels.
