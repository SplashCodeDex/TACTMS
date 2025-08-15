import React, { useMemo } from "react";
import { WalletCards } from "lucide-react";
import InfoTooltip from "../components/InfoTooltip";
import { MemberRecordA } from "../types";

interface AmountMappingSectionProps {
  originalData: MemberRecordA[];
  amountMappingColumn: string | null;
  setAmountMappingColumn: (value: string | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

const AmountMappingSection: React.FC<AmountMappingSectionProps> = React.memo(
  ({
    originalData,
    amountMappingColumn,
    setAmountMappingColumn,
    setHasUnsavedChanges,
  }) => {
    const headers = useMemo(() => {
      if (originalData.length > 0) {
        // Get all keys from the first few rows to be more robust against sparse data
        const allKeys = new Set<string>();
        originalData.slice(0, 10).forEach((row) => {
          Object.keys(row).forEach((key) => allKeys.add(key));
        });
        return Array.from(allKeys).sort();
      }
      return [];
    }, [originalData]);

    const isDisabled = headers.length === 0;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setAmountMappingColumn(e.target.value === "none" ? null : e.target.value);
      setHasUnsavedChanges(true);
    };

    return (
      <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border-color)] h-full">
        <div aria-labelledby="amount-map-heading">
          <div className="flex justify-between items-center mb-4">
            <h3
              id="amount-map-heading"
              className="text-lg font-semibold flex items-center"
            >
              <WalletCards
                size={20}
                className="mr-3 text-[var(--primary-accent-end)]"
              />
              Amount Mapping (Optional)
            </h3>
            <InfoTooltip text="Automatically populate 'Transaction Amount' from a column in your uploaded Excel file when you generate the list." />
          </div>

          <div>
            <label htmlFor="amount-column-select" className="form-label">
              Map Amount from Excel Column
            </label>
            <select
              id="amount-column-select"
              value={amountMappingColumn || "none"}
              onChange={handleChange}
              disabled={isDisabled}
              className="form-input-light w-full"
              aria-label="Select column to map transaction amount from"
            >
              <option value="none">Do not map amount</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
            {isDisabled && (
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Upload a file to see available columns for mapping.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export default AmountMappingSection;
