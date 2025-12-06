import React, { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useAppConfigContext } from "@/context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const { assemblies } = useAppConfigContext();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Assembly">
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600 dark:text-blue-300"
            >
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4 8 4v14" />
              <path d="M17 21v-8.5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2V21" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Assembly Detection
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              We detected the file{" "}
              <span className="font-semibold underline decoration-blue-400 underline-offset-2">
                {fileName}
              </span>
              . Please confirm which assembly this belongs to.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="assembly-select" className="form-label text-base">
            Select Assembly
          </label>
          <Select
            value={selectedAssembly}
            onValueChange={setSelectedAssembly}
          >
            <SelectTrigger
              id="assembly-select"
              className="w-full h-12 text-lg bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            >
              <SelectValue placeholder="-- Choose an assembly --" />
            </SelectTrigger>
            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl shadow-xl max-h-[300px]">
              {assemblies.map((assembly) => (
                <SelectItem
                  key={assembly}
                  value={assembly}
                  className="py-3 px-4 text-base cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 dark:focus:bg-blue-900/20 transition-colors"
                >
                  {assembly}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <Button variant="outline" onClick={onClose} className="px-6">
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={!selectedAssembly}
          className="px-8 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300"
        >
          Confirm Selection
        </Button>
      </div>
    </Modal>
  );
};

export default AssemblySelectionModal;
