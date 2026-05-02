const http = require('http');

const BASE_URL = 'http://127.0.0.1:8787';

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Running WebStudio Live Run Smoke Test...\n');

  // Step 1: Create script order via execute-script (print_static_text scenario)
  console.log('1. Create script order via execute-script...');
  const scriptResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
    brief: 'печатает "Hello Live Run Test"',
    desired_deliverable: 'script',
    tech_preference: 'python',
  });
  if (!scriptResult.ok) throw new Error('execute-script failed: ' + JSON.stringify(scriptResult));
  const orderId = scriptResult.order_id;
  console.log('   order_id:', orderId, '✅');

  // Step 2: Get artifact from library by order_id
  await sleep(1000);
  console.log('2. Get script artifact from library...');
  const artifacts = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifacts');
  if (!artifacts.ok || !artifacts.artifacts || artifacts.artifacts.length === 0) throw new Error('No artifacts in library');
  const matchingArtifact = artifacts.artifacts.find(a => a.order_id === orderId);
  if (!matchingArtifact) throw new Error('Artifact not found for order_id ' + orderId);
  const artifactId = matchingArtifact.project_artifact_id;
  if (!artifactId) throw new Error('No project_artifact_id');
  console.log('   project_artifact_id:', artifactId, '✅');

  // Step 3: Start live run
  console.log('3. Start live run...');
  const liveResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live', {});
  if (!liveResult.ok) throw new Error('Live run failed: ' + JSON.stringify(liveResult));
  const runId = liveResult.run_id;
  console.log('   run_id:', runId, '✅');
  console.log('   events_url:', liveResult.events_url, '✅');

  // Step 4: Subscribe to SSE and wait for completion
  console.log('4. Subscribe to SSE events...');
  const events = [];
  await new Promise((resolve, reject) => {
    const req = http.get(BASE_URL + liveResult.events_url, (res) => {
      res.setEncoding('utf8');
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const eventMatch = line.match(/event: (.+)/);
          const dataMatch = line.match(/data: (.+)/);
          if (eventMatch && dataMatch) {
            try {
              const event = { type: eventMatch[1], data: JSON.parse(dataMatch[1]) };
              events.push(event);
              if (event.type === 'done') {
                res.destroy();
                resolve();
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
      res.on('end', () => resolve());
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('SSE timeout')); });
  });

  console.log('   Events received:', events.length, '✅');
  const startedEvent = events.find(e => e.type === 'started');
  const doneEvent = events.find(e => e.type === 'done');
  const stdoutEvents = events.filter(e => e.type === 'stdout');

  if (!startedEvent) throw new Error('No started event');
  if (!doneEvent) throw new Error('No done event');
  if (stdoutEvents.length === 0) throw new Error('No stdout events');

  console.log('   started:', startedEvent.data.status, '✅');
  console.log('   done:', doneEvent.data.status, '(exit_code:', doneEvent.data.exit_code + ')', '✅');
  console.log('   stdout chunks:', stdoutEvents.length, '✅');

  // Step 5: Check output
  const allStdout = stdoutEvents.map(e => e.data.chunk).join('');
  console.log('   stdout preview:', allStdout.substring(0, 100), '...');
  if (!allStdout.includes('Hello') || !allStdout.includes('Live') || !allStdout.includes('Test')) {
    throw new Error('Expected output to contain Hello Live Run Test');
  }
  console.log('   Output contains expected text: ✅');

  // Step 6: Stop run (if still running)
  console.log('5. Stop run (if running)...');
  const stopResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live/' + runId + '/stop', {});
  console.log('   stop result:', stopResult.ok ? 'ok' : stopResult.error, '✅');

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ All live run checks passed!');
  console.log('═══════════════════════════════════════════\n');

  return { ok: true, run_id: runId, events_count: events.length };
}

main().then(result => {
  console.log('Final result:', JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
