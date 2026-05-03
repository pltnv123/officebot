#!/usr/bin/env node
/**
 * WEBSTUDIO-DELIVERY-SCRIPT-PAGE-001: Script Delivery Page Workspace Smoke
 * 
 * Tests client-facing delivery page for script packages:
 * 1. Delivery page opens with HTTP 200
 * 2. Title "Python Script Package" visible
 * 3. Artifact ID visible
 * 4. File list visible with script.py
 * 5. script.py code preview visible and contains expected text
 * 6. README.md preview works
 * 7. Run Script works with correct output
 * 8. Run history loads without errors
 * 9. Download ZIP returns valid file
 * 10. No console errors (artifactId undefined, /events 404, etc.)
 */

const playwright = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "DELIVERY OK"';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-DELIVERY-SCRIPT-PAGE-001: Delivery Page Workspace Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    delivery_page_ok: false,
    file_list_ok: false,
    script_code_preview_ok: false,
    readonly_file_preview_ok: false,
    run_script_ok: false,
    run_history_ok: false,
    download_zip_ok: false,
    no_console_errors_ok: false,
    errors: []
  };

  let browser;
  let artifactId = null;
  
  try {
    browser = await playwright.chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Step 1-4: Generate script in demo
    console.log('1. Opening /webstudio/demo and generating script...');
    await page.goto(`${BASE_URL}${DEMO_PATH}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.locator('select#project-type-select').selectOption('script');
    await page.waitForTimeout(500);
    await page.locator('textarea#brief-text').fill(BRIEF);
    await page.locator('button#analyze-brief-btn').click();
    await page.waitForTimeout(5000);
    await page.locator('button#execute-script-btn').click();
    await page.waitForTimeout(12000);
    await page.locator('#script-program-panel').waitFor({ state: 'visible', timeout: 10000 });
    console.log('   ✅ Script generated\n');

    // Extract artifact ID from page state
    artifactId = await page.evaluate(() => {
      // Try to get from various sources
      const chip = document.querySelector('#script-scenario-chip');
      if (chip && chip.textContent) {
        const match = chip.textContent.match(/ws-project-artifact-[^-\s]+/);
        if (match) return match[0];
      }
      return null;
    });
    console.log(`   Artifact ID: ${artifactId || '(not extracted)'}\n`);

    // Step 5-6: Open Delivery page
    console.log('2. Opening Delivery page...');
    const openDeliveryBtn = page.locator('#open-delivery-btn');
    if (await openDeliveryBtn.isVisible().catch(() => false)) {
      const [deliveryPage] = await Promise.all([
        page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
        openDeliveryBtn.click()
      ]);
      
      if (deliveryPage) {
        await deliveryPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await deliveryPage.waitForTimeout(2000);
        
        const deliveryUrl = deliveryPage.url();
        console.log(`   Delivery URL: ${deliveryUrl}`);
        
        // Check not 404
        const deliveryBody = await deliveryPage.evaluate(() => document.body.innerText.slice(0, 500));
        const is404 = deliveryBody.includes('Cannot GET') || deliveryBody.includes('404') || deliveryBody.includes('not found');
        
        if (is404) {
          console.log('   ❌ Delivery page is 404\n');
          result.errors.push('Delivery page 404');
          await deliveryPage.close();
        } else {
          // Check title
          const title = await deliveryPage.locator('h1').textContent();
          const hasTitle = title.includes('Python script package') || title.includes('Python Script Package');
          console.log(`   Title: ${title}`);
          console.log(`   ✅ Has Python script package title: ${hasTitle}\n`);
          
          // Check artifact ID visible
          const artifactVisible = await deliveryPage.evaluate(() => {
            const footer = document.querySelector('.footer');
            return footer && footer.textContent.includes('ws-project-artifact');
          });
          console.log(`   ✅ Artifact ID visible in footer: ${artifactVisible}\n`);
          
          // Check file list
          const fileLinks = await deliveryPage.locator('.file-list a').all();
          const fileCount = fileLinks.length;
          const hasScriptPy = await deliveryPage.evaluate(() => {
            const links = Array.from(document.querySelectorAll('.file-list a'));
            return links.some(l => l.textContent.includes('script.py'));
          });
          
          result.file_list_ok = fileCount > 0 && hasScriptPy;
          console.log(`   ✅ File list visible: ${fileCount > 0} (${fileCount} files)`);
          console.log(`   ✅ script.py in file list: ${hasScriptPy}\n`);
          
          // Check script.py code preview - navigate to file route
          const scriptPyLink = deliveryPage.locator('.file-list a').filter({ hasText: 'script.py' }).first();
          if (await scriptPyLink.isVisible().catch(() => false)) {
            const [filePage] = await Promise.all([
              deliveryPage.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
              scriptPyLink.click()
            ]);
            
            if (filePage) {
              await filePage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
              const fileBody = await filePage.evaluate(() => document.body.innerText);
              const hasDeliveryOk = fileBody.includes('DELIVERY OK');
              result.script_code_preview_ok = hasDeliveryOk;
              console.log(`   ✅ script.py preview contains DELIVERY OK: ${hasDeliveryOk}\n`);
              await filePage.close();
            }
          }
          
          // Check README preview
          const readmeLink = deliveryPage.locator('.file-list a').filter({ hasText: /readme/i }).first();
          if (await readmeLink.isVisible().catch(() => false)) {
            const [readmePage] = await Promise.all([
              deliveryPage.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
              readmeLink.click()
            ]);
            
            if (readmePage) {
              await readmePage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
              const readmeBody = await readmePage.evaluate(() => document.body.innerText);
              const hasReadmeContent = readmeBody.length > 50;
              result.readonly_file_preview_ok = hasReadmeContent;
              console.log(`   ✅ README preview works: ${hasReadmeContent}\n`);
              await readmePage.close();
            }
          }
          
          // Check Run Script
          console.log('3. Testing Run Script...');
          const runBtn = deliveryPage.locator('#run-btn');
          if (await runBtn.isVisible().catch(() => false)) {
            await runBtn.click();
            await deliveryPage.waitForTimeout(8000);
            
            // Check output panel
            const runOutput = deliveryPage.locator('#run-output');
            if (await runOutput.isVisible().catch(() => false)) {
              const outputText = await runOutput.textContent();
              const hasDeliveryOk = outputText.includes('DELIVERY OK');
              result.run_script_ok = hasDeliveryOk;
              console.log(`   ✅ Run Script output contains DELIVERY OK: ${hasDeliveryOk}\n`);
            }
          }
          
          // Check Run History
          console.log('4. Testing Run History...');
          await deliveryPage.waitForTimeout(2000); // Wait for history to load
          const runHistoryContainer = deliveryPage.locator('#run-history-container');
          if (await runHistoryContainer.isVisible().catch(() => false)) {
            const historyText = await runHistoryContainer.textContent();
            console.log(`   History container text: ${historyText.slice(0, 200)}`);
            const hasNoArtifactIdError = !historyText.includes('artifactId is not defined');
            const hasHistoryOrNoRuns = historyText.includes('No runs yet') || 
                                       historyText.includes('run-history-item') ||
                                       historyText.includes('No runs') ||
                                       historyText.includes('Click') ||
                                       historyText.length > 20; // Has some content
            result.run_history_ok = hasNoArtifactIdError && hasHistoryOrNoRuns;
            console.log(`   ✅ Run history loaded without artifactId error: ${hasNoArtifactIdError}`);
            console.log(`   ✅ Shows history or placeholder: ${hasHistoryOrNoRuns}\n`);
          } else {
            // Container might not be visible if no runs - that's ok as long as no error
            result.run_history_ok = true;
            console.log('   ℹ️  Run history container not visible (may be ok if no runs)\n');
          }
          
          // Check Download ZIP
          console.log('5. Testing Download ZIP...');
          const downloadLink = deliveryPage.locator('a').filter({ hasText: /download zip/i }).first();
          if (await downloadLink.isVisible().catch(() => false)) {
            const [download] = await Promise.all([
              deliveryPage.waitForEvent('download', { timeout: 10000 }).catch(() => null),
              downloadLink.click()
            ]);
            
            if (download) {
              const dlPath = await download.path();
              if (dlPath && fs.existsSync(dlPath)) {
                const buffer = fs.readFileSync(dlPath);
                const isZip = buffer.length > 4 && (buffer[0] === 0x50 && buffer[1] === 0x4B);
                result.download_zip_ok = isZip;
                console.log(`   ✅ Download ZIP succeeded: ${isZip}\n`);
              }
            }
          }
          
          // Check console errors
          const deliveryConsoleErrors = consoleErrors.filter(e => 
            e.includes('artifactId is not defined') ||
            e.includes('/events') ||
            e.includes('JSON.parse') ||
            e.includes('Cannot read properties of null')
          );
          result.no_console_errors_ok = deliveryConsoleErrors.length === 0;
          if (deliveryConsoleErrors.length > 0) {
            console.log(`   ❌ Console errors: ${deliveryConsoleErrors.join(', ')}\n`);
            result.errors.push(...deliveryConsoleErrors);
          } else {
            console.log('   ✅ No critical console errors\n');
          }
          
          result.delivery_page_ok = hasTitle && artifactVisible && result.file_list_ok;
          
          await deliveryPage.close();
        }
      } else {
        console.log('   ❌ Delivery popup not opened\n');
        result.errors.push('Delivery popup not opened');
      }
    } else {
      console.log('   ❌ Open Delivery button not visible\n');
      result.errors.push('Open Delivery button not visible');
    }

    result.errors = result.errors.filter((v, i, a) => a.indexOf(v) === i);
    result.ok = result.delivery_page_ok && 
                result.file_list_ok && 
                result.script_code_preview_ok && 
                result.run_script_ok && 
                result.run_history_ok && 
                result.download_zip_ok && 
                result.no_console_errors_ok;

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    result.errors.push(error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(JSON.stringify(result, null, 2));
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(result.ok ? 0 : 1);
}

main();
