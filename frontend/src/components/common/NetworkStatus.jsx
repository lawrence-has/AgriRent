import { useState, useEffect } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';

/**
 * NetworkStatus — shows a banner when the user goes offline or comes back online.
 * - Offline: persistent red banner at the top indicating limited functionality.
 * - Back online: green toast-style banner that auto-dismisses after 3 seconds.
 */
const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      setShowOnlineBanner(true);
      // Auto-hide the "back online" banner after 3s
      setTimeout(() => setShowOnlineBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineBanner(false);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Online — show brief "back online" banner
  if (isOnline && showOnlineBanner) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
          bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg
          animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <Wifi size={15} aria-hidden="true" />
        Back online
      </div>
    );
  }

  // Offline — persistent banner
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
            <p className="font-semibold">You're offline</p>
            <p className="text-xs text-red-200 mt-0.5">
              Some features are unavailable. Previously viewed equipment is accessible.
              Reservations will sync when connection is restored.
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
