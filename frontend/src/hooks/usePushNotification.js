import { useState, useEffect } from 'react';
import api from '../api/axios';

const usePushNotification = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState(null);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  const subscribe = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications not supported');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get VAPID public key
      const { data } = await api.get('/push/vapid-public-key');
      const vapidPublicKey = data.publicKey;
      if (!vapidPublicKey) throw new Error('VAPID public key not available');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await api.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        },
      });

      setIsSubscribed(true);
    } catch (err) {
      setError(err.message);
      console.error('Push subscription failed:', err);
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.delete('/push/unsubscribe', { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    };
    checkSubscription();
  }, []);

  return { isSubscribed, subscribe, unsubscribe, error };
};

export default usePushNotification;
