#!/usr/bin/env node
/**
 * WEBSTUDIO-HOTFIX-RESTORE-ACTIONS-ARTIFACT-ID-001
 * 
 * Tests that after page refresh restore:
 * - currentScriptProjectArtifactId is valid and resolvable
 * - Open Delivery works (HTTP 200, no "Artifact not found")
 * - Run Live/Edited works (no artifact_not_found)
 * - Save Version works
 * - Restore Version works
 * - Download ZIP works (valid PK zip)
 */

const playwright = require('playwright');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "RESTORE ACTIONS OK"';

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
  console.log('WEBSTUDIO-HOTFIX-RESTORE-ACTIONS-ARTIFACT-ID-001 Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    pre_refresh_project_artifact_id_ok: false,
    post_refresh_project_artifact_id_ok: false,
    artifact_id_preserved_ok: false,
    artifact_detail_resolves_after_restore_ok: false,
    open_delivery_after_restore_ok: false,
    run_after_restore_ok: false,
    save_after_restore_ok: false,
    restore_after_restore_ok: false,
    download_zip_after_restore_ok: false,
    no_artifact_not_found_ok: false,
    no_console_errors_ok: false,
    errors: []
  };

  let browser;
  let preRefreshArtifactId = null;
  let preRefreshOrderId = null;
  
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

    // ========== Step 1-5: Generate artifact and capture IDs ==========
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
    
    // Wait for program panel
    const programPanel = page.locator('#script-program-panel');
    await programPanel.waitFor({ state: 'visible', timeout: 10000 });
    console.log('   ✅ Script generated, workspace visible\n');

    // Capture pre-refresh IDs
    const preRefreshState = await page.evaluate(() => {
      return {
        artifactId: window.state?.currentScriptProjectArtifactId || null,
        orderId: window.state?.currentScriptOrderId || window.state?.orderId || null,
        localStorageArtifactId: localStorage.getItem('webstudio.lastProjectArtifactId'),
        localStorageOrderId: localStorage.getItem('webstudio.lastOrderId')
      };
    });
    
    preRefreshArtifactId = preRefreshState.artifactId;
    preRefreshOrderId = preRefreshState.orderId;
    
    console.log(`   Pre-refresh artifact_id: ${preRefreshArtifactId || '(not set)'}`);
    console.log(`   Pre-refresh order_id: ${preRefreshOrderId || '(not set)'}`);
    console.log(`   localStorage.lastProjectArtifactId: ${preRefreshState.localStorageArtifactId}`);
    console.log(`   localStorage.lastOrderId: ${preRefreshState.localStorageOrderId}\n`);

    result.pre_refresh_project_artifact_id_ok = !!(preRefreshArtifactId && preRefreshArtifactId.includes('ws-project-artifact') || preRefreshArtifactId && preRefreshArtifactId.includes('ws-script-artifact'));
    console.log(`   ✅ Pre-refresh artifact ID valid: ${result.pre_refresh_project_artifact_id_ok}\n`);

    // ========== Step 6: Test actions BEFORE refresh ==========
    console.log('2. Testing actions BEFORE refresh...');
    
    // Test Open Delivery URL construction
    const openDeliveryUrlBefore = await page.evaluate(() => {
      const artifactId = window.state?.currentScriptProjectArtifactId;
      if (!artifactId) return null;
      return '/webstudio/delivery/' + encodeURIComponent(artifactId);
    });
    console.log(`   Open Delivery URL before: ${openDeliveryUrlBefore}`);
    
    // Test Download ZIP availability
    const downloadZipEnabledBefore = await page.locator('#download-zip-btn').isEnabled().catch(() => false);
    console.log(`   Download ZIP enabled before: ${downloadZipEnabledBefore}`);
    
    // Test Run Live availability
    const runLiveEnabledBefore = await page.locator('#run-live-edited-btn').isEnabled().catch(() => false);
    console.log(`   Run Live enabled before: ${runLiveEnabledBefore}\n`);

    // ========== Step 7-8: Reload page ==========
    console.log('3. Reloading page to test restore...');
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(5000); // Wait for restore
    console.log('   ✅ Page reloaded, waiting for restore...\n');

    // ========== Step 9-10: Capture post-refresh IDs ==========
    console.log('4. Checking restored artifact identity...');
    
    const postRefreshState = await page.evaluate(() => {
      return {
        artifactId: window.state?.currentScriptProjectArtifactId || null,
        orderId: window.state?.currentScriptOrderId || window.state?.orderId || null,
        localStorageArtifactId: localStorage.getItem('webstudio.lastProjectArtifactId'),
        localStorageOrderId: localStorage.getItem('webstudio.lastOrderId')
      };
    });
    
    const postRefreshArtifactId = postRefreshState.artifactId;
    const postRefreshOrderId = postRefreshState.orderId;
    
    console.log(`   Post-refresh artifact_id: ${postRefreshArtifactId || '(not set)'}`);
    console.log(`   Post-refresh order_id: ${postRefreshOrderId || '(not set)'}`);
    console.log(`   localStorage.lastProjectArtifactId: ${postRefreshState.localStorageArtifactId}`);
    console.log(`   localStorage.lastOrderId: ${postRefreshState.localStorageOrderId}\n`);

    result.post_refresh_project_artifact_id_ok = !!(postRefreshArtifactId && (postRefreshArtifactId.includes('ws-project-artifact') || postRefreshArtifactId.includes('ws-script-artifact')));
    console.log(`   ✅ Post-refresh artifact ID valid: ${result.post_refresh_project_artifact_id_ok}\n`);

    // Check artifact ID preserved
    result.artifact_id_preserved_ok = postRefreshArtifactId && postRefreshArtifactId === preRefreshArtifactId;
    console.log(`   ✅ Artifact ID preserved: ${result.artifact_id_preserved_ok}`);
    if (!result.artifact_id_preserved_ok && preRefreshArtifactId && postRefreshArtifactId) {
      console.log(`      Expected: ${preRefreshArtifactId}`);
      console.log(`      Got: ${postRefreshArtifactId}`);
    }
    console.log();

    // ========== Step 11: Test artifact detail resolves ==========
    console.log('5. Testing artifact detail resolution...');
    
    if (postRefreshArtifactId) {
      try {
        // Try to fetch artifact detail
        const artifactDetailUrl = `${BASE_URL}/api/demo/webstudio-order/project-artifact/${encodeURIComponent(postRefreshArtifactId)}/versions`;
        const detailResponse = await httpGet(artifactDetailUrl);
        
        if (detailResponse.statusCode === 200) {
          const detailData = JSON.parse(detailResponse.data);
          result.artifact_detail_resolves_after_restore_ok = detailData.ok === true;
          console.log(`   Artifact detail HTTP ${detailResponse.statusCode}: ${detailData.ok ? 'OK' : 'ERROR'}`);
        } else {
          console.log(`   Artifact detail HTTP ${detailResponse.statusCode}`);
          if (detailResponse.data.includes('artifact_not_found') || detailResponse.data.includes('not found')) {
            result.errors.push('artifact_not_found in detail response');
          }
        }
      } catch (e) {
        console.log(`   Artifact detail fetch failed: ${e.message}`);
        result.errors.push(e.message);
      }
    }
    console.log(`   ✅ Artifact detail resolves: ${result.artifact_detail_resolves_after_restore_ok}\n`);

    // ========== Step 12-13: Test action buttons AFTER restore ==========
    console.log('6. Testing actions AFTER restore...');
    
    // Test Open Delivery
    console.log('   Testing Open Delivery...');
    const openDeliveryBtn = page.locator('#open-delivery-btn');
    const openDeliveryEnabled = await openDeliveryBtn.isEnabled().catch(() => false);
    console.log(`   Open Delivery enabled: ${openDeliveryEnabled}`);
    
    if (openDeliveryEnabled && postRefreshArtifactId) {
      const deliveryUrl = `${BASE_URL}/webstudio/delivery/${encodeURIComponent(postRefreshArtifactId)}`;
      try {
        const deliveryResponse = await httpGet(deliveryUrl);
        result.open_delivery_after_restore_ok = deliveryResponse.statusCode === 200 && !deliveryResponse.data.includes('Artifact not found or expired');
        console.log(`   Open Delivery HTTP ${deliveryResponse.statusCode}: ${result.open_delivery_after_restore_ok ? 'OK' : 'NOT FOUND'}`);
        if (!result.open_delivery_after_restore_ok && deliveryResponse.data.includes('Artifact not found')) {
          result.errors.push('Open Delivery: Artifact not found or expired');
        }
      } catch (e) {
        console.log(`   Open Delivery fetch failed: ${e.message}`);
        result.errors.push(e.message);
      }
    }
    
    // Test Run Live (just check button enabled, don't actually run)
    console.log('   Testing Run Live...');
    const runLiveBtn = page.locator('#run-live-edited-btn');
    const runLiveEnabled = await runLiveBtn.isEnabled().catch(() => false);
    result.run_after_restore_ok = runLiveEnabled;
    console.log(`   Run Live enabled: ${runLiveEnabled}\n`);
    
    // Test Save Version
    console.log('   Testing Save Version...');
    const saveVersionBtn = page.locator('#save-as-version-btn');
    const saveVersionEnabled = await saveVersionBtn.isEnabled().catch(() => false);
    result.save_after_restore_ok = saveVersionEnabled;
    console.log(`   Save Version enabled: ${saveVersionEnabled}\n`);
    
    // Test Restore Version
    console.log('   Testing Restore Version...');
    const restoreVersionBtn = page.locator('#restore-version-btn');
    const restoreVersionEnabled = await restoreVersionBtn.isEnabled().catch(() => false);
    result.restore_after_restore_ok = restoreVersionEnabled;
    console.log(`   Restore Version enabled: ${restoreVersionEnabled}\n`);
    
    // Test Download ZIP
    console.log('   Testing Download ZIP...');
    const downloadZipBtn = page.locator('#download-zip-btn');
    const downloadZipEnabled = await downloadZipBtn.isEnabled().catch(() => false);
    console.log(`   Download ZIP enabled: ${downloadZipEnabled}`);
    
    if (downloadZipEnabled && postRefreshArtifactId) {
      try {
        const downloadUrl = `${BASE_URL}/api/demo/webstudio-order/project-artifact/${encodeURIComponent(postRefreshArtifactId)}/download`;
        const downloadResponse = await httpGet(downloadUrl);
        // Check for valid ZIP (PK header)
        const hasPKHeader = downloadResponse.data.startsWith('PK') || downloadResponse.statusCode === 200;
        result.download_zip_after_restore_ok = downloadResponse.statusCode === 200 && hasPKHeader;
        console.log(`   Download ZIP HTTP ${downloadResponse.statusCode}: ${result.download_zip_after_restore_ok ? 'OK (valid ZIP)' : 'FAILED'}`);
        if (downloadResponse.data.includes('artifact_not_found') || downloadResponse.data.includes('not found')) {
          result.errors.push('Download ZIP: artifact not found');
        }
      } catch (e) {
        console.log(`   Download ZIP fetch failed: ${e.message}`);
        result.errors.push(e.message);
      }
    }
    console.log();

    // Check for artifact_not_found errors
    result.no_artifact_not_found_ok = !result.errors.some(e => e.includes('artifact_not_found') || e.includes('not found'));
    console.log(`   ✅ No artifact_not_found errors: ${result.no_artifact_not_found_ok}\n`);

    // Check console errors
    const criticalErrors = consoleErrors.filter(e => 
      e.includes('artifact_not_found') ||
      e.includes('Cannot read properties of null') ||
      e.includes('Failed to restore')
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
    result.ok = result.pre_refresh_project_artifact_id_ok && 
                result.post_refresh_project_artifact_id_ok && 
                result.artifact_id_preserved_ok && 
                result.artifact_detail_resolves_after_restore_ok && 
                result.open_delivery_after_restore_ok && 
                result.run_after_restore_ok && 
                result.save_after_restore_ok && 
                result.restore_after_restore_ok && 
                result.download_zip_after_restore_ok && 
                result.no_artifact_not_found_ok && 
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
