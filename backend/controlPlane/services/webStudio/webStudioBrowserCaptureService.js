const fs = require('fs/promises');
const path = require('path');

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function toFileUrl(filePath) {
  return `file://${String(filePath)}`;
}

function captureRoot(rootDir, orderId, branchName) {
  return path.join(
    rootDir,
    'backend',
    'controlPlane',
    'storage',
    '.first-governed-workflow-runtime',
    'webstudio-browser-captures',
    orderId,
    String(branchName).toLowerCase(),
  );
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function safeReadJson(jsonPath) {
  try {
    return JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  } catch {
    return null;
  }
}

async function detectBrowserCaptureCapability(options = {}) {
  const providerOverride = options.providerOverride || null;
  if (providerOverride) {
    return {
      available: Boolean(providerOverride.available),
      provider: providerOverride.provider || 'override',
      reason: providerOverride.reason || 'provider override supplied',
      command: providerOverride.command || null,
    };
  }

  const candidates = [
    { name: 'playwright', provider: 'playwright_local_capture' },
    { name: 'playwright-core', provider: 'playwright_local_capture' },
    { name: 'puppeteer', provider: 'puppeteer_local_capture' },
  ];

  for (const candidate of candidates) {
    try {
      const resolved = require.resolve(candidate.name, { paths: [options.rootDir || process.cwd()] });
      return {
        available: true,
        provider: candidate.provider,
        reason: `module resolved: ${candidate.name}`,
        command: resolved,
      };
    } catch {
      // continue
    }
  }

  return {
    available: false,
    provider: null,
    reason: 'No repo-local Playwright/Puppeteer module resolved; bounded preview-target evidence only.',
    command: null,
  };
}

async function writeSnapshotArtifact(rootDir, orderId, branchName, snapshotData) {
  const dir = captureRoot(rootDir, orderId, branchName);
  await fs.mkdir(dir, { recursive: true });
  const snapshotPath = path.join(dir, 'snapshot.json');
  await fs.writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf8');
  return snapshotPath;
}

async function writeScreenshotArtifact(rootDir, orderId, branchName, buffer) {
  const dir = captureRoot(rootDir, orderId, branchName);
  await fs.mkdir(dir, { recursive: true });
  const screenshotPath = path.join(dir, 'screenshot.png');
  await fs.writeFile(screenshotPath, buffer);
  return screenshotPath;
}

function buildChecks({ htmlExists, manifestOk, capability, screenshotExists, snapshotExists, htmlContent, browserNative, sourceRef }) {
  const hasPrimaryCta = /Оставить заявку|cta-button|class="cta"/i.test(htmlContent || '');
  const hasTrustBlock = /Почему нам доверяют|trust-block/i.test(htmlContent || '');

  return [
    {
      check_id: 'preview_target_exists',
      name: 'Preview target exists',
      status: htmlExists ? 'passed' : 'failed',
      severity: 'critical',
      notes: htmlExists ? 'Variant HTML preview target exists.' : 'Variant HTML preview target is missing.',
      evidence_ref: sourceRef,
    },
    {
      check_id: 'build_manifest_exists',
      name: 'Build manifest exists',
      status: manifestOk ? 'passed' : 'failed',
      severity: 'critical',
      notes: manifestOk ? 'Manifest file exists and parsed successfully.' : 'Manifest file missing or unparseable.',
      evidence_ref: sourceRef,
    },
    {
      check_id: 'browser_capture_available',
      name: 'Browser capture availability',
      status: capability.available ? (browserNative && screenshotExists ? 'passed' : 'failed') : 'needs_review',
      severity: 'major',
      notes: capability.available ? `Capture provider detected: ${capability.provider}` : capability.reason,
      evidence_ref: sourceRef,
    },
    {
      check_id: 'screenshot_captured',
      name: 'Screenshot captured',
      status: screenshotExists ? 'passed' : (browserNative ? 'failed' : 'needs_review'),
      severity: 'major',
      notes: screenshotExists ? 'Screenshot artifact exists.' : 'No real screenshot artifact was produced in this run.',
      evidence_ref: sourceRef,
    },
    {
      check_id: 'snapshot_captured',
      name: 'Snapshot captured',
      status: snapshotExists ? 'passed' : 'needs_review',
      severity: 'minor',
      notes: snapshotExists ? 'Snapshot metadata artifact exists.' : 'Snapshot artifact not captured.',
      evidence_ref: sourceRef,
    },
    {
      check_id: 'responsive_structure',
      name: 'Responsive structure',
      status: browserNative && screenshotExists ? 'passed' : 'needs_review',
      severity: 'major',
      notes: browserNative && screenshotExists ? 'Real browser capture completed for preview target.' : 'No viewport automation proved responsive structure yet.',
      evidence_ref: sourceRef,
    },
    {
      check_id: 'primary_cta_presence',
      name: 'Primary CTA presence',
      status: hasPrimaryCta ? 'passed' : 'failed',
      severity: 'major',
      notes: hasPrimaryCta ? 'CTA detected in generated HTML.' : 'CTA not detected in generated HTML.',
      evidence_ref: sourceRef,
    },
    {
      check_id: 'trust_block_presence',
      name: 'Trust block presence',
      status: hasTrustBlock ? 'passed' : 'failed',
      severity: 'major',
      notes: hasTrustBlock ? 'Trust block detected in generated HTML.' : 'Trust block not detected in generated HTML.',
      evidence_ref: sourceRef,
    },
    {
      check_id: 'accessibility_basic',
      name: 'Accessibility basic',
      status: 'needs_review',
      severity: 'minor',
      notes: 'No automated accessibility check is wired in WEBSTUDIO-006.',
      evidence_ref: sourceRef,
    },
  ];
}

function deriveStatus(checks) {
  if (checks.some((check) => check.status === 'failed' && check.severity === 'critical')) return 'failed';
  if (checks.some((check) => check.status === 'failed')) return 'failed';
  if (checks.some((check) => check.status === 'needs_review')) return 'needs_review';
  return 'passed';
}

function createWebStudioBrowserCaptureService({ repositories, rootDir } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioTaskFlowBindings || !repositories.webStudioChildSessions || !repositories.webStudioBuildArtifacts || !repositories.webStudioBrowserQAEvidence || !repositories.webStudioQAResults) {
    throw new Error('webStudioBrowserCaptureService requires webStudio repositories');
  }
  if (!rootDir) {
    throw new Error('webStudioBrowserCaptureService requires rootDir');
  }

  async function attachEvidenceToQAResult(variantId, browserEvidenceId, checks, evidenceStatus, capturePayload) {
    const qaResults = await repositories.webStudioQAResults.listQAResultsByVariantId({ variant_id: variantId });
    const current = qaResults[0] || null;
    if (!current) throw new Error(`QA result not found for variant: ${variantId}`);

    return repositories.webStudioQAResults.updateQAResultById({
      qa_result_id: current.qa_result_id,
      patch: {
        browser_evidence_id: browserEvidenceId,
        browser_checks_summary: {
          browser_evidence_id: browserEvidenceId,
          total_checks: checks.length,
          passed_checks: checks.filter((check) => check.status === 'passed').length,
          needs_review_checks: checks.filter((check) => check.status === 'needs_review').length,
          failed_checks: checks.filter((check) => check.status === 'failed').length,
        },
        browser_qa_status: evidenceStatus,
        browser_evidence: {
          mode: capturePayload.source,
          screenshot_path: capturePayload.screenshot_path || null,
          snapshot_path: capturePayload.snapshot_path || null,
          trace_path: capturePayload.trace_path || null,
          preview_path: capturePayload.preview_path || null,
          html_path: capturePayload.html_path || null,
          build_artifact_id: capturePayload.build_artifact_id || null,
          capture_status: capturePayload.capture_status || null,
          browser_native: capturePayload.browser_native || false,
          note: capturePayload.capability_reason || null,
        },
        updated_at: nowIso(),
      },
    });
  }

  return Object.freeze({
    detectBrowserCaptureCapability: (options = {}) => detectBrowserCaptureCapability({ ...options, rootDir }),
    writeSnapshotArtifact: (orderId, branchName, snapshotData) => writeSnapshotArtifact(rootDir, orderId, branchName, snapshotData),
    writeScreenshotArtifact: (orderId, branchName, buffer) => writeScreenshotArtifact(rootDir, orderId, branchName, buffer),

    async captureBrowserEvidenceForVariant(orderId, variantId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) throw new Error(`WebStudio order not found: ${orderId}`);

      const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      if (!binding) throw new Error(`TaskFlow binding missing for order: ${orderId}`);

      const variant = await repositories.webStudioVariants.getVariantById({ variant_id: variantId });
      if (!variant) throw new Error(`WebStudio variant not found: ${variantId}`);
      if (variant.order_id !== orderId) throw new Error(`Variant does not belong to order: ${variantId}`);

      const childSession = await repositories.webStudioChildSessions.getChildSessionByVariantId({ variant_id: variantId });
      if (!childSession) throw new Error(`Child session missing for variant: ${variantId}`);

      const buildArtifact = await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: variantId });
      if (!buildArtifact) throw new Error(`Build artifact missing for variant: ${variantId}`);

      const htmlPath = buildArtifact.html_path;
      const previewPath = buildArtifact.preview_path || htmlPath;
      const manifestPath = buildArtifact.manifest_path || null;
      const htmlExists = await pathExists(htmlPath);
      if (!htmlExists) throw new Error(`Build artifact HTML path missing: ${htmlPath}`);

      const manifest = manifestPath ? await safeReadJson(manifestPath) : null;
      const manifestOk = Boolean(manifest);
      const htmlContent = await fs.readFile(htmlPath, 'utf8');
      const capability = await detectBrowserCaptureCapability({ ...options, rootDir });
      const browserTarget = toFileUrl(htmlPath);

      let screenshotPath = null;
      let tracePath = null;
      let browserNative = false;
      let captureStatus = capability.available ? 'failed' : 'not_available';
      let captureProvider = capability.provider;
      let source = capability.available ? capability.provider : 'bounded_preview_target_browser_evidence';
      let limitations = [];
      let risks = [];

      const snapshotPayload = {
        order_id: orderId,
        variant_id: variantId,
        branch_name: variant.branch_name,
        browser_target: browserTarget,
        preview_path: previewPath,
        html_path: htmlPath,
        build_artifact_id: buildArtifact.build_artifact_id,
        capture_provider: capability.provider,
        capture_capability: capability,
        captured_at: nowIso(),
        title: variant.headline || variant.concept_summary || variant.branch_name,
        viewport: null,
      };
      const snapshotPath = await writeSnapshotArtifact(rootDir, orderId, variant.branch_name, snapshotPayload);

      if (capability.available) {
        limitations.push('Browser provider resolved but active screenshot execution is not wired in this bounded slice.');
        risks.push('Real browser launch path is intentionally not assumed without proven repo-local capture harness.');
      } else {
        limitations.push('No repo-local Playwright/Puppeteer module resolved, so only bounded preview-target evidence was persisted.');
        risks.push('Real screenshot evidence is unavailable until a proven browser capture provider is added to the repo/runtime.');
      }

      const checks = buildChecks({
        htmlExists,
        manifestOk,
        capability,
        screenshotExists: Boolean(screenshotPath && await pathExists(screenshotPath)),
        snapshotExists: Boolean(snapshotPath && await pathExists(snapshotPath)),
        htmlContent,
        browserNative,
        sourceRef: snapshotPath || htmlPath,
      });
      const evidenceStatus = deriveStatus(checks);

      let browserEvidence = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceByVariantId({ variant_id: variantId });
      const now = nowIso();
      const patch = {
        order_id: orderId,
        variant_id: variantId,
        branch_name: variant.branch_name,
        qa_result_id: browserEvidence?.qa_result_id || null,
        child_session_id: childSession.child_session_id,
        child_agent_id: childSession.child_agent_id,
        child_workspace_key: childSession.child_workspace_key,
        governed_flow_id: binding.governed_flow_id,
        taskflow_id: binding.taskflow_id,
        binding_id: binding.binding_id,
        build_artifact_id: buildArtifact.build_artifact_id,
        html_path: htmlPath,
        preview_path: previewPath,
        browser_target: browserTarget,
        screenshot_path: screenshotPath,
        snapshot_path: snapshotPath,
        trace_path: tracePath,
        capture_provider: captureProvider,
        capture_capability: capability,
        capture_status: captureStatus,
        browser_native: browserNative,
        source,
        checks,
        status: evidenceStatus,
        risks,
        limitations,
        captured_at: now,
        updated_at: now,
      };

      if (!browserEvidence) {
        const qaResults = await repositories.webStudioQAResults.listQAResultsByVariantId({ variant_id: variantId });
        const qaResult = qaResults[0] || null;
        if (!qaResult) throw new Error(`QA result missing for variant: ${variantId}`);
        browserEvidence = await repositories.webStudioBrowserQAEvidence.createBrowserEvidence({
          browser_evidence: {
            browser_evidence_id: `ws-browser-evidence-${orderId}-${String(variant.branch_name).toLowerCase()}`,
            created_at: now,
            qa_result_id: qaResult.qa_result_id,
            evidence_artifacts: [],
            migration_target: 'Proven local browser capture or OpenClaw browser automation',
            ...patch,
          },
        });
      } else {
        browserEvidence = await repositories.webStudioBrowserQAEvidence.updateBrowserEvidenceById({
          browser_evidence_id: browserEvidence.browser_evidence_id,
          patch,
        });
      }

      await attachEvidenceToQAResult(variantId, browserEvidence.browser_evidence_id, checks, evidenceStatus, {
        ...patch,
        capability_reason: capability.reason,
      });

      await repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          browser_evidence_id: browserEvidence.browser_evidence_id,
          browser_qa_status: evidenceStatus,
          browser_native: browserNative,
          screenshot_path: screenshotPath,
          snapshot_path: snapshotPath,
          capture_status: captureStatus,
          build_artifact_id: buildArtifact.build_artifact_id,
          preview_path: previewPath,
          html_path: htmlPath,
          updated_at: nowIso(),
        },
      });

      return browserEvidence;
    },

    async captureBrowserEvidenceForOrderVariants(orderId, options = {}) {
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      if (variants.length !== 3) throw new Error(`Expected exactly 3 variants for order: ${orderId}`);

      const childSessions = await repositories.webStudioChildSessions.listChildSessionsByOrderId({ order_id: orderId });
      if (childSessions.length !== 3) throw new Error(`Expected exactly 3 child sessions for order: ${orderId}`);

      const buildArtifacts = await repositories.webStudioBuildArtifacts.listBuildArtifactsByOrderId({ order_id: orderId });
      if (buildArtifacts.length !== 3) throw new Error(`Expected exactly 3 build artifacts for order: ${orderId}`);

      const rows = [];
      for (const variant of [...variants].sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)))) {
        rows.push(await this.captureBrowserEvidenceForVariant(orderId, variant.variant_id, options));
      }
      return rows;
    },
  });
}

module.exports = {
  createWebStudioBrowserCaptureService,
  detectBrowserCaptureCapability,
};
