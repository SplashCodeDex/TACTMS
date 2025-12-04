import React from "react";
import { TitheRecordB } from "../types";
import Button from "./Button";
import { GripVertical, Trash2, Move } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HighlightMatches } from "./HighlightMatches";

export interface TitheRecordRowProps {
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
  onSelectForSmartMove: (record: TitheRecordB) => void;
  onSmartMoveClick: (record: TitheRecordB) => void;
  selectedRecordForSmartMove: TitheRecordB | null;
}

// Row component with integrated DnD logic
export const TitheRecordRow: React.FC<TitheRecordRowProps> = ({
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
  onSmartMoveClick,
  selectedRecordForSmartMove,
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
            variant="ghost"
            size="sm"
            onClick={() => onSmartMoveClick(record)}
            disabled={selectedRecordForSmartMove !== null}
            title="Move selected record to a specific position"
          >
            <Move size={16} />
          </Button>
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
