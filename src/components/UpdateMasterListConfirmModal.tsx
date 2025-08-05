import React from 'react';
import { MasterListData, PendingMasterListUpdate } from '../types';

interface UpdateMasterListConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingData: MasterListData;
  pendingUpdate: PendingMasterListUpdate;
}

const UpdateMasterListConfirmModal: React.FC<UpdateMasterListConfirmModalProps> = ({ isOpen, onClose, onConfirm, pendingUpdate }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Update Master List?</h2>
        <p>Are you sure you want to update the master list for {pendingUpdate.assemblyName}?</p>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default UpdateMasterListConfirmModal;
