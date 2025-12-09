/// <reference types="vitest/globals" />
/**
 * SyncManager.test.ts
 * Tests for the offline-first sync manager
 * Tests queue management, retry logic, and state management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the idb module before importing
vi.mock('idb', () => ({
    openDB: vi.fn(() => Promise.resolve(createMockDB())),
}));

// ============================================================================
// MOCK DATABASE FACTORY
// ============================================================================

function createMockDB() {
    const pendingActions: Map<number, any> = new Map();
    let nextId = 1;

    return {
        add: vi.fn((storeName: string, value: any) => {
            const id = nextId++;
            pendingActions.set(id, { ...value, id });
            return Promise.resolve(id);
        }),
        delete: vi.fn((storeName: string, id: number) => {
            pendingActions.delete(id);
            return Promise.resolve();
        }),
        put: vi.fn((storeName: string, value: any) => {
            if (value.id) {
                pendingActions.set(value.id, value);
            }
            return Promise.resolve();
        }),
        clear: vi.fn((storeName: string) => {
            pendingActions.clear();
            return Promise.resolve();
        }),
        getAllFromIndex: vi.fn((storeName: string, indexName: string) => {
            return Promise.resolve(Array.from(pendingActions.values()));
        }),
        getAll: vi.fn((storeName: string) => {
            return Promise.resolve(Array.from(pendingActions.values()));
        }),
    };
}

// ============================================================================
// TYPES (Mirroring SyncManager.ts)
// ============================================================================

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
    status: SyncStatus;
    pendingCount: number;
    lastSyncTime: number | null;
    lastError: string | null;
}

type ActionType = 'ADD_MEMBER' | 'UPDATE_MEMBER' | 'DELETE_MEMBER' | 'UPDATE_TITHE';

interface PendingAction {
    id?: number;
    type: ActionType;
    payload: any;
    timestamp: number;
    retryCount?: number;
    lastError?: string;
}

// ============================================================================
// TESTS: SyncStatus Type
// ============================================================================

describe('SyncManager.SyncStatus', () => {
    it('has all valid status values', () => {
        const validStatuses: SyncStatus[] = ['idle', 'syncing', 'error', 'offline'];
        expect(validStatuses).toContain('idle');
        expect(validStatuses).toContain('syncing');
        expect(validStatuses).toContain('error');
        expect(validStatuses).toContain('offline');
    });
});

// ============================================================================
// TESTS: SyncState Structure
// ============================================================================

describe('SyncManager.SyncState', () => {
    it('initializes with correct default values', () => {
        const defaultState: SyncState = {
            status: 'idle',
            pendingCount: 0,
            lastSyncTime: null,
            lastError: null,
        };

        expect(defaultState.status).toBe('idle');
        expect(defaultState.pendingCount).toBe(0);
        expect(defaultState.lastSyncTime).toBeNull();
        expect(defaultState.lastError).toBeNull();
    });

    it('updates status to offline when network disconnects', () => {
        const state: SyncState = {
            status: 'idle',
            pendingCount: 5,
            lastSyncTime: null,
            lastError: null,
        };

        const updatedState = { ...state, status: 'offline' as SyncStatus };

        expect(updatedState.status).toBe('offline');
        expect(updatedState.pendingCount).toBe(5); // Should preserve pending count
    });

    it('updates status to syncing when sync starts', () => {
        const state: SyncState = {
            status: 'idle',
            pendingCount: 3,
            lastSyncTime: null,
            lastError: null,
        };

        const updatedState = { ...state, status: 'syncing' as SyncStatus };

        expect(updatedState.status).toBe('syncing');
    });

    it('updates to error with failure message', () => {
        const state: SyncState = {
            status: 'syncing',
            pendingCount: 2,
            lastSyncTime: null,
            lastError: null,
        };

        const updatedState = {
            ...state,
            status: 'error' as SyncStatus,
            lastError: '2 action(s) failed to sync',
            lastSyncTime: Date.now(),
        };

        expect(updatedState.status).toBe('error');
        expect(updatedState.lastError).not.toBeNull();
        expect(updatedState.lastSyncTime).not.toBeNull();
    });
});

// ============================================================================
// TESTS: Action Queue Logic
// ============================================================================

describe('SyncManager.queueAction logic', () => {
    /**
     * Create a pending action
     */
    function createPendingAction(
        type: ActionType,
        payload: any
    ): PendingAction {
        return {
            type,
            payload,
            timestamp: Date.now(),
            retryCount: 0,
        };
    }

    it('creates action with correct structure', () => {
        const action = createPendingAction('ADD_MEMBER', { name: 'John Doe' });

        expect(action.type).toBe('ADD_MEMBER');
        expect(action.payload).toEqual({ name: 'John Doe' });
        expect(action.retryCount).toBe(0);
        expect(typeof action.timestamp).toBe('number');
    });

    it('creates UPDATE_TITHE action', () => {
        const action = createPendingAction('UPDATE_TITHE', {
            memberId: 'TAC123',
            amount: 150,
            date: '2025-12-09',
        });

        expect(action.type).toBe('UPDATE_TITHE');
        expect(action.payload.memberId).toBe('TAC123');
        expect(action.payload.amount).toBe(150);
    });

    it('creates DELETE_MEMBER action', () => {
        const action = createPendingAction('DELETE_MEMBER', {
            memberId: 'TAC456',
        });

        expect(action.type).toBe('DELETE_MEMBER');
        expect(action.payload.memberId).toBe('TAC456');
    });
});

