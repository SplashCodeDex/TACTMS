import React from 'react';
import { Filter, Users, X } from 'lucide-react';
import Button from '../components/Button';
import { MemberRecordA, TitheRecordB } from '../types';

interface AgeFilterSectionProps {
  ageRangeMin: string;
  setAgeRangeMin: (value: string) => void;
  ageRangeMax: string;
  setAgeRangeMax: (value: string) => void;
  inputErrors: { [key: string]: string };
  handleApplyAgeFilter: () => void;
  isAgeFilterActive: boolean;
  handleRemoveAgeFilter: () => void;
  isLoading: boolean;
  originalData: MemberRecordA[];
  uploadedFile: File | null;
  titheListData: TitheRecordB[];
  processedDataA: MemberRecordA[];
  setHasUnsavedChanges: (value: boolean) => void;
}

const AgeFilterSection: React.FC<AgeFilterSectionProps> = React.memo(({
  ageRangeMin,
  setAgeRangeMin,
  ageRangeMax,
  setAgeRangeMax,
  inputErrors,
  handleApplyAgeFilter,
  isAgeFilterActive,
  handleRemoveAgeFilter,
  isLoading,
  originalData,
  uploadedFile,
  titheListData,
  processedDataA,
  setHasUnsavedChanges
}) => {
  const disableInputs = originalData.length === 0 && !!uploadedFile && titheListData.length > 0;
  
  return (
    <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border-color)] h-full flex flex-col">
      <div className="flex-grow">
        <div aria-labelledby="age-filter-heading">
          <h3 id="age-filter-heading" className="text-lg font-semibold flex items-center mb-4">
            <Filter size={20} className="mr-3 text-[var(--primary-accent-end)]" />
            Age Filter (Optional)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 items-end">
            <div>
              <label htmlFor="ageMin" className="form-label">Min Age (Years)</label>
              <input
                type="number"
                id="ageMin"
                value={ageRangeMin}
                onChange={(e) => { setAgeRangeMin(e.target.value); setHasUnsavedChanges(true); }}
                placeholder="e.g., 18"
                className={`form-input-light ${inputErrors.age ? 'input-error' : ''}`}
                disabled={disableInputs}
                aria-invalid={!!inputErrors.age}
                aria-describedby={inputErrors.age ? "ageError" : undefined}
              />
            </div>
            <div>
              <label htmlFor="ageMax" className="form-label">Max Age (Years)</label>
              <input
                type="number"
                id="ageMax"
                value={ageRangeMax}
                onChange={(e) => { setAgeRangeMax(e.target.value); setHasUnsavedChanges(true); }}
                placeholder="e.g., 65"
                className={`form-input-light ${inputErrors.age ? 'input-error' : ''}`}
                disabled={disableInputs}
                aria-invalid={!!inputErrors.age}
                aria-describedby={inputErrors.age ? "ageError" : undefined}
              />
            </div>
            {inputErrors.age && <p id="ageError" className="form-error-text col-span-2">{inputErrors.age}</p>}
          </div>
          {disableInputs && <p className="text-xs text-[var(--text-muted)] mt-2">Age filter requires original member data. Re-upload Excel or load a favorite with member data to enable.</p>}
           {isAgeFilterActive && processedDataA.length > 0 && (
            <p className="mt-4 text-sm text-[var(--primary-accent-start)]">
              Filtered: {processedDataA.length} records match age criteria.
            </p>
          )}
          {isAgeFilterActive && processedDataA.length === 0 && originalData.length > 0 && (
            <p className="mt-4 text-sm text-[var(--warning-text)]">
              No records match the current age filter.
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          onClick={handleApplyAgeFilter}
          disabled={(!ageRangeMin && !ageRangeMax) || isLoading || disableInputs}
          leftIcon={<Users size={18} />}
          variant="secondary"
        >
          Apply Age Filter
        </Button>
        {isAgeFilterActive && (
          <Button
            onClick={handleRemoveAgeFilter}
            variant="outline"
            leftIcon={<X size={18} />}
            disabled={isLoading || disableInputs}
          >
            Remove Filter
          </Button>
        )}
      </div>
    </div>
  );
});

export default AgeFilterSection;