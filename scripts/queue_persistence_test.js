const queueModulePath = '../backend/taskQueue';
const fs = require('fs');
const path = require('path');
const QUEUE_PATH = path.resolve(__dirname, '..', 'task_queue.json');
(async () => {
  const queue = require(queueModulePath);
  const task = await queue.add('persist-test', 2, 'agent', { maxAttempts: 2 });
  await queue.start(task.id, 'agent');
  await queue.fail(task.id, 'simulated error');
  delete require.cache[require.resolve(queueModulePath)];
  const reloaded = require(queueModulePath);
  const next = await reloaded.start(task.id, 'agent2');
  console.log('second pick', next ? {status: next.status, attempts: next.attempts, agent: next.agent} : null);
  await queue.complete(task.id, { note: 'done' });
  console.log('final state', await queue.get(task.id));
  fs.unlinkSync(QUEUE_PATH);
})();