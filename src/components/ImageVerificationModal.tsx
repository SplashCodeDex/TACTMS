import React, { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { TitheRecordB, MemberRecordA, MemberDatabase } from "@/types";
import { findMemberByName } from "@/services/reconciliation";
import { validateAmountWithLearning } from "@/services/amountValidator";
import type { AmountValidation } from "@/types";
import Button from "./Button";
import { Check, AlertTriangle, AlertCircle, Wand2, ArrowRight, Save, Sparkles, MapPin } from "lucide-react";
import MemberSelect from "./MemberSelect";
import ParsingIndicator from "./ParsingIndicator";
import { useWorkspaceContext, useAppConfigContext } from "@/context";
import { trainEnsemble } from "@/services/ensembleOCR";
import { saveAmountCorrection } from "@/services/handwritingLearning";
import { trainFromVerifiedBatch } from "@/services/imageProcessor";
import { detectAssemblyFromExtraction, getConfidenceBadgeColor, type DetectionSummary } from "@/services/assemblyDetector";
import { useModalShortcuts } from "@/hooks/useKeyboardShortcuts";

interface ImageVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    extractedData: TitheRecordB[];
    masterData: MemberRecordA[];
    onConfirm: (verifiedData: TitheRecordB[]) => void;
    /** Optional: Full member database for cross-assembly detection */
    memberDatabase?: MemberDatabase;
}

interface VerificationRow {
    id: number;
    extractedRecord: TitheRecordB;
    matchedMember: MemberRecordA | null;
    matchConfidence: number;
    aiConfidence: number;
    manualOverride: boolean;
    confidenceTier?: 'high' | 'medium' | 'low';
    amountWarning?: AmountValidation | null;
    matchSource?: 'fuzzy' | 'ai_semantic';
    // New: track if amount was corrected
    amountCorrected?: boolean;
    originalAmount?: number | string;
}

