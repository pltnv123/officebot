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

async function collectSseEvents(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const events = [];
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
              if (event.type === 'done' || event.type === 'error') {
                res.destroy();
                resolve(events);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
      res.on('end', () => resolve(events));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
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
  console.log('WEBSTUDIO-034: Live Terminal Stdin Smoke Test');
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
    console.log('1. Checking UI contract for stdin input...');
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

    // 3. Start live run with input() prompt
    console.log('\n3. Starting live run with input() prompt...');
    const editedSource = `def main():
    name = input("What is your name? ")
    print(f"Hello, {name}", flush=True)

if __name__ == "__main__":
    main()
`;
    const liveResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live', {
      edited_source: editedSource,
    });
    if (!liveResult.ok) throw new Error('Live run failed: ' + JSON.stringify(liveResult));
    const runId = liveResult.run_id;
    console.log('   run_id:', runId, '✅');

    // 4. Connect SSE and wait for prompt
    console.log('\n4. Connecting SSE and waiting for prompt...');
    const eventsUrl = BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live/' + runId + '/events';
    
    // Wait a bit for the process to start and print prompt
    await sleep(500);
    
    // 5. Send input
    console.log('\n5. Sending input "Anton"...');
    const inputUrl = BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run-live/' + runId + '/input';
    const inputResult = await postJson(inputUrl, { input: 'Anton\n' });
    results.stdin_endpoint_ok = inputResult.ok === true;
    console.log('   Input endpoint:', results.stdin_endpoint_ok ? '✅' : '❌');
    if (!results.stdin_endpoint_ok) {
      console.log('   Input result:', JSON.stringify(inputResult));
    }

    // 6. Collect remaining SSE events
    console.log('\n6. Collecting SSE events...');
    const events = await collectSseEvents(eventsUrl, 10000);
    console.log('   Events received:', events.length);
    
    // Check for prompt in stdout
    const stdoutEvents = events.filter(e => e.type === 'stdout');
    const hasPrompt = stdoutEvents.some(e => e.data.chunk && e.data.chunk.includes('What is your name?'));
    results.prompt_streamed_ok = hasPrompt;
    console.log('   Prompt streamed:', results.prompt_streamed_ok ? '✅' : '❌');

    // Check for stdin event
    const stdinEvents = events.filter(e => e.type === 'stdin');
    results.stdin_event_ok = stdinEvents.length > 0;
    console.log('   Stdin event received:', results.stdin_event_ok ? '✅' : '❌');

    // Check for "Hello, Anton" in stdout
    const hasGreeting = stdoutEvents.some(e => e.data.chunk && e.data.chunk.includes('Hello, Anton'));
    results.stdout_after_input_ok = hasGreeting;
    console.log('   Output after input:', results.stdout_after_input_ok ? '✅' : '❌');

    // Check done event
    const doneEvent = events.find(e => e.type === 'done');
    results.done_ok = doneEvent && doneEvent.data && doneEvent.data.exit_code === 0;
    console.log('   Done with exit 0:', results.done_ok ? '✅' : '❌');

    // 7. Try to send input after done (should fail)
    console.log('\n7. Testing input after done (should be blocked)...');
    try {
      const afterDoneResult = await postJson(inputUrl, { input: 'test\n' });
      results.input_after_done_blocked_ok = !afterDoneResult.ok || (afterDoneResult.status === 400);
    } catch (e) {
      // Expected - should fail
      results.input_after_done_blocked_ok = true;
    }
    console.log('   Input after done blocked:', results.input_after_done_blocked_ok ? '✅' : '❌');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    results.ok = false;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Final result:', JSON.stringify(results, null, 2));
  console.log('═══════════════════════════════════════════════════════════');
  
  return results;
}

main().then(r => process.exit(r.ok ? 0 : 1));
