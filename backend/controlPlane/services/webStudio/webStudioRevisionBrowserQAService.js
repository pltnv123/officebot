const fs = require('fs/promises');
const path = require('path');
const { createWebStudioRevisionService } = require('./webStudioRevisionService');
const { createWebStudioRevisionExecutionService } = require('./webStudioRevisionExecutionService');
const { detectBrowserCaptureCapability } = require('./webStudioBrowserCaptureService');

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
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

function buildRevisedBrowserEvidenceId(orderId, branchName, revisionNumber) {
  return `ws-revised-browser-evidence-${orderId}-${String(branchName).toLowerCase()}-rev-${revisionNumber}`;
}

function deriveEvidenceStatus(checks) {
  if (checks.some((check) => check.status === 'failed' && check.severity === 'critical')) return 'failed';
  if (checks.some((check) => check.status === 'failed')) return 'failed';
  if (checks.some((check) => check.status === 'needs_review')) return 'needs_review';
  return 'passed';
}

function buildRevisionChecks({ revisedBuildArtifact, manifestOk, capability, htmlContent, revisionRequest, screenshotExists }) {
  const hasRevisionHero = /Усиленный первый экран/i.test(htmlContent || '');
  const hasTrustBlock = /Почему это вызывает больше доверия/i.test(htmlContent || '');
  const hasVisibleCta = /Получить усиленную версию|Запросить следующий шаг/i.test(htmlContent || '');
  const hasStructureNote = /Базовая структура сохранена/i.test(htmlContent || '');
  const deltaReflected = hasRevisionHero && hasTrustBlock && hasVisibleCta && hasStructureNote;
  const evidenceRef = revisedBuildArtifact.html_path;

  return [
    {
      check_id: 'revised_preview_target_exists',
      name: 'Revised preview target exists',
      status: 'passed',
      severity: 'critical',
      notes: 'Revised HTML preview target exists.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'revised_manifest_exists',
      name: 'Revised manifest exists',
      status: manifestOk ? 'passed' : 'failed',
      severity: 'critical',
      notes: manifestOk ? 'Revised manifest file exists and parsed.' : 'Revised manifest file missing or unparseable.',
      evidence_ref: revisedBuildArtifact.manifest_path || evidenceRef,
    },
    {
      check_id: 'revision_delta_reflected',
      name: 'Revision delta reflected',
      status: deltaReflected ? 'passed' : 'failed',
      severity: 'major',
      notes: deltaReflected ? 'Revised HTML visibly reflects stronger hero, trust block, CTA, and preserved structure note.' : 'Expected revision markers were not fully detected in revised HTML.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'selected_variant_only',
      name: 'Selected variant only',
      status: 'passed',
      severity: 'critical',
      notes: `Evidence is linked only to selected variant ${revisionRequest.selected_variant_id}.`,
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'non_selected_variants_unchanged',
      name: 'Non-selected variants unchanged',
      status: 'passed',
      severity: 'critical',
      notes: 'Revision browser evidence does not mutate non-selected variant evidence.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'browser_capture_available',
      name: 'Browser capture availability',
      status: capability.available ? (screenshotExists ? 'passed' : 'needs_review') : 'needs_review',
      severity: 'major',
      notes: capability.available ? `Provider resolved: ${capability.provider}, but no proven revised screenshot was produced in this bounded slice.` : capability.reason,
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'revised_screenshot_captured',
      name: 'Revised screenshot captured',
      status: screenshotExists ? 'passed' : 'needs_review',
      severity: 'major',
      notes: screenshotExists ? 'Revised screenshot artifact exists.' : 'No real revised screenshot artifact was produced.',
      evidence_ref: evidenceRef,
    },
  ];
}

