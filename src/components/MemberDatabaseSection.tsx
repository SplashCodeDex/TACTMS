import React, { useState, useMemo } from "react";
import { MemberRecordA, MemberDatabase } from "../types";
import Button from "./Button";
import { Upload, PlusCircle, Edit, Search } from "lucide-react";
import { useOutletContext } from "react-router-dom";

interface MemberDatabaseSectionProps {
  memberDatabase: MemberDatabase;
  onUploadMasterList: (
    file: File | null,
    isMasterList: boolean,
    assemblyName?: string,
  ) => void;
  onCreateTitheList: (
    selectedMembers: MemberRecordA[],
    assemblyName: string,
  ) => void;
  onEditMember: (member: MemberRecordA, assemblyName: string) => void;
  addToast: (
    message: string,
    type: "success" | "error" | "info" | "warning",
  ) => void;
}

const MemberDatabaseSection: React.FC = () => {
  const {
    memberDatabase = {},
    onUploadMasterList,
    onCreateTitheList,
    onEditMember,
    addToast,
  } = useOutletContext<MemberDatabaseSectionProps>();
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(
    Object.keys(memberDatabase)[0] || null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<MemberRecordA[]>([]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    assemblyName: string,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadMasterList(file, true, assemblyName);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!selectedAssembly) return [];
    const members = memberDatabase[selectedAssembly]?.data || [];
    if (!searchTerm) return members;
    return members.filter((member) =>
      Object.values(member).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [memberDatabase, selectedAssembly, searchTerm]);

  const handleSelectMember = (member: MemberRecordA) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m["No."] === member["No."])
        ? prev.filter((m) => m["No."] !== member["No."])
        : [...prev, member],
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers);
    }
  };

  const handleCreateList = () => {
    if (selectedMembers.length === 0) {
      addToast(
        "Please select at least one member to create a list.",
        "warning",
      );
      return;
    }
    if (selectedAssembly) {
      onCreateTitheList(selectedMembers, selectedAssembly);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Member Database</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleCreateList}
            disabled={selectedMembers.length === 0}
            leftIcon={<PlusCircle size={16} />}
          >
            Create Tithe List ({selectedMembers.length})
          </Button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {Object.keys(memberDatabase).map((assemblyName) => (
          <button
            key={assemblyName}
            onClick={() => setSelectedAssembly(assemblyName)}
            className={`px-4 py-2 text-sm font-medium ${
              selectedAssembly === assemblyName
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {assemblyName}
          </button>
        ))}
      </div>

      {selectedAssembly && memberDatabase[selectedAssembly] ? (
        <div className="content-card">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedAssembly}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {memberDatabase[selectedAssembly].data.length} members
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input-light w-full sm:w-64 pl-10"
                />
              </div>
              <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700">
                <Upload size={16} />
                <span>Upload Master List</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={(e) => handleFileChange(e, selectedAssembly)}
                />
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="p-4">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={
                        selectedMembers.length === filteredMembers.length &&
                        filteredMembers.length > 0
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Membership No.
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Phone Number
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                {filteredMembers.map((member) => (
                  <tr key={member["No."]}>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={selectedMembers.some(
                          (m) => m["No."] === member["No."],
                        )}
                        onChange={() => handleSelectMember(member)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {member["First Name"]} {member.Surname}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {member["Membership Number"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {member["Phone Number"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditMember(member, selectedAssembly)}
                      >
                        <Edit size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No member databases found.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Upload a master list for an assembly to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default MemberDatabaseSection;
