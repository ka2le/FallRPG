import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
// Only remove this repository's generated publishing directory.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('game-picker/index.html', root), new URL('index.html', output));
await cp(new URL('game-picker/fullscreen.js', root), new URL('fullscreen.js', output));
for (const game of ['wizard-combat', 'hollow-pixel', 'robot-rpg']) {
  await cp(new URL(`${game}/dist/`, root), new URL(`${game}/`, output), { recursive: true });
}

// Keep the previously published bestiary URL working, including filters/fragments.
await writeFile(new URL('bestiary.html', output), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./wizard-combat/bestiary.html"><title>Bestiary</title></head>
<body><a href="./wizard-combat/bestiary.html">Open the bestiary</a><script>location.replace('./wizard-combat/bestiary.html'+location.search+location.hash)</script></body></html>`);

// Fail the build before upload if any game or the picker is missing.
for (const page of ['index.html', 'wizard-combat/index.html', 'wizard-combat/bestiary.html', 'hollow-pixel/index.html', 'robot-rpg/index.html']) {
  if (!(await readFile(new URL(page, output), 'utf8')).includes('<html')) throw new Error(`Invalid page: ${page}`);
}
console.log(`All three games and picker assembled in ${fileURLToPath(output)}`);
