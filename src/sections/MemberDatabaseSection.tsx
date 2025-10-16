import React, { useState, useMemo } from "react";
import { MemberRecordA, MemberDatabase } from "../types";
import Button from "./Button";
import { Upload, PlusCircle, Edit, Search, ArrowUp, ArrowDown } from "lucide-react";
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

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MemberRecordA | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(10); // You can make this configurable if needed

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    assemblyName: string,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadMasterList(file, true, assemblyName);
    }
  };

  const sortedAndFilteredMembers = useMemo(() => {
    if (!selectedAssembly) return [];
    let members = memberDatabase[selectedAssembly]?.data || [];

    if (searchTerm) {
      members = members.filter((member) =>
        Object.values(member).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }

    if (sortConfig.key) {
      members.sort((a, b) => {
        const aValue = String(a[sortConfig.key!]).toLowerCase();
        const bValue = String(b[sortConfig.key!]).toLowerCase();

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return members;
  }, [memberDatabase, selectedAssembly, searchTerm, sortConfig]);

  const handleSort = (key: keyof MemberRecordA) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Get current members for pagination
  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = sortedAndFilteredMembers.slice(indexOfFirstMember, indexOfLastMember);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const totalPages = Math.ceil(sortedAndFilteredMembers.length / membersPerPage);

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

      <div className="flex border-b border-[var(--border-color)]">
        {Object.keys(memberDatabase).map((assemblyName) => (
          <button
            key={assemblyName}
            onClick={() => setSelectedAssembly(assemblyName)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              selectedAssembly === assemblyName
                ? "border-b-2 border-[var(--primary-accent-start)] text-[var(--primary-accent-start)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
            <table className="modern-table min-w-full divide-y divide-[var(--border-color)]">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th scope="col" className="p-4">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={
                        selectedMembers.length === sortedAndFilteredMembers.length &&
                        sortedAndFilteredMembers.length > 0
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    onClick={() => handleSort("First Name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortConfig.key === "First Name" && (
                        sortConfig.direction === "asc" ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    onClick={() => handleSort("Membership Number")}
                  >
                    <div className="flex items-center gap-1">
                      Membership No.
                      {sortConfig.key === "Membership Number" && (
                        sortConfig.direction === "asc" ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    onClick={() => handleSort("Phone Number")}
                  >
                    <div className="flex items-center gap-1">
                      Phone Number
                      {sortConfig.key === "Phone Number" && (
                        sortConfig.direction === "asc" ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {currentMembers.map((member) => (
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
          {filteredMembers.length > membersPerPage && (
            <div className="flex justify-center mt-4">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => paginate(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === i + 1
                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
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
