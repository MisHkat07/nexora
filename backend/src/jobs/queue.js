const mongoose = require('mongoose');

const logger = require('@/logger');
const { withTenant } = require('@/tenancy/context');

const Job = () => mongoose.model('Job');
const handlers = new Map();

const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000, 3_600_000];

const registerJob = (name, handler) => handlers.set(name, handler);

const enqueue = async (name, payload, { runAt = new Date(), maxAttempts = 5 } = {}) =>
  Job().create({ name, payload, runAt, maxAttempts });

/** Claims one due job. The lock is the claim: only one worker wins the update. */
const claim = async () =>
  Job().findOneAndUpdate(
    { status: 'queued', runAt: { $lte: new Date() } },
    { $set: { status: 'active', lockedAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { runAt: 1 }, new: true }
  );

const runClaimed = async (job) => {
  const handler = handlers.get(job.name);
  if (!handler) throw new Error(`No handler for job ${job.name}`);
  const organizationId = job.payload?.organizationId;
  if (organizationId) await withTenant(organizationId, () => handler(job.payload, job));
  else await handler(job.payload, job);
};

const finish = async (job, error) => {
  if (!error) {
    await Job().updateOne({ _id: job._id }, { $set: { status: 'completed', lastError: undefined } });
    return;
  }
  const failed = job.attempts >= job.maxAttempts;
  const delay = BACKOFF_MS[Math.min(job.attempts - 1, BACKOFF_MS.length - 1)];
  await Job().updateOne(
    { _id: job._id },
    {
      $set: {
        status: failed ? 'failed' : 'queued',
        lastError: String(error.message || error).slice(0, 500),
        runAt: new Date(Date.now() + delay),
      },
    }
  );
  logger.error({ err: error, job: job.name, attempts: job.attempts }, 'Job failed');
};

/** Runs every due job. Returns how many completed. Used by the worker and by tests. */
const processDueJobs = async ({ limit = 20 } = {}) => {
  let completed = 0;
  for (let i = 0; i < limit; i += 1) {
    const job = await claim();
    if (!job) break;
    try {
      await runClaimed(job);
      await finish(job, null);
      completed += 1;
    } catch (error) {
      await finish(job, error);
    }
  }
  return completed;
};

let timer;
const startWorker = ({ intervalMs = 5000 } = {}) => {
  if (timer) return;
  const tick = async () => {
    try {
      await processDueJobs();
    } catch (error) {
      logger.error({ err: error }, 'Job worker tick failed');
    }
  };
  timer = setInterval(tick, intervalMs);
  timer.unref?.();
  tick();
};

const stopWorker = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

module.exports = { registerJob, enqueue, processDueJobs, startWorker, stopWorker };
