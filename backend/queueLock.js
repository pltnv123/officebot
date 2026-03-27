const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOCK_PATH = path.join(ROOT, 'task_queue.lock');
const LOCK_RETRIES = 60;
const LOCK_WAIT_MS = 50;
const DEFAULT_STALE_MS = 5 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 30 * 1000;

const LOCK_STALE_MS = () => Number(process.env.LOCK_STALE_OVERRIDE || DEFAULT_STALE_MS);
const LOCK_TIMEOUT_MS = () => Number(process.env.LOCK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function cleanupStaleLock() {
  try {
    const stats = await fs.stat(LOCK_PATH);
    if (Date.now() - stats.mtimeMs > LOCK_STALE_MS()) {
      await fs.unlink(LOCK_PATH);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

async function withLock(fn) {
  const deadline = Date.now() + LOCK_TIMEOUT_MS();
  await cleanupStaleLock();
  while (Date.now() < deadline) {
    try {
      const handle = await fs.open(LOCK_PATH, 'wx');
      try {
        return await fn();
      } finally {
        await handle.close();
        await fs.unlink(LOCK_PATH).catch(() => {});
      }
    } catch (err) {
      if (err.code === 'EEXIST') {
        await cleanupStaleLock();
        await sleep(LOCK_WAIT_MS);
        continue;
      }
      throw err;
    }
  }
  throw new Error('queue lock timeout');
}

module.exports = { withLock };
