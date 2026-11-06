# FallRPG — active project: wizard-combat

**[wizard-combat](wizard-combat/)** is the current game: *The Hollow*, a first-person wizard action RPG. Make game changes and run builds there. See its [README](wizard-combat/README.md) for controls and implementation notes.

**[Play FallRPG in your browser](https://ka2le.github.io/FallRPG/)** · [Source on GitHub](https://github.com/ka2le/FallRPG)

The game is designed for desktop browsers with a keyboard, mouse and WebGL. Progress saves in the current browser.

```powershell
cd wizard-combat
npm install
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174/. Run `npm test` and `npm run build` in the same folder.

## Publishing

Pushing changes to `wizard-combat/` on `main` runs the tests, builds the game and publishes `wizard-combat/dist/` to GitHub Pages. The workflow can also be started manually from GitHub Actions. The reference prototypes are kept in source control; only the active game is published. The monster animation preview is available at [bestiary.html](https://ka2le.github.io/FallRPG/bestiary.html).

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
