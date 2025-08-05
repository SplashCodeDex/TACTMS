import React from 'react';

interface AssemblySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assembly: string) => void;
  fileName: string;
  suggestedAssembly?: string;
}

const AssemblySelectionModal: React.FC<AssemblySelectionModalProps> = ({ isOpen, onClose, onConfirm, fileName, suggestedAssembly }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Select Assembly</h2>
        <p>Which assembly does the file \"{fileName}\" belong to?</p>
        {/* A real implementation would have a dropdown or search */}
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onConfirm(suggestedAssembly || 'Default Assembly')}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default AssemblySelectionModal;
