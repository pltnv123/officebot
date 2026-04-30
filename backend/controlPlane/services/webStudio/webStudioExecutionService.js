const crypto = require('crypto');
const { createWebStudioRevisionService } = require('./webStudioRevisionService');

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function hashObject(value) {
  return crypto.createHash('sha1').update(JSON.stringify(value || {})).digest('hex').slice(0, 12);
}

function buildExecutionRunId(orderId, branchName, scope, revisionNumber = null) {
  const branch = String(branchName).toLowerCase();
  if (scope === 'revision') {
    return `ws-execution-run-${orderId}-${branch}-rev-${revisionNumber}`;
  }
  if (scope === 'selected_variant') {
    return `ws-execution-run-${orderId}-${branch}-selected`;
  }
  return `ws-execution-run-${orderId}-${branch}-initial`;
}

function summarizeAcceptanceCriteria(criteria) {
  return Array.isArray(criteria) ? criteria.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function createWebStudioExecutionService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioChildSessions || !repositories.webStudioTaskFlowBindings || !repositories.webStudioExecutionRuns) {
    throw new Error('webStudioExecutionService requires repositories including execution runs');
  }

  const revisionService = createWebStudioRevisionService({ repositories });

  return Object.freeze({
    async detectWebStudioExecutionCapability(options = {}) {
      const openclawBinary = options.openclawBinaryAvailable === true;
      const repoOpenclawCliSeam = false;
      return {
        available: openclawBinary && repoOpenclawCliSeam,
        provider: openclawBinary && repoOpenclawCliSeam ? 'openclaw' : 'bounded_local',
        openclaw_native: openclawBinary && repoOpenclawCliSeam,
        reason: openclawBinary
          ? 'Repo contains some OpenClaw CLI references, but no proven safe repo-local child-session execution seam was wired for WEBSTUDIO-011.'
          : 'No proven repo-local OpenClaw child-session execution seam detected; using bounded local execution adapter.',
        allowed_mode: openclawBinary && repoOpenclawCliSeam ? 'narrow_child_session_execution' : 'bounded_local_execution_adapter',
      };
    },

    async createExecutionRunForVariant(orderId, variantId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) throw new Error(`WebStudio order not found: ${orderId}`);
      const variant = await repositories.webStudioVariants.getVariantById({ variant_id: variantId });
      if (!variant) throw new Error(`WebStudio variant not found: ${variantId}`);
      if (variant.order_id !== orderId) throw new Error(`Variant does not belong to order: ${variantId}`);
      const childSession = await repositories.webStudioChildSessions.getChildSessionByVariantId({ variant_id: variantId });
      if (!childSession) throw new Error(`Child session missing for variant: ${variantId}`);
      const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      if (!binding) throw new Error(`TaskFlow binding missing for order: ${orderId}`);

      const scope = options.scope || (order.selected_variant_id === variantId ? 'selected_variant' : 'initial_variant');
      const revisionRequest = scope === 'revision' ? await revisionService.getLatestRevisionRequest(orderId) : null;
      const revisionNumber = revisionRequest?.revision_number || null;
      const executionRunId = buildExecutionRunId(orderId, variant.branch_name, scope, revisionNumber);
      const existing = await repositories.webStudioExecutionRuns.getExecutionRunById({ execution_run_id: executionRunId });
      if (existing) return existing;

      const capability = await this.detectWebStudioExecutionCapability(options);
      const relatedBuildArtifactId = variant.build_artifact_id || (scope === 'revision' ? revisionRequest?.revised_build_artifact_id || null : null);
      const executionSpec = clone(childSession.execution_spec || {});
      const startedAt = nowIso();
      const completedAt = nowIso();
      const source = capability.openclaw_native ? 'openclaw_child_session_execution' : 'bounded_local_execution_adapter';
      const provider = capability.openclaw_native ? 'openclaw' : 'bounded_local';
      const executionOutput = capability.openclaw_native
        ? {
            execution_summary: 'OpenClaw-native execution not implemented in WEBSTUDIO-011.',
            limitations: ['Execution path reserved for future proven native bridge.'],
          }
        : {
            execution_summary: `Bounded local execution adapter consumed execution spec for variant ${variant.branch_name}.`,
            execution_spec_hash: hashObject(executionSpec),
            planned_artifacts: clone(executionSpec.required_artifacts || []),
            acceptance_criteria_summary: summarizeAcceptanceCriteria(executionSpec.acceptance_criteria),
            artifact_relationship: relatedBuildArtifactId ? 'linked_existing_bounded_build_artifact' : null,
            limitations: [
              'No proven repo-local OpenClaw child-session invocation was executed in WEBSTUDIO-011.',
              'Execution output is deterministic summary data, not native child-session stdout.',
            ],
          };

      const run = {
        execution_run_id: executionRunId,
        order_id: orderId,
        variant_id: variant.variant_id,
        branch_name: variant.branch_name,
        child_session_id: childSession.child_session_id,
        child_agent_id: childSession.child_agent_id,
        child_workspace_key: childSession.child_workspace_key,
        governed_flow_id: binding.governed_flow_id,
        taskflow_id: binding.taskflow_id,
        binding_id: binding.binding_id,
        revision_request_id: revisionRequest?.revision_request_id || null,
        revision_number: revisionNumber,
        scope,
        source,
        provider,
        openclaw_native: capability.openclaw_native,
        status: 'completed',
        execution_spec: executionSpec,
        execution_output: executionOutput,
        external_execution_id: capability.openclaw_native ? options.external_execution_id || null : null,
        related_build_artifact_id: relatedBuildArtifactId,
        started_at: startedAt,
        completed_at: completedAt,
        created_at: startedAt,
        updated_at: completedAt,
        limitations: clone(executionOutput.limitations || [capability.reason]),
        metadata: {
          execution_capability: capability,
          migration_target: 'OpenClaw sessions_spawn/subagents integration',
        },
      };

      const created = await repositories.webStudioExecutionRuns.createExecutionRun({ execution_run: run });
      await repositories.webStudioVariants.updateVariantById({
        variant_id: variant.variant_id,
        patch: {
          execution_run_id: created.execution_run_id,
          execution_status: created.status,
          execution_source: created.source,
          openclaw_native_execution: created.openclaw_native,
          updated_at: nowIso(),
        },
      });
      await repositories.webStudioChildSessions.updateChildSessionById({
        child_session_id: childSession.child_session_id,
        patch: {
          status: created.status,
          latest_execution_run_id: created.execution_run_id,
          updated_at: nowIso(),
        },
      });
      return created;
    },

    async createExecutionRunsForOrderVariants(orderId, options = {}) {
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      if (!variants.length) throw new Error(`No variants found for order: ${orderId}`);
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      const sorted = [...variants].sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)));
      const targetVariants = options.scope === 'selected'
        ? sorted.filter((variant) => variant.variant_id === order.selected_variant_id)
        : sorted;
      if (!targetVariants.length) throw new Error(`No target variants found for execution on order: ${orderId}`);

      const rows = [];
      for (const variant of targetVariants) {
        rows.push(await this.createExecutionRunForVariant(orderId, variant.variant_id, {
          ...options,
          scope: options.scope === 'selected' ? 'selected_variant' : (options.scope || 'initial_variant'),
        }));
      }
      return rows;
    },

    async getExecutionRunsForOrder(orderId) {
      const rows = await repositories.webStudioExecutionRuns.listExecutionRunsByOrderId({ order_id: orderId });
      return [...rows].sort((a, b) => {
        const branchCompare = String(a.branch_name || '').localeCompare(String(b.branch_name || ''));
        if (branchCompare !== 0) return branchCompare;
        return Number(a.revision_number || 0) - Number(b.revision_number || 0);
      });
    },

    async linkExecutionRunToBuildArtifact(orderId, executionRunId, buildArtifactId) {
      const run = await repositories.webStudioExecutionRuns.getExecutionRunById({ execution_run_id: executionRunId });
      if (!run) throw new Error(`Execution run not found: ${executionRunId}`);
      if (run.order_id !== orderId) throw new Error(`Execution run does not belong to order: ${executionRunId}`);
      return repositories.webStudioExecutionRuns.updateExecutionRunById({
        execution_run_id: executionRunId,
        patch: {
          related_build_artifact_id: buildArtifactId,
          updated_at: nowIso(),
        },
      });
    },

    async getExecutionSurface(orderId) {
      const executionCapability = await this.detectWebStudioExecutionCapability();
      const executionRuns = await this.getExecutionRunsForOrder(orderId);
      return {
        execution_capability: executionCapability,
        execution_runs: executionRuns.map(clone),
        provider: executionCapability.provider,
        openclaw_native: executionCapability.openclaw_native,
        limitations: executionCapability.openclaw_native
          ? []
          : ['Execution bridge currently uses bounded local adapter while native child-session seam remains unproven.'],
      };
    },
  });
}

module.exports = {
  createWebStudioExecutionService,
};