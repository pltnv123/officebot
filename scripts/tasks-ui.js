(function(){
  const activeEl = document.getElementById('active');
  const doneEl = document.getElementById('done');
  const cpuEl = document.getElementById('cpu');
  const loadEl = document.getElementById('load');
  const tasksActiveEl = document.getElementById('tasks-active');
  const tasksDoneEl = document.getElementById('tasks-done');
  const nowDoingEl = document.getElementById('now-doing');
  const operatorFeedEl = document.getElementById('operator-feed');
  const operatorPolicyHintEl = document.getElementById('operator-policy-hint');
  const operatorOnboardingEl = document.getElementById('operator-onboarding');
  const analyticsPanelEl = document.getElementById('analytics-panel');
  const decisionPanelEl = document.getElementById('decision-panel');
  const decisionOwnerBadgeEl = document.getElementById('decision-owner-badge');
  const decisionBriefEl = document.getElementById('decision-brief');
  const decisionSummaryEl = document.getElementById('decision-summary');
  const decisionRoutingSummaryEl = document.getElementById('decision-routing-summary');
  const decisionHintsEl = document.getElementById('decision-hints');
  const decisionCompactEl = document.getElementById('decision-compact');
  const decisionMemoryEl = document.getElementById('decision-memory');
  const executivePanelEl = document.getElementById('executive-panel');
  const executiveFocusBadgeEl = document.getElementById('executive-focus-badge');
  const executiveBriefEl = document.getElementById('executive-brief');
  const executiveAnalyticsEl = document.getElementById('executive-analytics');
  const executiveReportingEl = document.getElementById('executive-reporting');
  const executiveDecisionEl = document.getElementById('executive-decision');
  const executiveMaintenanceEl = document.getElementById('executive-maintenance');
  const executiveWorkflowEl = document.getElementById('executive-workflow');
  const executivePayloadEl = document.getElementById('executive-payload');
  const handoffPanelEl = document.getElementById('handoff-panel');
  const handoffOwnerBadgeEl = document.getElementById('handoff-owner-badge');
  const handoffBriefEl = document.getElementById('handoff-brief');
  const handoffExecutiveEl = document.getElementById('handoff-executive');
  const handoffDecisionEl = document.getElementById('handoff-decision');
  const handoffReportingEl = document.getElementById('handoff-reporting');
  const handoffWorkflowEl = document.getElementById('handoff-workflow');
  const handoffMaintenanceEl = document.getElementById('handoff-maintenance');
  const handoffCloneEl = document.getElementById('handoff-clone');
  const handoffPayloadEl = document.getElementById('handoff-payload');
  const exportIndexPanelEl = document.getElementById('export-index-panel');
  const exportIndexBadgeEl = document.getElementById('export-index-badge');
  const exportIndexBriefEl = document.getElementById('export-index-brief');
  const exportIndexSurfacesEl = document.getElementById('export-index-surfaces');
  const exportIndexEndpointsEl = document.getElementById('export-index-endpoints');
  const exportIndexArtifactsEl = document.getElementById('export-index-artifacts');
  const exportIndexPayloadEl = document.getElementById('export-index-payload');
  const deliveryPackPanelEl = document.getElementById('delivery-pack-panel');
  const deliveryPackBadgeEl = document.getElementById('delivery-pack-badge');
  const deliveryPackBriefEl = document.getElementById('delivery-pack-brief');
  const deliveryPackLandingEl = document.getElementById('delivery-pack-landing');
  const deliveryPackManifestEl = document.getElementById('delivery-pack-manifest');
  const deliveryPackHumanEl = document.getElementById('delivery-pack-human');
  const deliveryPackLinksEl = document.getElementById('delivery-pack-links');
  const deliveryPackPayloadEl = document.getElementById('delivery-pack-payload');
  const assistedPresentationPanelEl = document.getElementById('assisted-presentation-panel');
  const assistedPresentationBadgeEl = document.getElementById('assisted-presentation-badge');
  const assistedPresentationBriefEl = document.getElementById('assisted-presentation-brief');
  const assistedPresentationReadinessEl = document.getElementById('assisted-presentation-readiness');
  const assistedPresentationHandoffEl = document.getElementById('assisted-presentation-handoff');
  const assistedPresentationSummaryEl = document.getElementById('assisted-presentation-summary');
  const assistedPresentationGuidanceEl = document.getElementById('assisted-presentation-guidance');
  const assistedPresentationCompactEl = document.getElementById('assisted-presentation-compact');
  const assistedPresentationPayloadEl = document.getElementById('assisted-presentation-payload');
  const assistedDeliveryPanelEl = document.getElementById('assisted-delivery-panel');
  const assistedDeliveryBadgeEl = document.getElementById('assisted-delivery-badge');
  const assistedDeliveryBriefEl = document.getElementById('assisted-delivery-brief');
  const assistedDeliveryReadinessEl = document.getElementById('assisted-delivery-readiness');
  const assistedDeliveryHandoffEl = document.getElementById('assisted-delivery-handoff');
  const assistedDeliverySummaryEl = document.getElementById('assisted-delivery-summary');
  const assistedDeliveryGuidanceEl = document.getElementById('assisted-delivery-guidance');
  const assistedDeliveryCompactEl = document.getElementById('assisted-delivery-compact');
  const assistedDeliveryCtoEl = document.getElementById('assisted-delivery-cto');
  const assistedDeliveryPayloadEl = document.getElementById('assisted-delivery-payload');
  const assistedIndexPanelEl = document.getElementById('assisted-index-panel');
  const assistedIndexBadgeEl = document.getElementById('assisted-index-badge');
  const assistedIndexBriefEl = document.getElementById('assisted-index-brief');
  const assistedIndexSurfacesEl = document.getElementById('assisted-index-surfaces');
  const assistedIndexPublishingEl = document.getElementById('assisted-index-publishing');
  const assistedIndexEndpointsEl = document.getElementById('assisted-index-endpoints');
  const assistedIndexArtifactsEl = document.getElementById('assisted-index-artifacts');
  const assistedIndexPayloadEl = document.getElementById('assisted-index-payload');
  const assistedPackPanelEl = document.getElementById('assisted-pack-panel');
  const assistedPackBadgeEl = document.getElementById('assisted-pack-badge');
  const assistedPackBriefEl = document.getElementById('assisted-pack-brief');
  const assistedPackManifestEl = document.getElementById('assisted-pack-manifest');
  const assistedPackPrioritiesEl = document.getElementById('assisted-pack-priorities');
  const assistedPackRoutingEl = document.getElementById('assisted-pack-routing');
  const assistedPackPointersEl = document.getElementById('assisted-pack-pointers');
  const assistedPackCtoEl = document.getElementById('assisted-pack-cto');
  const assistedPackPayloadEl = document.getElementById('assisted-pack-payload');
  const gatewayStateEl = document.getElementById('gateway-state');
  const stateTsEl = document.getElementById('state-ts');
  const opsTasksEl = document.getElementById('ops-tasks');
  const actorRoleEl = document.getElementById('actor-role');
  const operatorModeBadgeEl = document.getElementById('operator-mode-badge');
  const liveIndicatorEl = document.getElementById('live-indicator');
  const wsStatusBadgeEl = document.getElementById('ws-status-badge');
  const wsFallbackHintEl = document.getElementById('ws-fallback-hint');
  const obsStorageEl = document.getElementById('obs-storage');
  const obsFreshnessEl = document.getElementById('obs-freshness');
  const obsTaskEventEl = document.getElementById('obs-task-event');
  const obsOperatorHealthEl = document.getElementById('obs-operator-health');
  const obsWarningEl = document.getElementById('obs-warning');

  const API_BASE = '/api';
  const API_ENDPOINT = API_BASE + '/state';
  const OPS_HEALTH_ENDPOINT = API_BASE + '/ops/health';

  const newTaskInput = document.getElementById('new-task-title');
  const newTaskBtn = document.getElementById('new-task-btn');
  const exportAnalyticsBtn = document.getElementById('export-analytics-btn');
  const toggleInput = document.getElementById('toggle-id');
  const toggleBtn = document.getElementById('toggle-btn');
  const tickBtn = document.getElementById('tick-btn');
  const apiStatusEl = document.getElementById('api-status');

  let lastTasks = [];
  let lastCpuLoad = { cpu: '--', load: '--' };
  let actorRole = (new URLSearchParams(window.location.search).get('actorRole') || 'orchestrator').toLowerCase();
  let liveTransport = 'polling';
  let wsConnected = false;
  let lastClientPayload = { updatedAt: null, actor_role: actorRole, reconnect_safe: true, backfill_safe: true, ui: { tasks: [] }, operator: { tasks: [] }, knowledge_context: null };
  let operatorUiState = { inFlightTaskId: '', inFlightAction: '', errorByTask: {}, resultByTask: {}, pendingConfirm: null };

  function toPercent(value) {
    const n = Number(value || 0);
    const pct = n <= 1 ? n * 100 : n;
    return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
  }

  function nodeProgress(node) {
    if (node == null) return 0;
    const hasExplicit = Number.isFinite(Number(node.progress));
    if (hasExplicit) return toPercent(node.progress);

    const children = node.subtasks || [];
    if (!children.length) {
      if (node.status === 'done') return 100;
      if (node.status === 'doing') return 55;
      return 0;
    }

    const total = children.reduce((sum, child) => sum + nodeProgress(child), 0);
    return Math.round((total / Math.max(1, children.length)) * 10) / 10;
  }

  function renderNode(node, level, idx) {
    const row = document.createElement('div');
    row.className = `sub l${Math.min(level, 3)}`;

    const progress = nodeProgress(node);
    const icon = node.status === 'done' ? '✅' : node.status === 'doing' ? '🟡' : '⚪';
    const estimate = Number(node.estimate || 0);
    const actual = Number(node.actual || 0);
    const timeLabel = node.status === 'done' ? `факт ${actual || estimate} мин` : `оценка ${estimate || 0} мин`;

    row.innerHTML = `<div class="sub-head"><span>${icon} ${idx}. ${node.title}</span><span class="sub-meta">${progress}% · ${timeLabel}</span></div>
      <div class="sub-progress"><div class="sub-progress-fill" style="width:${progress}%"></div></div>`;

    (node.subtasks || []).forEach((child, childIdx) => {
      row.appendChild(renderNode(child, level + 1, childIdx + 1));
    });

    return row;
  }


  function assigneeColor(assignee) {
    switch (String(assignee || '').toLowerCase()) {
      case 'chief': return '#ffd27f';
      case 'planner': return '#77b8ff';
      case 'worker': return '#55f5b8';
      case 'tester': return '#9dffb1';
      default: return '#c7c7c7';
    }
  }

  function renderTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task';
    const progress = nodeProgress(task);

    const dot = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${assigneeColor(task.assignee)};margin-right:6px;vertical-align:middle"></span>`;
    card.innerHTML = `<div>${dot}<b>🟡 ${task.id || ''}</b> — ${task.title || 'task'}</div>
      <div class="task-progress"><div class="task-progress-fill" style="width:${progress}%"></div></div>
      <div class="task-progress-label">${progress}%</div>`;

    (task.subtasks || []).forEach((subtask, index) => {
      card.appendChild(renderNode(subtask, 0, index + 1));
    });

    return card;
  }

  function dedupeById(tasks) {
    const seen = new Set();
    return (tasks || []).filter((task) => {
      const id = String(task.id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function renderNowDoing(doingTasks) {
    nowDoingEl.innerHTML = '';
    const current = doingTasks[0];
    if (!current) {
      nowDoingEl.textContent = 'Ожидаю задачи…';
      return;
    }

    const progress = nodeProgress(current);
    const block = document.createElement('div');
    block.className = 'now-item';
    block.innerHTML = `<div><b>${current.id}</b> — ${current.title}</div>
      <div class="task-progress"><div class="task-progress-fill" style="width:${progress}%"></div></div>
      <div class="task-progress-label">${progress}%</div>`;
    nowDoingEl.appendChild(block);
  }

  function badgeClassForUrgency(entry) {
    const urgency = String(entry?.urgency || '').toLowerCase();
    if (urgency === 'urgent') return 'urgent';
    if (urgency === 'elevated') return 'elevated';
    return 'normal';
  }

  function isDestructiveAction(action) {
    return ['reject_task', 'escalate_task'].includes(String(action || ''));
  }

  function actionLabel(action) {
    switch (String(action || '')) {
      case 'approve_task': return 'подтверждение выполнения';
      case 'reject_task': return 'отклонение выполнения';
      case 'requeue_task': return 'повторная постановка';
      case 'escalate_task': return 'эскалация';
      case 'resolve_lock_conflict': return 'разрешение конфликта блокировки';
      default: return String(action || 'operator action');
    }
  }

  function setTaskFeedback(taskId, patch = {}) {
    operatorUiState = {
      ...operatorUiState,
      errorByTask: {
        ...operatorUiState.errorByTask,
        ...(patch.error !== undefined ? { [taskId]: patch.error } : {}),
      },
      resultByTask: {
        ...operatorUiState.resultByTask,
        ...(patch.result !== undefined ? { [taskId]: patch.result } : {}),
      },
    };
  }

  async function executeOperatorAction(taskId, action) {
    try {
      operatorUiState = { ...operatorUiState, inFlightTaskId: taskId, inFlightAction: action, pendingConfirm: null };
      setTaskFeedback(taskId, { error: '', result: `Выполняю: ${actionLabel(action)}…` });
      renderOperatorFeed(lastTasks);
      const out = await postJson(API_BASE + '/operator/action', { taskId, action });
      operatorUiState = { ...operatorUiState, inFlightTaskId: '', inFlightAction: '', pendingConfirm: null };
      setTaskFeedback(taskId, { error: '', result: `Успешно: ${actionLabel(out?.result?.action || action)}` });
      setApiStatus(`API: operator action ${action} выполнен`);
      await pollTasks();
    } catch (e) {
      operatorUiState = { ...operatorUiState, inFlightTaskId: '', inFlightAction: '', pendingConfirm: null };
      setTaskFeedback(taskId, { error: `Не удалось выполнить ${actionLabel(action)}: ${e.message || 'operator action failed'}`, result: '' });
      setApiStatus('API: ошибка operator action — ' + e.message, true);
      renderOperatorFeed(lastTasks);
    }
  }

  function handleOperatorAction(taskId, action) {
    if (operatorUiState.inFlightTaskId) return;
    if (isDestructiveAction(action)) {
      operatorUiState = { ...operatorUiState, pendingConfirm: { taskId, action } };
      setTaskFeedback(taskId, { error: '', result: `Нужно подтверждение: ${actionLabel(action)}` });
      renderOperatorFeed(lastTasks);
      return;
    }
    executeOperatorAction(taskId, action);
  }

  function confirmPendingOperatorAction(taskId, action) {
    if (!operatorUiState.pendingConfirm) return;
    executeOperatorAction(taskId, action);
  }

  function cancelPendingOperatorAction(taskId) {
    operatorUiState = { ...operatorUiState, pendingConfirm: null };
    setTaskFeedback(taskId, { result: 'Действие отменено пользователем' });
    renderOperatorFeed(lastTasks);
  }

  function formatAge(iso) {
    const ts = Date.parse(String(iso || ''));
    if (!ts) return '--';
    const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m`;
  }

  function renderObservabilityStrip() {
    if (obsStorageEl) obsStorageEl.textContent = `storage: ${String(lastClientPayload?.storage || 'unknown')}`;
    const freshnessText = formatAge(lastClientPayload?.updatedAt);
    if (obsFreshnessEl) obsFreshnessEl.textContent = `freshness: ${freshnessText}`;
    const allTasks = Array.isArray(lastClientPayload?.ui?.tasks) ? lastClientPayload.ui.tasks : [];
    const lastEventTs = allTasks
      .flatMap((task) => Array.isArray(task.timeline) ? task.timeline : [])
      .map((event) => event?.ts || null)
      .filter(Boolean)
      .sort()
      .pop();
    if (obsTaskEventEl) obsTaskEventEl.textContent = `task_event: ${lastEventTs ? formatAge(lastEventTs) : 'none'}`;
    const operatorTasks = Array.isArray(lastClientPayload?.operator?.tasks) ? lastClientPayload.operator.tasks : [];
    const visibleActions = operatorTasks.reduce((sum, task) => sum + ((task.actions || []).length), 0);
    if (obsOperatorHealthEl) obsOperatorHealthEl.textContent = `operator: ${operatorTasks.length} cards / ${visibleActions} actions`;

    let warning = '';
    if (freshnessText !== '--') {
      const ts = Date.parse(String(lastClientPayload?.updatedAt || ''));
      if (ts && (Date.now() - ts) > 120000) warning = 'stale-runtime';
    }
    if (!warning && !lastEventTs) warning = 'missing-task-events';
    if (!warning && (actorRole === 'cto' || actorRole === 'qa') && visibleActions === 0) warning = 'read-only-zero-visible-actions';
    if (obsWarningEl) {
      obsWarningEl.style.display = warning ? 'inline-flex' : 'none';
      obsWarningEl.textContent = warning ? `warning: ${warning}` : 'warning: --';
    }
  }

  function renderDecisionPanel() {
    if (!decisionPanelEl) return;
    const knowledge = lastClientPayload?.knowledge_context || null;
    const decision = knowledge?.decision_consumer || null;
    if (!decision) {
      decisionPanelEl.style.display = 'block';
      if (decisionOwnerBadgeEl) decisionOwnerBadgeEl.textContent = 'owner: --';
      if (decisionBriefEl) decisionBriefEl.textContent = 'Decision context is waiting for knowledge-aware payload…';
      if (decisionSummaryEl) decisionSummaryEl.textContent = 'decision_summary: --';
      if (decisionRoutingSummaryEl) decisionRoutingSummaryEl.textContent = 'routing_context_summary: --';
      if (decisionHintsEl) decisionHintsEl.textContent = 'waiting…';
      if (decisionCompactEl) decisionCompactEl.textContent = 'waiting…';
      if (decisionMemoryEl) decisionMemoryEl.textContent = 'waiting…';
      return;
    }

    if (decisionOwnerBadgeEl) decisionOwnerBadgeEl.textContent = `owner: ${decision.suggested_owner || '--'}`;
    if (decisionBriefEl) decisionBriefEl.textContent = decision.cto_orchestrator_brief?.headline || 'Decision brief unavailable';
    if (decisionSummaryEl) {
      const summary = decision.decision_summary || {};
      decisionSummaryEl.textContent = `decision_summary: focus=${summary.routing_focus || 'normal_flow'} | approval=${summary.approval_pending || 0} | escalated=${summary.escalated || 0} | retry=${summary.retry_queue || 0}`;
    }
    if (decisionRoutingSummaryEl) {
      const summary = decision.routing_context_summary || {};
      decisionRoutingSummaryEl.textContent = `routing_context_summary: tasks=${summary.runtime_tasks || 0} | cards=${summary.operator_cards || 0} | pending=${summary.maintenance_pending || 0}`;
    }
    if (decisionHintsEl) {
      const hints = Array.isArray(decision.retrieval_aware_planning_hints) ? decision.retrieval_aware_planning_hints : [];
      decisionHintsEl.innerHTML = hints.map((item) => `<span class="decision-chip ${item.priority || 'low'}">${item.kind} · ${item.system}</span>`).join('') || '<span class="decision-chip">none</span>';
    }
    if (decisionCompactEl) {
      const compact = decision.compact_decision_payload || {};
      const hintKinds = Array.isArray(compact.hint_kinds) ? compact.hint_kinds.join(', ') : 'none';
      decisionCompactEl.innerHTML = [
        `<span class="decision-chip">actor: ${compact.actor_role || '--'}</span>`,
        `<span class="decision-chip">owner: ${compact.suggested_owner || '--'}</span>`,
        `<span class="decision-chip">focus: ${compact.routing_focus || '--'}</span>`,
        `<span class="decision-chip">hints: ${hintKinds}</span>`,
      ].join('');
    }
    if (decisionMemoryEl) {
      const memory = Array.isArray(decision.memory_aware_task_context) ? decision.memory_aware_task_context.slice(0, 3) : [];
      decisionMemoryEl.innerHTML = memory.map((item) => `<div class="decision-memory-item"><div><b>${item.task_id || '--'}</b> — ${item.title || 'task'}</div><div class="decision-memory-meta">memory: ${(item.memory_queries || []).join(' · ') || 'none'}</div><div class="decision-memory-meta">retrieval: ${(item.retrieval_queries || []).join(' · ') || 'none'}</div></div>`).join('') || '<div class="decision-memory-item">none</div>';
    }
  }

  function renderExecutivePanel() {
    if (!executivePanelEl) return;
    const executive = lastClientPayload?.executive_summary || null;
    if (!executive) {
      if (executiveFocusBadgeEl) executiveFocusBadgeEl.textContent = 'focus: --';
      if (executiveBriefEl) executiveBriefEl.textContent = 'Executive summary is waiting for payload…';
      if (executiveAnalyticsEl) executiveAnalyticsEl.textContent = 'analytics_summary: --';
      if (executiveReportingEl) executiveReportingEl.textContent = 'reporting_export_summary: --';
      if (executiveDecisionEl) executiveDecisionEl.textContent = 'decision_context_summary: --';
      if (executiveMaintenanceEl) executiveMaintenanceEl.textContent = 'maintenance_anomaly_digest: --';
      if (executiveWorkflowEl) executiveWorkflowEl.textContent = 'operator_workflow_status_digest: --';
      if (executivePayloadEl) executivePayloadEl.textContent = 'waiting…';
      return;
    }

    if (executiveFocusBadgeEl) executiveFocusBadgeEl.textContent = `focus: ${executive.decision_context_summary?.routing_focus || '--'}`;
    if (executiveBriefEl) executiveBriefEl.textContent = executive.decision_context_summary?.brief || 'Executive brief unavailable';
    if (executiveAnalyticsEl) {
      const a = executive.analytics_summary || {};
      executiveAnalyticsEl.textContent = `analytics_summary: total=${a.total_tasks || 0} | approval=${a.approval_pending || 0} | retry=${a.retry_total || 0} | escalated=${a.escalated || 0}`;
    }
    if (executiveReportingEl) {
      const r = executive.reporting_export_summary || {};
      executiveReportingEl.textContent = `reporting_export_summary: approvals=${r.approvals || 0} | retries=${r.retries || 0} | escalations=${r.escalations || 0} | stale=${r.stale || 0}`;
    }
    if (executiveDecisionEl) {
      const d = executive.decision_context_summary || {};
      executiveDecisionEl.textContent = `decision_context_summary: owner=${d.suggested_owner || '--'} | focus=${d.routing_focus || '--'} | hints=${(d.hint_kinds || []).join(', ') || 'none'}`;
    }
    if (executiveMaintenanceEl) {
      const m = executive.maintenance_anomaly_digest || {};
      executiveMaintenanceEl.textContent = `maintenance_anomaly_digest: pending=${m.pending_total || 0} | urgent=${m.urgent_total || 0} | anomalies=${(m.anomaly_flags || []).join(', ') || 'none'}`;
    }
    if (executiveWorkflowEl) {
      const w = executive.operator_workflow_status_digest || {};
      executiveWorkflowEl.textContent = `operator_workflow_status_digest: cards=${w.card_count || 0} | actions=${w.visible_actions_total || 0} | read_only=${w.read_only_cards || 0}`;
    }
    if (executivePayloadEl) {
      const p = executive.executive_payload || {};
      executivePayloadEl.innerHTML = [
        `<span class="decision-chip">actor: ${p.actor_role || '--'}</span>`,
        `<span class="decision-chip">tasks: ${p.total_tasks || 0}</span>`,
        `<span class="decision-chip">owner: ${p.suggested_owner || '--'}</span>`,
        `<span class="decision-chip">urgent: ${p.urgent_total || 0}</span>`,
        `<span class="decision-chip">anomalies: ${(p.anomaly_flags || []).join(', ') || 'none'}</span>`,
      ].join('');
    }
  }

  function renderHandoffPanel() {
    if (!handoffPanelEl) return;
    const handoff = lastClientPayload?.stakeholder_handoff || null;
    if (!handoff) {
      if (handoffOwnerBadgeEl) handoffOwnerBadgeEl.textContent = 'owner: --';
      if (handoffBriefEl) handoffBriefEl.textContent = 'Stakeholder handoff bundle is waiting for payload…';
      if (handoffExecutiveEl) handoffExecutiveEl.textContent = 'executive_summary: --';
      if (handoffDecisionEl) handoffDecisionEl.textContent = 'decision_context_summary: --';
      if (handoffReportingEl) handoffReportingEl.textContent = 'reporting_export_summary: --';
      if (handoffWorkflowEl) handoffWorkflowEl.textContent = 'operator_workflow_summary: --';
      if (handoffMaintenanceEl) handoffMaintenanceEl.textContent = 'maintenance_anomaly_digest: --';
      if (handoffCloneEl) handoffCloneEl.textContent = 'clone_rehearsal_status: --';
      if (handoffPayloadEl) handoffPayloadEl.textContent = 'waiting…';
      return;
    }

    if (handoffOwnerBadgeEl) handoffOwnerBadgeEl.textContent = `owner: ${handoff.decision_context_summary?.suggested_owner || '--'}`;
    if (handoffBriefEl) handoffBriefEl.textContent = handoff.decision_context_summary?.cto_orchestrator_brief?.headline || 'Handoff brief unavailable';
    if (handoffExecutiveEl) {
      const e = handoff.executive_summary?.analytics_summary || {};
      handoffExecutiveEl.textContent = `executive_summary: total=${e.total_tasks || 0} | approval=${e.approval_pending || 0} | retry=${e.retry_total || 0} | escalated=${e.escalated || 0}`;
    }
    if (handoffDecisionEl) {
      const d = handoff.decision_context_summary || {};
      const ds = d.decision_summary || {};
      handoffDecisionEl.textContent = `decision_context_summary: focus=${ds.routing_focus || '--'} | approval=${ds.approval_pending || 0} | escalated=${ds.escalated || 0}`;
    }
    if (handoffReportingEl) {
      const r = handoff.reporting_export_summary?.reporting_export_summary || {};
      handoffReportingEl.textContent = `reporting_export_summary: approvals=${r.approvals || 0} | retries=${r.retries || 0} | escalations=${r.escalations || 0}`;
    }
    if (handoffWorkflowEl) {
      const w = handoff.operator_workflow_summary || {};
      handoffWorkflowEl.textContent = `operator_workflow_summary: cards=${w.card_count || 0} | actions=${w.visible_actions_total || 0} | read_only=${w.read_only_cards || 0}`;
    }
    if (handoffMaintenanceEl) {
      const m = handoff.maintenance_anomaly_digest || {};
      handoffMaintenanceEl.textContent = `maintenance_anomaly_digest: pending=${m.pending_total || 0} | urgent=${m.urgent_total || 0} | anomalies=${(m.anomaly_flags || []).join(', ') || 'none'}`;
    }
    if (handoffCloneEl) {
      const c = handoff.clone_rehearsal_status || {};
      handoffCloneEl.textContent = `clone_rehearsal_status: tasks=${c.runtime_tasks || 0} | export_ready=${String(c.export_ready)} | states=${Object.keys(c.by_live_state || {}).join(', ') || 'none'}`;
    }
    if (handoffPayloadEl) {
      const p = handoff.handoff_payload || {};
      handoffPayloadEl.innerHTML = [
        `<span class="decision-chip">actor: ${p.actor_role || '--'}</span>`,
        `<span class="decision-chip">tasks: ${p.total_tasks || 0}</span>`,
        `<span class="decision-chip">owner: ${p.suggested_owner || '--'}</span>`,
        `<span class="decision-chip">focus: ${p.routing_focus || '--'}</span>`,
        `<span class="decision-chip">recommendations: ${(p.top_recommendations || []).slice(0, 2).join(', ') || 'none'}</span>`,
      ].join('');
    }
  }

  function renderExportIndexPanel() {
    if (!exportIndexPanelEl) return;
    const index = lastClientPayload?.export_index || null;
    if (!index) {
      if (exportIndexBadgeEl) exportIndexBadgeEl.textContent = 'entry: --';
      if (exportIndexBriefEl) exportIndexBriefEl.textContent = 'Export index is waiting for payload…';
      if (exportIndexSurfacesEl) exportIndexSurfacesEl.textContent = 'surfaces: --';
      if (exportIndexEndpointsEl) exportIndexEndpointsEl.textContent = 'endpoints: --';
      if (exportIndexArtifactsEl) exportIndexArtifactsEl.textContent = 'artifacts: --';
      if (exportIndexPayloadEl) exportIndexPayloadEl.textContent = 'waiting…';
      return;
    }

    if (exportIndexBadgeEl) exportIndexBadgeEl.textContent = `entry: ${index.delivery_payload?.recommended_entry || '--'}`;
    if (exportIndexBriefEl) exportIndexBriefEl.textContent = `Available surfaces: ${(index.delivery_payload?.available_surfaces || []).join(', ') || 'none'}`;
    if (exportIndexSurfacesEl) exportIndexSurfacesEl.textContent = `surfaces: ${Object.keys(index.surfaces || {}).join(', ') || 'none'}`;
    if (exportIndexEndpointsEl) exportIndexEndpointsEl.textContent = `endpoints: ${(index.endpoints || []).join(' | ') || 'none'}`;
    if (exportIndexArtifactsEl) exportIndexArtifactsEl.textContent = `artifacts: ${(index.artifacts || []).join(' | ') || 'none'}`;
    if (exportIndexPayloadEl) {
      const p = index.delivery_payload || {};
      exportIndexPayloadEl.innerHTML = [
        `<span class="decision-chip">actor: ${p.actor_role || '--'}</span>`,
        `<span class="decision-chip">entry: ${p.recommended_entry || '--'}</span>`,
        `<span class="decision-chip">surfaces: ${(p.available_surfaces || []).length}</span>`,
        `<span class="decision-chip">top endpoints: ${(p.top_endpoints || []).length}</span>`,
        `<span class="decision-chip">top artifacts: ${(p.top_artifacts || []).length}</span>`,
      ].join('');
    }
  }

  function renderDeliveryPackPanel() {
    if (!deliveryPackPanelEl) return;
    const pack = lastClientPayload?.delivery_pack || null;
    if (!pack) {
      if (deliveryPackBadgeEl) deliveryPackBadgeEl.textContent = 'entry: --';
      if (deliveryPackBriefEl) deliveryPackBriefEl.textContent = 'Curated delivery pack is waiting for payload…';
      if (deliveryPackLandingEl) deliveryPackLandingEl.textContent = 'landing_report: --';
      if (deliveryPackManifestEl) deliveryPackManifestEl.textContent = 'distribution_manifest: --';
      if (deliveryPackHumanEl) deliveryPackHumanEl.textContent = 'human_handoff_summary: --';
      if (deliveryPackLinksEl) deliveryPackLinksEl.textContent = 'links_and_pointers: --';
      if (deliveryPackPayloadEl) deliveryPackPayloadEl.textContent = 'waiting…';
      return;
    }

    if (deliveryPackBadgeEl) deliveryPackBadgeEl.textContent = `entry: ${pack.landing_report?.recommended_entry || '--'}`;
    if (deliveryPackBriefEl) deliveryPackBriefEl.textContent = pack.landing_report?.subhead || 'Delivery pack brief unavailable';
    if (deliveryPackLandingEl) {
      const l = pack.landing_report || {};
      deliveryPackLandingEl.textContent = `landing_report: headline=${l.headline || '--'} | surfaces=${(l.surfaces_ready || []).join(', ') || 'none'}`;
    }
    if (deliveryPackManifestEl) {
      const m = pack.distribution_manifest || {};
      deliveryPackManifestEl.textContent = `distribution_manifest: endpoints=${(m.endpoints || []).length} | artifacts=${(m.artifacts || []).length} | path=${(m.recommended_path || []).join(' -> ') || 'none'}`;
    }
    if (deliveryPackHumanEl) {
      const h = pack.human_handoff_summary || {};
      deliveryPackHumanEl.textContent = `human_handoff_summary: owner=${h.suggested_owner || '--'} | focus=${h.stakeholder_focus || '--'} | recommendations=${(h.top_recommendations || []).slice(0, 2).join(', ') || 'none'}`;
    }
    if (deliveryPackLinksEl) {
      const keys = Object.keys(pack.links_and_pointers || {});
      deliveryPackLinksEl.textContent = `links_and_pointers: ${keys.join(', ') || 'none'}`;
    }
    if (deliveryPackPayloadEl) {
      const p = pack.machine_readable_manifest || {};
      deliveryPackPayloadEl.innerHTML = [
        `<span class="decision-chip">pack: ${p.pack_kind || '--'}</span>`,
        `<span class="decision-chip">surfaces: ${(p.available_surfaces || []).length}</span>`,
        `<span class="decision-chip">owner: ${p.suggested_owner || '--'}</span>`,
        `<span class="decision-chip">endpoints: ${(p.top_endpoints || []).length}</span>`,
        `<span class="decision-chip">artifacts: ${(p.top_artifacts || []).length}</span>`,
      ].join('');
    }
  }

  function renderAssistedPresentationPanel() {
    if (!assistedPresentationPanelEl) return;
    const presentation = lastClientPayload?.assisted_execution_presentation || null;
    if (!presentation) {
      if (assistedPresentationBadgeEl) assistedPresentationBadgeEl.textContent = 'owner: --';
      if (assistedPresentationBriefEl) assistedPresentationBriefEl.textContent = 'Assisted execution presentation is waiting for payload…';
      if (assistedPresentationReadinessEl) assistedPresentationReadinessEl.textContent = 'readiness_outputs: --';
      if (assistedPresentationHandoffEl) assistedPresentationHandoffEl.textContent = 'suggested_next_handoff: --';
      if (assistedPresentationSummaryEl) assistedPresentationSummaryEl.textContent = 'execution_handoff_summary: --';
      if (assistedPresentationGuidanceEl) assistedPresentationGuidanceEl.textContent = 'next_action_guidance: --';
      if (assistedPresentationCompactEl) assistedPresentationCompactEl.textContent = 'compact_handoff_surface: --';
      if (assistedPresentationPayloadEl) assistedPresentationPayloadEl.textContent = 'waiting…';
      return;
    }

    if (assistedPresentationBadgeEl) assistedPresentationBadgeEl.textContent = `owner: ${presentation.suggested_next_handoff?.owner || '--'}`;
    if (assistedPresentationBriefEl) assistedPresentationBriefEl.textContent = `Guidance mode: ${presentation.next_action_guidance?.guidance_mode || 'non_destructive'}`;
    if (assistedPresentationReadinessEl) assistedPresentationReadinessEl.textContent = `readiness_outputs: ${(presentation.readiness_outputs || []).length} tasks | ready=${(presentation.readiness_outputs || []).filter((item) => item.review_ready).length}`;
    if (assistedPresentationHandoffEl) {
      const h = presentation.suggested_next_handoff || {};
      assistedPresentationHandoffEl.textContent = `suggested_next_handoff: owner=${h.owner || '--'} | kind=${h.kind || '--'} | priority=${h.priority || '--'}`;
    }
    if (assistedPresentationSummaryEl) {
      const s = presentation.execution_handoff_summary || {};
      assistedPresentationSummaryEl.textContent = `execution_handoff_summary: owner=${s.suggested_owner || '--'} | focus=${s.routing_focus || '--'} | actions=${(s.top_operator_actions || []).join(', ') || 'none'}`;
    }
    if (assistedPresentationGuidanceEl) {
      const g = presentation.next_action_guidance || {};
      assistedPresentationGuidanceEl.textContent = `next_action_guidance: ${(g.next_actions || []).map((item) => item.kind).join(', ') || 'none'}`;
    }
    if (assistedPresentationCompactEl) {
      const c = presentation.compact_handoff_surface || {};
      assistedPresentationCompactEl.textContent = `compact_handoff_surface: ready=${c.readiness_ready_total || 0} | visible_actions=${c.role_aware?.visible_actions_total || 0} | reconnect_safe=${String(c.snapshot_safe?.reconnect_safe)}`;
    }
    if (assistedPresentationPayloadEl) {
      const p = presentation.presentation_payload || {};
      assistedPresentationPayloadEl.innerHTML = [
        `<span class="decision-chip">owner: ${p.suggested_owner || '--'}</span>`,
        `<span class="decision-chip">handoff: ${p.handoff_kind || '--'}</span>`,
        `<span class="decision-chip">ready: ${p.readiness_ready_total || 0}</span>`,
        `<span class="decision-chip">next actions: ${p.next_actions_total || 0}</span>`,
        `<span class="decision-chip">guidance: ${(p.top_guidance || []).join(', ') || 'none'}</span>`,
      ].join('');
    }
  }

  function renderAssistedDeliveryPanel() {
    if (!assistedDeliveryPanelEl) return;
    const bundle = lastClientPayload?.assisted_execution_delivery || null;
    if (!bundle) {
      if (assistedDeliveryBadgeEl) assistedDeliveryBadgeEl.textContent = 'owner: --';
      if (assistedDeliveryBriefEl) assistedDeliveryBriefEl.textContent = 'Assisted execution delivery bundle is waiting for payload…';
      if (assistedDeliveryReadinessEl) assistedDeliveryReadinessEl.textContent = 'readiness_outputs: --';
      if (assistedDeliveryHandoffEl) assistedDeliveryHandoffEl.textContent = 'suggested_next_handoff: --';
      if (assistedDeliverySummaryEl) assistedDeliverySummaryEl.textContent = 'execution_handoff_summary: --';
      if (assistedDeliveryGuidanceEl) assistedDeliveryGuidanceEl.textContent = 'next_action_guidance: --';
      if (assistedDeliveryCompactEl) assistedDeliveryCompactEl.textContent = 'compact_handoff_surface: --';
      if (assistedDeliveryCtoEl) assistedDeliveryCtoEl.textContent = 'cto_orchestrator_handoff_summary: --';
      if (assistedDeliveryPayloadEl) assistedDeliveryPayloadEl.textContent = 'waiting…';
      return;
    }

    if (assistedDeliveryBadgeEl) assistedDeliveryBadgeEl.textContent = `owner: ${bundle.suggested_next_handoff?.owner || '--'}`;
    if (assistedDeliveryBriefEl) assistedDeliveryBriefEl.textContent = `Presentation ready: ${String(bundle.delivery_payload?.presentation_ready)}`;
    if (assistedDeliveryReadinessEl) assistedDeliveryReadinessEl.textContent = `readiness_outputs: ${(bundle.readiness_outputs || []).length} tasks | ready=${(bundle.readiness_outputs || []).filter((item) => item.review_ready).length}`;
    if (assistedDeliveryHandoffEl) {
      const h = bundle.suggested_next_handoff || {};
      assistedDeliveryHandoffEl.textContent = `suggested_next_handoff: owner=${h.owner || '--'} | kind=${h.kind || '--'} | priority=${h.priority || '--'}`;
    }
    if (assistedDeliverySummaryEl) {
      const s = bundle.execution_handoff_summary || {};
      assistedDeliverySummaryEl.textContent = `execution_handoff_summary: owner=${s.suggested_owner || '--'} | focus=${s.routing_focus || '--'} | actions=${(s.top_operator_actions || []).join(', ') || 'none'}`;
    }
    if (assistedDeliveryGuidanceEl) {
      const g = bundle.next_action_guidance || {};
      assistedDeliveryGuidanceEl.textContent = `next_action_guidance: ${(g.next_actions || []).map((item) => item.kind).join(', ') || 'none'}`;
    }
    if (assistedDeliveryCompactEl) {
      const c = bundle.compact_handoff_surface || {};
      assistedDeliveryCompactEl.textContent = `compact_handoff_surface: ready=${c.readiness_ready_total || 0} | visible_actions=${c.role_aware?.visible_actions_total || 0} | reconnect_safe=${String(c.snapshot_safe?.reconnect_safe)}`;
    }
    if (assistedDeliveryCtoEl) {
      const cto = bundle.cto_orchestrator_handoff_summary || {};
      assistedDeliveryCtoEl.textContent = `cto_orchestrator_handoff_summary: owner=${cto.suggested_owner || '--'} | handoff=${cto.handoff_kind || '--'} | next_actions=${cto.next_actions_total || 0}`;
    }
    if (assistedDeliveryPayloadEl) {
      const p = bundle.delivery_payload || {};
      assistedDeliveryPayloadEl.innerHTML = [
        `<span class="decision-chip">owner: ${p.suggested_owner || '--'}</span>`,
        `<span class="decision-chip">ready: ${p.readiness_ready_total || 0}</span>`,
        `<span class="decision-chip">next actions: ${p.next_actions_total || 0}</span>`,
        `<span class="decision-chip">presentation: ${String(p.presentation_ready)}</span>`,
        `<span class="decision-chip">guidance: ${(p.top_guidance || []).join(', ') || 'none'}</span>`,
      ].join('');
    }
  }

  function renderAssistedIndexPanel() {
    if (!assistedIndexPanelEl) return;
    const bundleIndex = lastClientPayload?.assisted_execution_bundle_index || null;
    if (!bundleIndex) {
      if (assistedIndexBadgeEl) assistedIndexBadgeEl.textContent = 'entry: --';
      if (assistedIndexBriefEl) assistedIndexBriefEl.textContent = 'Assisted execution bundle index is waiting for payload…';
      if (assistedIndexSurfacesEl) assistedIndexSurfacesEl.textContent = 'surfaces: --';
      if (assistedIndexPublishingEl) assistedIndexPublishingEl.textContent = 'publishing_map: --';
      if (assistedIndexEndpointsEl) assistedIndexEndpointsEl.textContent = 'endpoints: --';
      if (assistedIndexArtifactsEl) assistedIndexArtifactsEl.textContent = 'artifacts: --';
      if (assistedIndexPayloadEl) assistedIndexPayloadEl.textContent = 'waiting…';
      return;
    }

    if (assistedIndexBadgeEl) assistedIndexBadgeEl.textContent = `entry: ${bundleIndex.publishing_map?.recommended_entry || '--'}`;
    if (assistedIndexBriefEl) assistedIndexBriefEl.textContent = `CTO primary: ${bundleIndex.publishing_map?.cto_primary_surface || '--'} | Orchestrator primary: ${bundleIndex.publishing_map?.orchestrator_primary_surface || '--'}`;
    if (assistedIndexSurfacesEl) assistedIndexSurfacesEl.textContent = `surfaces: ${Object.keys(bundleIndex.surfaces || {}).join(', ') || 'none'}`;
    if (assistedIndexPublishingEl) {
      const p = bundleIndex.publishing_map || {};
      assistedIndexPublishingEl.textContent = `publishing_map: recommended=${p.recommended_entry || '--'} | read_only=${String(p.read_only)} | reconnect_safe=${String(p.snapshot_safe?.reconnect_safe)}`;
    }
    if (assistedIndexEndpointsEl) assistedIndexEndpointsEl.textContent = `endpoints: ${(bundleIndex.endpoints || []).join(', ') || 'none'}`;
    if (assistedIndexArtifactsEl) assistedIndexArtifactsEl.textContent = `artifacts: ${(bundleIndex.artifacts || []).join(', ') || 'none'}`;
    if (assistedIndexPayloadEl) {
      const p = bundleIndex.publishing_payload || {};
      assistedIndexPayloadEl.innerHTML = [
        `<span class="decision-chip">entry: ${p.recommended_entry || '--'}</span>`,
        `<span class="decision-chip">surfaces: ${(p.available_surfaces || []).length}</span>`,
        `<span class="decision-chip">top endpoints: ${(p.top_endpoints || []).join(', ') || 'none'}</span>`,
        `<span class="decision-chip">distribution: ${(p.distribution_map || []).join(' | ') || 'none'}</span>`,
      ].join('');
    }
  }

  function renderAssistedPackPanel() {
    if (!assistedPackPanelEl) return;
    const pack = lastClientPayload?.assisted_execution_publishing_pack || null;
    if (!pack) {
      if (assistedPackBadgeEl) assistedPackBadgeEl.textContent = 'entry: --';
      if (assistedPackBriefEl) assistedPackBriefEl.textContent = 'Assisted execution publishing pack is waiting for payload…';
      if (assistedPackManifestEl) assistedPackManifestEl.textContent = 'consumer_handoff_manifest: --';
      if (assistedPackPrioritiesEl) assistedPackPrioritiesEl.textContent = 'distribution_priorities: --';
      if (assistedPackRoutingEl) assistedPackRoutingEl.textContent = 'curated_entry_routing: --';
      if (assistedPackPointersEl) assistedPackPointersEl.textContent = 'surface_pointers: --';
      if (assistedPackCtoEl) assistedPackCtoEl.textContent = 'cto_orchestrator_consumption_summary: --';
      if (assistedPackPayloadEl) assistedPackPayloadEl.textContent = 'waiting…';
      return;
    }

    if (assistedPackBadgeEl) assistedPackBadgeEl.textContent = `entry: ${pack.curated_entry_routing?.recommended_entry || '--'}`;
    if (assistedPackBriefEl) assistedPackBriefEl.textContent = pack.consumer_handoff_manifest?.headline || 'Publishing pack unavailable';
    if (assistedPackManifestEl) {
      const m = pack.consumer_handoff_manifest || {};
      assistedPackManifestEl.textContent = `consumer_handoff_manifest: owner=${m.suggested_owner || '--'} | entry=${m.recommended_entry || '--'} | ready=${String(m.pack_ready)}`;
    }
    if (assistedPackPrioritiesEl) {
      const p = pack.distribution_priorities || {};
      assistedPackPrioritiesEl.textContent = `distribution_priorities: cto=${p.cto_priority || '--'} | orchestrator=${p.orchestrator_priority || '--'} | guidance=${(p.top_guidance || []).join(', ') || 'none'}`;
    }
    if (assistedPackRoutingEl) {
      const r = pack.curated_entry_routing || {};
      assistedPackRoutingEl.textContent = `curated_entry_routing: recommended=${r.recommended_entry || '--'} | cto=${r.cto_route || '--'} | orchestrator=${r.orchestrator_route || '--'}`;
    }
    if (assistedPackPointersEl) {
      const pointers = Object.keys(pack.surface_pointers || {});
      assistedPackPointersEl.textContent = `surface_pointers: ${pointers.join(', ') || 'none'}`;
    }
    if (assistedPackCtoEl) {
      const c = pack.cto_orchestrator_consumption_summary || {};
      assistedPackCtoEl.textContent = `cto_orchestrator_consumption_summary: owner=${c.suggested_owner || '--'} | handoff=${c.handoff_kind || '--'} | entry=${c.recommended_entry || '--'}`;
    }
    if (assistedPackPayloadEl) {
      const p = pack.publishing_payload || {};
      assistedPackPayloadEl.innerHTML = [
        `<span class="decision-chip">entry: ${p.top_entry || '--'}</span>`,
        `<span class="decision-chip">consumer ready: ${String(p.consumer_ready)}</span>`,
        `<span class="decision-chip">surfaces: ${(p.available_surfaces || []).join(', ') || 'none'}</span>`,
        `<span class="decision-chip">distribution: ${(p.distribution_map || []).join(' | ') || 'none'}</span>`,
      ].join('');
    }
  }

  function renderAnalyticsPanel() {
    if (!analyticsPanelEl) return;
    const analytics = lastClientPayload?.analytics || {};
    const byState = analytics.by_live_state || {};
    const digest = analytics.operator_action_digest || {};
    const exportSummary = analytics.export_summary || {};
    const maintenanceCounts = analytics.maintenance_routine_counts || {};
    const maintenanceByType = maintenanceCounts.by_type || {};
    const maintenanceDigest = analytics.maintenance_digest || {};
    const topPending = Array.isArray(maintenanceDigest.top_pending) ? maintenanceDigest.top_pending : [];
    analyticsPanelEl.textContent = [
      `live_state=${Object.entries(byState).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}`,
      `approval/retry/escalation=${analytics.approval_pending || 0}/${analytics.retry_total || 0}/${analytics.escalated || 0}`,
      `stale/conflict/read-only=${analytics.stuck_total || 0}/${analytics.lock_conflicts || 0}/${analytics.read_only_cards || 0}`,
      `actions=${digest.approval_actions || 0}/${digest.repair_actions || 0}/${digest.executable_actions || 0}/${digest.view_only_actions || 0}`,
      `maintenance=${Object.entries(maintenanceByType).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}`,
      `pending=${maintenanceDigest.pending_total || 0}, urgent=${maintenanceDigest.urgent_total || 0}, top=${topPending.map((item) => `${item.label}:${item.task_id || 'n/a'}`).join('; ') || 'none'}`,
      `export=${Object.entries(exportSummary.by_live_state || {}).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}`,
    ].join(' | ');
  }

  function renderActorRoleUi() {
    if (actorRoleEl) actorRoleEl.textContent = actorRole;
    if (operatorModeBadgeEl) {
      const readOnly = actorRole === 'cto' || actorRole === 'qa';
      operatorModeBadgeEl.textContent = readOnly ? 'read-only' : 'full-access';
      operatorModeBadgeEl.className = `operator-mode-badge ${readOnly ? 'read-only' : 'full-access'}`;
    }
    if (liveIndicatorEl) {
      liveIndicatorEl.textContent = liveTransport;
      liveIndicatorEl.className = `live-indicator ${liveTransport === 'live' ? 'live' : 'polling'}`;
    }
    if (wsStatusBadgeEl) {
      wsStatusBadgeEl.textContent = wsConnected ? 'ws-connected' : 'ws-disconnected';
      wsStatusBadgeEl.className = `ws-status-badge ${wsConnected ? 'connected' : 'disconnected'}`;
    }
    if (wsFallbackHintEl) {
      wsFallbackHintEl.style.display = wsConnected ? 'none' : 'block';
    }
    if (operatorPolicyHintEl) {
      operatorPolicyHintEl.textContent = actorRole === 'orchestrator'
        ? 'Full-access mode: review the card first, then run governance actions allowed by policy.'
        : 'Read-only mode: use cards for review, but treat visible actions as policy guidance unless they are executable for your role.';
    }
    if (operatorOnboardingEl) {
      operatorOnboardingEl.open = actorRole === 'orchestrator' || !lastClientPayload?.operator?.tasks?.length;
    }
    renderObservabilityStrip();
    renderAnalyticsPanel();
    renderDecisionPanel();
    renderExecutivePanel();
    renderHandoffPanel();
    renderExportIndexPanel();
    renderDeliveryPackPanel();
    renderAssistedPresentationPanel();
    renderAssistedDeliveryPanel();
    renderAssistedIndexPanel();
    renderAssistedPackPanel();
  }

  function renderOperatorFeed(tasks) {
    if (!operatorFeedEl) return;
    operatorFeedEl.innerHTML = '';
    const list = dedupeById(tasks).slice(0, 5);
    if (!list.length) {
      operatorFeedEl.innerHTML = '<div class="operator-empty">Ожидаю client payload…</div>';
      return;
    }

    list.forEach((task) => {
      const item = document.createElement('div');
      item.className = 'operator-item';
      const recommendations = Array.isArray(task.top_recommendations) ? task.top_recommendations.slice(0, 3) : [];
      const timeline = Array.isArray(task.timeline) ? task.timeline.slice(-3) : [];
      const approval = Array.isArray(task.grouped_actions?.approval) ? task.grouped_actions.approval : [];
      const repair = Array.isArray(task.grouped_actions?.repair) ? task.grouped_actions.repair : [];
      const hiddenApprovalCount = Math.max(0, Number(task.hidden_actions?.approval || 0));
      const hiddenRepairCount = Math.max(0, Number(task.hidden_actions?.repair || 0));
      const allActions = [...approval, ...repair].filter((entry) => ['approve_task', 'reject_task', 'requeue_task', 'escalate_task', 'resolve_lock_conflict'].includes(String(entry.action || '')));
      const inFlight = operatorUiState.inFlightTaskId === task.id;
      const pendingConfirm = operatorUiState.pendingConfirm && operatorUiState.pendingConfirm.taskId === task.id ? operatorUiState.pendingConfirm : null;
      const taskError = operatorUiState.errorByTask[task.id] || '';
      const taskResult = operatorUiState.resultByTask[task.id] || '';

      item.innerHTML = `
        <div class="operator-head">
          <div><b>${task.id || ''}</b> — ${task.title || 'task'}</div>
          <span class="operator-state">${task.live_state || 'unknown'}</span>
        </div>
        <div class="operator-summary">${task.audit_digest?.human_review_text || 'Нет human review summary'}</div>
        ${taskResult ? `<div class="operator-feedback task-feedback">${taskResult}</div>` : ''}
        ${taskError ? `<div class="operator-empty error task-error">Ошибка: ${taskError}</div>` : ''}
        ${pendingConfirm ? `<div class="operator-confirm" role="alertdialog" aria-live="polite" aria-label="Требуется подтверждение действия"><div class="operator-confirm-text">Подтвердить: ${actionLabel(pendingConfirm.action)}?</div><div class="operator-chip-list"><button class="operator-chip approval operator-confirm-yes" data-task-id="${task.id}" data-action="${pendingConfirm.action}" aria-label="Подтвердить действие ${actionLabel(pendingConfirm.action)}">Подтвердить</button><button class="operator-chip repair operator-confirm-no" data-task-id="${task.id}" aria-label="Отменить подтверждение">Отмена</button></div></div>` : ''}
        <div class="operator-group">
          <div class="operator-group-title">Top recommendations</div>
          <div class="operator-rec-list">${recommendations.map((entry) => `<div class="operator-rec"><span class="operator-badge ${badgeClassForUrgency(entry)}">${entry.urgency || 'normal'}</span> ${entry.label || entry.action}</div>`).join('') || '<div class="operator-rec">Нет рекомендаций</div>'}</div>
        </div>
        <div class="operator-group">
          <div class="operator-group-title">Approval actions</div>
          <div class="operator-chip-list">${approval.map((entry) => `<button class="operator-chip approval ${entry.executable === false ? 'non-executable' : ''} operator-action ${inFlight ? 'is-busy' : ''} ${isDestructiveAction(entry.action) ? 'is-confirmable' : 'is-immediate'}" data-task-id="${task.id}" data-action="${entry.action}" ${(inFlight || entry.executable === false) ? 'disabled aria-disabled="true"' : ''} title="${entry.executable === false ? 'Visible by policy, but executable only by orchestrator' : (inFlight ? 'Действие выполняется' : (isDestructiveAction(entry.action) ? 'Требует подтверждения' : 'Выполняется сразу'))}" aria-label="${entry.label || entry.action}"><span class="operator-badge ${badgeClassForUrgency(entry)}">${entry.executable === false ? 'view-only' : (inFlight && operatorUiState.inFlightAction === entry.action ? 'in-flight' : (entry.urgency || 'normal'))}</span> ${entry.label || entry.action}</button>`).join('') || '<span class="operator-chip approval">Нет</span>'}${hiddenApprovalCount > 0 ? `<span class="operator-chip approval hidden-placeholder" title="Hidden by current role policy">hidden: ${hiddenApprovalCount}</span>` : ''}</div>
        </div>
        <div class="operator-group">
          <div class="operator-group-title">Repair actions</div>
          <div class="operator-chip-list">${repair.map((entry) => `<button class="operator-chip repair ${entry.executable === false ? 'non-executable' : ''} operator-action ${inFlight ? 'is-busy' : ''} ${isDestructiveAction(entry.action) ? 'is-confirmable' : 'is-immediate'}" data-task-id="${task.id}" data-action="${entry.action}" ${(inFlight || entry.executable === false) ? 'disabled aria-disabled="true"' : ''} title="${entry.executable === false ? 'Visible by policy, but executable only by orchestrator' : (inFlight ? 'Действие выполняется' : (isDestructiveAction(entry.action) ? 'Требует подтверждения' : 'Выполняется сразу'))}" aria-label="${entry.label || entry.action}"><span class="operator-badge ${badgeClassForUrgency(entry)}">${entry.executable === false ? 'view-only' : (inFlight && operatorUiState.inFlightAction === entry.action ? 'in-flight' : (entry.urgency || 'normal'))}</span> ${entry.label || entry.action}</button>`).join('') || '<span class="operator-chip repair">Нет</span>'}${hiddenRepairCount > 0 ? `<span class="operator-chip repair hidden-placeholder" title="Hidden by current role policy">hidden: ${hiddenRepairCount}</span>` : ''}</div>
        </div>
        <div class="operator-group">
          <div class="operator-group-title">Action bar</div>
          <div class="operator-chip-list">${allActions.map((entry) => `<button class="operator-chip ${entry.group === 'approval' ? 'approval' : 'repair'} operator-action ${inFlight ? 'is-busy' : ''} ${isDestructiveAction(entry.action) ? 'is-confirmable' : 'is-immediate'}" data-task-id="${task.id}" data-action="${entry.action}" ${inFlight ? 'disabled aria-disabled="true"' : ''} aria-label="${entry.label || entry.action}">${inFlight && operatorUiState.inFlightAction === entry.action ? 'Выполняю… ' : ''}${entry.label || entry.action}</button>`).join('') || '<span class="operator-chip">Нет доступных действий</span>'}</div>
        </div>
        <div class="operator-group">
          <div class="operator-group-title">Timeline</div>
          <ul class="operator-timeline">${timeline.map((entry) => `<li>${entry.phase || entry.type || 'event'} · ${entry.owner || 'unknown'}</li>`).join('') || '<li>Нет событий</li>'}</ul>
        </div>
      `;
      operatorFeedEl.appendChild(item);
    });

    operatorFeedEl.querySelectorAll('.operator-action').forEach((button) => {
      button.addEventListener('click', () => handleOperatorAction(button.dataset.taskId, button.dataset.action));
    });
    operatorFeedEl.querySelectorAll('.operator-confirm-yes').forEach((button) => {
      button.addEventListener('click', () => confirmPendingOperatorAction(button.dataset.taskId, button.dataset.action));
    });
    operatorFeedEl.querySelectorAll('.operator-confirm-no').forEach((button) => {
      button.addEventListener('click', () => cancelPendingOperatorAction(button.dataset.taskId));
    });
  }

  function renderTasks(tasks) {
    const deduped = dedupeById(tasks);
    const active = deduped.filter((task) => task.status === 'doing');
    const done = deduped.filter((task) => task.status === 'done');

    activeEl.textContent = String(active.length);
    doneEl.textContent = String(done.length);

    tasksActiveEl.innerHTML = '';
    tasksDoneEl.innerHTML = '';

    active.forEach((task) => tasksActiveEl.appendChild(renderTaskCard(task)));
    done.slice(0, 20).forEach((task) => {
      const row = document.createElement('div');
      row.className = 'task';
      const dot = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${assigneeColor(task.assignee)};margin-right:6px;vertical-align:middle"></span>`;
      row.innerHTML = `<div>${dot}<b style="color:#61d38a">✅ ${task.id || ''}</b> — ${task.title || 'task'}</div>`;
      tasksDoneEl.appendChild(row);
    });

    renderNowDoing(active);
    renderActorRoleUi();
    renderOperatorFeed(deduped);
  }

  function consumeClientPayload(payload) {
    if (!payload || typeof payload !== 'object') return;
    const isFreshSnapshot = payload.updatedAt && payload.updatedAt !== lastClientPayload.updatedAt;
    lastClientPayload = payload;
    actorRole = String(payload?.actor_role || actorRole || 'orchestrator').toLowerCase();
    const uiTasks = payload?.ui?.tasks || [];
    const operatorTasks = payload?.operator?.tasks || [];
    const merged = uiTasks.map((task) => {
      const operator = operatorTasks.find((item) => item.id === task.id) || {};
      const visibleApproval = operator.grouped_actions?.approval || [];
      const visibleRepair = operator.grouped_actions?.repair || [];
      const totalApproval = operator.approval_actions || visibleApproval;
      const totalRepair = operator.repair_actions || visibleRepair;
      return {
        ...task,
        grouped_actions: operator.grouped_actions || { approval: [], repair: [] },
        top_recommendations: operator.top_recommendations || [],
        audit_digest: operator.audit_digest || null,
        hidden_actions: {
          approval: Math.max(0, (Array.isArray(totalApproval) ? totalApproval.length : 0) - visibleApproval.length),
          repair: Math.max(0, (Array.isArray(totalRepair) ? totalRepair.length : 0) - visibleRepair.length),
        },
      };
    });
    lastTasks = merged;
    if (isFreshSnapshot) {
      operatorUiState = {
        ...operatorUiState,
        errorByTask: {},
        resultByTask: {},
        pendingConfirm: null,
      };
    }
    renderTasks(merged);
  }

  async function pollTasks() {
    try {
      const response = await fetch(API_ENDPOINT + '?ts=' + Date.now() + '&actorRole=' + encodeURIComponent(actorRole), { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      liveTransport = 'polling';
      consumeClientPayload(payload?.client || {
        updatedAt: payload?.updatedAt || null,
        actor_role: payload?.client?.actor_role || actorRole,
        storage: payload?.storage || 'unknown',
        analytics: payload?.client?.analytics || payload?.operator?.analytics || null,
        reconnect_safe: true,
        backfill_safe: true,
        ui: payload?.ui || { tasks: [] },
        operator: payload?.operator?.client_payload || { tasks: [] },
      });
    } catch (error) {
      console.error('tasks poll failed', error);
    }
  }

  function startReadOnlyHydrateSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      socket.addEventListener('open', () => {
        wsConnected = true;
        renderActorRoleUi();
      });
      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data || '{}');
          if (payload?.type !== 'state') return;
          const clientPayload = payload?.client || payload?.state?.client || null;
          if (!clientPayload || typeof clientPayload !== 'object') return;
          liveTransport = 'live';
          consumeClientPayload({
            ...clientPayload,
            analytics: clientPayload.analytics || payload?.state?.client?.analytics || payload?.state?.operator?.analytics || lastClientPayload?.analytics || null,
            storage: clientPayload.storage || payload?.state?.storage || lastClientPayload?.storage || 'unknown',
            actor_role: clientPayload.actor_role || actorRole,
          });
        } catch (error) {
          console.error('ws hydrate parse failed', error);
        }
      });
      socket.addEventListener('close', () => {
        wsConnected = false;
        liveTransport = 'polling';
        renderActorRoleUi();
      });
      socket.addEventListener('error', () => {
        wsConnected = false;
        liveTransport = 'polling';
        renderActorRoleUi();
        // read-only hydrate must never replace snapshot polling
      });
    } catch (error) {
      console.error('ws hydrate setup failed', error);
    }
  }

  async function pollCpuLoad() {
    try {
      const response = await fetch(OPS_HEALTH_ENDPOINT + '?ts=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('api status ' + response.status);
      const raw = await response.text();
      let payload = {};
      try { payload = JSON.parse(raw); } catch { throw new Error('invalid JSON from ops health'); }
      const cpu = Number(payload.cpu || 0).toFixed(2) + '%';
      const load = Number(payload.load1 || 0).toFixed(2);
      lastCpuLoad = { cpu, load };
      cpuEl.textContent = cpu;
      loadEl.textContent = load;
      if (gatewayStateEl) {
        const age = Number(payload.stateAgeSec || 0);
        const humanAge = String(payload.stateAgeHuman || '').trim();
        const ageLabel = humanAge ? ` · ${humanAge}` : (Number.isFinite(age) ? ` · ${age}s` : '');
        const stale = Boolean(payload.stale);
        const mode = String(payload.mode || 'unknown');
        gatewayStateEl.textContent = (payload.gatewayUp ? (stale ? 'online(stale)' : 'online') : 'offline') + ageLabel + ` · ${mode}`;
        gatewayStateEl.style.color = payload.gatewayUp ? (stale ? '#ffd27f' : '#7CFC9A') : '#ff8f8f';
      }
      if (stateTsEl) {
        const ts = String(payload.stateTimestamp || '').trim();
        stateTsEl.textContent = ts ? ts.replace('T', ' ').replace('Z', ' UTC') : '--';
      }
      if (opsTasksEl) {
        const t = payload.tasks || {};
        const total = Number(t.total || 0);
        const active = Number(t.active || 0);
        const done = Number(t.done || 0);
        const recentDone = Number(t.recentDone || 0);
        opsTasksEl.textContent = `${active} active / ${done} done / ${total} total / recent:${recentDone}`;
      }
    } catch (error) {
      // keep last known values visible; do not hardcode fake runtime values
      cpuEl.textContent = lastCpuLoad.cpu;
      loadEl.textContent = lastCpuLoad.load;
      if (gatewayStateEl) {
        gatewayStateEl.textContent = 'unknown';
        gatewayStateEl.style.color = '#ffd27f';
      }
      if (stateTsEl) stateTsEl.textContent = '--';
      if (opsTasksEl) opsTasksEl.textContent = '--';
      console.error('cpu/load poll failed', error);
    }
  }

  function emitUnityEvent(type, payload) {
    try {
      window.dispatchEvent(new CustomEvent('office:api-action', {
        detail: {
          type,
          payload: payload || {},
          ts: Date.now(),
        }
      }));
    } catch (_) {}
  }

  function setApiStatus(text, isError = false) {
    if (!apiStatusEl) return;
    apiStatusEl.textContent = text;
    apiStatusEl.style.color = isError ? '#ff8f8f' : '#b9ffcf';
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Actor-Role': actorRole },
      body: JSON.stringify(body || {}),
    });
    const raw = await response.text();
    let json = {};
    try { json = raw ? JSON.parse(raw) : {}; } catch {
      throw new Error('JSON parse error');
    }
    if (!response.ok) {
      throw new Error(json?.error || ('HTTP ' + response.status));
    }
    return json;
  }

  async function handleNewTask() {
    const title = String(newTaskInput?.value || '').trim();
    if (!title) return setApiStatus('API: введите заголовок задачи', true);
    try {
      setApiStatus('API: создаю задачу…');
      const out = await postJson(API_BASE + '/tasks', { title });
      newTaskInput.value = '';
      setApiStatus('API: задача создана');
      emitUnityEvent('task-created', { title, taskId: out?.task?.id || null });
      await pollTasks();
    } catch (e) {
      setApiStatus('API: ошибка create task — ' + e.message, true);
    }
  }

  async function handleExportAnalytics() {
    try {
      setApiStatus('API: exporting operator snapshot…');
      const response = await fetch(API_BASE + '/export/operator-snapshot?actorRole=' + encodeURIComponent(actorRole), {
        cache: 'no-store',
        headers: { 'X-Actor-Role': actorRole },
      });
      if (!response.ok) throw new Error('export failed: ' + response.status);
      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `operator-snapshot-${actorRole}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setApiStatus('API: operator snapshot exported');
    } catch (e) {
      setApiStatus('API: export error — ' + e.message, true);
    }
  }

  async function handleToggle() {
    const id = String(toggleInput?.value || '').trim() || 'lights';
    try {
      setApiStatus('API: переключаю ' + id + '…');
      const out = await postJson(API_BASE + '/toggles/' + encodeURIComponent(id), {});
      setApiStatus('API: toggle ' + id + ' обновлён');
      emitUnityEvent('toggle-updated', { id, value: out?.value });
      await pollCpuLoad();
    } catch (e) {
      setApiStatus('API: ошибка toggle — ' + e.message, true);
    }
  }

  async function handleTick() {
    try {
      setApiStatus('API: закрываю текущий шаг…');
      const out = await postJson(API_BASE + '/orchestrator/tick', {});
      if (out.changed) {
        setApiStatus('API: шаг закрыт, FSM сдвинут');
        emitUnityEvent('fsm-tick', { changed: true, taskId: out.taskId || null });
      } else {
        setApiStatus('API: активного шага нет');
        emitUnityEvent('fsm-tick', { changed: false });
      }
      await pollTasks();
    } catch (e) {
      setApiStatus('API: ошибка tick — ' + e.message, true);
    }
  }

  newTaskBtn?.addEventListener('click', handleNewTask);
  exportAnalyticsBtn?.addEventListener('click', handleExportAnalytics);
  toggleBtn?.addEventListener('click', handleToggle);
  tickBtn?.addEventListener('click', handleTick);
  newTaskInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleNewTask();
  });

  pollTasks();
  pollCpuLoad();
  startReadOnlyHydrateSocket();
  setInterval(pollTasks, 5000);
  setInterval(pollCpuLoad, 30000);
})();
