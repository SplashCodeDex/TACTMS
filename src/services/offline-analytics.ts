export interface AnalyticsEvent {
  type: string;
  payload: Record<string, any>;
}

export const pushAnalyticsEvent = async (event: AnalyticsEvent) => {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "QUEUE_ANALYTICS_EVENT",
      payload: event,
    });
  }
};
