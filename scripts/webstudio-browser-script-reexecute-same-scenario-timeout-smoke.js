#!/usr/bin/env node
/**
 * WEBSTUDIO-HOTFIX-SCRIPT-REEXECUTE-002: Same-Scenario Loop Print Timeout Regression
 * 
 * Reproduces exact user flow that caused ERR-013:
 * 1. Open /webstudio/demo
 * 2. Select script
 * 3. Brief #1 (1..5 with pause) → Analyze → Execute → Run Live
 * 4. Change brief to 1..10 with pause (same scenario, different range)
 * 5. Analyze → Execute → Run Live
 * 6. Assert NO "script smoke timeout" errors on second execution
 */

const playwright = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF_1 = 'Сделай Python-скрипт, который от 1 до 5 последовательно пишет "Vitya PRIVET" с паузой';
const BRIEF_2 = 'Сделай Python-скрипт, который от 1 до 10 последовательно пишет "Vitya PRIVET" с паузой';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-HOTFIX-SCRIPT-REEXECUTE-002: Same-Scenario Timeout Regression');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    browser_open_ok: false,
    first_execute_ok: false,
    first_program_visible_ok: false,
    first_run_live_ok: false,
    first_output_has_5_ok: false,
    second_execute_ok: false,
    second_not_timeout_ok: false,
    second_program_updated_to_10_ok: false,
    second_run_live_ok: false,
    second_output_has_10_ok: false,
    no_500_execute_script_ok: false,
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
    const networkErrors = [];
    
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('response', async (response) => {
      if (response.url().includes('/execute-script') && response.status() === 500) {
        networkErrors.push({ url: response.url(), status: response.status() });
      }
    });

    // Step 1-2: Open and select script
    console.log('1. Opening /webstudio/demo and selecting script...');
    await page.goto(`${BASE_URL}${DEMO_PATH}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.locator('select#project-type-select').selectOption('script');
    await page.waitForTimeout(500);
    result.browser_open_ok = true;
    console.log('   ✅ Ready\n');

    // Step 3-6: First execution (1..5)
    console.log('2. First execution (Brief #1: 1..5 with pause)...');
    await page.locator('textarea#brief-text').fill(BRIEF_1);
    await page.locator('button#analyze-brief-btn').click();
    await page.waitForTimeout(5000);
    await page.locator('button#execute-script-btn').click();
    await page.waitForTimeout(12000);
    await page.locator('#script-program-panel').waitFor({ state: 'visible', timeout: 10000 });
    result.first_execute_ok = true;
    result.first_program_visible_ok = true;
    console.log('   ✅ First script generated\n');

    // Check first script contains range 1..5
    const scriptCodeBlock1 = page.locator('#script-code-block:not(.hidden)');
    const scriptEditor1 = page.locator('#script-editor-wrapper:not(.hidden) #script-editor');
    let scriptText1 = '';
    if (await scriptCodeBlock1.isVisible().catch(() => false)) {
      scriptText1 = await scriptCodeBlock1.textContent();
    } else if (await scriptEditor1.isVisible().catch(() => false)) {
      scriptText1 = await scriptEditor1.textContent();
    }
    result.first_output_has_5_ok = scriptText1.includes('5') && scriptText1.includes('Vitya PRIVET');

    // Run Live #1
    const runLive1 = page.locator('#run-live-btn');
    if (await runLive1.isVisible().catch(() => false)) {
      await runLive1.click();
      await page.waitForTimeout(10000);
      result.first_run_live_ok = true;
      console.log('   ✅ Run Live #1 done\n');
    }

    // Step 7-11: Second execution (1..10, same scenario)
    console.log('3. Second execution (Brief #2: 1..10 with pause, same scenario)...');
    await page.locator('textarea#brief-text').fill(BRIEF_2);
    await page.locator('button#analyze-brief-btn').click();
    await page.waitForTimeout(5000);
    await page.locator('button#execute-script-btn').click();
    await page.waitForTimeout(15000);
    result.second_execute_ok = true;
    console.log('   ✅ Second execute clicked\n');

    // Check for 500 error
    result.no_500_execute_script_ok = networkErrors.length === 0;
    
    // Check for timeout error
    const timeoutErrors = consoleErrors.filter(e => /script smoke timeout|smoke timeout/.test(e));
    result.second_not_timeout_ok = timeoutErrors.length === 0;
    
    // Check program updated to 1..10
    const scriptCodeBlock2 = page.locator('#script-code-block:not(.hidden)');
    const scriptEditor2 = page.locator('#script-editor-wrapper:not(.hidden) #script-editor');
    let scriptText2 = '';
    if (await scriptCodeBlock2.isVisible().catch(() => false)) {
      scriptText2 = await scriptCodeBlock2.textContent();
    } else if (await scriptEditor2.isVisible().catch(() => false)) {
      scriptText2 = await scriptEditor2.textContent();
    }
    // Should contain range ending at 10 or 11 (range is inclusive)
    result.second_program_updated_to_10_ok = scriptText2.includes('10') && scriptText2.includes('Vitya PRIVET');

    // Run Live #2
    const runLive2 = page.locator('#run-live-btn');
    if (await runLive2.isVisible().catch(() => false)) {
      await runLive2.click();
      await page.waitForTimeout(15000);
      result.second_run_live_ok = true;
      console.log('   ✅ Run Live #2 done\n');
    }

    // Check output has 10 lines
    const terminalOutput = page.locator('#live-terminal-output');
    const terminalText = await terminalOutput.textContent().catch(() => '');
    result.second_output_has_10_ok = terminalText.includes('10 Vitya PRIVET');

    // Check errors
    const nullErrors = consoleErrors.filter(e => /Cannot set properties of null|Cannot read properties of null/.test(e));
    result.no_console_null_dom_errors_ok = nullErrors.length === 0 && timeoutErrors.length === 0 && networkErrors.length === 0;
    result.errors = [...nullErrors, ...timeoutErrors, ...networkErrors.map(e => `500 error: ${e.url}`)];

    result.ok = result.browser_open_ok && 
                result.first_execute_ok && result.first_program_visible_ok && result.first_run_live_ok && result.first_output_has_5_ok &&
                result.second_execute_ok && result.second_not_timeout_ok && result.second_program_updated_to_10_ok && 
                result.second_run_live_ok && result.second_output_has_10_ok &&
                result.no_500_execute_script_ok && result.no_console_null_dom_errors_ok;

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
