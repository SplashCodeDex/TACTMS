import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { Upload, Wand2, Check, X, AlertTriangle, RefreshCw, ArrowRight, Eye, RotateCcw, Zap, Download, FileUp, GitCompare } from "lucide-react";
import { MemberRecordA } from "@/types";
import { applyNewOrder, createSnapshot, saveLearnedAlias, getAliasMap, logOrderChange, restoreSnapshot, getLatestSnapshot, exportOrderForAssembly, importOrderForAssembly, OrderExport } from "@/services/memberOrderService";
import { extractNamesFromTitheBook } from "@/services/imageProcessor";

interface ReorderFromImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    assemblyName: string;
    memberDatabase: MemberRecordA[];
    onSaveComplete: () => void;
    addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
    memberOrderMap?: Map<string, number>; // For positional hints
}

type ModalStep = "upload" | "processing" | "preview" | "resolving" | "diff" | "compare";

interface ExtractedNameRow {
    position: number;
    extractedName: string;
    matchedMember: MemberRecordA | null;
    matchScore: number;
    isManuallyResolved: boolean;
    alternatives: Array<{ member: MemberRecordA; score: number }>; // Top suggestions
}

interface OrderChange {
    memberId: string;
    memberName: string;
    currentPosition: number | null;  // null if not in current order
    newPosition: number;
    changeType: 'moved' | 'unchanged' | 'new';
    included: boolean;  // Whether to apply this change
}

