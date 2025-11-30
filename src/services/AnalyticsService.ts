import { openDB, DBSchema, IDBPDatabase } from "idb";

interface AnalyticsDB extends DBSchema {
    "analytics-events": {
        key: number;
        value: {
            eventName: string;
            properties: any;
            timestamp: number;
        };
        indexes: { "by-timestamp": number };
    };
}

class AnalyticsService {
    private dbPromise: Promise<IDBPDatabase<AnalyticsDB>>;

    constructor() {
        this.dbPromise = openDB<AnalyticsDB>("tactms-analytics-db", 1, {
            upgrade(db) {
                const store = db.createObjectStore("analytics-events", {
                    keyPath: "key",
                    autoIncrement: true,
                });
                store.createIndex("by-timestamp", "timestamp");
            },
        });
    }

    async trackEvent(eventName: string, properties: any = {}) {
        const db = await this.dbPromise;
        await db.add("analytics-events", {
            eventName,
            properties,
            timestamp: Date.now(),
        });
        console.log(`[Analytics] Event tracked: ${eventName}`, properties);
    }

    async getPendingEvents() {
        const db = await this.dbPromise;
        return db.getAllFromIndex("analytics-events", "by-timestamp");
    }

    async clearEvents() {
        const db = await this.dbPromise;
        await db.clear("analytics-events");
    }
}

export const analyticsService = new AnalyticsService();
