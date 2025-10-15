import React from "react";
import Modal from "./Modal";
import Button from "./Button";

interface CreateTitheListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberCount: number;
  assemblyName: string;
}

const CreateTitheListModal: React.FC<CreateTitheListModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  memberCount,
  assemblyName,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Tithe List?">
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to create a new tithe list for{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {assemblyName}
          </span>{" "}
          with {memberCount} members?
        </p>
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

export default CreateTitheListModal;
