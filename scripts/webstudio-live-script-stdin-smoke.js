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

function fetchHtml(url) {
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

async function collectSseEventsUntil(url, predicateFn, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const events = [];
    const startTime = Date.now();
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
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
              if (predicateFn(event, events)) {
                res.destroy();
                resolve(events);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
      res.on('end', () => {
        if (!predicateFn(null, events)) {
          reject(new Error('SSE ended without meeting predicate'));
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { 
      req.destroy(); 
      reject(new Error('SSE timeout')); 
    });
  });
}

async function createScriptArtifact() {
  const scriptResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-script', {
    brief: 'печатает "Hello Test"',
    desired_deliverable: 'script',
    tech_preference: 'python',
  });
  if (!scriptResult.ok) throw new Error('execute-script failed: ' + JSON.stringify(scriptResult));
  await sleep(1000);
  const artifacts = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifacts');
  if (!artifacts.ok || !artifacts.artifacts || artifacts.artifacts.length === 0) throw new Error('No artifacts');
  const matchingArtifact = artifacts.artifacts.find(a => a.order_id === scriptResult.order_id);
  if (!matchingArtifact) throw new Error('Artifact not found');
  return matchingArtifact.project_artifact_id;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-034: Live Script Stdin Smoke Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    ok: true,
    ui_contract_ok: false,
    prompt_streamed_ok: false,
    stdin_endpoint_ok: false,
    stdin_event_ok: false,
    stdout_after_input_ok: false,
    done_ok: false,
    input_after_done_blocked_ok: false,
  };

  try {
    // 1. UI contract check
    console.log('1. Checking UI contract...');
    const html = await fetchHtml(BASE_URL + '/webstudio/demo');
    const uiChecks = [
      html.includes('script-live-stdin-input'),
      html.includes('script-live-send-input-btn'),
    ];
    results.ui_contract_ok = uiChecks.every(c => c);
    console.log('   UI contract:', results.ui_contract_ok ? '✅' : '❌');

    // 2. Create fresh script artifact
    console.log('\n2. Creating fresh script artifact...');
    const artifactId = await createScriptArtifact();
    console.log('   project_artifact_id:', artifactId, '✅');

    // 3. Start live run with input() script
    console.log('\n3. Starting live run with input() script...');
    const editedSource = `name = input("What is your name? ")
print(f"Hello, {name}", flush=True)
`;
    const liveResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live', {
      edited_source: editedSource,
    });
    if (!liveResult.ok) throw new Error('Live run failed: ' + JSON.stringify(liveResult));
    const runId = liveResult.run_id;
    console.log('   run_id:', runId, '✅');

    // 4. Connect SSE and wait for prompt
    console.log('\n4. Waiting for prompt via SSE...');
    const eventsUrl = BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live/' + runId + '/events';
    
    // Wait until we see stdout with prompt
    const eventsUntilPrompt = await collectSseEventsUntil(
      eventsUrl,
      (event, allEvents) => {
        if (event && event.type === 'stdout' && event.data.chunk && event.data.chunk.includes('What is your name?')) {
          return true;
        }
        return false;
      },
      10000
    );
    
    // 5. Assert prompt streamed
    console.log('\n5. Checking prompt streamed...');
    const stdoutEvents = eventsUntilPrompt.filter(e => e.type === 'stdout');
    const promptEvent = stdoutEvents.find(e => e.data.chunk && e.data.chunk.includes('What is your name?'));
    results.prompt_streamed_ok = !!promptEvent;
    console.log('   Prompt streamed:', results.prompt_streamed_ok ? '✅' : '❌');

    // 6. POST input endpoint
    console.log('\n6. Sending input via endpoint...');
    const inputResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live/' + runId + '/input', {
      input: 'Anton\n',
    });
    results.stdin_endpoint_ok = inputResult.ok === true;
    console.log('   Input endpoint:', results.stdin_endpoint_ok ? '✅' : '❌', JSON.stringify(inputResult));

    // 7. Wait for done event
    console.log('\n7. Waiting for done event...');
    const eventsUntilDone = await collectSseEventsUntil(
      eventsUrl,
      (event, allEvents) => {
        if (event && event.type === 'done') {
          return true;
        }
        return false;
      },
      10000
    );
    
    // Check stdin event
    console.log('\n8. Checking stdin event...');
    const stdinEvent = eventsUntilDone.find(e => e.type === 'stdin');
    results.stdin_event_ok = !!stdinEvent;
    console.log('   Stdin event:', results.stdin_event_ok ? '✅' : '❌');

    // 8. Assert stdout contains "Hello, Anton"
    console.log('\n9. Checking stdout after input...');
    const allStdout = eventsUntilDone.filter(e => e.type === 'stdout');
    const helloEvent = allStdout.find(e => e.data.chunk && e.data.chunk.includes('Hello, Anton'));
    results.stdout_after_input_ok = !!helloEvent;
    console.log('   Stdout after input:', results.stdout_after_input_ok ? '✅' : '❌');

    // 9. Assert done with exit_code 0
    console.log('\n10. Checking done event...');
    const doneEvent = eventsUntilDone.find(e => e.type === 'done');
    results.done_ok = doneEvent && doneEvent.data.exit_code === 0;
    console.log('   Done event:', results.done_ok ? '✅' : '❌', doneEvent ? `exit_code=${doneEvent.data.exit_code}` : 'not found');

    // 10. POST input after done - should fail
    console.log('\n11. Testing input after done (should be blocked)...');
    try {
      const inputAfterDone = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live/' + runId + '/input', {
        input: 'test\n',
      });
      // Accept either run_not_active or run_not_found
      results.input_after_done_blocked_ok = inputAfterDone.ok === false && (inputAfterDone.error === 'run_not_active' || inputAfterDone.error === 'run_not_found');
    } catch (error) {
      // Error is expected
      results.input_after_done_blocked_ok = true;
    }
    console.log('   Input after done blocked:', results.input_after_done_blocked_ok ? '✅' : '❌');

  } catch (error) {
    console.error('Test failed:', error.message);
    results.ok = false;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Result:', JSON.stringify(results, null, 2));
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(results.ok ? 0 : 1);
}

main();