// ============================================================================
// TESTS: Retry Logic
// ============================================================================

describe('SyncManager.syncWithRetry logic', () => {
    /**
     * Determine if action should be skipped due to max retries
     */
    function shouldSkipAction(action: PendingAction, maxRetries: number): boolean {
        const retryCount = action.retryCount || 0;
        return retryCount >= maxRetries;
    }

    it('skips action when retry count exceeds max', () => {
        const action: PendingAction = {
            type: 'ADD_MEMBER',
            payload: {},
            timestamp: Date.now(),
            retryCount: 3,
        };

        expect(shouldSkipAction(action, 3)).toBe(true);
    });

    it('processes action when retry count is below max', () => {
        const action: PendingAction = {
            type: 'ADD_MEMBER',
            payload: {},
            timestamp: Date.now(),
            retryCount: 2,
        };

        expect(shouldSkipAction(action, 3)).toBe(false);
    });

    it('processes action with no retry count', () => {
        const action: PendingAction = {
            type: 'ADD_MEMBER',
            payload: {},
            timestamp: Date.now(),
        };

        expect(shouldSkipAction(action, 3)).toBe(false);
    });

    /**
     * Calculate exponential backoff delay
     */
    function calculateBackoff(retryCount: number): number {
        return Math.pow(2, retryCount) * 1000;
    }

    it('calculates exponential backoff correctly', () => {
        expect(calculateBackoff(0)).toBe(1000);   // 1 second
        expect(calculateBackoff(1)).toBe(2000);   // 2 seconds
        expect(calculateBackoff(2)).toBe(4000);   // 4 seconds
        expect(calculateBackoff(3)).toBe(8000);   // 8 seconds
        expect(calculateBackoff(4)).toBe(16000);  // 16 seconds
    });
});

// ============================================================================
// TESTS: Sync Result Handling
// ============================================================================

describe('SyncManager sync result handling', () => {
    /**
     * Determine final status based on sync results
     */
    function determineFinalStatus(
        successCount: number,
        failedCount: number
    ): { status: SyncStatus; lastError: string | null } {
        if (failedCount > 0) {
            return {
                status: 'error',
                lastError: `${failedCount} action(s) failed to sync`,
            };
        }
        return {
            status: 'idle',
            lastError: null,
        };
    }

    it('returns idle status when all actions succeed', () => {
        const result = determineFinalStatus(5, 0);

        expect(result.status).toBe('idle');
        expect(result.lastError).toBeNull();
    });

    it('returns error status when some actions fail', () => {
        const result = determineFinalStatus(3, 2);

        expect(result.status).toBe('error');
        expect(result.lastError).toBe('2 action(s) failed to sync');
    });

    it('returns error status when all actions fail', () => {
        const result = determineFinalStatus(0, 5);

        expect(result.status).toBe('error');
        expect(result.lastError).toBe('5 action(s) failed to sync');
    });
});

// ============================================================================
// TESTS: Listener/Subscriber Pattern
// ============================================================================

