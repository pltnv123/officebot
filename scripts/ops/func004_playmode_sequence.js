const { chromium } = require('/home/antonbot/.openclaw/workspace/office/node_modules/playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2] || 'http://5.45.115.12/office/';
  const outDir = process.argv[3] || '/home/antonbot/.openclaw/workspace/office/artefacts/func004/sequence';
  const frames = Number(process.argv[4] || 24);
  const intervalMs = Number(process.argv[5] || 500);

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = [];

  page.on('console', m => logs.push(`[${new Date().toISOString()}] ${m.type()}: ${m.text()}`));

  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(5000);

  for (let i = 0; i < frames; i++) {
    const name = `${String(i).padStart(3, '0')}.png`;
    await page.screenshot({ path: `${outDir}/${name}` });
    await page.waitForTimeout(intervalMs);
  }

  fs.writeFileSync(`${outDir}/console.log`, logs.join('\n'));
  await browser.close();
  console.log(`OK: ${outDir} (${frames} frames)`);
})();
