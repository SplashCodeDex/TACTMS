import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { TitheRecordB, MemberRecordA } from "@/types";
import { findMemberByName, findMemberByNameSync } from "@/services/reconciliation";
import { storeCorrection } from "@/services/handwritingLearning";
import { validateAmount, AmountValidation } from "@/services/amountValidator";
import Button from "./Button";
import { Check, AlertTriangle, Sparkles, AlertCircle } from "lucide-react";
import MemberSelect from "./MemberSelect";

interface ImageVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    extractedData: TitheRecordB[];
    masterData: MemberRecordA[];
    onConfirm: (verifiedData: TitheRecordB[]) => void;
    assemblyName?: string; // For storing learned corrections
}

interface VerificationRow {
    id: number;
    extractedRecord: TitheRecordB;
    matchedMember: MemberRecordA | null;
    matchConfidence: number;
    aiConfidence: number;
    manualOverride: boolean;
    wasLearned?: boolean;  // True if matched via learned correction
    confidenceTier?: 'high' | 'medium' | 'low';
    amountWarning?: AmountValidation | null; // Amount validation result
}

const ImageVerificationModal: React.FC<ImageVerificationModalProps> = ({
    isOpen,
    onClose,
    extractedData,
    masterData,
    onConfirm,
    assemblyName = 'global',
}) => {
    const [rows, setRows] = useState<VerificationRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen && extractedData.length > 0) {
            setIsProcessing(true);
            const newRows = extractedData.map((record, index) => {
                const rawName = record["Membership Number"];
                // Use sync version for immediate matching, async learning lookup happens in background
                const match = findMemberByNameSync(rawName, masterData);

                return {
                    id: index,
                    extractedRecord: record,
                    matchedMember: match ? match.member : null,
                    matchConfidence: match ? match.score : 0,
                    aiConfidence: record.Confidence || 0,
                    manualOverride: false,
                    wasLearned: match?.wasLearned || false,
                    confidenceTier: match?.confidenceTier || 'low',
                    amountWarning: validateAmount(record["Transaction Amount"]),
                };
            });
            setRows(newRows);
            setIsProcessing(false);
        }
    }, [isOpen, extractedData, masterData]);

    const handleConfirm = () => {
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
        onConfirm(verifiedData);
        onClose();
    };

    const handleMemberSelect = async (rowId: number, member: MemberRecordA | null) => {
        const row = rows.find((r) => r.id === rowId);

        // Store the correction for future learning if user manually selects
        if (row && member && !row.wasLearned) {
            const originalText = row.extractedRecord["Membership Number"];
            const correctedName = `${member["First Name"]} ${member.Surname}`.trim();

            // Only store if the names are different (user made a correction)
            if (originalText.toLowerCase() !== correctedName.toLowerCase()) {
                try {
                    await storeCorrection(originalText, correctedName, assemblyName);
                    console.log('Stored OCR correction for learning:', originalText, '->', correctedName);
                } catch (e) {
                    console.warn('Failed to store correction:', e);
                }
            }
        }

        setRows((prev) =>
            prev.map((r) =>
                r.id === rowId
                    ? { ...r, matchedMember: member, manualOverride: true, matchConfidence: 1, confidenceTier: 'high' }
                    : r
            )
        );
    };

    const getConfidenceBadgeClass = (confidence: number) => {
        if (confidence > 0.8) return "bg-green-100 text-green-800";
        if (confidence > 0.5) return "bg-yellow-100 text-yellow-800";
        return "bg-red-100 text-red-800";
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Verify Image Extraction"
            size="xl"
            footerContent={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>Confirm & Import</Button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                    Please review the extracted data. The system has attempted to match
                    names to your membership list. Confirm or correct the matches below.
                </p>

                {isProcessing ? (
                    <div className="text-center py-8">Processing matches...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-secondary uppercase bg-hover-bg">
                                <tr>
                                    <th className="px-4 py-2">Extracted Name</th>
                                    <th className="px-4 py-2">Amount</th>
                                    <th className="px-4 py-2">AI Conf.</th>
                                    <th className="px-4 py-2">Matched Member</th>
                                    <th className="px-4 py-2">Match Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id} className="border-b border-border-color">
                                        <td className="px-4 py-2 font-medium">
                                            {row.extractedRecord["Membership Number"]}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <span>{row.extractedRecord["Transaction Amount"]}</span>
                                                {row.amountWarning && (
                                                    <div className="group relative">
                                                        <AlertCircle size={14} className="text-yellow-500 cursor-help" />
                                                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 p-2 bg-yellow-50 dark:bg-yellow-900/90 border border-yellow-200 dark:border-yellow-700 rounded-lg text-xs w-48">
                                                            <p className="text-yellow-800 dark:text-yellow-200">{row.amountWarning.message}</p>
                                                            {row.amountWarning.suggestedAmount && (
                                                                <p className="mt-1 font-medium">Suggested: GHS {row.amountWarning.suggestedAmount}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${getConfidenceBadgeClass(row.aiConfidence)}`}
                                            >
                                                {Math.round(row.aiConfidence * 100)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <MemberSelect
                                                currentMember={row.matchedMember}
                                                onSelect={(m) => handleMemberSelect(row.id, m)}
                                                masterData={masterData}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            {row.matchedMember ? (
                                                <div className="flex items-center gap-1 text-green-500">
                                                    <Check size={14} />
                                                    <span>
                                                        {row.manualOverride
                                                            ? "Manual"
                                                            : `${Math.round(row.matchConfidence * 100)}%`}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-yellow-500">
                                                    <AlertTriangle size={14} />
                                                    <span>No Match</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageVerificationModal;
