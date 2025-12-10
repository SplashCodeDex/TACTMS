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
    areSurnameVariants,
    preprocessName,
    isInitial,
    matchInitialToName,
    getInitialMatchBoost
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

    it('normalizes new user-provided surnames', () => {
        expect(normalizeSurname('ARHINN')).toBe('arhin');
        expect(normalizeSurname('ODOOM')).toBe('odum');
        expect(normalizeSurname('COMEY')).toBe('commey');
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

    it('recognizes user-provided variants', () => {
        expect(areSurnameVariants('ARHIN', 'ARHINN')).toBe(true);
        expect(areSurnameVariants('ODUM', 'ODOOM')).toBe(true);
    });

    it('rejects non-variants', () => {
        expect(areSurnameVariants('MENSAH', 'WILSON')).toBe(false);
    });
});

// ============================================================================
// TESTS: preprocessName
// ============================================================================

describe('preprocessName', () => {
    it('removes possessives', () => {
        expect(preprocessName("NANA'S ARYEETEY WILSON")).toBe('NANA ARYEETEY WILSON');
        expect(preprocessName("MAMA'S AKUA")).toBe('MAMA AKUA');
    });

    it('handles curly quotes', () => {
        expect(preprocessName("NANA'S MENSAH")).toBe('NANA MENSAH');
    });

    it('normalizes whitespace', () => {
        expect(preprocessName('JOHN   MENSAH')).toBe('JOHN MENSAH');
    });

    it('handles empty string', () => {
        expect(preprocessName('')).toBe('');
    });
});

// ============================================================================
// TESTS: isInitial
// ============================================================================

describe('isInitial', () => {
    it('recognizes single letters', () => {
        expect(isInitial('A')).toBe(true);
        expect(isInitial('A.')).toBe(true);
        expect(isInitial('K')).toBe(true);
    });

    it('rejects multi-letter tokens', () => {
        expect(isInitial('AB')).toBe(false);
        expect(isInitial('MENSAH')).toBe(false);
    });
});

// ============================================================================
// TESTS: matchInitialToName
// ============================================================================

describe('matchInitialToName', () => {
    it('matches initial to name', () => {
        expect(matchInitialToName('A', 'ABENA')).toBe(true);
        expect(matchInitialToName('A.', 'ARHIN')).toBe(true);
    });

    it('rejects non-matching initials', () => {
        expect(matchInitialToName('A', 'MENSAH')).toBe(false);
        expect(matchInitialToName('K', 'JOHN')).toBe(false);
    });
});

// ============================================================================
// TESTS: getInitialMatchBoost
// ============================================================================

describe('getInitialMatchBoost', () => {
    it('returns boost for matching initials', () => {
        const boost = getInitialMatchBoost('A. MENSAH', 'ABENA MENSAH');
        expect(boost).toBeGreaterThan(0);
    });

    it('returns 0 for non-matching initials', () => {
        const boost = getInitialMatchBoost('K. MENSAH', 'ABENA MENSAH');
        expect(boost).toBe(0);
    });

    it('returns 0 for names without initials', () => {
        const boost = getInitialMatchBoost('JOHN MENSAH', 'ABENA MENSAH');
        expect(boost).toBe(0);
    });
});
