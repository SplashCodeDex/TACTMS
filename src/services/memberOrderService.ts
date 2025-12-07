/**
 * Member Order Service
 * Persists member ordering from physical tithe book in IndexedDB
 * Separate from UI sorting/filtering
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MemberRecordA } from '@/types';

// Database Schema
interface MemberOrderDB extends DBSchema {
    memberOrders: {
        key: string;
        value: MemberOrderEntry;
        indexes: {
            'by-assembly': string;
            'by-tithe-index': [string, number];
            'by-first-seen': string;
        };
    };
    assemblyMeta: {
        key: string;
        value: AssemblyMetadata;
    };
    orderHistory: {
        key: string;
        value: OrderHistoryEntry;
        indexes: {
            'by-assembly': string;
            'by-timestamp': number;
        };
    };
}

export interface MemberOrderEntry {
    id: string;                  // memberId-assemblyName
    memberId: string;            // Membership Number
    displayName: string;         // Full name for display
    titheBookIndex: number;      // Position in PHYSICAL tithe book (preserved)
    assemblyName: string;
    firstSeenDate: string;       // ISO date string
    firstSeenMonth: string;      // YYYY-MM for won souls tracking
    lastUpdated: number;         // Timestamp
    isActive: boolean;           // Still in current master list
}

export interface AssemblyMetadata {
    assemblyName: string;
    totalMembers: number;
    lastSyncDate: number;
    lastMasterListHash: string;  // To detect changes
}

export interface SyncResult {
    newMembers: MemberRecordA[];
    existingMembers: MemberRecordA[];
    duplicatesSkipped: number;
    totalProcessed: number;
}

// ============================================================================
// EXPORT/IMPORT & HISTORY TYPES
// ============================================================================

export interface OrderExport {
    version: 1;
    assemblyName: string;
    exportDate: string;
    memberCount: number;
    members: Array<{
        memberId: string;
        displayName: string;
        titheBookIndex: number;
    }>;
}

export interface OrderHistoryEntry {
    id: string;
    assemblyName: string;
    action: 'reorder' | 'import' | 'reset' | 'ai_reorder' | 'manual';
    timestamp: number;
    description: string;
    affectedCount: number;
}

export interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
}

const DB_NAME = 'tactms-member-order';
const DB_VERSION = 2; // Bumped for orderHistory store

let dbPromise: Promise<IDBPDatabase<MemberOrderDB>> | null = null;

/**
 * Initialize the IndexedDB database
 */
const getDB = async (): Promise<IDBPDatabase<MemberOrderDB>> => {
    if (!dbPromise) {
        dbPromise = openDB<MemberOrderDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                // Version 1: Member orders and assembly meta
                if (oldVersion < 1) {
                    const orderStore = db.createObjectStore('memberOrders', { keyPath: 'id' });
                    orderStore.createIndex('by-assembly', 'assemblyName');
                    orderStore.createIndex('by-tithe-index', ['assemblyName', 'titheBookIndex']);
                    orderStore.createIndex('by-first-seen', 'firstSeenMonth');
                    db.createObjectStore('assemblyMeta', { keyPath: 'assemblyName' });
                }

                // Version 2: Order history tracking
                if (oldVersion < 2) {
                    const historyStore = db.createObjectStore('orderHistory', { keyPath: 'id' });
                    historyStore.createIndex('by-assembly', 'assemblyName');
                    historyStore.createIndex('by-timestamp', 'timestamp');
                }
            },
        });
    }
    return dbPromise;
};

/**
 * Generate a unique ID for a member order entry
 */
const generateId = (memberId: string, assemblyName: string): string => {
    return `${assemblyName.toLowerCase()}-${memberId.toLowerCase()}`;
};

/**
 * Generate a simple hash of member data to detect changes
 */
