export interface AnalyticsEvent {
  type: string;
  payload: Record<string, any>;
}

export const pushAnalyticsEvent = async (event: AnalyticsEvent) => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active || navigator.serviceWorker.controller;
    if (sw) {
      sw.postMessage({
        type: 'QUEUE_ANALYTICS_EVENT',
        payload: event,
      });
    } else {
      // Force a registration attempt if not yet active
      // Note: vite-pwa injects registration or you may have registerSW.js
      console.warn('[Analytics] Service worker not active yet; event not queued');
    }
  } catch (e) {
    console.warn('[Analytics] Failed to post analytics event to SW:', e);
  }
};
