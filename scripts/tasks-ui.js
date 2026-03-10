(function(){
  const activeEl = document.getElementById('active');
  const doneEl = document.getElementById('done');
  const cpuEl = document.getElementById('cpu');
  const loadEl = document.getElementById('load');
  const tasksActiveEl = document.getElementById('tasks-active');
  const tasksDoneEl = document.getElementById('tasks-done');
  const nowDoingEl = document.getElementById('now-doing');
  const gatewayStateEl = document.getElementById('gateway-state');
  const stateTsEl = document.getElementById('state-ts');
  const opsTasksEl = document.getElementById('ops-tasks');

  const API_BASE = 'http://5.45.115.12:8787';
  const API_ENDPOINT = API_BASE + '/api/state';
  const OPS_HEALTH_ENDPOINT = API_BASE + '/api/ops/health';

  const newTaskInput = document.getElementById('new-task-title');
  const newTaskBtn = document.getElementById('new-task-btn');
  const toggleInput = document.getElementById('toggle-id');
  const toggleBtn = document.getElementById('toggle-btn');
  const tickBtn = document.getElementById('tick-btn');
  const apiStatusEl = document.getElementById('api-status');

  let lastTasks = [];
  let lastCpuLoad = { cpu: '--', load: '--' };

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
  }

  async function pollTasks() {
    try {
      const response = await fetch('./state.json?ts=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const tasks = payload?.taskState?.tasks || [];
      lastTasks = tasks;
      renderTasks(tasks);
    } catch (error) {
      console.error('tasks poll failed', error);
    }
  }

  async function pollCpuLoad() {
    try {
      const response = await fetch(OPS_HEALTH_ENDPOINT + '?ts=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('api status ' + response.status);
      const payload = await response.json();
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const json = await response.json().catch(() => ({}));
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
      const out = await postJson(API_BASE + '/api/tasks', { title });
      newTaskInput.value = '';
      setApiStatus('API: задача создана');
      emitUnityEvent('task-created', { title, taskId: out?.task?.id || null });
      await pollTasks();
    } catch (e) {
      setApiStatus('API: ошибка create task — ' + e.message, true);
    }
  }

  async function handleToggle() {
    const id = String(toggleInput?.value || '').trim() || 'lights';
    try {
      setApiStatus('API: переключаю ' + id + '…');
      const out = await postJson(API_BASE + '/api/toggles/' + encodeURIComponent(id), {});
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
      const out = await postJson(API_BASE + '/api/orchestrator/tick', {});
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
  toggleBtn?.addEventListener('click', handleToggle);
  tickBtn?.addEventListener('click', handleTick);
  newTaskInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleNewTask();
  });

  pollTasks();
  pollCpuLoad();
  setInterval(pollTasks, 5000);
  setInterval(pollCpuLoad, 30000);
})();
