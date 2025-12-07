import { openDB, DBSchema, IDBPDatabase } from "idb";

interface SyncDB extends DBSchema {
    "pending-actions": {
        key: number;
        value: {
            id?: number;
            type: "ADD_MEMBER" | "UPDATE_MEMBER" | "DELETE_MEMBER" | "UPDATE_TITHE";
            payload: any;
            timestamp: number;
            retryCount?: number;
            lastError?: string;
        };
        indexes: { "by-timestamp": number };
    };
}

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export interface SyncState {
    status: SyncStatus;
    pendingCount: number;
    lastSyncTime: number | null;
    lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncManager {
    private dbPromise: Promise<IDBPDatabase<SyncDB>>;
    private listeners: Set<SyncListener> = new Set();
    private state: SyncState = {
        status: "idle",
        pendingCount: 0,
        lastSyncTime: null,
        lastError: null,
    };
    private isSyncing = false;

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

        // Update pending count on init
        this.updatePendingCount();

        // Listen for online/offline events
        if (typeof window !== "undefined") {
            window.addEventListener("online", () => this.handleOnline());
            window.addEventListener("offline", () => this.handleOffline());
        }
    }

    // Subscribe to state changes
    subscribe(listener: SyncListener): () => void {
        this.listeners.add(listener);
        // Immediately notify with current state
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach((listener) => listener(this.state));
    }

    private updateState(partial: Partial<SyncState>) {
        this.state = { ...this.state, ...partial };
        this.notify();
    }

    private async updatePendingCount() {
        const actions = await this.getPendingActions();
        this.updateState({ pendingCount: actions.length });
    }

    private handleOnline() {
        console.log("[SyncManager] Online - attempting sync");
        this.updateState({ status: "idle" });
        this.syncWithRetry();
    }

    private handleOffline() {
        console.log("[SyncManager] Offline");
        this.updateState({ status: "offline" });
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
            retryCount: 0,
        });
        console.log(`[SyncManager] Action queued: ${type}`);
        await this.updatePendingCount();

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
        await this.updatePendingCount();
    }

    async removeAction(id: number) {
        const db = await this.dbPromise;
        await db.delete("pending-actions", id);
        await this.updatePendingCount();
    }

    // Get current sync state
    getState(): SyncState {
        return this.state;
    }

    // Retry sync with exponential backoff
    async syncWithRetry(maxRetries = 3): Promise<{ success: number; failed: number }> {
        if (this.isSyncing) {
            console.log("[SyncManager] Sync already in progress");
            return { success: 0, failed: 0 };
        }

        if (!navigator.onLine) {
            this.updateState({ status: "offline" });
            return { success: 0, failed: 0 };
        }

        this.isSyncing = true;
        this.updateState({ status: "syncing" });

        const actions = await this.getPendingActions();
        let successCount = 0;
        let failedCount = 0;

        for (const action of actions) {
            const retryCount = action.retryCount || 0;

            if (retryCount >= maxRetries) {
                console.warn(`[SyncManager] Action ${action.id} exceeded max retries`);
                failedCount++;
                continue;
            }

            try {
                // Placeholder for actual sync logic
                // In a real implementation, this would call your API
                await this.syncAction(action);
                await this.removeAction(action.id!);
                successCount++;
                console.log(`[SyncManager] Action ${action.id} synced successfully`);
            } catch (error: any) {
                console.error(`[SyncManager] Sync failed for action ${action.id}:`, error);

                // Update retry count with exponential backoff
                const db = await this.dbPromise;
                await db.put("pending-actions", {
                    ...action,
                    retryCount: retryCount + 1,
                    lastError: error.message || "Unknown error",
                });

                // Wait with exponential backoff before next attempt
                const backoffMs = Math.pow(2, retryCount) * 1000;
                await this.sleep(backoffMs);
                failedCount++;
            }
        }

        this.isSyncing = false;

        if (failedCount > 0) {
            this.updateState({
                status: "error",
                lastError: `${failedCount} action(s) failed to sync`,
                lastSyncTime: Date.now(),
            });
        } else {
            this.updateState({
                status: "idle",
                lastError: null,
                lastSyncTime: Date.now(),
            });
        }

        return { success: successCount, failed: failedCount };
    }

    // Placeholder for actual sync implementation
    private async syncAction(action: SyncDB["pending-actions"]["value"]): Promise<void> {
        // TODO: Implement actual API sync logic here
        // For now, simulate success after a short delay
        await this.sleep(100);
        console.log(`[SyncManager] Syncing action: ${action.type}`, action.payload);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export const syncManager = new SyncManager();
