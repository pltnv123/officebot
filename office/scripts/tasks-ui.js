(function(){
  const activeEl = document.getElementById('active');
  const doneEl = document.getElementById('done');
  const cpuEl = document.getElementById('cpu');
  const loadEl = document.getElementById('load');
  const tasksActiveEl = document.getElementById('tasks-active');
  const tasksDoneEl = document.getElementById('tasks-done');
  const nowDoingEl = document.getElementById('now-doing');

  function leafProgress(status){
    if(status === 'done') return 100;
    if(status === 'doing') return 55;
    return 0;
  }

  function nodeProgress(node){
    const children = node.subtasks || [];
    if(!children.length) return leafProgress(node.status);
    const total = children.reduce((sum, child) => sum + nodeProgress(child), 0);
    return Math.round(total / children.length);
  }

  function renderNode(node, level, index){
    const wrapper = document.createElement('div');
    wrapper.className = 'sub';
    const progress = nodeProgress(node);
    const icon = node.status === 'done' ? '✅' : node.status === 'doing' ? '🟡' : '⚪';
    const estimate = Number(node.estimate || 0);
    const actual = Number(node.actual || 0);
    const timing = node.status === 'done' ? `факт ${actual || estimate} мин` : `оценка ${estimate || 0} мин`;

    wrapper.innerHTML = `<div class="sub-head"><span>${icon} ${index}. ${node.title}</span><span class="sub-meta">${progress}% · ${timing}</span></div>
      <div class="sub-progress"><div class="sub-progress-fill" style="width:${progress}%"></div></div>`;

    (node.subtasks || []).forEach((child, childIndex) => {
      wrapper.appendChild(renderNode(child, level + 1, childIndex + 1));
    });

    return wrapper;
  }

  function renderTaskCard(task){
    const card = document.createElement('div');
    card.className = 'task';
    const progress = nodeProgress(task);
    card.innerHTML = `<div><b>🟡 ${task.id || ''}</b> — ${task.title || 'task'}</div>
      <div class="task-progress"><div class="task-progress-fill" style="width:${progress}%"></div></div>
      <div class="task-progress-label">${progress}%</div>`;

    (task.subtasks || []).forEach((subtask, index) => {
      card.appendChild(renderNode(subtask, 0, index + 1));
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
