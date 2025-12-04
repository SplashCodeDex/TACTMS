import { useEffect, useState } from "react";

import { AppToastType, AppToastAction } from "../lib/toast";



export const usePWAFeatures = (
  addToast: (
    message: string,
    type: AppToastType,
    duration?: number,
    actions?: AppToastAction[],
  ) => void,
  onNewWorker: (worker: ServiceWorker) => void,
) => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          onNewWorker(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                onNewWorker(newWorker);
              }
            });
          }
        });

        // --- Push Notifications ---
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, [onNewWorker]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      addToast("This browser does not support desktop notification", "error");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      addToast("Notification permission granted.", "success");
      subscribeUserToPush();
    } else {
      addToast("Notification permission denied.", "warning");
    }
  };

  const sendLocalNotification = async (title: string, body: string) => {
    if (Notification.permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body,
          icon: "/img/android/android-launchericon-192-192.png",
          badge: "/img/android/android-launchericon-96-96.png",
          tag: "tactms-notification",
          vibrate: [200, 100, 200],
        } as any);
      } catch (error) {
        console.error("Failed to show notification:", error);
      }
    }
  };

  const subscribeUserToPush = async () => {
    // Local Notification Setup - No backend subscription needed for now
    if (Notification.permission === "granted") {
      setIsSubscribed(true);
      addToast("Notifications enabled.", "success");
      sendLocalNotification("Notifications Enabled", "You will be notified when sync completes.");
    }
  };

  const registerBackgroundSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ("sync" in registration) {
        await (registration as any).sync.register("sync-tithe-data");
        console.log('Background sync registered for "sync-tithe-data"');
        addToast("Offline changes will be synced in the background.", "info");
      }
    } catch (error) {
      console.error("Background sync could not be registered!", error);
      // Fallback: We will handle sync via online event listener in App.tsx
    }
  };

  const registerPeriodicSync = async () => {
    // Periodic sync implementation remains same, but optional for now
  };

  return {
    isSubscribed,
    requestNotificationPermission,
    registerBackgroundSync,
    registerPeriodicSync,
    sendLocalNotification,
  };
};
