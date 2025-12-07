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
    orderSnapshots: {
        key: string;
        value: OrderSnapshot;
        indexes: {
            'by-assembly': string;
            'by-timestamp': number;
            'by-history': string;
        };
    };
    learnedAliases: {
        key: string;
        value: LearnedAlias;
        indexes: {
            'by-assembly': string;
            'by-extracted': [string, string];
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

export interface DuplicateIndexInfo {
    index: number;
    memberIds: string[];
}

export interface IntegrityReport {
    isHealthy: boolean;
    assemblyName: string;
    duplicateIndices: DuplicateIndexInfo[];
    orphanedMembers: string[];  // memberIds with null/undefined/invalid index
    totalMembers: number;
    autoRepaired: number;
    timestamp: number;
}

export interface OrderSnapshot {
    id: string;                    // UUID
    assemblyName: string;
    historyEntryId: string;        // Links to OrderHistoryEntry that triggered this
    timestamp: number;
    memberCount: number;
    entries: Array<{
        memberId: string;
        displayName: string;
        titheBookIndex: number;
    }>;
}

export interface LearnedAlias {
    id: string;                    // normalized extractedName + assemblyName
    assemblyName: string;
    extractedName: string;         // The OCR/handwritten name (normalized lowercase)
    memberId: string;              // The member they matched to
    memberDisplayName: string;     // For display purposes
    createdAt: number;
    usageCount: number;            // How many times this alias was applied
    lastUsed: number;
}

const DB_NAME = 'tactms-member-order';
const DB_VERSION = 4; // Bumped for learnedAliases store

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

                // Version 3: Order snapshots for undo/restore
                if (oldVersion < 3) {
                    const snapshotStore = db.createObjectStore('orderSnapshots', { keyPath: 'id' });
                    snapshotStore.createIndex('by-assembly', 'assemblyName');
                    snapshotStore.createIndex('by-timestamp', 'timestamp');
                    snapshotStore.createIndex('by-history', 'historyEntryId');
                }

                // Version 4: Learned aliases for name matching
                if (oldVersion < 4) {
                    const aliasStore = db.createObjectStore('learnedAliases', { keyPath: 'id' });
                    aliasStore.createIndex('by-assembly', 'assemblyName');
                    aliasStore.createIndex('by-extracted', ['assemblyName', 'extractedName']);
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

    // Run integrity check after sync
    await validateAndRepairOrder(assemblyName, true);

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

    // Run integrity check after batch reorder
    await validateAndRepairOrder(assemblyName, true);
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
 * @returns The history entry ID (useful for linking to snapshots)
 */
export const logOrderChange = async (
    entry: Omit<OrderHistoryEntry, 'id'>,
    preGeneratedId?: string  // Optional: use this ID instead of generating one
): Promise<string> => {
    const db = await getDB();
    const id = preGeneratedId || `${entry.assemblyName}-${entry.timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    await db.put('orderHistory', { ...entry, id });
    return id;
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

    // Run integrity check after reset
    await validateAndRepairOrder(assemblyName, true);
};

/**
 * Repair member order (Fix duplicates)
 */
export const repairMemberOrder = async (
    assemblyName: string
): Promise<{ fixedCount: number }> => {
    const db = await getDB();
    const entries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);

    // Group by titheBookIndex
    const indexMap = new Map<number, MemberOrderEntry[]>();
    entries.forEach(e => {
        const list = indexMap.get(e.titheBookIndex) || [];
        list.push(e);
        indexMap.set(e.titheBookIndex, list);
    });

    let maxIndex = 0;
    entries.forEach(e => {
        if (e.titheBookIndex > maxIndex) maxIndex = e.titheBookIndex;
    });

    const tx = db.transaction('memberOrders', 'readwrite');
    let fixedCount = 0;

    for (const [_index, duplicates] of indexMap.entries()) {
        if (duplicates.length > 1) {
            // Sort by lastUpdated (keep the most recently updated one at the position?)
            // OR keep the one with the smallest ID?
            // Better: Keep the one that was updated MOST RECENTLY as the "true" owner?
            // User feedback suggests the "Newer" move is the intended one.
            // Let's sort descending by lastUpdated.
            duplicates.sort((a, b) => b.lastUpdated - a.lastUpdated);

            // Keep duplicates[0] (most recent). Move the rest.
            for (let i = 1; i < duplicates.length; i++) {
                maxIndex++;
                const memberToMove = duplicates[i];
                memberToMove.titheBookIndex = maxIndex;
                memberToMove.lastUpdated = Date.now();
                await tx.store.put(memberToMove);
                fixedCount++;
            }
        }
    }

    await tx.done;

    if (fixedCount > 0) {
        await logOrderChange({
            assemblyName,
            action: 'manual', // or 'repair'? reusing manual for now or add new type
            timestamp: Date.now(),
            description: `Repaired ${fixedCount} duplicate positions`,
            affectedCount: fixedCount
        });
    }

    return { fixedCount };
};

// ============================================================================
// INDEX INTEGRITY VALIDATION
// ============================================================================

/**
 * Validate and optionally repair member order integrity
 * Checks for duplicate indices and orphaned members (invalid index)
 */
export const validateAndRepairOrder = async (
    assemblyName: string,
    autoRepair: boolean = true
): Promise<IntegrityReport> => {
    const db = await getDB();
    const now = Date.now();

    const entries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);
    const activeEntries = entries.filter(e => e.isActive);

    const report: IntegrityReport = {
        isHealthy: true,
        assemblyName,
        duplicateIndices: [],
        orphanedMembers: [],
        totalMembers: activeEntries.length,
        autoRepaired: 0,
        timestamp: now,
    };

    // 1. Group by titheBookIndex to find duplicates
    const indexMap = new Map<number, MemberOrderEntry[]>();
    const orphans: MemberOrderEntry[] = [];

    for (const entry of activeEntries) {
        // Check for invalid index
        if (
            entry.titheBookIndex === null ||
            entry.titheBookIndex === undefined ||
            entry.titheBookIndex < 0 ||
            !Number.isFinite(entry.titheBookIndex)
        ) {
            orphans.push(entry);
            report.orphanedMembers.push(entry.memberId);
            continue;
        }

        const list = indexMap.get(entry.titheBookIndex) || [];
        list.push(entry);
        indexMap.set(entry.titheBookIndex, list);
    }

    // 2. Find duplicates
    for (const [index, members] of indexMap.entries()) {
        if (members.length > 1) {
            report.duplicateIndices.push({
                index,
                memberIds: members.map(m => m.memberId),
            });
        }
    }

    // 3. Set health status
    report.isHealthy = report.duplicateIndices.length === 0 && report.orphanedMembers.length === 0;

    // 4. Auto-repair if requested
    if (!report.isHealthy && autoRepair) {
        const tx = db.transaction('memberOrders', 'readwrite');
        const store = tx.objectStore('memberOrders');

        // Find max index for assigning new positions
        let maxIndex = 0;
        for (const [idx] of indexMap.entries()) {
            if (idx > maxIndex) maxIndex = idx;
        }

        // Fix duplicates: keep most recently updated, move others to end
        for (const dup of report.duplicateIndices) {
            const members = indexMap.get(dup.index) || [];
            // Sort by lastUpdated descending (keep most recent at position)
            members.sort((a, b) => b.lastUpdated - a.lastUpdated);

            // Move all but the first to end
            for (let i = 1; i < members.length; i++) {
                maxIndex++;
                const entry = members[i];
                entry.titheBookIndex = maxIndex;
                entry.lastUpdated = now;
                await store.put(entry);
                report.autoRepaired++;
            }
        }

        // Fix orphans: assign to end
        for (const orphan of orphans) {
            maxIndex++;
            orphan.titheBookIndex = maxIndex;
            orphan.lastUpdated = now;
            await store.put(orphan);
            report.autoRepaired++;
        }

        await tx.done;

        // Log the repair
        if (report.autoRepaired > 0) {
            await logOrderChange({
                assemblyName,
                action: 'manual',
                timestamp: now,
                description: `Integrity check: repaired ${report.autoRepaired} issues (${report.duplicateIndices.length} duplicates, ${orphans.length} orphans)`,
                affectedCount: report.autoRepaired,
            });
        }
    }

    return report;
};

// ============================================================================
// ORDER SNAPSHOTS (UNDO/RESTORE)
// ============================================================================

/**
 * Create a snapshot of the current order before a major operation
 * This allows users to restore to this point later
 */
export const createSnapshot = async (
    assemblyName: string,
    historyEntryId: string
): Promise<string> => {
    const db = await getDB();
    const now = Date.now();

    // Get current order
    const entries = await db.getAllFromIndex('memberOrders', 'by-assembly', assemblyName);
    const activeEntries = entries.filter(e => e.isActive);

    const snapshotId = `snapshot-${now}-${Math.random().toString(36).substr(2, 9)}`;

    const snapshot: OrderSnapshot = {
        id: snapshotId,
        assemblyName,
        historyEntryId,
        timestamp: now,
        memberCount: activeEntries.length,
        entries: activeEntries.map(e => ({
            memberId: e.memberId,
            displayName: e.displayName,
            titheBookIndex: e.titheBookIndex,
        })),
    };

    await db.put('orderSnapshots', snapshot);

    // Cleanup old snapshots (keep only last 5)
    await cleanupOldSnapshots(assemblyName, 5);

    console.log(`Created snapshot ${snapshotId} for ${assemblyName} with ${activeEntries.length} members`);

    return snapshotId;
};

/**
 * Get recent snapshots for an assembly
 */
export const getSnapshots = async (
    assemblyName: string,
    limit = 10
): Promise<OrderSnapshot[]> => {
    const db = await getDB();
    const snapshots = await db.getAllFromIndex('orderSnapshots', 'by-assembly', assemblyName);

    // Sort by timestamp descending (newest first)
    snapshots.sort((a, b) => b.timestamp - a.timestamp);

    return snapshots.slice(0, limit);
};

/**
 * Get snapshot linked to a specific history entry
 */
export const getSnapshotForHistory = async (
    historyEntryId: string
): Promise<OrderSnapshot | null> => {
    const db = await getDB();
    const snapshot = await db.getFromIndex('orderSnapshots', 'by-history', historyEntryId);
    return snapshot || null;
};

/**
 * Restore order from a snapshot
 */
export const restoreSnapshot = async (
    snapshotId: string
): Promise<{ success: boolean; restoredCount: number; error?: string }> => {
    const db = await getDB();

    const snapshot = await db.get('orderSnapshots', snapshotId);
    if (!snapshot) {
        return { success: false, restoredCount: 0, error: 'Snapshot not found' };
    }

    const now = Date.now();
    const tx = db.transaction('memberOrders', 'readwrite');
    const store = tx.objectStore('memberOrders');

    let restoredCount = 0;

    // Apply snapshot order to current entries
    for (const snapshotEntry of snapshot.entries) {
        const id = generateId(snapshotEntry.memberId, snapshot.assemblyName);
        const existing = await store.get(id);

        if (existing) {
            existing.titheBookIndex = snapshotEntry.titheBookIndex;
            existing.lastUpdated = now;
            await store.put(existing);
            restoredCount++;
        }
    }

    await tx.done;

    // Log the restore action
    await logOrderChange({
        assemblyName: snapshot.assemblyName,
        action: 'reset',
        timestamp: now,
        description: `Restored order from snapshot (${new Date(snapshot.timestamp).toLocaleDateString()})`,
        affectedCount: restoredCount,
    });

    // Run integrity check after restore
    await validateAndRepairOrder(snapshot.assemblyName, true);

    console.log(`Restored snapshot ${snapshotId}: ${restoredCount} members updated`);

    return { success: true, restoredCount };
};

/**
 * Cleanup old snapshots, keeping only the most recent ones
 */
export const cleanupOldSnapshots = async (
    assemblyName: string,
    keep = 5
): Promise<number> => {
    const db = await getDB();
    const snapshots = await db.getAllFromIndex('orderSnapshots', 'by-assembly', assemblyName);

    // Sort by timestamp descending
    snapshots.sort((a, b) => b.timestamp - a.timestamp);

    // Delete all beyond the keep limit
    const toDelete = snapshots.slice(keep);
    let deletedCount = 0;

    for (const snapshot of toDelete) {
        await db.delete('orderSnapshots', snapshot.id);
        deletedCount++;
    }

    if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old snapshots for ${assemblyName}`);
    }

    return deletedCount;
};

// ============================================================================
// LEARNED ALIASES (NAME LEARNING)
// ============================================================================

/**
 * Generate ID for a learned alias
 */
const generateAliasId = (extractedName: string, assemblyName: string): string => {
    const normalized = extractedName.toLowerCase().trim().replace(/\s+/g, '-');
    return `alias-${assemblyName.toLowerCase()}-${normalized}`;
};

/**
 * Save a learned alias when user manually resolves a name
 */
export const saveLearnedAlias = async (
    assemblyName: string,
    extractedName: string,
    member: MemberRecordA
): Promise<void> => {
    // Guard: don't save empty aliases
    if (!extractedName || !extractedName.trim()) {
        console.warn('saveLearnedAlias: extractedName is empty, skipping');
        return;
    }

    const db = await getDB();
    const now = Date.now();

    const memberId = member["Membership Number"] || member["Old Membership Number"] || "";
    const displayName = [
        member.Title,
        member["First Name"],
        member.Surname,
        member["Other Names"]
    ].filter(Boolean).join(' ');

    const id = generateAliasId(extractedName, assemblyName);

    // Check if alias already exists
    const existing = await db.get('learnedAliases', id);

    const alias: LearnedAlias = {
        id,
        assemblyName,
        extractedName: extractedName.toLowerCase().trim(),
        memberId: memberId.toLowerCase(),
        memberDisplayName: displayName || memberId,
        createdAt: existing?.createdAt || now,
        usageCount: existing ? existing.usageCount + 1 : 1,  // First use = 1, not 0
        lastUsed: now,
    };

    await db.put('learnedAliases', alias);
    console.log(`Saved alias: "${extractedName}" → "${displayName}" for ${assemblyName}`);
};

/**
 * Get all learned aliases for an assembly
 */
export const getLearnedAliases = async (
    assemblyName: string
): Promise<LearnedAlias[]> => {
    const db = await getDB();
    return db.getAllFromIndex('learnedAliases', 'by-assembly', assemblyName);
};

/**
 * Find a learned alias match for an extracted name
 */
export const findAliasMatch = async (
    assemblyName: string,
    extractedName: string
): Promise<LearnedAlias | null> => {
    const db = await getDB();
    const normalized = extractedName.toLowerCase().trim();

    // Try exact match first
    const id = generateAliasId(extractedName, assemblyName);
    const exact = await db.get('learnedAliases', id);
    if (exact) return exact;

    // Fallback: get all and do manual check (for slightly different normalization)
    const all = await db.getAllFromIndex('learnedAliases', 'by-assembly', assemblyName);
    return all.find(a => a.extractedName === normalized) || null;
};

/**
 * Increment usage count when an alias is auto-applied
 */
export const incrementAliasUsage = async (aliasId: string): Promise<void> => {
    const db = await getDB();
    const alias = await db.get('learnedAliases', aliasId);
    if (alias) {
        alias.usageCount++;
        alias.lastUsed = Date.now();
        await db.put('learnedAliases', alias);
    }
};

/**
 * Delete a learned alias
 */
export const deleteLearnedAlias = async (aliasId: string): Promise<void> => {
    const db = await getDB();
    await db.delete('learnedAliases', aliasId);
};

/**
 * Get aliases as a Map for quick lookup (used in AI matching)
 */
export const getAliasMap = async (
    assemblyName: string
): Promise<Map<string, string>> => {
    const aliases = await getLearnedAliases(assemblyName);
    const map = new Map<string, string>();
    for (const alias of aliases) {
        map.set(alias.extractedName, alias.memberId);
    }
    return map;
};