const generateMemberHash = (members: MemberRecordA[]): string => {
    const ids = members.map(m => m["Membership Number"] || '').sort().join(',');
    // Simple hash
    let hash = 0;
    for (let i = 0; i < ids.length; i++) {
        const char = ids.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
};

/**
 * Initialize order from first tithe book scan or master list upload
 */
export const initializeOrder = async (
    members: MemberRecordA[],
    assemblyName: string
): Promise<void> => {
    const db = await getDB();
    const now = Date.now();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const tx = db.transaction(['memberOrders', 'assemblyMeta'], 'readwrite');

    // Add each member with their tithe book index
    for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const memberId = member["Membership Number"] || member["Old Membership Number"] || `unknown-${i}`;
        const id = generateId(memberId, assemblyName);

        const displayName = [
            member.Title,
            member["First Name"],
            member.Surname,
            member["Other Names"]
        ].filter(Boolean).join(' ');

        const entry: MemberOrderEntry = {
            id,
            memberId,
            displayName: displayName || memberId,
            titheBookIndex: i + 1, // 1-indexed like physical book
            assemblyName,
            firstSeenDate: new Date().toISOString(),
            firstSeenMonth: currentMonth,
            lastUpdated: now,
            isActive: true,
        };

        await tx.objectStore('memberOrders').put(entry);
    }

    // Update assembly metadata
    const meta: AssemblyMetadata = {
        assemblyName,
        totalMembers: members.length,
        lastSyncDate: now,
        lastMasterListHash: generateMemberHash(members),
    };
    await tx.objectStore('assemblyMeta').put(meta);

    await tx.done;
};

/**
 * Get members in tithe book order (preserved order)
 */
export const getOrderedMembers = async (
    assemblyName: string
): Promise<MemberOrderEntry[]> => {
    const db = await getDB();
    const allEntries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);

    // Sort by tithe book index
    return allEntries
        .filter(e => e.isActive)
        .sort((a, b) => a.titheBookIndex - b.titheBookIndex);
};

/**
 * Sync with updated master list - detect new vs existing members
 */
export const syncWithMasterList = async (
    newMembers: MemberRecordA[],
    assemblyName: string
): Promise<SyncResult> => {
    const db = await getDB();
    const now = Date.now();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get existing members for this assembly
    const existingEntries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);
    const existingIds = new Set(existingEntries.map(e => e.memberId.toLowerCase()));

    // Find the highest tithe book index
    let maxIndex = existingEntries.length > 0
        ? Math.max(...existingEntries.map(e => e.titheBookIndex))
        : 0;

    const result: SyncResult = {
        newMembers: [],
        existingMembers: [],
        duplicatesSkipped: 0,
        totalProcessed: newMembers.length,
    };

    const tx = db.transaction(['memberOrders', 'assemblyMeta'], 'readwrite');

    for (const member of newMembers) {
        const memberId = member["Membership Number"] || member["Old Membership Number"] || '';
        if (!memberId) continue;

        const normalizedId = memberId.toLowerCase();

        if (existingIds.has(normalizedId)) {
            // Existing member - mark as active, update lastUpdated
            result.existingMembers.push(member);
            result.duplicatesSkipped++;

            const id = generateId(memberId, assemblyName);
            const existing = await tx.objectStore('memberOrders').get(id);
            if (existing) {
                existing.isActive = true;
                existing.lastUpdated = now;
                await tx.objectStore('memberOrders').put(existing);
            }
        } else {
            // NEW member - add at end with new tithe book index
            result.newMembers.push(member);
            maxIndex++;

            const displayName = [
                member.Title,
                member["First Name"],
                member.Surname,
                member["Other Names"]
            ].filter(Boolean).join(' ');

            const entry: MemberOrderEntry = {
                id: generateId(memberId, assemblyName),
                memberId,
                displayName: displayName || memberId,
                titheBookIndex: maxIndex,
                assemblyName,
                firstSeenDate: new Date().toISOString(),
                firstSeenMonth: currentMonth,
                lastUpdated: now,
                isActive: true,
            };

            await tx.objectStore('memberOrders').put(entry);
            existingIds.add(normalizedId);
        }
    }

    // Update assembly metadata
    const meta: AssemblyMetadata = {
        assemblyName,
        totalMembers: existingIds.size,
        lastSyncDate: now,
        lastMasterListHash: generateMemberHash(newMembers),
    };
    await tx.objectStore('assemblyMeta').put(meta);

    await tx.done;

    return result;
};

/**
 * Get members first seen this month (won souls)
 */
export const getWonSouls = async (
    assemblyName: string,
    month?: string // YYYY-MM format, defaults to current month
): Promise<MemberOrderEntry[]> => {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const db = await getDB();

    const allEntries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);

    return allEntries.filter(e => e.firstSeenMonth === targetMonth && e.isActive);
};

