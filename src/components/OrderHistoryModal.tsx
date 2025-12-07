import React, { useEffect, useState, useCallback } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { History, Download, RotateCcw, Wand2, GripVertical, Undo2 } from "lucide-react";
import {
    getOrderHistory,
    OrderHistoryEntry,
    getSnapshots,
    OrderSnapshot,
    restoreSnapshot
} from "@/services/memberOrderService";

interface OrderHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    assemblyName: string;
    onRestore?: () => void;  // Callback after restore to refresh parent
    addToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const ACTION_ICONS: Record<OrderHistoryEntry["action"], React.ReactNode> = {
    reorder: <GripVertical size={16} className="text-purple-400" />,
    import: <Download size={16} className="text-blue-400" />,
    reset: <RotateCcw size={16} className="text-red-400" />,
    ai_reorder: <Wand2 size={16} className="text-amber-400" />,
    manual: <GripVertical size={16} className="text-green-400" />,
};

const ACTION_LABELS: Record<OrderHistoryEntry["action"], string> = {
    reorder: "Manual Reorder",
    import: "Imported Order",
    reset: "Order Reset",
    ai_reorder: "AI Reorder",
    manual: "Manual Change",
};

const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
    isOpen,
    onClose,
    assemblyName,
    onRestore,
    addToast,
}) => {
    const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
    const [snapshots, setSnapshots] = useState<OrderSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && assemblyName) {
            setIsLoading(true);
            setConfirmRestoreId(null);  // Reset confirm state when opening
            Promise.all([
                getOrderHistory(assemblyName),
                getSnapshots(assemblyName)
            ])
                .then(([historyData, snapshotsData]) => {
                    setHistory(historyData);
                    setSnapshots(snapshotsData);
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, assemblyName]);

    // Find snapshot for a history entry (snapshot was created BEFORE that action)
    const findSnapshotForEntry = useCallback((entryId: string): OrderSnapshot | undefined => {
        return snapshots.find(s => s.historyEntryId === entryId);
    }, [snapshots]);

    const handleRestore = async (snapshotId: string) => {
        setIsRestoring(true);
        try {
            const result = await restoreSnapshot(snapshotId);
            if (result.success) {
                addToast?.(`Restored order (${result.restoredCount} members)`, "success");
                onRestore?.();
                onClose();
            } else {
                addToast?.(result.error || "Failed to restore", "error");
            }
        } catch (error) {
            console.error("Restore failed:", error);
            addToast?.("Failed to restore order", "error");
        } finally {
            setIsRestoring(false);
            setConfirmRestoreId(null);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Order History - ${assemblyName}`}
            size="md"
            footerContent={
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
            }
        >
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        Loading history...
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8">
                        <History size={48} className="mx-auto text-[var(--text-muted)] mb-3 opacity-50" />
                        <p className="text-[var(--text-muted)]">No order changes recorded yet</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Changes will appear here when you reorder, import, or reset member order.
                        </p>
                    </div>
                ) : (
                    <>
                        {snapshots.length > 0 && (
                            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                <Undo2 size={12} />
                                <span>{snapshots.length} restore point{snapshots.length > 1 ? 's' : ''} available</span>
                            </div>
                        )}
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {history.map((entry, index) => {
                                const snapshot = findSnapshotForEntry(entry.id);
                                const isConfirming = confirmRestoreId === snapshot?.id;

                                return (
                                    <div
                                        key={entry.id}
                                        className={`flex gap-3 p-3 rounded-lg border ${index === 0
                                            ? "bg-[var(--primary-accent-start)]/10 border-[var(--primary-accent-start)]/30"
                                            : "bg-[var(--bg-elevated)] border-[var(--border-color)]"
                                            }`}
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            {ACTION_ICONS[entry.action]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-[var(--text-primary)]">
                                                    {ACTION_LABELS[entry.action]}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 bg-[var(--bg-card)] rounded-full text-[var(--text-muted)]">
                                                    {entry.affectedCount} members
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                                {entry.description}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                {formatDate(entry.timestamp)}
                                            </p>
                                        </div>
                                        {/* Restore button if snapshot exists */}
                                        {snapshot && (
                                            <div className="flex-shrink-0 flex items-center">
                                                {isConfirming ? (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            onClick={() => handleRestore(snapshot.id)}
                                                            disabled={isRestoring}
                                                            isLoading={isRestoring}
                                                        >
                                                            Confirm
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setConfirmRestoreId(null)}
                                                            disabled={isRestoring}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setConfirmRestoreId(snapshot.id)}
                                                        title="Restore to this point"
                                                        leftIcon={<Undo2 size={14} />}
                                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                    >
                                                        Restore
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default OrderHistoryModal;
