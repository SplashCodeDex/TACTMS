import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { ASSEMBLIES } from "../constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface AssemblySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assembly: string) => void;
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
  const [selectedAssembly, setSelectedAssembly] = useState(
    suggestedAssembly || "",
  );

  useEffect(() => {
    setSelectedAssembly(suggestedAssembly || "");
  }, [suggestedAssembly, isOpen]);

  const handleConfirm = () => {
    if (selectedAssembly) {
      onConfirm(selectedAssembly);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Assembly">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Which assembly does the file{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {fileName}
          </span>{" "}
          belong to?
        </p>
        <div>
          <label htmlFor="assembly-select" className="form-label">
            Assembly
          </label>
          <Select
            value={selectedAssembly}
            onValueChange={setSelectedAssembly}
          >
            <SelectTrigger
              id="assembly-select"
              className="w-full"
            >
              <SelectValue placeholder="-- Select an assembly --" />
            </SelectTrigger>
            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
              {ASSEMBLIES.map((assembly) => (
                <SelectItem
                  key={assembly}
                  value={assembly}
                >
                  {assembly}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={!selectedAssembly}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
};

export default AssemblySelectionModal;