/**
 * Update a member's tithe book position (manual reorder)
 */
export const updateMemberPosition = async (
    memberId: string,
    newIndex: number,
    assemblyName: string
): Promise<void> => {
    const db = await getDB();
    const id = generateId(memberId, assemblyName);

    const tx = db.transaction('memberOrders', 'readwrite');
    const store = tx.objectStore('memberOrders');
    const index = store.index('by-tithe-index');

    // 1. Get the member moving
    const entry = await store.get(id);
    if (!entry) {
        await tx.done;
        return;
    }
    const oldIndex = entry.titheBookIndex;

    // 2. Check for collision at newIndex
    // key range matching [assemblyName, newIndex]
    const collisionEntry = await index.get(IDBKeyRange.only([assemblyName, newIndex]));

    if (collisionEntry) {
        // SWAP: Move collision member to oldIndex
        collisionEntry.titheBookIndex = oldIndex;
        collisionEntry.lastUpdated = Date.now();
        await store.put(collisionEntry);
    }

    // 3. Move target member to newIndex
    entry.titheBookIndex = newIndex;
    entry.lastUpdated = Date.now();
    await store.put(entry);

    await tx.done;

    // Log the change
    await logOrderChange({
        assemblyName,
        action: 'manual',
        timestamp: Date.now(),
        description: collisionEntry
            ? `Swapped #${oldIndex} (${entry.displayName}) with #${newIndex} (${collisionEntry.displayName})`
            : `Moved ${entry.displayName} to #${newIndex} (was #${oldIndex})`,
        affectedCount: collisionEntry ? 2 : 1
    });
};

/**
 * Update multiple member positions (batch reorder)
 */
export const updateMemberOrder = async (
    updates: { memberId: string; newIndex: number }[],
    assemblyName: string
): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('memberOrders', 'readwrite');
    const store = tx.objectStore('memberOrders');

    for (const update of updates) {
        const id = generateId(update.memberId, assemblyName);
        const entry = await store.get(id);
        if (entry) {
            entry.titheBookIndex = update.newIndex;
            entry.lastUpdated = Date.now();
            await store.put(entry);
        }
    }

    await tx.done;
};

/**
 * Get assembly metadata
 */
export const getAssemblyMetadata = async (
    assemblyName: string
): Promise<AssemblyMetadata | undefined> => {
    const db = await getDB();
    return db.get('assemblyMeta', assemblyName);
};

/**
 * Get all assemblies with data
 */
export const getAllAssemblies = async (): Promise<AssemblyMetadata[]> => {
    const db = await getDB();
    return db.getAll('assemblyMeta');
};

/**
 * Check if an assembly has persisted order
 */
export const hasPersistedOrder = async (assemblyName: string): Promise<boolean> => {
    const meta = await getAssemblyMetadata(assemblyName);
    return meta !== undefined && meta.totalMembers > 0;
};

/**
 * Delete all data for an assembly
 */
export const deleteAssemblyData = async (assemblyName: string): Promise<void> => {
    const db = await getDB();

    const entries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);

    const tx = db.transaction(['memberOrders', 'assemblyMeta'], 'readwrite');

    for (const entry of entries) {
        await tx.objectStore('memberOrders').delete(entry.id);
    }

    await tx.objectStore('assemblyMeta').delete(assemblyName);

    await tx.done;
};

/**
 * Export all member order data for backup
 */
export const exportAllData = async (): Promise<{
    memberOrders: MemberOrderEntry[];
    assemblyMeta: AssemblyMetadata[];
}> => {
    const db = await getDB();
    return {
        memberOrders: await db.getAll('memberOrders'),
        assemblyMeta: await db.getAll('assemblyMeta'),
    };
};

/**
 * Import member order data from backup
 */
export const importData = async (data: {
    memberOrders: MemberOrderEntry[];
    assemblyMeta: AssemblyMetadata[];
}): Promise<void> => {
    const db = await getDB();

    const tx = db.transaction(['memberOrders', 'assemblyMeta'], 'readwrite');

    for (const order of data.memberOrders) {
        await tx.objectStore('memberOrders').put(order);
    }

    for (const meta of data.assemblyMeta) {
        await tx.objectStore('assemblyMeta').put(meta);
    }

    await tx.done;
};

