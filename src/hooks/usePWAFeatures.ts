import { useEffect, useState } from "react";

import { ToastMessage, ToastAction } from "../components/Toast";

const VAPID_PUBLIC_KEY = "YOUR_PUBLIC_VAPID_KEY"; // Replace with your actual VAPID public key from your backend

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePWAFeatures = (
  addToast: (
    message: string,
    type: ToastMessage["type"],
    duration?: number,
    actions?: ToastAction[],
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

  const subscribeUserToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("User is subscribed:", subscription);
      // TODO: Send subscription to your backend server
      // await fetch('/api/subscribe', {
      //   method: 'POST',
      //   body: JSON.stringify(subscription),
      //   headers: { 'Content-Type': 'application/json' }
      // });
      setIsSubscribed(true);
      addToast("Successfully subscribed to push notifications!", "success");
    } catch (error) {
      console.error("Failed to subscribe the user: ", error);
      addToast("Failed to subscribe to push notifications.", "error");
    }
  };

  const registerBackgroundSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-tithe-data");
      console.log('Background sync registered for "sync-tithe-data"');
      addToast("Offline changes will be synced in the background.", "info");
    } catch (error) {
      console.error("Background sync could not be registered!", error);
      addToast("Background sync is not supported by this browser.", "error");
    }
  };

  const registerPeriodicSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ("periodicSync" in registration) {
        const status = await navigator.permissions.query({
          name: "periodic-background-sync",
        });
        if (status.state === "granted") {
          await registration.periodicSync.register(
            "get-latest-updates",
            {
              minInterval: 24 * 60 * 60 * 1000, // 24 hours
            },
          );
          console.log('Periodic sync registered for "get-latest-updates"');
          addToast("App will periodically sync in the background.", "info");
        } else {
          addToast(
            "Periodic background sync permission not granted.",
            "warning",
          );
        }
      } else {
        addToast(
          "Periodic background sync is not supported by this browser.",
          "error",
        );
      }
    } catch (error) {
      console.error("Periodic sync could not be registered!", error);
      addToast("Failed to register periodic sync.", "error");
    }
  };

  return {
    isSubscribed,
    requestNotificationPermission,
    registerBackgroundSync,
    registerPeriodicSync,
  };
};
