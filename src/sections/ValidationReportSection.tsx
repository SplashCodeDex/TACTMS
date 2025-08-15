import React from "react";

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
    <div>
      <h3>AI Validation Report</h3>
      <button
        onClick={handleGenerateReport}
        disabled={isGenerating || !hasData}
      >
        {isGenerating ? "Generating..." : "Generate Report"}
      </button>
    </div>
  );
};

export default ValidationReportSection;
