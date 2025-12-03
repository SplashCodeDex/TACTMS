import React, { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import { TitheRecordB, MemberRecordA } from "../types";
import { findMemberByName } from "../services/reconciliation";
import { getSimilarity } from "../utils/stringUtils";
import Button from "./Button";
import { Check, AlertTriangle, Search } from "lucide-react";

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
    matchConfidence: number; // Score for the DB match
    aiConfidence: number;   // Score for the AI extraction
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
                const rawName = record["Membership Number"]; // Currently holds the name
                const match = findMemberByName(rawName, masterData);

                return {
                    id: index,
                    extractedRecord: record,
                    matchedMember: match ? match.member : null,
                    matchConfidence: match ? match.score : 0,
                    aiConfidence: record.Confidence || 0, // Use the AI confidence from the record
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
                : row.extractedRecord["Membership Number"]; // Fallback to raw name if no match

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

    // Simple Member Search Component (Inline for now)
    const MemberSelect = ({
        currentMember,
        onSelect,
    }: {
        currentMember: MemberRecordA | null;
        onSelect: (m: MemberRecordA | null) => void;
    }) => {
        const [search, setSearch] = useState("");
        const [isOpen, setIsOpen] = useState(false);

        const filteredMembers = useMemo(() => {
            if (!search) return [];
            const lowerSearch = search.toLowerCase();

            return masterData
                .map(m => {
                    const fullName = `${m.Surname} ${m["First Name"]} ${m["Other Names"] || ""}`.trim();
                    const score = getSimilarity(lowerSearch, fullName.toLowerCase());
                    return { member: m, score };
                })
                .filter(item => item.score > 0.3 ||
                    // Keep exact substring matches even if score is low (e.g. short queries)
                    `${item.member.Surname} ${item.member["First Name"]}`.toLowerCase().includes(lowerSearch)
                )
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map(item => item.member);
        }, [search, masterData]);

        return (
            <div className="relative">
                <div
                    className="p-2 border rounded cursor-pointer bg-input-bg flex justify-between items-center"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className="truncate max-w-[200px]">
                        {currentMember
                            ? `${currentMember.Surname} ${currentMember["First Name"]}`
                            : "Select Member..."}
                    </span>
                    <Search size={14} />
                </div>
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-card-bg border rounded shadow-lg max-h-60 overflow-auto">
                        <input
                            type="text"
                            className="w-full p-2 border-b bg-input-bg sticky top-0"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        <div
                            className="p-2 hover:bg-hover-bg cursor-pointer text-red-400"
                            onClick={() => {
                                onSelect(null);
                                setIsOpen(false);
                            }}
                        >
                            No Match (Keep Raw Name)
                        </div>
                        {filteredMembers.map((m, i) => (
                            <div
                                key={i}
                                className="p-2 hover:bg-hover-bg cursor-pointer"
                                onClick={() => {
                                    onSelect(m);
                                    setIsOpen(false);
                                }}
                            >
                                {m.Surname} {m["First Name"]} ({m["Membership Number"]})
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
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
                    Please review the extracted data. The system has attempted to match names
                    to your membership list. Confirm or correct the matches below.
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
                                            <span className={`px-2 py-1 rounded text-xs ${row.aiConfidence > 0.8 ? 'bg-green-100 text-green-800' :
                                                row.aiConfidence > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {Math.round(row.aiConfidence * 100)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <MemberSelect
                                                currentMember={row.matchedMember}
                                                onSelect={(m) => handleMemberSelect(row.id, m)}
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
        </Modal >
    );
};

export default ImageVerificationModal;
