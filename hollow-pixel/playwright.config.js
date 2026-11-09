import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:['browser.spec.js','item-equipment.spec.js','quests.spec.js','menus.spec.js','forge.spec.js'],fullyParallel:false,workers:1,
  timeout:30000,use:{baseURL:'http://127.0.0.1:5175',viewport:{width:1440,height:900},headless:true,screenshot:'only-on-failure',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined}},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5175',reuseExistingServer:true},
});
