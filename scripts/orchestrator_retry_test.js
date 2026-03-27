const { execSync } = require('child_process');
const TaskQueue = require('../backend/taskQueue');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const QUEUE = path.join(ROOT, 'task_queue.json');
async function run() {
  const results = [];
  const queue = TaskQueue;

  console.log('CASE A: attempts < max -> pending');
  const taskA = await queue.add('caseA', 3, null, { maxAttempts: 3 });
  const startedA = await queue.start(taskA.id, 'agentA');
  await queue.fail(taskA.id, 'simulated crash');
  const afterA = await queue.get(taskA.id);
  console.log(JSON.stringify({ before: startedA, after: afterA }, null, 2));
  results.push({ case: 'A', status: afterA.status, attempts: afterA.attempts });

  console.log('CASE B: attempts == max -> fail terminal');
  const taskB = await queue.add('caseB', 3, null, { maxAttempts: 1 });
  const startedB = await queue.start(taskB.id, 'agentB');
  await queue.fail(taskB.id, 'final crash');
  const afterB = await queue.get(taskB.id);
  console.log(JSON.stringify({ before: startedB, after: afterB }, null, 2));
  results.push({ case: 'B', status: afterB.status, attempts: afterB.attempts });

  console.log('CASE C: stale in_progress -> watchdog recovery');
  const taskC = await queue.add('caseC', 3, null, { maxAttempts: 3 });
  await queue.start(taskC.id, 'agentC');
  const raw = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
  raw.tasks = raw.tasks.map(t => {
    if (t.id === taskC.id) {
      t.started_at = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    }
    return t;
  });
  fs.writeFileSync(QUEUE, JSON.stringify(raw, null, 2), 'utf8');
  execSync('node scripts/task_watchdog.js', { cwd: ROOT });
  const final = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
  const target = final.tasks.find(t => t.id === taskC.id);
  console.log(JSON.stringify(target, null, 2));
  results.push({ case: 'C', status: target.status, error: target.error });

  console.log('RESULTS', results);
}
run().catch(err => { console.error(err); process.exit(1); });