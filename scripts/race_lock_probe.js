const { spawn } = require('child_process');
const queue = require('../backend/taskQueue');
const fs = require('fs');
const path = require('path');
const QUEUE_PATH = path.resolve(__dirname, '..', 'task_queue.json');

function runAgent(taskId, agent, env = {}) {
  const proc = spawn(process.execPath, ['scripts/start_worker.js', taskId, agent], { env: { ...process.env, ...env } });
  let stdout = '';
  proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
  proc.stderr.on('data', chunk => { stdout += chunk.toString(); });
  return { proc, promise: new Promise(res => proc.on('close', code => res({ agent, code, output: stdout.trim() }))) };
}

(async () => {
  const task = await queue.add('lock-race', 3, null, { maxAttempts: 3 });
  const agentA = runAgent(task.id, 'agentA', { LOCK_TEST_DELAY: '4000', LOCK_STALE_OVERRIDE: '1000' });
  setTimeout(() => agentA.proc.kill('SIGKILL'), 1500);
  await new Promise(r => setTimeout(r, 200));
  const agentB = runAgent(task.id, 'agentB', { LOCK_STALE_OVERRIDE: '1000' });
  const [resultA, resultB] = await Promise.all([agentA.promise, agentB.promise]);
  console.log('agentA completion', resultA);
  console.log('agentB completion', resultB);
  const final = await queue.get(task.id);
  console.log('final task state', final);
  fs.unlinkSync(QUEUE_PATH);
})();
