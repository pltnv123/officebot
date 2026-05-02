const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { registerProjectArtifact, listProjectArtifacts, getProjectArtifact, updateArtifactRunMetadata } = require('./webStudioProjectArtifactLibraryService');

const SCRIPT_ARTIFACT_ROOT = path.join(__dirname, '..', '..', 'storage', '.first-governed-workflow-runtime', 'webstudio-script-artifacts');
const TELEGRAM_BOT_ARTIFACT_ROOT = path.join(__dirname, '..', '..', 'storage', '.first-governed-workflow-runtime', 'webstudio-telegram-bot-artifacts');
const PROJECT_ARTIFACT_ROOT = path.join(__dirname, '..', '..', 'storage', '.first-governed-workflow-runtime', 'webstudio-project-artifacts');

function nowIso() {
  return new Date().toISOString();
}

function createRunId() {
  return `ws-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function validateArtifactRoot({ artifact, rootDir }) {
  const artifactRoot = String(artifact.artifact_root || '');
  if (!artifactRoot) {
    throw new Error('artifact_root_missing');
  }
  const resolvedRoot = path.resolve(artifactRoot);
  const allowedRoots = [
    path.resolve(rootDir, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-script-artifacts'),
    path.resolve(rootDir, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-telegram-bot-artifacts'),
  ];
  const isAllowed = allowedRoots.some((allowed) => resolvedRoot.startsWith(allowed));
  if (!isAllowed) {
    throw new Error('artifact_root_outside_allowed');
  }
  return resolvedRoot;
}

async function writeRunResult({ artifact, result }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const runResultPath = path.join(artifactRoot, 'run_result.json');
  const runResult = {
    run_id: createRunId(),
    artifact_id: artifact.project_artifact_id,
    order_id: artifact.order_id,
    project_type: artifact.project_type,
    scenario: artifact.scenario,
    command: result.command,
    exit_code: result.exit_code,
    stdout: result.stdout,
    stderr: result.stderr,
    duration_ms: result.duration_ms,
    ok: result.ok,
    created_at: nowIso(),
  };
  await fsPromises.writeFile(runResultPath, JSON.stringify(runResult, null, 2), 'utf8');
  return runResult;
}

async function appendRunHistory({ artifact, runResult }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const runHistoryPath = path.join(artifactRoot, 'run_history.json');
  
  let history = {
    artifact_id: artifact.project_artifact_id,
    order_id: artifact.order_id,
    project_type: artifact.project_type,
    scenario: artifact.scenario,
    run_count: 0,
    last_run_status: null,
    last_run_at: null,
    runs: [],
  };
  
  try {
    const existing = await fsPromises.readFile(runHistoryPath, 'utf8');
    history = JSON.parse(existing);
  } catch {}
  
  const runEntry = {
    run_id: runResult.run_id,
    created_at: runResult.created_at,
    ok: runResult.ok,
    command: runResult.command,
    exit_code: runResult.exit_code,
    duration_ms: runResult.duration_ms,
    stdout_preview: String(runResult.stdout || '').slice(0, 500),
    stderr_preview: String(runResult.stderr || '').slice(0, 500),
    run_result_route: `/api/webstudio-artifact-run/${artifact.project_artifact_id}/run_result.json`,
  };
  
  history.runs.unshift(runEntry);
  if (history.runs.length > 20) {
    history.runs = history.runs.slice(0, 20);
  }
  
  history.run_count = (history.run_count || 0) + 1;
  history.last_run_status = runResult.ok ? 'ok' : 'failed';
  history.last_run_at = runResult.created_at;
  
  await fsPromises.writeFile(runHistoryPath, JSON.stringify(history, null, 2), 'utf8');
  return history;
}

async function getRunHistory({ artifact, rootDir }) {
  const artifactRoot = await validateArtifactRoot({ artifact, rootDir });
  const runHistoryPath = path.join(artifactRoot, 'run_history.json');
  
  try {
    const existing = await fsPromises.readFile(runHistoryPath, 'utf8');
    return JSON.parse(existing);
  } catch {
    return {
      artifact_id: artifact.project_artifact_id,
      order_id: artifact.order_id,
      project_type: artifact.project_type,
      scenario: artifact.scenario,
      run_count: 0,
      last_run_status: null,
      last_run_at: null,
      runs: [],
    };
  }
}

async function saveEditedVersion({ artifact, editedSource, runId }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  
  // Create versions directory if it doesn't exist
  await fsPromises.mkdir(versionsDir, { recursive: true });
  
  // Save edited version with timestamp
  const versionFile = path.join(versionsDir, `${runId}.py`);
  const metadataFile = path.join(versionsDir, `${runId}.json`);
  
  await fsPromises.writeFile(versionFile, editedSource, 'utf8');
  await fsPromises.writeFile(metadataFile, JSON.stringify({
    run_id: runId,
    saved_at: nowIso(),
    source_length: editedSource.length,
  }, null, 2), 'utf8');
}

async function listVersions({ artifact }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  
  try {
    const files = await fsPromises.readdir(versionsDir);
    const versions = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const metadataPath = path.join(versionsDir, file);
        const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
        versions.push({
          run_id: metadata.run_id,
          saved_at: metadata.saved_at,
          version_file: file.replace('.json', '.py'),
        });
      }
    }
    
    // Sort by saved_at descending (newest first)
    versions.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
    return versions;
  } catch (err) {
    return [];
  }
}

async function loadVersion({ artifact, runId }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const versionFile = path.join(versionsDir, `${runId}.py`);
  
  try {
    return await fsPromises.readFile(versionFile, 'utf8');
  } catch (err) {
    return null;
  }
}

async function runScriptArtifact({ artifact, rootDir, editedSource }) {
  const artifactRoot = await validateArtifactRoot({ artifact, rootDir });
  
  // Validate editedSource if provided
  if (editedSource !== undefined) {
    if (typeof editedSource !== 'string') {
      throw new Error('edited_source_validation_failed');
    }
    // Basic safety check: ensure it's valid Python-like syntax (no obvious shell injection)
    if (editedSource.includes('`') || editedSource.includes('$(') || editedSource.includes('import os') || editedSource.includes('import sys') || editedSource.includes('subprocess')) {
      throw new Error('edited_source_validation_failed');
    }
  }
  
  const inputFiles = ['sample_input.csv', 'sample_input.txt', 'sample_input.json'];
  let inputFile = null;
  for (const f of inputFiles) {
    try {
      await fs.access(path.join(artifactRoot, f));
      inputFile = f;
      break;
    } catch {}
  }
  
  const command = ['python3', 'script.py'];
  if (inputFile) {
    command.push(inputFile);
  }
  
  // Write edited source to script.py if provided, otherwise use original
  const scriptPath = path.join(artifactRoot, 'script.py');
  let originalScript = null;
  let runId = createRunId(); // Create runId for all runs
  if (editedSource !== undefined) {
    try {
      originalScript = await fsPromises.readFile(scriptPath, 'utf8');
      await fsPromises.writeFile(scriptPath, editedSource, 'utf8');
      // Small delay to ensure file is flushed to disk
      await new Promise(resolve => setTimeout(resolve, 10));
      // Save edited version for persistence
      await saveEditedVersion({ artifact, editedSource, runId });
    } catch (err) {
      throw new Error('failed_to_write_edited_source');
    }
  }
  
  const startTime = Date.now();
  
  return new Promise(async (resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: artifactRoot,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, PYTHONIOENCODING: 'utf-8' },
      timeout: 5000,
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    
    child.on('error', (err) => {
      reject(new Error(`spawn_error:${err.message}`));
    });
    
    child.on('exit', async (code) => {
      const duration_ms = Date.now() - startTime;
      const ok = code === 0;
      
      // Restore original script if we modified it - SYNCHRONOUS to avoid race condition
      if (originalScript !== null) {
        try {
          fs.writeFileSync(scriptPath, originalScript, { encoding: 'utf8' });
        } catch (restoreErr) {
          console.error('Failed to restore original script:', restoreErr);
        }
      }
      
      try {
        const actualOutputPath = path.join(artifactRoot, 'actual_output.txt');
        await fsPromises.writeFile(actualOutputPath, stdout, 'utf8');
        
        const testLogPath = path.join(artifactRoot, 'test_run.log');
        const existingLog = await fsPromises.readFile(testLogPath, 'utf8').catch(() => '');
        const newLogEntry = [
          `--- re-run at ${nowIso()} ---`,
          `command=${command.join(' ')}`,
          `exit_code=${code}`,
          `duration_ms=${duration_ms}`,
          `ok=${ok}`,
          editedSource !== undefined ? `source=edited` : `source=original`,
          '',
        ].join('\n');
        await fsPromises.writeFile(testLogPath, existingLog + '\n' + newLogEntry, 'utf8');
      } catch (logErr) {
        console.error('Failed to write run logs:', logErr);
      }
      
      resolve({
        run_id: runId,
        command,
        exit_code: code,
        stdout,
        stderr,
        duration_ms,
        ok,
      });
    });
  });
}

