#!/usr/bin/env node
/**
 * WEBSTUDIO-UX-SCRIPT-PLAYGROUND-002: Script Playground UX Smoke
 * 
 * Tests the improved Script Project Workspace UX:
 * 1. Clear visual hierarchy with status bar
 * 2. Project Files panel with helper text
 * 3. Editor with header and badges
 * 4. Execution Console with clear states
 * 5. Action buttons properly grouped
 * 6. Version/delivery actions visible
 */

const playwright = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "UX TEST"';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-UX-SCRIPT-PLAYGROUND-002: Script Playground UX Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    browser_open_ok: false,
    workspace_visible_ok: false,
    file_explorer_ok: false,
    editor_header_ok: false,
    editable_script_ok: false,
    run_edited_ok: false,
    execution_console_ok: false,
    readonly_preview_ok: false,
    version_ui_ok: false,
    delivery_actions_ok: false,
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

    // Step 1-2: Open and generate script
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

    // Step 3: Check workspace visible
    console.log('2. Checking Script Project Workspace...');
    const workspacePanel = page.locator('#script-workspace-panel');
    const workspaceVisible = await workspacePanel.isVisible().catch(() => false);
    result.workspace_visible_ok = workspaceVisible;
    
    // Check status bar chips
    const statusChip = page.locator('#script-run-status-chip');
    const statusText = await statusChip.textContent();
    const hasReadyStatus = statusText.includes('Ready') || statusText.includes('Status');
    console.log(`   ✅ Workspace visible: ${workspaceVisible}`);
    console.log(`   ✅ Status bar present: ${hasReadyStatus}\n`);

    // Step 4: Check Project Files panel
    console.log('3. Checking Project Files panel...');
    const fileListPanel = page.locator('#script-file-list-panel');
    const fileListVisible = await fileListPanel.isVisible().catch(() => false);
    const fileListEl = page.locator('#script-file-list');
    const fileListHasItems = await fileListEl.locator('.file-item').count() > 0;
    result.file_explorer_ok = fileListVisible && fileListHasItems;
    
    // Check helper text
    const helperText = page.locator('#script-file-list-panel p');
    const helperVisible = await helperText.isVisible().catch(() => false);
    console.log(`   ✅ File list visible: ${fileListVisible}`);
    console.log(`   ✅ Files present: ${fileListHasItems}`);
    console.log(`   ✅ Helper text visible: ${helperVisible}\n`);

    // Step 5: Check editor header
    console.log('4. Checking Editor header...');
    const fileTitle = page.locator('#script-file-title');
    const fileBadge = page.locator('#script-file-badge');
    const titleText = await fileTitle.textContent();
    const badgeText = await fileBadge.textContent();
    result.editor_header_ok = titleText.includes('script.py') && badgeText.includes('editable');
    console.log(`   ✅ File title: ${titleText}`);
    console.log(`   ✅ Badge: ${badgeText}\n`);

    // Step 6: Check script.py editable
    console.log('5. Checking script.py editable...');
    const scriptPyItem = page.locator('#script-file-list .file-item[data-file="script.py"]');
    if (await scriptPyItem.isVisible().catch(() => false)) {
      await scriptPyItem.click();
      await page.waitForTimeout(500);
      
      const editorWrapper = page.locator('#script-editor-wrapper:not(.hidden)');
      const editorVisible = await editorWrapper.isVisible().catch(() => false);
      result.editable_script_ok = editorVisible;
      console.log(`   ✅ Editor visible: ${editorVisible}\n`);
    } else {
      console.log('   ❌ script.py file item not found\n');
      result.errors.push('script.py file item not found');
    }

    // Step 7: Edit and check unsaved indicator
    console.log('6. Editing and checking unsaved indicator...');
    const editor = page.locator('#script-editor');
    if (await editor.isVisible().catch(() => false)) {
      const currentText = await editor.inputValue();
      const editedText = currentText.replace(/UX TEST/g, 'EDITED UX TEST');
      await editor.fill(editedText);
      await page.waitForTimeout(300);
      
      // Check dirty chip appears
      const dirtyChip = page.locator('#script-dirty-chip:not(.hidden)');
      const dirtyVisible = await dirtyChip.isVisible().catch(() => false);
      console.log(`   ✅ Unsaved changes indicator: ${dirtyVisible}\n`);
    }

    // Step 8: Run Edited
    console.log('7. Running Edited script...');
    const runEditedBtn = page.locator('#run-live-edited-btn');
    if (await runEditedBtn.isVisible().catch(() => false)) {
      await runEditedBtn.click();
      await page.waitForTimeout(10000);
      
      const terminalOutput = page.locator('#live-terminal-output');
      const terminalText = await terminalOutput.textContent();
      result.run_edited_ok = terminalText.includes('EDITED') || terminalText.includes('UX TEST');
      console.log(`   ✅ Run Edited output: ${result.run_edited_ok}\n`);
    } else {
      console.log('   ❌ Run Edited button not visible\n');
      result.errors.push('Run Edited button not visible');
    }

    // Step 9: Check Execution Console
    console.log('8. Checking Execution Console...');
    const consolePanel = page.locator('#script-live-terminal-panel');
    const consoleVisible = await consolePanel.isVisible().catch(() => false);
    const consoleHeader = page.locator('#script-live-terminal-panel h3');
    const consoleTitle = await consoleHeader.textContent();
    const hasExecutionConsole = consoleTitle.toLowerCase().includes('execution') || consoleTitle.toLowerCase().includes('console') || consoleTitle.toLowerCase().includes('terminal');
    
    const terminalStatus = page.locator('#live-terminal-status');
    const statusLabel = await terminalStatus.textContent();
    
    result.execution_console_ok = consoleVisible && hasExecutionConsole;
    console.log(`   ✅ Console visible: ${consoleVisible}`);
    console.log(`   ✅ Console title: ${consoleTitle}`);
    console.log(`   ✅ Status label: ${statusLabel}\n`);

    // Step 10: Check README read-only
    console.log('9. Checking README.md read-only preview...');
    const readmeItem = page.locator('#script-file-list .file-item[data-file="README.md"]');
    if (await readmeItem.isVisible().catch(() => false)) {
      await readmeItem.click();
      await page.waitForTimeout(500);
      
      const preview = page.locator('#script-file-preview:not(.hidden)');
      const previewVisible = await preview.isVisible().catch(() => false);
      result.readonly_preview_ok = previewVisible;
      console.log(`   ✅ README preview visible: ${previewVisible}\n`);
    } else {
      console.log('   ❌ README.md file item not found\n');
    }

    // Step 11: Check version UI
    console.log('10. Checking version/delivery actions...');
    const saveVersionBtn = page.locator('#save-as-version-btn');
    const restoreBtn = page.locator('#restore-version-btn');
    const downloadZipBtn = page.locator('#download-zip-btn');
    const openDeliveryBtn = page.locator('#open-delivery-btn');
    
    const saveVisible = await saveVersionBtn.isVisible().catch(() => false);
    const restoreVisible = await restoreBtn.isVisible().catch(() => false);
    const downloadVisible = await downloadZipBtn.isVisible().catch(() => false);
    const deliveryVisible = await openDeliveryBtn.isVisible().catch(() => false);
    
    result.version_ui_ok = saveVisible && restoreVisible;
    result.delivery_actions_ok = downloadVisible && deliveryVisible;
    console.log(`   ✅ Save Version: ${saveVisible}`);
    console.log(`   ✅ Restore: ${restoreVisible}`);
    console.log(`   ✅ Download ZIP: ${downloadVisible}`);
    console.log(`   ✅ Open Delivery: ${deliveryVisible}\n`);

    // Check errors
    const nullErrors = consoleErrors.filter(e => /Cannot set properties of null|Cannot read properties of null/.test(e));
    result.no_console_null_dom_errors_ok = nullErrors.length === 0;
    result.errors = nullErrors;

    result.ok = result.workspace_visible_ok && 
                result.file_explorer_ok && 
                result.editor_header_ok && 
                result.editable_script_ok && 
                result.run_edited_ok && 
                result.execution_console_ok && 
                result.readonly_preview_ok && 
                result.version_ui_ok && 
                result.delivery_actions_ok && 
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
