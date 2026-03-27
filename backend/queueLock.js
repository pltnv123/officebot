const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOCK_PATH = path.join(ROOT, 'task_queue.lock');
const LOCK_RETRIES = 60;
const LOCK_WAIT_MS = 50;
const DEFAULT_STALE_MS = 5 * 60 * 1000;

const LOCK_STALE_MS = () => Number(process.env.LOCK_STALE_OVERRIDE || DEFAULT_STALE_MS);


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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function withLock(fn) {
  let handle = null;
  await cleanupStaleLock();
  while (true) {
    try {
      handle = await fs.open(LOCK_PATH, 'wx');
      break;
    } catch (err) {
      if (err.code === 'EEXIST') {
        await cleanupStaleLock();
        await sleep(LOCK_WAIT_MS);
        continue;
      }
      throw err;
    }
  }
  try {
    const result = await fn();
    const delay = Number(process.env.LOCK_TEST_DELAY || 0);
    if (delay > 0) {
      await sleep(delay);
    }
    return result;
  } finally {
    await handle.close();
    await fs.unlink(LOCK_PATH).catch(() => {});
  }
}

module.exports = { withLock, LOCK_PATH }; 
