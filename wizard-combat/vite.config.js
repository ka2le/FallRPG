import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  // Relative asset URLs work both locally and under GitHub Pages' /FallRPG/ path.
  base: './',
  build: {
    rollupOptions: {
      input: {
        game: fileURLToPath(new URL('./index.html', import.meta.url)),
        bestiary: fileURLToPath(new URL('./bestiary.html', import.meta.url)),
      },
    },
  },
});
