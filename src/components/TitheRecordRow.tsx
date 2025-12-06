import React from "react";
import { TitheRecordB } from "../types";
import Button from "./Button";
import { GripVertical, Trash2, Move, AlertTriangle, UserX } from "lucide-react";
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

  // Detect row status from record data
  const membershipNumber = String(record["Membership Number"] || "");
  const narration = String(record["Narration/Description"] || "");

  const isUnmatched = membershipNumber.startsWith("[UNMATCHED]");
  const hasAnomaly = narration.startsWith("[ANOMALY:");

  // Extract anomaly message if present
  const anomalyMessage = hasAnomaly
    ? narration.match(/\[ANOMALY: ([^\]]+)\]/)?.[1] || "Unusual amount detected"
    : null;

  // Determine row styling based on status
  const statusClasses = isUnmatched
    ? "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-l-amber-500"
    : hasAnomaly
      ? "bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-500"
      : "";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${isSelected ? "selected-row" : ""} ${isDragging ? "shadow-lg bg-[var(--bg-card)]" : ""} ${statusClasses}`}
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
      <td className="p-2 align-middle text-xs text-center">
        {hasAnomaly && (
          <div className="group relative inline-flex">
            <AlertTriangle size={16} className="text-purple-600 dark:text-purple-400" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 p-2 bg-purple-50 dark:bg-purple-900/90 border border-purple-200 dark:border-purple-700 rounded-lg text-xs w-48 shadow-lg">
              <p className="font-semibold text-purple-800 dark:text-purple-200">Anomaly Detected</p>
              <p className="text-purple-700 dark:text-purple-300">{anomalyMessage}</p>
            </div>
          </div>
        )}
        {isUnmatched && (
          <div className="group relative inline-flex">
            <UserX size={16} className="text-amber-600 dark:text-amber-400" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 p-2 bg-amber-50 dark:bg-amber-900/90 border border-amber-200 dark:border-amber-700 rounded-lg text-xs w-64 shadow-lg">
              <p className="font-semibold text-amber-800 dark:text-amber-200">Unmatched Member</p>
              <p className="text-amber-700 dark:text-amber-300 mb-2">
                OCR: {membershipNumber.replace("[UNMATCHED] ", "")}
              </p>
              {narration.includes("[SUGGESTIONS:") && (
                <>
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mt-2">Did you mean?</p>
                  <ul className="text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                    {narration
                      .match(/\[SUGGESTIONS: ([^\]]+)\]/)?.[1]
                      ?.split("; ")
                      .map((suggestion, idx) => (
                        <li key={idx} className="flex items-center gap-1 text-xs">
                          <span className="text-amber-500">•</span>
                          {suggestion}
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </td>
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
