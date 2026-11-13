import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * usePushNotification
 *
 * Manages the full Web Push subscription lifecycle:
 * - Checks current permission and subscription status
 * - Requests permission from user
 * - Subscribes via PushManager and registers with backend
 * - Unsubscribes and removes from backend
 * - Tracks loading and error states
 * - Handles denied permissions gracefully
 */

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  // Use Array.from to avoid spread of large TypedArrays (crashes on some browsers)
  return Uint8Array.from(Array.from(rawData), (c) => c.charCodeAt(0));
};

const arrayBufferToBase64 = (buffer) => {
  return btoa(Array.from(new Uint8Array(buffer), (b) => String.fromCharCode(b)).join(''));
};

const usePushNotification = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState('default'); // 'default' | 'granted' | 'denied'
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);

  // ── Check support and current subscription on mount ────────────
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) return;

    setPermissionState(Notification.permission);

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('[Push] Failed to check subscription:', err);
      }
    };

    checkSubscription();
  }, []);

  // ── Subscribe ───────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === 'denied') {
        throw new Error(
          'Notification permission was denied. ' +
          'To enable, click the lock icon in your browser address bar and allow notifications.'
        );
      }
      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted');
      }

      // Fetch VAPID public key from backend
      const { data } = await api.get('/push/vapid-public-key');
      if (!data.publicKey) {
        throw new Error('Push notifications are not configured on the server');
      }

      // Subscribe via PushManager
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      // Send subscription to backend
      const subJson = subscription.toJSON();
      await api.post('/push/subscribe', {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
      });

      setIsSubscribed(true);
    } catch (err) {
      const message = err.message || 'Failed to enable push notifications';
      setError(message);
      console.error('[Push] Subscribe failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // ── Unsubscribe ─────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from backend first
        await api.delete('/push/unsubscribe', {
          data: { endpoint: subscription.endpoint },
        });
        // Then unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err) {
      const message = err.message || 'Failed to disable push notifications';
      setError(message);
      console.error('[Push] Unsubscribe failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Re-sync subscription on SW update ──────────────────────────
  // When a new service worker activates, the push subscription may change.
  // Re-register the current subscription with the backend to stay in sync.
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.addEventListener('controllerchange', async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const subJson = subscription.toJSON();
          await api.post('/push/subscribe', {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          }).catch(() => {}); // silent — not critical
        }
      } catch {
        // Ignore — non-critical sync
      }
    });
  }, [isSupported]);

  return {
    isSubscribed,
    isSupported,
    isLoading,
    permissionState,
    error,
    subscribe,
    unsubscribe,
  };
};

export default usePushNotification;
