import { initializeQueues, registerWorker, getQueue, QUEUES } from './index.js';
import { handleNotificationJob } from './notification.handler.js';
import { handleLifecycleTick, scheduleLifecycleTick } from './lifecycle.handler.js';
import { handleAnalyticsJob } from './analytics.handler.js';
import { handleEmailJob } from './email.handler.js';
import { logger } from '../config/logger.js';

/**
 * Schedule the FX-rate refresh job to run once a day at 03:00 UTC
 * (after Frankfurter's daily ECB pull). Uses BullMQ repeatable jobs so
 * the schedule survives restarts and only runs once across the worker
 * fleet thanks to the shared Redis cursor. The fixed jobId means
 * re-registering the schedule on every boot is idempotent — BullMQ
 * de-dupes the repeatable.
 */
async function scheduleFxRefresh() {
  try {
    const queue = getQueue(QUEUES.ANALYTICS);
    await queue.add(
      'fx-refresh',
      { type: 'refresh_fx_rates' },
      {
        jobId: 'cron:refresh_fx_rates',
        repeat: { pattern: '0 3 * * *', tz: 'UTC' }, // daily at 03:00 UTC
      },
    );
    logger.info('fx refresh scheduled (daily 03:00 UTC)');
  } catch (err) {
    logger.warn({ err: err.message }, 'failed to schedule fx refresh — running on demand only');
  }
}

/**
 * Queue Setup & Integration
 * 
 * Initialize all BullMQ queues and workers at app startup.
 * This replaces the old in-process worker system with a scalable queue-based system.
 */

/**
 * Start all queues and workers
 * Call this once at app startup (in server.js)
 */
export async function startQueueWorkers() {
  try {
    logger.info('starting queue workers');

    // Initialize all queues
    await initializeQueues();

    // Register notification handler
    registerWorker(QUEUES.NOTIFICATIONS, handleNotificationJob, {
      concurrency: 10, // Process up to 10 notifications in parallel
    });

    // Register lifecycle handler
    registerWorker(QUEUES.LIFECYCLE, handleLifecycleTick, {
      concurrency: 1, // Only 1 tick at a time (avoid concurrency issues)
    });

    // Register analytics handler (refunds, FX rate refresh, bulk ops)
    registerWorker(QUEUES.ANALYTICS, handleAnalyticsJob, {
      concurrency: 3, // 3 parallel analytics jobs (refunds can be slow)
    });

    // Register email handler (transactional emails via SES)
    registerWorker(QUEUES.EMAILS, handleEmailJob, {
      concurrency: 5, // 5 parallel email sends
    });

    // Schedule the recurring lifecycle tick
    await scheduleLifecycleTick();
    // Schedule daily FX-rate refresh
    await scheduleFxRefresh();

    logger.info('all queue workers started successfully');
  } catch (err) {
    logger.error({ err }, 'failed to start queue workers');
    throw err;
  }
}

/**
 * Stop all queues and workers
 * Call this on graceful shutdown
 */
export async function stopQueueWorkers() {
  try {
    logger.info('stopping queue workers');
    const { closeAllQueues } = await import('./index.js');
    await closeAllQueues();
    logger.info('all queue workers stopped');
  } catch (err) {
    logger.error({ err }, 'error stopping queue workers');
    throw err;
  }
}

/**
 * Export for use throughout the app
 */
export { enqueueJob, getQueue, QUEUES } from './index.js';
export { enqueueNotification, handleNotificationJob } from './notification.handler.js';
export { handleLifecycleTick, scheduleLifecycleTick, getLifecycleStats } from './lifecycle.handler.js';
export { handleAnalyticsJob } from './analytics.handler.js';
export { handleEmailJob } from './email.handler.js';
