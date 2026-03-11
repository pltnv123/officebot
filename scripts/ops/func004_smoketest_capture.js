const { chromium } = require('/home/antonbot/.openclaw/workspace/office/node_modules/playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8080/index.html';
const API = 'http://127.0.0.1:8787';
const OUT = '/home/antonbot/.openclaw/workspace/office/artefacts/func004';

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const logLines = [];

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('console', msg => {
    logLines.push(`[console:${msg.type()}] ${msg.text()}`);
  });

  // seed tasks to trigger planner/worker/tester flow
  const seed = async (title) => fetch(`${API}/api/tasks`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  }).then(r => r.text());

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(4000);

  const seedResults = [];
  seedResults.push(await seed('FUNC004 smoke 1'));
  seedResults.push(await seed('FUNC004 smoke 2'));
  seedResults.push(await seed('FUNC004 smoke 3'));

  await page.screenshot({ path: `${OUT}/01_after_seed.png` });
  await sleep(12000);
  await page.screenshot({ path: `${OUT}/02_t12s.png` });
  await sleep(12000);
  await page.screenshot({ path: `${OUT}/03_t24s.png` });

  const state = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/state`);
    return await r.text();
  }, API);

  fs.writeFileSync(`${OUT}/seed_results.json`, JSON.stringify(seedResults, null, 2));
  fs.writeFileSync(`${OUT}/state_snapshot.json`, state);
  fs.writeFileSync(`${OUT}/browser_console.log`, logLines.join('\n'));

  await browser.close();
  console.log('OK artefacts in', OUT);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