async function runTelegramBotArtifact({ artifact, rootDir }) {
  const artifactRoot = await validateArtifactRoot({ artifact, rootDir });
  
  const command = ['python3', 'dry_run_test.py'];
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: artifactRoot,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, PYTHONIOENCODING: 'utf-8' },
      timeout: 5000,
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    
    child.on('error', (err) => {
      reject(new Error(`spawn_error:${err.message}`));
    });
    
    child.on('exit', async (code) => {
      const duration_ms = Date.now() - startTime;
      const ok = code === 0;
      
      try {
        const actualOutputPath = path.join(artifactRoot, 'actual_output.txt');
        await fsPromises.writeFile(actualOutputPath, stdout, 'utf8');
        
        const testLogPath = path.join(artifactRoot, 'test_run.log');
        const existingLog = await fsPromises.readFile(testLogPath, 'utf8').catch(() => '');
        const newLogEntry = [
          `--- dry-run re-run at ${nowIso()} ---`,
          `command=${command.join(' ')}`,
          `exit_code=${code}`,
          `duration_ms=${duration_ms}`,
          `ok=${ok}`,
          '',
        ].join('\n');
        await fsPromises.writeFile(testLogPath, existingLog + '\n' + newLogEntry, 'utf8');
      } catch (logErr) {
        console.error('Failed to write run logs:', logErr);
      }
      
      resolve({
        command,
        exit_code: code,
        stdout,
        stderr,
        duration_ms,
        ok,
      });
    });
  });
}

