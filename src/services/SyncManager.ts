import { openDB, DBSchema, IDBPDatabase } from "idb";

interface SyncDB extends DBSchema {
    "pending-actions": {
        key: number;
        value: {
            id?: number;
            type: "ADD_MEMBER" | "UPDATE_MEMBER" | "DELETE_MEMBER" | "UPDATE_TITHE";
            payload: any;
            timestamp: number;
        };
        indexes: { "by-timestamp": number };
    };
}

class SyncManager {
    private dbPromise: Promise<IDBPDatabase<SyncDB>>;

    constructor() {
        this.dbPromise = openDB<SyncDB>("tactms-sync-db", 1, {
            upgrade(db) {
                const store = db.createObjectStore("pending-actions", {
                    keyPath: "id",
                    autoIncrement: true,
                });
                store.createIndex("by-timestamp", "timestamp");
            },
        });
    }

    async queueAction(
        type: "ADD_MEMBER" | "UPDATE_MEMBER" | "DELETE_MEMBER" | "UPDATE_TITHE",
        payload: any
    ) {
        const db = await this.dbPromise;
        await db.add("pending-actions", {
            type,
            payload,
            timestamp: Date.now(),
        });
        console.log(`[SyncManager] Action queued: ${type}`);

        // Register background sync if supported
        if ("serviceWorker" in navigator && "SyncManager" in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await (registration as any).sync.register("sync-tithe-data");
            } catch (err) {
                console.warn("[SyncManager] Background sync registration failed:", err);
            }
        }
    }

    async getPendingActions() {
        const db = await this.dbPromise;
        return db.getAllFromIndex("pending-actions", "by-timestamp");
    }

    async clearPendingActions() {
        const db = await this.dbPromise;
        await db.clear("pending-actions");
    }

    async removeAction(id: number) {
        const db = await this.dbPromise;
        await db.delete("pending-actions", id);
    }
}

export const syncManager = new SyncManager();
