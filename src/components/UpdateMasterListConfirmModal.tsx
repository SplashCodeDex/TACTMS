import React from "react";
import { MasterListData, PendingMasterListUpdate } from "../types";
import Modal from "./Modal";
import Button from "./Button";

interface UpdateMasterListConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingData: MasterListData;
  pendingUpdate: PendingMasterListUpdate;
}

const UpdateMasterListConfirmModal: React.FC<
  UpdateMasterListConfirmModalProps
> = ({ isOpen, onClose, onConfirm, existingData, pendingUpdate }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Master List?">
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to update the master list for{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {pendingUpdate.assemblyName}
          </span>
          ?
        </p>
        <div className="flex justify-around p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Existing Records</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{existingData.data.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">New Records</p>
            <p className="text-2xl font-bold text-green-500">{pendingUpdate.newData.length}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
};

export default UpdateMasterListConfirmModal;
