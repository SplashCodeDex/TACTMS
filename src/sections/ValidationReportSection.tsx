import React from "react";
import Button from "../components/Button";
import { BotMessageSquare } from "lucide-react";

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
    <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border-color)] h-full flex flex-col justify-between">
      <div>
        <h3 className="section-heading !border-b-0 !pb-0 !mb-0">
          <BotMessageSquare size={20} className="mr-3 icon-primary" />
          AI Data Validation
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Generate an AI-powered report to identify potential data quality issues
          in your uploaded list.
        </p>
      </div>
      <Button
        onClick={handleGenerateReport}
        disabled={isGenerating || !hasData}
        isLoading={isGenerating}
        variant="secondary"
        className="mt-4"
      >
        {isGenerating ? "Generating Report..." : "Generate Validation Report"}
      </Button>
    </div>
  );
};

export default ValidationReportSection;
