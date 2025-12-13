export interface MemberRecordA {
  [key: string]: any; // Allows dynamic keys from Excel
  "No."?: number | string;
  "Membership Number"?: string;
  Title?: string;
  "Old Membership Number"?: string;
  "First Name"?: string;
  Surname?: string;
  "Other Names"?: string;
  Gender?: string;
  "Marital Status"?: string;
  "Type of Marriage"?: string;
  Age?: string; // e.g., "68 years 4 ASHANTI-MAMP..."
  "Place of Birth"?: string;
  Hometown?: string;
  "Hometown Region"?: string;
  Nationality?: string;
  Email?: string;
  "Phone Number"?: string | number;
  "Whatsapp Number"?: string | number;
  "Other Phone Numbers"?: string;
  "Postal Address"?: string;
  "Residential Address"?: string;
  "Zip Code"?: string;
  "Digital Address"?: string;
  "Baptized By"?: string;
  "Place of Baptism"?: string;
  "Date of Baptism (DD-MMM-YYYY)"?: string;
  "Previous Denomination"?: string;
  "Languages Spoken"?: string;
  "Spiritual Gifts"?: string;
  "Level of Education"?: string;
  "Course Studied"?: string;
  "Type of Employment"?: string;
  "Place of Work"?: string;
  "Profession/Occupation"?: string;
  "Is Communicant? (Yes/No)"?: string;
  "Any Spiritual Gifts? (Yes/No)"?: string; // Renamed for clarity from source
  "Holy Spirit Baptism? (Yes/No)"?: string;
  "Water Baptism? (Yes/No)"?: string;
  "Right Hand of Fellowship? (Yes/No)"?: string;
  "Salaried Staff Ministers (SSNIT Number)"?: string;

  // New fields for accuracy
  firstSeenDate?: string; // ISO string
  firstSeenSource?: string; // e.g., filename or 'manual_add'
  customOrder?: number;
}

export interface TitheRecordB {
  "No.": number | string;
  "Transaction Type": string;
  "Payment Source Type": string;
  "Membership Number": string; // Concatenated: Title First_Name Surname Other_Names (Membership_Number|Old_Membership_Number)
  "Transaction Date ('DD-MMM-YYYY')": string;
  Currency: string;
  "Exchange Rate": number;
  "Payment Method": string;
  "Transaction Amount": number | string; // Allow string for initial empty state
  "Narration/Description": string;
  Confidence?: number; // 0 to 1 score from AI
  memberDetails?: MemberRecordA; // Linked member record for accurate export formatting
}

export interface ConcatenationConfig {
  Title: boolean;
  "First Name": boolean;
  Surname: boolean;
  "Other Names": boolean;
  "Membership Number": boolean; // This implies using both 'Membership Number' and 'Old Membership Number'
}

export interface FavoriteConfig {
  id: string;
  name: string;
  timestamp: number;
  originalFileName: string;
  assemblyName: string;
  ageRangeMin?: number;
  ageRangeMax?: number;
  concatenationConfig: ConcatenationConfig;
  selectedDate: string; // Store as ISO string or DD-MMM-YYYY
  descriptionText: string;
  amountMappingColumn?: string | null;

  originalData?: MemberRecordA[]; // Store full original data
  processedDataA?: MemberRecordA[]; // Store full processed (e.g. filtered) data
  titheListData: TitheRecordB[]; // Store full tithe list data

  soulsWonCount?: number; // Store souls won for this period.
  processedRecordsCount: number; // Keep for quick display, derived from processedDataA.length or titheListData.length
  totalTitheAmount: number; // Keep for quick display, derived from titheListData
}

export interface AutoSaveDraft {
  timestamp: number;
  titheListData: TitheRecordB[];
  selectedDate: string;
  descriptionText: string;
  concatenationConfig: ConcatenationConfig;
  ageRangeMin: string;
  ageRangeMax: string;
  fileNameToSave: string;
  amountMappingColumn: string | null;
  uploadedFileName?: string;
  originalDataRecordCount: number;
  processedDataARecordCount: number;
  assemblyName: string;
  soulsWonCount: number | null;
}

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
}

// New types for the Membership Reconciliation feature
export interface ReconciliationEntry {
  name: string;
  membershipId: string;
}

export interface ChangedMemberDetail {
  memberId: string;
  oldRecord: MemberRecordA;
  newRecord: MemberRecordA;
  changes: { field: string; oldValue: any; newValue: any }[];
  matchType: 'ID' | 'OldID';
}

export interface ConflictingMemberDetail {
  newRecord: MemberRecordA;
  existingMember: MemberRecordA;
  similarityScore?: number;
}

