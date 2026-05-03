const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const liveRuns = new Map();

function makeRunId() {
  return `ws-live-run-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

function writeSse(res, event) {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function pushEvent(run, event) {
  const full = {
    id: run.events.length + 1,
    created_at: nowIso(),
    ...event,
  };
  run.events.push(full);
  for (const res of run.subscribers) {
    try {
      writeSse(res, full);
    } catch (e) {
      // Subscriber closed, ignore
    }
  }
  return full;
}

function subscribeLiveRun(runId, res) {
  const run = liveRuns.get(runId);
  if (!run) {
    res.writeHead(404, { 'Content-Type': 'text/event-stream' });
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'run_not_found' })}\n\n`);
    res.end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  run.subscribers.add(res);

  // Send buffered events
  for (const event of run.events) {
    writeSse(res, event);
  }

  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ type: 'connected', run_id: runId })}\n\n`);

  res.on('close', () => {
    run.subscribers.delete(res);
  });
}

function stopLiveRun(runId) {
  const run = liveRuns.get(runId);
  if (!run) return { ok: false, error: 'run_not_found' };
  if (run.process && !run.done) {
    run.stopped = true;
    run.process.kill('SIGTERM');
    pushEvent(run, { type: 'stopping', message: 'Stopping process...' });
    // Schedule stopped event after short delay to ensure it arrives before done
    setTimeout(() => {
      if (!run.done) {
        pushEvent(run, { type: 'stopped', message: 'Process stopped by user' });
      }
    }, 50);
    return { ok: true, run_id: runId };
  }
  return { ok: true, run_id: runId, already_done: true };
}

function startLiveScriptRun({ artifact, editedSource, saveEdited, artifactRoot }) {
  const runId = makeRunId();
  const startTime = Date.now();

  // Normalize artifact ID with 3-level fallback to prevent undefined
  const normalizedArtifactId = String(artifact.project_artifact_id || artifact.artifact_id || artifact.id || '');

  const run = {
    runId,
    artifactId: normalizedArtifactId,
    project_type: artifact.project_type,
    events: [],
    subscribers: new Set(),
    process: null,
    done: false,
    stopped: false,
    startTime,
    stdout: '',
    stderr: '',
    exitCode: null,
  };

  liveRuns.set(runId, run);

  // Determine what to run
  let scriptPath;
  let sourceMode;
  let versionId = null;

  if (!editedSource) {
    // Run current script.py
    scriptPath = path.join(artifactRoot, 'script.py');
    sourceMode = 'saved_version';
    versionId = artifact.current_version_id;
  } else if (saveEdited) {
    // Save as new version then run
    // This is handled by caller - we just run current after save
    scriptPath = path.join(artifactRoot, 'script.py');
    sourceMode = 'saved_edited';
    versionId = artifact.current_version_id;
  } else {
    // Run edited source from temp file
    const tempScriptName = 'script.live.tmp.py';
    scriptPath = path.join(artifactRoot, tempScriptName);
    sourceMode = 'edited_unsaved';
    // Write temp file
    fs.writeFileSync(scriptPath, editedSource, 'utf8');
  }

  const command = ['python3', '-u', path.basename(scriptPath)];
  const cwd = artifactRoot;

  pushEvent(run, {
    type: 'started',
    run_id: runId,
    command: command.join(' '),
    status: 'running',
    source_mode: sourceMode,
    version_id: versionId,
  });

  const proc = spawn(command[0], command.slice(1), {
    cwd,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  run.process = proc;

  proc.stdout.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    run.stdout += text;
    pushEvent(run, { type: 'stdout', chunk: text });
  });

  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    run.stderr += text;
    pushEvent(run, { type: 'stderr', chunk: text });
  });

  proc.on('error', (err) => {
    if (!run.done) {
      pushEvent(run, { type: 'error', message: err.message });
      run.done = true;
      run.exitCode = -1;
      const duration = Date.now() - startTime;
      pushEvent(run, {
        type: 'done',
        exit_code: run.exitCode,
        duration_ms: duration,
        status: 'failed',
        error: err.message,
      });
      liveRuns.delete(runId);
    }
  });

  proc.on('close', (code) => {
    if (!run.done) {
      run.done = true;
      run.exitCode = code;
      const duration = Date.now() - startTime;
      const status = run.stopped ? 'stopped' : (code === 0 ? 'ok' : 'failed');
      pushEvent(run, {
        type: 'done',
        exit_code: code,
        duration_ms: duration,
        status,
      });
      liveRuns.delete(runId);
    }
  });

  return {
    ok: true,
    run_id: runId,
    artifact_id: normalizedArtifactId,
    events_url: `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(normalizedArtifactId)}/run-live/${runId}/events`,
    stop_url: `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(normalizedArtifactId)}/run-live/${runId}/stop`,
  };
}

function getLiveRun(runId) {
  return liveRuns.get(runId) || null;
}

function sendInputToLiveRun(runId, input) {
  const run = liveRuns.get(runId);
  if (!run) {
    return { ok: false, error: 'run_not_found' };
  }
  if (run.done) {
    return { ok: false, error: 'run_not_active' };
  }
  if (!run.process || !run.process.stdin) {
    return { ok: false, error: 'process_not_available' };
  }
  
  // Limit input size
  const maxInputSize = 4096;
  if (input.length > maxInputSize) {
    return { ok: false, error: 'input_too_large', max_size: maxInputSize };
  }
  
  // Write to stdin
  run.process.stdin.write(input);
  
  // Emit stdin event
  pushEvent(run, { type: 'stdin', chunk: input });
  
  return {
    ok: true,
    run_id: runId,
    bytes_written: Buffer.byteLength(input, 'utf8'),
  };
}

module.exports = {
  liveRuns,
  makeRunId,
  pushEvent,
  subscribeLiveRun,
  stopLiveRun,
  startLiveScriptRun,
  getLiveRun,
  sendInputToLiveRun,
};
