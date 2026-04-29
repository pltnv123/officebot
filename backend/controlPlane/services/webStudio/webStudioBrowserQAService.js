function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createBrowserEvidenceId(orderId, branchName) {
  return `ws-browser-evidence-${orderId}-${String(branchName).toLowerCase()}`;
}

function createStructuredEvidenceArtifacts(branchName) {
  const generatedAt = nowIso();
  return Object.freeze([
    {
      type: 'structured_placeholder',
      path: null,
      content: `bounded browser QA evidence placeholder for branch ${branchName}`,
      generated_at: generatedAt,
      native: false,
    },
  ]);
}

function buildBrowserQAChecks(order, variant, childSession) {
  const requiredSections = Array.isArray(order.normalized_brief?.required_sections) ? order.normalized_brief.required_sections : [];
  const hasTrustSignal = requiredSections.includes('benefits') || requiredSections.includes('social_proof') || /trust/i.test(String(variant.concept_summary || ''));
  const hasCta = requiredSections.includes('cta') || /cta/i.test(JSON.stringify(order.normalized_brief || {}));
  const evidenceRef = `child_session:${childSession.child_session_id}`;

  return Object.freeze([
    {
      check_id: 'page_load',
      name: 'Page load / preview target availability',
      status: 'needs_review',
      severity: 'critical',
      notes: 'No real preview/browser target is wired in WEBSTUDIO-004, placeholder evidence only.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'responsive_structure',
      name: 'Responsive structure expectation',
      status: 'needs_review',
      severity: 'major',
      notes: 'Viewport-based browser validation not yet executed, preserved as pending review.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'primary_cta_presence',
      name: 'Primary CTA presence in variant concept',
      status: hasCta ? 'passed' : 'needs_review',
      severity: 'major',
      notes: hasCta ? 'CTA requirement preserved in normalized brief / concept.' : 'CTA requirement needs explicit browser verification.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'trust_block_presence',
      name: 'Trust / reassurance block presence',
      status: hasTrustSignal ? 'passed' : 'needs_review',
      severity: 'major',
      notes: hasTrustSignal ? 'Trust-oriented structure preserved in required sections / concept.' : 'Trust block needs visual/browser verification.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'content_structure',
      name: 'Content structure from normalized brief',
      status: requiredSections.length > 0 ? 'passed' : 'needs_review',
      severity: 'major',
      notes: requiredSections.length > 0 ? `Required sections preserved: ${requiredSections.join(', ')}` : 'No required sections captured for structural verification.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'visual_regression_placeholder',
      name: 'Visual regression placeholder',
      status: 'needs_review',
      severity: 'minor',
      notes: 'No real screenshot diff exists in this slice.',
      evidence_ref: evidenceRef,
    },
    {
      check_id: 'accessibility_basic_placeholder',
      name: 'Accessibility basic placeholder',
      status: 'needs_review',
      severity: 'minor',
      notes: 'No automated accessibility browser check is wired yet.',
      evidence_ref: evidenceRef,
    },
  ]);
}

function deriveEvidenceStatus(checks) {
  const hasCriticalNeedsReview = checks.some((check) => check.severity === 'critical' && check.status !== 'passed');
  if (hasCriticalNeedsReview) return 'needs_review';
  const hasFailed = checks.some((check) => check.status === 'failed');
  if (hasFailed) return 'failed';
  const hasNeedsReview = checks.some((check) => check.status === 'needs_review');
  if (hasNeedsReview) return 'needs_review';
  return 'passed';
}

