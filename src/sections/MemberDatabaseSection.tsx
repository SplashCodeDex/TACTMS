import React, { useState, useMemo, useRef, useEffect } from "react";
import { MemberRecordA, MemberDatabase } from "../types";
import Button from "../components/Button";
import Checkbox from "../components/Checkbox";
import AddAssemblyModal from "../components/AddAssemblyModal";
import { PlusCircle, Edit, Search, ArrowUp, ArrowDown, Filter, Hash, GripVertical, Image, Download, History, FileUp } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { filterMembersByAge } from "../services/excelProcessor";
import { useModal } from "../hooks/useModal";
import {
  getOrderedMembers,
  MemberOrderEntry,
  initializeOrder,
} from "../services/memberOrderService";
import MemberReorderModal from "../components/MemberReorderModal";
import ReorderFromImageModal from "../components/ReorderFromImageModal";
import OrderHistoryModal from "../components/OrderHistoryModal";
import * as XLSX from "xlsx";

import { computeColumnWidths } from "@/lib/exportUtils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MemberDatabaseSectionProps {
  memberDatabase: MemberDatabase;
  onUploadMasterList: (
    file: File,
    assemblyName: string,
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
  onAddAssembly?: (assemblyName: string) => void;
}

const MemberDatabaseSection: React.FC = () => {
  const {
    memberDatabase = {},
    onUploadMasterList,
    onCreateTitheList,
    onEditMember,
    addToast,
    onAddAssembly,
  } = useOutletContext<MemberDatabaseSectionProps>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(
    Object.keys(memberDatabase).filter((k) => k !== "true")[0] || null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<MemberRecordA[]>([]);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MemberRecordA | null;
    direction: "asc" | "desc";
  }>({ key: "customOrder", direction: "asc" });

  // Order Map State
  const [memberOrderMap, setMemberOrderMap] = useState<Map<string, number>>(new Map());

  // Fetch updated order when assembly or database updates
  useEffect(() => {
    if (selectedAssembly && selectedAssembly !== "ALL MEMBERS") {
      getOrderedMembers(selectedAssembly).then((ordered) => {
        const map = new Map<string, number>();
        ordered.forEach((o) => map.set(o.memberId.toLowerCase(), o.titheBookIndex));
        setMemberOrderMap(map);
      }).catch(err => console.error("Failed to fetch member order:", err));
    }
  }, [selectedAssembly, memberDatabase[selectedAssembly || ""]?.lastUpdated]);



  // Age Filter state
  const [ageRangeMin, setAgeRangeMin] = useState<string>("");
  const [ageRangeMax, setAgeRangeMax] = useState<string>("");

  // Add Assembly Modal state
  const addAssemblyModal = useModal("addAssembly");

  // Reorder Modal state
  const reorderModal = useModal("memberReorder");
  const reorderFromImageModal = useModal("reorderFromImage");
  const orderHistoryModal = useModal("orderHistory");
  const [orderedMembersForModal, setOrderedMembersForModal] = useState<MemberOrderEntry[]>([]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    assemblyName: string,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadMasterList(file, assemblyName);
    }
    // Reset input to allow re-uploading the same file
    event.target.value = "";
  };

  // Export member database as Excel
  const handleExportExcel = () => {
    if (!selectedAssembly || selectedAssembly === "ALL MEMBERS") {
      addToast("Please select a specific assembly to export", "warning");
      return;
    }
    const members = memberDatabase[selectedAssembly]?.data || [];
    if (members.length === 0) {
      addToast("No members to export", "warning");
      return;
    }

    try {
      // Build data for export: match A.xlsx format
      const exportData = members.map((m, index) => {
        const memberId = (m["Membership Number"] || m["Old Membership Number"] || "").toLowerCase();
        const order = memberOrderMap.get(memberId) || index + 1;
        return {
          "No.": order,
          "Membership Number": m["Membership Number"] || "",
          "Old Membership Number": m["Old Membership Number"] || "",
          "Title": m.Title || "",
          "First Name": m["First Name"] || "",
          "Surname": m.Surname || "",
          "Other Names": m["Other Names"] || "",
          "Sex": m.Sex || "",
          "Date of Birth": m["Date of Birth"] || "",
          "Phone Number": m["Phone Number"] || "",
          "Residential Address": m["Residential Address"] || "",
          "Hometown/Region": m["Hometown/Region"] || "",
          "Marital Status": m["Marital Status"] || "",
          "Employment Status": m["Employment Status"] || "",
          "Occupation": m.Occupation || "",
        };
      });

      // Sort by order before exporting
      exportData.sort((a, b) => a["No."] - b["No."]);

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = computeColumnWidths(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, selectedAssembly);
      XLSX.writeFile(workbook, `${selectedAssembly.replace(/\s+/g, "_")}_Members_${new Date().toISOString().split("T")[0]}.xlsx`);
      addToast("Member list exported successfully", "success");
    } catch (error) {
      console.error("Export failed:", error);
      addToast("Failed to export member list", "error");
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
          const idA = (a["Membership Number"] || a["Old Membership Number"] || "").toLowerCase();
          const idB = (b["Membership Number"] || b["Old Membership Number"] || "").toLowerCase();
          const orderA = memberOrderMap.get(idA);
          const orderB = memberOrderMap.get(idB);

          // Prioritize mapped order, then fallback to property, then 0
          const valA = orderA !== undefined ? orderA : (a.customOrder || 99999);
          const valB = orderB !== undefined ? orderB : (b.customOrder || 99999);

          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
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
  }, [memberDatabase, selectedAssembly, searchTerm, sortConfig, ageRangeMin, ageRangeMax, memberOrderMap]);

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
      const sortedSelectedMembers = [...selectedMembers].sort((a, b) => {
        const idA = (a["Membership Number"] || a["Old Membership Number"] || "").toLowerCase();
        const idB = (b["Membership Number"] || b["Old Membership Number"] || "").toLowerCase();
        const orderA = memberOrderMap.get(idA);
        const orderB = memberOrderMap.get(idB);

        // Prioritize mapped order, then fallback to property, then 0
        const valA = orderA !== undefined ? orderA : (a.customOrder || 99999);
        const valB = orderB !== undefined ? orderB : (b.customOrder || 99999);

        return valA - valB;
      });
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

        {/* Add New Assembly Button */}
        <button
          onClick={() => addAssemblyModal.open()}
          className="px-3 py-2 text-lg text-[var(--text-tertiary)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors rounded-md"
          title="Add New Assembly"
        >
          +
        </button>

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


              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => selectedAssembly && handleFileChange(e, selectedAssembly)}
                className="hidden"
              />
              {selectedAssembly !== "ALL MEMBERS" && (
                <>
                  <Button
                    variant="secondary"
                    leftIcon={<GripVertical size={16} />}
                    onClick={async () => {
                      if (selectedAssembly) {
                        let ordered = await getOrderedMembers(selectedAssembly);
                        const currentMembers = memberDatabase[selectedAssembly]?.data || [];

                        // If no order exists in IndexedDB, initialize from member database
                        if (ordered.length === 0) {
                          if (currentMembers.length > 0) {
                            await initializeOrder(currentMembers, selectedAssembly);
                            ordered = await getOrderedMembers(selectedAssembly);
                          }
                        } else {
                          // Filter to only include members that exist in current database
                          const currentMemberIds = new Set(
                            currentMembers.map(m =>
                              (m["Membership Number"] || m["Old Membership Number"] || "").toLowerCase()
                            )
                          );
                          ordered = ordered.filter(o => currentMemberIds.has(o.memberId.toLowerCase()));
                        }

                        setOrderedMembersForModal(ordered);
                        reorderModal.open();
                      }
                    }}
                  >
                    Reorder
                  </Button>
                  <Button
                    variant="secondary"
                    leftIcon={<Image size={16} />}
                    onClick={() => reorderFromImageModal.open()}
                  >
                    AI Reorder
                  </Button>
                  <Button
                    variant="ghost"
                    leftIcon={<Download size={16} />}
                    onClick={handleExportExcel}
                  >
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    leftIcon={<FileUp size={16} />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Import
                  </Button>
                  <Button
                    variant="ghost"
                    leftIcon={<History size={16} />}
                    onClick={() => orderHistoryModal.open()}
                  >
                    History
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="border rounded-md border-[var(--border-color)] bg-[var(--bg-elevated)]">
            <ScrollArea className="h-[calc(100vh-280px)]" type="always">
              <table className="modern-table min-w-full divide-y divide-[var(--border-color)]">
                <thead className="bg-[var(--bg-elevated)] sticky top-0 z-10 shadow-sm">
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
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      onClick={() => handleSort("customOrder")}
                      title="Tithe Book Order - Position in physical tithe book"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Hash size={14} />
                        {sortConfig.key === "customOrder" && (
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
                  {sortedAndFilteredMembers.map((member, index) => (
                    <tr key={member["Membership Number"] || `${member["No."]}-${index}`}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedMembers.some(
                            (m) => m["No."] === member["No."],
                          )}
                          onChange={() => handleSelectMember(member)}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-[var(--primary-accent-start)] font-semibold">
                        {(() => {
                          const memberId = (member["Membership Number"] || member["Old Membership Number"] || "").toLowerCase();
                          return memberOrderMap.get(memberId) || "-";
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
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
            </ScrollArea>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 content-card">
          <p className="text-gray-500 dark:text-gray-400">
            No member databases found.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Upload a master list for an assembly to get started.
          </p>
        </div>
      )
      }

      {/* Add Assembly Modal */}
      <AddAssemblyModal
        isOpen={addAssemblyModal.isOpen}
        onClose={addAssemblyModal.close}
        onConfirm={(name, file) => {
          onAddAssembly?.(name);
          if (file) {
            // Upload the file for this new assembly
            onUploadMasterList(file, name);
          }
          addAssemblyModal.close();
        }}
        existingAssemblies={Object.keys(memberDatabase)}
      />

      {/* Member Reorder Modal */}
      <MemberReorderModal
        isOpen={reorderModal.isOpen}
        onClose={reorderModal.close}
        assemblyName={selectedAssembly || ""}
        orderedMembers={orderedMembersForModal}
        onSaveComplete={async () => {
          // Refresh the order map after save
          if (selectedAssembly) {
            const ordered = await getOrderedMembers(selectedAssembly);
            const map = new Map<string, number>();
            ordered.forEach((o) => map.set(o.memberId.toLowerCase(), o.titheBookIndex));
            setMemberOrderMap(map);
          }
        }}
        addToast={addToast}
        masterList={memberDatabase[selectedAssembly || ""]?.data || []}
        onOpenHistory={() => orderHistoryModal.open()}
      />

      {/* Reorder from Image Modal */}
      <ReorderFromImageModal
        isOpen={reorderFromImageModal.isOpen}
        onClose={reorderFromImageModal.close}
        assemblyName={selectedAssembly || ""}
        memberDatabase={memberDatabase[selectedAssembly || ""]?.data || []}
        memberOrderMap={memberOrderMap} // Pass for positional hints
        onSaveComplete={async () => {
          // Refresh the order map after save
          if (selectedAssembly) {
            const ordered = await getOrderedMembers(selectedAssembly);
            const map = new Map<string, number>();
            ordered.forEach((o) => map.set(o.memberId.toLowerCase(), o.titheBookIndex));
            setMemberOrderMap(map);
          }
        }}
        addToast={addToast}
      />

      {/* Order History Modal */}
      <OrderHistoryModal
        isOpen={orderHistoryModal.isOpen}
        onClose={orderHistoryModal.close}
        assemblyName={selectedAssembly || ""}
      />
    </div >
  );
};

export default MemberDatabaseSection;
