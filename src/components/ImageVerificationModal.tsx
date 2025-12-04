import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { TitheRecordB, MemberRecordA } from "../types";
import { findMemberByName } from "../services/reconciliation";
import Button from "./Button";
import { Check, AlertTriangle } from "lucide-react";
import MemberSelect from "./MemberSelect";

interface ImageVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    extractedData: TitheRecordB[];
    masterData: MemberRecordA[];
    onConfirm: (verifiedData: TitheRecordB[]) => void;
}

interface VerificationRow {
    id: number;
    extractedRecord: TitheRecordB;
    matchedMember: MemberRecordA | null;
    matchConfidence: number;
    aiConfidence: number;
    manualOverride: boolean;
}

const ImageVerificationModal: React.FC<ImageVerificationModalProps> = ({
    isOpen,
    onClose,
    extractedData,
    masterData,
    onConfirm,
}) => {
    const [rows, setRows] = useState<VerificationRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen && extractedData.length > 0) {
            setIsProcessing(true);
            const newRows = extractedData.map((record, index) => {
                const rawName = record["Membership Number"];
                const match = findMemberByName(rawName, masterData);

                return {
                    id: index,
                    extractedRecord: record,
                    matchedMember: match ? match.member : null,
                    matchConfidence: match ? match.score : 0,
                    aiConfidence: record.Confidence || 0,
                    manualOverride: false,
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

    const handleMemberSelect = (rowId: number, member: MemberRecordA | null) => {
        setRows((prev) =>
            prev.map((row) =>
                row.id === rowId
                    ? { ...row, matchedMember: member, manualOverride: true, matchConfidence: 1 }
                    : row
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
                                            {row.extractedRecord["Transaction Amount"]}
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
