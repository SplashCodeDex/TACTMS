import React from "react";
import Modal from "./Modal";
import Button from "./Button";
import { Loader2 } from "lucide-react";

// A more robust markdown formatter
const formatMarkdown = (text: string) => {
  let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Process block elements first (headers, lists)
  // Headers
  html = html.replace(
    /^### (.*$)/gm,
    '<h3 class="text-lg font-semibold text-[var(--text-primary)] mt-3 mb-1">$1</h3>',
  );
  html = html.replace(
    /^## (.*$)/gm,
    '<h2 class="text-xl font-bold text-gradient-primary mt-4 mb-2">$1</h2>',
  );
  html = html.replace(
    /^# (.*$)/gm,
    '<h1 class="text-2xl font-bold text-gradient-primary mt-5 mb-3">$1</h1>',
  );

  // Lists - process chunk by chunk
  html = html.replace(/((?:^[*-] .*(?:\n|$))+)/gm, (match) => {
    const items = match
      .trim()
      .split("\n")
      .map(
        (item) =>
          `<li class="list-disc ml-5 mb-1.5">${item.replace(/^[*-] /, "").trim()}</li>`,
      )
      .join("");
    return `<ul class="list-outside mt-2">${items}</ul>`;
  });

  // Process inline elements (bold, italic)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Finally, replace newlines with <br> for paragraph breaks
  html = html.replace(/\n/g, "<br />");

  // Clean up extra <br> tags around block elements
  html = html.replace(/<br \/>\s*(<(?:ul|ol|h[1-3]))/g, "$1");
  html = html.replace(/(<\/(?:ul|ol|h[1-3])>)\s*<br \/>/g, "$1");

  return html;
};

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
