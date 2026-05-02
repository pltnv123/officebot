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
  
  // Find next version number
  const files = await fsPromises.readdir(versionsDir).catch(() => []);
  const versionNumbers = files
    .filter(f => /^v\d{4}\.py$/.test(f))
    .map(f => parseInt(f.slice(1, 5), 10))
    .filter(n => !isNaN(n));
  const nextVersionNum = (versionNumbers.length > 0 ? Math.max(...versionNumbers) : 0) + 1;
  const versionId = `v${String(nextVersionNum).padStart(4, '0')}`;
  
  // Save edited version with vXXXX format
  const versionFile = path.join(versionsDir, `${versionId}.py`);
  const metadataFile = path.join(versionsDir, `${versionId}.json`);
  
  await fsPromises.writeFile(versionFile, editedSource, 'utf8');
  await fsPromises.writeFile(metadataFile, JSON.stringify({
    version_id: versionId,
    run_id: runId,
    label: `Edited version ${nextVersionNum}`,
    source_type: 'operator_edit',
    saved_at: nowIso(),
    source_length: editedSource.length,
  }, null, 2), 'utf8');
  
  return { version_id: versionId };
}

async function listVersions({ artifact }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  
  try {
    const files = await fsPromises.readdir(versionsDir).catch(() => []);
    const versions = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const metadataPath = path.join(versionsDir, file);
        const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
        versions.push({
          version_id: metadata.version_id || file.replace('.json', ''),
          run_id: metadata.run_id || null,
          label: metadata.label || metadata.version_id || file.replace('.json', ''),
          source_type: metadata.source_type || 'unknown',
          saved_at: metadata.saved_at || metadata.created_at,
          version_file: file.replace('.json', '.py'),
        });
      }
    }
    
    // If no versions found, ensure v0001 exists
    if (versions.length === 0) {
      await ensureGeneratedVersion({ artifact, rootDir: artifactRoot });
      // Re-read versions after ensuring v0001
      const filesAfter = await fsPromises.readdir(versionsDir).catch(() => []);
      for (const file of filesAfter) {
        if (file.endsWith('.json')) {
          const metadataPath = path.join(versionsDir, file);
          const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
          versions.push({
            version_id: metadata.version_id || file.replace('.json', ''),
            run_id: metadata.run_id || null,
            label: metadata.label || metadata.version_id || file.replace('.json', ''),
            source_type: metadata.source_type || 'unknown',
            saved_at: metadata.saved_at || metadata.created_at,
            version_file: file.replace('.json', '.py'),
          });
        }
      }
    }
    
    // Sort by version_id ascending (v0001 first)
    versions.sort((a, b) => a.version_id.localeCompare(b.version_id));
    
    // Get current version
    const currentVersionId = await getCurrentVersion({ artifact });
    
    return { versions, current_version_id: currentVersionId };
  } catch (err) {
    return { versions: [], current_version_id: 'v0001' };
  }
}

async function loadVersion({ artifact, versionId }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const versionFile = path.join(versionsDir, `${versionId}.py`);
  
  try {
    return await fsPromises.readFile(versionFile, 'utf8');
  } catch (err) {
    return null;
  }
}

async function ensureGeneratedVersion({ artifact, rootDir }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const v0001File = path.join(versionsDir, 'v0001.py');
  const v0001MetaFile = path.join(versionsDir, 'v0001.json');
  const projectType = artifact.project_type || 'script'; const primaryFileName = projectType === 'telegram_bot' ? 'bot.py' : 'script.py'; const scriptPath = path.join(artifactRoot, primaryFileName);
  
  // Check if v0001 already exists
  try {
    await fsPromises.access(v0001File);
    return { ok: true, version_id: 'v0001', exists: true };
  } catch {}
  
  // Create versions directory
  await fsPromises.mkdir(versionsDir, { recursive: true });
  
  // Read current script.py as generated version
  let generatedSource;
  try {
    generatedSource = await fsPromises.readFile(scriptPath, 'utf8');
  } catch (err) {
    return { ok: false, error: 'script_not_found' };
  }
  
  // Save v0001
  await fsPromises.writeFile(v0001File, generatedSource, 'utf8');
  await fsPromises.writeFile(v0001MetaFile, JSON.stringify({
    version_id: 'v0001',
    label: 'Generated version',
    source_type: 'generated',
    created_at: nowIso(),
    source_length: generatedSource.length,
  }, null, 2), 'utf8');
  
  return { ok: true, version_id: 'v0001', exists: false, created: true };
}

