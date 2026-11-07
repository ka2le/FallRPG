import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../hollow-pixel/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const root = new URL('../dist/', import.meta.url);
const prefix = '/FallRPG/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
// Serve only the repository subpath, so accidental origin-root asset URLs fail.
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) throw new Error('Outside site');
    const file = new URL(pathname.slice(prefix.length) + (pathname.endsWith('/') ? 'index.html' : ''), root);
    if (!file.href.startsWith(root.href)) throw new Error('Outside site');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[file.pathname.slice(file.pathname.lastIndexOf('.'))] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
const port = Number(process.env.SITE_CHECK_PORT || 5174);
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // Check the 3D game's startup and navigation without running its continuous
  // GPU loop on software-rendered CI browsers. Gameplay has its own test suite.
  await page.addInitScript(() => {
    if (location.pathname.endsWith('/wizard-combat/')) window.requestAnimationFrame = () => 0;
  });
  const errors = [];
  page.on('console', message => { if(message.type()==='error') console.error('Console:',message.text()); });
  page.on('requestfailed', request => console.error('Request failed:',request.url(),request.failure()));
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
  const base = `http://127.0.0.1:${port}/FallRPG/`;
  async function checkFullscreen() {
    const enter = page.getByRole('button', { name: 'Enter fullscreen', exact: true });
    await enter.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.fullscreenElement === document.documentElement, null, { polling: 100 });
    const exit = page.getByRole('button', { name: 'Exit fullscreen', exact: true });
    assert.equal(await exit.getAttribute('aria-pressed'), 'true');
    await exit.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.fullscreenElement, null, { polling: 100 });
    assert.equal(await enter.getAttribute('aria-pressed'), 'false');
  }
  const screenshots = new URL('../hollow-pixel/artifacts/', import.meta.url);
  await mkdir(screenshots, { recursive: true });
  await page.goto(base);
  assert.equal(await page.locator('.games a').count(), 2);
  await checkFullscreen();
  // Browser-driven exits also have to restore the button's state.
  await page.getByRole('button', { name: 'Enter fullscreen' }).click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.evaluate(() => document.exitFullscreen());
  await page.getByRole('button', { name: 'Enter fullscreen' }).waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('game-picker.png', screenshots)) });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: fileURLToPath(new URL('game-picker-mobile.png', screenshots)) });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('a[href="./wizard-combat/"]').click();
  await page.locator('#entry .game-picker-link').waitFor();
  await page.waitForFunction(() => !!document.querySelector('#world').dataset.engine && typeof window.hollowSnapshot === 'function', null, { polling: 100 });
  console.log('3D initialized');
  await page.keyboard.press('t');
  await checkFullscreen();
  await page.locator('#lab [data-close]').evaluate(button => button.click());
  // Activate the ordinary anchor without frame-based actionability checks.
  await page.locator('#pause .game-picker-link').evaluate(link => link.click());
  await page.waitForURL(base);
  assert.equal(page.url(), base);
  console.log('3D return passed');
  await page.locator('a[href="./hollow-pixel/"]').click();
  await page.locator('#loading.hidden').waitFor({ state: 'attached', timeout: 30000 });
  console.log('Pixel initialized');
  await page.screenshot({ path: fileURLToPath(new URL('game-picker-pixel.png', screenshots)) });
  await page.keyboard.press('Escape');
  await checkFullscreen();
  // Reopening the dynamically rendered pause menu while fullscreen keeps its label.
  await page.getByRole('button', { name: 'Enter fullscreen' }).click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Pause menu', exact: true }).click();
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await page.waitForFunction(() => !document.fullscreenElement);
  const back = page.getByRole('link', { name: 'Choose another game' });
  await back.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(base);
  await page.goto(`${base}bestiary.html?preview=1#seedling`);
  await page.waitForURL(`${base}wizard-combat/bestiary.html?preview=1#seedling`);
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`);
  console.log('PASS: fullscreen entry/exit on all three screens, picker, narrow layout, both production games, keyboard return, assets and legacy bestiary redirect under /FallRPG/.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
