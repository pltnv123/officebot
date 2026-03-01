(function(){
  const activeEl = document.getElementById('active');
  const doneEl = document.getElementById('done');
  const cpuEl = document.getElementById('cpu');
  const loadEl = document.getElementById('load');
  const tasksActiveEl = document.getElementById('tasks-active');
  const tasksDoneEl = document.getElementById('tasks-done');
  const nowDoingEl = document.getElementById('now-doing');

  const doingProgress = new Map();

  function clamp(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  function progressiveDoingValue(key){
    const prev = doingProgress.get(key) ?? 8;
    const next = clamp(prev + 2, 8, 92);
    doingProgress.set(key, next);
    return next;
  }

  function leafProgress(node, key){
    if(node.status === 'done') return 100;

    const explicit = Number(node.progress);
    if(Number.isFinite(explicit) && explicit >= 0){
      const pct = explicit <= 1 ? explicit * 100 : explicit;
      return Math.round(clamp(pct, 0, 100));
    }

    const estimate = Number(node.estimate || 0);
    const actual = Number(node.actual || 0);
    if(estimate > 0){
      return Math.round(clamp((actual / estimate) * 100, node.status === 'doing' ? 5 : 0, 100));
    }

    if(node.status === 'doing') return progressiveDoingValue(key);
    return 0;
  }

  function nodeProgress(node, key = 'root'){
    const children = node.subtasks || [];
    if(!children.length) return leafProgress(node, key);
    const total = children.reduce((sum, child, i) => sum + nodeProgress(child, `${key}.${i}`), 0);
    const avg = Math.round(total / children.length);
    if(node.status === 'done') return 100;
    if(node.status === 'doing') return clamp(avg, 1, 99);
    return avg;
  }

  function renderNode(node, level, index, key){
    const wrapper = document.createElement('div');
    wrapper.className = 'sub';
    const progress = nodeProgress(node, key);
    const icon = node.status === 'done' ? '✅' : node.status === 'doing' ? '🟡' : '⚪';
    const estimate = Number(node.estimate || 0);
    const actual = Number(node.actual || 0);
    const timing = node.status === 'done' ? `факт ${actual || estimate} мин` : `оценка ${estimate || 0} мин`;

    wrapper.innerHTML = `<div class="sub-head"><span>${icon} ${index}. ${node.title}</span><span class="sub-meta">${progress}% · ${timing}</span></div>
      <div class="sub-progress"><div class="sub-progress-fill" style="width:${progress}%"></div></div>`;

    (node.subtasks || []).forEach((child, childIndex) => {
      wrapper.appendChild(renderNode(child, level + 1, childIndex + 1, `${key}.${childIndex}`));
    });

    return wrapper;
  }

  function renderTaskCard(task){
    const card = document.createElement('div');
    card.className = 'task';
    const progress = nodeProgress(task, task.id || task.title || 'task');
    card.innerHTML = `<div><b>🟡 ${task.id || ''}</b> — ${task.title || 'task'}</div>
      <div class="task-progress"><div class="task-progress-fill" style="width:${progress}%"></div></div>
      <div class="task-progress-label">${progress}%</div>`;

    (task.subtasks || []).forEach((subtask, index) => {
      card.appendChild(renderNode(subtask, 0, index + 1, `${task.id || 'task'}.${index}`));
    });

    return card;
  }

  function renderNow(activeTasks){
    const doing = [];
    const walk = (nodes, prefix) => {
      (nodes || []).forEach((node) => {
        if(node.status === 'doing') doing.push(`${prefix}${node.title}`);
        walk(node.subtasks, `${prefix}↳ `);
      });
    };

    activeTasks.forEach((task) => walk(task.subtasks, `${task.id}: `));
    nowDoingEl.innerHTML = '';

    if(!doing.length){
      nowDoingEl.textContent = 'Ожидаю задачи…';
      return;
    }

    doing.slice(0, 20).forEach((line) => {
      const row = document.createElement('div');
      row.className = 'now-item';
      row.textContent = `🟡 ${line}`;
      nowDoingEl.appendChild(row);
    });
  }

  function renderState(payload){
    const tasks = payload?.taskState?.tasks || [];
    const active = tasks.filter((task) => task.status !== 'done');
    const done = tasks.filter((task) => task.status === 'done');

    activeEl.textContent = String(active.length);
    doneEl.textContent = String(done.length);
    cpuEl.textContent = Number(payload?.gatewayCpu || 0).toFixed(2) + '%';
    loadEl.textContent = Number(payload?.load1 || 0).toFixed(2);

    tasksActiveEl.innerHTML = '';
    tasksDoneEl.innerHTML = '';

    active.forEach((task) => tasksActiveEl.appendChild(renderTaskCard(task)));
    done.slice(0, 20).forEach((task) => {
      const row = document.createElement('div');
      row.className = 'task';
      row.innerHTML = `<div><b>✅ ${task.id || ''}</b> — ${task.title || 'task'}</div>`;
      tasksDoneEl.appendChild(row);
    });

    renderNow(active);
  }

  async function poll(){
    try {
      const response = await fetch('./state.json?ts=' + Date.now(), { cache: 'no-store' });
      if(!response.ok) return;
      const data = await response.json();
      renderState(data);
    } catch (error) {
      console.error('state poll failed', error);
    }
  }

  setInterval(poll, 1500);
  poll();
})();
