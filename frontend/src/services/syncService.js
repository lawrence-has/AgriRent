/**
 * Sync Service — processes the offline reservation queue.
 *
 * Called when the app detects it's back online.
 * Submits each queued reservation to the backend in order.
 *
 * CRITICAL RULES:
 * - Never mark a reservation confirmed — only the backend can do that.
 * - Each request includes the idempotencyKey in the payload.
 *   The backend uses this to detect and reject duplicate submissions.
 * - Conflict (409) is treated as a permanent failure — do not retry.
 * - Network errors are retried up to MAX_RETRIES times.
 * - Items older than 24 hours are expired without submission.
 */
import api from '../api/axios';
import useOfflineQueueStore from '../store/offlineQueueStore';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Submit a single queued reservation to the backend.
 * Returns { success, status, error }.
 */
const submitReservation = async (item) => {
  const store = useOfflineQueueStore.getState();

  store.updateStatus(item.id, 'syncing');

  try {
    const response = await api.post('/reservations', item.data);

    if (response.data?.success) {
      store.updateStatus(item.id, 'submitted');
      return { success: true, status: 'submitted' };
    }

    // Unexpected non-error success response
    store.updateStatus(item.id, 'submitted');
    return { success: true, status: 'submitted' };

  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message || 'Unknown error';

    // ── 409 Conflict: dates are taken ───────────────────────────
    if (status === 409) {
      store.updateStatus(item.id, 'conflict', message);
      return { success: false, status: 'conflict', error: message };
    }

    // ── 400/403/404: bad data, auth issue, or equipment gone ─────
    if (status === 400 || status === 403 || status === 404) {
      store.updateStatus(item.id, 'failed', message);
      return { success: false, status: 'failed', error: message };
    }

    // ── Network/server error: increment retry ────────────────────
    store.incrementRetry(item.id);
    if ((item.retryCount || 0) + 1 >= MAX_RETRIES) {
      const finalError = `Failed after ${MAX_RETRIES} attempts: ${message}`;
      store.updateStatus(item.id, 'failed', finalError);
      return { success: false, status: 'failed', error: finalError };
    }

    // Still retryable — leave as queued for next sync cycle
    store.updateStatus(item.id, 'queued', `Retry ${(item.retryCount || 0) + 1}/${MAX_RETRIES}: ${message}`);
    return { success: false, status: 'queued', error: message };
  }
};

/**
 * Process all queued reservations in order.
 * Returns a summary of results.
 */
export const syncOfflineQueue = async () => {
  const store = useOfflineQueueStore.getState();

  // Expire old items first
  store.expireOldItems();

  const queuedItems = store.queue.filter((item) => item.status === 'queued');
  if (queuedItems.length === 0) return { processed: 0, submitted: 0, failed: 0 };

  const results = { processed: 0, submitted: 0, failed: 0, conflicts: 0 };

  for (const item of queuedItems) {
    // Double check connectivity before each item
    if (!navigator.onLine) break;

    const result = await submitReservation(item);
    results.processed++;

    if (result.status === 'submitted') results.submitted++;
    else if (result.status === 'conflict') results.conflicts++;
    else results.failed++;

    // Small delay between submissions to avoid hammering the server
    if (queuedItems.indexOf(item) < queuedItems.length - 1) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  return results;
};

export default syncOfflineQueue;
