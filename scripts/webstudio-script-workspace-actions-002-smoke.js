#!/usr/bin/env node
/**
 * WEBSTUDIO-HOTFIX-SCRIPT-WORKSPACE-ACTIONS-002: Restore UX and Open Delivery Smoke
 * 
 * Tests:
 * 1. Save Version creates version and selects it automatically
 * 2. Restore works with selected version or latest saved
 * 3. Open Delivery opens working route (not 404)
 */

const playwright = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "RESTORE TEST"';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-HOTFIX-SCRIPT-WORKSPACE-ACTIONS-002: Restore & Delivery Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    browser_open_ok: false,
    save_version_ok: false,
    version_auto_selected_ok: false,
    restore_latest_ok: false,
    open_delivery_ok: false,
    no_console_errors_ok: false,
    errors: []
  };

  let browser;
  
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
    result.browser_open_ok = true;
    console.log('   ✅ Script generated\n');

    // Step 5-6: Open and edit script.py
    console.log('2. Opening script.py and editing...');
    const scriptPyItem = page.locator('#script-file-list .file-item[data-file="script.py"]');
    if (await scriptPyItem.isVisible().catch(() => false)) {
      await scriptPyItem.click();
      await page.waitForTimeout(500);
      
      const editor = page.locator('#script-editor');
      if (await editor.isVisible().catch(() => false)) {
        const currentText = await editor.inputValue();
        const editedText = currentText.replace(/RESTORE TEST/g, 'RESTORE EDITED');
        await editor.fill(editedText);
        await page.waitForTimeout(300);
        console.log('   ✅ Script edited\n');
      }
    }

    // Step 7-9: Save Version and check auto-select
    console.log('3. Testing Save Version and auto-select...');
    const saveVersionBtn = page.locator('#save-as-version-btn');
    if (await saveVersionBtn.isVisible().catch(() => false)) {
      await saveVersionBtn.click();
      await page.waitForTimeout(3000);
      
      // Check status message
      const statusLine = page.locator('#status-line');
      const statusText = await statusLine.textContent();
      const hasSaved = statusText.includes('Saved as v');
      result.save_version_ok = hasSaved;
      console.log(`   ✅ Save Version: ${hasSaved}`);
      console.log(`   Status: ${statusText}\n`);
      
      // Check version dropdown has v0002 and it's selected
      const versionDropdown = page.locator('#script-versions-dropdown');
      const selectedValue = await versionDropdown.inputValue();
      const hasV0002 = selectedValue.includes('v0002');
      result.version_auto_selected_ok = hasV0002;
      console.log(`   ✅ Version auto-selected: ${hasV0002} (selected: ${selectedValue})\n`);
      
      if (!hasV0002) {
        result.errors.push(`Version not auto-selected: ${selectedValue}`);
      }
    } else {
      console.log('   ❌ Save Version button not visible\n');
      result.errors.push('Save Version button not visible');
    }

    // Step 10-13: Modify and Restore
    console.log('4. Testing Restore...');
    try {
      // Modify editor again
      const editor = page.locator('#script-editor');
      if (await editor.isVisible().catch(() => false)) {
        const currentText = await editor.inputValue();
        console.log(`   Before modify: ${currentText.includes('RESTORE EDITED') ? 'has RESTORE EDITED' : 'other'}`);
        const changedText = currentText.replace(/RESTORE EDITED/g, 'RESTORE CHANGED');
        await editor.fill(changedText);
        await page.waitForTimeout(300);
        
        const afterModifyText = await editor.inputValue();
        console.log(`   After modify: ${afterModifyText.includes('RESTORE CHANGED') ? 'has RESTORE CHANGED' : 'other'}`);
      }
      
      // Click Restore
      const restoreBtn = page.locator('#restore-version-btn');
      if (await restoreBtn.isVisible().catch(() => false)) {
        // Check what version is selected before restore
        const versionDropdown = page.locator('#script-versions-dropdown');
        const selectedBefore = await versionDropdown.inputValue();
        console.log(`   Selected version before restore: ${selectedBefore}`);
        
        await restoreBtn.click();
        await page.waitForTimeout(3000);
        
        // Check status message
        const statusLine = page.locator('#status-line');
        const statusText = await statusLine.textContent();
        console.log(`   Status after restore: ${statusText}`);
        
        // Check editor was restored to RESTORE EDITED (not RESTORE CHANGED)
        const editorText = await editor.inputValue();
        console.log(`   Editor after restore: ${editorText.slice(0, 100)}...`);
        const hasRestored = editorText.includes('RESTORE EDITED');
        const hasChanged = editorText.includes('RESTORE CHANGED');
        const wasRestored = hasRestored && !hasChanged;
        result.restore_latest_ok = wasRestored;
        console.log(`   ✅ Restore worked: ${wasRestored} (has RESTORE EDITED: ${hasRestored}, has RESTORE CHANGED: ${hasChanged})\n`);
        
        if (!wasRestored) {
          result.errors.push(`Restore did not restore correct version. Editor: ${editorText.slice(0, 200)}`);
        }
      } else {
        console.log('   ❌ Restore button not visible\n');
        result.errors.push('Restore button not visible');
      }
    } catch (error) {
      console.log(`   ❌ Restore failed: ${error.message}\n`);
      result.errors.push(`Restore error: ${error.message}`);
    }

    // Step 14-16: Open Delivery
    console.log('5. Testing Open Delivery...');
    try {
      // Get the delivery URL before clicking
      const deliveryUrl = await page.evaluate(() => {
        const btn = document.getElementById('open-delivery-btn');
        // We can't directly get the URL from the click handler, so we'll check after
        return null;
      });
      
      const openDeliveryBtn = page.locator('#open-delivery-btn');
      if (await openDeliveryBtn.isVisible().catch(() => false)) {
        // Open delivery in new page
        const [newPage] = await Promise.all([
          page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
          openDeliveryBtn.click()
        ]);
        
        if (newPage) {
          await newPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          const deliveryUrl = newPage.url();
          const deliveryStatus = await newPage.evaluate(() => document.body.innerText.slice(0, 200));
          
          // Check not a 404/cannot GET page
          const is404 = deliveryStatus.includes('Cannot GET') || deliveryStatus.includes('404');
          const hasContent = deliveryStatus.includes('Project') || deliveryStatus.includes('delivery') || deliveryStatus.includes('script');
          
          result.open_delivery_ok = !is404 && hasContent;
          console.log(`   ✅ Delivery page opened: ${!is404}`);
          console.log(`   ✅ Has content: ${hasContent}`);
          console.log(`   URL: ${deliveryUrl}\n`);
          
          if (is404) {
            result.errors.push(`Delivery page 404: ${deliveryStatus.slice(0, 100)}`);
          }
          
          await newPage.close();
        } else {
          console.log('   ❌ Delivery popup not opened\n');
          result.errors.push('Delivery popup not opened');
        }
      } else {
        console.log('   ❌ Open Delivery button not visible\n');
        result.errors.push('Open Delivery button not visible');
      }
    } catch (error) {
      console.log(`   ❌ Open Delivery failed: ${error.message}\n`);
      result.errors.push(`Delivery error: ${error.message}`);
    }

    // Check errors
    const nullErrors = consoleErrors.filter(e => /Cannot set properties of null|Cannot read properties of null/.test(e));
    result.no_console_errors_ok = nullErrors.length === 0;
    if (!result.no_console_errors_ok) {
      result.errors.push(...nullErrors);
      console.log(`   ❌ Console errors found: ${consoleErrors.length}`);
    } else {
      console.log('   ✅ No console errors\n');
    }

    result.errors = result.errors.filter((v, i, a) => a.indexOf(v) === i); // dedupe
    result.ok = result.browser_open_ok && 
                result.save_version_ok && 
                result.version_auto_selected_ok && 
                result.restore_latest_ok && 
                result.open_delivery_ok && 
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
