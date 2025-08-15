import React from "react";
import Modal from "./Modal";
import Button from "./Button";
import { MasterListData, MemberRecordA } from "../types";
import { AlertTriangle, File, Calendar, Hash } from "lucide-react";

interface PendingMasterListUpdate {
  assemblyName: string;
  newData: MemberRecordA[];
  newFileName: string;
}

interface UpdateMasterListConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingData: MasterListData | undefined;
  pendingUpdate: PendingMasterListUpdate | null;
}

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number | null;
}> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between text-sm py-2">
    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
      {icon}
      <span>{label}</span>
    </div>
    <span
      className="font-semibold text-[var(--text-primary)] text-right truncate"
      title={String(value)}
    >
      {value}
    </span>
  </div>
);

const UpdateMasterListConfirmModal: React.FC<
  UpdateMasterListConfirmModalProps
> = ({ isOpen, onClose, onConfirm, existingData, pendingUpdate }) => {
  if (!isOpen || !pendingUpdate || !existingData) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Master List Update"
      size="lg"
      footerContent={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="danger"
            leftIcon={<AlertTriangle size={16} />}
          >
            Yes, Overwrite List
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="text-center p-4 bg-[var(--danger-start)]/10 rounded-lg">
          <AlertTriangle
            size={32}
            className="mx-auto text-[var(--danger-text)] mb-2"
          />
          <h3 className="text-lg font-bold text-[var(--danger-text)]">
            You are about to overwrite existing data.
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Please review the details below. This action cannot be undone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg bg-[var(--bg-card-subtle-accent)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-md mb-2 text-center text-[var(--text-secondary)]">
              Current List on Record
            </h4>
            <div className="divide-y divide-[var(--border-color-light)]/50">
              <InfoRow
                icon={<File size={16} />}
                label="File Name"
                value={existingData.fileName}
              />
              <InfoRow
                icon={<Calendar size={16} />}
                label="Last Updated"
                value={new Date(existingData.lastUpdated).toLocaleString()}
              />
              <InfoRow
                icon={<Hash size={16} />}
                label="Records"
                value={existingData.data.length}
              />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[var(--bg-card-subtle-accent)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-md mb-2 text-center text-[var(--text-primary)]">
              New File to Upload
            </h4>
            <div className="divide-y divide-[var(--border-color-light)]/50">
              <InfoRow
                icon={<File size={16} />}
                label="File Name"
                value={pendingUpdate.newFileName}
              />
              <InfoRow
                icon={<Calendar size={16} />}
                label="Upload Time"
                value="Now"
              />
              <InfoRow
                icon={<Hash size={16} />}
                label="Records"
                value={pendingUpdate.newData.length}
              />
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-[var(--text-muted)] mt-2">
          Confirming will replace the current list for{" "}
          <strong className="text-[var(--text-primary)]">
            {pendingUpdate.assemblyName} Assembly
          </strong>{" "}
          with the contents of the new file.
        </div>
      </div>
    </Modal>
  );
};

export default UpdateMasterListConfirmModal;
