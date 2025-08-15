import React from "react";
import Modal from "./Modal";
import Button from "./Button";
import { Eraser, AlertTriangle } from "lucide-react";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clear Current Workspace"
      size="md"
      footerContent={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="danger"
            leftIcon={<Eraser size={16} />}
          >
            Yes, Clear Workspace
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <AlertTriangle
          size={40}
          className="mx-auto text-[var(--warning-text)]"
        />
        <p className="text-lg text-[var(--text-primary)]">
          Are you sure you want to clear the current workspace?
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          All currently loaded data, including any unsaved changes, will be
          permanently removed. This action does not affect your saved Favorites
          or Member Database.
        </p>
      </div>
    </Modal>
  );
};

export default ClearWorkspaceModal;
