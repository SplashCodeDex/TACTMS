import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = 'YOUR_PUBLIC_VAPID_KEY'; // Replace with your actual VAPID public key from your backend

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePWAFeatures = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // --- Push Notifications ---
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      subscribeUserToPush();
    }
  };

  const subscribeUserToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      
      console.log('User is subscribed:', subscription);
      // TODO: Send subscription to your backend server
      // await fetch('/api/subscribe', {
      //   method: 'POST',
      //   body: JSON.stringify(subscription),
      //   headers: { 'Content-Type': 'application/json' }
      // });
      setIsSubscribed(true);
    } catch (error) {
      console.error('Failed to subscribe the user: ', error);
    }
  };

  const registerBackgroundSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-tithe-data');
      console.log('Background sync registered for "sync-tithe-data"');
      alert('Offline changes will be synced in the background when you have a connection.');
    } catch (error) {
      console.error('Background sync could not be registered!', error);
    }
  };

  const registerPeriodicSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('periodicSync' in registration) {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
        if (status.state === 'granted') {
          await (registration as any).periodicSync.register('get-latest-updates', {
            minInterval: 24 * 60 * 60 * 1000, // 24 hours
          });
          console.log('Periodic sync registered for "get-latest-updates"');
          alert('App will periodically sync in the background.');
        } else {
          alert('Periodic background sync permission not granted.');
        }
      } else {
        alert('Periodic background sync is not supported by this browser.');
      }
    } catch (error) {
      console.error('Periodic sync could not be registered!', error);
    }
  };

  return {
    isSubscribed,
    requestNotificationPermission,
    registerBackgroundSync,
    registerPeriodicSync,
  };
};
