/**
 * Ghanaian Name Utilities
 *
 * Specialized utilities for matching Ghanaian names which have unique patterns:
 * - Compound surnames (ARYEETEY WILSON, ESSUMAN KOFI)
 * - Traditional titles (NII, NANA, MAAME, OPANYIN)
 * - Day names (Kofi/Friday, Kwame/Saturday, etc.)
 * - Initials with surnames (A. MENSAH)
 * - Similar-sounding surnames (phonetic similarity)
 */

// ============================================================================
// TRADITIONAL TITLES (should be stripped for matching)
// ============================================================================

/**
 * Common Ghanaian titles that appear in names
 * These should be stripped when comparing names
 */
export const GHANAIAN_TITLES = new Set([
    'elder', 'deacon', 'deaconess', 'pastor', 'apostle', 'prophet', 'prophetess',
    'evangelist', 'reverend', 'rev', 'bishop', 'overseer',
    'nii', 'naa', 'nana', 'maame', 'mama', 'papa', 'opanyin', 'obaapanyin',
    'togbe', 'torgbe', 'mama', 'nene', 'dr', 'prof', 'mrs', 'mr', 'miss', 'ms',
]);

/**
 * Strip titles from a name
 */
export function stripTitles(name: string): string {
    const words = name.toLowerCase().split(/\s+/);
    const filtered = words.filter(w => !GHANAIAN_TITLES.has(w));
    return filtered.join(' ').trim();
}

// ============================================================================
// DAY NAMES (Akan day-of-birth names)
// ============================================================================

/**
 * Akan day names - male and female variants
 * These are extremely common in Ghanaian names
 */
export const DAY_NAMES: Record<string, { male: string[]; female: string[] }> = {
    'sunday': {
        male: ['kwasi', 'kwesi', 'akwasi', 'kosi'],
        female: ['akosua', 'esi', 'kosi']
    },
    'monday': {
        male: ['kwadwo', 'kojo', 'kodwo', 'cudjoe'],
        female: ['adwoa', 'adjoa', 'ajua']
    },
    'tuesday': {
        male: ['kwabena', 'kobina', 'kobena', 'ebo'],
        female: ['abena', 'araba', 'abenaa']
    },
    'wednesday': {
        male: ['kwaku', 'kweku', 'kuuku'],
        female: ['akua', 'ekua', 'kukua']
    },
    'thursday': {
        male: ['yaw', 'ekow', 'yawo'],
        female: ['yaa', 'aba', 'yaaba']
    },
    'friday': {
        male: ['kofi', 'fiifi'],
        female: ['afua', 'efua', 'afi']
    },
    'saturday': {
        male: ['kwame', 'kwami', 'kwamena'],
        female: ['ama', 'amma', 'amoah']
    }
};

// Create reverse lookup: name -> day category
const dayNameLookup = new Map<string, string>();
for (const [day, variants] of Object.entries(DAY_NAMES)) {
    for (const name of [...variants.male, ...variants.female]) {
        dayNameLookup.set(name.toLowerCase(), day);
    }
}

/**
 * Check if two names might be day-name variants of each other
 * Returns true if both are variations of the same day
 */
export function areDayNameVariants(name1: string, name2: string): boolean {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();

    const day1 = dayNameLookup.get(n1);
    const day2 = dayNameLookup.get(n2);

    return !!(day1 && day1 === day2);
}

// ============================================================================
// PHONETIC SIMILARITY (Ghanaian-adapted Soundex)
// ============================================================================

/**
 * Ghanaian-adapted phonetic encoding
 * Based on Soundex but with adjustments for Ghanaian name patterns
 */
export function ghanaianPhonetic(name: string): string {
    if (!name) return '';

    const s = name.toLowerCase().trim();
    if (s.length === 0) return '';

    // Ghanaian-specific substitutions
    let normalized = s
        .replace(/dw/g, 'd')    // Adwoa -> Adoa
        .replace(/tw/g, 't')    // Twumasi -> Tumasi
        .replace(/gy/g, 'j')    // Agyeman -> Ajeman
        .replace(/ey/g, 'e')    // Aryeetey -> Aryeete
        .replace(/ny/g, 'n')    // Nyamekye -> Nameke
        .replace(/kw/g, 'k')    // Kwame -> Kame
        .replace(/oo/g, 'o')    // Oosoo -> Oso
        .replace(/ee/g, 'e')    // Aryeetey -> Aryetey
        .replace(/aa/g, 'a')    // Yaa -> Ya
        .replace(/ii/g, 'i')
        .replace(/uu/g, 'u');

    // Keep first letter
    const firstLetter = normalized[0].toUpperCase();

    // Soundex-style encoding
    const soundexMap: Record<string, string> = {
        'b': '1', 'f': '1', 'p': '1', 'v': '1',
        'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
        'd': '3', 't': '3',
        'l': '4',
        'm': '5', 'n': '5',
        'r': '6',
    };

    let code = firstLetter;
    let lastCode = soundexMap[normalized[0]] || '';

    for (let i = 1; i < normalized.length && code.length < 6; i++) {
        const char = normalized[i];
        const charCode = soundexMap[char] || '';

        // Skip vowels and duplicates
        if (charCode && charCode !== lastCode) {
            code += charCode;
            lastCode = charCode;
        } else if (!charCode) {
            // Vowel resets the duplicate check
            lastCode = '';
        }
    }

    // Pad to 6 characters
    return (code + '00000').slice(0, 6);
}

