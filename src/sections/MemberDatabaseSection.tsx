import React, { useState, useMemo } from "react";
import { MemberRecordA, MemberDatabase } from "../types";
import Button from "../components/Button";
import Checkbox from "../components/Checkbox";
import { Upload, PlusCircle, Edit, Search, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { filterMembersByAge } from "../services/excelProcessor";

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
  }>({ key: "customOrder", direction: "asc" });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(10); // You can make this configurable if needed

  // Age Filter state
  const [ageRangeMin, setAgeRangeMin] = useState<string>("");
  const [ageRangeMax, setAgeRangeMax] = useState<string>("");

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

    let members: MemberRecordA[] = [];

    if (selectedAssembly === "ALL MEMBERS") {
      // Aggregate all members from all assemblies
      Object.values(memberDatabase).forEach(db => {
        if (db && db.data) {
          members = [...members, ...db.data];
        }
      });
    } else {
      members = memberDatabase[selectedAssembly]?.data || [];
    }

    // 1. Filter by Search Term
    if (searchTerm) {
      members = members.filter((member) =>
        Object.values(member).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }

    // 2. Filter by Age
    if (ageRangeMin || ageRangeMax) {
      members = filterMembersByAge(
        members,
        Number(ageRangeMin) || undefined,
        Number(ageRangeMax) || undefined
      );
    }

    // 3. Sort
    if (sortConfig.key) {
      members.sort((a, b) => {
        if (sortConfig.key === 'customOrder') {
          return (a.customOrder || 0) - (b.customOrder || 0);
        }
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
  }, [memberDatabase, selectedAssembly, searchTerm, sortConfig, ageRangeMin, ageRangeMax]);

  const handleSort = (key: keyof MemberRecordA) => {
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        // Toggle to Descending
        setSortConfig({ key, direction: "desc" });
      } else {
        // Reset to Default (Custom Order)
        setSortConfig({ key: "customOrder", direction: "asc" });
      }
    } else {
      // Set new key to Ascending
      setSortConfig({ key, direction: "asc" });
    }
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
    if (selectedMembers.length === sortedAndFilteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(sortedAndFilteredMembers);
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
      const sortedSelectedMembers = [...selectedMembers].sort((a, b) => (a.customOrder || 0) - (b.customOrder || 0));
      onCreateTitheList(sortedSelectedMembers, selectedAssembly);
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

      <div className="flex border-b border-[var(--border-color)] overflow-x-auto">
        {Object.keys(memberDatabase)
          .filter(key => key !== "true") // Fix: Filter out "true" key
          .map((assemblyName) => (
            <button
              key={assemblyName}
              onClick={() => setSelectedAssembly(assemblyName)}
              className={`px-4 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${selectedAssembly === assemblyName
                ? "border-b-2 border-[var(--primary-accent-start)] text-[var(--primary-accent-start)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
            >
              {assemblyName}
            </button>
          ))}

        {/* ALL MEMBERS Tab - Pushed to the far right */}
        <button
          onClick={() => setSelectedAssembly("ALL MEMBERS")}
          className={`ml-auto px-4 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${selectedAssembly === "ALL MEMBERS"
            ? "border-b-2 border-[var(--primary-accent-start)] text-[var(--primary-accent-start)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
        >
          ALL MEMBERS
        </button>
      </div>

      {selectedAssembly && (memberDatabase[selectedAssembly] || selectedAssembly === "ALL MEMBERS") ? (
        <div className="content-card">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedAssembly}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedAssembly === "ALL MEMBERS"
                  ? sortedAndFilteredMembers.length
                  : memberDatabase[selectedAssembly]?.data.length} members
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1 rounded-md border border-[var(--border-color)]">
                <Filter size={16} className="text-gray-400 ml-2" />
                <input
                  type="number"
                  placeholder="Min Age"
                  value={ageRangeMin}
                  onChange={(e) => setAgeRangeMin(e.target.value)}
                  className="bg-transparent border-none text-sm w-20 focus:ring-0 p-1"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max Age"
                  value={ageRangeMax}
                  onChange={(e) => setAgeRangeMax(e.target.value)}
                  className="bg-transparent border-none text-sm w-20 focus:ring-0 p-1"
                />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--primary-accent-start)] focus:border-transparent w-64"
                />
              </div>



              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => selectedAssembly && handleFileChange(e, selectedAssembly)}
                  className="hidden"
                  disabled={selectedAssembly === "ALL MEMBERS"}
                />
                <Button
                  variant="primary"
                  leftIcon={<Upload size={16} />}
                  disabled={selectedAssembly === "ALL MEMBERS"}
                  className="pointer-events-none" // Add this to ensure clicks pass through to label if needed, or just let it bubble
                >
                  Upload Master List
                </Button>
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="modern-table min-w-full divide-y divide-[var(--border-color)]">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th scope="col" className="p-4">
                    <Checkbox
                      checked={
                        selectedMembers.length === sortedAndFilteredMembers.length &&
                        sortedAndFilteredMembers.length > 0
                      }
                      onChange={() => handleSelectAll()}
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
                {currentMembers.map((member, index) => (
                  <tr key={member["Membership Number"] || `${member["No."]}-${index}`}>
                    <td className="p-4">
                      <Checkbox
                        checked={selectedMembers.some(
                          (m) => m["No."] === member["No."],
                        )}
                        onChange={() => handleSelectMember(member)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]"> {/* Fixed: Changed color to text-primary (white in dark mode) */}
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
          {
            sortedAndFilteredMembers.length > membersPerPage && (
              <div className="flex justify-center mt-4 items-center gap-2">
                <div className="text-sm text-gray-500 dark:text-gray-400 mr-4">
                  Page {currentPage} of {totalPages}
                </div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* First Page */}
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => paginate(1)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700`}
                      >
                        1
                      </button>
                      {currentPage > 4 && <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">...</span>}
                    </>
                  )}

                  {/* Page Numbers Window */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page >= Number(currentPage) - 2 && page <= Number(currentPage) + 2)
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                          }`}
                      >
                        {page}
                      </button>
                    ))}

                  {/* Last Page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">...</span>}
                      <button
                        onClick={() => paginate(totalPages)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )
          }
        </div >
      ) : (
        <div className="text-center py-12 content-card">
          <p className="text-gray-500 dark:text-gray-400">
            No member databases found.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Upload a master list for an assembly to get started.
          </p>
        </div>
      )}
    </div >
  );
};

export default MemberDatabaseSection;
