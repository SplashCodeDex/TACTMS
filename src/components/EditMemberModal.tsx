import React from "react";
import { MemberRecordA } from "../types";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: MemberRecordA) => void;
  memberData: MemberRecordA;
  assemblyName: string;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  memberData,
  assemblyName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Edit Member in {assemblyName}</h2>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onSave(memberData)}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditMemberModal;
