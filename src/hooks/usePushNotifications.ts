import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if (supported) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {
          setSwRegistration(reg);
          return reg.pushManager.getSubscription();
        })
        .then(sub => {
          setIsSubscribed(Boolean(sub));
        })
        .catch(err => {
          console.warn('Service worker registration error:', err);
        });
    }
  }, []);

  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupported) {
      return { success: false, error: 'Push notifications are not supported by this browser.' };
    }

    setIsSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setIsSubscribing(false);
        return { success: false, error: 'Notification permission was not granted.' };
      }

      let reg = swRegistration;
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
        setSwRegistration(reg);
      }

      await navigator.serviceWorker.ready;

      // Fetch VAPID public key
      const keyRes = await fetch('/api/push/vapid-public-key');
      const keyData = await keyRes.json();
      if (!keyData.success || !keyData.publicKey) {
        throw new Error('Failed to retrieve push server VAPID key.');
      }

      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      // Register subscription with server
      const subRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: sub.toJSON(),
        }),
      });

      if (!subRes.ok) {
        throw new Error('Failed to save push subscription on server.');
      }

      setIsSubscribed(true);
      return { success: true };
    } catch (err: any) {
      console.warn('Push subscription failed:', err);
      return { success: false, error: err.message || 'Push subscription error' };
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupported, swRegistration, userId]);

  const testPush = useCallback(async (): Promise<{ success: boolean; delivered?: number; total?: number; error?: string }> => {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [userId]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isSubscribing,
    subscribe,
    testPush,
  };
}
