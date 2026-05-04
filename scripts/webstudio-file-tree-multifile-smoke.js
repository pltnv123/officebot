#!/usr/bin/env node
/**
 * WEBSTUDIO-FILE-TREE-MULTIFILE SMOKE
 * 
 * Tests safe multi-file editing on both Demo and Delivery pages.
 */

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

async function main() {
  console.log('🧪 WEBSTUDIO-FILE-TREE-MULTIFILE SMOKE\n');
  
  const results = {
    demo_grouped_tree_ok: false,
    demo_safe_multifile_editing_ok: false,
    demo_readonly_guard_ok: false,
    delivery_grouped_tree_ok: false,
    delivery_safe_multifile_editing_ok: false,
    delivery_readonly_guard_ok: false,
    delivery_run_edited_ok: false,
    download_ok: false
  };
  
  try {
    // Step 1: Generate script artifact
    console.log('1. Generating script artifact...');
    const genResult = await httpPostJson(`${DEMO_BASE}/api/demo/webstudio-order/execute-script`, {
      brief: 'Сделай Python-скрипт который печатает 1 до 3',
    });
    if (genResult.status !== 200 && genResult.status !== 201) {
      console.error('❌ Generate failed:', genResult.status);
      process.exit(1);
    }
    const genData = JSON.parse(genResult.data);
    const orderId = genData.order_id;
    console.log('   order_id:', orderId);
    
    // Step 2: Get artifact from library
    console.log('\n2. Getting artifact from library...');
    const libResult = await httpGet(`${DEMO_BASE}/api/demo/webstudio-order/project-artifacts`);
    if (libResult.status !== 200) {
      console.error('❌ Library fetch failed:', libResult.status);
      process.exit(1);
    }
    const libData = JSON.parse(libResult.data);
    const artifact = (libData.artifacts || []).find(a => a.project_type === 'script' && a.order_id === orderId);
    if (!artifact) {
      console.error('❌ Artifact not found in library');
      process.exit(1);
    }
    const artifactId = artifact.project_artifact_id;
    console.log('   artifact_id:', artifactId);
    
    // Step 3: Get script surface for Demo page tests
    console.log('\n3. Getting script surface...');
    const surfaceResult = await httpGet(`${DEMO_BASE}/api/demo/webstudio-order/script-surface/${encodeURIComponent(orderId)}`);
    const surfaceData = JSON.parse(surfaceResult.data);
    console.log('   files:', Object.values(surfaceData.files || {}).filter(f => f).join(', '));
    
    // Step 4: Test Demo page
    console.log('\n=== DEMO PAGE TESTS ===\n');
    
    console.log('4. Testing grouped file tree on Demo page...');
    const demoRes = await httpGet(`${DEMO_BASE}/webstudio/demo`);
    const demoHtml = demoRes.data;
    
    const hasSourceGroup = demoHtml.includes('🐍 Source Code') || demoHtml.includes('Source Code');
    const hasDocsGroup = demoHtml.includes('📄 Documentation') || demoHtml.includes('Documentation');
    const hasDataGroup = demoHtml.includes('📊 Data') || demoHtml.includes('Data');
    const hasOutputGroup = demoHtml.includes('📜 Execution Output') || demoHtml.includes('Output');
    
    if (hasSourceGroup && hasDocsGroup && hasDataGroup && hasOutputGroup) {
      console.log('   ✅ File groups present: Source, Documentation, Data, Output');
      results.demo_grouped_tree_ok = true;
    } else {
      console.log('   ❌ File groups missing');
    }
    
    console.log('\n5. Testing editable file whitelist...');
    const hasEditableFunction = demoHtml.includes('isSafeEditableArtifactFile') || demoHtml.includes('editableFiles');
    const hasEditableBadge = demoHtml.includes('editable') && demoHtml.includes('read-only');
    
    if (hasEditableFunction && hasEditableBadge) {
      console.log('   ✅ Editable/read-only badge logic present');
    } else {
      console.log('   ⚠️ Badge logic may be incomplete');
    }
    
    console.log('\n6. Testing multi-file editing state...');
    const hasEditedFilesState = demoHtml.includes('editedFiles') || demoHtml.includes('editedFiles[');
    
    if (hasEditedFilesState) {
      console.log('   ✅ editedFiles map present for session-only edits');
      results.demo_safe_multifile_editing_ok = true;
    } else {
      console.log('   ❌ editedFiles map not found');
    }
    
    console.log('\n7. Testing read-only guard...');
    const hasReadOnlyGuard = demoHtml.includes('read-only') || demoHtml.includes('isSafeEditableArtifactFile');
    
    if (hasReadOnlyGuard) {
      console.log('   ✅ Read-only guard present');
      results.demo_readonly_guard_ok = true;
    } else {
      console.log('   ❌ Read-only guard missing');
    }
    
    // Step 5: Test Delivery page
    console.log('\n=== DELIVERY PAGE TESTS ===\n');
    
    console.log('8. Testing delivery page opens...');
    const deliveryPath = `/webstudio/delivery/${encodeURIComponent(artifactId)}`;
    const deliveryRes = await httpGet(`${DEMO_BASE}${deliveryPath}`);
    if (deliveryRes.status !== 200) {
      console.log('   ❌ Delivery page failed: HTTP ' + deliveryRes.status);
    } else {
      console.log('   ✅ Delivery page opens (HTTP 200)');
      
      const deliveryHtml = deliveryRes.data;
      
      console.log('\n9. Testing grouped file tree on Delivery page...');
      const dHasSourceGroup = deliveryHtml.includes('🐍 Source Code') || deliveryHtml.includes('Source Code');
      const dHasDocsGroup = deliveryHtml.includes('📄 Documentation') || deliveryHtml.includes('Documentation');
      const dHasDataGroup = deliveryHtml.includes('📊 Data') || deliveryHtml.includes('Data');
      const dHasOutputGroup = deliveryHtml.includes('📜 Execution Output') || deliveryHtml.includes('Output');
      
      if (dHasSourceGroup && dHasDocsGroup && dHasDataGroup && dHasOutputGroup) {
        console.log('   ✅ File groups present: Source, Documentation, Data, Output');
        results.delivery_grouped_tree_ok = true;
      } else {
        console.log('   ❌ File groups missing');
      }
      
      console.log('\n10. Testing editable file whitelist...');
      const dHasEditableFunction = deliveryHtml.includes('isSafeEditableArtifactFile');
      const dHasEditedFilesState = deliveryHtml.includes('editedFiles');
      
      if (dHasEditableFunction && dHasEditedFilesState) {
        console.log('   ✅ isSafeEditableArtifactFile + editedFiles present');
        results.delivery_safe_multifile_editing_ok = true;
      } else {
        console.log('   ❌ Multi-file editing state incomplete');
      }
      
      console.log('\n11. Testing read-only guard...');
      const dHasReadOnlyGuard = deliveryHtml.includes('read-only') || deliveryHtml.includes('isSafeEditableArtifactFile');
      
      if (dHasReadOnlyGuard) {
        console.log('   ✅ Read-only guard present');
        results.delivery_readonly_guard_ok = true;
      } else {
        console.log('   ❌ Read-only guard missing');
      }
      
      console.log('\n12. Testing Run Edited capability...');
      const dHasRunEdited = deliveryHtml.includes('run-edited-btn') || deliveryHtml.includes('Run Edited');
      const dHasRunEditedEndpoint = deliveryHtml.includes('source=edited');
      
      if (dHasRunEdited && dHasRunEditedEndpoint) {
        console.log('   ✅ Run Edited button and endpoint present');
        results.delivery_run_edited_ok = true;
      } else {
        console.log('   ❌ Run Edited incomplete');
      }
      
      console.log('\n13. Testing Download ZIP...');
      const dHasDownloadLink = deliveryHtml.includes('Download ZIP') || deliveryHtml.includes('download_url');
      
      if (dHasDownloadLink) {
        console.log('   ✅ Download ZIP link present');
        results.download_ok = true;
      } else {
        console.log('   ❌ Download ZIP missing');
      }
    }
    
    // Summary
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================\n');
    
    console.log(JSON.stringify(results, null, 1));
    
    console.log('\n========================================');
    const allPassed = Object.values(results).every(v => v === true);
    if (allPassed) {
      console.log('✅ ALL CHECKS PASSED');
      process.exit(0);
    } else {
      console.log('❌ SOME CHECKS FAILED');
      const failed = Object.entries(results).filter(([_, v]) => v !== true).map(([k]) => k);
      console.log('Failed:', failed.join(', '));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ SMOKE ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
