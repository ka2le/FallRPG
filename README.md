# FallRPG — two ways into The Hollow

The [game picker](https://ka2le.github.io/FallRPG/) opens either independent game:

- **[Feywild Journey — 3D](https://ka2le.github.io/FallRPG/wizard-combat/)**: a first-person wizard action RPG. Source and controls: [wizard-combat](wizard-combat/).
- **[Between Seasons — pixel art](https://ka2le.github.io/FallRPG/hollow-pixel/)**: a top-down RPG with villagers, living habitats and tactical spells. Source and controls: [hollow-pixel](hollow-pixel/).

Both games have a **Choose another game** link in their pause menu. Each uses a separate browser save key; moving the 3D game into its own URL preserves existing saves on the same origin.

Use the small **Fullscreen** button at the top right of the picker, in the 3D game's **Settings (T)**, or in the pixel game's **pause menu**. It switches to **Exit fullscreen** while active; browsers without fullscreen support show it disabled.

**[Play FallRPG in your browser](https://ka2le.github.io/FallRPG/)** · [Source on GitHub](https://github.com/ka2le/FallRPG)

Both games support desktop and touch controls. The 3D game uses an invisible movement joystick in the bottom third and swipe-to-look above; the pixel game uses a hold-and-drag joystick anywhere, taps for interaction, and pinch zoom. The 3D game requires WebGL. Progress saves in the current browser.

```powershell
cd wizard-combat
npm install
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174/. Run `npm test` and `npm run build` in the same folder.

## Publishing

Pushing changes to either game, `game-picker/`, `scripts/`, or the Pages workflow on `main` runs both gameplay test suites, builds both games and publishes the assembled `dist/` directory to GitHub Pages. The workflow can also be started manually from GitHub Actions. Reference prototypes stay in source control. The old [bestiary.html](https://ka2le.github.io/FallRPG/bestiary.html) URL redirects to the 3D game's preview.

To assemble the same static site locally, run `npm ci`, `npm test`, and `npm run build` in each game's directory, then run `node scripts/build-site.mjs` from the repository root. Serve `dist/` with any static HTTP server. `game-picker/index.html` is the shared landing page; the games live in `dist/wizard-combat/` and `dist/hollow-pixel/`.

After installing Chromium with `npx playwright install chromium --only-shell` in `hollow-pixel/`, run `node scripts/check-site.mjs` from the root. It uses port 5174 to check production startup, asset paths, return links, the narrow picker layout and the legacy bestiary redirect under `/FallRPG/`. The 3D animation loop is suspended during this routing check. Publishing runs this check before uploading the site.

Builds use relative asset URLs so the game works under the repository's `/FallRPG/` address and on a local static server. Local dependencies, builds, screenshots, design exports and temporary backups are ignored by Git.

## Reference prototypes

These are older examples to learn from, not alternate versions of the active game:

| Folder | Purpose |
| --- | --- |
| `ShatteredCodex-Feywild (1)/` | Visual reference: procedural landscape materials, seasonal world, flora and rendering techniques. |
| `shattered-codex-rpg (2)/` | Design reference: equipment slots, quests, monsters and utility spells. |

Keep reference originals intact. Adapt useful ideas and assets into `wizard-combat`; the current game's combat, progression and performance requirements decide how they are used.

## Exploration tools

In the active game, open **Settings (T) → Testing mode**. **G** toggles flight, **WASD** moves, **Space / Ctrl** ascends / descends, and **Shift** accelerates. Ground running and flight are much faster while testing. Switching flight off lands on the surface below. Testing mode resets when the page reloads; game progress still saves normally.
