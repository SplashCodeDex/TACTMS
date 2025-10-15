import React from "react";
import Modal from "./Modal";
import Button from "./Button";
import { Loader2 } from "lucide-react";

import { formatMarkdown } from "../lib/markdown";

interface ValidationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportContent: string;
  isLoading: boolean;
}

const ValidationReportModal: React.FC<ValidationReportModalProps> = ({
  isOpen,
  onClose,
  reportContent,
  isLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Data Quality Report"
      size="xl"
      footerContent={
        <Button onClick={onClose} variant="primary">
          Close
        </Button>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <Loader2
              className="animate-spin text-[var(--primary-accent-start)]"
              size={40}
            />
            <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              Generating Report...
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              The AI is analyzing your data. This may take a moment.
            </p>
          </div>
        ) : (
          <article
            className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:text-[var(--text-primary)] prose-strong:text-[var(--text-primary)] prose-h1:text-gradient-primary prose-h1:border-b prose-h1:border-[var(--border-color)] prose-h1:pb-2 prose-h2:border-b prose-h2:border-[var(--border-color)] prose-h2:pb-2"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(reportContent) }}
          />
        )}
      </div>
    </Modal>
  );
};

export default ValidationReportModal;