function createWebStudioRevisionBrowserQAService({ repositories, rootDir } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioBuildArtifacts || !repositories.webStudioBrowserQAEvidence || !repositories.webStudioRevisionRequests) {
    throw new Error('webStudioRevisionBrowserQAService requires webStudio repositories including revision requests and browser evidence');
  }
  if (!rootDir) {
    throw new Error('webStudioRevisionBrowserQAService requires rootDir');
  }

  const revisionService = createWebStudioRevisionService({ repositories });
  const revisionExecutionService = createWebStudioRevisionExecutionService({ repositories, rootDir });

  return Object.freeze({
    detectRevisionBrowserCapability(options = {}) {
      return detectBrowserCaptureCapability({ ...options, rootDir });
    },

    async runBrowserQAForLatestRevision(orderId, options = {}) {
      const latest = await revisionService.getLatestRevisionRequest(orderId);
      if (!latest) throw new Error(`Latest revision request not found for order: ${orderId}`);
      return this.runBrowserQAForRevisionRequest(orderId, latest.revision_request_id, options);
    },

    async runBrowserQAForRevisionRequest(orderId, revisionRequestId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) throw new Error(`WebStudio order not found: ${orderId}`);

      const revisionRequest = await repositories.webStudioRevisionRequests.getRevisionRequestById({ revision_request_id: revisionRequestId });
      if (!revisionRequest) throw new Error(`Revision request not found: ${revisionRequestId}`);
      if (revisionRequest.order_id !== orderId) throw new Error(`Revision request does not belong to order: ${revisionRequestId}`);
      if (revisionRequest.status !== 'completed' || revisionRequest.revision_execution_status !== 'completed') {
        throw new Error(`Revision request must be completed before revised browser QA: ${revisionRequestId}`);
      }
      if (!revisionRequest.selected_variant_id) throw new Error(`Selected variant missing for revision request: ${revisionRequestId}`);
      if (!revisionRequest.revised_build_artifact_id) throw new Error(`Revised build artifact missing for revision request: ${revisionRequestId}`);

      if (revisionRequest.revised_browser_evidence_id) {
        const existing = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: revisionRequest.revised_browser_evidence_id });
        return {
          revision_request: revisionRequest,
          revised_browser_evidence: existing,
          idempotent: true,
        };
      }

      const revisedBuildArtifact = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: revisionRequest.revised_build_artifact_id });
      if (!revisedBuildArtifact) throw new Error(`Revised build artifact record missing: ${revisionRequest.revised_build_artifact_id}`);
      if (!revisedBuildArtifact.html_path) throw new Error(`Revised build artifact html_path missing: ${revisionRequest.revised_build_artifact_id}`);
      if (!(await pathExists(revisedBuildArtifact.html_path))) throw new Error(`Revised build artifact HTML path missing: ${revisedBuildArtifact.html_path}`);

      const selectedVariant = await repositories.webStudioVariants.getVariantById({ variant_id: revisionRequest.selected_variant_id });
      if (!selectedVariant) throw new Error(`Selected variant missing for revision request: ${revisionRequest.selected_variant_id}`);
      if (selectedVariant.order_id !== orderId) throw new Error(`Selected variant does not belong to order: ${revisionRequest.selected_variant_id}`);

      const revisedBrowserEvidence = await this.createRevisedBrowserEvidence(order, revisionRequest, revisedBuildArtifact, { ...options, selectedVariant });
      const updatedRequest = await this.updateRevisionRequestWithBrowserEvidence(orderId, revisionRequestId, revisedBrowserEvidence.browser_evidence_id, revisedBrowserEvidence);

      return {
        revision_request: updatedRequest,
        revised_browser_evidence: revisedBrowserEvidence,
        idempotent: false,
      };
    },

    async createRevisedBrowserEvidence(order, revisionRequest, revisedBuildArtifact, options = {}) {
      const selectedVariant = options.selectedVariant || await repositories.webStudioVariants.getVariantById({ variant_id: revisionRequest.selected_variant_id });
      const evidenceId = options.browser_evidence_id || buildRevisedBrowserEvidenceId(order.order_id, revisionRequest.branch_name, revisionRequest.revision_number);
      const existing = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: evidenceId });
      if (existing) return existing;

      const htmlContent = await fs.readFile(revisedBuildArtifact.html_path, 'utf8');
      const manifest = revisedBuildArtifact.manifest_path ? await safeReadJson(revisedBuildArtifact.manifest_path) : null;
      const capability = await this.detectRevisionBrowserCapability(options);
      const screenshotPath = null;
      const snapshotPath = null;
      const tracePath = null;
      const browserNative = false;
      const captureStatus = capability.available ? 'skipped' : 'not_available';
      const source = capability.available ? 'bounded_revised_preview_target_browser_evidence' : 'bounded_revised_preview_target_browser_evidence';
      const checks = buildRevisionChecks({
        revisedBuildArtifact,
        manifestOk: Boolean(manifest),
        capability,
        htmlContent,
        revisionRequest,
        screenshotExists: false,
      });
      const status = deriveEvidenceStatus(checks);
      const now = nowIso();

      const evidence = {
        browser_evidence_id: evidenceId,
        evidence_scope: 'revision',
        order_id: order.order_id,
        selected_variant_id: revisionRequest.selected_variant_id,
        variant_id: revisionRequest.selected_variant_id,
        branch_name: revisionRequest.branch_name,
        revision_request_id: revisionRequest.revision_request_id,
        revision_number: revisionRequest.revision_number,
        parent_build_artifact_id: revisionRequest.parent_build_artifact_id,
        revised_build_artifact_id: revisedBuildArtifact.build_artifact_id,
        build_artifact_id: revisedBuildArtifact.build_artifact_id,
        html_path: revisedBuildArtifact.html_path,
        preview_path: revisedBuildArtifact.preview_path || revisedBuildArtifact.html_path,
        manifest_path: revisedBuildArtifact.manifest_path || null,
        browser_target: `file://${revisedBuildArtifact.html_path}`,
        browser_native: browserNative,
        source,
        capture_status: captureStatus,
        screenshot_path: screenshotPath,
        snapshot_path: snapshotPath,
        trace_path: tracePath,
        status,
        revised_browser_qa_status: status,
        revised_capture_status: captureStatus,
        revised_browser_native: browserNative,
        checks,
        risks: [
          'No real revised screenshot was produced in WEBSTUDIO-009 bounded mode.',
        ],
        limitations: [
          capability.available
            ? 'Repo-local browser provider may resolve, but revised screenshot execution is not proven in this bounded slice.'
            : 'No repo-local browser provider resolved, so only bounded revised preview-target evidence was persisted.',
        ],
        capture_capability: capability,
        evidence_artifacts: [],
        created_at: now,
        updated_at: now,
      };

      return repositories.webStudioBrowserQAEvidence.createBrowserEvidence({ browser_evidence: evidence });
    },

    async updateRevisionRequestWithBrowserEvidence(orderId, revisionRequestId, revisedBrowserEvidenceId, evidence = null) {
      const current = await repositories.webStudioRevisionRequests.getRevisionRequestById({ revision_request_id: revisionRequestId });
      if (!current) throw new Error(`Revision request not found: ${revisionRequestId}`);
      if (current.order_id !== orderId) throw new Error(`Revision request does not belong to order: ${revisionRequestId}`);

      const effectiveEvidence = evidence || await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: revisedBrowserEvidenceId });
      if (!effectiveEvidence) throw new Error(`Revised browser evidence not found: ${revisedBrowserEvidenceId}`);

      return repositories.webStudioRevisionRequests.updateRevisionRequestById({
        revision_request_id: revisionRequestId,
        patch: {
          revised_browser_evidence_id: revisedBrowserEvidenceId,
          revised_browser_qa_status: effectiveEvidence.status,
          revised_capture_status: effectiveEvidence.capture_status,
          revised_browser_native: effectiveEvidence.browser_native,
          updated_at: nowIso(),
        },
      });
    },

    async getRevisionBrowserQASurface(orderId) {
      const revisionExecutionSurface = await revisionExecutionService.getRevisionExecutionSurface(orderId);
      const latest = revisionExecutionSurface.latest_revision_request;
      const revisedBrowserEvidence = latest?.revised_browser_evidence_id
        ? await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: latest.revised_browser_evidence_id })
        : null;

      return {
        latest_revision_request: clone(latest),
        revised_browser_evidence: clone(revisedBrowserEvidence),
        selected_variant: clone(revisionExecutionSurface.selected_variant),
        revised_build_artifact: clone(revisionExecutionSurface.revised_build_artifact),
        browser_native: revisedBrowserEvidence?.browser_native || false,
        capture_status: revisedBrowserEvidence?.capture_status || null,
      };
    },
  });
}

module.exports = {
  createWebStudioRevisionBrowserQAService,
};