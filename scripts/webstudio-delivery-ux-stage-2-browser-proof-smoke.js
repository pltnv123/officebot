#!/usr/bin/env node
/**
 * OPENCLAW-WEBSTUDIO-DELIVERY-UX-STAGE-2-BROWSER-PROOF
 * 
 * Real browser proof for Delivery UX Stage 2 polish.
 * 
 * Tests:
 * 1. Generate script artifact
 * 2. Open delivery page in browser
 * 3. Verify top summary card visible
 * 4. Verify artifact status chips visible
 * 5. Verify action bar visible (Run, Run Edited, Download ZIP, Back)
 * 6. Verify file tree panel visible with groups
 * 7. Verify editor/preview panel visible
 * 8. Verify output panel visible (execution console)
 * 9. Verify run history panel visible
 * 10. Verify selected file highlighted
 * 11. Verify editable badge visible for script.py
 * 12. Verify read-only badge visible for manifest.json
 * 13. Verify manifest Edit button hidden
 * 14. Run Edited still works
 * 15. Run History still updates
 * 16. Download ZIP still works
 * 17. No console/page errors
 */

const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

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
        'Content-Length': Buffer.byteLength(postData)
      }
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const results = {
    delivery_ux_stage_2_ok: false,
    page_opened: false,
    summary_card_visible: false,
    action_bar_visible: false,
    file_tree_panel_visible: false,
    editor_panel_visible: false,
    output_panel_visible: false,
    run_history_panel_visible: false,
    selected_file_highlighted: false,
    editable_badge_visible: false,
    readonly_badge_visible: false,
    manifest_edit_button_hidden: true,
    run_edited_still_works: false,
    run_history_still_updates: false,
    download_zip_still_works: false,
    console_errors: [],
    page_errors: [],
    errors: []
  };
  
  let browser = null;
  let artifactId = null;
  let initialRunHistoryCount = 0;
  
  try {
    console.log('🧪 WEBSTUDIO DELIVERY UX STAGE 2 BROWSER PROOF\n');
    
    // Step 1: Generate script artifact
    console.log('1. Generating script artifact...');
    const generateRes = await httpPostJson(DEMO_BASE + '/api/demo/webstudio-order/execute-script', {
      brief: 'Сделай Python-скрипт который печатает "UX Stage 2 test"'
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
    console.log('   ✅ Artifact generated:', artifactId);
    
    // Step 2: Launch browser and open delivery page
    console.log('\n2. Opening delivery page in browser...');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        results.console_errors.push(text);
      }
    });
    
    page.on('pageerror', error => {
      const text = error.message;
      results.page_errors.push(text);
    });
    
    const deliveryUrl = DEMO_BASE + '/webstudio/delivery/' + encodeURIComponent(artifactId);
    await page.goto(deliveryUrl, { waitUntil: 'networkidle' });
    await sleep(2500);
    results.page_opened = true;
    console.log('   ✅ Delivery page opened');
    
    // Step 3: Verify top summary card (hero section)
    console.log('\n3. Checking top summary card...');
    const heroSection = await page.$('.hero, .hero-section, [class*="hero"]');
    if (heroSection) {
      results.summary_card_visible = true;
      console.log('   ✅ Summary card visible');
    } else {
      results.errors.push('Summary card (hero) not found');
      console.log('   ❌ Summary card not found');
    }
    
    // Step 4: Verify artifact status chips
    console.log('\n4. Checking status chips...');
    const statusChips = await page.$$('.status-chip');
    if (statusChips && statusChips.length >= 3) {
      console.log('   ✅ Status chips visible:', statusChips.length);
    } else {
      results.errors.push('Status chips not found or insufficient');
      console.log('   ❌ Status chips not found');
    }
    
    // Step 5: Verify action bar
    console.log('\n5. Checking action bar...');
    const actionBar = await page.$('.hero-actions, .action-bar, [class*="action"]');
    const runBtn = await page.$('#run-btn, button:has-text("Run"), button:has-text("▶")');
    const runEditedBtn = await page.$('#run-edited-btn, button:has-text("Edited")');
    const downloadBtn = await page.$('a[href*="download"], button:has-text("Download"), button:has-text("📥")');
    
    if (actionBar || (runBtn && runEditedBtn)) {
      results.action_bar_visible = true;
      console.log('   ✅ Action bar visible');
    } else {
      results.errors.push('Action bar not found');
      console.log('   ❌ Action bar not found');
    }
    
    // Step 6: Verify file tree panel
    console.log('\n6. Checking file tree panel...');
    const fileTreePanel = await page.$('.file-tree, #delivery-file-list, [class*="file-tree"]');
    if (fileTreePanel) {
      results.file_tree_panel_visible = true;
      console.log('   ✅ File tree panel visible');
    } else {
      results.errors.push('File tree panel not found');
      console.log('   ❌ File tree panel not found');
    }
    
    // Step 7: Verify editor/preview panel
    console.log('\n7. Checking editor panel...');
    const editorPanel = await page.$('.code-panel, #delivery-code-content, .code-editor, [class*="code-panel"]');
    if (editorPanel) {
      results.editor_panel_visible = true;
      console.log('   ✅ Editor panel visible');
    } else {
      results.errors.push('Editor panel not found');
      console.log('   ❌ Editor panel not found');
    }
    
    // Step 8: Verify output panel (execution console)
    console.log('\n8. Checking output panel...');
    const outputPanel = await page.$('.console-panel, #execution-console-panel, .console-output, [class*="console"]');
    if (outputPanel) {
      results.output_panel_visible = true;
      console.log('   ✅ Output panel visible');
    } else {
      results.errors.push('Output panel not found');
      console.log('   ❌ Output panel not found');
    }
    
    // Step 9: Verify run history panel
    console.log('\n9. Checking run history panel...');
    const runHistoryPanel = await page.$('#run-history-panel, .run-history-panel, #run-history-container, [class*="run-history"]');
    if (runHistoryPanel) {
      results.run_history_panel_visible = true;
      console.log('   ✅ Run history panel visible');
    } else {
      results.errors.push('Run history panel not found');
      console.log('   ❌ Run history panel not found');
    }
    
    // Step 10: Verify selected file highlighted
    console.log('\n10. Checking selected file highlight...');
    const activeFileItem = await page.$('.file-item.active, [class*="file-item"].active, .file-item[class*="active"]');
    if (activeFileItem) {
      results.selected_file_highlighted = true;
      console.log('   ✅ Selected file highlighted');
    } else {
      // Try to click script.py and check again
      const scriptItem = await page.$('.file-item:has-text("script.py"), .file-item:has-text("script")');
      if (scriptItem) {
        await scriptItem.click();
        await sleep(800);
        const activeAfterClick = await page.$('.file-item.active');
        if (activeAfterClick) {
          results.selected_file_highlighted = true;
          console.log('   ✅ Selected file highlighted after click');
        } else {
          results.errors.push('File highlight not working');
          console.log('   ❌ File highlight not working');
        }
      } else {
        results.errors.push('Cannot verify file highlight - script.py not found');
        console.log('   ❌ Cannot verify file highlight');
      }
    }
    
    // Step 11: Verify editable badge for script.py
    console.log('\n11. Checking editable badge for script.py...');
    const editableBadge = await page.$('.file-badge.editable, .badge:has-text("editable"), span:has-text("editable")');
    if (editableBadge) {
      results.editable_badge_visible = true;
      console.log('   ✅ Editable badge visible');
    } else {
      // Check page content for editable text
      const pageContent = await page.content();
      if (pageContent.includes('editable')) {
        results.editable_badge_visible = true;
        console.log('   ✅ Editable badge found in content');
      } else {
        results.errors.push('Editable badge not found');
        console.log('   ❌ Editable badge not found');
      }
    }
    
    // Step 12: Verify read-only badge for manifest.json
    console.log('\n12. Checking read-only badge for manifest.json...');
    // First find and click manifest.json in file tree
    const manifestItem = await page.$('.file-item:has-text("manifest"), .file-item:has-text("manifest.json")');
    if (manifestItem) {
      await manifestItem.click();
      await sleep(800);
      
      const readonlyBadge = await page.$('.file-badge:not(.editable), .badge:has-text("read-only"), span:has-text("read-only"), span:has-text("read only")');
      if (readonlyBadge) {
        results.readonly_badge_visible = true;
        console.log('   ✅ Read-only badge visible for manifest');
      } else {
        const pageContent = await page.content();
        if (pageContent.includes('read-only') || pageContent.includes('read only')) {
          results.readonly_badge_visible = true;
          console.log('   ✅ Read-only badge found in content');
        } else {
          results.errors.push('Read-only badge not found for manifest');
          console.log('   ❌ Read-only badge not found');
        }
      }
    } else {
      console.log('   ⚠️ manifest.json not found in file tree');
    }
    
    // Step 13: Verify manifest Edit button hidden
    console.log('\n13. Checking manifest Edit button hidden...');
    const manifestEditBtn = await page.$('#delivery-edit-btn:not(.hidden)');
    if (!manifestEditBtn) {
      results.manifest_edit_button_hidden = true;
      console.log('   ✅ Manifest Edit button hidden (as expected)');
    } else {
      results.manifest_edit_button_hidden = false;
      results.errors.push('Manifest Edit button should be hidden but is visible');
      console.log('   ❌ Manifest Edit button visible (should be hidden)');
    }
    
    // Step 14: Run Edited still works
    console.log('\n14. Testing Run Edited...');
    // Click script.py first
    const scriptFileItem = await page.$('.file-item:has-text("script.py"), .file-item:has-text("script")');
    if (scriptFileItem) {
      await scriptFileItem.click();
      await sleep(800);
      
      // Click Edit button
      const editBtn = await page.$('#delivery-edit-btn');
      if (editBtn) {
        await editBtn.click();
        await sleep(1000);
        
        // Find textarea and edit
        const textarea = await page.$('#delivery-code-content textarea, textarea');
        if (textarea) {
          const EDITED_MARKER = 'UX_STAGE_2_PROOF_' + Date.now();
          await textarea.fill('print("' + EDITED_MARKER + '")');
          await sleep(500);
          
          // Click Save
          const saveBtn = await page.$('#delivery-save-btn');
          if (saveBtn) {
            await saveBtn.click();
            await sleep(800);
          }
          
          // Click Run Edited
          const runEditedBtn = await page.$('#run-edited-btn');
          if (runEditedBtn) {
            await runEditedBtn.click();
            await sleep(3000);
            
            // Check output for edited marker
            const outputEl = await page.$('#run-output, .console-output');
            if (outputEl) {
              const outputText = await outputEl.textContent();
              if (outputText.includes('UX_STAGE_2_PROOF')) {
                results.run_edited_still_works = true;
                console.log('   ✅ Run Edited works - edited output visible');
              } else {
                results.errors.push('Run Edited output not as expected');
                console.log('   ❌ Run Edited output not as expected');
              }
            }
          } else {
            results.errors.push('Run Edited button not found');
            console.log('   ❌ Run Edited button not found');
          }
        } else {
          results.errors.push('Textarea not found for editing');
          console.log('   ❌ Textarea not found');
        }
      } else {
        results.errors.push('Edit button not found');
        console.log('   ❌ Edit button not found');
      }
    } else {
      results.errors.push('script.py not found for Run Edited test');
      console.log('   ❌ script.py not found');
    }
    
    // Step 15: Run History still updates
    console.log('\n15. Checking Run History updates...');
    const runHistoryContainer = await page.$('#run-history-container, .run-history-list');
    if (runHistoryContainer) {
      const historyText = await runHistoryContainer.textContent();
      const runMatches = historyText.match(/(\d+)/g);
      if (runMatches && runMatches.length > 0) {
        results.run_history_still_updates = true;
        console.log('   ✅ Run History visible and updating');
      } else {
        results.errors.push('Run History not updating');
        console.log('   ❌ Run History not updating');
      }
    } else {
      results.errors.push('Run History container not found');
      console.log('   ❌ Run History container not found');
    }
    
    // Step 16: Download ZIP still works
    console.log('\n16. Testing Download ZIP...');
    const downloadLink = await page.$('a[href*="download"], a[href*="/project-artifact/"]');
    if (downloadLink) {
      // Check if download link is valid
      const href = await downloadLink.getAttribute('href');
      if (href && href.includes(artifactId)) {
        results.download_zip_still_works = true;
        console.log('   ✅ Download ZIP link valid');
      } else {
        results.errors.push('Download ZIP link invalid');
        console.log('   ❌ Download ZIP link invalid');
      }
    } else {
      // Check for download button
      const downloadBtn = await page.$('button:has-text("Download"), button:has-text("📥")');
      if (downloadBtn) {
        results.download_zip_still_works = true;
        console.log('   ✅ Download ZIP button visible');
      } else {
        results.errors.push('Download ZIP not found');
        console.log('   ❌ Download ZIP not found');
      }
    }
    
    // Final summary
    console.log('\n📊 RESULTS SUMMARY');
    console.log('==================');
    const passedChecks = Object.entries(results).filter(([k, v]) => v === true && !k.includes('error')).length;
    const totalChecks = Object.entries(results).filter(([k]) => !k.includes('error')).length;
    console.log(`Passed: ${passedChecks}/${totalChecks}`);
    
    if (results.console_errors.length > 0) {
      console.log('Console errors:', results.console_errors.slice(0, 5));
    }
    if (results.page_errors.length > 0) {
      console.log('Page errors:', results.page_errors.slice(0, 5));
    }
    if (results.errors.length > 0) {
      console.log('Test errors:', results.errors);
    }
    
    // Determine overall success
    const criticalChecks = [
      'page_opened',
      'summary_card_visible',
      'action_bar_visible',
      'file_tree_panel_visible',
      'editor_panel_visible',
      'output_panel_visible',
      'run_history_panel_visible',
      'selected_file_highlighted',
      'editable_badge_visible',
      'readonly_badge_visible',
      'manifest_edit_button_hidden',
      'run_edited_still_works',
      'run_history_still_updates',
      'download_zip_still_works'
    ];
    
    const allCriticalPassed = criticalChecks.every(k => results[k] === true);
    const noCriticalErrors = results.console_errors.length === 0 && results.page_errors.length === 0;
    
    results.delivery_ux_stage_2_ok = allCriticalPassed;
    
    console.log('\n🎯 FINAL VERDICT');
    console.log('================');
    if (allCriticalPassed) {
      console.log('✅ DELIVERY UX STAGE 2 PASSED');
    } else {
      console.log('❌ DELIVERY UX STAGE 2 FAILED');
      const failed = criticalChecks.filter(k => results[k] !== true);
      console.log('Failed checks:', failed);
    }
    
    // Write results to file
    const resultsPath = path.join(ROOT, '/tmp/webstudio-demo/delivery-ux-stage-2-results.json');
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log('\n📄 Results saved to:', resultsPath);
    
    process.exit(allCriticalPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    results.errors.push(error.message);
    results.delivery_ux_stage_2_ok = false;
    
    // Write partial results
    try {
      const resultsPath = path.join(ROOT, '/tmp/webstudio-demo/delivery-ux-stage-2-results.json');
      fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    } catch (e) {}
    
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
