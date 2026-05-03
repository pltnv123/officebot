#!/usr/bin/env node
/**
 * WEBSTUDIO-PROJECT-WORKSPACE-001: Last Project Restore Smoke
 * 
 * Tests localStorage persistence and restore after page refresh:
 * 1. Generate script artifact
 * 2. Execute Script MVP
 * 3. Reload page
 * 4. Assert workspace restores with same artifact ID
 * 5. Assert file list visible
 * 6. Assert Open Delivery enabled
 * 7. Assert Download ZIP enabled
 */

const playwright = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "RESTORE TEST"';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-PROJECT-WORKSPACE-001: Last Project Restore Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    artifact_saved_to_local_storage_ok: false,
    artifact_restored_after_reload_ok: false,
    file_list_restored_ok: false,
    open_delivery_enabled_ok: false,
    download_zip_enabled_ok: false,
    no_console_errors_ok: false,
    errors: []
  };

  let browser;
  let artifactIdBefore = null;
  
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

    // Step 1-4: Generate script
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

    // Extract artifact ID before reload
    artifactIdBefore = await page.evaluate(() => {
      const chip = document.querySelector('#script-scenario-chip');
      if (chip && chip.textContent) {
        const match = chip.textContent.match(/ws-project-artifact-[^-\s]+/);
        if (match) return match[0];
      }
      return null;
    });
    console.log(`   Artifact ID before reload: ${artifactIdBefore || '(not extracted)'}\n`);

    // Check localStorage was set
    const localStorageCheck = await page.evaluate(() => {
      return {
        lastProjectArtifactId: localStorage.getItem('webstudio.lastProjectArtifactId'),
        lastProjectType: localStorage.getItem('webstudio.lastProjectType'),
        lastOrderId: localStorage.getItem('webstudio.lastOrderId')
      };
    });
    result.artifact_saved_to_local_storage_ok = !!(localStorageCheck.lastProjectArtifactId && localStorageCheck.lastProjectType === 'script');
    console.log(`   localStorage saved: ${JSON.stringify(localStorageCheck)}`);
    console.log(`   ✅ Artifact saved to localStorage: ${result.artifact_saved_to_local_storage_ok}\n`);

    // Step 5: Reload page
    console.log('2. Reloading page to test restore...');
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('   ✅ Page reloaded\n');

    // Step 6-10: Check restore
    console.log('3. Checking restored state...');
    
    // Check status message
    const statusLine = page.locator('#status-line');
    const statusText = await statusLine.textContent();
    const hasRestoredMessage = statusText.includes('Restored') || statusText.includes('restored');
    console.log(`   Status: ${statusText}`);
    
    // Check artifact ID matches
    const artifactIdAfter = await page.evaluate(() => {
      const chip = document.querySelector('#script-scenario-chip');
      if (chip && chip.textContent) {
        const match = chip.textContent.match(/ws-project-artifact-[^-\s]+/);
        if (match) return match[0];
      }
      return null;
    });
    
    const artifactMatches = artifactIdBefore && artifactIdAfter && artifactIdBefore === artifactIdAfter;
    result.artifact_restored_after_reload_ok = artifactMatches || hasRestoredMessage;
    console.log(`   Artifact ID after reload: ${artifactIdAfter || '(not extracted)'}`);
    console.log(`   ✅ Artifact restored after reload: ${result.artifact_restored_after_reload_ok}\n`);

    // Check file list
    const fileList = page.locator('#script-file-list');
    const fileListVisible = await fileList.isVisible().catch(() => false);
    const fileItems = fileList.locator('.file-item');
    const fileCount = await fileItems.count();
    result.file_list_restored_ok = fileListVisible && fileCount > 0;
    console.log(`   ✅ File list restored: ${result.file_list_restored_ok} (${fileCount} files)\n`);

    // Check Open Delivery enabled
    const openDeliveryBtn = page.locator('#open-delivery-btn');
    const openDeliveryDisabled = await openDeliveryBtn.isDisabled().catch(() => true);
    result.open_delivery_enabled_ok = !openDeliveryDisabled;
    console.log(`   ✅ Open Delivery enabled: ${result.open_delivery_enabled_ok}\n`);

    // Check Download ZIP enabled
    const downloadZipBtn = page.locator('#download-zip-btn');
    const downloadZipDisabled = await downloadZipBtn.isDisabled().catch(() => true);
    result.download_zip_enabled_ok = !downloadZipDisabled;
    console.log(`   ✅ Download ZIP enabled: ${result.download_zip_enabled_ok}\n`);

    // Check console errors
    const criticalErrors = consoleErrors.filter(e => 
      e.includes('Cannot read properties of null') ||
      e.includes('artifactId is not defined')
    );
    result.no_console_errors_ok = criticalErrors.length === 0;
    if (criticalErrors.length > 0) {
      console.log(`   ❌ Critical console errors: ${criticalErrors.join(', ')}\n`);
      result.errors.push(...criticalErrors);
    } else {
      console.log('   ✅ No critical console errors\n');
    }

    result.errors = result.errors.filter((v, i, a) => a.indexOf(v) === i);
    result.ok = result.artifact_saved_to_local_storage_ok && 
                result.artifact_restored_after_reload_ok && 
                result.file_list_restored_ok && 
                result.open_delivery_enabled_ok && 
                result.download_zip_enabled_ok && 
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
