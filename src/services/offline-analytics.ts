import { Queue } from 'workbox-background-sync';

const queue = new Queue('analytics-queue');

export const pushAnalyticsEvent = async (event: any) => {
  await queue.pushRequest({request: new Request('/api/analytics', {method: 'POST', body: JSON.stringify(event)})});
};