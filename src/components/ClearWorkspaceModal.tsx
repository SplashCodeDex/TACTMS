import React from "react";

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
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Clear Workspace?</h2>
        <p>
          Are you sure you want to clear the entire workspace? This action
          cannot be undone.
        </p>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ClearWorkspaceModal;
