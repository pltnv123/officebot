const queue = require('../backend/taskQueue');
(async () => {
  const task = await queue.add('racey', 3, null, { maxAttempts: 3 });
  const first = await queue.start(task.id, 'agent1');
  const second = await queue.start(task.id, 'agent2');
  console.log('first start result', first ? {status:first.status, agent:first.agent, attempts:first.attempts} : null);
  console.log('second start result', second ? {status:second.status, agent:second.agent, attempts:second.attempts} : null);
  await queue.complete(task.id, { result: 'ok' });
  const after = await queue.get(task.id);
  console.log('final state', {status:after.status, agent:after.agent, attempts:after.attempts});
})();