const ReorderFromImageModal: React.FC<ReorderFromImageModalProps> = ({
    isOpen,
    onClose,
    assemblyName,
    memberDatabase,
    onSaveComplete,
    addToast,
    memberOrderMap,
}) => {
    const [step, setStep] = useState<ModalStep>("upload");
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [extractedRows, setExtractedRows] = useState<ExtractedNameRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [orderChanges, setOrderChanges] = useState<OrderChange[]>([]);
    const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Compute order changes for diff view
    const computeOrderChanges = useCallback(() => {
        const validRows = extractedRows.filter(r => r.matchedMember);
        const changes: OrderChange[] = [];

        for (const row of validRows) {
            const member = row.matchedMember!;
            const memberId = (member["Membership Number"] || member["Old Membership Number"] || "").toLowerCase();
            const memberName = `${member.Surname || ""} ${member["First Name"] || ""}`.trim();
            const currentPos = memberOrderMap?.get(memberId) ?? null;
            const newPos = row.position;

            let changeType: 'moved' | 'unchanged' | 'new';
            if (currentPos === null) {
                changeType = 'new';
            } else if (currentPos === newPos) {
                changeType = 'unchanged';
            } else {
                changeType = 'moved';
            }

            changes.push({
                memberId,
                memberName,
                currentPosition: currentPos,
                newPosition: newPos,
                changeType,
                included: true, // Default to include all
            });
        }

        // Sort by new position
        changes.sort((a, b) => a.newPosition - b.newPosition);
        return changes;
    }, [extractedRows, memberOrderMap]);

    // Stats for diff view
    const diffStats = useMemo(() => {
        const moved = orderChanges.filter(c => c.changeType === 'moved').length;
        const unchanged = orderChanges.filter(c => c.changeType === 'unchanged').length;
        const newEntries = orderChanges.filter(c => c.changeType === 'new').length;
        // 'selected' should only count actionable changes (not unchanged)
        const selected = orderChanges.filter(c => c.included && c.changeType !== 'unchanged').length;
        return { moved, unchanged, new: newEntries, selected, total: orderChanges.length };
    }, [orderChanges]);

    // Reset state when modal opens/closes
    const handleClose = useCallback(() => {
        // Prevent closing while save is in progress
        if (isSaving) return;

        setStep("upload");
        setUploadedImages([]);
        setImagePreviews([]);
        setExtractedRows([]);
        setIsProcessing(false);
        setResolvingIndex(null);
        setSearchTerm("");
        setOrderChanges([]);  // Reset diff state
        onClose();
    }, [onClose, isSaving]);

    // Handle image upload
    const handleImageSelect = useCallback((files: File[]) => {
        // Calculate how many more we can add
        const remainingSlots = 5 - uploadedImages.length;
        if (remainingSlots <= 0) {
            addToast("Maximum 5 images allowed", "warning");
            return;
        }

        const filesToAdd = files.slice(0, remainingSlots);

        // Filter valid image files
        const validFiles: File[] = [];
        filesToAdd.forEach(file => {
            if (!file.type.startsWith("image/")) {
                addToast(`Skipping non-image file: ${file.name}`, "warning");
                return;
            }
            validFiles.push(file);
        });

        if (validFiles.length === 0) return;

        // Load previews in order using Promise.all to avoid race condition
        const loadPreview = (file: File): Promise<string> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        };

        Promise.all(validFiles.map(loadPreview)).then((previews) => {
            setImagePreviews(prev => [...prev, ...previews]);
        });

        setUploadedImages(prev => [...prev, ...validFiles]);
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

            // Load learned aliases for this assembly
            const aliasMap = await getAliasMap(assemblyName);
            if (aliasMap.size > 0) {
                console.log(`Loaded ${aliasMap.size} learned aliases for ${assemblyName}`);
            }

            // Process sequentially with per-image error handling
            setProcessingProgress({ current: 0, total: uploadedImages.length });
            for (let i = 0; i < uploadedImages.length; i++) {
                setProcessingProgress({ current: i + 1, total: uploadedImages.length });
                try {
                    // Pass memberOrderMap for positional hints and aliasMap for learned names
                    const result = await extractNamesFromTitheBook(uploadedImages[i], apiKey, memberDatabase, memberOrderMap, aliasMap);

                    const pageRows: ExtractedNameRow[] = result.matches.map((match) => ({
                        position: match.position,
                        extractedName: match.extractedName,
                        matchedMember: match.matchedMember,
                        matchScore: match.confidence,
                        isManuallyResolved: false,
                        alternatives: match.alternatives || [],
                    }));

                    allRows.push(...pageRows);
                } catch (imgError) {
                    console.error(`Failed to process image ${i + 1}:`, imgError);
                    addToast(`Failed to process image ${i + 1}: ${imgError instanceof Error ? imgError.message : "Unknown error"}`, "warning");
                    // Continue with remaining images
                }
            }

            // Sort by extracted position to keep order
            allRows.sort((a, b) => a.position - b.position);

            // Multi-page merge: deduplicate by position (keep highest confidence match)
            const seenPositions = new Map<number, ExtractedNameRow>();
            const seenMemberIds = new Set<string>();
            let duplicatesRemoved = 0;

            for (const row of allRows) {
                const memberId = row.matchedMember
                    ? (row.matchedMember["Membership Number"] || row.matchedMember["Old Membership Number"] || "").toLowerCase()
                    : null;

                // Check for duplicate position
                const existingByPosition = seenPositions.get(row.position);
                if (existingByPosition) {
                    // Keep the one with higher match score
                    if (row.matchScore > existingByPosition.matchScore) {
                        seenPositions.set(row.position, row);
                    }
                    duplicatesRemoved++;
                    continue;
                }

                // Check for duplicate member (same member matched twice at different positions)
                if (memberId && seenMemberIds.has(memberId)) {
                    duplicatesRemoved++;
                    continue;
                }

                seenPositions.set(row.position, row);
                if (memberId) seenMemberIds.add(memberId);
            }

            // Convert map to array, sorted by position
            const finalRows = Array.from(seenPositions.values())
                .sort((a, b) => a.position - b.position);

            if (duplicatesRemoved > 0) {
                addToast(`Merged ${duplicatesRemoved} duplicate entries across pages`, "info");
            }

            setExtractedRows(finalRows);
            const unmatchedCount = finalRows.filter(r => !r.matchedMember).length;

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
    const handleResolveMember = useCallback(async (rowIndex: number, member: MemberRecordA) => {
        const row = extractedRows[rowIndex];

        // Save the learned alias for future use
        if (row && row.extractedName) {
            try {
                await saveLearnedAlias(assemblyName, row.extractedName, member);
                console.log(`Learned alias: "${row.extractedName}" → "${member["First Name"]} ${member.Surname}"`);
            } catch (error) {
                console.warn("Failed to save alias:", error);
            }
        }

        setExtractedRows(prev => prev.map((r, i) =>
            i === rowIndex ? { ...r, matchedMember: member, matchScore: 1.0, isManuallyResolved: true } : r
        ));
        setResolvingIndex(null);
        setSearchTerm("");
    }, [assemblyName, extractedRows]);

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
            // Extract ordered member IDs for atomic reorder
            const orderedMemberIds = validRows.map((row) =>
                row.matchedMember!["Membership Number"] || row.matchedMember!["Old Membership Number"] || ""
            ).filter(Boolean);

            // Generate a unique history ID to link snapshot and history entry
            const historyId = `ai-reorder-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

            // Create snapshot before reorder (for undo)
            await createSnapshot(assemblyName, historyId);

            await applyNewOrder(orderedMemberIds, assemblyName);

            // Log history entry with SAME ID so snapshot can be linked
            await logOrderChange({
                assemblyName,
                action: 'ai_reorder',
                timestamp: Date.now(),
                description: `AI reordered ${orderedMemberIds.length} members from tithe book image`,
                affectedCount: orderedMemberIds.length,
            }, historyId);

            addToast(`Reordered ${orderedMemberIds.length} members to match tithe book`, "success");
            onSaveComplete();
            handleClose();
        } catch (error) {
            console.error("Failed to apply order:", error);
            addToast("Failed to save new order", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Open diff view
    const handleReviewChanges = useCallback(() => {
        const changes = computeOrderChanges();
        setOrderChanges(changes);
        setStep("diff");
    }, [computeOrderChanges]);

    // Toggle change inclusion by index (not memberId, to handle duplicates)
    const toggleChangeInclusion = useCallback((index: number) => {
        setOrderChanges(prev => prev.map((c, i) =>
            i === index ? { ...c, included: !c.included } : c
        ));
    }, []);

    // Toggle all changes
    const toggleAllChanges = useCallback((included: boolean) => {
        setOrderChanges(prev => prev.map(c => ({ ...c, included })));
    }, []);

    // Apply only selected changes
    const handleApplySelected = async () => {
        const selectedChanges = orderChanges.filter(c => c.included && c.changeType !== 'unchanged');

        if (selectedChanges.length === 0) {
            addToast("No changes selected to apply", "warning");
            return;
        }

        setIsSaving(true);
        try {
            // Extract ordered member IDs for atomic reorder (only selected changes)
            // Sort by newPosition to preserve the correct order
            const orderedMemberIds = selectedChanges
                .sort((a, b) => a.newPosition - b.newPosition)
                .map(c => c.memberId)
                .filter(Boolean);

            // Generate a unique history ID to link snapshot and history entry
            const historyId = `ai-reorder-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

            // Create snapshot before reorder (for undo)
            await createSnapshot(assemblyName, historyId);

            await applyNewOrder(orderedMemberIds, assemblyName);

            // Log history entry with SAME ID so snapshot can be linked
            await logOrderChange({
                assemblyName,
                action: 'ai_reorder',
                timestamp: Date.now(),
                description: `AI reordered ${orderedMemberIds.length} members (selected from diff view)`,
                affectedCount: orderedMemberIds.length,
            }, historyId);

            addToast(`Applied ${orderedMemberIds.length} order changes`, "success");
            onSaveComplete();
            handleClose();
        } catch (error) {
            console.error("Failed to apply changes:", error);
            addToast("Failed to apply changes", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Undo last reorder using snapshot
    const handleUndo = async () => {
        setIsSaving(true);
        try {
            const latestSnapshot = await getLatestSnapshot(assemblyName);
            if (!latestSnapshot) {
                addToast("No previous order to restore", "warning");
                return;
            }
            const result = await restoreSnapshot(latestSnapshot.id);
            if (result.success) {
                addToast(`Restored previous order (${result.restoredCount} members)`, "success");
                onSaveComplete();
            } else {
                addToast(result.error || "Failed to restore", "error");
            }
        } catch (error) {
            console.error("Failed to undo:", error);
            addToast("Failed to undo", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Export current order as JSON
    const handleExportOrder = async () => {
        try {
            const exportData = await exportOrderForAssembly(assemblyName);
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${assemblyName.replace(/\s+/g, "_")}_order_${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            addToast(`Exported order for ${exportData.memberCount} members`, "success");
        } catch (error) {
            console.error("Export failed:", error);
            addToast("Failed to export order", "error");
        }
    };

    // Import order from JSON file
    const handleImportOrder = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data: OrderExport = JSON.parse(ev.target?.result as string);
                const result = await importOrderForAssembly(data, assemblyName);
                if (result.success) {
                    addToast(`Imported order: ${result.imported} updated, ${result.skipped} skipped`, "success");
                    onSaveComplete();
                } else {
                    addToast(`Import failed: ${result.errors.join(", ")}`, "error");
                }
            } catch (error) {
                console.error("Import failed:", error);
                addToast("Invalid JSON file", "error");
            }
        };
        reader.readAsText(file);
        e.target.value = ""; // Reset input
    };

    const importInputRef = useRef<HTMLInputElement>(null);

    // Batch auto-assign: assign best alternative to all unmatched rows
    const handleBatchResolve = useCallback(async () => {
        let resolved = 0;
        for (let i = 0; i < extractedRows.length; i++) {
            const row = extractedRows[i];
            if (!row.matchedMember && row.alternatives.length > 0) {
                const bestAlt = row.alternatives[0];
                if (bestAlt.score > 0.6) {
                    await handleResolveMember(i, bestAlt.member);
                    resolved++;
                }
            }
        }
        if (resolved > 0) {
            addToast(`Auto-assigned ${resolved} matches`, "success");
        } else {
            addToast("No confident matches available", "info");
        }
    }, [extractedRows, handleResolveMember, addToast]);

    // Keyboard navigation for diff view
    const [focusedDiffIndex, setFocusedDiffIndex] = useState<number | null>(null);

    useEffect(() => {
        if (step !== "diff") return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedDiffIndex(prev =>
                    prev === null ? 0 : Math.min(prev + 1, orderChanges.length - 1)
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedDiffIndex(prev =>
                    prev === null ? 0 : Math.max(prev - 1, 0)
                );
            } else if ((e.key === "Enter" || e.key === " ") && focusedDiffIndex !== null) {
                e.preventDefault();
                toggleChangeInclusion(focusedDiffIndex);
            } else if (e.key === "Escape") {
                e.preventDefault();
                setStep("preview");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [step, focusedDiffIndex, orderChanges.length, toggleChangeInclusion]);

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
                        <>
                            <Button
                                variant="ghost"
                                onClick={handleUndo}
                                disabled={isSaving}
                                leftIcon={<RotateCcw size={16} />}
                                title="Restore previous order"
                            >
                                Undo
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={handleExportOrder}
                                disabled={isSaving}
                                leftIcon={<Download size={16} />}
                                title="Export current order as JSON"
                            >
                                Export
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => importInputRef.current?.click()}
                                disabled={isSaving}
                                leftIcon={<FileUp size={16} />}
                                title="Import order from JSON"
                            >
                                Import
                            </Button>
                            <input
                                ref={importInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImportOrder}
                                className="hidden"
                            />
                            {unmatchedCount > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={handleBatchResolve}
                                    disabled={isSaving}
                                    leftIcon={<Zap size={16} />}
                                    title="Auto-assign confident matches"
                                >
                                    Auto-Assign
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                onClick={handleReviewChanges}
                                disabled={unmatchedCount > 0 || isSaving}
                                leftIcon={<Eye size={16} />}
                            >
                                Review Changes
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleApplyOrder}
                                disabled={unmatchedCount > 0 || isSaving}
                                isLoading={isSaving}
                                leftIcon={<Check size={16} />}
                            >
                                Apply All ({extractedRows.filter(r => r.matchedMember).length})
                            </Button>
                        </>
                    )}
                    {step === "diff" && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => setStep("preview")}
                                disabled={isSaving}
                            >
                                Back
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setStep("compare")}
                                disabled={isSaving}
                                leftIcon={<GitCompare size={16} />}
                            >
                                Side-by-Side
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleApplySelected}
                                disabled={diffStats.selected === 0 || isSaving}
                                isLoading={isSaving}
                                leftIcon={<Check size={16} />}
                            >
                                Apply Selected ({diffStats.selected})
                            </Button>
                        </>
                    )}
                    {step === "compare" && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => setStep("diff")}
                                disabled={isSaving}
                            >
                                Back to Diff
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleApplySelected}
                                disabled={diffStats.selected === 0 || isSaving}
                                isLoading={isSaving}
                                leftIcon={<Check size={16} />}
                            >
                                Apply Selected ({diffStats.selected})
                            </Button>
                        </>
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
                            {processingProgress.total > 1
                                ? `Processing image ${processingProgress.current} of ${processingProgress.total}...`
                                : "Extracting names from image..."
                            }
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mt-2">
                            This may take a few seconds
                        </p>
                        {processingProgress.total > 1 && (
                            <div className="mt-4 w-48 mx-auto bg-[var(--bg-secondary)] rounded-full h-2">
                                <div
                                    className="bg-[var(--primary-accent-start)] h-2 rounded-full transition-all"
                                    style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                                />
                            </div>
                        )}
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
                                                    <div className="space-y-1">
                                                        <span className="text-amber-400 flex items-center gap-1">
                                                            <AlertTriangle size={14} /> No match found
                                                        </span>
                                                        {/* Show alternatives as clickable suggestions */}
                                                        {row.alternatives.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                <span className="text-xs text-[var(--text-muted)]">Suggestions:</span>
                                                                {row.alternatives.map((alt, altIdx) => (
                                                                    <button
                                                                        key={altIdx}
                                                                        className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/40 transition-colors"
                                                                        onClick={() => handleResolveMember(index, alt.member)}
                                                                        title={`Score: ${(alt.score * 100).toFixed(0)}%`}
                                                                    >
                                                                        {alt.member.Surname} {alt.member["First Name"]}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
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

                {/* Diff View Step */}
                {step === "diff" && (
                    <>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Review changes before applying. Uncheck changes you want to skip.
                            </p>
                            <div className="flex gap-2 text-xs">
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                                    {diffStats.moved} moved
                                </span>
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                                    {diffStats.unchanged} same
                                </span>
                                {diffStats.new > 0 && (
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                        {diffStats.new} new
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Select/Deselect All */}
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleAllChanges(true)}
                            >
                                Select All
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleAllChanges(false)}
                            >
                                Deselect All
                            </Button>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto border border-[var(--border-color)] rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--bg-elevated)] sticky top-0">
                                    <tr>
                                        <th className="p-3 text-center font-medium w-10">✓</th>
                                        <th className="p-3 text-left font-medium">Member</th>
                                        <th className="p-3 text-center font-medium w-20">Current</th>
                                        <th className="p-3 text-center font-medium w-16">Delta</th>
                                        <th className="p-3 text-center font-medium w-20">New</th>
                                        <th className="p-3 text-center font-medium w-24">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {orderChanges.map((change, idx) => {
                                        const delta = change.currentPosition !== null
                                            ? change.newPosition - change.currentPosition
                                            : null;
                                        return (
                                            <tr
                                                key={`${change.memberId}-${change.newPosition}-${idx}`}
                                                className={`${change.included ? "" : "opacity-50"} ${focusedDiffIndex === idx ? "ring-2 ring-[var(--primary-accent-start)] ring-inset" : ""} ${change.changeType === 'moved'
                                                    ? "bg-yellow-500/5"
                                                    : change.changeType === 'new'
                                                        ? "bg-blue-500/5"
                                                        : ""
                                                    }`}
                                            >
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={change.included}
                                                        onChange={() => toggleChangeInclusion(idx)}
                                                        className="w-4 h-4 rounded border-[var(--border-color)] accent-[var(--primary-accent-start)]"
                                                    />
                                                </td>
                                                <td className="p-3 text-[var(--text-primary)]">
                                                    {change.memberName}
                                                </td>
                                                <td className="p-3 text-center font-mono text-[var(--text-muted)]">
                                                    {change.currentPosition ?? "—"}
                                                </td>
                                                <td className="p-3 text-center font-mono font-bold">
                                                    {delta === null ? (
                                                        <span className="text-blue-400">new</span>
                                                    ) : delta === 0 ? (
                                                        <span className="text-[var(--text-muted)]">—</span>
                                                    ) : delta > 0 ? (
                                                        <span className="text-red-400">+{delta}</span>
                                                    ) : (
                                                        <span className="text-green-400">{delta}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-mono font-bold text-[var(--primary-accent-start)]">
                                                    {change.newPosition}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {change.changeType === 'moved' && (
                                                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                                                            Moved
                                                        </span>
                                                    )}
                                                    {change.changeType === 'unchanged' && (
                                                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                                            Same
                                                        </span>
                                                    )}
                                                    {change.changeType === 'new' && (
                                                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                                            New
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Side-by-Side Comparison View */}
                {step === "compare" && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                Side-by-Side Order Comparison
                            </p>
                            <span className="text-xs text-[var(--text-muted)]">
                                {diffStats.moved} moves, {diffStats.newMembers} new
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 max-h-[60vh]">
                            {/* Current Order Column */}
                            <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                                <div className="bg-[var(--bg-elevated)] p-3 border-b border-[var(--border-color)]">
                                    <h4 className="font-medium text-sm text-[var(--text-primary)]">Current Order</h4>
                                </div>
                                <div className="max-h-[50vh] overflow-y-auto">
                                    {orderChanges
                                        .filter(c => c.currentPosition !== null)
                                        .sort((a, b) => (a.currentPosition ?? 0) - (b.currentPosition ?? 0))
                                        .map((change, idx) => (
                                            <div
                                                key={`current-${change.memberId}-${idx}`}
                                                className={`p-2 flex items-center gap-2 text-sm border-b border-[var(--border-color)] last:border-b-0 ${change.changeType === 'moved' ? 'bg-yellow-500/10' : ''
                                                    }`}
                                            >
                                                <span className="w-8 text-center font-mono text-[var(--text-muted)]">
                                                    {change.currentPosition}
                                                </span>
                                                <span className="flex-1 truncate text-[var(--text-primary)]">
                                                    {change.memberName}
                                                </span>
                                                {change.changeType === 'moved' && (
                                                    <ArrowRight size={14} className="text-yellow-400 shrink-0" />
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Proposed Order Column */}
                            <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                                <div className="bg-[var(--bg-elevated)] p-3 border-b border-[var(--border-color)]">
                                    <h4 className="font-medium text-sm text-[var(--text-primary)]">Proposed Order</h4>
                                </div>
                                <div className="max-h-[50vh] overflow-y-auto">
                                    {orderChanges
                                        .filter(c => c.included)
                                        .sort((a, b) => a.newPosition - b.newPosition)
                                        .map((change, idx) => {
                                            const delta = change.currentPosition !== null
                                                ? change.newPosition - change.currentPosition
                                                : null;
                                            return (
                                                <div
                                                    key={`proposed-${change.memberId}-${idx}`}
                                                    className={`p-2 flex items-center gap-2 text-sm border-b border-[var(--border-color)] last:border-b-0 ${change.changeType === 'new' ? 'bg-blue-500/10' :
                                                            change.changeType === 'moved' ? 'bg-green-500/10' : ''
                                                        }`}
                                                >
                                                    <span className="w-8 text-center font-mono text-[var(--primary-accent-start)] font-bold">
                                                        {change.newPosition}
                                                    </span>
                                                    <span className="flex-1 truncate text-[var(--text-primary)]">
                                                        {change.memberName}
                                                    </span>
                                                    {delta !== null && delta !== 0 && (
                                                        <span className={`text-xs font-mono ${delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                            {delta > 0 ? `+${delta}` : delta}
                                                        </span>
                                                    )}
                                                    {change.changeType === 'new' && (
                                                        <span className="text-xs text-blue-400">new</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ReorderFromImageModal;
