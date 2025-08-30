import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { TitheRecordB } from "../types";
import Button from "./Button";
import Modal from "./Modal";
import { formatDateDDMMMYYYY } from "../services/excelProcessor";
import {
  Save,
  Trash2,
  Columns3,
  UserPlus,
  Search,
  GripVertical,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MagicCard } from "./MagicCard";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ToastMessage, ToastAction } from "./Toast"; // Only for type
import { COLUMN_VISIBILITY_STORAGE_KEY } from "../constants";

const HighlightMatches = React.memo(
  ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight || !text) {
      return <>{text}</>;
    }
    // Create a regex to find all occurrences of any of the highlight words, case-insensitive
    const highlightWords = highlight.toLowerCase().split(" ").filter(Boolean);
    if (highlightWords.length === 0) {
      return <>{text}</>;
    }

    const regex = new RegExp(`(${highlightWords.join("|")})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          highlightWords.includes(part.toLowerCase()) ? (
            <mark
              key={i}
              className="bg-[var(--primary-accent-start)] text-[var(--text-on-accent)] px-0.5 rounded-sm"
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  },
);
HighlightMatches.displayName = "HighlightMatches";

interface TitheRecordRowProps {
  record: TitheRecordB;
  visualIndex: number;
  handleDeleteTitheRecord: (recordNo: number | string) => void;
  startEditing: (recordNo: number | string, field: keyof TitheRecordB) => void;
  editingCell: { recordId: number | string; field: keyof TitheRecordB } | null;
  editedValue: string;
  setEditedValue: (value: string) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  toggleRowSelection: (recordNo: number | string) => void;
  isSelected: boolean;
  navigateToNextAmountCellForEditing: (
    currentRecordId: number | string,
    direction: "down" | "up",
  ) => void;
  visibleTableHeaders: Array<keyof TitheRecordB>;
  searchTerm: string;
}

// Row component with integrated DnD logic
const TitheRecordRow: React.FC<TitheRecordRowProps> = ({
  record,
  visualIndex,
  handleDeleteTitheRecord,
  startEditing,
  editingCell,
  editedValue,
  setEditedValue,
  saveEdit,
  cancelEdit,
  toggleRowSelection,
  isSelected,
  navigateToNextAmountCellForEditing,
  visibleTableHeaders,
  searchTerm,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record["No."] });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.7 : 1,
  };

  const renderCellContent = (field: keyof TitheRecordB, value: any) => {
    if (
      editingCell?.recordId === record["No."] &&
      editingCell?.field === field
    ) {
      if (field === "Transaction Date ('DD-MMM-YYYY')") {
        return (
          <input
            type="date"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            autoFocus
            className="form-input-light editable-cell-input text-xs p-1"
          />
        );
      }
      return (
        <input
          type={field === "Transaction Amount" ? "number" : "text"}
          value={editedValue}
          onChange={(e) => setEditedValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") cancelEdit();
            if (field === "Transaction Amount") {
              if (e.key === "Tab" || e.key === "ArrowDown") {
                e.preventDefault();
                saveEdit(); // Save current before navigating
                navigateToNextAmountCellForEditing(record["No."], "down");
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                saveEdit(); // Save current before navigating
                navigateToNextAmountCellForEditing(record["No."], "up");
              }
            }
          }}
          autoFocus
          className="form-input-light editable-cell-input text-xs p-1"
        />
      );
    }

    const textValue = String(value);
    return (
      <span className="truncate block max-w-[180px]" title={textValue}>
        <HighlightMatches text={textValue} highlight={searchTerm} />
      </span>
    );
  };

  const editableFields: (keyof TitheRecordB)[] = [
    "Membership Number",
    "Transaction Date ('DD-MMM-YYYY')",
    "Transaction Amount",
    "Narration/Description",
  ];

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${isSelected ? "selected-row" : ""} ${isDragging ? "shadow-lg bg-[var(--bg-card)]" : ""}`}
      id={`row-${record["No."]}`}
    >
      <td className="p-2 align-middle text-center">
        <button
          {...listeners}
          {...attributes}
          className="drag-handle p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="p-2 align-middle">
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-[var(--primary-accent-start)] border-[var(--border-color)] rounded focus:ring-[var(--primary-accent-start)] focus:ring-offset-[var(--bg-card)]"
          checked={isSelected}
          onChange={() => toggleRowSelection(record["No."])}
          aria-label={`Select row ${visualIndex}`}
        />
      </td>
      <td className="p-2 align-middle text-xs text-center">{visualIndex}</td>
      {visibleTableHeaders.map((key) => (
        <td
          key={key}
          className="p-2 align-middle text-xs"
          onDoubleClick={() =>
            editableFields.includes(key) && startEditing(record["No."], key)
          }
        >
          {renderCellContent(key, record[key])}
        </td>
      ))}
      <td className="p-2 align-middle text-xs">
        <div className="flex items-center justify-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDeleteTitheRecord(record["No."])}
            className="!p-1.5"
            title="Delete Record"
          >
            <Trash2 size={16} className="text-[var(--danger-text)]" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
