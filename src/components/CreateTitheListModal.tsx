import React from 'react';

interface CreateTitheListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberCount: number;
  assemblyName: string;
}

const CreateTitheListModal: React.FC<CreateTitheListModalProps> = ({ isOpen, onClose, onConfirm, memberCount, assemblyName }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Create Tithe List?</h2>
        <p>Create a new tithe list for {assemblyName} with {memberCount} members?</p>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default CreateTitheListModal;
