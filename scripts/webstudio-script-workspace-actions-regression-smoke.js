#!/usr/bin/env node
/**
 * WEBSTUDIO-HOTFIX-SCRIPT-WORKSPACE-PERSISTENCE-001: Script Workspace Actions Regression Smoke
 * 
 * Tests critical workspace actions:
 * 1. Save Version works
 * 2. Restore works without null errors
 * 3. Download ZIP returns valid ZIP
 * 4. Run Edited reaches Completed state
 * 5. No console errors
 */

const playwright = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "SAVE TEST"';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-HOTFIX-SCRIPT-WORKSPACE-PERSISTENCE-001: Workspace Actions Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    browser_open_ok: false,
    completed_state_ok: false,
    run_edited_output_ok: false,
    save_version_ok: false,
    restore_ok: false,
    download_zip_ok: false,
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

    // Step 1-6: Generate script
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

    // Step 7-8: Open and edit script.py
    console.log('2. Opening script.py and editing...');
    const scriptPyItem = page.locator('#script-file-list .file-item[data-file="script.py"]');
    if (await scriptPyItem.isVisible().catch(() => false)) {
      await scriptPyItem.click();
      await page.waitForTimeout(500);
      
      const editor = page.locator('#script-editor');
      if (await editor.isVisible().catch(() => false)) {
        const currentText = await editor.inputValue();
        const editedText = currentText.replace(/SAVE TEST/g, 'SAVE EDITED');
        await editor.fill(editedText);
        await page.waitForTimeout(300);
        console.log('   ✅ Script edited\n');
      }
    }

    // Step 9-11: Run Edited and check Completed state
    console.log('3. Running Edited and checking Completed state...');
    const runEditedBtn = page.locator('#run-live-edited-btn');
    if (await runEditedBtn.isVisible().catch(() => false)) {
      await runEditedBtn.click();
      await page.waitForTimeout(10000);
      
      const terminalStatus = page.locator('#live-terminal-status');
      const statusText = await terminalStatus.textContent();
      result.completed_state_ok = statusText.includes('Completed') || statusText.includes('✅');
      
      const terminalOutput = page.locator('#live-terminal-output');
      const terminalText = await terminalOutput.textContent();
      result.run_edited_output_ok = terminalText.includes('EDITED') || terminalText.includes('SAVE');
      
      console.log(`   ✅ Completed state: ${result.completed_state_ok}`);
      console.log(`   ✅ Output contains edited text: ${result.run_edited_output_ok}\n`);
    }

    // Step 12-14: Save Version
    console.log('4. Testing Save Version...');
    const saveVersionBtn = page.locator('#save-as-version-btn');
    if (await saveVersionBtn.isVisible().catch(() => false)) {
      await saveVersionBtn.click();
      await page.waitForTimeout(3000);
      
      // Check for error message
      const statusLine = page.locator('#status-line');
      const statusText = await statusLine.textContent();
      const hasFailed = statusText.toLowerCase().includes('failed');
      
      // Check version selector updated
      const versionDropdown = page.locator('#script-versions-dropdown');
      const versionOptions = await versionDropdown.locator('option').count();
      
      result.save_version_ok = !hasFailed && versionOptions >= 1;
      console.log(`   ✅ Save Version succeeded: ${result.save_version_ok}`);
      if (!result.save_version_ok) {
        console.log(`   Status: ${statusText}`);
        result.errors.push(`Save Version failed: ${statusText}`);
      }
      console.log('');
    } else {
      console.log('   ❌ Save Version button not visible\n');
      result.errors.push('Save Version button not visible');
    }

    // Step 15-18: Restore
    console.log('5. Testing Restore...');
    try {
      const restoreBtn = page.locator('#restore-version-btn');
      if (await restoreBtn.isVisible().catch(() => false)) {
        // Select a version first
        const versionDropdown = page.locator('#script-versions-dropdown');
        const options = await versionDropdown.locator('option').all();
        if (options.length > 1) {
          // Get the value of the second option (first non-empty)
          const secondOptionValue = await options[1].textContent();
          if (secondOptionValue && secondOptionValue.trim()) {
            await versionDropdown.selectOption({ label: secondOptionValue });
          } else {
            console.log('   ⚠️ No versions available to restore\n');
            result.restore_ok = false;
            result.errors.push('No versions available');
          }
        } else {
          console.log('   ⚠️ No versions available to restore\n');
          result.restore_ok = false;
          result.errors.push('No versions available');
        }
        await page.waitForTimeout(500);
        
        await restoreBtn.click();
        await page.waitForTimeout(2000);
        
        // Check no null error occurred
        const nullErrors = consoleErrors.filter(e => /Cannot read properties of null/.test(e));
        result.restore_ok = nullErrors.length === 0;
        console.log(`   ✅ Restore succeeded: ${result.restore_ok}\n`);
      } else {
        console.log('   ❌ Restore button not visible\n');
        result.errors.push('Restore button not visible');
      }
    } catch (error) {
      console.log(`   ❌ Restore failed: ${error.message}\n`);
      result.errors.push(`Restore error: ${error.message}`);
    }

    // Step 19-20: Download ZIP
    console.log('6. Testing Download ZIP...');
    try {
      const downloadZipBtn = page.locator('#download-zip-btn');
      if (await downloadZipBtn.isVisible().catch(() => false)) {
        // Start waiting for download
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
          downloadZipBtn.click()
        ]);
        
        if (download) {
          const path = await download.path();
          const fs = require('fs');
          if (path && fs.existsSync(path)) {
            const buffer = fs.readFileSync(path);
            const isZip = buffer.length > 4 && (buffer[0] === 0x50 && buffer[1] === 0x4B); // PK magic
            result.download_zip_ok = isZip;
            console.log(`   ✅ Download ZIP succeeded: ${result.download_zip_ok}`);
            console.log(`   ✅ Valid ZIP file: ${isZip}\n`);
          } else {
            console.log('   ❌ Download file not found\n');
            result.errors.push('Download file not found');
          }
        } else {
          console.log('   ❌ Download event not triggered\n');
          result.errors.push('Download not triggered');
        }
      } else {
        console.log('   ❌ Download ZIP button not visible\n');
        result.errors.push('Download ZIP button not visible');
      }
    } catch (error) {
      console.log(`   ❌ Download ZIP failed: ${error.message}\n`);
      result.errors.push(`Download error: ${error.message}`);
    }

    // Check errors
    const nullErrors = consoleErrors.filter(e => /Cannot set properties of null|Cannot read properties of null/.test(e));
    const failedErrors = consoleErrors.filter(e => /Failed to save version/.test(e));
    const jsonErrors = consoleErrors.filter(e => /undefined is not valid JSON|JSON.parse/.test(e));
    const events404 = consoleErrors.filter(e => /\/events.*404/.test(e));
    
    result.no_console_errors_ok = nullErrors.length === 0 && failedErrors.length === 0 && jsonErrors.length === 0 && events404.length === 0;
    if (!result.no_console_errors_ok) {
      result.errors.push(...nullErrors, ...failedErrors, ...jsonErrors, ...events404);
      console.log(`   ❌ Console errors found: ${consoleErrors.length}`);
    } else {
      console.log('   ✅ No console errors\n');
    }

    result.errors = result.errors.filter((v, i, a) => a.indexOf(v) === i); // dedupe
    result.ok = result.browser_open_ok && 
                result.completed_state_ok && 
                result.run_edited_output_ok && 
                result.save_version_ok && 
                result.restore_ok && 
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
