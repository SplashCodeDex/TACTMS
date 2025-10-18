import { useEffect, useState } from "react";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

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
      toast.error("This browser does not support desktop notification");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      toast.success("Notification permission granted.");
      subscribeUserToPush();
    } else {
      toast.warning("Notification permission denied.");
    }
  };

  const subscribeUserToPush = async () => {
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === "YOUR_PUBLIC_VAPID_KEY") {
      console.error("VAPID public key is missing or a placeholder and must be replaced.");
      toast.error("Push notification setup is incomplete by the administrator.");
      return;
    }
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
      toast.success("Successfully subscribed to push notifications!");
    } catch (error) {
      console.error("Failed to subscribe the user: ", error);
      toast.error("Failed to subscribe to push notifications.");
    }
  };

  const registerBackgroundSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-tithe-data");
      console.log('Background sync registered for "sync-tithe-data"');
      toast.info("Offline changes will be synced in the background.");
    } catch (error) {
      console.error("Background sync could not be registered!", error);
      toast.error("Background sync is not supported by this browser.");
    }
  };

  const registerPeriodicSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      // Use a type guard to ensure the 'periodicSync' property exists
      if ("periodicSync" in registration) {
        // Assert the permission name as a string to bypass the TS error
        const status = await navigator.permissions.query({
          name: "periodic-background-sync" as PermissionName,
        });
        if (status.state === "granted") {
          // Assert the registration object to use the periodicSync API
          await (registration as ServiceWorkerRegistration & { periodicSync: any }).periodicSync.register(
            "get-latest-updates",
            {
              minInterval: 24 * 60 * 60 * 1000, // 24 hours
            },
          );
          console.log('Periodic sync registered for "get-latest-updates"');
          toast.info("App will periodically sync in the background.");
        } else {
          toast.warning(
            "Periodic background sync permission not granted.",
          );
        }
      } else {
        toast.error(
          "Periodic background sync is not supported by this browser.",
        );
      }
    } catch (error) {
      console.error("Periodic sync could not be registered!", error);
      toast.error("Failed to register periodic sync.");
    }
  };

  return {
    isSubscribed,
    requestNotificationPermission,
    registerBackgroundSync,
    registerPeriodicSync,
  };
};