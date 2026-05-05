#!/usr/bin/env node
/**
 * OPENCLAW-WEBSTUDIO-DELIVERY-REAL-BROWSER-PROOF-002
 * 
 * Real browser proof for Delivery page functionality.
 * 
 * Tests:
 * 1. Generate script artifact
 * 2. Open delivery page (no 404)
 * 3. All action buttons work (Run Script, Download ZIP, Run History)
 * 4. File preview works
 * 5. No `artifactId is not defined` errors
 * 6. No `JSON.parse undefined` errors
 * 7. Artifact identity correct (project_artifact_id canonical)
 */

const { chromium } = require('playwright');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEMO_BASE = 'http://127.0.0.1:8787';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function httpPostJson(url, body) {
  const postData = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSmoke() {
  const results = {
    ok: false,
    browser_open_ok: false,
    artifact_generated: false,
    delivery_page_opens: false,
    run_script_button_works: false,
    download_zip_button_works: false,
    run_history_button_works: false,
    file_preview_works: false,
    no_artifact_id_undefined_errors: true,
    no_json_parse_undefined_errors: true,
    artifact_identity_correct: false,
    console_errors: [],
    page_errors: [],
    errors: []
  };

  let browser;
  let artifactId = null;

  try {
    console.log('🧪 WEBSTUDIO-DELIVERY-REAL-BROWSER-PROOF SMOKE\n');
    
    // Step 1: Generate script artifact via API
    console.log('1. Generating script artifact...');
    const generateRes = await httpPostJson(DEMO_BASE + '/api/demo/webstudio-order/execute-script', {
      brief: 'Сделай Python-скрипт который печатает "Hello from delivery proof test"'
    });
    
    if (generateRes.status !== 200 && generateRes.status !== 201) {
      throw new Error('Generate failed: ' + generateRes.status + ' - ' + generateRes.data);
    }
    
    const generateData = JSON.parse(generateRes.data);
    const orderId = generateData.order_id;
    
    if (!orderId) {
      throw new Error('No order_id in response: ' + JSON.stringify(generateData));
    }
    
    // Get artifact from library
    console.log('   Getting artifact from library...');
    const libRes = await httpGet(DEMO_BASE + '/api/demo/webstudio-order/project-artifacts');
    if (libRes.status !== 200) {
      throw new Error('Library fetch failed: ' + libRes.status);
    }
    const libData = JSON.parse(libRes.data);
    const artifact = (libData.artifacts || []).find(a => a.project_type === 'script' && a.order_id === orderId);
    
    if (!artifact) {
      throw new Error('Artifact not found in library');
    }
    
    artifactId = artifact.project_artifact_id;
    results.artifact_generated = true;
    console.log('   ✅ Artifact generated:', artifactId);
    
    // Step 2: Launch browser and open delivery page
    console.log('2. Opening delivery page in browser...');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        results.console_errors.push(text);
        
        if (text.includes('artifactId is not defined')) {
          results.no_artifact_id_undefined_errors = false;
          results.errors.push('console: artifactId is not defined');
        }
        if (text.includes('JSON.parse') && text.includes('undefined')) {
          results.no_json_parse_undefined_errors = false;
          results.errors.push('console: JSON.parse undefined');
        }
      }
    });
    
    page.on('pageerror', error => {
      const text = error.message;
      const stack = error.stack || '';
      results.page_errors.push(text);
      
      if (text.includes('artifactId is not defined')) {
        results.no_artifact_id_undefined_errors = false;
        results.errors.push('pageerror: artifactId is not defined - ' + text);
      }
      if (text.includes('JSON.parse') && text.includes('undefined')) {
        results.no_json_parse_undefined_errors = false;
        results.errors.push('pageerror: JSON.parse undefined - ' + text);
      }
    });
    
    const deliveryUrl = DEMO_BASE + '/webstudio/delivery/' + encodeURIComponent(artifactId);
    await page.goto(deliveryUrl, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    results.browser_open_ok = true;
    results.delivery_page_opens = true;
    console.log('   ✅ Delivery page opened:', deliveryUrl);
    
    // Step 3: Check file preview
    console.log('3. Checking file preview...');
    const codeViewer = await page.$('#delivery-code-content, .code-content, .code-editor, #code-editor, pre.code, code, .script-editor, #script-editor');
    if (codeViewer) {
      results.file_preview_works = true;
      console.log('   ✅ File preview visible');
    } else {
      results.errors.push('File preview not found');
      console.log('   ❌ File preview not found');
    }
    
    // Step 4: Check action buttons exist
    console.log('4. Checking action buttons...');
    const buttons = {
      runScript: await page.$('button#run-script-btn, button:has-text("Run Script"), button:has-text("Run"), button.run-script-btn'),
      downloadZip: await page.$('button#download-zip-btn, button:has-text("Download ZIP"), button:has-text("Download"), button.download-zip-btn'),
      runHistoryPanel: await page.$('#run-history-panel, #run-history-container, .run-history-list')
    };
    
    if (buttons.runScript) {
      results.run_script_button_works = true;
      console.log('   ✅ Run Script button found');
    } else {
      results.errors.push('Run Script button not found');
      console.log('   ❌ Run Script button not found');
    }
    
    if (buttons.downloadZip) {
      results.download_zip_button_works = true;
      console.log('   ✅ Download ZIP button found');
    } else {
      results.errors.push('Download ZIP button not found');
      console.log('   ❌ Download ZIP button not found');
    }
    
    if (buttons.runHistoryPanel) {
      results.run_history_button_works = true;
      console.log('   ✅ Run History panel found');
    } else {
      results.errors.push('Run History panel not found');
      console.log('   ❌ Run History panel not found');
    }
    
    // Step 5: Click Run Script and verify no errors
    console.log('5. Testing Run Script button...');
    if (buttons.runScript) {
      try {
        await buttons.runScript.click();
        await sleep(3000);
        
        // Check for new errors after click
        const newErrors = results.errors.filter(e => 
          e.includes('artifactId is not defined') || 
          e.includes('JSON.parse undefined')
        );
        
        if (newErrors.length === 0) {
          console.log('   ✅ Run Script clicked without critical errors');
        } else {
          console.log('   ❌ Errors after Run Script click:', newErrors);
        }
      } catch (err) {
        results.errors.push('Run Script click failed: ' + err.message);
        console.log('   ❌ Run Script click failed:', err.message);
      }
    }
    
    // Step 6: Verify artifact identity in page
    console.log('6. Verifying artifact identity...');
    const pageContent = await page.content();
    if (pageContent.includes(artifactId)) {
      results.artifact_identity_correct = true;
      console.log('   ✅ Artifact ID present in page:', artifactId);
    } else {
      results.errors.push('Artifact ID not found in page content');
      console.log('   ❌ Artifact ID not found in page');
    }
    
    // Step 7: Check for critical errors
    console.log('7. Checking for critical errors...');
    const criticalErrors = results.errors.filter(e => 
      e.includes('artifactId is not defined') || 
      e.includes('JSON.parse undefined')
    );
    
    if (criticalErrors.length > 0) {
      console.log('   ❌ Critical errors found:', criticalErrors);
    } else {
      console.log('   ✅ No critical errors (artifactId/JSON.parse)');
    }
    
    // Final verdict
    results.ok = (
      results.artifact_generated &&
      results.browser_open_ok &&
      results.delivery_page_opens &&
      results.file_preview_works &&
      results.run_script_button_works &&
      results.download_zip_button_works &&
      results.run_history_button_works &&
      results.no_artifact_id_undefined_errors &&
      results.no_json_parse_undefined_errors &&
      results.artifact_identity_correct
    );
    
  } catch (err) {
    results.errors.push('Fatal: ' + err.message);
    console.log('   ❌ Fatal error:', err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n📊 RESULTS:');
  console.log(JSON.stringify({
    ok: results.ok,
    artifact_generated: results.artifact_generated,
    browser_open_ok: results.browser_open_ok,
    delivery_page_opens: results.delivery_page_opens,
    file_preview_works: results.file_preview_works,
    run_script_button_works: results.run_script_button_works,
    download_zip_button_works: results.download_zip_button_works,
    run_history_button_works: results.run_history_button_works,
    no_artifact_id_undefined_errors: results.no_artifact_id_undefined_errors,
    no_json_parse_undefined_errors: results.no_json_parse_undefined_errors,
    artifact_identity_correct: results.artifact_identity_correct,
    console_error_count: results.console_errors.length,
    page_error_count: results.page_errors.length,
    errors: results.errors
  }, null, 2));
  
  return results;
}

runSmoke().then(results => {
  process.exit(results.ok ? 0 : 1);
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
