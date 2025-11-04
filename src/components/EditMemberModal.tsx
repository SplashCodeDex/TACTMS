import React, { useState, useEffect } from "react";
import { MemberRecordA } from "../types";
import Modal from "./Modal";
import Button from "./Button";

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
  const [formData, setFormData] = useState<MemberRecordA>(memberData);

  useEffect(() => {
    setFormData(memberData);
  }, [memberData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Member in ${assemblyName}`} closeOnOutsideClick={false}>
      <div className="space-y-4">
        {Object.keys(formData).filter(key => key !== 'customOrder' && key !== 'No.').map((key) => (
          <div key={key}>
            <label htmlFor={key} className="form-label">{key}</label>
            <input
              id={key}
              name={key}
              type="text"
              value={formData[key]}
              onChange={handleChange}
              className="form-input-light w-full"
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </Modal>
  );
};

export default EditMemberModal;
