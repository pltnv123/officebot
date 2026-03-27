const fs = require('fs');
const path = require('path');
const queue = require('../backend/taskQueue');
const QUEUE_PATH = path.resolve(__dirname, '..', 'task_queue.json');
function snapshot(task) {
  return {
    id: task.id,
    status: task.status,
    attempts: task.attempts,
    max_attempts: task.max_attempts,
    agent: task.agent,
    started_at: task.started_at,
    completed_at: task.completed_at,
    error: task.error,
    updated_at: task.completed_at || task.started_at || task.created_at,
  };
}
async function run() {
  const initial = await queue.add('dup-probe', 3, null, { maxAttempts: 3 });
  console.log('created', snapshot(initial));
  const firstStart = await queue.start(initial.id, 'agentFirst');
  console.log('first pickup', snapshot(firstStart));
  await queue.fail(initial.id, 'agent crash');
  const afterFail = await queue.get(initial.id);
  console.log('after crash', snapshot(afterFail));
  const secondStart = await queue.start(initial.id, 'agentSecond');
  console.log('second pickup', snapshot(secondStart));
  await queue.complete(initial.id, { note: 'success' });
  const afterComplete = await queue.get(initial.id);
  console.log('terminal state', snapshot(afterComplete));
  const retry = await queue.start(initial.id, 'agentThird');
  console.log('attempt after terminal', retry);
}
run().then(() => fs.unlinkSync(QUEUE_PATH)).catch(err => console.error(err));