/**
 * Offline Reservation Queue Store
 *
 * Tracks reservations that were submitted while offline.
 * Uses localStorage for persistence across page refreshes.
 *
 * Status flow:
 *   queued → syncing → submitted | failed | conflict | expired
 *
 * CRITICAL: A reservation is NEVER marked confirmed here.
 * Only the backend can confirm a reservation.
 * This store tracks the SUBMISSION attempt only.
 */
import { create } from 'zustand';

const STORAGE_KEY = 'agrirent_offline_queue';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full — ignore, queue is non-critical
  }
};

const useOfflineQueueStore = create((set, get) => ({
  queue: loadFromStorage(),

  /**
   * Add a reservation request to the offline queue.
   * Generates a unique idempotency key to prevent duplicates.
   * Returns the idempotency key for reference.
   */
  enqueue: (reservationData) => {
    const existing = get().queue;

    // Dedup: prevent same equipment+dates being queued twice
    const isDuplicate = existing.some(
      (item) =>
        item.data.equipmentId === reservationData.equipmentId &&
        item.data.startDate === reservationData.startDate &&
        item.data.endDate === reservationData.endDate &&
        ['queued', 'syncing'].includes(item.status)
    );

    if (isDuplicate) return null;

    const idempotencyKey = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const item = {
      id: idempotencyKey,
      data: { ...reservationData, idempotencyKey },
      status: 'queued',  // queued | syncing | submitted | failed | conflict | expired
      createdAt: new Date().toISOString(),
      error: null,
      retryCount: 0,
    };

    const updated = [...existing, item];
    saveToStorage(updated);
    set({ queue: updated });
    return idempotencyKey;
  },

  /**
   * Update the status of a queued item.
   */
  updateStatus: (id, status, error = null) => {
    const updated = get().queue.map((item) =>
      item.id === id ? { ...item, status, error, updatedAt: new Date().toISOString() } : item
    );
    saveToStorage(updated);
    set({ queue: updated });
  },

  /**
   * Increment retry count for an item.
   */
  incrementRetry: (id) => {
    const updated = get().queue.map((item) =>
      item.id === id ? { ...item, retryCount: (item.retryCount || 0) + 1 } : item
    );
    saveToStorage(updated);
    set({ queue: updated });
  },

  /**
   * Remove a successfully submitted or permanently failed item.
   */
  remove: (id) => {
    const updated = get().queue.filter((item) => item.id !== id);
    saveToStorage(updated);
    set({ queue: updated });
  },

  /**
   * Clear all items with terminal status (submitted/expired).
   */
  clearCompleted: () => {
    const updated = get().queue.filter(
      (item) => !['submitted', 'expired'].includes(item.status)
    );
    saveToStorage(updated);
    set({ queue: updated });
  },

  /**
   * Mark expired items (older than 24 hours).
   * Called when app loads or comes back online.
   */
  expireOldItems: () => {
    const now = Date.now();
    const updated = get().queue.map((item) => {
      const age = now - new Date(item.createdAt).getTime();
      if (age > MAX_AGE_MS && item.status === 'queued') {
        return { ...item, status: 'expired', error: 'Request expired after 24 hours' };
      }
      return item;
    });
    saveToStorage(updated);
    set({ queue: updated });
  },

  /**
   * Get counts by status for UI display.
   */
  getCounts: () => {
    const q = get().queue;
    return {
      queued:    q.filter((i) => i.status === 'queued').length,
      syncing:   q.filter((i) => i.status === 'syncing').length,
      submitted: q.filter((i) => i.status === 'submitted').length,
      failed:    q.filter((i) => i.status === 'failed').length,
      conflict:  q.filter((i) => i.status === 'conflict').length,
      expired:   q.filter((i) => i.status === 'expired').length,
      total:     q.length,
    };
  },
}));

export default useOfflineQueueStore;
