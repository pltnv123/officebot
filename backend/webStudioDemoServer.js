const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioOrderSurfaceService } = require('./controlPlane/services/webStudio/webStudioOrderSurfaceService');
const { createWebStudioDemoPackagingService } = require('./controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioPrimaryVariantService } = require('./controlPlane/services/webStudio/webStudioPrimaryVariantService');
const { createWebStudioRevisionService } = require('./controlPlane/services/webStudio/webStudioRevisionService');
const { createWebStudioProjectRouterService } = require('./controlPlane/services/webStudio/webStudioProjectRouterService');
const { analyzeScriptScenario, createScriptExecutionPackage, runScriptSmoke } = require('./controlPlane/services/webStudio/webStudioScriptExecutionService');
const { analyzeTelegramBotScenario, createTelegramBotExecutionPackage, runTelegramBotDryRun } = require('./controlPlane/services/webStudio/webStudioTelegramBotExecutionService');
const { registerProjectArtifact, listProjectArtifacts, getProjectArtifact } = require('./controlPlane/services/webStudio/webStudioProjectArtifactLibraryService');
const { runProjectArtifact, getRunHistory, listVersions, loadVersion, ensureGeneratedVersion, saveNewVersion, restoreVersion, getCurrentVersion } = require('./controlPlane/services/webStudio/webStudioArtifactRunService');
const { renderWebStudioDemoPage } = require('./webStudioDemoPage');
const { renderWebStudioDeliveryPage } = require('./webStudioDeliveryPage');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8787);
const SCRIPT_ARTIFACT_ROOT = path.join(ROOT, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-script-artifacts');
const TELEGRAM_BOT_ARTIFACT_ROOT = path.join(ROOT, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-telegram-bot-artifacts');
const ROUTER_RUNTIME_ROOT = path.join(ROOT, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-router-orders');

function nowIso() {
  return new Date().toISOString();
}

function jsonError(res, status, route, error, orderId = null) {
  return res.status(status).json({
    ok: false,
    route,
    order_id: orderId,
    error: String(error?.message || error),
    stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack,
  });
}

function createRouterOrderId() {
  return `ws-order-demo-${String(Date.now())}`;
}

async function writeRouterOrder(orderId, payload) {
  const dirPath = path.join(ROUTER_RUNTIME_ROOT, orderId);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(path.join(dirPath, 'router-order.json'), JSON.stringify(payload, null, 2), 'utf8');
}

async function readScriptManifest(orderId) {
  const manifestPath = path.join(SCRIPT_ARTIFACT_ROOT, orderId, 'manifest.json');
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

async function buildScriptSurface(orderId) {
  const manifest = await readScriptManifest(orderId);
  const files = {
    script: 'script.py',
    readme: 'README.md',
    sample_input: manifest.files.find((name) => name.startsWith('sample_input.')) || null,
    sample_output: 'sample_output.txt',
    actual_output: 'actual_output.txt',
    test_run_log: 'test_run.log',
    manifest: 'manifest.json',
  };
  const safe_routes = Object.fromEntries(Object.entries(files).filter(([, fileName]) => fileName).map(([key, fileName]) => [key, `/api/webstudio-script-artifact/${orderId}/${fileName}`]));
  const testLogText = await fs.readFile(path.join(SCRIPT_ARTIFACT_ROOT, orderId, 'test_run.log'), 'utf8').catch(() => '');
  const commandMatch = testLogText.match(/^command=(.*)$/m);
  const exitCodeMatch = testLogText.match(/^exit_code=(.*)$/m);
  const okMatch = testLogText.match(/^match_expected=(.*)$/m);
  return {
    ok: true,
    surface_kind: 'webstudio_script_surface',
    order_id: orderId,
    project_type: 'script',
    script_execution: {
      scenario: manifest.scenario,
      language: manifest.language,
      safety_level: manifest.safety_level,
      artifact_id: manifest.artifact_id,
      artifact_root: manifest.artifact_root,
      brief: manifest.brief,
    },
    files,
    safe_routes,
    test: {
      ok: okMatch ? okMatch[1].trim() === 'true' : false,
      command: commandMatch ? commandMatch[1].trim() : null,
      exit_code: exitCodeMatch ? Number(exitCodeMatch[1].trim()) : null,
    },
    next_action: 'review_script_package',
  };
}

function pythonZipCreate({ artifactRoot, outputPath, fileNames }) {
  return new Promise((resolve, reject) => {
    const script = [
      'import os, sys, zipfile',
      'root = sys.argv[1]',
      'out = sys.argv[2]',
      'files = sys.argv[3:]',
      'with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:',
      '    for name in files:',
      '        path = os.path.join(root, name)',
      '        if os.path.isfile(path):',
      '            zf.write(path, arcname=name)',
    ].join('\n');
    const child = spawn('python3', ['-c', script, artifactRoot, outputPath, ...fileNames], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr || `zip creation failed with code ${code}`)));
  });
}

function getAllowedPackageFiles(artifact) {
  if (artifact.project_type === 'script') {
    return ['script.py', 'README.md', 'sample_input.csv', 'sample_input.txt', 'sample_input.json', 'sample_output.txt', 'actual_output.txt', 'test_run.log', 'manifest.json'];
  }
  if (artifact.project_type === 'telegram_bot') {
    return ['bot.py', 'README.md', '.env.example', 'sample_update_start.json', 'sample_update_name.json', 'sample_update_phone.json', 'sample_update_service.json', 'sample_update_message.json', 'dry_run_test.py', 'applications.csv', 'actual_output.txt', 'test_run.log', 'manifest.json'];
  }
  return [];
}

async function buildTelegramBotSurface(orderId) {
  const manifestPath = path.join(TELEGRAM_BOT_ARTIFACT_ROOT, orderId, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const files = {
    bot: 'bot.py',
    readme: 'README.md',
    env_example: '.env.example',
    sample_update_start: 'sample_update_start.json',
    sample_update_name: 'sample_update_name.json',
    sample_update_phone: 'sample_update_phone.json',
    sample_update_service: 'sample_update_service.json',
    sample_update_message: 'sample_update_message.json',
    dry_run_test: 'dry_run_test.py',
    applications_csv: 'applications.csv',
    actual_output: 'actual_output.txt',
    test_run_log: 'test_run.log',
    manifest: 'manifest.json',
  };
  const safe_routes = Object.fromEntries(Object.entries(files).map(([key, fileName]) => [key, `/api/webstudio-telegram-bot-artifact/${orderId}/${fileName}`]));
  const testLogText = await fs.readFile(path.join(TELEGRAM_BOT_ARTIFACT_ROOT, orderId, 'test_run.log'), 'utf8').catch(() => '');
  const commandMatch = testLogText.match(/^command=(.*)$/m);
  const exitCodeMatch = testLogText.match(/^exit_code=(.*)$/m);
  const okMatch = testLogText.match(/^match_expected=(.*)$/m);
  return {
    ok: true,
    surface_kind: 'webstudio_telegram_bot_surface',
    order_id: orderId,
    project_type: 'telegram_bot',
    bot_execution: {
      scenario: manifest.scenario,
      language: manifest.language,
      safety_level: manifest.safety_level,
      artifact_id: manifest.artifact_id,
      bot_execution_id: manifest.bot_execution_id,
      artifact_root: manifest.artifact_root,
      brief: manifest.brief,
    },
    files,
    safe_routes,
    test: {
      ok: okMatch ? okMatch[1].trim() === 'true' : false,
      command: commandMatch ? commandMatch[1].trim() : null,
      exit_code: exitCodeMatch ? Number(exitCodeMatch[1].trim()) : null,
    },
    next_action: 'review_telegram_bot_package',
  };
}

async function main() {
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir: ROOT });
  const repositories = adapter.repositories;
  global.__CONTROL_PLANE_REPOSITORIES__ = repositories;

  const webStudioOrderSurfaceService = createWebStudioOrderSurfaceService({ repositories });
  const webStudioDemoPackagingService = createWebStudioDemoPackagingService({ repositories });
  const webStudioPrimaryVariantService = createWebStudioPrimaryVariantService({ repositories });
  const webStudioRevisionService = createWebStudioRevisionService({ repositories });
  const webStudioProjectRouterService = createWebStudioProjectRouterService({ repositories });

  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  app.get('/webstudio/demo', (req, res) => {
    const orderId = String(req.query.orderId || req.query.order_id || '').trim();
    res.type('html').send(renderWebStudioDemoPage({ orderId }));
  });

  app.get('/webstudio/demo/:orderId', (req, res) => {
    res.type('html').send(renderWebStudioDemoPage({ orderId: String(req.params.orderId || '').trim() }));
  });

  app.post('/api/demo/webstudio-order/full-mvp', async (req, res) => {
    try {
      const demo = await webStudioDemoPackagingService.materializeDemoOrderWithThreeVariants({
        raw_brief: req.body?.raw_brief || null,
        client_id: req.body?.client_id || 'demo-client-1',
        source: 'api_demo_webstudio_full_mvp',
        metadata: { actor_role: 'operator' },
      });
      await webStudioPrimaryVariantService.markPrimaryVariantForOrder(demo.order_id, 'B');
      await webStudioPrimaryVariantService.upgradePrimaryVariantBuildQuality(demo.order_id);
      await webStudioPrimaryVariantService.ensurePrimaryRevisionPath(demo.order_id);
      const publicDelivery = await webStudioDemoPackagingService.buildDemoPublicDelivery(demo.order_id);
      res.status(201).json({
        ok: true,
        createdAt: nowIso(),
        order_id: demo.order_id,
        primary_variant_id: publicDelivery.surface?.primary_variant?.variant_id || null,
        public_delivery_id: publicDelivery.bundle?.public_delivery_id || null,
        surface_url: `/api/export/webstudio-order-surface/${demo.order_id}`,
      });
    } catch (error) {
      jsonError(res, 500, '/api/demo/webstudio-order/full-mvp', error, null);
    }
  });

  app.post('/api/demo/webstudio-order/analyze-brief', async (req, res) => {
    try {
      const brief = String(req.body?.brief || '').trim();
      if (!brief) {
        return res.status(400).json({
          ok: false,
          route: '/api/demo/webstudio-order/analyze-brief',
          error: 'brief is required',
        });
      }
      const analysis = webStudioProjectRouterService.analyzeBrief({
        project_type: req.body?.project_type,
        brief,
        desired_deliverable: req.body?.desired_deliverable,
        tech_preference: req.body?.tech_preference,
      });
      const orderId = createRouterOrderId();
      await writeRouterOrder(orderId, {
        created_at: nowIso(),
        order_id: orderId,
        project_type: analysis.project_type,
        normalized_brief: analysis.normalized_brief,
        recommended_workflow: analysis.recommended_workflow,
        required_agents: analysis.required_agents,
        expected_artifacts: analysis.expected_artifacts,
        execution_stages: analysis.execution_stages,
        qa_plan: analysis.qa_plan,
        clarification_questions: analysis.clarification_questions,
        next_action: analysis.project_type === 'script' ? 'execute_script_mvp' : analysis.project_type === 'telegram_bot' ? 'execute_telegram_bot_mvp' : analysis.next_action,
      });
      res.status(201).json({
        ok: true,
        createdAt: nowIso(),
        order_id: orderId,
        project_type: analysis.project_type,
        normalized_brief: analysis.normalized_brief,
        recommended_workflow: analysis.recommended_workflow,
        required_agents: analysis.required_agents,
        expected_artifacts: analysis.expected_artifacts,
        execution_stages: analysis.execution_stages,
        qa_plan: analysis.qa_plan,
        clarification_questions: analysis.clarification_questions,
        next_action: analysis.project_type === 'script' ? 'execute_script_mvp' : analysis.project_type === 'telegram_bot' ? 'execute_telegram_bot_mvp' : analysis.next_action,
        surface_kind: 'project_router_surface',
      });
    } catch (error) {
      jsonError(res, 500, '/api/demo/webstudio-order/analyze-brief', error, null);
    }
  });

  app.post('/api/demo/webstudio-order/execute-script', async (req, res) => {
    try {
      const brief = String(req.body?.brief || '').trim();
      if (!brief) {
        return res.status(400).json({ ok: false, error: 'brief is required', execution_supported: false });
      }
      const analysis = analyzeScriptScenario({ brief, tech_preference: req.body?.tech_preference });
      if (analysis.scenario === 'unsupported') {
        return res.status(200).json({
          ok: false,
          execution_supported: false,
          reason: analysis.reason || 'unsupported_or_unsafe_script_scenario',
          unsupported_reasons: analysis.unsupported_reasons || [],
          recommended_next_action: 'clarify_or_extend_script_executor',
          analysis,
        });
      }
      const orderId = createRouterOrderId();
      const artifactPackage = await createScriptExecutionPackage({
        rootDir: ROOT,
        orderId,
        brief,
        scenario: req.body?.scenario || analysis.scenario,
        analysis,
      });
      const test = await runScriptSmoke({
        artifactRoot: artifactPackage.artifact_root,
        inputFileName: artifactPackage.input_file_name,
      });
      const scriptSurface = await buildScriptSurface(orderId);
      const registeredArtifact = await registerProjectArtifact(ROOT, {
        order_id: orderId,
        project_type: 'script',
        scenario: analysis.scenario,
        title: `Script package · ${analysis.scenario}`,
        status: test.ok ? 'completed' : 'failed',
        test_status: test.ok ? 'ok' : 'needs_review',
        surface_url: `/api/demo/webstudio-order/script-surface/${orderId}`,
        primary_file_routes: Object.values(scriptSurface.safe_routes),
        file_routes: Object.entries(scriptSurface.safe_routes).map(([key, route]) => ({ key, label: scriptSurface.files[key] || key, route })),
        download_url: `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(`ws-project-artifact-script-${orderId}-${String(analysis.scenario).replace(/[^a-zA-Z0-9_-]/g, '-')}`)}/download`,
        source: 'script_executor',
        artifact_root: artifactPackage.artifact_root,
      });
      res.status(201).json({
        ok: true,
        order_id: orderId,
        project_type: 'script',
        scenario: analysis.scenario,
        language: analysis.language,
        safety_level: analysis.safety_level,
        artifact_id: artifactPackage.artifact_id,
        project_artifact_id: registeredArtifact.project_artifact_id,
        artifact_root: artifactPackage.artifact_root,
        files: scriptSurface.files,
        safe_routes: scriptSurface.safe_routes,
        test: {
          ok: test.ok,
          command: test.command,
          exit_code: test.exit_code,
          match_expected: test.match_expected,
        },
        next_action: 'review_script_package',
        surface_kind: 'webstudio_script_surface',
      });
    } catch (error) {
      jsonError(res, 500, '/api/demo/webstudio-order/execute-script', error, null);
    }
  });

  app.get('/api/demo/webstudio-order/script-surface/:orderId', async (req, res) => {
    try {
      const orderId = String(req.params.orderId || '').trim();
      const surface = await buildScriptSurface(orderId);
      res.json(surface);
    } catch (error) {
      res.status(404).json({ ok: false, error: String(error.message || error), surface_kind: 'webstudio_script_surface' });
    }
  });

  app.post('/api/demo/webstudio-order/execute-telegram-bot', async (req, res) => {
    try {
      const brief = String(req.body?.brief || '').trim();
      if (!brief) {
        return res.status(400).json({ ok: false, error: 'brief is required', execution_supported: false });
      }
      const analysis = analyzeTelegramBotScenario({ brief, tech_preference: req.body?.tech_preference });
      if (analysis.scenario === 'unsupported') {
        return res.status(200).json({ ok: false, execution_supported: false, reason: 'unsupported_telegram_bot_scenario', unsupported_reasons: analysis.unsupported_reasons || [], recommended_next_action: 'clarify_or_extend_telegram_bot_executor' });
      }
      const orderId = createRouterOrderId();
      const artifactPackage = await createTelegramBotExecutionPackage({ rootDir: ROOT, orderId, brief, scenario: analysis.scenario });
      const test = await runTelegramBotDryRun({ artifactRoot: artifactPackage.artifact_root });
      const surface = await buildTelegramBotSurface(orderId);
      await registerProjectArtifact(ROOT, {
        order_id: orderId,
        project_type: 'telegram_bot',
        scenario: analysis.scenario,
        title: `Telegram bot package · ${analysis.scenario}`,
        status: test.ok ? 'completed' : 'failed',
        test_status: test.ok ? 'ok' : 'needs_review',
        surface_url: `/api/demo/webstudio-order/telegram-bot-surface/${orderId}`,
        primary_file_routes: Object.values(surface.safe_routes),
        file_routes: Object.entries(surface.safe_routes).map(([key, route]) => ({ key, label: surface.files[key] || key, route })),
        download_url: `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(`ws-project-artifact-telegram_bot-${orderId}-${String(analysis.scenario).replace(/[^a-zA-Z0-9_-]/g, '-')}`)}/download`,
        source: 'telegram_bot_executor',
        artifact_root: artifactPackage.artifact_root,
      });
      res.status(201).json({
        ok: true,
        order_id: orderId,
        project_type: 'telegram_bot',
        scenario: analysis.scenario,
        language: analysis.language,
        safety_level: analysis.safety_level,
        bot_execution_id: artifactPackage.bot_execution_id,
        artifact_id: artifactPackage.artifact_id,
        files: surface.files,
        safe_routes: surface.safe_routes,
        test: { ok: test.ok, command: test.command, exit_code: test.exit_code, match_expected: test.match_expected },
        surface_url: `/api/demo/webstudio-order/telegram-bot-surface/${orderId}`,
        next_action: 'review_telegram_bot_package',
      });
    } catch (error) {
      jsonError(res, 500, '/api/demo/webstudio-order/execute-telegram-bot', error, null);
    }
  });

  app.get('/api/demo/webstudio-order/telegram-bot-surface/:orderId', async (req, res) => {
    try {
      const orderId = String(req.params.orderId || '').trim();
      const surface = await buildTelegramBotSurface(orderId);
      res.json(surface);
    } catch (error) {
      res.status(404).json({ ok: false, error: String(error.message || error), surface_kind: 'webstudio_telegram_bot_surface' });
    }
  });

  app.get('/webstudio/delivery/:artifactId', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      res.type('text/html');
      res.send(renderWebStudioDeliveryPage({ artifact }));
    } catch {
      res.type('text/html');
      res.send(renderWebStudioDeliveryPage({ artifact: null }));
    }
  });

  app.get('/api/demo/webstudio-order/project-artifacts', async (req, res) => {
    try {
      const artifacts = await listProjectArtifacts(ROOT, 50);
      res.json({ ok: true, surface_kind: 'webstudio_project_artifact_library', artifacts });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  app.get('/api/demo/webstudio-order/project-artifact/:artifactId/run-history', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact not found' });
      const history = await getRunHistory({ artifact, rootDir: ROOT });
      res.json({ ok: true, ...history });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  app.get('/api/demo/webstudio-order/project-artifact/:artifactId/download', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact not found' });
      const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
      if (!artifactRoot || !artifactRoot.startsWith(path.resolve(ROOT, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime'))) {
        return res.status(400).json({ ok: false, download_native: false, error: 'zip_export_failed', reason: 'artifact_root_outside_allowed_runtime' });
      }
      const allowedNames = getAllowedPackageFiles(artifact);
      const existingNames = [];
      for (const fileName of allowedNames) {
        const resolved = path.resolve(path.join(artifactRoot, fileName));
        if (!resolved.startsWith(artifactRoot)) continue;
        try { await fs.access(resolved); existingNames.push(fileName); } catch {}
      }
      if (existingNames.length === 0) {
        return res.status(400).json({ ok: false, download_native: false, error: 'zip_export_failed', reason: 'no_exportable_files' });
      }
      const zipPath = path.join(os.tmpdir(), `webstudio-${artifact.project_type}-${artifact.order_id}.zip`);
      await pythonZipCreate({ artifactRoot, outputPath: zipPath, fileNames: existingNames });
      res.type('application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="webstudio-${artifact.project_type}-${artifact.order_id}.zip"`);
      res.sendFile(zipPath, { dotfiles: 'allow' });
    } catch (error) {
      res.status(500).json({ ok: false, download_native: false, error: 'zip_export_failed', reason: String(error.message || error) });
    }
  });

  app.post('/api/demo/webstudio-order/project-artifact/:artifactId/run', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const editedSource = req.body?.edited_source;
      const result = await runProjectArtifact({ artifactId, rootDir: ROOT, editedSource });
      res.status(200).json(result);
    } catch (error) {
      const message = String(error.message || error);
      if (message === 'artifact_not_found') {
        return res.status(404).json({ ok: false, error: 'artifact_not_found', artifact_id: String(req.params.artifactId || '').trim() });
      }
      if (message.startsWith('run_not_supported_for_project_type:')) {
        return res.status(400).json({ ok: false, error: 'run_not_supported', project_type: message.split(':')[1] });
      }
      if (message === 'edited_source_validation_failed') {
        return res.status(400).json({ ok: false, error: 'edited_source_validation_failed', reason: 'edited_source_must_be_valid_python_string' });
      }
      res.status(500).json({ ok: false, error: 'run_failed', reason: message });
    }
  });

  // Script versioning endpoints
  app.get('/api/demo/webstudio-order/project-artifact/:artifactId/versions', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact_not_found' });
      const result = await listVersions({ artifact });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  app.get('/api/demo/webstudio-order/project-artifact/:artifactId/version/:runId', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const runId = String(req.params.runId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact_not_found' });
      const source = await loadVersion({ artifact, runId });
      if (source === null) return res.status(404).json({ ok: false, error: 'version_not_found' });
      res.json({ ok: true, run_id: runId, source });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  app.get('/api/demo/webstudio-order/project-artifact/:artifactId', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact not found' });
      res.json({ ok: true, artifact, file_routes: artifact.file_routes || [], download_url: artifact.download_url || null });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  app.get('/api/webstudio-artifact-run/:artifactId/run_result.json', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact not found' });
      const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
      const runResultPath = path.join(artifactRoot, 'run_result.json');
      await fs.access(runResultPath);
      const runResult = JSON.parse(await fs.readFile(runResultPath, 'utf8'));
      res.json({ ok: true, run_result: runResult });
    } catch (error) {
      res.status(404).json({ ok: false, error: 'run_result_not_found', reason: String(error.message || error) });
    }
  });

  app.get('/api/export/webstudio-order-surface/:orderId', async (req, res) => {
    try {
      const orderId = String(req.params.orderId || '').trim();
      const surface = await webStudioOrderSurfaceService.buildOrderSurface({ order_id: orderId });
      res.json(surface);
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  app.post('/api/demo/webstudio-order/:orderId/select-primary', async (req, res) => {
    try {
      const orderId = String(req.params.orderId || '').trim();
      const surfaceBefore = await webStudioOrderSurfaceService.buildOrderSurface({ order_id: orderId }).catch(() => null);
      if (!surfaceBefore?.order?.order_id) {
        return res.status(404).json({ ok: false, route: 'select-primary', order_id: orderId, error: 'order not found' });
      }
      const primaryVariant = surfaceBefore?.variants?.find((row) => row.branch_name === 'B') || surfaceBefore?.primary_variant || null;
      if (!primaryVariant?.variant_id || primaryVariant?.branch_name !== 'B') {
        return res.status(404).json({ ok: false, route: 'select-primary', order_id: orderId, error: 'primary variant B not found' });
      }
      const result = await webStudioPrimaryVariantService.ensurePrimaryRevisionPath(orderId);
      res.json({
        ok: true,
        order_id: orderId,
        selected_variant_id: result.selected_variant_id || primaryVariant.variant_id,
        selected_variant_branch: 'B',
        surface_url: `/api/export/webstudio-order-surface/${orderId}`,
      });
    } catch (error) {
      jsonError(res, 500, 'select-primary', error, String(req.params.orderId || '').trim() || null);
    }
  });

  app.post('/api/demo/webstudio-order/:orderId/revision', async (req, res) => {
    try {
      const orderId = String(req.params.orderId || '').trim();
      const deltaBrief = req.body?.delta_brief || req.body?.deltaBrief || null;
      if (!deltaBrief || (typeof deltaBrief === 'string' && !deltaBrief.trim()) || (typeof deltaBrief === 'object' && Object.keys(deltaBrief).length === 0)) {
        return res.status(400).json({ ok: false, route: '/api/demo/webstudio-order/:orderId/revision', order_id: orderId, error: 'delta_brief is required' });
      }
      await webStudioPrimaryVariantService.ensurePrimaryRevisionPath(orderId);
      const primary = await webStudioPrimaryVariantService.getPrimaryVariantForOrder(orderId);
      const revision = await webStudioRevisionService.createRevisionRequest(orderId, primary.primary_variant.variant_id, deltaBrief);
      res.status(201).json({ ok: true, order_id: orderId, revision_request_id: revision.revision_request_id, selected_variant_id: revision.selected_variant_id });
    } catch (error) {
      jsonError(res, 500, '/api/demo/webstudio-order/:orderId/revision', error, String(req.params.orderId || '').trim() || null);
    }
  });

  app.post('/api/demo/webstudio-order/:orderId/execute-revision', async (req, res) => {
    try {
      const orderId = String(req.params.orderId || '').trim();
      const surfaceBefore = await webStudioOrderSurfaceService.buildOrderSurface({ order_id: orderId });
      if (!surfaceBefore?.latest_revision_request?.revision_request_id) {
        return res.status(400).json({ ok: false, route: '/api/demo/webstudio-order/:orderId/execute-revision', order_id: orderId, error: 'Revision request missing. Submit revision first.' });
      }
      const execution = await webStudioDemoPackagingService.executeDemoRevision(orderId);
      await webStudioDemoPackagingService.runDemoRevisionBrowserQA(orderId);
      const publicDelivery = await webStudioDemoPackagingService.buildDemoPublicDelivery(orderId);
      res.json({
        ok: true,
        order_id: orderId,
        revision_request_id: surfaceBefore.latest_revision_request.revision_request_id,
        revised_build_artifact_id: execution.execution?.revised_build_artifact?.build_artifact_id || null,
        surface_url: `/api/export/webstudio-order-surface/${orderId}`,
        revised_preview_path: publicDelivery.bundle?.revised_preview?.published_html_path || null,
      });
    } catch (error) {
      jsonError(res, 500, '/api/demo/webstudio-order/:orderId/execute-revision', error, String(req.params.orderId || '').trim() || null);
    }
  });

  app.get('/api/webstudio-script-artifact/:orderId/:fileName', async (req, res) => {
    const orderId = String(req.params.orderId || '').trim();
    const fileName = String(req.params.fileName || '').trim();
    const allowedFiles = new Set(['script.py', 'README.md', 'sample_input.csv', 'sample_input.txt', 'sample_input.json', 'sample_output.txt', 'actual_output.txt', 'test_run.log', 'manifest.json']);
    const orderIdOk = /^ws-order-[A-Za-z0-9_-]+$/.test(orderId);
    if (!orderIdOk || !allowedFiles.has(fileName) || fileName.includes('..') || fileName.includes('/') || path.isAbsolute(fileName)) return res.status(400).json({ ok: false, error: 'invalid script artifact path', order_id: orderId || null, file_name: fileName || null });
    const artifactRoot = path.join(ROOT, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-script-artifacts', orderId);
    const resolvedRoot = path.resolve(artifactRoot);
    const resolvedFile = path.resolve(path.join(artifactRoot, fileName));
    if (!(resolvedFile === resolvedRoot + path.sep + fileName || resolvedFile === path.join(resolvedRoot, fileName))) return res.status(400).json({ ok: false, error: 'invalid script artifact path', order_id: orderId, file_name: fileName });
    try { await fs.access(resolvedFile); } catch { return res.status(404).json({ ok: false, error: 'script artifact file not found', order_id: orderId, file_name: fileName }); }
    if (fileName.endsWith('.py')) res.type('text/plain');
    else if (fileName.endsWith('.md')) res.type('text/markdown');
    else if (fileName.endsWith('.csv')) res.type('text/csv');
    else if (fileName.endsWith('.json')) res.type('application/json');
    else if (fileName.endsWith('.txt') || fileName.endsWith('.log')) res.type('text/plain');
    res.sendFile(resolvedFile);
  });

  app.get('/api/webstudio-telegram-bot-artifact/:orderId/:fileName', async (req, res) => {
    const orderId = String(req.params.orderId || '').trim();
    const fileName = String(req.params.fileName || '').trim();
    const allowedFiles = new Set(['bot.py', 'README.md', '.env.example', 'sample_update_start.json', 'sample_update_name.json', 'sample_update_phone.json', 'sample_update_service.json', 'sample_update_message.json', 'dry_run_test.py', 'applications.csv', 'actual_output.txt', 'test_run.log', 'manifest.json']);
    const orderIdOk = /^ws-order-[A-Za-z0-9_-]+$/.test(orderId);
    if (!orderIdOk || !allowedFiles.has(fileName) || fileName.includes('..') || fileName.includes('/') || path.isAbsolute(fileName)) return res.status(400).json({ ok: false, error: 'invalid telegram bot artifact path', order_id: orderId || null, file_name: fileName || null });
    const artifactRoot = path.join(TELEGRAM_BOT_ARTIFACT_ROOT, orderId);
    const resolvedRoot = path.resolve(artifactRoot);
    const resolvedFile = path.resolve(path.join(artifactRoot, fileName));
    if (!(resolvedFile === resolvedRoot + path.sep + fileName || resolvedFile === path.join(resolvedRoot, fileName))) return res.status(400).json({ ok: false, error: 'invalid telegram bot artifact path', order_id: orderId, file_name: fileName });
    try { await fs.access(resolvedFile); } catch { return res.status(404).json({ ok: false, error: 'telegram bot artifact file not found', order_id: orderId, file_name: fileName }); }
    if (fileName.endsWith('.py')) res.type('text/plain');
    else if (fileName.endsWith('.md')) res.type('text/markdown');
    else if (fileName.endsWith('.example')) res.type('text/plain');
    else if (fileName.endsWith('.json')) res.type('application/json');
    else if (fileName.endsWith('.csv')) res.type('text/csv');
    else if (fileName.endsWith('.txt') || fileName.endsWith('.log')) res.type('text/plain');
    try {
      res.sendFile(resolvedFile, { dotfiles: 'allow' });
    } catch (error) {
      return res.status(404).json({ ok: false, error: String(error.message || error), order_id: orderId, file_name: fileName });
    }
  });

  app.get('/api/webstudio-preview/:orderId/:artifactId/:fileName', async (req, res) => {
    const orderId = String(req.params.orderId || '').trim();
    const artifactId = String(req.params.artifactId || '').trim();
    const fileName = String(req.params.fileName || '').trim();
    const allowedFiles = new Set(['index.html', 'styles.css', 'manifest.json', 'snapshot.json']);
    const orderIdOk = /^ws-order-[A-Za-z0-9_-]+$/.test(orderId);
    const artifactIdOk = /^ws-[A-Za-z0-9_-]+$/.test(artifactId);
    if (!orderIdOk || !artifactIdOk || !allowedFiles.has(fileName) || fileName.includes('..') || fileName.includes('/') || path.isAbsolute(fileName)) {
      return res.status(400).json({ ok: false, error: 'invalid preview path', order_id: orderId || null, artifact_id: artifactId || null, file_name: fileName || null });
    }
    const previewRoot = path.join(ROOT, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-public-previews', orderId, artifactId);
    const resolvedRoot = path.resolve(previewRoot);
    const resolvedFile = path.resolve(path.join(previewRoot, fileName));
    if (!(resolvedFile === resolvedRoot + path.sep + fileName || resolvedFile === path.join(resolvedRoot, fileName))) {
      return res.status(400).json({ ok: false, error: 'invalid preview path', order_id: orderId, artifact_id: artifactId, file_name: fileName });
    }
    try {
      await fs.access(resolvedFile);
    } catch {
      return res.status(404).json({ ok: false, error: 'preview file not found', order_id: orderId, artifact_id: artifactId, file_name: fileName });
    }
    if (fileName.endsWith('.html')) res.type('html');
    else if (fileName.endsWith('.css')) res.type('css');
    else if (fileName.endsWith('.json')) res.type('json');
    res.sendFile(resolvedFile);
  });

  app.get('/api/webstudio-preview', async (req, res) => {
    const targetPath = String(req.query.path || '').trim();
    if (!targetPath || targetPath.includes('..') || path.isAbsolute(targetPath)) {
      return res.status(400).send('invalid preview path');
    }
    const resolved = path.resolve(ROOT, targetPath);
    const allowedRoot = path.resolve(ROOT, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime');
    if (!resolved.startsWith(allowedRoot)) {
      return res.status(403).send('preview path outside allowed root');
    }
    try {
      const html = await fs.readFile(resolved, 'utf8');
      res.type('html').send(html);
    } catch {
      res.status(404).send('preview not found');
    }
  });

  // Ensure generated version (v0001)
  app.post('/api/demo/webstudio-order/project-artifact/:artifactId/ensure-generated-version', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact_not_found' });
      const result = await ensureGeneratedVersion({ artifact, rootDir: ROOT });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  // Save new version from editor
  app.post('/api/demo/webstudio-order/project-artifact/:artifactId/script-version', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const { edited_source, version_label } = req.body || {};
      if (!edited_source) return res.status(400).json({ ok: false, error: 'edited_source_required' });
      
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact_not_found' });
      
      // Validate edited source
      if (typeof edited_source !== 'string') {
        return res.status(400).json({ ok: false, error: 'edited_source_validation_failed' });
      }
      if (edited_source.includes('`') || edited_source.includes('$(') || edited_source.includes('import os') || edited_source.includes('import sys') || edited_source.includes('subprocess')) {
        return res.status(400).json({ ok: false, error: 'edited_source_validation_failed', reason: 'unsafe_python_source' });
      }
      
      const result = await saveNewVersion({ artifact, editedSource: edited_source, versionLabel: version_label });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  // Restore version
  app.post('/api/demo/webstudio-order/project-artifact/:artifactId/script-version/:versionId/restore', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const versionId = String(req.params.versionId || '').trim();
      
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact_not_found' });
      
      const result = await restoreVersion({ artifact, versionId });
      if (!result.ok) return res.status(404).json(result);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  // Get current version
  app.get('/api/demo/webstudio-order/project-artifact/:artifactId/current-version', async (req, res) => {
    try {
      const artifactId = String(req.params.artifactId || '').trim();
      const artifact = await getProjectArtifact(ROOT, artifactId);
      if (!artifact) return res.status(404).json({ ok: false, error: 'artifact_not_found' });
      const currentVersionId = await getCurrentVersion({ artifact });
      res.json({ ok: true, current_version_id: currentVersionId });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error.message || error) });
    }
  });

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[webstudio-demo-server] listening on 127.0.0.1:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
