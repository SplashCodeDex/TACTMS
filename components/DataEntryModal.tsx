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
import { SortAsc, SortDesc, Filter, Search, Check, Coins } from "lucide-react";

interface DataEntryRowProps {
  record: TitheRecordB;
  visualIndex: number;
  isActive: boolean;
  onAmountChange: (recordNo: number | string, amount: string) => void;
  onNavigate: (direction: "up" | "down") => void;
  setActiveRow: () => void;
}

const DataEntryRow = React.memo<DataEntryRowProps>(
  ({
    record,
    visualIndex,
    isActive,
    onAmountChange,
    onNavigate,
    setActiveRow,
  }) => {
    const [localAmount, setLocalAmount] = useState(
      String(record["Transaction Amount"] ?? ""),
    );
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      // Sync local state if the master record changes from outside
      setLocalAmount(String(record["Transaction Amount"] ?? ""));
    }, [record["Transaction Amount"]]);

    useEffect(() => {
      if (isActive) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isActive]);

    const handleBlur = () => {
      onAmountChange(record["No."], localAmount);
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
          onAmountChange(record["No."], localAmount);
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
          <input
            ref={inputRef}
            type="number"
            step="any"
            min="0"
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            className="form-input-light w-full text-sm py-1"
            aria-label={`Amount for ${record["Membership Number"]}`}
          />
        </td>
      </tr>
    );
  },
);
DataEntryRow.displayName = "DataEntryRow";

interface DataEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedList: TitheRecordB[]) => void;
  titheListData: TitheRecordB[];
}

const DataEntryModal: React.FC<DataEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  titheListData,
}) => {
  const [localData, setLocalData] = useState<TitheRecordB[]>([]);
  const [sortOrder, setSortOrder] = useState<"original" | "alpha">("original");
  const [activeRecordId, setActiveRecordId] = useState<number | string | null>(
    null,
  );
  const [filterText, setFilterText] = useState("");
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(false);

  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Create a deep copy to work with locally
      setLocalData(JSON.parse(JSON.stringify(titheListData)));
      // Set the first record as active when modal opens
      if (titheListData.length > 0) {
        setActiveRecordId(titheListData[0]["No."]);
      }
    } else {
      // Reset state on close
      setLocalData([]);
      setSortOrder("original");
      setActiveRecordId(null);
      setFilterText("");
      setShowOnlyEmpty(false);
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
    return data; // Original order is preserved if not sorting
  }, [localData, sortOrder, filterText, showOnlyEmpty]);

  const handleAmountChange = useCallback(
    (recordNo: number | string, amount: string) => {
      setLocalData((prevData) =>
        prevData.map((record) =>
          record["No."] === recordNo
            ? { ...record, "Transaction Amount": amount }
            : record,
        ),
      );
    },
    [],
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

  const handleSave = () => {
    onSave(localData);
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
      title="Advanced Data Entry Mode"
      size="xl"
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
        <div className="flex justify-between items-center flex-wrap gap-4 bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={sortOrder === "original" ? "secondary" : "subtle"}
              onClick={() => setSortOrder("original")}
              leftIcon={<SortAsc size={16} />}
            >
              Original
            </Button>
            <Button
              size="sm"
              variant={sortOrder === "alpha" ? "secondary" : "subtle"}
              onClick={() => setSortOrder("alpha")}
              leftIcon={<SortDesc size={16} />}
            >
              A-Z
            </Button>
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
            <thead className="bg-[var(--bg-card-subtle-accent)] sticky top-0 z-10">
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
              {filteredAndSortedData.map((record, index) => (
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
    </Modal>
  );
};

export default DataEntryModal;
