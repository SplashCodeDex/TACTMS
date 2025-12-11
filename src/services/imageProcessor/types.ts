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