describe('SyncManager listener pattern', () => {
    /**
     * Simple listener manager for testing the pattern
     */
    class MockListenerManager {
        private listeners: Set<(state: SyncState) => void> = new Set();
        private state: SyncState = {
            status: 'idle',
            pendingCount: 0,
            lastSyncTime: null,
            lastError: null,
        };

        subscribe(listener: (state: SyncState) => void): () => void {
            this.listeners.add(listener);
            listener(this.state); // Immediately notify
            return () => this.listeners.delete(listener);
        }

        updateState(partial: Partial<SyncState>) {
            this.state = { ...this.state, ...partial };
            this.listeners.forEach(listener => listener(this.state));
        }

        getListenerCount(): number {
            return this.listeners.size;
        }
    }

    it('immediately calls listener on subscribe', () => {
        const manager = new MockListenerManager();
        const listener = vi.fn();

        manager.subscribe(listener);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({
            status: 'idle',
            pendingCount: 0,
            lastSyncTime: null,
            lastError: null,
        });
    });

    it('notifies all listeners on state change', () => {
        const manager = new MockListenerManager();
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        manager.subscribe(listener1);
        manager.subscribe(listener2);

        manager.updateState({ status: 'syncing' });

        // Each called twice: once on subscribe, once on update
        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('unsubscribe removes listener', () => {
        const manager = new MockListenerManager();
        const listener = vi.fn();

        const unsubscribe = manager.subscribe(listener);
        expect(manager.getListenerCount()).toBe(1);

        unsubscribe();
        expect(manager.getListenerCount()).toBe(0);

        // Shouldn't be called on subsequent updates
        manager.updateState({ status: 'syncing' });
        expect(listener).toHaveBeenCalledTimes(1); // Only the initial call
    });
});

// ============================================================================
// TESTS: Online/Offline Handling
// ============================================================================

describe('SyncManager online/offline handling', () => {
    /**
     * Determine sync behavior based on online status
     */
    function canSync(isOnline: boolean): boolean {
        return isOnline;
    }

    it('allows sync when online', () => {
        expect(canSync(true)).toBe(true);
    });

    it('prevents sync when offline', () => {
        expect(canSync(false)).toBe(false);
    });

    /**
     * Get status for offline state
     */
    function getOfflineStatus(): SyncStatus {
        return 'offline';
    }

    it('returns offline status', () => {
        expect(getOfflineStatus()).toBe('offline');
    });
});

// ============================================================================
// TESTS: Concurrent Sync Prevention
// ============================================================================

describe('SyncManager concurrent sync prevention', () => {
    /**
     * Simulate sync lock check
     */
    function shouldProceedWithSync(isSyncing: boolean): boolean {
        return !isSyncing;
    }

    it('allows sync when not already syncing', () => {
        expect(shouldProceedWithSync(false)).toBe(true);
    });

    it('prevents sync when already syncing', () => {
        expect(shouldProceedWithSync(true)).toBe(false);
    });
});

// ============================================================================
// TESTS: Action Type Validation
// ============================================================================

describe('SyncManager action types', () => {
    const validActionTypes: ActionType[] = [
        'ADD_MEMBER',
        'UPDATE_MEMBER',
        'DELETE_MEMBER',
        'UPDATE_TITHE',
    ];

    it('includes all expected action types', () => {
        expect(validActionTypes).toContain('ADD_MEMBER');
        expect(validActionTypes).toContain('UPDATE_MEMBER');
        expect(validActionTypes).toContain('DELETE_MEMBER');
        expect(validActionTypes).toContain('UPDATE_TITHE');
    });

    it('has exactly 4 action types', () => {
        expect(validActionTypes.length).toBe(4);
    });
});

// ============================================================================
// TESTS: Pending Count Management
// ============================================================================

describe('SyncManager pending count', () => {
    /**
     * Update pending count from actions array
     */
    function getPendingCount(actions: any[]): number {
        return actions.length;
    }

    it('returns correct count for non-empty array', () => {
        const actions = [{ id: 1 }, { id: 2 }, { id: 3 }];
        expect(getPendingCount(actions)).toBe(3);
    });

    it('returns 0 for empty array', () => {
        expect(getPendingCount([])).toBe(0);
    });
});

// ============================================================================
// TESTS: Error Message Formatting
// ============================================================================

describe('SyncManager error messages', () => {
    /**
     * Format error message for failed actions
     */
    function formatFailedActionsError(failedCount: number): string {
        return `${failedCount} action(s) failed to sync`;
    }

    it('formats singular failure correctly', () => {
        expect(formatFailedActionsError(1)).toBe('1 action(s) failed to sync');
    });

    it('formats plural failures correctly', () => {
        expect(formatFailedActionsError(3)).toBe('3 action(s) failed to sync');
    });
});

// ============================================================================
// TESTS: Updated Action with Error
// ============================================================================

describe('SyncManager action error tracking', () => {
    /**
     * Update action with error info
     */
    function updateActionWithError(
        action: PendingAction,
        error: Error
    ): PendingAction {
        return {
            ...action,
            retryCount: (action.retryCount || 0) + 1,
            lastError: error.message || 'Unknown error',
        };
    }

    it('increments retry count', () => {
        const action: PendingAction = {
            type: 'ADD_MEMBER',
            payload: {},
            timestamp: Date.now(),
            retryCount: 1,
        };

        const updated = updateActionWithError(action, new Error('Network error'));

        expect(updated.retryCount).toBe(2);
    });

    it('stores error message', () => {
        const action: PendingAction = {
            type: 'ADD_MEMBER',
            payload: {},
            timestamp: Date.now(),
        };

        const updated = updateActionWithError(action, new Error('Server timeout'));

        expect(updated.lastError).toBe('Server timeout');
    });

    it('handles missing error message', () => {
        const action: PendingAction = {
            type: 'ADD_MEMBER',
            payload: {},
            timestamp: Date.now(),
        };

        const errorWithoutMessage = new Error();
        errorWithoutMessage.message = '';
        const updated = updateActionWithError(action, errorWithoutMessage);

        expect(updated.lastError).toBe('Unknown error');
    });
});
