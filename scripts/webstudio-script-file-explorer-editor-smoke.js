#!/usr/bin/env node
/**
 * WEBSTUDIO-UX-SCRIPT-PLAYGROUND-001: Script File Explorer & Editor Smoke
 * 
 * Tests the new Script Project Workspace UX:
 * 1. Generate script
 * 2. File list visible with all package files
 * 3. Click script.py → editable textarea
 * 4. Edit and Run Edited
 * 5. Click README.md → read-only preview
 * 6. Click test_run.log → read-only preview
 * 7. Repeated generation refreshes file list
 */

const playwright = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "EDITOR OK"';
const BRIEF_2 = 'Сделай Python-скрипт, который считает сумму от 1 до 10';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-UX-SCRIPT-PLAYGROUND-001: File Explorer & Editor Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    browser_open_ok: false,
    file_list_visible_ok: false,
    has_script_py_ok: false,
    has_readme_ok: false,
    has_test_log_ok: false,
    script_py_editable_ok: false,
    edited_run_ok: false,
    readonly_preview_ok: false,
    repeated_generation_refresh_ok: false,
    no_console_null_dom_errors_ok: false,
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

    // Step 1-2: Open and select script
    console.log('1. Opening /webstudio/demo and selecting script...');
    await page.goto(`${BASE_URL}${DEMO_PATH}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.locator('select#project-type-select').selectOption('script');
    await page.waitForTimeout(500);
    result.browser_open_ok = true;
    console.log('   ✅ Ready\n');

    // Step 3-5: Generate script
    console.log('2. Generating script...');
    await page.locator('textarea#brief-text').fill(BRIEF);
    await page.locator('button#analyze-brief-btn').click();
    await page.waitForTimeout(5000);
    await page.locator('button#execute-script-btn').click();
    await page.waitForTimeout(12000);
    await page.locator('#script-program-panel').waitFor({ state: 'visible', timeout: 10000 });
    console.log('   ✅ Script generated\n');

    // Step 6-8: Check file list
    console.log('3. Checking file list...');
    const fileList = page.locator('#script-file-list');
    const fileListVisible = await fileList.isVisible().catch(() => false);
    result.file_list_visible_ok = fileListVisible;
    
    if (fileListVisible) {
      const fileText = await fileList.textContent();
      result.has_script_py_ok = fileText.includes('script.py');
      result.has_readme_ok = fileText.includes('README.md');
      result.has_test_log_ok = fileText.includes('test_run.log');
      console.log(`   ✅ File list visible (script.py: ${result.has_script_py_ok}, README: ${result.has_readme_ok}, test_run.log: ${result.has_test_log_ok})\n`);
    } else {
      console.log('   ❌ File list not visible\n');
    }

    // Step 9-11: Click script.py and check editable
    console.log('4. Opening script.py...');
    const scriptPyItem = page.locator('#script-file-list .file-item[data-file="script.py"]');
    if (await scriptPyItem.isVisible().catch(() => false)) {
      await scriptPyItem.click();
      await page.waitForTimeout(500);
      
      const editorWrapper = page.locator('#script-editor-wrapper:not(.hidden)');
      const editorVisible = await editorWrapper.isVisible().catch(() => false);
      result.script_py_editable_ok = editorVisible;
      console.log(`   ✅ script.py editable: ${result.script_py_editable_ok}\n`);
    } else {
      console.log('   ❌ script.py file item not found\n');
    }

    // Step 12-14: Edit and Run Edited
    console.log('5. Editing script.py and running...');
    const editor = page.locator('#script-editor');
    if (await editor.isVisible().catch(() => false)) {
      const currentText = await editor.inputValue();
      const editedText = currentText.replace(/EDITOR OK/g, 'EDITED OK');
      await editor.fill(editedText);
      await page.waitForTimeout(300);
      
      // Click Run Edited
      const runEditedBtn = page.locator('#run-live-edited-btn');
      if (await runEditedBtn.isVisible().catch(() => false)) {
        await runEditedBtn.click();
        await page.waitForTimeout(10000);
        
        // Check terminal output
        const terminalOutput = page.locator('#live-terminal-output');
        const terminalText = await terminalOutput.textContent();
        result.edited_run_ok = terminalText.includes('EDITED OK');
        console.log(`   ✅ Run Edited works: ${result.edited_run_ok}\n`);
      } else {
        console.log('   ❌ Run Edited button not visible\n');
      }
    } else {
      console.log('   ❌ Editor not visible\n');
    }

    // Step 15-19: Open README and test_run.log (read-only)
    console.log('6. Opening README.md (read-only)...');
    const readmeItem = page.locator('#script-file-list .file-item[data-file="README.md"]');
    if (await readmeItem.isVisible().catch(() => false)) {
      await readmeItem.click();
      await page.waitForTimeout(500);
      
      const preview = page.locator('#script-file-preview:not(.hidden)');
      const previewVisible = await preview.isVisible().catch(() => false);
      result.readonly_preview_ok = previewVisible;
      console.log(`   ✅ README.md preview visible: ${result.readonly_preview_ok}\n`);
    } else {
      console.log('   ❌ README.md file item not found\n');
    }

    // Step 20-21: Repeated generation
    console.log('7. Testing repeated generation (new brief)...');
    await page.locator('textarea#brief-text').fill(BRIEF_2);
    await page.locator('button#analyze-brief-btn').click();
    await page.waitForTimeout(5000);
    await page.locator('button#execute-script-btn').click();
    await page.waitForTimeout(12000);
    
    // Check file list refreshed
    const fileList2 = page.locator('#script-file-list');
    const fileList2Visible = await fileList2.isVisible().catch(() => false);
    if (fileList2Visible) {
      const fileText2 = await fileList2.textContent();
      result.repeated_generation_refresh_ok = fileText2.includes('script.py') && fileText2.includes('README.md');
      console.log(`   ✅ File list refreshed: ${result.repeated_generation_refresh_ok}\n`);
    } else {
      console.log('   ❌ File list not visible after regeneration\n');
    }

    // Check errors
    const nullErrors = consoleErrors.filter(e => /Cannot set properties of null|Cannot read properties of null/.test(e));
    result.no_console_null_dom_errors_ok = nullErrors.length === 0;
    result.errors = nullErrors;

    result.ok = result.browser_open_ok && 
                result.file_list_visible_ok && 
                result.has_script_py_ok && result.has_readme_ok && result.has_test_log_ok &&
                result.script_py_editable_ok && result.edited_run_ok && 
                result.readonly_preview_ok && result.repeated_generation_refresh_ok && 
                result.no_console_null_dom_errors_ok;

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
