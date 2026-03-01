(function(){
  const activeEl = document.getElementById('active');
  const doneEl = document.getElementById('done');
  const cpuEl = document.getElementById('cpu');
  const loadEl = document.getElementById('load');
  const tasksActiveEl = document.getElementById('tasks-active');
  const tasksDoneEl = document.getElementById('tasks-done');
  const nowDoingEl = document.getElementById('now-doing');

  function clamp(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  function leafProgress(node){
    if(node.status === 'done') return 100;

    const explicit = Number(node.progress);
    if(Number.isFinite(explicit) && explicit >= 0){
      const pct = explicit <= 1 ? explicit * 100 : explicit;
      return Math.round(clamp(pct, 0, 100) * 10) / 10;
    }

    const estimate = Number(node.estimate || 0);
    const actual = Number(node.actual || 0);
    if(estimate > 0){
      return Math.round(clamp((actual / estimate) * 100, 0, 100) * 10) / 10;
    }

    // no synthetic progress: only factual data from status/progress/actual
    return node.status === 'doing' ? 0 : 0;
  }

  function nodeProgress(node, key = 'root'){
    const children = node.subtasks || [];
    if(!children.length) return leafProgress(node);
    const total = children.reduce((sum, child, i) => sum + nodeProgress(child, `${key}.${i}`), 0);
    const avg = Math.round((total / children.length) * 10) / 10;
    if(node.status === 'done') return 100;
    if(node.status === 'doing') return clamp(avg, 0, 99);
    return avg;
  }

  const collapseStoreKey = 'officeCollapsedNodes';
  function getCollapsedSet(){
    try { return new Set(JSON.parse(localStorage.getItem(collapseStoreKey) || '[]')); }
    catch { return new Set(); }
  }
  function saveCollapsedSet(set){
    try { localStorage.setItem(collapseStoreKey, JSON.stringify(Array.from(set))); } catch {}
  }

  function renderNode(node, level, index, key){
    const wrapper = document.createElement('div');
    wrapper.className = 'sub';
    const progress = nodeProgress(node, key);
    const icon = node.status === 'done' ? '✅' : node.status === 'doing' ? '🟡' : '⚪';
    const estimate = Number(node.estimate || 0);
    const actual = Number(node.actual || 0);
    let timing = '';
    if(node.status === 'done' && (actual || estimate)) timing = ` · факт ${actual || estimate} мин`;
    if(node.status !== 'done' && estimate > 0) timing = ` · оценка ${estimate} мин`;
    const hasChildren = (node.subtasks || []).length > 0;
    const collapsed = getCollapsedSet().has(key);

    wrapper.innerHTML = `<div class="sub-head" style="cursor:${hasChildren ? 'pointer' : 'default'}"><span>${hasChildren ? (collapsed ? '▸' : '▾') : '•'} ${icon} ${index}. ${node.title}</span><span class="sub-meta">${progress}%${timing}</span></div>
      <div class="sub-progress"><div class="sub-progress-fill" style="width:${progress}%"></div></div>`;

    const head = wrapper.querySelector('.sub-head');

    if(hasChildren){
      head.addEventListener('click', () => {
        const set = getCollapsedSet();
        if(set.has(key)) set.delete(key); else set.add(key);
        saveCollapsedSet(set);
        poll();
      });
    }

    if(!collapsed){
      (node.subtasks || []).forEach((child, childIndex) => {
        wrapper.appendChild(renderNode(child, level + 1, childIndex + 1, `${key}.${childIndex}`));
      });
    }

    return wrapper;
  }

  function renderTaskCard(task){
    const card = document.createElement('div');
    card.className = 'task';
    const taskKey = `task.${task.id || task.title || 'task'}`;
    const collapsed = getCollapsedSet().has(taskKey);
    const progress = nodeProgress(task, task.id || task.title || 'task');

    card.innerHTML = `<div class="task-head" style="cursor:pointer"><b>${collapsed ? '▸' : '▾'} 🟡 ${task.id || ''}</b> — ${task.title || 'task'}</div>
      <div class="task-progress"><div class="task-progress-fill" style="width:${progress}%"></div></div>
      <div class="task-progress-label">${progress}%</div>`;

    const head = card.querySelector('.task-head');
    head.addEventListener('click', () => {
      const set = getCollapsedSet();
      if(set.has(taskKey)) set.delete(taskKey); else set.add(taskKey);
      saveCollapsedSet(set);
      poll();
    });

    if(!collapsed){
      (task.subtasks || []).forEach((subtask, index) => {
        card.appendChild(renderNode(subtask, 0, index + 1, `${task.id || 'task'}.${index}`));
      });
    }

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
