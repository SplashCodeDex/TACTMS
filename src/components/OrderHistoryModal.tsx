import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { History, Download, RotateCcw, Wand2, GripVertical } from "lucide-react";
import { getOrderHistory, OrderHistoryEntry } from "@/services/memberOrderService";

interface OrderHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    assemblyName: string;
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
}) => {
    const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && assemblyName) {
            setIsLoading(true);
            getOrderHistory(assemblyName)
                .then(setHistory)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, assemblyName]);

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
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {history.map((entry, index) => (
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default OrderHistoryModal;
