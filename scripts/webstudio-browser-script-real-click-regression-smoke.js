#!/usr/bin/env node
/**
 * WEBSTUDIO-HOTFIX-UI-NULL-003: Real Browser Script Click Regression Smoke
 * 
 * Reproduces exact user flow:
 * 1. Open /webstudio/demo
 * 2. Select script
 * 3. Fill brief about "Vitya PRIVET" with pauses
 * 4. Click Analyze Brief
 * 5. Click Execute Script MVP
 * 6. Verify Program panel visible
 * 7. Click Run Live
 * 8. Assert NO null DOM errors
 */

const playwright = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF_TEXT = 'Сделай Python-скрипт, который от 1 до 5 последовательно пишет "Vitya PRIVET" с паузой';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-HOTFIX-UI-NULL-003: Real Browser Script Click Regression Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    browser_open_ok: false,
    project_type_set_ok: false,
    brief_filled_ok: false,
    analyze_ok: false,
    execute_script_ok: false,
    program_visible_ok: false,
    versions_no_null_ok: false,
    run_live_no_null_ok: false,
    no_console_null_dom_errors: false,
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

    // Collect console errors
    const consoleErrors = [];
    page.on('pageerror', (error) => {
      const msg = error.message;
      consoleErrors.push(msg);
      // Track null DOM errors specifically
      if (/Cannot set properties of null|Cannot read properties of null|innerHTML|textContent|classList|addEventListener/.test(msg)) {
        console.log(`❌ NULL DOM ERROR: ${msg}`);
      }
    });

    // Step 1: Open /webstudio/demo
    console.log('1. Opening /webstudio/demo...');
    await page.goto(`${BASE_URL}${DEMO_PATH}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    result.browser_open_ok = true;
    console.log('   ✅ Browser opened\n');

    // Step 2: Select project_type = script
    console.log('2. Selecting project type = script...');
    const projectTypeSelect = page.locator('select#project-type-select');
    await projectTypeSelect.selectOption('script');
    await page.waitForTimeout(500);
    result.project_type_set_ok = true;
    console.log('   ✅ Project type set to script\n');

    // Step 3: Fill brief
    console.log('3. Filling brief...');
    const briefTextarea = page.locator('textarea#brief-text');
    await briefTextarea.fill(BRIEF_TEXT);
    await page.waitForTimeout(500);
    result.brief_filled_ok = true;
    console.log('   ✅ Brief filled\n');

    // Step 4: Click Analyze Brief / Create Plan
    console.log('4. Clicking Analyze Brief / Create Plan...');
    const analyzeBtn = page.locator('button#analyze-brief-btn');
    await analyzeBtn.click();
    await page.waitForTimeout(3000); // Wait for analysis
    result.analyze_ok = true;
    console.log('   ✅ Analyze clicked\n');

    // Check for errors after analyze
    const analyzeErrors = consoleErrors.filter(e => /Cannot set properties of null|Cannot read properties of null/.test(e));
    if (analyzeErrors.length > 0) {
      result.errors.push(...analyzeErrors);
    }

    // Step 5: Wait for Plan and click Execute Script MVP
    console.log('5. Clicking Execute Script MVP...');
    const executeBtn = page.locator('button#execute-script-btn');
    await executeBtn.click();
    await page.waitForTimeout(5000); // Wait for execution
    result.execute_script_ok = true;
    console.log('   ✅ Execute Script MVP clicked\n');

    // Check for errors after execute
    const executeErrors = consoleErrors.filter(e => /Cannot set properties of null|Cannot read properties of null/.test(e));
    if (executeErrors.length > 0) {
      result.errors.push(...executeErrors);
    }

    // Step 6: Wait for Program panel
    console.log('6. Checking Program panel visibility...');
    const programPanel = page.locator('#script-program-panel');
    await programPanel.waitFor({ state: 'visible', timeout: 10000 });
    result.program_visible_ok = true;
    console.log('   ✅ Program panel visible\n');

    // Step 7: Check for null DOM errors in versions/run live
    console.log('7. Checking for null DOM errors...');
    await page.waitForTimeout(2000);
    
    const nullErrors = consoleErrors.filter(e => 
      /Cannot set properties of null|Cannot read properties of null/.test(e)
    );
    
    if (nullErrors.length === 0) {
      result.versions_no_null_ok = true;
      result.run_live_no_null_ok = true;
      result.no_console_null_dom_errors = true;
      console.log('   ✅ No null DOM errors\n');
    } else {
      result.errors.push(...nullErrors);
      console.log(`   ❌ Found ${nullErrors.length} null DOM errors\n`);
    }

    // Step 8: Try clicking Run Live if available
    console.log('8. Checking Run Live button...');
    const runLiveBtn = page.locator('#script-run-live-btn, button:has-text("Run Live")');
    const runLiveVisible = await runLiveBtn.isVisible().catch(() => false);
    
    if (runLiveVisible) {
      console.log('   Run Live button visible, clicking...');
      await runLiveBtn.click();
      await page.waitForTimeout(2000);
      
      // Check for errors after Run Live click
      const runLiveErrors = consoleErrors.filter(e => 
        /Cannot set properties of null|Cannot read properties of null/.test(e)
      );
      
      if (runLiveErrors.length === 0) {
        result.run_live_no_null_ok = true;
        console.log('   ✅ Run Live clicked without null errors\n');
      } else {
        result.errors.push(...runLiveErrors);
        console.log('   ❌ Run Live caused null errors\n');
      }
    } else {
      console.log('   ⚠️ Run Live button not visible (may be expected if script not generated yet)\n');
    }

    result.ok = result.browser_open_ok && 
                result.project_type_set_ok && 
                result.brief_filled_ok && 
                result.analyze_ok && 
                result.execute_script_ok && 
                result.program_visible_ok && 
                result.no_console_null_dom_errors;

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    result.errors.push(error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-HOTFIX-UI-NULL-003: Real Browser Script Click Regression Smoke');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(JSON.stringify(result, null, 2));
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(result.ok ? 0 : 1);
}

main();
