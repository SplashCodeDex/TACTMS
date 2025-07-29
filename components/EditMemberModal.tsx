

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { UserPlus, Save } from 'lucide-react';
import { MemberRecordA } from '../types';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: MemberRecordA) => void;
  memberData?: MemberRecordA;
  assemblyName?: string;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ isOpen, onClose, onSave, memberData, assemblyName }) => {
  const [formData, setFormData] = useState<Partial<MemberRecordA>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = memberData && memberData['No.'] && !String(memberData['No.']).startsWith('new_');
  
  useEffect(() => {
    if (isOpen) {
      setFormData(memberData || {});
      setErrors({});
    }
  }, [isOpen, memberData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData['First Name']?.trim()) newErrors['First Name'] = 'First Name is required.';
    if (!formData['Surname']?.trim()) newErrors['Surname'] = 'Surname is required.';
    if (!formData['Membership Number']?.trim()) newErrors['Membership Number'] = 'Membership Number is required.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData as MemberRecordA);
    }
  };
  
  const FormField: React.FC<{ name: keyof MemberRecordA; label: string, required?: boolean }> = ({ name, label, required }) => (
    <div>
      <label htmlFor={`field-${String(name)}`} className="form-label">
        {label} {required && '*'}
      </label>
      <input
        id={`field-${String(name)}`}
        name={String(name)}
        type="text"
        value={String(formData[name] ?? '')}
        onChange={handleChange}
        className={`form-input-light ${errors[String(name)] ? 'input-error' : ''}`}
      />
      {errors[String(name)] && <p className="form-error-text">{errors[String(name)]}</p>}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit Member in ${assemblyName}` : `Add New Member to ${assemblyName}`}
      size="lg"
      footerContent={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="primary" leftIcon={isEditMode ? <Save size={16} /> : <UserPlus size={16} />}>
            {isEditMode ? 'Save Changes' : 'Add Member'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {isEditMode 
            ? "Update the member's details below. Changes will be saved directly to the master list."
            : "Fill in the details for the new member. They will be added to the master list for this assembly."
          }
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-color)]">
          <FormField name="Title" label="Title" />
          <FormField name="First Name" label="First Name" required />
          <FormField name="Surname" label="Surname" required />
          <FormField name="Other Names" label="Other Names" />
          <FormField name="Membership Number" label="Membership #" required />
          <FormField name="Old Membership Number" label="Old Membership #" />
          <FormField name="Gender" label="Gender" />
          <FormField name="Phone Number" label="Phone Number" />
          <FormField name="Whatsapp Number" label="WhatsApp Number" />
          <FormField name="Email" label="Email Address" />
          <FormField name="Residential Address" label="Residential Address" />
          <FormField name="Profession/Occupation" label="Occupation" />
        </div>
      </div>
    </Modal>
  );
};

export default EditMemberModal;