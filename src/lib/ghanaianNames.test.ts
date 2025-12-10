/// <reference types="vitest/globals" />
/**
 * ghanaianNames.test.ts
 * Tests for Ghanaian name utilities
 */

import { describe, it, expect } from 'vitest';
import {
    stripTitles,
    areDayNameVariants,
    ghanaianPhonetic,
    arePhoneticallySimilar,
    tokenizeGhanaianName,
    ghanaianTokenSimilarity,
    normalizeSurname,
    areSurnameVariants
} from './ghanaianNames';

// ============================================================================
// TESTS: stripTitles
// ============================================================================

describe('stripTitles', () => {
    it('removes church titles', () => {
        expect(stripTitles('PASTOR JOHN MENSAH')).toBe('john mensah');
        expect(stripTitles('ELDER KOFI ASANTE')).toBe('kofi asante');
        expect(stripTitles('DEACONESS MARY ADDO')).toBe('mary addo');
    });

    it('removes traditional titles', () => {
        expect(stripTitles('NII ARYEETEY WILSON')).toBe('aryeetey wilson');
        expect(stripTitles('NANA AKUA MENSAH')).toBe('akua mensah');
        expect(stripTitles('MAAME ABENA')).toBe('abena');
    });

    it('handles names without titles', () => {
        expect(stripTitles('JOHN MENSAH')).toBe('john mensah');
    });

    it('handles empty string', () => {
        expect(stripTitles('')).toBe('');
    });
});

// ============================================================================
// TESTS: areDayNameVariants
// ============================================================================

describe('areDayNameVariants', () => {
    it('recognizes Friday variants', () => {
        expect(areDayNameVariants('kofi', 'fiifi')).toBe(true);
        expect(areDayNameVariants('KOFI', 'Fiifi')).toBe(true);
    });

    it('recognizes Saturday variants', () => {
        expect(areDayNameVariants('kwame', 'kwami')).toBe(true);
        expect(areDayNameVariants('kwame', 'kwamena')).toBe(true);
    });

    it('recognizes Sunday variants', () => {
        expect(areDayNameVariants('kwasi', 'akwasi')).toBe(true);
        expect(areDayNameVariants('akosua', 'esi')).toBe(true);
    });

    it('rejects different day names', () => {
        expect(areDayNameVariants('kofi', 'kwame')).toBe(false);
        expect(areDayNameVariants('yaw', 'kwesi')).toBe(false);
    });

    it('rejects non-day names', () => {
        expect(areDayNameVariants('john', 'mensah')).toBe(false);
    });
});

// ============================================================================
// TESTS: ghanaianPhonetic
// ============================================================================

describe('ghanaianPhonetic', () => {
    it('handles empty string', () => {
        expect(ghanaianPhonetic('')).toBe('');
    });

    it('encodes simple names', () => {
        const code1 = ghanaianPhonetic('MENSAH');
        const code2 = ghanaianPhonetic('MENSA');
        // Should be similar or identical
        expect(code1.slice(0, 4)).toBe(code2.slice(0, 4));
    });

    it('normalizes double vowels', () => {
        const code1 = ghanaianPhonetic('ARYEETEY');
        const code2 = ghanaianPhonetic('ARYETEY');
        expect(code1).toBe(code2);
    });

    it('handles common variations', () => {
        const code1 = ghanaianPhonetic('TETTEH');
        const code2 = ghanaianPhonetic('TETEH');
        expect(code1.slice(0, 4)).toBe(code2.slice(0, 4));
    });
});

// ============================================================================
// TESTS: arePhoneticallySimilar
// ============================================================================

describe('arePhoneticallySimilar', () => {
    it('matches similar sounding names', () => {
        expect(arePhoneticallySimilar('MENSAH', 'MENSA')).toBe(true);
        expect(arePhoneticallySimilar('TETTEH', 'TETEH')).toBe(true);
    });

    it('rejects dissimilar names', () => {
        expect(arePhoneticallySimilar('MENSAH', 'WILSON')).toBe(false);
    });
});

// ============================================================================
// TESTS: tokenizeGhanaianName
// ============================================================================

describe('tokenizeGhanaianName', () => {
    it('splits compound names', () => {
        expect(tokenizeGhanaianName('ARYEETEY WILSON')).toEqual(['aryeetey', 'wilson']);
    });

    it('strips titles before tokenizing', () => {
        expect(tokenizeGhanaianName('NII ARYEETEY WILSON')).toEqual(['aryeetey', 'wilson']);
    });

    it('handles initials', () => {
        expect(tokenizeGhanaianName('A. MENSAH')).toEqual(['a', 'mensah']);
    });
});

// ============================================================================
// TESTS: ghanaianTokenSimilarity
// ============================================================================

describe('ghanaianTokenSimilarity', () => {
    it('returns 1 for identical names', () => {
        expect(ghanaianTokenSimilarity('JOHN MENSAH', 'JOHN MENSAH')).toBeCloseTo(1);
    });

    it('handles day name variants', () => {
        // Kofi and Fiifi are both Friday names
        const score = ghanaianTokenSimilarity('KOFI MENSAH', 'FIIFI MENSAH');
        expect(score).toBeGreaterThan(0.8);
    });

    it('handles phonetic matches', () => {
        const score = ghanaianTokenSimilarity('TETTEH WILSON', 'TETEH WILSON');
        expect(score).toBeGreaterThan(0.8);
    });

    it('handles prefix matches', () => {
        const score = ghanaianTokenSimilarity('ARYEETEY', 'ARYEE');
        expect(score).toBeGreaterThan(0.5);
    });
});

// ============================================================================
// TESTS: normalizeSurname & areSurnameVariants
// ============================================================================

describe('normalizeSurname', () => {
    it('normalizes known variants', () => {
        expect(normalizeSurname('MENSA')).toBe('mensah');
        expect(normalizeSurname('MENSAA')).toBe('mensah');
        expect(normalizeSurname('MENSAH')).toBe('mensah');
    });

    it('returns lowercase for unknown surnames', () => {
        expect(normalizeSurname('UNKNOWN')).toBe('unknown');
    });
});

describe('areSurnameVariants', () => {
    it('recognizes variants', () => {
        expect(areSurnameVariants('MENSAH', 'MENSA')).toBe(true);
        expect(areSurnameVariants('TETTEH', 'TETEH')).toBe(true);
        expect(areSurnameVariants('LAMPTEY', 'LAMTEY')).toBe(true);
    });

    it('rejects non-variants', () => {
        expect(areSurnameVariants('MENSAH', 'WILSON')).toBe(false);
    });
});