function createWebStudioBrowserQAService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioQAResults || !repositories.webStudioTaskFlowBindings || !repositories.webStudioChildSessions || !repositories.webStudioBrowserQAEvidence) {
    throw new Error('webStudioBrowserQAService requires webStudio repositories including browser QA evidence');
  }

  return Object.freeze({
    buildBrowserQAChecks,

    async attachEvidenceToQAResult(variantId, browserEvidenceId, checks, evidenceStatus) {
      const qaResults = await repositories.webStudioQAResults.listQAResultsByVariantId({ variant_id: variantId });
      const current = qaResults[0] || null;
      if (!current) {
        throw new Error(`QA result not found for variant: ${variantId}`);
      }
      const summary = {
        browser_evidence_id: browserEvidenceId,
        total_checks: checks.length,
        passed_checks: checks.filter((check) => check.status === 'passed').length,
        needs_review_checks: checks.filter((check) => check.status === 'needs_review').length,
        failed_checks: checks.filter((check) => check.status === 'failed').length,
      };
      return repositories.webStudioQAResults.updateQAResultById({
        qa_result_id: current.qa_result_id,
        patch: {
          browser_evidence_id: browserEvidenceId,
          browser_checks_summary: summary,
          browser_qa_status: evidenceStatus,
          browser_evidence: {
            mode: 'bounded_local_browser_qa_evidence',
            screenshot_path: null,
            snapshot_ref: browserEvidenceId,
            note: 'Structured browser QA evidence stored, real browser automation deferred.',
          },
          updated_at: nowIso(),
        },
      });
    },

    async createBrowserQAEvidenceForVariant(orderId, variantId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) {
        throw new Error(`WebStudio order not found: ${orderId}`);
      }
      const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      if (!binding) {
        throw new Error(`TaskFlow binding missing for order: ${orderId}`);
      }
      const variant = await repositories.webStudioVariants.getVariantById({ variant_id: variantId });
      if (!variant) {
        throw new Error(`WebStudio variant not found: ${variantId}`);
      }
      if (variant.order_id !== orderId) {
        throw new Error(`Variant does not belong to order: ${variantId}`);
      }
      const childSession = await repositories.webStudioChildSessions.getChildSessionByVariantId({ variant_id: variantId });
      if (!childSession) {
        throw new Error(`Child session missing for variant: ${variantId}`);
      }
      const qaResults = await repositories.webStudioQAResults.listQAResultsByVariantId({ variant_id: variantId });
      const qaResult = qaResults[0] || null;
      if (!qaResult) {
        throw new Error(`QA result missing for variant: ${variantId}`);
      }

      const existing = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceByVariantId({ variant_id: variantId });
      if (existing) {
        return existing;
      }

      const checks = clone(options.checks || buildBrowserQAChecks(order, variant, childSession));
      const status = options.status || deriveEvidenceStatus(checks);
      const now = nowIso();
      const browserEvidence = {
        browser_evidence_id: options.browser_evidence_id || createBrowserEvidenceId(orderId, variant.branch_name),
        order_id: orderId,
        variant_id: variantId,
        branch_name: variant.branch_name,
        qa_result_id: qaResult.qa_result_id,
        child_session_id: childSession.child_session_id,
        child_agent_id: childSession.child_agent_id,
        child_workspace_key: childSession.child_workspace_key,
        governed_flow_id: binding.governed_flow_id,
        taskflow_id: binding.taskflow_id,
        binding_id: binding.binding_id,
        source: options.source || 'bounded_local_browser_qa_evidence',
        browser_native: Boolean(options.browser_native || false),
        status,
        checks,
        screenshot_path: options.screenshot_path || null,
        snapshot_path: options.snapshot_path || null,
        trace_path: options.trace_path || null,
        evidence_artifacts: clone(options.evidence_artifacts || createStructuredEvidenceArtifacts(variant.branch_name)),
        risks: clone(options.risks || [
          'Real browser automation is not yet wired into WEBSTUDIO-004.',
          'Evidence is structured placeholder data and requires later live browser migration.',
        ]),
        migration_target: options.migration_target || 'OpenClaw browser automation snapshot/screenshot',
        created_at: now,
        updated_at: now,
      };

      const created = await repositories.webStudioBrowserQAEvidence.createBrowserEvidence({ browser_evidence: browserEvidence });
      await this.attachEvidenceToQAResult(variantId, created.browser_evidence_id, created.checks, created.status);
      await repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          browser_evidence_id: created.browser_evidence_id,
          browser_qa_status: created.status,
          browser_native: created.browser_native,
          screenshot_path: created.screenshot_path,
          snapshot_path: created.snapshot_path,
          updated_at: nowIso(),
        },
      });
      return created;
    },

    async createBrowserQAEvidenceForOrderVariants(orderId, options = {}) {
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      if (variants.length !== 3) {
        throw new Error(`Expected exactly 3 variants for order: ${orderId}`);
      }
      const childSessions = await repositories.webStudioChildSessions.listChildSessionsByOrderId({ order_id: orderId });
      if (childSessions.length !== 3) {
        throw new Error(`Expected exactly 3 child sessions for order: ${orderId}`);
      }

      const evidenceRows = [];
      for (const variant of variants.sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)))) {
        evidenceRows.push(await this.createBrowserQAEvidenceForVariant(orderId, variant.variant_id, options));
      }
      return evidenceRows;
    },

    async getBrowserQAEvidenceForOrder(orderId) {
      const rows = await repositories.webStudioBrowserQAEvidence.listBrowserEvidenceByOrderId({ order_id: orderId });
      return rows.sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)));
    },

    async getBrowserQAEvidenceForVariant(variantId) {
      return repositories.webStudioBrowserQAEvidence.getBrowserEvidenceByVariantId({ variant_id: variantId });
    },
  });
}

module.exports = {
  createWebStudioBrowserQAService,
};
