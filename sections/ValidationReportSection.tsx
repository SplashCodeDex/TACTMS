import React from "react";
import { BotMessageSquare, ShieldCheck } from "lucide-react";
import Button from "../components/Button";

interface ValidationReportSectionProps {
  handleGenerateReport: () => void;
  isGenerating: boolean;
  hasData: boolean;
}

const ValidationReportSection: React.FC<ValidationReportSectionProps> = ({
  handleGenerateReport,
  isGenerating,
  hasData,
}) => {
  return (
    <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border-color)] h-full flex flex-col justify-center items-center text-center">
      <ShieldCheck
        size={28}
        className="mb-3 text-[var(--primary-accent-end)]"
      />
      <h3 className="text-lg font-semibold flex items-center mb-3">
        Data Quality Insights
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mb-5 max-w-sm">
        Use AI to scan your uploaded member list for potential errors, missing
        information, and duplicates before processing.
      </p>
      <Button
        onClick={handleGenerateReport}
        isLoading={isGenerating}
        disabled={isGenerating || !hasData}
        leftIcon={<BotMessageSquare size={18} />}
        variant="secondary"
      >
        Generate AI Quality Report
      </Button>
      {!hasData && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Upload a file to enable this feature.
        </p>
      )}
    </div>
  );
};

export default ValidationReportSection;
