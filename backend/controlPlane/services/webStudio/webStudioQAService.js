const QA_STATUSES = Object.freeze([
  'pending',
  'passed',
  'failed',
  'needs_review',
]);

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createQaResultId(variantId) {
  return `ws-qa-${variantId}`;
}

function buildDefaultChecks(variant, order) {
  return Object.freeze([
    {
      check_id: 'brief_alignment',
      label: 'Variant aligns with normalized brief',
      status: 'passed',
    },
    {
      check_id: 'branch_identity',
      label: `Variant ${variant.branch_name} identity is distinct`,
      status: 'passed',
    },
    {
      check_id: 'delivery_traceability',
      label: 'Variant is linkable to order and child task',
      status: variant.child_task_id ? 'passed' : 'needs_review',
    },
    {
      check_id: 'browser_verification',
      label: 'Browser verification evidence is present',
      status: 'placeholder',
      note: 'WEBSTUDIO-001 uses placeholder QA only, real browser verification is deferred.',
    },
  ]);
}

function buildDefaultRisks(variant, order) {
  return Object.freeze([
    `Variant ${variant.branch_name} has no real generated website artifact in WEBSTUDIO-001.`,
    'Browser QA is not yet implemented, only placeholder evidence is stored.',
    `Order ${order.order_id} is persisted through first-slice bounded file-backed storage.`,
  ]);
}

function createWebStudioQAService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioQAResults) {
    throw new Error('webStudioQAService requires repositories.webStudioQAResults');
  }

  return Object.freeze({
    async createQaResult(variant, order, options = {}) {
      const now = nowIso();
      const qa_result = {
        qa_result_id: options.qa_result_id || createQaResultId(variant.variant_id),
        order_id: order.order_id,
        variant_id: variant.variant_id,
        status: 'pending',
        checks: clone(options.checks || buildDefaultChecks(variant, order)),
        browser_evidence: clone(options.browser_evidence || {
          mode: 'placeholder',
          screenshot_path: null,
          snapshot_ref: null,
          note: 'Real browser evidence deferred to a later bounded slice.',
        }),
        risks: clone(options.risks || buildDefaultRisks(variant, order)),
        created_at: now,
        updated_at: now,
      };
      return repositories.webStudioQAResults.createQAResult({ qa_result });
    },

    async markQaPassed(variantId, checks, evidence, risks) {
      const qaResults = await repositories.webStudioQAResults.listQAResultsByVariantId({ variant_id: variantId });
      const current = qaResults[0] || null;
      if (!current) {
        throw new Error(`QA result not found for variant: ${variantId}`);
      }
      return repositories.webStudioQAResults.updateQAResultById({
        qa_result_id: current.qa_result_id,
        patch: {
          status: 'passed',
          checks: clone(checks || current.checks),
          browser_evidence: clone(evidence || current.browser_evidence),
          risks: clone(risks || current.risks),
          updated_at: nowIso(),
        },
      });
    },

    async markQaFailed(variantId, checks, evidence, risks) {
      const qaResults = await repositories.webStudioQAResults.listQAResultsByVariantId({ variant_id: variantId });
      const current = qaResults[0] || null;
      if (!current) {
        throw new Error(`QA result not found for variant: ${variantId}`);
      }
      return repositories.webStudioQAResults.updateQAResultById({
        qa_result_id: current.qa_result_id,
        patch: {
          status: 'failed',
          checks: clone(checks || current.checks),
          browser_evidence: clone(evidence || current.browser_evidence),
          risks: clone(risks || current.risks),
          updated_at: nowIso(),
        },
      });
    },

    async getQaResultsForOrder(orderId) {
      const rows = await repositories.webStudioQAResults.listQAResultsByOrderId({ order_id: orderId });
      return rows.sort((a, b) => String(a.variant_id).localeCompare(String(b.variant_id)));
    },
  });
}

module.exports = {
  QA_STATUSES,
  createWebStudioQAService,
};