async function runProjectArtifact({ artifactId, rootDir, editedSource }) {
  const artifact = await getProjectArtifact(rootDir, artifactId);
  if (!artifact) {
    throw new Error('artifact_not_found');
  }
  
  const projectType = String(artifact.project_type || '');
  
  let result;
  if (projectType === 'script') {
    result = await runScriptArtifact({ artifact, rootDir, editedSource });
  } else if (projectType === 'telegram_bot') {
    if (editedSource) {
      throw new Error('edited_source_not_supported_for_telegram_bot');
    }
    result = await runTelegramBotArtifact({ artifact, rootDir });
  } else {
    throw new Error(`run_not_supported_for_project_type:${projectType}`);
  }
  
  const runResult = await writeRunResult({ artifact, result });
  const runHistory = await appendRunHistory({ artifact, runResult });
  
  // Update artifact library with run metadata
  try {
    await updateArtifactRunMetadata(rootDir, artifactId, {
      run_count: runHistory.run_count,
      last_run_status: runHistory.last_run_status,
      last_run_at: runHistory.last_run_at,
      last_run_duration_ms: runResult.duration_ms,
    });
  } catch (err) {
    console.error('Failed to update artifact run metadata:', err);
  }
  
  return {
    ok: true,
    run_id: result.run_id || null,
    artifact_id: artifact.project_artifact_id,
    order_id: artifact.order_id,
    project_type: artifact.project_type,
    scenario: artifact.scenario,
    command: result.command,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    stdout: result.stdout,
    stderr: result.stderr,
    run_result_route: `/api/webstudio-artifact-run/${artifact.project_artifact_id}/run_result.json`,
    run_history_route: `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifact.project_artifact_id)}/run-history`,
    updated_files: {
      actual_output: `/api/webstudio-script-artifact/${artifact.order_id}/actual_output.txt`,
      test_run_log: `/api/webstudio-script-artifact/${artifact.order_id}/test_run.log`,
      run_result: `/api/webstudio-artifact-run/${artifact.project_artifact_id}/run_result.json`,
    },
    run_count: runHistory.run_count,
    last_run_status: runHistory.last_run_status,
    next_action: 'review_run_output_or_download_package',
  };
}

module.exports = {
  runProjectArtifact,
  runScriptArtifact,
  runTelegramBotArtifact,
  validateArtifactRoot,
  writeRunResult,
  appendRunHistory,
  getRunHistory,
  saveEditedVersion,
  listVersions,
  loadVersion,
};
