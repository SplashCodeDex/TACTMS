import React from "react";
import Modal from "./Modal";
import Button from "./Button";
import { AlertTriangle } from "lucide-react";

interface ClearWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ClearWorkspaceModal: React.FC<ClearWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clear Workspace?" closeOnOutsideClick={false}>
      <div className="space-y-4">
        <div className="flex items-center">
          <AlertTriangle className="text-red-500 mr-3" size={24} />
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to clear the entire workspace? This will remove all uploaded data and unsaved changes. This action cannot be undone.
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
};

export default ClearWorkspaceModal;