/**
 * Check if two names are phonetically similar using Ghanaian-adapted encoding
 */
export function arePhoneticallySimilar(name1: string, name2: string): boolean {
    const code1 = ghanaianPhonetic(name1);
    const code2 = ghanaianPhonetic(name2);

    if (!code1 || !code2) return false;

    // Exact match or match on first 4 characters (more lenient)
    return code1 === code2 || code1.slice(0, 4) === code2.slice(0, 4);
}

// ============================================================================
// COMPOUND NAME HANDLING
// ============================================================================

/**
 * Tokenize a Ghanaian name into meaningful parts
 * Handles compound surnames, initials, and titles
 */
export function tokenizeGhanaianName(name: string): string[] {
    const stripped = stripTitles(name);

    // Split on spaces and periods
    const parts = stripped.split(/[\s.]+/).filter(p => p.length > 0);

    // Expand initials (A. -> keep as is, but mark it)
    return parts.map(p => p.toLowerCase());
}

/**
 * Calculate enhanced token overlap for Ghanaian names
 * Considers day-name variants and phonetic similarity
 */
export function ghanaianTokenSimilarity(name1: string, name2: string): number {
    const tokens1 = tokenizeGhanaianName(name1);
    const tokens2 = tokenizeGhanaianName(name2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    let matches = 0;
    const used = new Set<number>();

    for (const t1 of tokens1) {
        // Skip single-letter tokens (initials)
        if (t1.length === 1) continue;

        for (let j = 0; j < tokens2.length; j++) {
            if (used.has(j)) continue;

            const t2 = tokens2[j];
            if (t2.length === 1) continue;

            // Exact match
            if (t1 === t2) {
                matches++;
                used.add(j);
                break;
            }

            // Day-name variant match (Kofi == Fiifi)
            if (areDayNameVariants(t1, t2)) {
                matches += 0.9;
                used.add(j);
                break;
            }

            // Phonetic match (Mensah == Mensa)
            if (arePhoneticallySimilar(t1, t2)) {
                matches += 0.85;
                used.add(j);
                break;
            }

            // Prefix match for longer names (Aryeetey contains Aryee)
            if (t1.length >= 4 && t2.length >= 4) {
                if (t1.startsWith(t2) || t2.startsWith(t1)) {
                    matches += 0.7;
                    used.add(j);
                    break;
                }
            }
        }
    }

    const maxTokens = Math.max(tokens1.length, tokens2.length);
    return maxTokens > 0 ? matches / maxTokens : 0;
}

// ============================================================================
// COMMON SURNAME NORMALIZATION
// ============================================================================

/**
 * Common Ghanaian surname variations that should be treated as equivalent
 */
export const SURNAME_VARIANTS: Record<string, string[]> = {
    'mensah': ['mensa', 'mensaa', 'mensah'],
    'owusu': ['owusu', 'owusu-ansah', 'owusu-boateng'],
    'aryeetey': ['aryeetey', 'aryetey', 'ariyetey'],
    'wilson': ['wilson', 'willson'],
    'lamptey': ['lamptey', 'lampte', 'lamtey'],
    'addai': ['addai', 'adai', 'addey'],
    'addo': ['addo', 'ado'],
    'boateng': ['boateng', 'boatng', 'boating'],
    'asante': ['asante', 'asantey', 'asanti'],
    'ababio': ['ababio', 'ababyo'],
    'adjei': ['adjei', 'adgei', 'adjey'],
    'amoah': ['amoah', 'amoa', 'amuah'],
    'ansah': ['ansah', 'ansa', 'ansar'],
    'appiah': ['appiah', 'apia', 'apiah'],
    'tetteh': ['tetteh', 'teteh', 'tete'],
    'twumasi': ['twumasi', 'tumasi', 'twumase'],
    'asare': ['asare', 'asarey', 'asareh'],
};

// Build reverse lookup
const surnameNormalized = new Map<string, string>();
for (const [canonical, variants] of Object.entries(SURNAME_VARIANTS)) {
    for (const variant of variants) {
        surnameNormalized.set(variant.toLowerCase(), canonical);
    }
}

/**
 * Normalize a surname to its canonical form
 */
export function normalizeSurname(surname: string): string {
    const lower = surname.toLowerCase().trim();
    return surnameNormalized.get(lower) || lower;
}

/**
 * Check if two surnames are variants of each other
 */
export function areSurnameVariants(s1: string, s2: string): boolean {
    const n1 = normalizeSurname(s1);
    const n2 = normalizeSurname(s2);
    return n1 === n2;
}
