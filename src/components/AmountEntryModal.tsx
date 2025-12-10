import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { TitheRecordB } from "../types";
import Modal from "./Modal";
import Button from "./Button";
import { SortDesc, Filter, Search, Check, UserPlus } from "lucide-react";
import { hapticSelect, hapticSuccess } from "../lib/haptics";
import confetti from "canvas-confetti";
import { useWorkspaceContext } from "@/context";
import { saveAmountCorrection, promoteToGlobalIfQualifies } from "@/services/handwritingLearning";

interface DataEntryRowProps {
  record: TitheRecordB;
  visualIndex: number;
  isActive: boolean;
  onAmountChange: (recordNo: number | string, amount: string) => void;
  onNavigate: (direction: "up" | "down") => void;
  setActiveRow: () => void;
  originalValue?: string; // Original AI-extracted value for suggestion lookup
  assemblyName?: string;  // Current assembly for suggestion lookup
}

const DataEntryRow = React.memo<DataEntryRowProps>(
  ({
    record,
    visualIndex,
    isActive,
    onAmountChange,
    onNavigate,
    setActiveRow,
    originalValue,
    assemblyName,
  }) => {
    const [localAmount, setLocalAmount] = useState(
      String(record["Transaction Amount"] ?? ""),
    );
    const [suggestion, setSuggestion] = useState<{ amount: number; confidence: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      // Sync local state if the master record changes from outside
      setLocalAmount(String(record["Transaction Amount"] ?? ""));
    }, [record]);

    useEffect(() => {
      if (isActive) {
        inputRef.current?.focus();
        inputRef.current?.select();

        // Fetch suggestion when row becomes active (using ensemble for best accuracy)
        if (originalValue && assemblyName) {
          import("@/services/ensembleOCR")
            .then(({ predictEnsemble }) => {
              predictEnsemble(originalValue).then((result) => {
                if (result && result.confidence > 0.5) {
                  setSuggestion({ amount: result.suggestedAmount, confidence: result.confidence });
                } else {
                  setSuggestion(null);
                }
              }).catch(() => setSuggestion(null));
            })
            .catch(() => {
              // Ensemble not available, try fallback
              import("@/services/handwritingLearning")
                .then(({ suggestCorrection }) => {
                  suggestCorrection(assemblyName, originalValue).then((result) => {
                    if (result && result.confidence > 0.5) {
                      setSuggestion({ amount: result.suggestedAmount, confidence: result.confidence });
                    } else {
                      setSuggestion(null);
                    }
                  }).catch(() => setSuggestion(null));
                })
                .catch(() => setSuggestion(null));
            });
        }
      }
    }, [isActive, originalValue, assemblyName]);

    const handleBlur = () => {
      onAmountChange(record["No."], localAmount);
    };

    const applySuggestion = () => {
      if (suggestion) {
        setLocalAmount(String(suggestion.amount));
        onAmountChange(record["No."], String(suggestion.amount));
        setSuggestion(null);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "Enter":
        case "ArrowDown":
          e.preventDefault();
          onAmountChange(record["No."], localAmount);
          onNavigate("down");
          break;
        case "ArrowUp":
          e.preventDefault();
          onAmountChange(record["No."], localAmount);
          onNavigate("up");
          break;
        case "Tab":
          e.preventDefault();
          // Apply suggestion if exists, otherwise just navigate
          if (suggestion && !e.shiftKey) {
            applySuggestion();
          } else {
            onAmountChange(record["No."], localAmount);
          }
          onNavigate(e.shiftKey ? "up" : "down");
          break;
        case "Escape":
          inputRef.current?.blur();
          break;
      }
    };

    return (
      <tr
        onClick={setActiveRow}
        className={`transition-colors duration-150 ${isActive ? "bg-[var(--primary-accent-start)]/10" : "hover:bg-[var(--bg-card-subtle-accent)]"}`}
        id={`data-entry-row-${record["No."]}`}
      >
        <td className="p-2 align-middle text-center text-xs text-[var(--text-muted)] w-12">
          {visualIndex}
        </td>
        <td
          className="p-2 align-middle text-sm text-[var(--text-primary)] w-2/3 truncate"
          title={record["Membership Number"]}
        >
          {record["Membership Number"]}
        </td>
        <td className="p-2 align-middle text-sm w-1/3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="number"
              step="any"
              min="0"
              value={localAmount}
              onChange={(e) => {
                const value = e.target.value;
                const sanitizedValue = value.replace(/[^0-9.]/g, '');
                const decimalCount = sanitizedValue.split('.').length - 1;
                if (decimalCount > 1) {
                  return;
                }
                setLocalAmount(sanitizedValue);
                // Clear suggestion when user types
                if (suggestion) setSuggestion(null);
              }}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="form-input-light w-full text-sm py-1"
              aria-label={`Amount for ${record["Membership Number"]}`}
            />
            {suggestion && isActive && (
              <button
                type="button"
                onClick={applySuggestion}
                className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors whitespace-nowrap"
                title="Press Tab to apply suggestion"
              >
                💡→{suggestion.amount}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  },
);
DataEntryRow.displayName = "DataEntryRow";

interface AmountEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedList: TitheRecordB[]) => void;
  titheListData: TitheRecordB[];
  openAddMemberToListModal: () => void;
}