export interface MembershipReconciliationReport {
  newMembers: MemberRecordA[];
  changedMembers: ChangedMemberDetail[];
  conflicts: ConflictingMemberDetail[];
  unidentifiableNewMembers: MemberRecordA[];
  unidentifiableMasterMembers: MemberRecordA[];
  previousFileDate: string;
}
export type AppView =
  | "dashboard"
  | "processor"
  | "database"
  | "favorites"
  | "reports"
  | "analytics"
  | "settings";

export type ViewType = AppView;

// New types for Member Database
export interface MasterListData {
  data: MemberRecordA[];
  lastUpdated: number;
  fileName: string;
  sourceFileDate?: number | null; // Timestamp of the source file
}
export type MemberDatabase = Record<string, MasterListData>;

// New type for Transaction Log to improve stats accuracy
export interface TransactionLogEntry {
  id: string; // e.g., `${assemblyName}-${yyyy-mm-dd}`
  assemblyName: string;
  timestamp: number;
  selectedDate: string; // ISO String
  totalTitheAmount: number;
  soulsWonCount: number;
  titherCount: number;
  recordCount: number;

  // Workspace snapshot for reloading by date
  titheListData: TitheRecordB[];
  concatenationConfig: ConcatenationConfig;
  descriptionText: string;
  amountMappingColumn: string | null;
}

// New type for Reports Section
export interface ReportData {
  assemblyName: string;
  totalTithe: number;
  soulsWon: number;
  titherCount: number;
  recordCount: number;
}

// New type for AI Outreach Assistant
export interface OutreachMessage {
  memberName: string;
  message: string;
}

export interface PendingMasterListUpdate {
  assemblyName: string;
  newData: MemberRecordA[];
  newFileName: string;
}

export interface ChatMessage {
  role: "user" | "model";
  parts: { text?: string; functionCall?: any; functionResponse?: any }[];
  suggestions?: string[];
  entityCard?: {
    type: "member";
    title: string;
    subtitle?: string;
    details: { label: string; value: string }[];
    id: string; // Formatting essential for actions
  };
  summary?: string;
  isLoading?: boolean;
}
export interface ChartData {
  label: string;
  count: number;
}

export interface FuzzyMatchResult {
  member: MemberRecordA;
  score: number;
  matchedName: string;
  confidenceTier: 'high' | 'medium' | 'low';
  matchSource?: 'fuzzy' | 'ai_semantic';
}

// ============================================================================
// AI OCR CORRECTION TYPES
// ============================================================================

/**
 * Amount correction learned from user feedback
 */
export interface AmountCorrection {
  id: string;
  assemblyName: string;       // Use '__GLOBAL__' for cross-assembly patterns
  originalValue: string;      // What AI extracted: "1OO", "5O"
  correctedValue: number;     // What user entered: 100, 50
  memberId?: string;          // Optional: specific member pattern
  timestamp: number;
  source: 'tithe_entry' | 'verification' | 'batch';
  isGlobal?: boolean;         // True = applies to all assemblies
}

/**
 * Suggestion from OCR correction system
 */
export interface CorrectionSuggestion {
  suggestedAmount: number;
  confidence: number;        // 0-1 based on frequency
  occurrences: number;       // How many times this correction was made
  isExactMatch: boolean;     // True if originalValue matches exactly
  isGlobal?: boolean;        // True if from global patterns
}

/**
 * Character substitution pattern for OCR errors (O→0, I→1)
 */
export interface SubstitutionPattern {
  from: string;   // Character that appears in OCR: "O"
  to: string;     // What it should be: "0"
  frequency: number;
  contexts: string[];  // Examples where this was learned
}

/**
 * Ensemble prediction combining multiple AI methods
 */
export interface EnsemblePrediction {
  suggestedAmount: number;
  confidence: number;
  method: 'ensemble' | 'char_substitution' | 'ml' | 'exact';
  agreementScore: number;  // How many methods agreed
  breakdown: {
    charSub?: { value: number; confidence: number };
    ml?: { value: number; confidence: number };
  };
}

/**
 * Result of amount validation
 */
export interface AmountValidation {
  originalAmount: number;
  suggestedAmount?: number;
  confidence: number;
  reason: 'ocr_artifact' | 'unusual_high' | 'unusual_low' | 'anomaly' | 'member_pattern' | 'valid';
  message?: string;
}

/**
 * Member tithe history for anomaly detection
 */
export interface MemberTitheHistory {
  memberId: string;
  averageAmount: number;
  standardDeviation: number; // For 2σ anomaly detection
  minAmount: number;
  maxAmount: number;
  lastAmount: number;
  occurrences: number;
}