// ============================================================================
// ASSEMBLY-SPECIFIC EXPORT/IMPORT
// ============================================================================

/**
 * Export member order for a specific assembly
 */
export const exportOrderForAssembly = async (assemblyName: string): Promise<OrderExport> => {
    const db = await getDB();
    const allEntries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);

    const activeMembers = allEntries
        .filter(e => e.isActive)
        .sort((a, b) => a.titheBookIndex - b.titheBookIndex);

    return {
        version: 1,
        assemblyName,
        exportDate: new Date().toISOString(),
        memberCount: activeMembers.length,
        members: activeMembers.map(m => ({
            memberId: m.memberId,
            displayName: m.displayName,
            titheBookIndex: m.titheBookIndex
        }))
    };
};

/**
 * Import member order from JSON backup
 */
export const importOrderForAssembly = async (
    data: OrderExport,
    assemblyName: string
): Promise<ImportResult> => {
    const result: ImportResult = {
        success: false,
        imported: 0,
        skipped: 0,
        errors: []
    };

    // Validation
    if (data.version !== 1) {
        result.errors.push(`Unsupported version: ${data.version}`);
        return result;
    }

    if (data.assemblyName !== assemblyName) {
        result.errors.push(`Assembly mismatch: expected ${assemblyName}, got ${data.assemblyName}`);
        return result;
    }

    const db = await getDB();
    const tx = db.transaction('memberOrders', 'readwrite');

    for (const member of data.members) {
        const id = generateId(member.memberId, assemblyName);
        const existing = await tx.store.get(id);

        if (existing) {
            existing.titheBookIndex = member.titheBookIndex;
            existing.lastUpdated = Date.now();
            await tx.store.put(existing);
            result.imported++;
        } else {
            result.skipped++;
        }
    }

    await tx.done;
    result.success = true;

    // Log the import
    await logOrderChange({
        assemblyName,
        action: 'import',
        timestamp: Date.now(),
        description: `Imported order from backup (${data.exportDate})`,
        affectedCount: result.imported
    });

    return result;
};

// ============================================================================
// ORDER HISTORY
// ============================================================================

/**
 * Log an order change event
 */
export const logOrderChange = async (
    entry: Omit<OrderHistoryEntry, 'id'>
): Promise<void> => {
    const db = await getDB();
    const id = `${entry.assemblyName}-${entry.timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    await db.put('orderHistory', { ...entry, id });
};

/**
 * Get order history for an assembly
 */
export const getOrderHistory = async (
    assemblyName: string,
    limit: number = 50
): Promise<OrderHistoryEntry[]> => {
    const db = await getDB();
    const allHistory = await db.getAllFromIndex('orderHistory', 'by-assembly', assemblyName);

    return allHistory
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
};

// ============================================================================
// BULK RESET
// ============================================================================

/**
 * Reset member order to match fresh master list (destructive!)
 */
export const resetOrderFromMasterList = async (
    members: MemberRecordA[],
    assemblyName: string
): Promise<void> => {
    const db = await getDB();

    // Get existing entries to preserve metadata
    const existingEntries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);
    const existingMap = new Map(existingEntries.map(e => [e.memberId.toLowerCase(), e]));

    const tx = db.transaction('memberOrders', 'readwrite');
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const memberId = member["Membership Number"] || member["Old Membership Number"] || "";
        if (!memberId) continue;

        const normalizedId = memberId.toLowerCase();
        const existing = existingMap.get(normalizedId);

        const displayName = [
            member.Surname,
            member["First Name"],
            member["Other Names"]
        ].filter(Boolean).join(" ");

        const entry: MemberOrderEntry = {
            id: generateId(memberId, assemblyName),
            memberId,
            displayName,
            titheBookIndex: i + 1, // Reset to sequential order
            assemblyName,
            firstSeenDate: existing?.firstSeenDate || todayStr,
            firstSeenMonth: existing?.firstSeenMonth || monthStr,
            lastUpdated: now,
            isActive: true
        };

        await tx.store.put(entry);
    }

    await tx.done;

    // Log the reset
    await logOrderChange({
        assemblyName,
        action: 'reset',
        timestamp: now,
        description: 'Reset order to match master list',
        affectedCount: members.length
    });
};
