# The Shattered Codex — Feywild Edition

The Feywild, the procedurally generated world of four seasonal courts with eroded valleys, rivers, lava meres, leaf mountains and snowstorms, is the base. The Shattered Codex's quests, spells, levelling, monsters, bosses, loot and villages are layered on top. You move, fly and cast with the Feywild's controls and effects. Codex spells use Feywild fire, rune rings, lightning and fey-step teleports, monsters are lit by the Feywild sky, and the villages are fey cottages set into the landscape.

## Running it

1. Extract the zip.
2. Open **`index.html`** in a desktop browser (Chrome, Edge or Firefox with WebGL2).
3. Choose a graphics preset and a world seed, then click **New Game**. **Continue** resumes your autosave.

No server or install is needed. Everything is generated in the browser. The first load takes a little while (about 10–40 seconds on a normal GPU) while the world is built and the shaders compile. Progress autosaves every 30 seconds, and on pause or close. The save remembers its seed, so Continue rebuilds the same world.

## Controls

| Key | Action |
|---|---|
| **W A S D** | Move (**Shift** to sprint, Space to jump or swim up) |
| **Mouse** | Look. Click the game to capture the mouse. |
| **Left / Right click** | Cast hotbar slot 1 / 2 (hold to keep casting) |
| **1 – 0** | Cast hotbar spells. **3 (or F) toggles Fly**, which you start with for testing. **4** summons a lantern-wisp for the night. |
| **Space / C** | Rise / descend while flying (you steer by looking, Shift soars faster) |
| **E** | Talk, open a chest, or pray at a shrine |
| **Q / R** | Healing / mana potion |
| **I** | Character sheet and inventory |
| **B** | Spellbook |
| **J** | Quest journal |
| **M** | World map |
| **T** (hold) | Fast-forward time, to see sunsets, night and aurora |
| **Esc** | Pause and settings |

## Where things are

The island's north is up on the map. **Brightwater** sits at the Crossing in the centre, where all four seasons meet.

- **Spring Court (north-west):** the Elderwood, the Stormreach and the Barrowlands.
- **Summer Court (north-east):** the Glimmer Lakes, Mirefen and the Blightmarsh.
- **Autumn Court (south-east):** Thornwood, the cinder-dunes around Sunspire, and the Ashlands with their lava meres.
- **Winter Court (south-west):** the Crags, Frosthold, and the Frostfang wastes.

Danger grows with distance from Brightwater. The zone level is shown under the minimap.

## Tips

- Villagers marked **!** have quests. **?** means a quest is ready to turn in. The main quest unlocks Blink, Town Portal, Water Walking, Invisibility, Fly, Beacon, Meteor and Starfall. Fly is already in your book, so you can explore right away.
- Each level gives 1 attribute point, or 2 every fifth level. At some levels a pulsing **Learn spell** button appears. Open it, or the spellbook (B), when you're out of danger.
- Elites (gold ring) and bosses (red ring) always drop good loot. Uniques change how spells work.
- Combos: Frost Nova then Ice Lance deals triple damage to frozen enemies. Fireball or Firebolt then Combust. Hex makes enemies take 30% more damage.
- Lava burns if you wade in it. Water Walking greatly reduces the burn, and frozen winter lakes can be walked on. Giant toadstool caps in the Summer Court are bouncy.
- Each shrine grants a permanent +1 to one attribute, once. Chests are scattered across the wilds.
- If the game runs slowly, pick **Low** or **Medium** on the title screen, or set View distance to Near in the Esc menu.

## For developers

`source/` contains the unbundled code. `src/codex/` holds the Shattered Codex gameplay modules (player, spells, entities, quests, UI, items, art), adapted to the Feywild world through `worldAdapter.js`. `src/world/` and `src/render/` hold the Feywild terrain generator and renderer. Build with:

```
npm install
npx esbuild src/main.js --bundle --format=iife --outfile=game.js
```

### Distance rendering

- **Trees:** full-detail meshes near the player, then hemi-octahedral **impostors** (`src/render/impostors.js`) baked at load from 8×8 view directions into mip-mapped texture arrays. They're lit per pixel with the normal Feywild lighting, drawn for the whole world in one GPU-driven call, and dither cross-faded where the near meshes fade out. Near trees are culled per tree through a spatial grid. Off-screen trees and blob proxies still cast sun shadows but are never drawn in the main pass.
- **Grass, flowers and litter** (`src/render/groundCover.js`): frustum-culled instanced tiles in concentric LOD rings. Blades are never allowed to get thinner than about a pixel. When they would, they're widened and thinned out to match, so the total coverage stays the same. With distance, blade colours converge on the field average, and the terrain paints that same average (`GRASS_GLSL`), so the meadow carries on smoothly past the last blade.
- **Terrain:** the far wildflower specks are filtered to their average value, which stops the mid-distance shimmer. Beyond 240 m the terrain uses one texture tap per layer instead of two.
