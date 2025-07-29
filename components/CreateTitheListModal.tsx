
import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { ChevronsRight, Users } from 'lucide-react';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Tithers List"
      size="md"
      footerContent={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} variant="primary" leftIcon={<ChevronsRight size={16} />}>
            Confirm & Proceed
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <Users size={40} className="mx-auto text-[var(--primary-accent-start)]" />
        <p className="text-lg text-[var(--text-primary)]">
          You have selected <strong className="font-bold text-gradient-primary">{memberCount}</strong> members from the
          <strong className="font-bold text-gradient-primary ml-1">{assemblyName} Assembly</strong> master list.
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Confirming will take you to the Tithe Processor with a new list containing these members.
          You can then reorder them and set their master sort order for weekly use.
        </p>
      </div>
    </Modal>
  );
};

export default CreateTitheListModal;
