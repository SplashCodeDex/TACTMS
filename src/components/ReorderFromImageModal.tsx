import React, { useState, useCallback, useRef } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { Upload, Wand2, Check, X, AlertTriangle, RefreshCw } from "lucide-react";
import { MemberRecordA } from "@/types";
import { updateMemberOrder } from "@/services/memberOrderService";
import { extractNamesFromTitheBook } from "@/services/imageProcessor";

interface ReorderFromImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    assemblyName: string;
    memberDatabase: MemberRecordA[];
    onSaveComplete: () => void;
    addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

type ModalStep = "upload" | "processing" | "preview" | "resolving";

interface ExtractedNameRow {
    position: number;
    extractedName: string;
    matchedMember: MemberRecordA | null;
    matchScore: number;
    isManuallyResolved: boolean;
}

const ReorderFromImageModal: React.FC<ReorderFromImageModalProps> = ({
    isOpen,
    onClose,
    assemblyName,
    memberDatabase,
    onSaveComplete,
    addToast,
}) => {
    const [step, setStep] = useState<ModalStep>("upload");
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [extractedRows, setExtractedRows] = useState<ExtractedNameRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens/closes
    const handleClose = useCallback(() => {
        setStep("upload");
        setUploadedImages([]);
        setImagePreviews([]);
        setExtractedRows([]);
        setIsProcessing(false);
        setResolvingIndex(null);
        setSearchTerm("");
        onClose();
    }, [onClose]);

    // Handle image upload
    const handleImageSelect = useCallback((files: File[]) => {
        const newImages: File[] = [];

        // Calculate how many more we can add
        const remainingSlots = 5 - uploadedImages.length;
        if (remainingSlots <= 0) {
            addToast("Maximum 5 images allowed", "warning");
            return;
        }

        const filesToAdd = files.slice(0, remainingSlots);

        filesToAdd.forEach(file => {
            if (!file.type.startsWith("image/")) {
                addToast(`Skipping non-image file: ${file.name}`, "warning");
                return;
            }
            newImages.push(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });

        setUploadedImages(prev => [...prev, ...newImages]);
    }, [uploadedImages, addToast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) handleImageSelect(files);
    }, [handleImageSelect]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length > 0) handleImageSelect(files);
    }, [handleImageSelect]);

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Process images with AI
    const handleProcess = async () => {
        if (uploadedImages.length === 0) return;

        setStep("processing");
        setIsProcessing(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
            if (!apiKey) {
                throw new Error("Gemini API key not configured");
            }

            const allRows: ExtractedNameRow[] = [];

            // Process sequentially
            for (let i = 0; i < uploadedImages.length; i++) {
                const result = await extractNamesFromTitheBook(uploadedImages[i], apiKey, memberDatabase);

                const pageRows: ExtractedNameRow[] = result.matches.map((match) => ({
                    position: match.position,
                    extractedName: match.extractedName,
                    matchedMember: match.matchedMember,
                    matchScore: match.confidence,
                    isManuallyResolved: false,
                }));

                allRows.push(...pageRows);
            }

            // Sort by extracted position to keep order
            allRows.sort((a, b) => a.position - b.position);

            setExtractedRows(allRows);
            const unmatchedCount = allRows.filter(r => !r.matchedMember).length;

            if (unmatchedCount > 0) {
                setStep("preview");
                addToast(`${unmatchedCount} names need manual resolution`, "warning");
            } else {
                setStep("preview");
                addToast(`All ${allRows.length} names matched successfully!`, "success");
            }
        } catch (error) {
            console.error("Failed to extract names:", error);
            addToast(`Failed to process image: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
            setStep("upload");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle manual member selection for unmatched names
    const handleResolveMember = useCallback((rowIndex: number, member: MemberRecordA) => {
        setExtractedRows(prev => prev.map((row, i) =>
            i === rowIndex ? { ...row, matchedMember: member, matchScore: 1.0, isManuallyResolved: true } : row
        ));
        setResolvingIndex(null);
        setSearchTerm("");
    }, []);

    // Skip unmatched name
    const handleSkipName = useCallback((rowIndex: number) => {
        setExtractedRows(prev => prev.filter((_, i) => i !== rowIndex));
    }, []);

    // Apply the new order
    const handleApplyOrder = async () => {
        const validRows = extractedRows.filter(r => r.matchedMember);

        if (validRows.length === 0) {
            addToast("No valid matches to apply", "error");
            return;
        }

        setIsSaving(true);
        try {
            const updates = validRows.map((row) => ({
                memberId: row.matchedMember!["Membership Number"] || row.matchedMember!["Old Membership Number"] || "",
                newIndex: row.position,
            })).filter(u => u.memberId);

            await updateMemberOrder(updates, assemblyName);
            addToast(`Reordered ${updates.length} members to match tithe book`, "success");
            onSaveComplete();
            handleClose();
        } catch (error) {
            console.error("Failed to apply order:", error);
            addToast("Failed to save new order", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Filter members for manual resolution
    const filteredMembers = searchTerm
        ? memberDatabase.filter(m => {
            const fullName = `${m.Surname} ${m["First Name"]} ${m["Other Names"] || ""}`.toLowerCase();
            const memberId = (m["Membership Number"] || "").toLowerCase();
            return fullName.includes(searchTerm.toLowerCase()) || memberId.includes(searchTerm.toLowerCase());
        }).slice(0, 10)
        : [];

    const unmatchedCount = extractedRows.filter(r => !r.matchedMember).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Reorder from Tithe Book Image"
            size="lg"
            footerContent={
                <>
                    <Button variant="ghost" onClick={handleClose} disabled={isProcessing || isSaving}>
                        Cancel
                    </Button>
                    {step === "upload" && (
                        <Button
                            variant="primary"
                            onClick={handleProcess}
                            disabled={uploadedImages.length === 0 || isProcessing}
                            leftIcon={<Wand2 size={16} />}
                        >
                            Extract Names
                        </Button>
                    )}
                    {step === "preview" && (
                        <Button
                            variant="primary"
                            onClick={handleApplyOrder}
                            disabled={unmatchedCount > 0 || isSaving}
                            isLoading={isSaving}
                            leftIcon={<Check size={16} />}
                        >
                            Apply Order ({extractedRows.filter(r => r.matchedMember).length})
                        </Button>
                    )}
                </>
            }
        >
            <div className="space-y-4">
                {/* Upload Step */}
                {step === "upload" && (
                    <>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Upload an image of the <strong>NO.</strong> and <strong>NAME</strong> columns from your physical tithe book.
                            The AI will extract the names and match them to your database.
                        </p>

                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${uploadedImages.length > 0
                                ? "border-green-500 bg-green-500/10"
                                : "border-[var(--border-color)] hover:border-[var(--primary-accent-start)] hover:bg-[var(--bg-elevated)]"
                                }`}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => {
                                if (uploadedImages.length < 5) fileInputRef.current?.click();
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {imagePreviews.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {imagePreviews.map((preview, idx) => (
                                        <div key={idx} className="relative group">
                                            <img
                                                src={preview}
                                                alt={`Upload ${idx + 1}`}
                                                className="h-24 w-full object-cover rounded-lg shadow-sm"
                                            />
                                            <button
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeImage(idx);
                                                }}
                                            >
                                                <X size={12} />
                                            </button>
                                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                                                {idx + 1}
                                            </span>
                                        </div>
                                    ))}
                                    {uploadedImages.length < 5 && (
                                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--primary-accent-start)] hover:border-[var(--primary-accent-start)] transition-colors">
                                            <div className="text-center">
                                                <Upload size={20} className="mx-auto mb-1" />
                                                <span className="text-xs">Add</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Upload size={48} className="mx-auto text-[var(--text-muted)] mb-3" />
                                    <p className="text-lg font-medium text-[var(--text-primary)]">
                                        Drop images here or click to browse
                                    </p>
                                    <p className="text-sm text-[var(--text-muted)] mt-2">
                                        Support for up to 5 images (JPG, PNG)
                                    </p>
                                </>
                            )}
                        </div>

                        {uploadedImages.length > 0 && (
                            <p className="text-sm text-center text-green-500 font-medium mt-2">
                                ✓ {uploadedImages.length} images selected
                            </p>
                        )}

                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
                            <strong>Tip:</strong> For best results, capture a clear photo with both the NO. and NAME columns visible.
                            The image should include the handwritten names you want to use for ordering.
                        </div>
                    </>
                )}

                {/* Processing Step */}
                {step === "processing" && (
                    <div className="text-center py-12">
                        <RefreshCw size={48} className="mx-auto text-[var(--primary-accent-start)] mb-4 animate-spin" />
                        <p className="text-lg font-medium text-[var(--text-primary)]">
                            Extracting names from image...
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mt-2">
                            This may take a few seconds
                        </p>
                    </div>
                )}

                {/* Preview Step */}
                {step === "preview" && (
                    <>
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Review the extracted names and matches below.
                            </p>
                            {unmatchedCount > 0 && (
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
                                    {unmatchedCount} unmatched
                                </span>
                            )}
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto border border-[var(--border-color)] rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--bg-elevated)] sticky top-0">
                                    <tr>
                                        <th className="p-3 text-left font-medium w-12">#</th>
                                        <th className="p-3 text-left font-medium">Extracted Name</th>
                                        <th className="p-3 text-left font-medium">Matched Member</th>
                                        <th className="p-3 text-center font-medium w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {extractedRows.map((row, index) => (
                                        <tr key={index} className={row.matchedMember ? "" : "bg-amber-500/5"}>
                                            <td className="p-3 text-[var(--primary-accent-start)] font-bold">
                                                {row.position}
                                            </td>
                                            <td className="p-3 text-[var(--text-primary)]">
                                                {row.extractedName}
                                            </td>
                                            <td className="p-3">
                                                {resolvingIndex === index ? (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Search members..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm"
                                                            autoFocus
                                                        />
                                                        {filteredMembers.length > 0 && (
                                                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded max-h-32 overflow-y-auto">
                                                                {filteredMembers.map((m, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="px-3 py-2 hover:bg-[var(--bg-elevated)] cursor-pointer text-sm"
                                                                        onClick={() => handleResolveMember(index, m)}
                                                                    >
                                                                        {m.Surname} {m["First Name"]} ({m["Membership Number"]})
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : row.matchedMember ? (
                                                    <span className="text-green-400">
                                                        {row.matchedMember.Surname} {row.matchedMember["First Name"]}
                                                        {row.isManuallyResolved && (
                                                            <span className="ml-2 text-xs text-blue-400">(manual)</span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-400 flex items-center gap-1">
                                                        <AlertTriangle size={14} /> No match found
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {!row.matchedMember && resolvingIndex !== index && (
                                                    <div className="flex gap-1 justify-center">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setResolvingIndex(index)}
                                                            title="Manually assign member"
                                                        >
                                                            <Wand2 size={14} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleSkipName(index)}
                                                            title="Skip this name"
                                                        >
                                                            <X size={14} />
                                                        </Button>
                                                    </div>
                                                )}
                                                {resolvingIndex === index && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setResolvingIndex(null);
                                                            setSearchTerm("");
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ReorderFromImageModal;
