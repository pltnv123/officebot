const fs = require('fs/promises');
const path = require('path');
const { APPROVED_AGENT_TEMPLATES } = require('../bootstrap/approvedAgentTemplates');

const STORAGE_VERSION = 1;

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeTemplate(template) {
  const ts = nowIso();
  return Object.freeze({
    agent_template_id: template.agent_template_id,
    version: template.template_version,
    template_name: template.template_label,
    agent_class: 'worker',
    agent_kind: template.lifecycle_class,
    allowed_task_kinds_json: ['implementation', 'bounded_child_execution'],
    capabilities_json: {
      bounded_role_summary: template.bounded_role_summary,
      capability_boundary: template.capability_boundary,
    },
    forbidden_capabilities_json: template.forbidden_actions,
    policy_boundary_class: 'bounded_first_governed_workflow',
    spawn_requires_approval: true,
    max_recursion_depth: 1,
    max_active_children_per_parent: 1,
    ttl_seconds: 3600,
    enabled: true,
    created_at: ts,
    updated_at: ts,
  });
}

async function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function matchesFilters(row, filters = null) {
  if (!filters) return true;
  return Object.entries(filters).every(([key, expected]) => {
    if (expected === undefined) return true;
    return row[key] === expected;
  });
}

function sortRows(rows, sort = null, timeField = 'created_at') {
  const list = [...rows];
  if (sort === 'asc') return list.sort((a, b) => String(a[timeField] || '').localeCompare(String(b[timeField] || '')));
  return list.sort((a, b) => String(b[timeField] || '').localeCompare(String(a[timeField] || '')));
}

function createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir } = {}) {
  if (!rootDir) {
    throw new Error('createFileBackedFirstGovernedWorkflowRepositoryAdapter requires rootDir');
  }

  const storageDir = path.join(rootDir, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime');
  const stateFile = path.join(storageDir, 'state.json');

  async function loadState() {
    const fallback = {
      storage_version: STORAGE_VERSION,
      tasks: {},
      task_events: {},
      agent_templates: {},
      spawn_requests: {},
      approval_requests: {},
      agent_registry: {},
      checkpoints: {},
      audit_events: {},
      webstudio_orders: {},
      webstudio_variants: {},
      webstudio_qa_results: {},
      webstudio_delivery_bundles: {},
      webstudio_taskflow_bindings: {},
      webstudio_child_sessions: {},
      webstudio_browser_qa_evidence: {},
      webstudio_build_artifacts: {},
      webstudio_revision_requests: {},
      webstudio_public_delivery_bundles: {},
      webstudio_execution_runs: {},
    };
    const current = await readJsonSafe(stateFile, fallback);
    current.tasks = current.tasks || {};
    current.task_events = current.task_events || {};
    current.agent_templates = current.agent_templates || {};
    current.spawn_requests = current.spawn_requests || {};
    current.approval_requests = current.approval_requests || {};
    current.agent_registry = current.agent_registry || {};
    current.checkpoints = current.checkpoints || {};
    current.audit_events = current.audit_events || {};
    current.webstudio_orders = current.webstudio_orders || {};
    current.webstudio_variants = current.webstudio_variants || {};
    current.webstudio_qa_results = current.webstudio_qa_results || {};
    current.webstudio_delivery_bundles = current.webstudio_delivery_bundles || {};
    current.webstudio_taskflow_bindings = current.webstudio_taskflow_bindings || {};
    current.webstudio_child_sessions = current.webstudio_child_sessions || {};
    current.webstudio_browser_qa_evidence = current.webstudio_browser_qa_evidence || {};
    current.webstudio_build_artifacts = current.webstudio_build_artifacts || {};
    current.webstudio_revision_requests = current.webstudio_revision_requests || {};
    current.webstudio_public_delivery_bundles = current.webstudio_public_delivery_bundles || {};
    current.webstudio_execution_runs = current.webstudio_execution_runs || {};
    if (!current.agent_templates || Object.keys(current.agent_templates).length === 0) {
      for (const template of APPROVED_AGENT_TEMPLATES) {
        const normalized = normalizeTemplate(template);
        current.agent_templates[`${normalized.agent_template_id}:${normalized.version}`] = normalized;
      }
    }
    return current;
  }

  async function saveState(state) {
    await writeJson(stateFile, state);
  }

  async function mutate(mutator) {
    const state = await loadState();
    const result = await mutator(state);
    await saveState(state);
    return result;
  }

  function taskList(state) {
    return Object.values(state.tasks || {});
  }

  function spawnList(state) {
    return Object.values(state.spawn_requests || {});
  }

  function approvalList(state) {
    return Object.values(state.approval_requests || {});
  }

  function taskEventList(state) {
    return Object.values(state.task_events || {});
  }

  function auditEventList(state) {
    return Object.values(state.audit_events || {});
  }

  function checkpointList(state) {
    return Object.values(state.checkpoints || {});
  }

  function webStudioOrderList(state) {
    return Object.values(state.webstudio_orders || {});
  }

  function webStudioVariantList(state) {
    return Object.values(state.webstudio_variants || {});
  }

  function webStudioQaResultList(state) {
    return Object.values(state.webstudio_qa_results || {});
  }

  function webStudioDeliveryBundleList(state) {
    return Object.values(state.webstudio_delivery_bundles || {});
  }

  function webStudioTaskFlowBindingList(state) {
    return Object.values(state.webstudio_taskflow_bindings || {});
  }

  function webStudioChildSessionList(state) {
    return Object.values(state.webstudio_child_sessions || {});
  }

  function webStudioBrowserQaEvidenceList(state) {
    return Object.values(state.webstudio_browser_qa_evidence || {});
  }

  function webStudioBuildArtifactList(state) {
    return Object.values(state.webstudio_build_artifacts || {});
  }

  function webStudioRevisionRequestList(state) {
    return Object.values(state.webstudio_revision_requests || {});
  }

  function webStudioPublicDeliveryBundleList(state) {
    return Object.values(state.webstudio_public_delivery_bundles || {});
  }

  function webStudioExecutionRunList(state) {
    return Object.values(state.webstudio_execution_runs || {});
  }

  const repositories = {
    __ROOT_DIR__: rootDir,
    tasks: {
      async createTask({ task }) {
        return mutate(async (state) => {
          state.tasks[task.task_id] = clone(task);
          return clone(state.tasks[task.task_id]);
        });
      },
      async getTaskById({ task_id }) {
        const state = await loadState();
        return clone(state.tasks[task_id] || null);
      },
      async listTasks({ filters = null, sort = 'desc' } = {}) {
        const state = await loadState();
        return sortRows(taskList(state).filter((row) => matchesFilters(row, filters)), sort, 'updated_at').map(clone);
      },
      async updateTaskById({ task_id, patch }) {
        return mutate(async (state) => {
          const current = state.tasks[task_id];
          if (!current) return null;
          state.tasks[task_id] = { ...current, ...clone(patch) };
          return clone(state.tasks[task_id]);
        });
      },
      async getTasksByRootTaskId({ root_task_id }) {
        const state = await loadState();
        return taskList(state).filter((row) => row.root_task_id === root_task_id).map(clone);
      },
      async getChildTasksByParentTaskId({ parent_task_id, filters = null }) {
        const state = await loadState();
        return taskList(state)
          .filter((row) => row.parent_task_id === parent_task_id)
          .filter((row) => matchesFilters(row, filters))
          .map(clone);
      },
      async countActiveChildrenByParentTaskId({ parent_task_id, active_statuses = null }) {
        const state = await loadState();
        const statuses = Array.isArray(active_statuses) && active_statuses.length > 0 ? new Set(active_statuses) : null;
        return taskList(state).filter((row) => row.parent_task_id === parent_task_id && (!statuses || statuses.has(row.status))).length;
      },
      async getTasksBlockedOnSpawnRequestId({ blocked_on_spawn_request_id }) {
        const state = await loadState();
        return taskList(state).filter((row) => row.blocked_on_spawn_request_id === blocked_on_spawn_request_id).map(clone);
      },
      async getTasksBlockedOnApprovalRequestId({ blocked_on_approval_request_id }) {
        const state = await loadState();
        return taskList(state).filter((row) => row.blocked_on_approval_request_id === blocked_on_approval_request_id).map(clone);
      },
    },

    taskEvents: {
      async appendTaskEvent({ event }) {
        return mutate(async (state) => {
          state.task_events[event.event_id] = clone(event);
          return clone(state.task_events[event.event_id]);
        });
      },
      async getTaskEventById({ event_id }) {
        const state = await loadState();
        return clone(state.task_events[event_id] || null);
      },
      async listTaskEventsByTaskId({ task_id, sort = 'asc' }) {
        const state = await loadState();
        return sortRows(taskEventList(state).filter((row) => row.task_id === task_id), sort, 'created_at').map(clone);
      },
      async listTaskEventsByAgentId({ agent_id }) {
        const state = await loadState();
        return taskEventList(state).filter((row) => row.agent_id === agent_id).map(clone);
      },
    },

    agentTemplates: {
      async createAgentTemplate({ template }) {
        return mutate(async (state) => {
          state.agent_templates[`${template.agent_template_id}:${template.version}`] = clone(template);
          return clone(state.agent_templates[`${template.agent_template_id}:${template.version}`]);
        });
      },
      async getAgentTemplateById({ agent_template_id }) {
        const state = await loadState();
        const found = Object.values(state.agent_templates).find((row) => row.agent_template_id === agent_template_id) || null;
        return clone(found);
      },
      async getAgentTemplateByIdAndVersion({ agent_template_id, version }) {
        const state = await loadState();
        return clone(state.agent_templates[`${agent_template_id}:${version}`] || null);
      },
      async listAgentTemplates({ filters = null } = {}) {
        const state = await loadState();
        return Object.values(state.agent_templates).filter((row) => matchesFilters(row, filters)).map(clone);
      },
      async updateAgentTemplateByIdAndVersion({ agent_template_id, version, patch }) {
        return mutate(async (state) => {
          const key = `${agent_template_id}:${version}`;
          const current = state.agent_templates[key];
          if (!current) return null;
          state.agent_templates[key] = { ...current, ...clone(patch) };
          return clone(state.agent_templates[key]);
        });
      },
    },

    spawnRequests: {
      async createSpawnRequest({ spawn_request }) {
        return mutate(async (state) => {
          state.spawn_requests[spawn_request.spawn_request_id] = clone(spawn_request);
          return clone(state.spawn_requests[spawn_request.spawn_request_id]);
        });
      },
      async getSpawnRequestById({ spawn_request_id }) {
        const state = await loadState();
        return clone(state.spawn_requests[spawn_request_id] || null);
      },
      async listSpawnRequests({ filters = null } = {}) {
        const state = await loadState();
        return spawnList(state).filter((row) => matchesFilters(row, filters)).map(clone);
      },
      async updateSpawnRequestById({ spawn_request_id, patch }) {
        return mutate(async (state) => {
          const current = state.spawn_requests[spawn_request_id];
          if (!current) return null;
          state.spawn_requests[spawn_request_id] = { ...current, ...clone(patch) };
          return clone(state.spawn_requests[spawn_request_id]);
        });
      },
      async findActiveSpawnRequestByIntentHash({ parent_task_id, spawn_intent_hash, active_statuses }) {
        const state = await loadState();
        const active = new Set(active_statuses || []);
        const found = spawnList(state).find((row) => row.parent_task_id === parent_task_id && row.spawn_intent_hash === spawn_intent_hash && active.has(row.status)) || null;
        return clone(found);
      },
      async listSpawnRequestsByParentTaskId({ parent_task_id, filters = null }) {
        const state = await loadState();
        return spawnList(state).filter((row) => row.parent_task_id === parent_task_id).filter((row) => matchesFilters(row, filters)).map(clone);
      },
      async getSpawnRequestByApprovalRequestId({ approval_request_id }) {
        const state = await loadState();
        const found = spawnList(state).find((row) => row.approval_request_id === approval_request_id) || null;
        return clone(found);
      },
      async listSpawnRequestsByRootTaskId({ root_task_id }) {
        const state = await loadState();
        return spawnList(state).filter((row) => row.root_task_id === root_task_id).map(clone);
      },
    },

    approvalRequests: {
      async createApprovalRequest({ approval_request }) {
        return mutate(async (state) => {
          state.approval_requests[approval_request.approval_request_id] = clone(approval_request);
          return clone(state.approval_requests[approval_request.approval_request_id]);
        });
      },
      async getApprovalRequestById({ approval_request_id }) {
        const state = await loadState();
        return clone(state.approval_requests[approval_request_id] || null);
      },
      async listApprovalRequests({ filters = null } = {}) {
        const state = await loadState();
        return approvalList(state).filter((row) => matchesFilters(row, filters)).map(clone);
      },
      async updateApprovalRequestById({ approval_request_id, patch }) {
        return mutate(async (state) => {
          const current = state.approval_requests[approval_request_id];
          if (!current) return null;
          state.approval_requests[approval_request_id] = { ...current, ...clone(patch) };
          return clone(state.approval_requests[approval_request_id]);
        });
      },
      async findApprovalRequestByTarget({ approval_kind, target_id }) {
        const state = await loadState();
        const found = approvalList(state).find((row) => row.approval_kind === approval_kind && row.target_id === target_id) || null;
        return clone(found);
      },
      async getApprovalRequestBySpawnRequestId({ spawn_request_id }) {
        const state = await loadState();
        const spawn = state.spawn_requests[spawn_request_id];
        if (!spawn || !spawn.approval_request_id) return null;
        return clone(state.approval_requests[spawn.approval_request_id] || null);
      },
    },

    agentRegistry: {
      async createAgent({ agent }) {
        return mutate(async (state) => {
          state.agent_registry[agent.agent_id] = clone(agent);
          return clone(state.agent_registry[agent.agent_id]);
        });
      },
      async getAgentById({ agent_id }) {
        const state = await loadState();
        return clone(state.agent_registry[agent_id] || null);
      },
      async listAgents({ filters = null } = {}) {
        const state = await loadState();
        return Object.values(state.agent_registry).filter((row) => matchesFilters(row, filters)).map(clone);
      },
      async updateAgentById({ agent_id, patch }) {
        return mutate(async (state) => {
          const current = state.agent_registry[agent_id];
          if (!current) return null;
          state.agent_registry[agent_id] = { ...current, ...clone(patch) };
          return clone(state.agent_registry[agent_id]);
        });
      },
      async listAgentsByRootTaskId({ root_task_id }) {
        const state = await loadState();
        return Object.values(state.agent_registry).filter((row) => row.root_task_id === root_task_id).map(clone);
      },
      async listAgentsByParentAgentId({ parent_agent_id, filters = null }) {
        const state = await loadState();
        return Object.values(state.agent_registry).filter((row) => row.parent_agent_id === parent_agent_id).filter((row) => matchesFilters(row, filters)).map(clone);
      },
      async listAgentsBySpawnRequestId({ spawned_by_spawn_request_id }) {
        const state = await loadState();
        return Object.values(state.agent_registry).filter((row) => row.spawned_by_spawn_request_id === spawned_by_spawn_request_id).map(clone);
      },
      async getCurrentAgentForTask({ current_task_id }) {
        const state = await loadState();
        const found = Object.values(state.agent_registry).find((row) => row.current_task_id === current_task_id) || null;
        return clone(found);
      },
    },

    checkpoints: {
      async appendCheckpoint({ checkpoint }) {
        return mutate(async (state) => {
          const all = checkpointList(state).filter((row) => row.task_id === checkpoint.task_id);
          for (const row of all) {
            if (row.is_latest) row.is_latest = false;
          }
          state.checkpoints[checkpoint.checkpoint_id] = clone(checkpoint);
          return clone(state.checkpoints[checkpoint.checkpoint_id]);
        });
      },
      async getCheckpointById({ checkpoint_id }) {
        const state = await loadState();
        return clone(state.checkpoints[checkpoint_id] || null);
      },
      async listCheckpointHistoryByTaskId({ task_id, sort = 'desc' }) {
        const state = await loadState();
        return sortRows(checkpointList(state).filter((row) => row.task_id === task_id), sort, 'created_at').map(clone);
      },
      async getLatestCheckpointByTaskId({ task_id }) {
        const state = await loadState();
        const found = checkpointList(state).find((row) => row.task_id === task_id && row.is_latest) || null;
        return clone(found);
      },
      async listCheckpointsByAgentId({ agent_id }) {
        const state = await loadState();
        return checkpointList(state).filter((row) => row.agent_id === agent_id).map(clone);
      },
    },

    auditEvents: {
      async appendAuditEvent({ audit_event }) {
        return mutate(async (state) => {
          state.audit_events[audit_event.audit_event_id] = clone(audit_event);
          return clone(state.audit_events[audit_event.audit_event_id]);
        });
      },
      async getAuditEventById({ audit_event_id }) {
        const state = await loadState();
        return clone(state.audit_events[audit_event_id] || null);
      },
      async listAuditEvents({ filters = null, sort = 'desc' } = {}) {
        const state = await loadState();
        return sortRows(auditEventList(state).filter((row) => matchesFilters(row, filters)), sort, 'occurred_at').map(clone);
      },
      async listAuditEventsByEntity({ entity_type, entity_id }) {
        const state = await loadState();
        return auditEventList(state).filter((row) => row.entity_type === entity_type && row.entity_id === entity_id).map(clone);
      },
      async listAuditEventsByCorrelation({ related_task_id = null, related_agent_id = null, related_spawn_request_id = null, related_approval_request_id = null, limit = null } = {}) {
        const state = await loadState();
        const rows = auditEventList(state).filter((row) => {
          if (related_task_id && row.related_task_id !== related_task_id) return false;
          if (related_agent_id && row.related_agent_id !== related_agent_id) return false;
          if (related_spawn_request_id && row.related_spawn_request_id !== related_spawn_request_id) return false;
          if (related_approval_request_id && row.related_approval_request_id !== related_approval_request_id) return false;
          return true;
        });
        const sorted = sortRows(rows, 'asc', 'occurred_at').map(clone);
        return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
      },
    },

    webStudioOrders: {
      async createOrder({ order }) {
        return mutate(async (state) => {
          state.webstudio_orders[order.order_id] = clone(order);
          return clone(state.webstudio_orders[order.order_id]);
        });
      },
      async getOrderById({ order_id }) {
        const state = await loadState();
        return clone(state.webstudio_orders[order_id] || null);
      },
      async listOrders({ filters = null, sort = 'desc' } = {}) {
        const state = await loadState();
        return sortRows(webStudioOrderList(state).filter((row) => matchesFilters(row, filters)), sort, 'updated_at').map(clone);
      },
      async updateOrderById({ order_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_orders[order_id];
          if (!current) return null;
          state.webstudio_orders[order_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_orders[order_id]);
        });
      },
    },

    webStudioVariants: {
      async createVariant({ variant }) {
        return mutate(async (state) => {
          state.webstudio_variants[variant.variant_id] = clone(variant);
          return clone(state.webstudio_variants[variant.variant_id]);
        });
      },
      async getVariantById({ variant_id }) {
        const state = await loadState();
        return clone(state.webstudio_variants[variant_id] || null);
      },
      async listVariants({ filters = null, sort = 'asc' } = {}) {
        const state = await loadState();
        return sortRows(webStudioVariantList(state).filter((row) => matchesFilters(row, filters)), sort, 'created_at').map(clone);
      },
      async updateVariantById({ variant_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_variants[variant_id];
          if (!current) return null;
          state.webstudio_variants[variant_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_variants[variant_id]);
        });
      },
      async listVariantsByOrderId({ order_id }) {
        const state = await loadState();
        return webStudioVariantList(state).filter((row) => row.order_id === order_id).map(clone);
      },
    },

    webStudioQAResults: {
      async createQAResult({ qa_result }) {
        return mutate(async (state) => {
          state.webstudio_qa_results[qa_result.qa_result_id] = clone(qa_result);
          return clone(state.webstudio_qa_results[qa_result.qa_result_id]);
        });
      },
      async getQAResultById({ qa_result_id }) {
        const state = await loadState();
        return clone(state.webstudio_qa_results[qa_result_id] || null);
      },
      async updateQAResultById({ qa_result_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_qa_results[qa_result_id];
          if (!current) return null;
          state.webstudio_qa_results[qa_result_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_qa_results[qa_result_id]);
        });
      },
      async listQAResultsByOrderId({ order_id }) {
        const state = await loadState();
        return webStudioQaResultList(state).filter((row) => row.order_id === order_id).map(clone);
      },
      async listQAResultsByVariantId({ variant_id }) {
        const state = await loadState();
        return webStudioQaResultList(state).filter((row) => row.variant_id === variant_id).map(clone);
      },
    },

    webStudioDeliveryBundles: {
      async createDeliveryBundle({ delivery_bundle }) {
        return mutate(async (state) => {
          state.webstudio_delivery_bundles[delivery_bundle.delivery_id] = clone(delivery_bundle);
          return clone(state.webstudio_delivery_bundles[delivery_bundle.delivery_id]);
        });
      },
      async getDeliveryBundleById({ delivery_id }) {
        const state = await loadState();
        return clone(state.webstudio_delivery_bundles[delivery_id] || null);
      },
      async getLatestDeliveryBundleByOrderId({ order_id }) {
        const state = await loadState();
        const rows = webStudioDeliveryBundleList(state).filter((row) => row.order_id === order_id);
        const sorted = sortRows(rows, 'desc', 'created_at');
        return clone(sorted[0] || null);
      },
      async updateDeliveryBundleById({ delivery_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_delivery_bundles[delivery_id];
          if (!current) return null;
          state.webstudio_delivery_bundles[delivery_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_delivery_bundles[delivery_id]);
        });
      },
    },

    webStudioTaskFlowBindings: {
      async createBinding({ binding }) {
        return mutate(async (state) => {
          state.webstudio_taskflow_bindings[binding.binding_id] = clone(binding);
          return clone(state.webstudio_taskflow_bindings[binding.binding_id]);
        });
      },
      async getBindingById({ binding_id }) {
        const state = await loadState();
        return clone(state.webstudio_taskflow_bindings[binding_id] || null);
      },
      async getBindingByOrderId({ order_id }) {
        const state = await loadState();
        const found = webStudioTaskFlowBindingList(state).find((row) => row.order_id === order_id) || null;
        return clone(found);
      },
      async listBindings({ filters = null, sort = 'desc' } = {}) {
        const state = await loadState();
        return sortRows(webStudioTaskFlowBindingList(state).filter((row) => matchesFilters(row, filters)), sort, 'updated_at').map(clone);
      },
      async updateBindingById({ binding_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_taskflow_bindings[binding_id];
          if (!current) return null;
          state.webstudio_taskflow_bindings[binding_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_taskflow_bindings[binding_id]);
        });
      },
    },

    webStudioChildSessions: {
      async createChildSession({ child_session }) {
        return mutate(async (state) => {
          state.webstudio_child_sessions[child_session.child_session_id] = clone(child_session);
          return clone(state.webstudio_child_sessions[child_session.child_session_id]);
        });
      },
      async getChildSessionById({ child_session_id }) {
        const state = await loadState();
        return clone(state.webstudio_child_sessions[child_session_id] || null);
      },
      async getChildSessionByVariantId({ variant_id }) {
        const state = await loadState();
        const found = webStudioChildSessionList(state).find((row) => row.variant_id === variant_id) || null;
        return clone(found);
      },
      async listChildSessions({ filters = null, sort = 'asc' } = {}) {
        const state = await loadState();
        return sortRows(webStudioChildSessionList(state).filter((row) => matchesFilters(row, filters)), sort, 'created_at').map(clone);
      },
      async listChildSessionsByOrderId({ order_id }) {
        const state = await loadState();
        return webStudioChildSessionList(state).filter((row) => row.order_id === order_id).map(clone);
      },
      async updateChildSessionById({ child_session_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_child_sessions[child_session_id];
          if (!current) return null;
          state.webstudio_child_sessions[child_session_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_child_sessions[child_session_id]);
        });
      },
    },

    webStudioBrowserQAEvidence: {
      async createBrowserEvidence({ browser_evidence }) {
        return mutate(async (state) => {
          state.webstudio_browser_qa_evidence[browser_evidence.browser_evidence_id] = clone(browser_evidence);
          return clone(state.webstudio_browser_qa_evidence[browser_evidence.browser_evidence_id]);
        });
      },
      async getBrowserEvidenceById({ browser_evidence_id }) {
        const state = await loadState();
        return clone(state.webstudio_browser_qa_evidence[browser_evidence_id] || null);
      },
      async getBrowserEvidenceByVariantId({ variant_id }) {
        const state = await loadState();
        const found = webStudioBrowserQaEvidenceList(state).find((row) => row.variant_id === variant_id) || null;
        return clone(found);
      },
      async listBrowserEvidence({ filters = null, sort = 'asc' } = {}) {
        const state = await loadState();
        return sortRows(webStudioBrowserQaEvidenceList(state).filter((row) => matchesFilters(row, filters)), sort, 'created_at').map(clone);
      },
      async listBrowserEvidenceByOrderId({ order_id }) {
        const state = await loadState();
        return webStudioBrowserQaEvidenceList(state).filter((row) => row.order_id === order_id).map(clone);
      },
      async updateBrowserEvidenceById({ browser_evidence_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_browser_qa_evidence[browser_evidence_id];
          if (!current) return null;
          state.webstudio_browser_qa_evidence[browser_evidence_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_browser_qa_evidence[browser_evidence_id]);
        });
      },
    },

    webStudioBuildArtifacts: {
      async createBuildArtifact({ build_artifact }) {
        return mutate(async (state) => {
          state.webstudio_build_artifacts[build_artifact.build_artifact_id] = clone(build_artifact);
          return clone(state.webstudio_build_artifacts[build_artifact.build_artifact_id]);
        });
      },
      async getBuildArtifactById({ build_artifact_id }) {
        const state = await loadState();
        return clone(state.webstudio_build_artifacts[build_artifact_id] || null);
      },
      async getBuildArtifactByVariantId({ variant_id }) {
        const state = await loadState();
        const found = webStudioBuildArtifactList(state).find((row) => row.variant_id === variant_id) || null;
        return clone(found);
      },
      async listBuildArtifacts({ filters = null, sort = 'asc' } = {}) {
        const state = await loadState();
        return sortRows(webStudioBuildArtifactList(state).filter((row) => matchesFilters(row, filters)), sort, 'created_at').map(clone);
      },
      async listBuildArtifactsByOrderId({ order_id }) {
        const state = await loadState();
        return webStudioBuildArtifactList(state).filter((row) => row.order_id === order_id).map(clone);
      },
      async updateBuildArtifactById({ build_artifact_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_build_artifacts[build_artifact_id];
          if (!current) return null;
          state.webstudio_build_artifacts[build_artifact_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_build_artifacts[build_artifact_id]);
        });
      },
    },

    webStudioRevisionRequests: {
      async createRevisionRequest({ revision_request }) {
        return mutate(async (state) => {
          state.webstudio_revision_requests[revision_request.revision_request_id] = clone(revision_request);
          return clone(state.webstudio_revision_requests[revision_request.revision_request_id]);
        });
      },
      async getRevisionRequestById({ revision_request_id }) {
        const state = await loadState();
        return clone(state.webstudio_revision_requests[revision_request_id] || null);
      },
      async listRevisionRequests({ filters = null, sort = 'asc' } = {}) {
        const state = await loadState();
        return sortRows(webStudioRevisionRequestList(state).filter((row) => matchesFilters(row, filters)), sort, 'created_at').map(clone);
      },
      async listRevisionRequestsByOrderId({ order_id }) {
        const state = await loadState();
        return webStudioRevisionRequestList(state).filter((row) => row.order_id === order_id).map(clone);
      },
      async updateRevisionRequestById({ revision_request_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_revision_requests[revision_request_id];
          if (!current) return null;
          state.webstudio_revision_requests[revision_request_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_revision_requests[revision_request_id]);
        });
      },
    },

    webStudioPublicDeliveryBundles: {
      async createPublicDeliveryBundle({ public_delivery_bundle }) {
        return mutate(async (state) => {
          state.webstudio_public_delivery_bundles[public_delivery_bundle.public_delivery_id] = clone(public_delivery_bundle);
          return clone(state.webstudio_public_delivery_bundles[public_delivery_bundle.public_delivery_id]);
        });
      },
      async getPublicDeliveryBundleById({ public_delivery_id }) {
        const state = await loadState();
        return clone(state.webstudio_public_delivery_bundles[public_delivery_id] || null);
      },
      async getPublicDeliveryBundleByOrderId({ order_id }) {
        const state = await loadState();
        const rows = webStudioPublicDeliveryBundleList(state).filter((row) => row.order_id === order_id);
        const sorted = sortRows(rows, 'desc', 'created_at');
        return clone(sorted[0] || null);
      },
      async updatePublicDeliveryBundleById({ public_delivery_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_public_delivery_bundles[public_delivery_id];
          if (!current) return null;
          state.webstudio_public_delivery_bundles[public_delivery_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_public_delivery_bundles[public_delivery_id]);
        });
      },
    },

    webStudioExecutionRuns: {
      async createExecutionRun({ execution_run }) {
        return mutate(async (state) => {
          state.webstudio_execution_runs[execution_run.execution_run_id] = clone(execution_run);
          return clone(state.webstudio_execution_runs[execution_run.execution_run_id]);
        });
      },
      async getExecutionRunById({ execution_run_id }) {
        const state = await loadState();
        return clone(state.webstudio_execution_runs[execution_run_id] || null);
      },
      async listExecutionRuns({ filters = null, sort = 'asc' } = {}) {
        const state = await loadState();
        return sortRows(webStudioExecutionRunList(state).filter((row) => matchesFilters(row, filters)), sort, 'created_at').map(clone);
      },
      async listExecutionRunsByOrderId({ order_id }) {
        const state = await loadState();
        return webStudioExecutionRunList(state).filter((row) => row.order_id === order_id).map(clone);
      },
      async updateExecutionRunById({ execution_run_id, patch }) {
        return mutate(async (state) => {
          const current = state.webstudio_execution_runs[execution_run_id];
          if (!current) return null;
          state.webstudio_execution_runs[execution_run_id] = { ...current, ...clone(patch) };
          return clone(state.webstudio_execution_runs[execution_run_id]);
        });
      },
    },
  };

  async function ensureRootTask(task) {
    return repositories.tasks.createTask({ task });
  }

  async function clearRuntimeState() {
    await saveState({
      storage_version: STORAGE_VERSION,
      tasks: {},
      task_events: {},
      agent_templates: {},
      spawn_requests: {},
      approval_requests: {},
      agent_registry: {},
      checkpoints: {},
      audit_events: {},
      webstudio_orders: {},
      webstudio_variants: {},
      webstudio_qa_results: {},
      webstudio_delivery_bundles: {},
      webstudio_taskflow_bindings: {},
      webstudio_child_sessions: {},
      webstudio_browser_qa_evidence: {},
      webstudio_build_artifacts: {},
      webstudio_revision_requests: {},
      webstudio_public_delivery_bundles: {},
      webstudio_execution_runs: {},
    });
    await loadState();
  }

  async function exportState() {
    return loadState();
  }

  return Object.freeze({
    repositories,
    ensureRootTask,
    clearRuntimeState,
    exportState,
    storageDir,
    stateFile,
  });
}

module.exports = {
  createFileBackedFirstGovernedWorkflowRepositoryAdapter,
};
