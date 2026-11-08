import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Assets must resolve inside /FallRPG/hollow-pixel/ on GitHub Pages.
  base: './',
  build:{rollupOptions:{input:{game:fileURLToPath(new URL('./index.html',import.meta.url)),items:fileURLToPath(new URL('./item-library.html',import.meta.url))}}},
});
