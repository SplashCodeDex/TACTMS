import React, { useState, useCallback, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { GripVertical, Save, RotateCcw, Search, MoveVertical, X, ArrowRightToLine } from "lucide-react";
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
    onMoveClick: (member: MemberOrderEntry) => void;
}

const SortableMemberRow: React.FC<SortableMemberRowProps> = ({ member, index, onMoveClick }) => {
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg mb-2 ${isDragging ? "shadow-lg ring-2 ring-[var(--primary-accent-start)]" : ""
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
                    {member.displayName}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                    {member.memberId}
                </p>
            </div>
            {member.titheBookIndex !== index + 1 && (
                <div className="text-xs text-orange-500 font-medium">
                    was #{member.titheBookIndex}
                </div>
            )}
            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onMoveClick(member);
                }}
                title="Move to Target Position"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <ArrowRightToLine size={16} className="text-[var(--primary-accent-start)]" />
            </Button>
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
    const [targetPosition, setTargetPosition] = useState("1");
    const [selectedMember, setSelectedMember] = useState<MemberOrderEntry | null>(null);

    // Initialize members when modal opens
    useEffect(() => {
        if (isOpen && orderedMembers.length > 0) {
            setMembers([...orderedMembers]);
            setHasChanges(false);
            setSearchTerm("");
            setSelectedMember(null);
            setTargetPosition("1");
        }
    }, [isOpen, orderedMembers]);

    // Filter members by search term (moved up for access in effect)
    const filteredMembers = searchTerm
        ? members.filter(
            (m) =>
                m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.memberId.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : members;

    // Auto-select first result when searching
    useEffect(() => {
        if (searchTerm && filteredMembers.length > 0) {
            setSelectedMember(filteredMembers[0]);
        } else if (searchTerm && filteredMembers.length === 0) {
            setSelectedMember(null);
        }
    }, [searchTerm, members]); // depend on members to re-select if list changes (e.g. after move)

    // Handle move to target position (Quick Move)
    const handleMoveToPosition = useCallback((memberToMove: MemberOrderEntry | null = selectedMember) => {
        if (!memberToMove) return;

        const targetPos = parseInt(targetPosition, 10);
        if (isNaN(targetPos) || targetPos < 1 || targetPos > members.length) {
            addToast(`Invalid position. Enter 1-${members.length}`, "error");
            return;
        }

        const oldIndex = members.findIndex((m) => m.id === memberToMove.id);
        if (oldIndex === -1) return;

        const newIndex = targetPos - 1;
        setMembers((items) => arrayMove(items, oldIndex, newIndex));
        setHasChanges(true);

        addToast(`Moved "${memberToMove.displayName}" to #${targetPos}`, "success");
        setTargetPosition(String(Math.min(targetPos + 1, members.length)));

        // Reset selection if it was a search-based move
        if (selectedMember && selectedMember.id === memberToMove.id) {
            setSearchTerm("");
            setSelectedMember(null);
        }
    }, [selectedMember, targetPosition, members, addToast]);

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
                    Drag and drop to reorder.
                    Or use <b>Target Pos</b> to quickly move members: set the position number, then click the <ArrowRightToLine size={14} className="inline text-[var(--primary-accent-start)]" /> icon on a row.
                </p>

                {/* Search and Target Position */}
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && selectedMember) {
                                    e.preventDefault();
                                    handleMoveToPosition();
                                } else if (e.key === "Escape") {
                                    setSelectedMember(null);
                                    setSearchTerm("");
                                }
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--primary-accent-start)] focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap">
                            Target Pos:
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={members.length || 1}
                            value={targetPosition}
                            onChange={(e) => setTargetPosition(e.target.value)}
                            className="w-16 px-2 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-center focus:ring-2 focus:ring-[var(--primary-accent-start)]"
                        />
                    </div>
                </div>

                {/* Selected member info (for search-based selection) */}
                {selectedMember && (
                    <div className="p-2.5 bg-[var(--primary-accent-start)]/10 border border-[var(--primary-accent-start)]/30 rounded-lg text-sm flex items-center justify-between">
                        <span>
                            Move <strong className="text-[var(--text-primary)]">{selectedMember.displayName}</strong> to position{" "}
                            <strong className="text-[var(--text-primary)]">{targetPosition}</strong>? Press Enter or click Move.
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedMember(null)}
                                leftIcon={<X size={14} />}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleMoveToPosition()}
                                leftIcon={<MoveVertical size={14} />}
                            >
                                Move
                            </Button>
                        </div>
                    </div>
                )}

                {searchTerm && !selectedMember && (
                    <p className="text-xs text-amber-500">
                        ⚠️ Drag disabled while searching. Use Target Pos & clicking to move.
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
                                        onMoveClick={handleMoveToPosition}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        // When searching, show filtered results
                        filteredMembers.map((member) => {
                            const originalIndex = members.findIndex((m) => m.id === member.id);
                            const isSelected = selectedMember?.id === member.id;
                            return (
                                <div
                                    key={member.id}
                                    onClick={() => setSelectedMember(member)}
                                    className={`group flex items-center gap-3 p-3 bg-[var(--bg-card)] border rounded-lg mb-2 cursor-pointer transition-all ${isSelected
                                        ? "border-[var(--primary-accent-start)] ring-2 ring-[var(--primary-accent-start)]/30 bg-[var(--primary-accent-start)]/5"
                                        : "border-[var(--border-color)] hover:bg-[var(--bg-elevated)]"
                                        }`}
                                >
                                    <div className="p-1 opacity-30">
                                        <GripVertical size={18} className="text-[var(--text-muted)]" />
                                    </div>
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm ${isSelected ? "bg-[var(--primary-accent-start)] text-white" : "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                                        }`}>
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
                                    {isSelected && (
                                        <div className="text-xs text-[var(--primary-accent-start)] font-medium">
                                            Selected
                                        </div>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMoveToPosition(member);
                                        }}
                                        title="Move to Target Position"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <ArrowRightToLine size={16} className="text-[var(--primary-accent-start)]" />
                                    </Button>
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
