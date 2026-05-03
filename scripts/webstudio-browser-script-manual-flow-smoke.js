#!/usr/bin/env node
const { chromium } = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const results = {
    ok: false,
    browser_open_ok: false,
    analyze_click_ok: false,
    execute_click_ok: false,
    program_panel_visible_ok: false,
    script_editor_visible_ok: false,
    live_terminal_visible_ok: false,
    no_console_null_dom_errors: true,
    errors: []
  };

  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('null') || text.includes('classList') || text.includes('innerHTML') || text.includes('addEventListener')) {
          results.errors.push('console: ' + text);
          results.no_console_null_dom_errors = false;
        }
      }
    });
    
    page.on('pageerror', error => {
      const text = error.message;
      const stack = error.stack || '';
      if (text.includes('null') || text.includes('classList') || text.includes('innerHTML') || text.includes('addEventListener')) {
        results.errors.push('pageerror: ' + text + '\n' + stack);
        results.no_console_null_dom_errors = false;
      }
    });

    // 1. Open demo page
    console.log('1. Opening /webstudio/demo...');
    await page.goto(BASE_URL + '/webstudio/demo', { waitUntil: 'networkidle' });
    results.browser_open_ok = true;
    console.log('   ✅ Browser opened');

    // 2. Select script project type
    console.log('2. Selecting script project type...');
    await page.selectOption('select#project-type-select', 'script');
    await sleep(500);
    console.log('   ✅ Project type set to script');

    // 3. Fill brief
    console.log('3. Filling brief...');
    const brief = 'Сделай Python-скрипт, который от 1 до 5 последовательно пишет "Vitya PRIVET" с паузой';
    await page.fill('textarea#brief-text', brief);
    console.log('   ✅ Brief filled');

    // 4. Click Analyze Brief / Create Plan
    console.log('4. Clicking Analyze Brief / Create Plan...');
    await page.click('button#analyze-brief-btn');
    await sleep(3000); // Wait for plan generation
    
    // Check for errors after analyze
    const analyzeErrors = results.errors.filter(e => e.includes('console') || e.includes('pageerror'));
    if (analyzeErrors.length > 0) {
      console.log('   ❌ Errors after analyze:', analyzeErrors);
    } else {
      console.log('   ✅ Analyze completed without DOM errors');
      results.analyze_click_ok = true;
    }

    // 5. Click Execute Script MVP
    console.log('5. Clicking Execute Script MVP...');
    const executeBtn = await page.$('button#execute-script-btn');
    if (executeBtn) {
      await executeBtn.click();
      await sleep(5000); // Wait for script execution
      
      // Check for errors after execute
      const executeErrors = results.errors.filter(e => e.includes('console') || e.includes('pageerror'));
      if (executeErrors.length > 0) {
        console.log('   ❌ Errors after execute:', executeErrors);
      } else {
        console.log('   ✅ Execute completed without DOM errors');
        results.execute_click_ok = true;
      }
    } else {
      console.log('   ⚠️ Execute button not found');
    }

    // 6. Check Program panel visible
    console.log('6. Checking Program panel visibility...');
    const programPanel = await page.$('div#script-program-panel');
    if (programPanel) {
      const isVisible = await programPanel.isVisible();
      if (isVisible) {
        console.log('   ✅ Program panel visible');
        results.program_panel_visible_ok = true;
      } else {
        console.log('   ❌ Program panel hidden');
        results.errors.push('Program panel hidden');
      }
    } else {
      console.log('   ❌ Program panel not in DOM');
      results.errors.push('Program panel not in DOM');
    }

    // 7. Check script editor visible
    console.log('7. Checking script editor visibility...');
    const editorWrapper = await page.$('div#script-editor-wrapper');
    if (editorWrapper) {
      const isVisible = await editorWrapper.isVisible();
      if (isVisible) {
        console.log('   ✅ Script editor visible');
        results.script_editor_visible_ok = true;
      } else {
        console.log('   ⚠️ Script editor wrapper exists but hidden (may be OK if code-block shown)');
      }
    } else {
      console.log('   ⚠️ Script editor wrapper not in DOM');
    }

    // 8. Check Live Terminal visible
    console.log('8. Checking Live Terminal visibility...');
    const terminalPanel = await page.$('div#script-live-terminal-panel');
    if (terminalPanel) {
      const isVisible = await terminalPanel.isVisible();
      if (isVisible) {
        console.log('   ✅ Live Terminal panel visible');
        results.live_terminal_visible_ok = true;
      } else {
        console.log('   ❌ Live Terminal panel hidden');
        results.errors.push('Live Terminal panel hidden');
      }
    } else {
      console.log('   ❌ Live Terminal panel not in DOM');
      results.errors.push('Live Terminal panel not in DOM');
    }

    // Final result
    results.ok = results.browser_open_ok && 
                 results.analyze_click_ok && 
                 results.execute_click_ok && 
                 results.program_panel_visible_ok && 
                 results.no_console_null_dom_errors;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('WEBSTUDIO-HOTFIX-UI-NULL-002: Browser Script Manual Flow Smoke');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(JSON.stringify({
      ok: results.ok,
      browser_open_ok: results.browser_open_ok,
      analyze_click_ok: results.analyze_click_ok,
      execute_click_ok: results.execute_click_ok,
      program_panel_visible_ok: results.program_panel_visible_ok,
      script_editor_visible_ok: results.script_editor_visible_ok,
      live_terminal_visible_ok: results.live_terminal_visible_ok,
      no_console_null_dom_errors: results.no_console_null_dom_errors,
      errors: results.errors
    }, null, 2));
    console.log('═══════════════════════════════════════════════════════════');

    if (!results.ok) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    results.errors.push(error.message);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Final result:', JSON.stringify(results, null, 2));
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
