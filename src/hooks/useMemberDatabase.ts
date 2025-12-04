import { useState, useCallback, useEffect } from "react";
import { MemberDatabase, MemberRecordA, MembershipReconciliationReport } from "../types";
import { MEMBER_DATABASE_STORAGE_KEY } from "../constants";

interface UseMemberDatabaseReturn {
    memberDatabase: MemberDatabase;
    setMemberDatabase: React.Dispatch<React.SetStateAction<MemberDatabase>>;
    updateMember: (member: MemberRecordA, assemblyName: string) => void;
    deleteMember: (memberId: string | number, assemblyName: string) => void;
    deleteAssembly: (assemblyName: string) => void;
    resolveConflicts: (
        report: MembershipReconciliationReport,
        resolution: "use_new" | "keep_existing",
        assembly: string
    ) => void;
    getAssemblyMembers: (assemblyName: string) => MemberRecordA[];
    assembliesWithData: Set<string>;
}

/**
 * Hook to manage the member database with localStorage persistence.
 * Handles CRUD operations for members and assemblies.
 */
export function useMemberDatabase(
    addToast: (message: string, type: "info" | "success" | "error" | "warning") => void
): UseMemberDatabaseReturn {
    const [memberDatabase, setMemberDatabase] = useState<MemberDatabase>(() => {
        const saved = localStorage.getItem(MEMBER_DATABASE_STORAGE_KEY);
        if (!saved) return {};
        try {
            const parsed = JSON.parse(saved);
            // Migration logic for old structure to new structure with metadata
            Object.keys(parsed).forEach((key) => {
                if (Array.isArray(parsed[key])) {
                    // This detects the old format: MemberRecordA[]
                    parsed[key] = {
                        data: parsed[key],
                        lastUpdated: new Date(0).getTime(),
                        fileName: "Unknown (migrated data)",
                    };
                }
            });
            return parsed;
        } catch (e) {
            console.error("Failed to parse member database from storage:", e);
            return {};
        }
    });

    // Persist to localStorage on change
    useEffect(() => {
        localStorage.setItem(MEMBER_DATABASE_STORAGE_KEY, JSON.stringify(memberDatabase));
    }, [memberDatabase]);

    const updateMember = useCallback(
        (member: MemberRecordA, assemblyName: string) => {
            setMemberDatabase((prev) => {
                const assemblyData = prev[assemblyName]?.data || [];
                const updatedData = assemblyData.map((m) =>
                    m["No."] === member["No."] ? member : m
                );

                return {
                    ...prev,
                    [assemblyName]: {
                        ...(prev[assemblyName] || {
                            lastUpdated: Date.now(),
                            fileName: "Mixed Source",
                        }),
                        data: updatedData,
                        lastUpdated: Date.now(),
                    },
                };
            });
            addToast("Member updated successfully.", "success");
        },
        [addToast]
    );

    const deleteMember = useCallback(
        (memberId: string | number, assemblyName: string) => {
            setMemberDatabase((prev) => {
                const assemblyData = prev[assemblyName]?.data || [];
                const updatedData = assemblyData.filter((m) => m["No."] !== memberId);

                return {
                    ...prev,
                    [assemblyName]: {
                        ...(prev[assemblyName] || {
                            lastUpdated: Date.now(),
                            fileName: "Mixed Source",
                        }),
                        data: updatedData,
                        lastUpdated: Date.now(),
                    },
                };
            });
            addToast("Member deleted.", "success");
        },
        [addToast]
    );

    const deleteAssembly = useCallback(
        (assemblyName: string) => {
            setMemberDatabase((prev) => {
                const { [assemblyName]: _, ...rest } = prev;
                return rest;
            });
            addToast(`Deleted all data for ${assemblyName} assembly.`, "success");
        },
        [addToast]
    );

    const resolveConflicts = useCallback(
        (
            report: MembershipReconciliationReport,
            resolution: "use_new" | "keep_existing",
            assembly: string
        ) => {
            const { conflicts, newMembers, changedMembers } = report;

            setMemberDatabase((prev) => {
                const prevAssemblyData = prev[assembly]?.data || [];
                let updatedData = [...prevAssemblyData];

                // 1. Apply Changes (Non-conflicting)
                if (changedMembers.length > 0) {
                    const changesMap = new Map(
                        changedMembers.map((c) => [c.oldRecord, c])
                    );
                    updatedData = updatedData.map((member) => {
                        const change = changesMap.get(member);
                        if (change) {
                            return {
                                ...member,
                                ...change.newRecord,
                                firstSeenDate: member.firstSeenDate,
                                firstSeenSource: member.firstSeenSource,
                                customOrder: member.customOrder,
                            };
                        }
                        return member;
                    });
                }

                // 2. Handle Conflicts
                if (conflicts.length > 0) {
                    const conflictsMap = new Map(
                        conflicts.map((c) => [c.existingMember, c])
                    );

                    updatedData = updatedData.map((member) => {
                        const conflict = conflictsMap.get(member);
                        if (conflict) {
                            if (resolution === "use_new") {
                                return {
                                    ...member,
                                    ...conflict.newRecord,
                                    firstSeenDate: member.firstSeenDate,
                                    firstSeenSource: member.firstSeenSource,
                                    customOrder: member.customOrder,
                                };
                            }
                            return member;
                        }
                        return member;
                    });
                }

                // 3. Append New Members
                if (newMembers.length > 0) {
                    updatedData = [...updatedData, ...newMembers];
                }

                return {
                    ...prev,
                    [assembly]: {
                        ...(prev[assembly] || { lastUpdated: Date.now() }),
                        data: updatedData,
                        lastUpdated: Date.now(),
                        fileName: report.previousFileDate.includes("updated")
                            ? prev[assembly]?.fileName
                            : "Mixed Source",
                    },
                };
            });

            addToast(
                `Reconciliation complete. Resolved ${conflicts.length} conflicts using "${resolution === "use_new" ? "New File" : "Existing Database"}".`,
                "success"
            );
        },
        [addToast]
    );

    const getAssemblyMembers = useCallback(
        (assemblyName: string): MemberRecordA[] => {
            return memberDatabase[assemblyName]?.data || [];
        },
        [memberDatabase]
    );

    const assembliesWithData = new Set(
        Object.keys(memberDatabase).filter(
            (name) => memberDatabase[name]?.data?.length > 0
        )
    );

    return {
        memberDatabase,
        setMemberDatabase,
        updateMember,
        deleteMember,
        deleteAssembly,
        resolveConflicts,
        getAssemblyMembers,
        assembliesWithData,
    };
}
