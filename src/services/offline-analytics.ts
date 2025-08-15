export const pushAnalyticsEvent = async (event: any) => {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "QUEUE_ANALYTICS_EVENT",
      payload: event,
    });
  }
};
