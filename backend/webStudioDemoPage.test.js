const assert = require('assert');
const { renderWebStudioDemoPage } = require('./webStudioDemoPage');

function main() {
  const html = renderWebStudioDemoPage({ orderId: 'ws-order-demo-0001' });
  assert(html.includes('id="webstudio-demo-root"'));
  assert(html.includes('Create / Load Demo Order'));
  assert(html.includes('Refresh Surface'));
  assert(html.includes('Revision request'));
  assert(html.includes('Select Variant B'));
  assert(html.includes('Primary MVP'));
  assert(html.includes('Placeholder'));
  assert(!html.includes('ws-build-artifact-ws-order-demo-0001-b'));

  const injected = renderWebStudioDemoPage({ orderId: '<script>alert(1)</script>' });
  assert(injected.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert(injected.includes(JSON.stringify('<script>alert(1)</script>')));

  console.log('webStudioDemoPage test passed');
}

main();