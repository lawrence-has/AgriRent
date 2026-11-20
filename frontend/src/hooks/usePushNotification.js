import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

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

const pendingRegistrations = new Map();

const registerSubscription = (userId, subscription) => {
  const subJson = subscription.toJSON();
  const key = `${userId}:${subJson.endpoint}`;
  if (pendingRegistrations.has(key)) return pendingRegistrations.get(key);

  const request = api.post('/push/subscribe', {
    endpoint: subJson.endpoint,
    keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
  }).finally(() => pendingRegistrations.delete(key));
  pendingRegistrations.set(key, request);
  return request;
};

const isUsingVapidKey = (subscription, publicKey) => {
  const currentKey = subscription.options?.applicationServerKey;
  if (!currentKey) return true; // Older browsers may not expose the key for inspection.
  const encodedKey = arrayBufferToBase64(currentKey)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return encodedKey === publicKey;
};

const withTimeout = async (promise, timeoutMs, message) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const ensureServiceWorkerReady = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Push notifications are not supported in this browser');
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    const workerUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
    registration = await navigator.serviceWorker.register(workerUrl, { scope: '/' });
  }

  return withTimeout(
    navigator.serviceWorker.ready,
    30000,
    'The service worker did not become ready in time.'
  );
};

const usePushNotification = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.token);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState('default'); // 'default' | 'granted' | 'denied'
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const requiresSecureContext = !window.isSecureContext;

  // ── Check support and current subscription on mount ────────────
  useEffect(() => {
    const supported = !requiresSecureContext &&
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported || !userId || !token) return;

    setPermissionState(Notification.permission);

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          setIsSubscribed(false);
          return;
        }

        const { data } = await api.get('/push/vapid-public-key');
        if (!isUsingVapidKey(subscription, data.publicKey)) {
          await api.delete('/push/unsubscribe', { data: { endpoint: subscription.endpoint } }).catch(() => {});
          await subscription.unsubscribe();
          setIsSubscribed(false);
          setError('Push settings changed. Enable notifications again on this device.');
          return;
        }

        await registerSubscription(userId, subscription);
        setIsSubscribed(true);
      } catch (err) {
        console.error('[Push] Failed to check subscription:', err);
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [requiresSecureContext, userId, token]);

  // ── Subscribe ───────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      const permission = await withTimeout(
        Notification.requestPermission(),
        15000,
        'Notification permission request timed out.'
      );
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

      const { data } = await withTimeout(
        api.get('/push/vapid-public-key'),
        15000,
        'Fetching push configuration timed out.'
      );
      if (!data.publicKey) {
        throw new Error('Push notifications are not configured on the server');
      }

      const registration = await ensureServiceWorkerReady();

      const existingSubscription = await withTimeout(
        registration.pushManager.getSubscription(),
        10000,
        'Checking existing push subscription timed out.'
      );

      if (existingSubscription) {
        if (isUsingVapidKey(existingSubscription, data.publicKey)) {
          await withTimeout(
            registerSubscription(userId, existingSubscription),
            15000,
            'Syncing your existing push subscription timed out.'
          );
          setIsSubscribed(true);
          return;
        }

        await api.delete('/push/unsubscribe', {
          data: { endpoint: existingSubscription.endpoint },
        }).catch(() => {});
        await existingSubscription.unsubscribe();
      }

      const subscription = await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        }),
        20000,
        'Creating the push subscription timed out.'
      );

      await withTimeout(
        registerSubscription(userId, subscription),
        15000,
        'Registering the device for push notifications timed out.'
      );

      setIsSubscribed(true);
    } catch (err) {
      const message = err.message || 'Failed to enable push notifications';
      setError(message);
      console.error('[Push] Subscribe failed:', err);
      setIsSubscribed(false);
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

  const repairSubscription = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (!isSupported || !userId) throw new Error('Sign in on a supported, secure browser to repair push notifications.');
      if (Notification.permission !== 'granted') {
        setPermissionState(Notification.permission);
        throw new Error('Allow notifications in your browser before repairing this device.');
      }

      const { data } = await api.get('/push/vapid-public-key');
      if (!data.publicKey) throw new Error('Push notifications are not configured on the server.');
      const registration = await ensureServiceWorkerReady();
      const current = await registration.pushManager.getSubscription();
      if (current) {
        await api.delete('/push/unsubscribe', { data: { endpoint: current.endpoint } }).catch(() => {});
        await current.unsubscribe();
      }

      const fresh = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      await registerSubscription(userId, fresh);
      const { data: testResult } = await api.post('/push/test', { endpoint: fresh.endpoint });
      setIsSubscribed(true);
      return testResult;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Could not repair push notifications.';
      setError(message);
      setIsSubscribed(false);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId]);

  const sendTestNotification = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { data } = await api.post('/push/test');
      return data;
    } catch (err) {
      const failures = err.response?.data?.failures?.join(', ');
      const message = [
        err.response?.data?.message || err.message || 'Failed to send test notification',
        failures,
      ].filter(Boolean).join(': ');
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Re-sync subscription on SW update ──────────────────────────
  // When a new service worker activates, the push subscription may change.
  // Re-register the current subscription with the backend to stay in sync.
  useEffect(() => {
    if (!isSupported || !userId || !token) return undefined;

    const syncSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await registerSubscription(userId, subscription).catch(() => {}); // silent — not critical
        }
      } catch {
        // Ignore — non-critical sync
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', syncSubscription);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', syncSubscription);
  }, [isSupported, userId, token]);

  return {
    isSubscribed,
    isSupported,
    isLoading,
    permissionState,
    error,
    requiresSecureContext,
    subscribe,
    unsubscribe,
    repairSubscription,
    sendTestNotification,
  };
};

export default usePushNotification;
