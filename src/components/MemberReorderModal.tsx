import React, { useState, useCallback, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { GripVertical, Save, RotateCcw, Search } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MemberOrderEntry, updateMemberOrder } from "@/services/memberOrderService";

interface MemberReorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    assemblyName: string;
    orderedMembers: MemberOrderEntry[];
    onSaveComplete: () => void;
    addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

interface SortableMemberRowProps {
    member: MemberOrderEntry;
    index: number;
    searchTerm: string;
}

const SortableMemberRow: React.FC<SortableMemberRowProps> = ({ member, index, searchTerm }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: member.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : "auto",
    };

    // Highlight matching text
    const highlightMatch = (text: string) => {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${searchTerm})`, "gi");
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg mb-2 ${isDragging ? "shadow-lg ring-2 ring-[var(--primary-accent-start)]" : ""
                } hover:bg-[var(--bg-elevated)] transition-colors`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-[var(--bg-secondary)] rounded"
            >
                <GripVertical size={18} className="text-[var(--text-muted)]" />
            </div>
            <div className="w-10 h-10 flex items-center justify-center bg-[var(--primary-accent-start)] text-white rounded-full font-bold text-sm">
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {highlightMatch(member.displayName)}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                    {highlightMatch(member.memberId)}
                </p>
            </div>
            {member.titheBookIndex !== index + 1 && (
                <div className="text-xs text-orange-500 font-medium">
                    was #{member.titheBookIndex}
                </div>
            )}
        </div>
    );
};

const MemberReorderModal: React.FC<MemberReorderModalProps> = ({
    isOpen,
    onClose,
    assemblyName,
    orderedMembers,
    onSaveComplete,
    addToast,
}) => {
    const [members, setMembers] = useState<MemberOrderEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize members when modal opens
    useEffect(() => {
        if (isOpen && orderedMembers.length > 0) {
            setMembers([...orderedMembers]);
            setHasChanges(false);
            setSearchTerm("");
        }
    }, [isOpen, orderedMembers]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setMembers((items) => {
                const oldIndex = items.findIndex((m) => m.id === active.id);
                const newIndex = items.findIndex((m) => m.id === over.id);
                setHasChanges(true);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }, []);

    const handleReset = useCallback(() => {
        setMembers([...orderedMembers]);
        setHasChanges(false);
    }, [orderedMembers]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates = members.map((member, index) => ({
                memberId: member.memberId,
                newIndex: index + 1,
            }));

            await updateMemberOrder(updates, assemblyName);
            addToast(`Member order saved for ${assemblyName}`, "success");
            setHasChanges(false);
            onSaveComplete();
            onClose();
        } catch (error) {
            console.error("Failed to save member order:", error);
            addToast("Failed to save member order", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Filter members by search term
    const filteredMembers = searchTerm
        ? members.filter(
            (m) =>
                m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.memberId.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : members;

    // Check if we can reorder (not filtered)
    const canReorder = !searchTerm;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Reorder Members - ${assemblyName}`}
            size="lg"
            footerContent={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleReset}
                        disabled={!hasChanges || isSaving}
                        leftIcon={<RotateCcw size={16} />}
                    >
                        Reset
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        isLoading={isSaving}
                        leftIcon={<Save size={16} />}
                    >
                        Save Order
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {/* Instructions */}
                <p className="text-sm text-[var(--text-secondary)]">
                    Drag and drop members to reorder them to match your physical tithe book.
                    The order will be saved and used across the application.
                </p>

                {/* Search */}
                <div className="relative">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        size={18}
                    />
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--primary-accent-start)] focus:border-transparent"
                    />
                </div>

                {searchTerm && (
                    <p className="text-xs text-amber-500">
                        ⚠️ Drag to reorder is disabled while searching. Clear search to reorder.
                    </p>
                )}

                {/* Member Count */}
                <div className="flex justify-between items-center text-sm text-[var(--text-muted)]">
                    <span>
                        {filteredMembers.length} of {members.length} members
                    </span>
                    {hasChanges && (
                        <span className="text-orange-500 font-medium">Unsaved changes</span>
                    )}
                </div>

                {/* Member List */}
                <div className="max-h-[50vh] overflow-y-auto pr-2">
                    {canReorder ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={members.map((m) => m.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {members.map((member, index) => (
                                    <SortableMemberRow
                                        key={member.id}
                                        member={member}
                                        index={index}
                                        searchTerm=""
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        // When searching, show filtered results without drag
                        filteredMembers.map((member) => {
                            const originalIndex = members.findIndex((m) => m.id === member.id);
                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg mb-2"
                                >
                                    <div className="p-1 opacity-30">
                                        <GripVertical size={18} className="text-[var(--text-muted)]" />
                                    </div>
                                    <div className="w-10 h-10 flex items-center justify-center bg-[var(--primary-accent-start)] text-white rounded-full font-bold text-sm">
                                        {originalIndex + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {member.displayName
                                                .split(new RegExp(`(${searchTerm})`, "gi"))
                                                .map((part, i) =>
                                                    part.toLowerCase() === searchTerm.toLowerCase() ? (
                                                        <span
                                                            key={i}
                                                            className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5"
                                                        >
                                                            {part}
                                                        </span>
                                                    ) : (
                                                        part
                                                    )
                                                )}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] truncate">
                                            {member.memberId}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default MemberReorderModal;
