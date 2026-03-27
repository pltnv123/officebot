const queue = require('../backend/taskQueue');
const [taskId, agent] = process.argv.slice(2);
(async () => {
  const result = await queue.start(taskId, agent);
  console.log(`${agent} start result`, result ? { status: result.status, attempts: result.attempts } : null);
  process.exit(0);
})();
