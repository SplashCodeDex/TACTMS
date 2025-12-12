/**
 * Type definitions for image processing
 * Extracted from imageProcessor.ts for better modularity
 */
import { TitheRecordB, MemberRecordA } from "../../types";

// ============================================================================
// TITHE IMAGE PROCESSING TYPES
// ============================================================================

export interface TargetColumnZone {
    columnHeader: string;
    monthHeader: string;
    relativePosition: string;
    columnsFromTotal?: number;
    totalColumnHasRedInk?: boolean;
}

export interface SetInfo {
    setNumber: number;
    memberRangeStart: number;
    memberRangeEnd: number;
}

export interface TitheImageExtractionResult {
    isValidTitheBook: boolean;
    detectedYear: string | null;
    pageNumber: number | null;
    entries: TitheRecordB[];
    lowConfidenceCount: number;
    targetColumnZone?: TargetColumnZone;
    setInfo?: SetInfo;
    /** Anomaly warnings for amounts that deviate from member history */
    anomalyWarnings?: Array<{
        rowNo: number;
        memberName: string;
        extractedAmount: number;
        expectedAmount: number;
        reason: string;
    }>;
    /** True if detected as notebook format (not official tithe book) */
    isNotebookFormat?: boolean;
    /** Notebook-specific metadata when isNotebookFormat is true */
    notebookMetadata?: {
        detectedDate?: string;
        attendance?: number;
    };
}

// ============================================================================
// NOTEBOOK DETECTION TYPES
// ============================================================================

/** Signals used to detect notebook vs tithe book format */
export interface NotebookDetectionSignals {
    hasStructuredGrid: boolean;
    hasPageNumber: boolean;
    hasMonthHeaders: boolean;
    hasChurchBranding: boolean;
    hasSimpleNameAmountFormat: boolean;
    hasAttendanceHeader: boolean;
    hasLinedPaperPattern: boolean;
}

/** Result of notebook format detection */
export interface NotebookDetectionResult {
    isNotebook: boolean;
    confidence: number;
    detectedDate?: string;
    extractedAttendance?: number;
    signals: NotebookDetectionSignals;
    detectionReasons: string[];
}

/** Raw entry extracted from notebook format */
export interface NotebookRawEntry {
    name: string;
    rawAmountText: string;
    amount: number;
    legibility?: number;
}

/** Result of notebook image extraction */
export interface NotebookExtractionResult {
    isValidNotebook: boolean;
    detectedDate?: string;
    attendance?: number;
    entries: TitheRecordB[];
    lowConfidenceCount: number;
    rawEntries: NotebookRawEntry[];
}


export interface EnhancedRawEntry {
    "No.": number;
    "Name": string;
    "Amount": number;
    "legibility"?: number;
    "rawAmountText"?: string;
    "inkColor"?: 'red' | 'blue' | 'black' | 'unknown';
    "cellCondition"?: 'clean' | 'corrected' | 'smudged' | 'empty';
}

export interface EnhancedRawExtraction {
    isValidTitheBook: boolean;
    detectedYear?: string;
    pageNumber?: number;
    targetColumnZone?: TargetColumnZone;
    setInfo?: SetInfo;
    entries: EnhancedRawEntry[];
}

// ============================================================================
// NAME EXTRACTION TYPES
// ============================================================================

export interface NameMatchResult {
    extractedName: string;
    matchedMember: MemberRecordA | null;
    confidence: number;
    position: number;
    alternatives: Array<{ member: MemberRecordA; score: number }>;
}

export interface NameExtractionResult {
    matches: NameMatchResult[];
    totalExtracted: number;
    successfulMatches: number;
}

// ============================================================================
// INTERNAL MATCHING TYPES
// ============================================================================

export interface ScoredMember {
    member: MemberRecordA;
    score: number;
}

export interface MatchResult {
    member: MemberRecordA | null;
    score: number;
    alternatives: Array<{ member: MemberRecordA; score: number }>;
    isFromAlias?: boolean;
}
