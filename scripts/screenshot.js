const { chromium } = require('/home/antonbot/.openclaw/workspace/office/node_modules/playwright');
const fs = require('fs');

(async () => {
 const url = process.argv[2] || 'http://5.45.115.12/office/';
 const outPath = process.argv[3] || '/tmp/scene_screenshot.png';
 const waitMs = Number(process.env.SCREENSHOT_WAIT_MS || 10000);
 
 const browser = await chromium.launch({
 headless: true,
 args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
 });
 
 const page = await browser.newPage();
 await page.setViewportSize({ width: 1280, height: 720 });
 await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
 await page.waitForTimeout(waitMs);
 await page.screenshot({ path: outPath });
 await browser.close();
 
 console.log('OK: ' + outPath);
 console.log('SIZE: ' + fs.statSync(outPath).size);
})().catch(e => { console.error('FAIL: ' + e.message); process.exit(1); });