TitheRecordRow.displayName = "TitheRecordRow";

interface FullTithePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  titheListData: TitheRecordB[];
  onSave: (updatedList: TitheRecordB[]) => void;
  itemsPerPage: number;
  addToast: (
    message: string,
    type: ToastMessage["type"],
    duration?: number,
    actions?: ToastAction[],
  ) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortConfig: { key: keyof TitheRecordB; direction: "asc" | "desc" } | null;
  setSortConfig: (
    config: { key: keyof TitheRecordB; direction: "asc" | "desc" } | null,
  ) => void;
  openAddMemberToListModal: () => void;
}

const FullTithePreviewModal: React.FC<FullTithePreviewModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    titheListData,
    onSave,
    addToast,
    searchTerm,
    setSearchTerm,
    sortConfig,
    setSortConfig,
    openAddMemberToListModal,
  } = props;

  const [internalList, setInternalList] = useState<TitheRecordB[]>([]);
  const [madeChanges, setMadeChanges] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    recordId: number | string;
    field: keyof TitheRecordB;
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number | string>>(
    new Set(),
  );
  const [searchInput, setSearchInput] = useState(searchTerm);

  const [targetPosition, setTargetPosition] = useState("1");
  const [pendingSmartMove, setPendingSmartMove] = useState<TitheRecordB | null>(
    null,
  );

  const [lastDeleted, setLastDeleted] = useState<{
    items: Array<{ record: TitheRecordB; index: number }>;
  } | null>(null);

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const prevListLengthRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Initialize internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Deep copy to prevent accidental mutation of parent state
      setInternalList(JSON.parse(JSON.stringify(titheListData)));
      setMadeChanges(false);
    }
  }, [isOpen, titheListData]);

  const ALL_TABLE_COLUMNS = useMemo(() => {
    if (!internalList[0]) return [];
    return (Object.keys(internalList[0]) as Array<keyof TitheRecordB>).filter(
      (key) => key !== "No.",
    );
  }, [internalList]);

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const fullConfig: Record<string, boolean> = {};
        ALL_TABLE_COLUMNS.forEach((col) => {
          fullConfig[col] = parsed[col] ?? false; // Default new columns to hidden
        });
        return fullConfig;
      }
    } catch (e) {
      console.error("Failed to parse column visibility settings", e);
    }
    // No saved settings or error, apply new defaults
    const defaultVisibility: Record<string, boolean> = {};
    ALL_TABLE_COLUMNS.forEach((col) => {
      defaultVisibility[col] = [
        "Membership Number",
        "Transaction Date ('DD-MMM-YYYY')",
        "Transaction Amount",
      ].includes(col);
    });
    return defaultVisibility;
  });

  const visibleTableHeaders = useMemo(() => {
    return ALL_TABLE_COLUMNS.filter((key) => columnVisibility[key] ?? true);
  }, [ALL_TABLE_COLUMNS, columnVisibility]);

  useEffect(() => {
    localStorage.setItem(
      COLUMN_VISIBILITY_STORAGE_KEY,
      JSON.stringify(columnVisibility),
    );
  }, [columnVisibility]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnSelectorRef.current &&
        !columnSelectorRef.current.contains(event.target as Node) &&
        columnButtonRef.current &&
        !columnButtonRef.current.contains(event.target as Node)
      ) {
        setIsColumnSelectorOpen(false);
      }
    };
    if (isColumnSelectorOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isColumnSelectorOpen]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput, setSearchTerm]);

  const filteredAndSortedTitheList = useMemo(() => {
    let result = [...internalList];
    if (searchTerm) {
      const lowerSearchTerms = searchTerm
        .toLowerCase()
        .split(" ")
        .filter(Boolean);
      result = result.filter((record) => {
        const searchableString = Object.values(record).join(" ").toLowerCase();
        return lowerSearchTerms.every((term) =>
          searchableString.includes(term),
        );
      });
    }
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        const numA =
          valA === "" || valA == null
            ? direction === "asc"
              ? Infinity
              : -Infinity
            : Number(valA);
        const numB =
          valB === "" || valB == null
            ? direction === "asc"
              ? Infinity
              : -Infinity
            : Number(valB);

        if (key === "Transaction Amount" && !isNaN(numA) && !isNaN(numB)) {
          return direction === "asc" ? numA - numB : numB - numA;
        }
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === "asc" ? -1 : 1;
        if (strA > strB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [internalList, searchTerm, sortConfig]);

  const recordsToShow = useMemo(() => {
    return filteredAndSortedTitheList;
  }, [filteredAndSortedTitheList]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setInternalList((list) => {
          const oldIndex = list.findIndex((item) => item["No."] === active.id);
          const newIndex = list.findIndex((item) => item["No."] === over.id);
          return arrayMove(list, oldIndex, newIndex);
        });
        setMadeChanges(true);
        if (sortConfig) {
          setSortConfig(null);
          addToast(
            "Sorting has been cleared due to manual reordering.",
            "info",
            4000,
          );
        }
      }
    },
    [addToast, sortConfig, setSortConfig],
  );

  const handleTitheValueChangeInternal = useCallback(
    (recordNo: number | string, field: keyof TitheRecordB, value: any) => {
      setInternalList((list) =>
        list.map((r) => (r["No."] === recordNo ? { ...r, [field]: value } : r)),
      );
      setMadeChanges(true);
    },
    [],
  );

  const handleUndoDelete = useCallback(() => {
    if (!lastDeleted) return;

    setInternalList((list) => {
      const listCopy = [...list];
      const sortedItemsToRestore = lastDeleted.items.sort(
        (a, b) => b.index - a.index,
      );
      sortedItemsToRestore.forEach(({ record, index }) => {
        listCopy.splice(index, 0, record);
      });
      return listCopy;
    });

    setMadeChanges(true);
    addToast(`${lastDeleted.items.length} record(s) restored.`, "success");
    setLastDeleted(null);
  }, [lastDeleted, addToast]);

  const handleDeleteTitheRecordInternal = useCallback(
    (recordNo: number | string) => {
      const deletedItemIndex = internalList.findIndex(
        (r) => r["No."] === recordNo,
      );
      if (deletedItemIndex === -1) return;

      const deletedItem = internalList[deletedItemIndex];
      setLastDeleted({
        items: [{ record: deletedItem, index: deletedItemIndex }],
      });

      setInternalList((list) => list.filter((r) => r["No."] !== recordNo));
      setSelectedRowIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(recordNo);
        return newSet;
      });
      setMadeChanges(true);

      const undoAction: ToastAction = {
        label: "Undo",
        onClick: handleUndoDelete,
        variant: "primary",
      };
      addToast("Record deleted.", "info", Infinity, [undoAction]);
    },
    [internalList, addToast, handleUndoDelete],
  );

  const startEditingInternal = useCallback(
    (recordId: number | string, field: keyof TitheRecordB) => {
      const record = internalList.find((r) => r["No."] === recordId);
      if (!record) return;

      let valueToEdit = String(record[field] ?? "");

      if (field === "Transaction Date ('DD-MMM-YYYY')") {
        try {
          const parsedDate = new Date(valueToEdit);
          if (!isNaN(parsedDate.getTime())) {
            valueToEdit = parsedDate.toISOString().split("T")[0];
          } else {
            valueToEdit = new Date().toISOString().split("T")[0];
          }
        } catch {
          valueToEdit = new Date().toISOString().split("T")[0];
        }
      }

      setEditingCell({ recordId, field });
      setEditedValue(valueToEdit);
    },
    [internalList],
  );

  const saveEditInternal = useCallback(() => {
    if (!editingCell) return;

    const { recordId, field } = editingCell;
    const recordToUpdate = internalList.find((r) => r["No."] === recordId);
    if (!recordToUpdate) {
      setEditingCell(null);
      return;
    }

    if (field === "Transaction Amount") {
      const numVal = parseFloat(editedValue);
      if (editedValue.trim() !== "" && (isNaN(numVal) || numVal < 0)) {
        addToast(`Invalid amount. Must be non-negative or empty.`, "error");
        return; // Keep editing
      }
      const valueToSave = editedValue.trim() === "" ? "" : numVal;
      handleTitheValueChangeInternal(recordId, field, valueToSave);
    } else if (field === "Transaction Date ('DD-MMM-YYYY')") {
      try {
        const parsedDate = new Date(editedValue); // YYYY-MM-DD from input
        if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");

        const correctedDate = new Date(
          parsedDate.getTime() + parsedDate.getTimezoneOffset() * 60000,
        );
        const newFormattedDate = formatDateDDMMMYYYY(correctedDate);

        const newDescription = recordToUpdate["Narration/Description"].includes(
          "{DD-MMM-YYYY}",
        )
          ? recordToUpdate["Narration/Description"].replace(
              /{DD-MMM-YYYY}/gi,
              newFormattedDate,
            )
          : recordToUpdate["Narration/Description"];

        setInternalList((list) =>
          list.map((r) =>
            r["No."] === recordId
              ? {
                  ...r,
                  "Transaction Date ('DD-MMM-YYYY')": newFormattedDate,
                  "Narration/Description": newDescription,
                }
              : r,
          ),
        );
        setMadeChanges(true);
      } catch (e) {
        addToast(
          `Invalid date format for ${editedValue}. Use YYYY-MM-DD.`,
          "error",
        );
        return; // Keep editing
      }
    } else {
      handleTitheValueChangeInternal(recordId, field, editedValue);
    }

    setEditingCell(null);
  }, [
    editingCell,
    editedValue,
    handleTitheValueChangeInternal,
    addToast,
    internalList,
  ]);

  const cancelEditInternal = useCallback(() => setEditingCell(null), []);

  const handleSmartMoveConfirm = useCallback(() => {
    if (!pendingSmartMove) return;

    const targetPos = parseInt(targetPosition, 10);
    if (
      isNaN(targetPos) ||
      targetPos < 1 ||
      targetPos > internalList.length + 1
    ) {
      addToast(`Invalid target position.`, "error");
      setPendingSmartMove(null);
      return;
    }

    const oldIndex = internalList.findIndex(
      (item) => item["No."] === pendingSmartMove["No."],
    );
    const newIndex = targetPos - 1;
    if (oldIndex === -1) return;

    setInternalList((list) => arrayMove(list, oldIndex, newIndex));
    setMadeChanges(true);

    addToast(
      `Moved "${pendingSmartMove["Membership Number"]}" to position ${targetPos}.`,
      "success",
    );
    setTargetPosition(String(Math.min(targetPos + 1, internalList.length)));
    setSearchInput("");
    setPendingSmartMove(null);
  }, [pendingSmartMove, targetPosition, internalList, addToast]);

  useEffect(() => {
    if (searchTerm && !sortConfig && recordsToShow.length === 1) {
      setPendingSmartMove(recordsToShow[0]);
    } else {
      setPendingSmartMove(null);
    }
  }, [recordsToShow, searchTerm, sortConfig]);

  const toggleRowSelectionInternal = useCallback(
    (recordNo: number | string) => {
      setSelectedRowIds((prev) => {
        const newSet = new Set(prev);
        newSet.has(recordNo) ? newSet.delete(recordNo) : newSet.add(recordNo);
        return newSet;
      });
    },
    [],
  );

  const toggleSelectAllRowsInternal = useCallback(() => {
    const sourceList = recordsToShow;
    if (selectedRowIds.size === sourceList.length && sourceList.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(sourceList.map((r) => r["No."])));
    }
  }, [selectedRowIds, recordsToShow]);

  const handleDeleteSelectedRowsInternal = useCallback(() => {
    if (selectedRowIds.size === 0) {
      addToast("No rows selected for deletion.", "warning");
      return;
    }

    const itemsToDelete: Array<{ record: TitheRecordB; index: number }> = [];
    internalList.forEach((record, index) => {
      if (selectedRowIds.has(record["No."])) {
        itemsToDelete.push({ record, index });
      }
    });
    setLastDeleted({ items: itemsToDelete });

    setInternalList((list) =>
      list.filter((r) => !selectedRowIds.has(r["No."])),
    );
    setMadeChanges(true);

    const undoAction: ToastAction = {
      label: "Undo",
      onClick: handleUndoDelete,
      variant: "primary",
    };
    addToast(`${selectedRowIds.size} record(s) deleted.`, "info", Infinity, [
      undoAction,
    ]);
    setSelectedRowIds(new Set());
  }, [selectedRowIds, internalList, addToast, handleUndoDelete]);

  const navigateToNextAmountCellForEditing = useCallback(
    (currentRecordId: number | string, direction: "down" | "up") => {
      const currentIndexInList = recordsToShow.findIndex(
        (item) => item["No."] === currentRecordId,
      );
      if (currentIndexInList === -1) return;

      let nextIndexInList =
        direction === "down" ? currentIndexInList + 1 : currentIndexInList - 1;

      if (nextIndexInList >= 0 && nextIndexInList < recordsToShow.length) {
        startEditingInternal(
          recordsToShow[nextIndexInList]["No."],
          "Transaction Amount",
        );
      }
    },
    [recordsToShow, startEditingInternal],
  );

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const sourceListForSelection = recordsToShow;
      const numItemsSelected = sourceListForSelection.filter((item) =>
        selectedRowIds.has(item["No."]),
      ).length;
      const totalItems = sourceListForSelection.length;
      selectAllCheckboxRef.current.indeterminate =
        totalItems > 0 && numItemsSelected > 0 && numItemsSelected < totalItems;
      selectAllCheckboxRef.current.checked =
        totalItems > 0 && numItemsSelected === totalItems;
    }
  }, [selectedRowIds, recordsToShow]);

  const requestSortFullPreviewInternal = (key: keyof TitheRecordB) => {
    if (key === "No.") return;
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    if (isOpen && internalList.length > prevListLengthRef.current) {
      const scrollTimer = setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTop =
            tableContainerRef.current.scrollHeight;
        }
      }, 150);
      return () => clearTimeout(scrollTimer);
    }
    prevListLengthRef.current = internalList.length;
  }, [isOpen, internalList]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedRowIds(new Set());
      setEditingCell(null);
      setLastDeleted(null);
      setIsColumnSelectorOpen(false);
      setPendingSmartMove(null);
    } else {
      setSearchInput(searchTerm);
      prevListLengthRef.current = titheListData.length;
    }
  }, [isOpen, searchTerm, titheListData.length]);

  const handleApplyChangesWithCommit = () => {
    if (editingCell) saveEditInternal();
    onSave(internalList);
  };

  const modalTitle = madeChanges
    ? "Full Tithe List Preview & Edit *"
    : "Full Tithe List Preview & Edit";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="xxl"
      footerContent={
        <>
          <Button onClick={onClose} variant="outline" size="md">
            Close
          </Button>
          <Button
            onClick={handleApplyChangesWithCommit}
            variant="primary"
            size="md"
            disabled={!madeChanges}
            leftIcon={<Save size={16} />}
          >
            Save &amp; Apply Changes
          </Button>
        </>
      }
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          <div className="table-toolbar relative">
            <div className="actions-group flex items-center gap-2">
              <Button
                onClick={openAddMemberToListModal}
                size="sm"
                variant="primary"
                leftIcon={<UserPlus size={16} />}
              >
                Add Member
              </Button>
              <Button
                onClick={handleDeleteSelectedRowsInternal}
                size="sm"
                variant="danger"
                leftIcon={<Trash2 size={16} />}
                disabled={selectedRowIds.size === 0}
              >
                Del Sel ({selectedRowIds.size})
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-grow">
              <div className="actions-group relative">
                <Button
                  ref={columnButtonRef}
                  onClick={() => setIsColumnSelectorOpen((p) => !p)}
                  size="sm"
                  variant="subtle"
                  leftIcon={<Columns3 size={16} />}
                >
                  Columns
                </Button>
                <AnimatePresence>
                  {isColumnSelectorOpen && (
                    <motion.div
                      ref={columnSelectorRef}
                      initial={{ opacity: 0, scale: 0.9, y: -15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -15 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="absolute top-full mt-2 right-0 w-64 rounded-xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20 backdrop-blur-lg z-[110] origin-top-right"
                    >
                      <MagicCard>
                        <h4 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">
                          Visible Columns
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {ALL_TABLE_COLUMNS.map((key) => (
                            <label
                              key={key}
                              className="flex items-center space-x-3 cursor-pointer text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              <input
                                type="checkbox"
                                checked={columnVisibility[key] ?? true}
                                onChange={() =>
                                  setColumnVisibility((prev) => ({
                                    ...prev,
                                    [key]: !(prev[key] ?? true),
                                  }))
                                }
                                className="form-checkbox h-4 w-4 text-[var(--primary-accent-start)] bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-[var(--primary-accent-start)] focus:ring-offset-[var(--bg-elevated)]"
                              />
                              <span>
                                {key
                                  .replace(" ('DD-MMM-YYYY')", "")
                                  .replace(
                                    "Membership Number",
                                    "Member Details",
                                  )}
                              </span>
                            </label>
                          ))}
                        </div>
                      </MagicCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="target-pos-input"
                  className="text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap"
                >
                  Target Pos:
                </label>
                <input
                  id="target-pos-input"
                  type="number"
                  min="1"
                  max={internalList.length || 1}
                  value={targetPosition}
                  onChange={(e) => setTargetPosition(e.target.value)}
                  className="form-input-light text-sm w-20 py-1.5"
                  aria-label="Target position for reorder"
                />
              </div>
              <Search size={20} className="text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder={`Search ${filteredAndSortedTitheList.length} records...`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pendingSmartMove) {
                    e.preventDefault();
                    handleSmartMoveConfirm();
                  } else if (e.key === "Escape") {
                    setPendingSmartMove(null);
                  }
                }}
                className="form-input-light text-sm w-full sm:w-auto sm:flex-grow py-1.5"
                aria-label="Search tithe list records"
              />
            </div>
          </div>

          <AnimatePresence>
            {pendingSmartMove && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-2.5 bg-[var(--primary-accent-start)]/10 border border-[var(--primary-accent-start)]/30 rounded-lg text-sm text-center"
              >
                Move{" "}
                <strong className="text-[var(--text-primary)]">
                  {pendingSmartMove["Membership Number"]}
                </strong>{" "}
                to position{" "}
                <strong className="text-[var(--text-primary)]">
                  {targetPosition}
                </strong>
                ? Press Enter to confirm.
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="overflow-y-auto border border-[var(--border-color)] rounded-lg shadow-md bg-[var(--bg-elevated)] max-h-[60vh]"
            ref={tableContainerRef}
          >
            <table className="min-w-full text-sm modern-table">
              <caption className="sr-only">
                Tithe list for editing. Can be sorted and reordered.
              </caption>
              <thead className="bg-[var(--bg-card-subtle-accent)] sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="p-2 w-10"
                    aria-label="Drag to reorder"
                  ></th>
                  <th scope="col" className="p-2 w-10">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      ref={selectAllCheckboxRef}
                      onChange={toggleSelectAllRowsInternal}
                      aria-label="Select all rows"
                    />
                  </th>
                  <th
                    scope="col"
                    className="p-2 w-12 text-center"
                    onClick={() => requestSortFullPreviewInternal("No.")}
                    style={{ cursor: "pointer" }}
                  >
                    #
                  </th>
                  {visibleTableHeaders.map((key) => (
                    <th
                      scope="col"
                      key={key}
                      className="p-2 text-left"
                      onClick={() => requestSortFullPreviewInternal(key)}
                      style={{ cursor: "pointer" }}
                    >
                      {key
                        .replace(" ('DD-MMM-YYYY')", "")
                        .replace("Membership Number", "Member Details")}
                      {sortConfig?.key === key &&
                        (sortConfig.direction === "asc" ? " ▲" : " ▼")}
                    </th>
                  ))}
                  <th scope="col" className="p-2 text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <SortableContext
                items={filteredAndSortedTitheList.map((item) => item["No."])}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {recordsToShow.length > 0 ? (
                    recordsToShow.map((record) => (
                      <TitheRecordRow
                        key={record["No."]}
                        record={record}
                        visualIndex={
                          internalList.findIndex(
                            (r) => r["No."] === record["No."],
                          ) + 1
                        }
                        handleDeleteTitheRecord={
                          handleDeleteTitheRecordInternal
                        }
                        startEditing={startEditingInternal}
                        editingCell={editingCell}
                        editedValue={editedValue}
                        setEditedValue={setEditedValue}
                        saveEdit={saveEditInternal}
                        cancelEdit={cancelEditInternal}
                        toggleRowSelection={toggleRowSelectionInternal}
                        isSelected={selectedRowIds.has(record["No."]!)}
                        navigateToNextAmountCellForEditing={
                          navigateToNextAmountCellForEditing
                        }
                        visibleTableHeaders={visibleTableHeaders}
                        searchTerm={searchTerm}
                      />
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={visibleTableHeaders.length + 5}
                        className="p-8 text-center text-[var(--text-muted)]"
                      >
                        {searchTerm
                          ? "No records match your search."
                          : "The list is empty."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </SortableContext>
            </table>
          </div>
        </div>
      </DndContext>
    </Modal>
  );
};

FullTithePreviewModal.displayName = "FullTithePreviewModal";

export default React.memo(FullTithePreviewModal);
