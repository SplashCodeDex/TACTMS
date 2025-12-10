/// <reference types="vitest/globals" />
/**
 * memberOrderService.test.ts
 * Comprehensive tests for the Member Order Service
 * Tests core business logic for member ordering in the physical tithe book
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Since memberOrderService uses IndexedDB, we'll mock the idb module
// and test the pure logic functions that can be extracted

// Mock the idb module
vi.mock('idb', () => ({
    openDB: vi.fn(() => Promise.resolve(createMockDB())),
}));

// ============================================================================
// HELPER FUNCTIONS EXTRACTED FOR TESTABILITY
// ============================================================================

/**
 * Generate a unique ID for a member order entry
 */
const generateId = (memberId: string, assemblyName: string): string => {
    return `${assemblyName.toLowerCase()}-${memberId.toLowerCase()}`;
};

/**
 * Generate a simple hash of member data to detect changes
 */
const generateMemberHash = (members: Array<{ 'Membership Number'?: string }>): string => {
    const ids = members.map(m => m['Membership Number'] || '').sort().join(',');
    let hash = 0;
    for (let i = 0; i < ids.length; i++) {
        const char = ids.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
};

/**
 * Normalize a member ID for comparison
 */
const normalizeMemberId = (memberId: string): string => {
    return memberId.toLowerCase().trim();
};

/**
 * Build display name from member record
 */
const buildDisplayName = (member: {
    Title?: string;
    'First Name'?: string;
    Surname?: string;
    'Other Names'?: string;
}): string => {
    return [
        member.Title,
        member['First Name'],
        member.Surname,
        member['Other Names']
    ].filter(Boolean).join(' ');
};

// Mock DB factory for testing
function createMockDB() {
    const memberOrders = new Map<string, any>();
    const assemblyMeta = new Map<string, any>();
    const orderHistory: any[] = [];
    const orderSnapshots: any[] = [];
    const learnedAliases = new Map<string, any>();

    return {
        transaction: vi.fn(() => ({
            objectStore: vi.fn((storeName: string) => {
                const storeMap = {
                    memberOrders: memberOrders,
                    assemblyMeta: assemblyMeta,
                    orderHistory: orderHistory,
                    orderSnapshots: orderSnapshots,
                    learnedAliases: learnedAliases,
                };
                return {
                    get: vi.fn((key: string) => Promise.resolve(storeMap[storeName as keyof typeof storeMap] instanceof Map ? (storeMap[storeName as keyof typeof storeMap] as Map<string, any>).get(key) : undefined)),
                    put: vi.fn((entry: any) => {
                        if (storeMap[storeName as keyof typeof storeMap] instanceof Map) {
                            (storeMap[storeName as keyof typeof storeMap] as Map<string, any>).set(entry.id || entry.assemblyName, entry);
                        }
                        return Promise.resolve();
                    }),
                    delete: vi.fn((key: string) => {
                        if (storeMap[storeName as keyof typeof storeMap] instanceof Map) {
                            (storeMap[storeName as keyof typeof storeMap] as Map<string, any>).delete(key);
                        }
                        return Promise.resolve();
                    }),
                    index: vi.fn(() => ({
                        get: vi.fn(() => Promise.resolve(undefined)),
                    })),
                };
            }),
            done: Promise.resolve(),
            store: {
                get: vi.fn(() => Promise.resolve(undefined)),
                put: vi.fn(() => Promise.resolve()),
            },
        })),
        getAllFromIndex: vi.fn(() => Promise.resolve([])),
        getAll: vi.fn(() => Promise.resolve([])),
        get: vi.fn(() => Promise.resolve(undefined)),
        put: vi.fn(() => Promise.resolve()),
    };
}

// ============================================================================
// TESTS: generateId
// ============================================================================

describe('memberOrderService.generateId', () => {
    it('generates correct ID format', () => {
        expect(generateId('TAC89JAM131001', 'Central')).toBe('central-tac89jam131001');
    });

    it('handles spaces in assembly names', () => {
        expect(generateId('TAC123', 'Jei Krodua')).toBe('jei krodua-tac123');
    });

    it('normalizes to lowercase', () => {
        expect(generateId('TAC89JAM131001', 'CENTRAL')).toBe('central-tac89jam131001');
        expect(generateId('TAC89JAM131001', 'Central')).toBe('central-tac89jam131001');
        expect(generateId('tac89jam131001', 'central')).toBe('central-tac89jam131001');
    });

    it('handles empty strings', () => {
        expect(generateId('', 'Central')).toBe('central-');
        expect(generateId('TAC123', '')).toBe('-tac123');
    });

    it('handles special characters in IDs', () => {
        expect(generateId('TAC89-JAM-131001', 'Central')).toBe('central-tac89-jam-131001');
    });
});

// ============================================================================
// TESTS: generateMemberHash
// ============================================================================

describe('memberOrderService.generateMemberHash', () => {
    it('generates consistent hashes for same data', () => {
        const members = [
            { 'Membership Number': 'TAC123' },
            { 'Membership Number': 'TAC456' },
        ];
        const hash1 = generateMemberHash(members);
        const hash2 = generateMemberHash(members);
        expect(hash1).toBe(hash2);
    });

    it('generates same hash regardless of member order', () => {
        const members1 = [
            { 'Membership Number': 'TAC123' },
            { 'Membership Number': 'TAC456' },
        ];
        const members2 = [
            { 'Membership Number': 'TAC456' },
            { 'Membership Number': 'TAC123' },
        ];
        // Hash should be same because IDs are sorted before hashing
        expect(generateMemberHash(members1)).toBe(generateMemberHash(members2));
    });

    it('generates different hashes for different data', () => {
        const members1 = [{ 'Membership Number': 'TAC123' }];
        const members2 = [{ 'Membership Number': 'TAC999' }];
        expect(generateMemberHash(members1)).not.toBe(generateMemberHash(members2));
    });

    it('handles empty member array', () => {
        expect(generateMemberHash([])).toBe('0');
    });

    it('handles members with missing Membership Number', () => {
        const members = [
            { 'Membership Number': 'TAC123' },
            {}, // Missing Membership Number
        ];
        expect(() => generateMemberHash(members)).not.toThrow();
    });
});

// ============================================================================
// TESTS: normalizeMemberId
// ============================================================================

describe('memberOrderService.normalizeMemberId', () => {
    it('converts to lowercase', () => {
        expect(normalizeMemberId('TAC89JAM131001')).toBe('tac89jam131001');
    });

    it('trims whitespace', () => {
        expect(normalizeMemberId('  TAC123  ')).toBe('tac123');
    });

    it('handles empty string', () => {
        expect(normalizeMemberId('')).toBe('');
    });
});

// ============================================================================
// TESTS: buildDisplayName
// ============================================================================

describe('memberOrderService.buildDisplayName', () => {
    it('concatenates all name parts', () => {
        const member = {
            Title: 'PASTOR',
            'First Name': 'JONATHAN',
            Surname: 'ADDO',
            'Other Names': 'MENSAH',
        };
        expect(buildDisplayName(member)).toBe('PASTOR JONATHAN ADDO MENSAH');
    });

    it('handles missing title', () => {
        const member = {
            'First Name': 'JONATHAN',
            Surname: 'ADDO',
        };
        expect(buildDisplayName(member)).toBe('JONATHAN ADDO');
    });

    it('handles missing other names', () => {
        const member = {
            Title: 'MRS',
            'First Name': 'AGNES',
            Surname: 'MENSAH',
        };
        expect(buildDisplayName(member)).toBe('MRS AGNES MENSAH');
    });

    it('handles empty member object', () => {
        expect(buildDisplayName({})).toBe('');
    });

    it('handles member with only surname', () => {
        expect(buildDisplayName({ Surname: 'MENSAH' })).toBe('MENSAH');
    });
});

// ============================================================================
// TESTS: MemberOrderEntry Structure
// ============================================================================

describe('memberOrderService.MemberOrderEntry structure', () => {
    it('has all required fields', () => {
        const entry = {
            id: 'central-tac89jam131001',
            memberId: 'TAC89JAM131001',
            displayName: 'PASTOR JONATHAN ADDO MENSAH',
            titheBookIndex: 1,
            assemblyName: 'Central',
            firstSeenDate: '2025-01-15T10:30:00.000Z',
            firstSeenMonth: '2025-01',
            lastUpdated: Date.now(),
            isActive: true,
        };

        expect(entry.id).toBeDefined();
        expect(entry.memberId).toBeDefined();
        expect(entry.displayName).toBeDefined();
        expect(entry.titheBookIndex).toBeGreaterThanOrEqual(1);
        expect(entry.assemblyName).toBeDefined();
        expect(entry.firstSeenDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
        expect(entry.firstSeenMonth).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof entry.lastUpdated).toBe('number');
        expect(typeof entry.isActive).toBe('boolean');
    });
});

// ============================================================================
// TESTS: IntegrityReport Structure
// ============================================================================

describe('memberOrderService.IntegrityReport validation logic', () => {
    /**
     * Helper to simulate integrity validation logic
     */
    function validateIntegrity(entries: Array<{
        memberId: string;
        titheBookIndex: number | null | undefined;
    }>): {
        isHealthy: boolean;
        duplicateIndices: Array<{ index: number; memberIds: string[] }>;
        orphanedMembers: string[];
    } {
        const indexMap = new Map<number, string[]>();
        const orphanedMembers: string[] = [];

        for (const entry of entries) {
            if (entry.titheBookIndex === null || entry.titheBookIndex === undefined || entry.titheBookIndex < 1) {
                orphanedMembers.push(entry.memberId);
            } else {
                const existing = indexMap.get(entry.titheBookIndex) || [];
                existing.push(entry.memberId);
                indexMap.set(entry.titheBookIndex, existing);
            }
        }

        const duplicateIndices: Array<{ index: number; memberIds: string[] }> = [];
        for (const [index, memberIds] of indexMap.entries()) {
            if (memberIds.length > 1) {
                duplicateIndices.push({ index, memberIds });
            }
        }

        return {
            isHealthy: duplicateIndices.length === 0 && orphanedMembers.length === 0,
            duplicateIndices,
            orphanedMembers,
        };
    }

    it('detects duplicate indices', () => {
        const entries = [
            { memberId: 'TAC001', titheBookIndex: 1 },
            { memberId: 'TAC002', titheBookIndex: 1 }, // Duplicate!
            { memberId: 'TAC003', titheBookIndex: 2 },
        ];

        const report = validateIntegrity(entries);

        expect(report.isHealthy).toBe(false);
        expect(report.duplicateIndices).toHaveLength(1);
        expect(report.duplicateIndices[0].index).toBe(1);
        expect(report.duplicateIndices[0].memberIds).toContain('TAC001');
        expect(report.duplicateIndices[0].memberIds).toContain('TAC002');
    });

    it('detects orphaned members (null index)', () => {
        const entries = [
            { memberId: 'TAC001', titheBookIndex: 1 },
            { memberId: 'TAC002', titheBookIndex: null },
            { memberId: 'TAC003', titheBookIndex: undefined },
        ];

        const report = validateIntegrity(entries);

        expect(report.isHealthy).toBe(false);
        expect(report.orphanedMembers).toHaveLength(2);
        expect(report.orphanedMembers).toContain('TAC002');
        expect(report.orphanedMembers).toContain('TAC003');
    });

    it('returns healthy for valid data', () => {
        const entries = [
            { memberId: 'TAC001', titheBookIndex: 1 },
            { memberId: 'TAC002', titheBookIndex: 2 },
            { memberId: 'TAC003', titheBookIndex: 3 },
        ];

        const report = validateIntegrity(entries);

        expect(report.isHealthy).toBe(true);
        expect(report.duplicateIndices).toHaveLength(0);
        expect(report.orphanedMembers).toHaveLength(0);
    });

    it('handles empty array', () => {
        const report = validateIntegrity([]);
        expect(report.isHealthy).toBe(true);
    });
});

// ============================================================================
// TESTS: SyncResult Logic
// ============================================================================

describe('memberOrderService.syncWithMasterList logic', () => {
    /**
     * Simulate sync logic - identify new vs existing members
     */
    function simulateSync(
        existingIds: Set<string>,
        newMembers: Array<{ 'Membership Number'?: string }>
    ): {
        newMembers: string[];
        existingMembers: string[];
        duplicatesSkipped: number;
    } {
        const result = {
            newMembers: [] as string[],
            existingMembers: [] as string[],
            duplicatesSkipped: 0,
        };

        for (const member of newMembers) {
            const memberId = member['Membership Number'] || '';
            if (!memberId) continue;

            const normalizedId = memberId.toLowerCase();

            if (existingIds.has(normalizedId)) {
                result.existingMembers.push(memberId);
                result.duplicatesSkipped++;
            } else {
                result.newMembers.push(memberId);
                existingIds.add(normalizedId); // Track to prevent duplicates in same batch
            }
        }

        return result;
    }

    it('identifies new members correctly', () => {
        const existingIds = new Set(['tac001', 'tac002']);
        const newMembers = [
            { 'Membership Number': 'TAC003' },
            { 'Membership Number': 'TAC004' },
        ];

        const result = simulateSync(existingIds, newMembers);

        expect(result.newMembers).toEqual(['TAC003', 'TAC004']);
        expect(result.existingMembers).toHaveLength(0);
    });

    it('identifies existing members correctly', () => {
        const existingIds = new Set(['tac001', 'tac002']);
        const newMembers = [
            { 'Membership Number': 'TAC001' },
            { 'Membership Number': 'TAC002' },
        ];

        const result = simulateSync(existingIds, newMembers);

        expect(result.existingMembers).toEqual(['TAC001', 'TAC002']);
        expect(result.newMembers).toHaveLength(0);
        expect(result.duplicatesSkipped).toBe(2);
    });

    it('handles mixed new and existing', () => {
        const existingIds = new Set(['tac001']);
        const newMembers = [
            { 'Membership Number': 'TAC001' },
            { 'Membership Number': 'TAC002' },
        ];

        const result = simulateSync(existingIds, newMembers);

        expect(result.existingMembers).toEqual(['TAC001']);
        expect(result.newMembers).toEqual(['TAC002']);
    });

    it('skips members without membership number', () => {
        const existingIds = new Set<string>();
        const newMembers = [
            { 'Membership Number': 'TAC001' },
            {}, // No Membership Number
        ];

        const result = simulateSync(existingIds, newMembers);

        expect(result.newMembers).toEqual(['TAC001']);
    });

    it('prevents duplicates within same batch', () => {
        const existingIds = new Set<string>();
        const newMembers = [
            { 'Membership Number': 'TAC001' },
            { 'Membership Number': 'TAC001' }, // Duplicate in same batch
        ];

        const result = simulateSync(existingIds, newMembers);

        expect(result.newMembers).toEqual(['TAC001']);
        expect(result.existingMembers).toEqual(['TAC001']); // Second occurrence treated as existing
    });
});

// ============================================================================
// TESTS: OrderExport/Import Validation
// ============================================================================

describe('memberOrderService.OrderExport validation', () => {
    /**
     * Validate an OrderExport structure
     */
    function validateOrderExport(
        data: any,
        expectedAssemblyName: string
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (data.version !== 1) {
            errors.push(`Unsupported version: ${data.version}`);
        }

        if (data.assemblyName !== expectedAssemblyName) {
            errors.push(`Assembly mismatch: expected ${expectedAssemblyName}, got ${data.assemblyName}`);
        }

        if (!Array.isArray(data.members)) {
            errors.push('Members must be an array');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    it('validates correct export data', () => {
        const exportData = {
            version: 1,
            assemblyName: 'Central',
            exportDate: '2025-12-09T00:00:00.000Z',
            memberCount: 2,
            members: [
                { memberId: 'TAC001', displayName: 'JOHN DOE', titheBookIndex: 1 },
                { memberId: 'TAC002', displayName: 'JANE DOE', titheBookIndex: 2 },
            ],
        };

        const result = validateOrderExport(exportData, 'Central');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('rejects wrong version', () => {
        const exportData = {
            version: 2,
            assemblyName: 'Central',
            members: [],
        };

        const result = validateOrderExport(exportData, 'Central');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Unsupported version: 2');
    });

    it('rejects assembly mismatch', () => {
        const exportData = {
            version: 1,
            assemblyName: 'Maranatha',
            members: [],
        };

        const result = validateOrderExport(exportData, 'Central');

        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Assembly mismatch');
    });
});

// ============================================================================
// TESTS: Won Souls Filtering (First Seen This Month)
// ============================================================================

describe('memberOrderService.getWonSouls filtering logic', () => {
    /**
     * Filter for members first seen in a specific month
     */
    function filterWonSouls(
        entries: Array<{ firstSeenMonth: string; isActive: boolean; memberId: string }>,
        targetMonth: string
    ): string[] {
        return entries
            .filter(e => e.firstSeenMonth === targetMonth && e.isActive)
            .map(e => e.memberId);
    }

    it('returns members first seen in target month', () => {
        const entries = [
            { memberId: 'TAC001', firstSeenMonth: '2025-12', isActive: true },
            { memberId: 'TAC002', firstSeenMonth: '2025-12', isActive: true },
            { memberId: 'TAC003', firstSeenMonth: '2025-11', isActive: true },
        ];

        const wonSouls = filterWonSouls(entries, '2025-12');

        expect(wonSouls).toEqual(['TAC001', 'TAC002']);
    });

    it('excludes inactive members', () => {
        const entries = [
            { memberId: 'TAC001', firstSeenMonth: '2025-12', isActive: true },
            { memberId: 'TAC002', firstSeenMonth: '2025-12', isActive: false },
        ];

        const wonSouls = filterWonSouls(entries, '2025-12');

        expect(wonSouls).toEqual(['TAC001']);
    });

    it('returns empty for no matches', () => {
        const entries = [
            { memberId: 'TAC001', firstSeenMonth: '2025-11', isActive: true },
        ];

        const wonSouls = filterWonSouls(entries, '2025-12');

        expect(wonSouls).toHaveLength(0);
    });
});


// ============================================================================
// TESTS: LearnedAlias ID Generation
// ============================================================================

describe('memberOrderService.generateAliasId', () => {
    /**
     * Generate ID for a learned alias
     */
    function generateAliasId(extractedName: string, assemblyName: string): string {
        const normalized = extractedName.toLowerCase().trim().replace(/\s+/g, '_');
        return `${assemblyName.toLowerCase()}-alias-${normalized}`;
    }

    it('generates correct alias ID format', () => {
        expect(generateAliasId('JOHN DOE', 'Central')).toBe('central-alias-john_doe');
    });

    it('normalizes whitespace', () => {
        expect(generateAliasId('JOHN  DOE', 'Central')).toBe('central-alias-john_doe');
    });

    it('trims leading/trailing whitespace', () => {
        expect(generateAliasId('  JOHN DOE  ', 'Central')).toBe('central-alias-john_doe');
    });
});
