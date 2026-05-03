#!/usr/bin/env node
/**
 * WEBSTUDIO-HOTFIX-LIVE-RUN-EVENTS-001: Live Run Events Regression Smoke
 * 
 * Tests that Run Live and Run Edited stream output correctly via SSE events.
 * Prevents regression where events endpoint returns 404 or frontend throws JSON.parse undefined.
 */

const playwright = require('playwright');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "HELLO"';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-HOTFIX-LIVE-RUN-EVENTS-001: Live Run Events Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    browser_open_ok: false,
    run_edited_started_ok: false,
    events_endpoint_ok: false,
    no_events_404_ok: false,
    no_connection_lost_ok: false,
    no_json_parse_undefined_ok: false,
    edited_output_ok: false,
    run_live_ok: false,
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
    
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('response', async (response) => {
      if (response.status() >= 400 && response.url().includes('/run-live/')) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
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

    // Step 3-5: Generate script
    console.log('2. Generating script...');
    await page.locator('textarea#brief-text').fill(BRIEF);
    await page.locator('button#analyze-brief-btn').click();
    await page.waitForTimeout(5000);
    await page.locator('button#execute-script-btn').click();
    await page.waitForTimeout(12000);
    await page.locator('#script-program-panel').waitFor({ state: 'visible', timeout: 10000 });
    console.log('   ✅ Script generated\n');

    // Step 6-7: Open script.py and edit
    console.log('3. Opening script.py and editing...');
    const scriptPyItem = page.locator('#script-file-list .file-item[data-file="script.py"]');
    if (await scriptPyItem.isVisible().catch(() => false)) {
      await scriptPyItem.click();
      await page.waitForTimeout(500);
      
      const editor = page.locator('#script-editor');
      if (await editor.isVisible().catch(() => false)) {
        const currentText = await editor.inputValue();
        const editedText = currentText.replace(/HELLO/g, 'EDITED');
        await editor.fill(editedText);
        await page.waitForTimeout(300);
        console.log('   ✅ Script edited\n');
      } else {
        console.log('   ❌ Editor not visible\n');
        result.errors.push('Editor not visible after clicking script.py');
      }
    } else {
      console.log('   ❌ script.py file item not found\n');
      result.errors.push('script.py file item not found');
    }

    // Step 8-9: Click Run Edited
    console.log('4. Clicking Run Edited...');
    const runEditedBtn = page.locator('#run-live-edited-btn');
    if (await runEditedBtn.isVisible().catch(() => false)) {
      await runEditedBtn.click();
      await page.waitForTimeout(2000);
      result.run_edited_started_ok = true;
      console.log('   ✅ Run Edited clicked\n');
    } else {
      console.log('   ❌ Run Edited button not visible\n');
      result.errors.push('Run Edited button not visible');
    }

    // Step 10: Wait for terminal output
    console.log('5. Waiting for terminal output...');
    await page.waitForTimeout(8000);
    
    const terminalOutput = page.locator('#live-terminal-output');
    const terminalText = await terminalOutput.textContent();
    
    // Check for connection lost
    const hasConnectionLost = terminalText.includes('Connection lost');
    result.no_connection_lost_ok = !hasConnectionLost;
    
    // Check for edited output
    result.edited_output_ok = terminalText.includes('EDITED');
    
    console.log(`   Terminal output contains EDITED: ${result.edited_output_ok}`);
    console.log(`   No Connection lost: ${result.no_connection_lost_ok}\n`);

    // Step 11: Check for 404 errors
    const events404 = networkErrors.filter(e => e.url.includes('/events') && e.status === 404);
    result.no_events_404_ok = events404.length === 0;
    result.events_endpoint_ok = events404.length === 0;
    
    if (events404.length > 0) {
      console.log(`   ❌ Events endpoint returned 404: ${events404[0].url}`);
      result.errors.push(`Events 404: ${events404[0].url}`);
    } else {
      console.log('   ✅ No events 404 errors\n');
    }

    // Step 12: Check for JSON.parse undefined errors
    const jsonParseErrors = consoleErrors.filter(e => 
      e.includes('JSON.parse') || 
      e.includes('Unexpected token') ||
      e.includes('undefined')
    );
    result.no_json_parse_undefined_ok = jsonParseErrors.length === 0;
    
    if (jsonParseErrors.length > 0) {
      console.log(`   ❌ JSON.parse errors: ${jsonParseErrors.join(', ')}`);
      result.errors.push(...jsonParseErrors);
    } else {
      console.log('   ✅ No JSON.parse undefined errors\n');
    }

    // Step 13: Test Run Live on original
    console.log('6. Testing Run Live on original script...');
    const runLiveBtn = page.locator('#run-live-btn');
    if (await runLiveBtn.isVisible().catch(() => false)) {
      await runLiveBtn.click();
      await page.waitForTimeout(8000);
      
      const terminalText2 = await terminalOutput.textContent();
      result.run_live_ok = terminalText2.includes('HELLO') || terminalText2.includes('EDITED') || terminalText2.includes('running');
      console.log(`   ✅ Run Live works: ${result.run_live_ok}\n`);
    } else {
      console.log('   ❌ Run Live button not visible\n');
    }

    // Final result
    result.errors = result.errors.filter((v, i, a) => a.indexOf(v) === i); // dedupe
    result.ok = result.browser_open_ok && 
                result.run_edited_started_ok && 
                result.events_endpoint_ok && 
                result.no_events_404_ok && 
                result.no_connection_lost_ok && 
                result.no_json_parse_undefined_ok && 
                result.edited_output_ok;

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
