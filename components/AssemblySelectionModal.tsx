import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { Building2 } from "lucide-react";
import { ASSEMBLIES } from "../constants";

interface AssemblySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assemblyName: string) => void;
  fileName: string;
  suggestedAssembly?: string;
}

const AssemblySelectionModal: React.FC<AssemblySelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  suggestedAssembly,
}) => {
  const [selectedAssembly, setSelectedAssembly] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // When the modal opens or the suggestion changes, update the selection
    if (isOpen) {
      setSelectedAssembly(suggestedAssembly || "");
      setError(""); // Reset error when modal opens/re-renders
    }
  }, [isOpen, suggestedAssembly]);

  const handleConfirm = () => {
    if (!selectedAssembly) {
      setError("Please select an assembly to continue.");
      return;
    }
    setError("");
    onConfirm(selectedAssembly);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Assembly"
      size="md"
      footerContent={
        <Button
          onClick={handleConfirm}
          variant="primary"
          leftIcon={<Building2 size={16} />}
        >
          Confirm & Process
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Please assign the uploaded file{" "}
          <strong
            className="text-[var(--text-primary)] truncate"
            title={fileName}
          >
            {fileName}
          </strong>{" "}
          to an assembly.
        </p>

        {suggestedAssembly && (
          <div className="p-3 bg-[var(--success-start)]/10 border border-[var(--success-border)]/50 rounded-lg text-center text-sm">
            We've suggested{" "}
            <strong className="text-[var(--success-text)]">
              {suggestedAssembly} Assembly
            </strong>{" "}
            based on the file name.
          </div>
        )}

        <div>
          <label htmlFor="assembly-select" className="form-label">
            Assembly
          </label>
          <select
            id="assembly-select"
            value={selectedAssembly}
            onChange={(e) => {
              setSelectedAssembly(e.target.value);
              if (error) setError("");
            }}
            className={`form-input-light w-full ${error ? "input-error" : ""}`}
          >
            <option value="" disabled>
              -- Select an Assembly --
            </option>
            {ASSEMBLIES.sort().map((assembly) => (
              <option key={assembly} value={assembly}>
                {assembly} Assembly
              </option>
            ))}
          </select>
          {error && <p className="form-error-text mt-2">{error}</p>}
        </div>
      </div>
    </Modal>
  );
};

export default AssemblySelectionModal;
