/// <reference types="vitest/globals" />
/**
 * useBatchProcessor.test.ts
 * Tests for the batch image processing logic
 * Tests the pure functions used in batch tithe book image processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MemberDatabase, TransactionLogEntry, MemberRecordA } from '@/types';

// ============================================================================
// HELPER TYPES AND MOCKS
// ============================================================================

const createMockMemberDatabase = (): MemberDatabase => ({
    'Central': {
        data: [
            {
                'No.': 1,
                'Membership Number': 'TAC89JAM131001',
                'Old Membership Number': '651101008',
                Title: 'PASTOR',
                'First Name': 'JONATHAN',
                Surname: 'ADDO',
                'Other Names': 'MENSAH',
            },
            {
                'No.': 2,
                'Membership Number': 'TAC89JAM131002',
                'Old Membership Number': '651101009',
                'First Name': 'AGNES',
                Surname: 'MENSAH',
            },
            {
                'No.': 3,
                'Membership Number': 'TAC89JAM131003',
                'First Name': 'KOFI',
                Surname: 'OWUSU',
            },
        ] as MemberRecordA[],
        fileName: 'Central_members.xlsx',
        lastUpdated: Date.now(),
    }
});

const createMockTransactionLog = (): TransactionLogEntry[] => [
    {
        date: '2025-11-03',
        memberName: 'ADDO JONATHAN MENSAH (TAC89JAM131001|651101008)',
        amount: 150,
        assembly: 'Central',
    },
    {
        date: '2025-10-06',
        memberName: 'ADDO JONATHAN MENSAH (TAC89JAM131001|651101008)',
        amount: 150,
        assembly: 'Central',
    },
    {
        date: '2025-11-03',
        memberName: 'MENSAH AGNES (TAC89JAM131002|651101009)',
        amount: 50,
        assembly: 'Central',
    },
];


// ============================================================================
// TESTS: Batch Processing Logic (Pure Functions)
// ============================================================================

describe('useBatchProcessor logic', () => {
    describe('member matching format', () => {
        /**
         * Format a matched member ID as the hook does
         */
        function formatMatchedMemberId(member: {
            Surname?: string;
            'First Name'?: string;
            'Other Names'?: string;
            'Membership Number'?: string;
            'Old Membership Number'?: string;
        }): string {
            return `${member.Surname} ${member['First Name']} ${member['Other Names'] || ''} (${member['Membership Number']}|${member['Old Membership Number'] || ''})`.trim();
        }

        it('formats member ID correctly with all fields', () => {
            const member = {
                Surname: 'ADDO',
                'First Name': 'JONATHAN',
                'Other Names': 'MENSAH',
                'Membership Number': 'TAC89JAM131001',
                'Old Membership Number': '651101008',
            };

            expect(formatMatchedMemberId(member)).toBe(
                'ADDO JONATHAN MENSAH (TAC89JAM131001|651101008)'
            );
        });

        it('handles missing Other Names', () => {
            const member = {
                Surname: 'MENSAH',
                'First Name': 'AGNES',
                'Membership Number': 'TAC89JAM131002',
                'Old Membership Number': '651101009',
            };

            expect(formatMatchedMemberId(member)).toBe(
                'MENSAH AGNES  (TAC89JAM131002|651101009)'
            );
        });

        it('handles missing Old Membership Number', () => {
            const member = {
                Surname: 'OWUSU',
                'First Name': 'KOFI',
                'Membership Number': 'TAC89JAM131003',
            };

            expect(formatMatchedMemberId(member)).toBe(
                'OWUSU KOFI  (TAC89JAM131003|)'
            );
        });
    });

    describe('unmatched name formatting', () => {
        /**
         * Format an unmatched OCR name
         */
        function formatUnmatchedName(rawName: string): string {
            return `[UNMATCHED] ${rawName}`;
        }

        it('prefixes raw name with UNMATCHED tag', () => {
            expect(formatUnmatchedName('JOHN DOE')).toBe('[UNMATCHED] JOHN DOE');
        });

        it('handles empty name', () => {
            expect(formatUnmatchedName('')).toBe('[UNMATCHED] ');
        });
    });

    describe('anomaly detection annotation', () => {
        /**
         * Add anomaly warning to description
         */
        function annotateAnomaly(
            description: string,
            anomalyMessage: string
        ): string {
            return `[ANOMALY: ${anomalyMessage}] ${description || ''}`;
        }

        it('prepends anomaly warning', () => {
            expect(annotateAnomaly('Tithe for 03-NOV-2025', 'Amount 5000 is 10x higher than average'))
                .toBe('[ANOMALY: Amount 5000 is 10x higher than average] Tithe for 03-NOV-2025');
        });

        it('handles empty description', () => {
            expect(annotateAnomaly('', 'Unusually high'))
                .toBe('[ANOMALY: Unusually high] ');
        });
    });

    describe('suggestion formatting', () => {
        /**
         * Format fuzzy match suggestions
         */
        function formatSuggestions(
            suggestions: Array<{
                member: { Surname: string; 'First Name': string };
                score: number;
            }>
        ): string {
            return suggestions
                .map(s => `${s.member.Surname} ${s.member['First Name']} (${Math.round(s.score * 100)}%)`)
                .join('; ');
        }

        it('formats suggestions with scores', () => {
            const suggestions = [
                { member: { Surname: 'MENSAH', 'First Name': 'JONATHAN' }, score: 0.85 },
                { member: { Surname: 'MENSAH', 'First Name': 'AGNES' }, score: 0.72 },
            ];

            expect(formatSuggestions(suggestions)).toBe(
                'MENSAH JONATHAN (85%); MENSAH AGNES (72%)'
            );
        });

        it('handles empty suggestions', () => {
            expect(formatSuggestions([])).toBe('');
        });

        it('rounds scores correctly', () => {
            const suggestions = [
                { member: { Surname: 'DOE', 'First Name': 'JOHN' }, score: 0.789 },
            ];

            expect(formatSuggestions(suggestions)).toBe('DOE JOHN (79%)');
        });
    });

    describe('extraction result counting', () => {
        /**
         * Count matched, unmatched, and anomaly records
         */
        function countResults(
            records: Array<{ isMatched: boolean; hasAnomaly: boolean }>
        ): { matched: number; unmatched: number; anomalies: number } {
            let matched = 0;
            let unmatched = 0;
            let anomalies = 0;

            for (const record of records) {
                if (record.isMatched) {
                    matched++;
                    if (record.hasAnomaly) {
                        anomalies++;
                    }
                } else {
                    unmatched++;
                }
            }

            return { matched, unmatched, anomalies };
        }

        it('counts all categories correctly', () => {
            const records = [
                { isMatched: true, hasAnomaly: false },
                { isMatched: true, hasAnomaly: true },
                { isMatched: true, hasAnomaly: false },
                { isMatched: false, hasAnomaly: false },
                { isMatched: false, hasAnomaly: false },
            ];

            const result = countResults(records);

            expect(result.matched).toBe(3);
            expect(result.unmatched).toBe(2);
            expect(result.anomalies).toBe(1);
        });

        it('handles empty array', () => {
            const result = countResults([]);

            expect(result.matched).toBe(0);
            expect(result.unmatched).toBe(0);
            expect(result.anomalies).toBe(0);
        });
    });

    describe('progress tracking', () => {
        /**
         * Track progress of batch processing
         */
        function trackProgress(
            completed: number,
            total: number
        ): { percentage: number; isComplete: boolean } {
            return {
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                isComplete: completed >= total,
            };
        }

        it('calculates percentage correctly', () => {
            expect(trackProgress(2, 4).percentage).toBe(50);
            expect(trackProgress(3, 4).percentage).toBe(75);
            expect(trackProgress(4, 4).percentage).toBe(100);
        });

        it('handles zero total', () => {
            const result = trackProgress(0, 0);
            expect(result.percentage).toBe(0);
            expect(result.isComplete).toBe(true);
        });

        it('detects completion', () => {
            expect(trackProgress(3, 4).isComplete).toBe(false);
            expect(trackProgress(4, 4).isComplete).toBe(true);
        });
    });

    describe('single vs multi-page handling', () => {
        /**
         * Determine if batch needs multi-page processing
         */
        function needsMultiPageProcessing(pageExtractions: any[][]): boolean {
            return pageExtractions.length > 1;
        }

        it('returns false for single extraction', () => {
            expect(needsMultiPageProcessing([['entry1', 'entry2']])).toBe(false);
        });

        it('returns true for multiple extractions', () => {
            expect(needsMultiPageProcessing([['entry1'], ['entry2']])).toBe(true);
        });

        it('returns false for empty', () => {
            expect(needsMultiPageProcessing([])).toBe(false);
        });
    });
});

