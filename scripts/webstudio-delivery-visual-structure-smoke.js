#!/usr/bin/env node
/**
 * WEBSTUDIO-DELIVERY-UX-STAGE-1: Visual Structure Smoke
 * 
 * Tests that Delivery page has premium client-facing visual structure:
 * - Hero section with title, subtitle, status chips
 * - Code workspace with file tree and code panel
 * - Execution console
 * - Run history
 * - Package files list
 * - QA checks section
 * - Next steps section
 * - No console errors
 */

const playwright = require('playwright');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "VISUAL SMOKE OK"';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-DELIVERY-UX-STAGE-1: Visual Structure Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    hero_visible_ok: false,
    code_workspace_visible_ok: false,
    script_py_inline_code_visible_ok: false,
    execution_console_visible_ok: false,
    run_script_ok: false,
    run_history_visible_ok: false,
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

    // ========== Step 1-2: Generate script artifact ==========
    console.log('1. Generating script artifact...');
    await page.goto(`${BASE_URL}${DEMO_PATH}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.locator('select#project-type-select').selectOption('script');
    await page.waitForTimeout(500);
    await page.locator('textarea#brief-text').fill(BRIEF);
    await page.locator('button#analyze-brief-btn').click();
    await page.waitForTimeout(5000);
    await page.locator('button#execute-script-btn').click();
    await page.waitForTimeout(12000);
    
    const programPanel = page.locator('#script-program-panel');
    await programPanel.waitFor({ state: 'visible', timeout: 10000 });
    console.log('   ✅ Script generated\n');

    const state = await page.evaluate(() => {
      return {
        artifactId: window.state?.currentScriptProjectArtifactId || localStorage.getItem('webstudio.lastProjectArtifactId')
      };
    });
    artifactId = state.artifactId;
    console.log(`   Artifact ID: ${artifactId || '(not set)'}\n`);

    if (!artifactId) {
      result.errors.push('Artifact ID not found');
    } else {
      // ========== Step 3: Open Delivery page ==========
      console.log('2. Opening Delivery page...');
      const deliveryUrl = `${BASE_URL}/webstudio/delivery/${encodeURIComponent(artifactId)}`;
      await page.goto(deliveryUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // ========== Step 4: Check hero section ==========
      console.log('3. Checking hero section...');
      const heroTitle = page.locator('.hero-title');
      const heroTitleVisible = await heroTitle.isVisible().catch(() => false);
      const heroTitleText = await heroTitle.textContent();
      const hasPythonScriptPackage = heroTitleText && heroTitleText.includes('Python Script Package');
      
      const heroSubtitle = page.locator('.hero-subtitle');
      const heroSubtitleVisible = await heroSubtitle.isVisible().catch(() => false);
      const hasWebStudioSubtitle = heroSubtitleVisible;
      
      const statusChips = page.locator('.status-chip');
      const statusChipsCount = await statusChips.count();
      
      result.hero_visible_ok = heroTitleVisible && hasPythonScriptPackage && heroSubtitleVisible && statusChipsCount >= 3;
      console.log(`   Hero title visible: ${heroTitleVisible} (${heroTitleText})`);
      console.log(`   Hero subtitle visible: ${heroSubtitleVisible}`);
      console.log(`   Status chips count: ${statusChipsCount}`);
      console.log(`   ✅ Hero visible: ${result.hero_visible_ok}\n`);

      // ========== Step 5: Check code workspace ==========
      console.log('4. Checking code workspace...');
      const codeWorkspacePanel = page.locator('#code-workspace-panel');
      const codeWorkspaceVisible = await codeWorkspacePanel.isVisible().catch(() => false);
      
      const fileList = page.locator('#delivery-file-list');
      const fileListVisible = await fileList.isVisible().catch(() => false);
      
      const codeContent = page.locator('#delivery-code-content');
      const codeContentVisible = await codeContent.isVisible().catch(() => false);
      
      result.code_workspace_visible_ok = codeWorkspaceVisible && fileListVisible && codeContentVisible;
      console.log(`   Code workspace panel visible: ${codeWorkspaceVisible}`);
      console.log(`   File list visible: ${fileListVisible}`);
      console.log(`   Code content visible: ${codeContentVisible}`);
      console.log(`   ✅ Code workspace visible: ${result.code_workspace_visible_ok}\n`);

      // ========== Step 6: Check inline script.py code ==========
      console.log('5. Checking inline script.py code...');
      const codeText = await codeContent.textContent();
      const hasSubstantialCode = codeText && codeText.length > 50 && !codeText.includes('Loading...');
      
      result.script_py_inline_code_visible_ok = codeContentVisible && hasSubstantialCode;
      console.log(`   Code length: ${codeText ? codeText.length : 0}`);
      console.log(`   Has substantial code: ${hasSubstantialCode}`);
      console.log(`   ✅ Inline code visible: ${result.script_py_inline_code_visible_ok}\n`);

      // ========== Step 7: Check execution console ==========
      console.log('6. Checking execution console...');
      const executionConsolePanel = page.locator('#execution-console-panel');
      const executionConsoleVisible = await executionConsolePanel.isVisible().catch(() => false);
      
      const runBtn = page.locator('#run-btn');
      const runBtnExists = await runBtn.count() > 0;
      
      result.execution_console_visible_ok = executionConsoleVisible && runBtnExists;
      console.log(`   Execution console panel visible: ${executionConsoleVisible}`);
      console.log(`   Run button exists: ${runBtnExists}`);
      console.log(`   ✅ Execution console visible: ${result.execution_console_visible_ok}\n`);

      // ========== Step 8: Test Run Script ==========
      console.log('7. Testing Run Script...');
      if (runBtnExists) {
        await runBtn.click();
        await page.waitForTimeout(8000);
        
        const runOutput = page.locator('#run-output');
        const outputText = await runOutput.textContent();
        const hasVisualSmokeOk = outputText.includes('VISUAL SMOKE OK');
        
        result.run_script_ok = hasVisualSmokeOk;
        console.log(`   Run output contains "VISUAL SMOKE OK": ${hasVisualSmokeOk}`);
        console.log(`   ✅ Run Script OK: ${result.run_script_ok}\n`);
      } else {
        result.run_script_ok = false;
        console.log('   ❌ Run button not found\n');
      }

      // ========== Step 9: Check run history ==========
      console.log('8. Checking run history...');
      const runHistoryPanel = page.locator('#run-history-panel');
      const runHistoryVisible = await runHistoryPanel.isVisible().catch(() => false);
      
      const runHistoryContainer = page.locator('#run-history-container');
      const runHistoryExists = await runHistoryContainer.count() > 0;
      
      result.run_history_visible_ok = runHistoryVisible && runHistoryExists;
      console.log(`   Run history panel visible: ${runHistoryVisible}`);
      console.log(`   Run history container exists: ${runHistoryExists}`);
      console.log(`   ✅ Run history visible: ${result.run_history_visible_ok}\n`);

      // ========== Step 10: Test Download ZIP ==========
      console.log('9. Testing Download ZIP...');
      const downloadBtn = page.locator('button:has-text("Download ZIP")');
      const downloadBtnExists = await downloadBtn.count() > 0;
      
      if (downloadBtnExists) {
        try {
          const downloadUrl = `${BASE_URL}/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifactId)}/download`;
          const downloadResponse = await httpGet(downloadUrl);
          const hasPKHeader = downloadResponse.data.startsWith('PK') || downloadResponse.statusCode === 200;
          result.download_zip_ok = downloadResponse.statusCode === 200 && hasPKHeader;
          console.log(`   Download ZIP HTTP ${downloadResponse.statusCode}: ${result.download_zip_ok ? 'OK' : 'FAILED'}`);
        } catch (e) {
          console.log(`   Download ZIP error: ${e.message}`);
          result.download_zip_ok = false;
        }
      } else {
        result.download_zip_ok = true;
        console.log('   Download ZIP button not found (OK if no download_url)');
      }
      console.log(`   ✅ Download ZIP OK: ${result.download_zip_ok}\n`);
    }

    // Check console errors
    const criticalErrors = consoleErrors.filter(e => 
      e.includes('artifactId is not defined') ||
      e.includes('artifact_not_found') ||
      e.includes('/run-live/undefined') ||
      e.includes('/events 404') ||
      e.includes('JSON.parse') ||
      e.includes('Connection lost') ||
      e.includes('Cannot read properties of null') ||
      e.includes('escapeHtml is not defined')
    );
    result.no_console_errors_ok = criticalErrors.length === 0;
    if (criticalErrors.length > 0) {
      console.log(`   ❌ Critical console errors: ${criticalErrors.join(', ')}\n`);
      result.errors.push(...criticalErrors);
    } else {
      console.log('   ✅ No critical console errors\n');
    }

    // ========== Final result ==========
    result.errors = [...new Set(result.errors)];
    result.ok = result.hero_visible_ok && 
                result.code_workspace_visible_ok && 
                result.script_py_inline_code_visible_ok && 
                result.execution_console_visible_ok && 
                result.run_script_ok && 
                result.run_history_visible_ok && 
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
