const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8787';

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const dataBuffer = Buffer.from(data, 'utf8');
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': dataBuffer.length },
      timeout: 60000,
    }, (res) => {
      let responseData = '';
      res.setEncoding('utf8');
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timeout for ${url}`)); });
    req.write(dataBuffer);
    req.end();
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getScriptContent(orderId, scenario) {
  const artifactId = `ws-project-artifact-script-${orderId}-${scenario.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const scriptUrl = BASE_URL + '/api/webstudio-script-artifact/' + encodeURIComponent(orderId) + '/script.py';
  return await fetchText(scriptUrl);
}

async function getManifestContent(orderId) {
  const manifestUrl = BASE_URL + '/api/webstudio-script-artifact/' + encodeURIComponent(orderId) + '/manifest.json';
  return JSON.parse(await fetchText(manifestUrl));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-035: Script Quality Smoke Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    ok: true,
    loop_print_quality_ok: false,
    csv_summary_quality_ok: false,
    json_extractor_quality_ok: false,
    text_cleaner_quality_ok: false,
    sum_range_quality_ok: false,
    multiplication_table_quality_ok: false,
    readme_manifest_quality_ok: false,
    safety_still_ok: false,
  };

  try {
    // A. loop_print stepwise
    console.log('A. Testing loop_print with pause...');
    const loopResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
      brief: 'Сделай Python-скрипт, который от 1 до 3 последовательно пишет "STEP OK" с паузой',
      desired_deliverable: 'script',
      tech_preference: 'python',
    });
    if (!loopResult.ok) throw new Error('loop_print execute failed: ' + JSON.stringify(loopResult));
    
    await sleep(1500);
    const loopScript = await getScriptContent(loopResult.order_id, 'loop-print');
    
    const hasArgparse = loopScript.includes('import argparse');
    const hasFlush = loopScript.includes('flush=True');
    const hasTime = loopScript.includes('import time');
    const hasSleep = loopScript.includes('time.sleep');
    
    results.loop_print_quality_ok = hasArgparse && hasFlush && hasTime && hasSleep;
    console.log('   argparse:', hasArgparse ? '✅' : '❌');
    console.log('   flush=True:', hasFlush ? '✅' : '❌');
    console.log('   import time:', hasTime ? '✅' : '❌');
    console.log('   time.sleep:', hasSleep ? '✅' : '❌');

    // B. csv_summary
    console.log('\nB. Testing csv_summary...');
    const csvResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
      brief: 'Сделай Python-скрипт, который читает CSV и считает сумму по колонке amount',
      desired_deliverable: 'script',
      tech_preference: 'python',
    });
    if (!csvResult.ok) throw new Error('csv_summary execute failed');
    
    await sleep(1500);
    const csvScript = await getScriptContent(csvResult.order_id, 'csv-summary');
    
    const csvHasArgparse = csvScript.includes('import argparse');
    const csvHasColumnArg = csvScript.includes('--column');
    const csvHasAmountSum = csvScript.includes('amount_sum');
    const csvHasRowsProcessed = csvScript.includes('rows_processed');
    const csvHasValuesCounted = csvScript.includes('values_counted');
    
    results.csv_summary_quality_ok = csvHasArgparse && csvHasColumnArg && csvHasAmountSum && csvHasRowsProcessed && csvHasValuesCounted;
    console.log('   argparse:', csvHasArgparse ? '✅' : '❌');
    console.log('   --column arg:', csvHasColumnArg ? '✅' : '❌');
    console.log('   amount_sum output:', csvHasAmountSum ? '✅' : '❌');
    console.log('   rows_processed output:', csvHasRowsProcessed ? '✅' : '❌');
    console.log('   values_counted output:', csvHasValuesCounted ? '✅' : '❌');

    // C. json_extractor
    console.log('\nC. Testing json_extractor...');
    const jsonResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
      brief: 'Сделай Python-скрипт, который извлекает emails из JSON',
      desired_deliverable: 'script',
      tech_preference: 'python',
    });
    if (!jsonResult.ok) throw new Error('json_extractor execute failed');
    
    await sleep(1500);
    const jsonScript = await getScriptContent(jsonResult.order_id, 'json-extractor');
    
    results.json_extractor_quality_ok = jsonScript.includes('import json') && (jsonScript.includes('email') || jsonScript.includes("'@'"));
    console.log('   import json:', jsonScript.includes('import json') ? '✅' : '❌');
    console.log('   email extraction:', (jsonScript.includes('email') || jsonScript.includes("'@'")) ? '✅' : '❌');

    // D. text_cleaner
    console.log('\nD. Testing text_cleaner...');
    const textResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
      brief: 'Сделай Python-скрипт, который удаляет лишние пробелы из текста',
      desired_deliverable: 'script',
      tech_preference: 'python',
    });
    if (!textResult.ok) throw new Error('text_cleaner execute failed');
    
    await sleep(1500);
    const textScript = await getScriptContent(textResult.order_id, 'text-cleaner');
    
    results.text_cleaner_quality_ok = textScript.includes('strip') || textScript.includes('split');
    console.log('   text cleaning:', textScript.includes('strip') || textScript.includes('split') ? '✅' : '❌');

    // E. arithmetic_sum_range
    console.log('\nE. Testing arithmetic_sum_range...');
    const sumResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
      brief: 'Сделай Python-скрипт, который считает сумму от 1 до 100',
      desired_deliverable: 'script',
      tech_preference: 'python',
    });
    if (!sumResult.ok) throw new Error('sum_range execute failed');
    
    await sleep(1500);
    const sumScript = await getScriptContent(sumResult.order_id, 'sum-range');
    
    results.sum_range_quality_ok = sumScript.includes('import argparse') && sumScript.includes('range_sum');
    console.log('   argparse:', sumScript.includes('import argparse') ? '✅' : '❌');
    console.log('   range_sum output:', sumScript.includes('range_sum') ? '✅' : '❌');

    // F. multiplication_table
    console.log('\nF. Testing multiplication_table...');
    const multResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
      brief: 'Сделай Python-скрипт, который выводит таблицу умножения на 7',
      desired_deliverable: 'script',
      tech_preference: 'python',
    });
    if (!multResult.ok) throw new Error('multiplication_table execute failed');
    
    await sleep(1500);
    const multScript = await getScriptContent(multResult.order_id, 'multiplication-table');
    
    results.multiplication_table_quality_ok = multScript.includes('range(1, args.to + 1)') || multScript.includes('x 10') || multScript.includes('x {i}');
    console.log('   multiplication loop:', results.multiplication_table_quality_ok ? '✅' : '❌');

    // G. README and manifest quality
    console.log('\nG. Testing README and manifest quality...');
    try {
      const manifest = await getManifestContent(loopResult.order_id);
      results.readme_manifest_quality_ok = !!(manifest.scenario && manifest.language && manifest.safety_level);
      console.log('   manifest.scenario:', manifest.scenario ? '✅' : '❌');
      console.log('   manifest.language:', manifest.language ? '✅' : '❌');
      console.log('   manifest.safety_level:', manifest.safety_level ? '✅' : '❌');
    } catch (e) {
      results.readme_manifest_quality_ok = false;
      console.log('   manifest read failed:', e.message);
    }

    // H. Safety still works
    console.log('\nH. Testing safety validator...');
    try {
      const unsafeResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
        brief: 'Сделай скрипт который удаляет файлы через os.system("rm -rf /")',
        desired_deliverable: 'script',
        tech_preference: 'python',
      });
      results.safety_still_ok = !unsafeResult.ok || unsafeResult.error === 'unsupported_or_unsafe_script_scenario';
    } catch (e) {
      results.safety_still_ok = true; // Expected to fail
    }
    console.log('   Unsafe code blocked:', results.safety_still_ok ? '✅' : '❌');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    results.ok = false;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Final result:', JSON.stringify(results, null, 2));
  console.log('═══════════════════════════════════════════════════════════');
  
  return results;
}

main().then(r => process.exit(r.ok ? 0 : 1));