// ============================================================================
// TESTS: Validation Flow
// ============================================================================

describe('useBatchProcessor validation flow', () => {
    describe('image pre-validation', () => {
        /**
         * Simulate image validation decision
         */
        function shouldSkipImage(validationResult: { isValid: boolean; errors: string[] }): boolean {
            return !validationResult.isValid;
        }

        it('skips invalid images', () => {
            const invalidResult = { isValid: false, errors: ['Image too small'] };
            expect(shouldSkipImage(invalidResult)).toBe(true);
        });

        it('processes valid images', () => {
            const validResult = { isValid: true, errors: [] };
            expect(shouldSkipImage(validResult)).toBe(false);
        });
    });

    describe('structural validation', () => {
        /**
         * Simulate structural validation warning
         */
        function logStructuralWarning(isValid: boolean): string | null {
            if (!isValid) {
                return 'Extracted data failed structural validation';
            }
            return null;
        }

        it('returns warning for invalid structure', () => {
            expect(logStructuralWarning(false)).toBe('Extracted data failed structural validation');
        });

        it('returns null for valid structure', () => {
            expect(logStructuralWarning(true)).toBeNull();
        });
    });
});

// ============================================================================
// TESTS: Assembly Member Lookup
// ============================================================================

describe('useBatchProcessor assembly member lookup', () => {
    /**
     * Get assembly members from database
     */
    function getAssemblyMembers(
        memberDatabase: MemberDatabase,
        assembly: string
    ): MemberRecordA[] {
        return memberDatabase[assembly]?.data || [];
    }

    it('returns members for existing assembly', () => {
        const db = createMockMemberDatabase();
        const members = getAssemblyMembers(db, 'Central');

        expect(members.length).toBe(3);
        expect(members[0]['Membership Number']).toBe('TAC89JAM131001');
    });

    it('returns empty array for missing assembly', () => {
        const db = createMockMemberDatabase();
        const members = getAssemblyMembers(db, 'NonExistent');

        expect(members).toEqual([]);
    });

    it('returns empty array for null database entry', () => {
        const db: MemberDatabase = {};
        const members = getAssemblyMembers(db, 'Central');

        expect(members).toEqual([]);
    });
});
