import React, { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { UserPlus, Search, PlusCircle } from "lucide-react";
import { MemberRecordA, TitheRecordB } from "../types";

const FormField: React.FC<{
  name: keyof MemberRecordA;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}> = ({ name, label, value, onChange, error, required, placeholder }) => (
  <div>
    <label htmlFor={`field-${String(name)}`} className="form-label">
      {label} {required && "*"}
    </label>
    <input
      id={`field-${String(name)}`}
      name={String(name)}
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`form-input-light ${error ? "input-error" : ""}`}
    />
    {error && <p className="form-error-text">{error}</p>}
  </div>
);

interface AddNewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (member: MemberRecordA) => void;

  onAddExistingMember: (member: MemberRecordA) => void;
  currentAssembly: string | null;
  memberDatabase: MemberRecordA[];
  titheListData: TitheRecordB[];
}

const AddNewMemberModal: React.FC<AddNewMemberModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onAddExistingMember,
  currentAssembly,
  memberDatabase,
  titheListData,
}) => {
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");

  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<MemberRecordA>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const existingTitheListMemberNos = useMemo(() => {
    return new Set(titheListData.map((r) => r["No."]));
  }, [titheListData]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    if (!memberDatabase) return [];

    const lowerSearchTerm = searchTerm.toLowerCase();

    return memberDatabase
      .filter((member) => {
        // More robust check: if a member with this unique 'No.' is already in the list, exclude them.
        if (member["No."] && existingTitheListMemberNos.has(member["No."])) {
          return false;
        }

        const name =
          `${member["First Name"] || ""} ${member.Surname || ""}`.toLowerCase();
        const memberId = (member["Membership Number"] || "").toLowerCase();

        return (
          name.includes(lowerSearchTerm) || memberId.includes(lowerSearchTerm)
        );
      })
      .slice(0, 15);
  }, [searchTerm, memberDatabase, existingTitheListMemberNos]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("search");
      setSearchTerm("");
      setFormData({});
      setErrors({});
    }
  }, [isOpen]);

  const handleCreateConfirm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData["First Name"]?.trim())
      newErrors["First Name"] = "First Name is required.";
    if (!formData["Surname"]?.trim())
      newErrors["Surname"] = "Surname is required.";
    if (!formData["Membership Number"]?.trim())
      newErrors["Membership Number"] = "Membership Number is required.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const maxCustomOrder = memberDatabase.reduce((max, member) => Math.max(max, member.customOrder || 0), 0);
      const newMember: MemberRecordA = {
        "No.": `new_${Date.now()}`,
        Title: formData.Title || "",
        "First Name": formData["First Name"] || "",
        Surname: formData.Surname || "",
        "Other Names": formData["Other Names"] || "",
        "Membership Number": formData["Membership Number"] || "",
        "Phone Number": formData["Phone Number"] || "",
        customOrder: maxCustomOrder + 1,
      };
      onConfirm(newMember);
      setFormData({});
    }
  };

  const handleAddExisting = (member: MemberRecordA) => {
    onAddExistingMember(member);
    // After adding, immediately update search results to remove the added member
    setSearchTerm((prev) => prev + " ");
    setTimeout(() => setSearchTerm((prev) => prev.trim()), 0);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Member to List for ${currentAssembly} Assembly`}
      size="lg"
      closeOnOutsideClick={false}
      footerContent={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex border-b border-[var(--border-color)] mb-4">
        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "search" ? "border-b-2 border-[var(--primary-accent-start)] text-[var(--primary-accent-start)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
        >
          Search Existing
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "create" ? "border-b-2 border-[var(--primary-accent-start)] text-[var(--primary-accent-start)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
        >
          Create New
        </button>
      </div>

      {activeTab === "search" && (
        <div className="space-y-4 min-h-[300px]">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name or membership ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input-light w-full !pl-10"
              autoFocus
            />
          </div>
          {searchTerm && searchResults.length > 0 && (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {searchResults.map((member) => (
                <li
                  key={member["No."]}
                  className="p-2 flex items-center justify-between bg-[var(--bg-elevated)] rounded-md border border-[var(--border-color)]"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{`${member["First Name"] || ""} ${member.Surname || ""}`}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      ID: {member["Membership Number"]}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddExisting(member)}
                    leftIcon={<PlusCircle size={14} />}
                  >
                    Add to list
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {searchTerm && searchResults.length === 0 && (
            <p className="text-center text-sm text-[var(--text-muted)] pt-8">
              No matching members found in the current workspace data, or they
              are already in the list. Try the 'Create New' tab.
            </p>
          )}
          {!searchTerm && (
            <p className="text-center text-sm text-[var(--text-muted)] pt-8">
              Start typing to search for members to add.
            </p>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Use this form for a brand new convert not in the master database.
            They will be added to the database and the current tithe list.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="Title"
              label="Title"
              value={String(formData.Title ?? "")}
              onChange={handleFormChange}
              placeholder="e.g., Bro, Sis, Mr, Mrs"
            />
            <FormField
              name="Membership Number"
              label="Membership Number"
              value={String(formData["Membership Number"] ?? "")}
              onChange={handleFormChange}
              error={errors["Membership Number"]}
              required
              placeholder="e.g., JK-CEN-001"
            />
            <FormField
              name="First Name"
              label="First Name"
              value={String(formData["First Name"] ?? "")}
              onChange={handleFormChange}
              error={errors["First Name"]}
              required
            />
            <FormField
              name="Surname"
              label="Surname"
              value={String(formData.Surname ?? "")}
              onChange={handleFormChange}
              error={errors.Surname}
              required
            />
            <FormField
              name="Other Names"
              label="Other Names"
              value={String(formData["Other Names"] ?? "")}
              onChange={handleFormChange}
            />
            <FormField
              name="Phone Number"
              label="Phone Number"
              value={String(formData["Phone Number"] ?? "")}
              onChange={handleFormChange}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleCreateConfirm}
              variant="primary"
              leftIcon={<UserPlus size={16} />}
            >
              Add New Member
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AddNewMemberModal;