const ImageVerificationModal: React.FC<ImageVerificationModalProps> = ({
    isOpen,
    onClose,
    extractedData,
    masterData,
    onConfirm,
    memberDatabase,
}) => {
    const { currentAssembly } = useWorkspaceContext();
    const { enableAmountSnapping } = useAppConfigContext();
    const [rows, setRows] = useState<VerificationRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editingAmount, setEditingAmount] = useState<string>("");
    const [savedCorrections, setSavedCorrections] = useState<Set<number>>(new Set());
    const [detectedAssembly, setDetectedAssembly] = useState<DetectionSummary | null>(null);

    useEffect(() => {
        const processMatches = async () => {
            if (isOpen && extractedData.length > 0) {
                setIsProcessing(true);
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

                const newRows = await Promise.all(extractedData.map(async (record, index) => {
                    const rawName = record["Membership Number"];
                    // Use async version with AI fallback
                    const match = await findMemberByName(rawName, masterData, undefined, apiKey);

                    return {
                        id: index,
                        extractedRecord: record,
                        matchedMember: match ? match.member : null,
                        matchConfidence: match ? match.score : 0,
                        aiConfidence: record.Confidence || 0,
                        manualOverride: false,
                        confidenceTier: match?.confidenceTier || 'low',
                        amountWarning: await validateAmountWithLearning(
                            record["Transaction Amount"],
                            currentAssembly || 'default',
                            undefined, // memberHistory
                            enableAmountSnapping // Pass the setting from context
                        ),
                        matchSource: match?.matchSource,
                        originalAmount: record["Transaction Amount"]
                    };
                }));
                setRows(newRows);
                setIsProcessing(false);
                setSavedCorrections(new Set());

                // Run assembly detection if memberDatabase is available
                if (memberDatabase && Object.keys(memberDatabase).length > 1) {
                    const detection = detectAssemblyFromExtraction(extractedData, memberDatabase);
                    setDetectedAssembly(detection);
                }
            }
        };

        processMatches();
    }, [isOpen, extractedData, masterData, currentAssembly, enableAmountSnapping, memberDatabase]);

    const handleConfirm = async () => {
        const verifiedData = rows.map((row) => {
            const finalMember = row.matchedMember;
            const memberId = finalMember
                ? `${finalMember.Surname} ${finalMember["First Name"]} ${finalMember["Other Names"] || ""} (${finalMember["Membership Number"]}|${finalMember["Old Membership Number"] || ""})`
                : row.extractedRecord["Membership Number"];

            return {
                ...row.extractedRecord,
                "Membership Number": memberId,
                memberDetails: finalMember || undefined,
            };
        });

        // Train ensemble from any corrections made during verification
        // This helps the OCR model learn from user feedback
        try {
            await trainFromVerifiedBatch(extractedData, verifiedData);
        } catch (e) {
            console.warn('[ImageVerificationModal] Training from verified batch failed:', e);
        }

        onConfirm(verifiedData);
        onClose();
    };

    // Keyboard shortcuts: Ctrl+Enter to confirm, Escape handled by Modal
    useModalShortcuts(() => handleConfirm(), undefined, isOpen && !isProcessing);

    const handleMemberSelect = async (rowId: number, member: MemberRecordA | null) => {
        const row = rows.find(r => r.id === rowId);

        setRows((prev) =>
            prev.map((r) =>
                r.id === rowId
                    ? {
                        ...r,
                        matchedMember: member,
                        manualOverride: member !== null,
                        matchConfidence: member ? 1 : 0,
                        confidenceTier: member ? 'high' : 'low'
                    }
                    : r
            )
        );

        // Learn name alias if user manually selected a member
        if (member && row && currentAssembly) {
            const extractedName = row.extractedRecord["Membership Number"];
            const correctMemberId = member["Membership Number"] || member["Old Membership Number"] || "";
            const correctMemberName = `${member.Surname} ${member["First Name"]} ${member["Other Names"] || ""}`.trim();

            // Import and save alias asynchronously
            try {
                const { saveNameAlias } = await import("@/services/handwritingLearning");
                await saveNameAlias(currentAssembly, extractedName, correctMemberId, correctMemberName, 'verification');
            } catch (error) {
                console.error("[FeedbackLoop] Failed to save name alias:", error);
            }
        }
    };

    // =========================================================================
    // FEEDBACK LEARNING LOOP - Amount Correction
    // =========================================================================

    const handleAmountEdit = (rowId: number, currentAmount: number | string) => {
        setEditingRowId(rowId);
        setEditingAmount(String(currentAmount));
    };

    const handleAmountSave = useCallback(async (rowId: number) => {
        const newAmount = parseFloat(editingAmount);
        if (isNaN(newAmount) || newAmount < 0) {
            setEditingRowId(null);
            return;
        }

        const row = rows.find(r => r.id === rowId);
        if (!row) return;

        const originalValue = row.originalAmount;
        const originalStr = String(originalValue);

        // Update the row with corrected amount
        setRows((prev) =>
            prev.map((r) =>
                r.id === rowId
                    ? {
                        ...r,
                        extractedRecord: {
                            ...r.extractedRecord,
                            "Transaction Amount": newAmount
                        },
                        amountCorrected: true,
                        amountWarning: null // Clear warning after correction
                    }
                    : r
            )
        );

        // If the amount actually changed, train the learning systems
        if (newAmount !== parseFloat(originalStr)) {
            console.log(`[FeedbackLoop] Training: "${originalStr}" → ${newAmount}`);

            try {
                // Train the ensemble OCR (char substitution + neural network)
                await trainEnsemble(originalStr, newAmount);

                // Save to handwriting learning database
                await saveAmountCorrection(
                    currentAssembly || 'default',
                    originalStr,
                    newAmount,
                    row.matchedMember?.["Membership Number"],
                    'verification'
                );

                // Mark as saved
                setSavedCorrections(prev => new Set(prev).add(rowId));
            } catch (error) {
                console.error("[FeedbackLoop] Failed to save correction:", error);
            }
        }

        setEditingRowId(null);
        setEditingAmount("");
    }, [editingAmount, rows, currentAssembly]);

    const handleAmountKeyDown = (e: React.KeyboardEvent, rowId: number) => {
        if (e.key === "Enter") {
            handleAmountSave(rowId);
        } else if (e.key === "Escape") {
            setEditingRowId(null);
            setEditingAmount("");
        }
    };

    // Apply suggested amount from warning
    const applySuggestedAmount = async (rowId: number, suggestedAmount: number) => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return;

        const originalStr = String(row.originalAmount);

        setRows((prev) =>
            prev.map((r) =>
                r.id === rowId
                    ? {
                        ...r,
                        extractedRecord: {
                            ...r.extractedRecord,
                            "Transaction Amount": suggestedAmount
                        },
                        amountCorrected: true,
                        amountWarning: null
                    }
                    : r
            )
        );

        // Train the systems
        try {
            await trainEnsemble(originalStr, suggestedAmount);
            await saveAmountCorrection(
                currentAssembly || 'default',
                originalStr,
                suggestedAmount,
                row.matchedMember?.["Membership Number"],
                'verification'
            );
            setSavedCorrections(prev => new Set(prev).add(rowId));
        } catch (error) {
            console.error("[FeedbackLoop] Failed to save suggestion:", error);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Verify Extraction Results"
            size="xl"
            footerContent={
                <div className="flex justify-between items-center w-full">
                    <div className="text-xs text-[var(--text-muted)]">
                        {savedCorrections.size > 0 && (
                            <span className="flex items-center gap-1 text-green-400">
                                <Sparkles size={12} />
                                {savedCorrections.size} corrections learned
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} className="hover:bg-red-500/10 hover:text-red-400">
                            Discard
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            className="bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] hover:shadow-lg hover:shadow-[var(--primary-accent-start)]/20 transition-all duration-300"
                            leftIcon={<Check size={18} />}
                        >
                            Confirm & Import
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-color)]">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            {extractedData.length} Entries Extracted
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Review matches below. {rows.filter(r => !r.matchedMember).length > 0 ?
                                <span className="text-amber-400 font-medium">{rows.filter(r => !r.matchedMember).length} unmatched needs review.</span> :
                                <span className="text-green-400 font-medium">All matched successfully.</span>
                            }
                        </p>
                    </div>

                    {/* Detected Assembly Badge */}
                    {detectedAssembly?.topMatch && (
                        <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${getConfidenceBadgeColor(detectedAssembly.topMatch.confidence)}`}>
                            <MapPin size={12} />
                            <span>
                                {detectedAssembly.isConfident ? 'Detected:' : 'Possible:'}{' '}
                                <strong>{detectedAssembly.topMatch.assemblyName}</strong>
                            </span>
                            <span className="opacity-60">
                                ({Math.round(detectedAssembly.topMatch.confidence * 100)}%)
                            </span>
                        </div>
                    )}

                    {/* Status Pill */}
                    <div className="px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-muted)]">
                        {isProcessing ? (
                            <span className="flex items-center gap-2 text-[var(--primary-accent-start)]">
                                <span className="animate-spin w-2 h-2 rounded-full border-2 border-current border-t-transparent" />
                                Verifying...
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <Check size={12} className="text-green-400" /> Auto-Verification Complete
                            </span>
                        )}
                    </div>
                </div>

                <ParsingIndicator
                    isOpen={isProcessing}
                    message="Verifying members..."
                    subMessage="The AI is cross-referencing names with your database."
                />

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {rows.map((row, idx) => (
                        <div
                            key={row.id}
                            className={`
                                group relative p-4 rounded-xl border transition-all duration-300
                                ${row.matchedMember
                                    ? 'bg-[var(--bg-elevated)] border-[var(--border-color)] hover:border-[var(--primary-accent-start)]/50 hover:shadow-lg hover:shadow-[var(--primary-accent-start)]/5'
                                    : 'bg-amber-500/5 border-amber-500/30'
                                }
                                ${row.amountCorrected ? 'ring-1 ring-green-500/30' : ''}
                            `}
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="flex items-center justify-between gap-4">
                                {/* Left: Source Data */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-[var(--bg-secondary)] text-[var(--text-primary)] px-2 py-0.5 rounded text-xs font-mono border border-[var(--border-color)]">
                                            #{idx + 1}
                                        </span>
                                        {row.matchSource === 'ai_semantic' && (
                                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                <Wand2 size={10} /> AI Match
                                            </span>
                                        )}
                                        {row.amountCorrected && (
                                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                                <Save size={10} /> Corrected
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-handwriting text-lg text-[var(--text-primary)] truncate" title={row.extractedRecord["Membership Number"]}>
                                        {row.extractedRecord["Membership Number"]}
                                    </h4>

                                    {/* Editable Amount Badge */}
                                    <div className="mt-2 inline-flex items-center gap-2 bg-[var(--bg-card)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] shadow-sm">
                                        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Amount</span>

                                        {editingRowId === row.id ? (
                                            <input
                                                type="number"
                                                value={editingAmount}
                                                onChange={(e) => setEditingAmount(e.target.value)}
                                                onKeyDown={(e) => handleAmountKeyDown(e, row.id)}
                                                onBlur={() => handleAmountSave(row.id)}
                                                autoFocus
                                                className="w-20 px-2 py-0.5 text-sm font-bold text-[var(--text-primary)] font-mono bg-[var(--bg-secondary)] border border-[var(--primary-accent-start)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent-start)]"
                                            />
                                        ) : (
                                            <button
                                                onClick={() => handleAmountEdit(row.id, row.extractedRecord["Transaction Amount"])}
                                                className="text-sm font-bold text-[var(--text-primary)] font-mono hover:text-[var(--primary-accent-start)] hover:underline cursor-pointer transition-colors"
                                                title="Click to edit amount"
                                            >
                                                {row.extractedRecord["Transaction Amount"]}
                                            </button>
                                        )}

                                        {row.amountWarning && row.amountWarning.reason !== 'valid' && row.amountWarning.suggestedAmount && (
                                            <button
                                                onClick={() => applySuggestedAmount(row.id, row.amountWarning!.suggestedAmount!)}
                                                className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded hover:bg-amber-500/40 transition-colors"
                                                title={row.amountWarning.message}
                                            >
                                                <Sparkles size={10} />
                                                Use {row.amountWarning.suggestedAmount}
                                            </button>
                                        )}

                                        {row.amountWarning && row.amountWarning.reason !== 'valid' && !row.amountWarning.suggestedAmount && (
                                            <div className="group/tooltip relative">
                                                <AlertCircle size={14} className="text-amber-500 animate-pulse cursor-help" />
                                                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50 w-64 p-3 bg-amber-950/90 backdrop-blur-md border border-amber-500/30 rounded-xl shadow-xl">
                                                    <p className="text-xs text-amber-200 font-medium mb-1">Attention Needed</p>
                                                    <p className="text-xs text-amber-100/80 leading-relaxed">{row.amountWarning.message}</p>
                                                </div>
                                            </div>
                                        )}

                                        {savedCorrections.has(row.id) && (
                                            <span className="text-green-400" title="Correction saved to learning database">
                                                <Check size={14} />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Center: Arrow */}
                                <div className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary-accent-start)] transition-colors transform group-hover:translate-x-1 duration-300">
                                    <ArrowRight size={20} />
                                </div>

                                {/* Right: Matched Member */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-[var(--text-muted)]">Mapped To</span>
                                        {row.matchedMember ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                                                <Check size={12} strokeWidth={3} />
                                                {row.manualOverride ? 'MANUAL' : 'MATCHED'}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                                                <AlertTriangle size={12} strokeWidth={3} />
                                                NO MATCH
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative">
                                        {row.matchedMember ? (
                                            <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] group-hover:border-[var(--primary-accent-start)]/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-accent-start)] to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                                        {row.matchedMember["First Name"]?.[0]}
                                                        {row.matchedMember.Surname?.[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                                                            {row.matchedMember.Surname}, {row.matchedMember["First Name"]}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-muted)] font-mono truncate">
                                                            {row.matchedMember["Membership Number"]}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleMemberSelect(row.id, null)}
                                                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400 h-8 w-8 p-0"
                                                        title="Unlink member"
                                                    >
                                                        <AlertCircle size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative z-10">
                                                <MemberSelect
                                                    currentMember={null}
                                                    onSelect={(m) => handleMemberSelect(row.id, m)}
                                                    masterData={masterData}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default ImageVerificationModal;