const AmountEntryModal: React.FC<AmountEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  titheListData,
  openAddMemberToListModal,
}) => {
  const { currentAssembly } = useWorkspaceContext();
  const [localData, setLocalData] = useState<TitheRecordB[]>([]);
  const [sortOrder, setSortOrder] = useState<"original" | "alpha" | "amount">("original");
  const [activeRecordId, setActiveRecordId] = useState<number | string | null>(
    null,
  );
  const [filterText, setFilterText] = useState("");
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(false);
  const [globalDescription, setGlobalDescription] = useState("");
  // Track original AI-extracted values for correction learning
  const originalValuesRef = useRef<Map<number | string, string>>(new Map());
  // Track pending corrections to save in batch when modal closes
  const pendingCorrectionsRef = useRef<Map<string, { original: string; corrected: number }>>(new Map());

  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Create a deep copy to work with locally
      setLocalData(JSON.parse(JSON.stringify(titheListData)));
      // Store original AI-extracted amounts for correction learning
      const originals = new Map<number | string, string>();
      titheListData.forEach(record => {
        const amount = record["Transaction Amount"];
        if (amount !== undefined && amount !== null && amount !== "") {
          originals.set(record["No."], String(amount));
        }
      });
      originalValuesRef.current = originals;
      // Set the first record as active when modal opens
      if (titheListData.length > 0) {
        setActiveRecordId(titheListData[0]["No."]);
        // Initialize global description from the first record if available, or default
        setGlobalDescription(titheListData[0]["Narration/Description"] || "Tithe");
      }
    } else {
      // Reset state on close
      setLocalData([]);
      setSortOrder("original");
      setActiveRecordId(null);
      setFilterText("");
      setShowOnlyEmpty(false);
      setGlobalDescription("");
      // Clear pending corrections (user closed without saving)
      pendingCorrectionsRef.current.clear();
      originalValuesRef.current.clear();
    }
  }, [isOpen, titheListData]);

  const filteredAndSortedData = useMemo(() => {
    let data = localData;

    if (filterText) {
      data = data.filter((r) =>
        r["Membership Number"].toLowerCase().includes(filterText.toLowerCase()),
      );
    }

    if (showOnlyEmpty) {
      data = data.filter(
        (r) =>
          r["Transaction Amount"] === "" || r["Transaction Amount"] === null,
      );
    }

    if (sortOrder === "alpha") {
      return [...data].sort((a, b) =>
        a["Membership Number"].localeCompare(b["Membership Number"]),
      );
    }
    if (sortOrder === "amount") {
      return [...data].sort((a, b) => {
        const amtA = Number(a["Transaction Amount"]) || 0;
        const amtB = Number(b["Transaction Amount"]) || 0;
        // Sort descending, empty amounts go to bottom
        if (amtA === 0 && amtB === 0) return 0;
        if (amtA === 0) return 1;
        if (amtB === 0) return -1;
        return amtB - amtA;
      });
    }
    return data; // Original order is preserved if not sorting
  }, [localData, sortOrder, filterText, showOnlyEmpty]);

  const handleAmountChange = useCallback(
    (recordNo: number | string, amount: string) => {
      // Track correction if this differs from AI-extracted value (save in batch later)
      const originalValue = originalValuesRef.current.get(recordNo);
      if (originalValue && currentAssembly) {
        const newAmount = parseFloat(amount);
        if (!isNaN(newAmount) && originalValue !== amount) {
          // Store for batch save - use recordNo as key to avoid duplicates
          pendingCorrectionsRef.current.set(String(recordNo), {
            original: originalValue,
            corrected: newAmount
          });
        } else {
          // If user reverted to original, remove pending correction
          pendingCorrectionsRef.current.delete(String(recordNo));
        }
      }

      setLocalData((prevData) =>
        prevData.map((record) =>
          record["No."] === recordNo
            ? { ...record, "Transaction Amount": amount }
            : record,
        ),
      );
    },
    [currentAssembly],
  );

  const handleNavigation = useCallback(
    (direction: "up" | "down") => {
      const currentIndex = filteredAndSortedData.findIndex(
        (r) => r["No."] === activeRecordId,
      );
      if (currentIndex === -1) return;

      const nextIndex =
        direction === "down" ? currentIndex + 1 : currentIndex - 1;

      if (nextIndex >= 0 && nextIndex < filteredAndSortedData.length) {
        setActiveRecordId(filteredAndSortedData[nextIndex]["No."]);
      }
    },
    [filteredAndSortedData, activeRecordId],
  );

  useEffect(() => {
    const rowElement = activeRecordId
      ? document.getElementById(`data-entry-row-${activeRecordId}`)
      : null;
    if (rowElement) {
      rowElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeRecordId]);

  const handleSave = async () => {
    // Save all pending corrections in batch
    if (currentAssembly && pendingCorrectionsRef.current.size > 0) {
      const corrections = Array.from(pendingCorrectionsRef.current.values());
      for (const { original, corrected } of corrections) {
        try {
          await saveAmountCorrection(
            currentAssembly,
            original,
            corrected,
            undefined,
            'tithe_entry'
          );
          // Check if pattern qualifies for global promotion (fire-and-forget)
          promoteToGlobalIfQualifies(original, corrected).catch(console.warn);
        } catch (err) {
          console.warn('Failed to save correction:', err);
        }
      }
      pendingCorrectionsRef.current.clear();
    }

    // Apply global description to all records before saving
    const dataWithDescription = localData.map(record => ({
      ...record,
      "Narration/Description": globalDescription
    }));
    onSave(dataWithDescription);
    // Close the modal after saving
    onClose();
  };

  const { entriesFilled, totalEntries, progressPercentage } = useMemo(() => {
    const total = localData.length;
    const filled = localData.filter((r) => {
      const amount = Number(r["Transaction Amount"]);
      return (
        !isNaN(amount) &&
        r["Transaction Amount"] !== "" &&
        r["Transaction Amount"] !== null
      );
    }).length;
    return {
      entriesFilled: filled,
      totalEntries: total,
      progressPercentage: total > 0 ? (filled / total) * 100 : 0,
    };
  }, [localData]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Amount Entry Mode"
      size="xxl"
      closeOnOutsideClick={false}
      footerContent={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            leftIcon={<Check size={16} />}
          >
            Done & Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Desktop View - Table */}
        <div className="hidden md:block">
          <div className="flex justify-between items-center flex-wrap gap-4 bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-color)]">
            {/* ... existing header controls ... */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={openAddMemberToListModal}
                leftIcon={<UserPlus size={16} />}
              >
                Add Member
              </Button>
              <Button
                size="sm"
                variant={sortOrder !== "original" ? "secondary" : "subtle"}
                onClick={() => {
                  // Cycle through: original -> alpha -> amount -> original
                  if (sortOrder === "original") setSortOrder("alpha");
                  else if (sortOrder === "alpha") setSortOrder("amount");
                  else setSortOrder("original");
                }}
                leftIcon={<SortDesc size={16} />}
                title={`Sort: ${sortOrder === "original" ? "Original Order" : sortOrder === "alpha" ? "A-Z" : "By Amount"}`}
              >
                {sortOrder === "original" ? "A-Z" : sortOrder === "alpha" ? "Amount" : "Original"}
              </Button>
            </div>

            {/* Global Description Input */}
            <div className="flex-grow min-w-[200px]">
              <input
                type="text"
                placeholder="Narration/Description (e.g. Tithe for Nov)"
                value={globalDescription}
                onChange={(e) => setGlobalDescription(e.target.value)}
                className="form-input-light w-full text-sm py-1.5"
              />
            </div>

            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
              <div className="relative flex-grow">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="text"
                  placeholder="Jump to member..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="form-input-light !pl-9 !py-1.5 w-full text-sm"
                />
              </div>
              <Button
                size="sm"
                variant={showOnlyEmpty ? "secondary" : "subtle"}
                onClick={() => setShowOnlyEmpty((p) => !p)}
                leftIcon={<Filter size={16} />}
              >
                Needs Amount
              </Button>
            </div>
            <div className="w-full sm:w-1/3">
              <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                <span>Progress</span>
                <span>
                  {entriesFilled} / {totalEntries} Filled
                </span>
              </div>
              <div className="w-full bg-[var(--input-bg)] rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto border border-[var(--border-color)] rounded-lg shadow-md bg-[var(--bg-elevated)] max-h-[55vh]">
            <table className="min-w-full text-sm modern-table">
              <caption className="sr-only">
                Table for rapid data entry of tithe amounts.
              </caption>
              <thead className="bg-[var(--bg-card-subtle-accent)] backdrop-blur-lg sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="p-2.5 text-center text-xs font-semibold uppercase tracking-wider w-12"
                  >
                    No.
                  </th>
                  <th
                    scope="col"
                    className="p-2.5 text-left text-xs font-semibold uppercase tracking-wider w-2/3"
                  >
                    Member Details
                  </th>
                  <th
                    scope="col"
                    className="p-2.5 text-left text-xs font-semibold uppercase tracking-wider w-1/3"
                  >
                    Amount (GH₵)
                  </th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef}>
                {filteredAndSortedData.map((record) => (
                  <DataEntryRow
                    key={record["No."]}
                    record={record}
                    visualIndex={
                      localData.findIndex((r) => r["No."] === record["No."]) + 1
                    } // Show original index
                    isActive={activeRecordId === record["No."]}
                    onAmountChange={handleAmountChange}
                    onNavigate={handleNavigation}
                    setActiveRow={() => setActiveRecordId(record["No."])}
                    originalValue={originalValuesRef.current.get(record["No."])}
                    assemblyName={currentAssembly || undefined}
                  />
                ))}
              </tbody>
            </table>
            {filteredAndSortedData.length === 0 && (
              <div className="text-center py-8 text-[var(--text-muted)]">
                No members match your current filters.
              </div>
            )}
          </div>
        </div>

        {/* Mobile View - Focus Card */}
        {isOpen && (
          <div className="md:hidden fixed inset-0 z-[60] bg-[var(--bg-main)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Entry Mode
                </div>
                <div className="px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] font-medium">
                  {entriesFilled} / {totalEntries}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-[var(--text-secondary)]">Close</Button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--bg-secondary)] h-1">
              <div
                className="bg-[var(--primary-accent-start)] h-1 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Focus Content */}
            <div className="flex-1 flex flex-col justify-center px-6 py-4 overflow-y-auto">
              {activeRecordId ? (() => {
                const currentRecord = localData.find(r => r["No."] === activeRecordId);
                if (!currentRecord) return <div className="text-center text-[var(--text-muted)]">Record not found</div>;

                // Helper to navigate
                const goToNext = () => {
                  const idx = filteredAndSortedData.findIndex(r => r["No."] === activeRecordId);
                  if (idx < filteredAndSortedData.length - 1) {
                    hapticSelect();
                    setActiveRecordId(filteredAndSortedData[idx + 1]["No."]);
                  }
                };
                const goToPrev = () => {
                  const idx = filteredAndSortedData.findIndex(r => r["No."] === activeRecordId);
                  if (idx > 0) {
                    hapticSelect();
                    setActiveRecordId(filteredAndSortedData[idx - 1]["No."]);
                  }
                };

                const displayName = currentRecord.memberDetails
                  ? `${currentRecord.memberDetails["First Name"] || ""} ${currentRecord.memberDetails.Surname || ""}`.trim()
                  : currentRecord["Membership Number"];
                const initial =
                  currentRecord.memberDetails?.["First Name"]?.charAt(0) ||
                  currentRecord["Membership Number"]?.charAt(0) || "";

                return (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300" key={activeRecordId}>
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-white text-2xl font-bold shadow-lg mb-2">
                        {initial}
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
                        {displayName}
                      </h2>
                      <p className="text-[var(--text-secondary)] font-medium">
                        #{currentRecord["Membership Number"]}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-center text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Enter Amount (GH₵)
                      </label>
                      <div className="relative max-w-[280px] mx-auto">
                        <input
                          type="number"
                          inputMode="decimal"
                          autoFocus
                          value={currentRecord["Transaction Amount"] || ""}
                          onChange={(e) => handleAmountChange(currentRecord["No."], e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              hapticSuccess(); // Satisfying click
                              goToNext();
                            }
                          }}
                          className="w-full bg-transparent text-center text-5xl font-bold text-[var(--text-primary)] border-b-2 border-[var(--border-color)] focus:border-[var(--primary-accent-start)] focus:outline-none py-2 placeholder-[var(--text-placeholder)]/20"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <Button
                        variant="subtle"
                        className="h-14 text-lg rounded-2xl"
                        onClick={goToPrev}
                        disabled={filteredAndSortedData.findIndex(r => r["No."] === activeRecordId) === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="primary"
                        className="h-14 text-lg rounded-2xl shadow-lg"
                        onClick={goToNext}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center">
                  <p className="text-[var(--text-muted)]">No members selected.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
              <Button
                variant="primary"
                className="w-full h-12 text-lg rounded-xl shadow-md bg-green-600 hover:bg-green-700 border-transparent text-white"
                onClick={() => {
                  hapticSuccess();
                  confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                  });
                  handleSave();
                }}
              >
                Done & Save Changes
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default AmountEntryModal;
