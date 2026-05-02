#!/usr/bin/env node
const assert = require('assert');

const base = 'http://127.0.0.1:8787';

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main() {
  // 1. Fetch demo page
  const html = await fetchText(base + '/webstudio/demo');
  assert(html.includes('<script>'), 'page has script tag');
  
  // 2. Extract inline JS between <script> and </script>
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(scriptMatch, 'page has inline script block');
  const inlineJs = scriptMatch[1];
  
  // 3. Validate JS syntax using vm
  const vm = require('vm');
  try {
    new vm.Script(inlineJs, { filename: 'demo-inline.js' });
  } catch (error) {
    console.error('Inline JS syntax error:', error.message);
    console.error('Line:', error.lineNumber);
    process.exit(1);
  }
  
  // 4. Check main buttons are present in HTML
  assert(html.includes('Analyze Brief / Create Plan'), 'Analyze Brief button present');
  assert(html.includes('Execute Script MVP'), 'Execute Script MVP button present');
  assert(html.includes('run-script-btn'), 'Run Script button present');
  assert(html.includes('script-program-panel'), 'Script Program Panel present');
  assert(html.includes('script-execution-output'), 'Execution Output panel present');
  assert(html.includes('script-run-history-panel'), 'Run History panel present');
  
  // 5. Check no obvious syntax error patterns
  assert(!inlineJs.includes('async () =>>'), 'no double arrow typo');
  assert(!inlineJs.includes('function () =>>'), 'no double arrow in function');
  
  console.log(JSON.stringify({
    ok: true,
    inline_js_syntax_ok: true,
    main_buttons_present: true,
    script_block_size_bytes: inlineJs.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
