import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, X, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { syncOfflineQueue } from '../../services/syncService';
import useOfflineQueueStore from '../../store/offlineQueueStore';

/**
 * NetworkStatus
 *
 * Shows:
 * - Offline banner with pending queue count
 * - "Back online" banner that triggers background sync
 * - Sync progress indicator
 * - Sync result summary (submitted / conflicts / failed)
 */
const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [syncState, setSyncState] = useState('idle'); // idle | syncing | done | error
  const [syncResults, setSyncResults] = useState(null);

  const { queue, getCounts, expireOldItems } = useOfflineQueueStore();
  const counts = getCounts();
  const pendingCount = counts.queued + counts.syncing;

  // ── Trigger sync when back online ───────────────────────────────
  const triggerSync = useCallback(async () => {
    if (counts.queued === 0) return;

    setSyncState('syncing');
    try {
      const results = await syncOfflineQueue();
      setSyncResults(results);
      setSyncState(results.failed > 0 || results.conflicts > 0 ? 'partial' : 'done');
      // Auto-hide after 6s if all good
      if (results.failed === 0 && results.conflicts === 0) {
        setTimeout(() => {
          setSyncState('idle');
          setSyncResults(null);
          setShowOnlineBanner(false);
        }, 6000);
      }
    } catch {
      setSyncState('error');
    }
  }, [counts.queued]);

  // ── Online/offline event listeners ─────────────────────────────
  useEffect(() => {
    // Expire old items on mount
    expireOldItems();

    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      setShowOnlineBanner(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineBanner(false);
      setSyncState('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Auto-trigger sync when back online and queue has items ──────
  useEffect(() => {
    if (isOnline && showOnlineBanner && counts.queued > 0 && syncState === 'idle') {
      // Small delay to let network stabilize
      const timer = setTimeout(() => triggerSync(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showOnlineBanner, counts.queued, syncState, triggerSync]);

  // ── Syncing banner ──────────────────────────────────────────────
  if (isOnline && showOnlineBanner && syncState === 'syncing') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
          bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg"
      >
        <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
        Syncing {counts.syncing > 0 ? `reservation${counts.syncing > 1 ? 's' : ''}...` : 'queued requests...'}
      </div>
    );
  }

  // ── Sync done banner ────────────────────────────────────────────
  if (isOnline && showOnlineBanner && syncState === 'done' && syncResults) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
          bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg"
      >
        <CheckCircle size={14} aria-hidden="true" />
        Back online · {syncResults.submitted} reservation{syncResults.submitted !== 1 ? 's' : ''} submitted
      </div>
    );
  }

  // ── Partial sync / conflict banner ──────────────────────────────
  if (isOnline && showOnlineBanner && (syncState === 'partial' || syncState === 'error') && syncResults) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-14 inset-x-0 z-50 mx-2 sm:mx-auto sm:max-w-lg"
      >
        <div className="bg-orange-500 text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">Sync completed with issues</p>
            <p className="text-xs text-orange-100 mt-0.5">
              {syncResults.submitted > 0 && `${syncResults.submitted} submitted. `}
              {syncResults.conflicts > 0 && `${syncResults.conflicts} date conflict${syncResults.conflicts > 1 ? 's' : ''}. `}
              {syncResults.failed > 0 && `${syncResults.failed} failed. `}
              Check My Reservations for details.
            </p>
          </div>
          <button
            onClick={() => { setShowOnlineBanner(false); setSyncState('idle'); }}
            className="p-0.5 hover:bg-orange-400 rounded shrink-0"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ── Back online (no queue) banner ───────────────────────────────
  if (isOnline && showOnlineBanner && syncState === 'idle' && counts.queued === 0) {
    // Auto-dismiss after 3s
    setTimeout(() => setShowOnlineBanner(false), 3000);
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
          bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg"
      >
        <Wifi size={15} aria-hidden="true" />
        Back online
      </div>
    );
  }

  // ── Offline banner ──────────────────────────────────────────────
  if (!isOnline && !dismissed) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-14 inset-x-0 z-50 mx-2 sm:mx-auto sm:max-w-lg"
      >
        <div className="bg-red-600 text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
          <WifiOff size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">
              You're offline
              {pendingCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {pendingCount} pending
                </span>
              )}
            </p>
            <p className="text-xs text-red-200 mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} reservation${pendingCount > 1 ? 's' : ''} queued — will submit automatically when back online.`
                : 'Previously viewed equipment is accessible. Reservations will sync when connection is restored.'
              }
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-0.5 hover:bg-red-500 rounded shrink-0"
            aria-label="Dismiss offline notice"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default NetworkStatus;