async function saveNewVersion({ artifact, editedSource, versionLabel }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const scriptPath = path.join(artifactRoot, 'script.py');
  
  // Create versions directory if it doesn't exist
  await fsPromises.mkdir(versionsDir, { recursive: true });
  
  // Find next version number
  const files = await fsPromises.readdir(versionsDir).catch(() => []);
  const versionNumbers = files
    .filter(f => /^v\d{4}\.py$/.test(f))
    .map(f => parseInt(f.slice(1, 5), 10))
    .filter(n => !isNaN(n));
  const nextVersionNum = (versionNumbers.length > 0 ? Math.max(...versionNumbers) : 0) + 1;
  const versionId = `v${String(nextVersionNum).padStart(4, '0')}`;
  
  // Save version
  const versionFile = path.join(versionsDir, `${versionId}.py`);
  const metadataFile = path.join(versionsDir, `${versionId}.json`);
  
  await fsPromises.writeFile(versionFile, editedSource, 'utf8');
  await fsPromises.writeFile(metadataFile, JSON.stringify({
    version_id: versionId,
    label: versionLabel || `Edited version ${nextVersionNum}`,
    source_type: 'operator_edit',
    created_at: nowIso(),
    source_length: editedSource.length,
  }, null, 2), 'utf8');
  
  // CRITICAL: Save also sets this version as current and updates script.py
  await fsPromises.writeFile(scriptPath, editedSource, 'utf8');
  
  // Update current_version_id
  const currentVersionIndexPath = path.join(artifactRoot, 'current_version.json');
  await fsPromises.writeFile(currentVersionIndexPath, JSON.stringify({
    current_version_id: versionId,
    updated_at: nowIso(),
  }, null, 2), 'utf8');
  
  return { ok: true, version_id: versionId };
}

async function restoreVersion({ artifact, versionId }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const versionFile = path.join(versionsDir, `${versionId}.py`);
  const scriptPath = path.join(artifactRoot, 'script.py');
  
  // Validate versionId format
  if (!/^v\d{4}$/.test(versionId)) {
    return { ok: false, error: 'invalid_version_id_format' };
  }
  
  // Read version source
  let versionSource;
  try {
    versionSource = await fsPromises.readFile(versionFile, 'utf8');
  } catch (err) {
    return { ok: false, error: 'version_not_found' };
  }
  
  // Restore to script.py
  await fsPromises.writeFile(scriptPath, versionSource, 'utf8');
  
  // Update current_version_id in manifest or state
  const currentVersionIndexPath = path.join(artifactRoot, 'current_version.json');
  await fsPromises.writeFile(currentVersionIndexPath, JSON.stringify({
    current_version_id: versionId,
    restored_at: nowIso(),
  }, null, 2), 'utf8');
  
  return {
    ok: true,
    version_id: versionId,
    source: versionSource,
    script_route: `/api/webstudio-script-artifact/${artifact.order_id}/script.py`,
  };
}

async function getCurrentVersion({ artifact }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const currentVersionIndexPath = path.join(artifactRoot, 'current_version.json');
  
  try {
    const data = JSON.parse(await fsPromises.readFile(currentVersionIndexPath, 'utf8'));
    return data.current_version_id || 'v0001';
  } catch {
    return 'v0001';
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

async function runTelegramBotArtifact({ artifact, rootDir, editedSource }) {
  const artifactRoot = await validateArtifactRoot({ artifact, rootDir });
  
  const command = ['python3', 'dry_run_test.py'];
  const startTime = Date.now();
  
  // Handle edited source before spawn
  let originalBotSource = null;
  if (editedSource !== undefined) {
    if (typeof editedSource !== 'string') {
      throw new Error('edited_source_validation_failed');
    }
    if (editedSource.includes('`') || editedSource.includes('$(') || editedSource.includes('import os') || editedSource.includes('import sys') || editedSource.includes('subprocess')) {
      throw new Error('edited_source_validation_failed');
    }
    const botPath = path.join(artifactRoot, 'bot.py');
    originalBotSource = await fsPromises.readFile(botPath, 'utf8');
    await fsPromises.writeFile(botPath, editedSource, 'utf8');
  }
  
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
      
      // Read actual output first
      const actualOutputPath = path.join(artifactRoot, 'actual_output.txt');
      let actualOutput = stdout;
      try {
        actualOutput = await fsPromises.readFile(actualOutputPath, 'utf8');
      } catch (err) {
        // Use stdout if actual_output.txt doesn't exist
      }
      
      try {
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
      
      // Restore original bot.py if we modified it
      if (originalBotSource !== null) {
        const botPath = path.join(artifactRoot, 'bot.py');
        await fsPromises.writeFile(botPath, originalBotSource, 'utf8');
      }
      
      resolve({
        command,
        exit_code: code,
        stdout: actualOutput,
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
    result = await runTelegramBotArtifact({ artifact, rootDir, editedSource });
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
  runScriptArtifact: runProjectArtifact, // alias
  runTelegramBotArtifact,
  validateArtifactRoot,
  writeRunResult,
  appendRunHistory,
  getRunHistory,
  saveEditedVersion,
  listVersions,
  loadVersion,
  ensureGeneratedVersion,
  saveNewVersion,
  restoreVersion,
  getCurrentVersion,
};
