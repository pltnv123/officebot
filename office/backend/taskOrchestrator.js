function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function normalizeSubtasks(task) {
  if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) return;

  let foundDoing = false;
  task.subtasks.forEach((s, idx) => {
    if (s.status === 'done') {
      s.progress = 100;
      if ((s.actual || 0) < (s.estimate || 0)) s.actual = s.estimate || s.actual || 0;
      return;
    }
    if (s.status === 'doing' && !foundDoing) {
      foundDoing = true;
      s.progress = Math.max(1, Math.min(99, Number(s.progress || 0)));
      s.started_at = s.started_at || nowTs();
      return;
    }
    if (idx === 0 && !foundDoing && s.status !== 'done') {
      s.status = 'doing';
      s.progress = Math.max(1, Number(s.progress || 0));
      s.started_at = s.started_at || nowTs();
      foundDoing = true;
      return;
    }
    if (s.status !== 'done') {
      s.status = 'todo';
      s.progress = Number(s.progress || 0);
    }
  });
}

function deriveTaskStatus(task) {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  if (subtasks.length === 0) return task;

  const allDone = subtasks.every((s) => s.status === 'done');
  const hasDoing = subtasks.some((s) => s.status === 'doing');

  task.estimate = subtasks.reduce((sum, s) => sum + Number(s.estimate || 0), 0);
  task.actual = subtasks.reduce((sum, s) => sum + Number(s.actual || 0), 0);

  if (allDone) {
    task.status = 'done';
    task.progress = 100;
    task.completed_at = task.completed_at || nowTs();
  } else if (hasDoing) {
    task.status = 'doing';
    task.progress = Number(((task.actual / Math.max(1, task.estimate)) * 100).toFixed(1));
    delete task.completed_at;
  } else {
    task.status = 'todo';
    task.progress = Number(((task.actual / Math.max(1, task.estimate)) * 100).toFixed(1));
    delete task.completed_at;
  }
  return task;
}

function runOrchestrator(tasksPayload) {
  const payload = tasksPayload && typeof tasksPayload === 'object' ? tasksPayload : { tasks: [] };
  payload.tasks = Array.isArray(payload.tasks) ? payload.tasks : [];

  for (const task of payload.tasks) {
    normalizeSubtasks(task);
    deriveTaskStatus(task);
  }

  return payload;
}

function tickFirstDoingTask(tasksPayload) {
  const payload = runOrchestrator(tasksPayload);
  const tasks = payload.tasks || [];

  const task = tasks.find((t) => t.status === 'doing' || (t.subtasks || []).some((s) => s.status === 'doing'));
  if (!task || !Array.isArray(task.subtasks)) {
    return { payload, changed: false, reason: 'no-active-task' };
  }

  const current = task.subtasks.find((s) => s.status === 'doing');
  if (!current) {
    return { payload, changed: false, reason: 'no-doing-subtask' };
  }

  current.status = 'done';
  current.progress = 100;
  current.actual = Number(current.estimate || current.actual || 0);
  current.completed_at = nowTs();

  const next = task.subtasks.find((s) => s.status === 'todo');
  if (next) {
    next.status = 'doing';
    next.progress = Math.max(1, Number(next.progress || 0));
    next.started_at = next.started_at || nowTs();
  }

  deriveTaskStatus(task);
  return { payload, changed: true, taskId: task.id };
}

module.exports = {
  runOrchestrator,
  tickFirstDoingTask,
};
