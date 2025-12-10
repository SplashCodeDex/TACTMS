/**
 * useAppActions - Centralized hook for App-level action handlers
 *
 * This hook extracts major action handlers from App.tsx to reduce
 * its complexity and improve maintainability.
 *
 * Handlers are organized by domain:
 * - titheProcessing: Age filters, date/description changes
 * - download: Excel export with transaction logging
 * - members: Add/delete members and assemblies
 * - favorites: Save/load favorites
 * - save: Preview save operations
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type {
    MemberRecordA,
    TitheRecordB,
    FavoriteConfig,
    ConcatenationConfig,
    TransactionLogEntry
} from "@/types";
import { useWorkspaceContext, useDatabaseContext, useToast, useAppConfigContext } from "@/context";
import { createTitheList, filterMembersByAge } from "@/services/excelProcessor";
import { exportToExcel } from "@/lib/excelUtils";
import { formatDateDDMMMYYYY, getMostRecentSunday } from "@/lib/dataTransforms";
import { analyticsService } from "@/services/AnalyticsService";
import {
    initializeOrder,
    getOrderedMembers,
    applyNewOrder,
    syncWithMasterList,
} from "@/services/memberOrderService";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPE DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface UseAppActionsProps {
    setInputErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
    setHasUnsavedChanges: (value: boolean) => void;
    setFavorites: React.Dispatch<React.SetStateAction<FavoriteConfig[]>>;
    setTransactionLog: React.Dispatch<React.SetStateAction<TransactionLogEntry[]>>;
    favorites: FavoriteConfig[];
    clearAutoSaveDraft: () => void;
}

export interface TitheProcessingHandlers {
    handleApplyAgeFilter: () => void;
    handleRemoveAgeFilter: () => void;
    handleDescriptionChange: (newDescription: string) => void;
    handleDateChange: (newDate: Date) => void;
    handleConcatenationConfigChange: (key: keyof ConcatenationConfig) => void;
}

export interface DownloadHandlers {
    handleDownloadExcel: () => void;
}

export interface MemberHandlers {
    handleAddNewMemberToList: (newMember: MemberRecordA) => void;
    handleAddExistingMemberToList: (member: MemberRecordA) => void;
    handleCreateTitheListFromDB: (members: MemberRecordA[], assembly: string) => void;
    handleDeleteAssembly: (assemblyName: string) => void;
    startNewWeek: (assemblyName: string) => Promise<void>;
}

export interface FavoriteHandlers {
    handleSaveFavorite: (nameInput: string) => void;
    loadFavorite: (favId: string) => void;
}

export interface SaveHandlers {
    handleSaveFromPreview: (updatedList: TitheRecordB[]) => void;
}

export interface AppActions {
    titheProcessing: TitheProcessingHandlers;
    download: DownloadHandlers;
    members: MemberHandlers;
    favorites: FavoriteHandlers;
    save: SaveHandlers;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN HOOK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useAppActions(props: UseAppActionsProps): AppActions {
    const {
        setInputErrors,
        setHasUnsavedChanges,
        setFavorites,
        setTransactionLog,
        favorites,
        clearAutoSaveDraft,
    } = props;

    const addToast = useToast();
    const { removeAssembly } = useAppConfigContext();
    const navigate = useNavigate();

    // Workspace context
    const {
        uploadedFile,
        originalData,
        setOriginalData,
        processedDataA,
        setProcessedDataA,
        titheListData,
        setTitheListData,
        currentAssembly,
        setCurrentAssembly,
        selectedDate,
        setSelectedDate,
        descriptionText,
        setDescriptionText,
        fileNameToSave,
        setFileNameToSave,
        ageRangeMin,
        setAgeRangeMin,
        ageRangeMax,
        setAgeRangeMax,
        setIsAgeFilterActive,
        soulsWonCount,
        setSoulsWonCount,
        concatenationConfig,
        setConcatenationConfig,
        amountMappingColumn,
        setAmountMappingColumn,
        clearWorkspace,
    } = useWorkspaceContext();

    // Database context
    const { memberDatabase, setMemberDatabase } = useDatabaseContext();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TITHE PROCESSING HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const handleApplyAgeFilter = useCallback(() => {
        const min = Number(ageRangeMin) || 0;
        const max = Number(ageRangeMax) || Infinity;

        if (min > max && ageRangeMax) {
            setInputErrors({ age: "Min age cannot be greater than max age." });
            return;
        }

        setInputErrors({});
        const filtered = filterMembersByAge(originalData, min, max);
        setProcessedDataA(filtered);
        setIsAgeFilterActive(true);
        setTitheListData(
            createTitheList(filtered, concatenationConfig, selectedDate, descriptionText, amountMappingColumn)
        );
        addToast(`Age filter applied. ${filtered.length} records match.`, "info");
        setHasUnsavedChanges(true);
    }, [ageRangeMin, ageRangeMax, originalData, concatenationConfig, selectedDate, descriptionText, amountMappingColumn, addToast, setInputErrors, setProcessedDataA, setIsAgeFilterActive, setTitheListData, setHasUnsavedChanges]);

    const handleRemoveAgeFilter = useCallback(() => {
        setAgeRangeMin("");
        setAgeRangeMax("");
        setInputErrors({});
        setProcessedDataA(originalData);
        setIsAgeFilterActive(false);
        setTitheListData(
            createTitheList(originalData, concatenationConfig, selectedDate, descriptionText, amountMappingColumn)
        );
        addToast("Age filter removed.", "info");
        setHasUnsavedChanges(true);
    }, [originalData, concatenationConfig, selectedDate, descriptionText, amountMappingColumn, addToast, setAgeRangeMin, setAgeRangeMax, setInputErrors, setProcessedDataA, setIsAgeFilterActive, setTitheListData, setHasUnsavedChanges]);

    const handleDescriptionChange = useCallback((newDescription: string) => {
        setDescriptionText(newDescription);
        if (originalData.length > 0) {
            setTitheListData(
                createTitheList(processedDataA, concatenationConfig, selectedDate, newDescription, amountMappingColumn)
            );
            setHasUnsavedChanges(true);
        }
    }, [originalData.length, processedDataA, concatenationConfig, selectedDate, amountMappingColumn, setDescriptionText, setTitheListData, setHasUnsavedChanges]);

    const handleDateChange = useCallback((newDate: Date) => {
        setSelectedDate(newDate);
        const formattedDate = formatDateDDMMMYYYY(newDate);
        const newDescription = `Tithe for ${formattedDate}`;
        setDescriptionText(newDescription);

        if (currentAssembly) {
            setFileNameToSave(`${currentAssembly}-TitheList-${formattedDate}`);
        }

        if (originalData.length > 0) {
            setTitheListData(
                createTitheList(processedDataA, concatenationConfig, newDate, newDescription, amountMappingColumn)
            );
            setHasUnsavedChanges(true);
        }
    }, [currentAssembly, originalData.length, processedDataA, concatenationConfig, amountMappingColumn, setSelectedDate, setDescriptionText, setFileNameToSave, setTitheListData, setHasUnsavedChanges]);

    const handleConcatenationConfigChange = useCallback((key: keyof ConcatenationConfig) => {
        setConcatenationConfig((prev) => {
            const newConfig = { ...prev, [key]: !prev[key] };
            localStorage.setItem("DEFAULT_CONCAT_CONFIG", JSON.stringify(newConfig));
            if (originalData.length > 0) {
                setTitheListData(
                    createTitheList(processedDataA, newConfig, selectedDate, descriptionText, amountMappingColumn)
                );
                setHasUnsavedChanges(true);
            }
            return newConfig;
        });
    }, [originalData.length, processedDataA, selectedDate, descriptionText, amountMappingColumn, setConcatenationConfig, setTitheListData, setHasUnsavedChanges]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SAVE HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const handleSaveFromPreview = useCallback((updatedList: TitheRecordB[]) => {
        setTitheListData(updatedList);

        if (currentAssembly) {
            const newOrderMap = new Map<string | number, number>();
            updatedList.forEach((record, index) => {
                newOrderMap.set(record["No."], index);
            });

            setMemberDatabase((prev) => {
                const newDb = { ...prev };
                const assemblyData = newDb[currentAssembly]?.data || [];
                const updatedAssemblyData = assemblyData.map((member) => {
                    const newOrder = member["No."] !== undefined ? newOrderMap.get(member["No."]) : undefined;
                    if (newOrder !== undefined) {
                        return { ...member, customOrder: newOrder };
                    }
                    return member;
                });

                newDb[currentAssembly] = {
                    ...(newDb[currentAssembly] || {}),
                    data: updatedAssemblyData,
                };

                return newDb;
            });

            // Persist to IndexedDB using atomic sequential reorder
            const orderedMemberIds = updatedList
                .map((record) =>
                    record.memberDetails?.["Membership Number"] || record.memberDetails?.["Old Membership Number"]
                )
                .filter((id): id is string => !!id);

            if (orderedMemberIds.length > 0) {
                applyNewOrder(orderedMemberIds, currentAssembly).catch((err) =>
                    console.error("Failed to persist member order:", err)
                );
            }
        }

        setHasUnsavedChanges(true);
        addToast("Changes from list view have been saved to the workspace.", "success");
    }, [currentAssembly, setTitheListData, setMemberDatabase, setHasUnsavedChanges, addToast]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DOWNLOAD HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const handleDownloadExcel = useCallback(() => {
        if (!fileNameToSave.trim()) {
            setInputErrors((prev) => ({ ...prev, fileName: "File name is required." }));
            return;
        }
        setInputErrors((prev) => ({ ...prev, fileName: "" }));

        const dataToExport = titheListData
            .filter((record) => {
                const amount = Number(record["Transaction Amount"]);
                return !isNaN(amount) && amount > 0;
            })
            .map((record, index) => {
                const { Confidence: _c, memberDetails, ...rest } = record;

                let membershipNumber = record["Membership Number"];
                if (memberDetails) {
                    let name = `${memberDetails.Title || ""} ${memberDetails["First Name"] || ""} ${memberDetails.Surname || ""} ${memberDetails["Other Names"] || ""}`
                        .replace(/\s+/g, " ").trim();
                    let id = memberDetails["Membership Number"];
                    let oldId = memberDetails["Old Membership Number"];

                    if (id?.trim().startsWith("(") && id?.trim().endsWith(")")) {
                        id = id.trim().slice(1, -1);
                    }
                    if (id?.includes("(") && id?.endsWith(")")) {
                        const match = id.match(/^(.*)\s*\(([^)]+)\)$/);
                        if (match) {
                            id = match[2].trim();
                            if (!name && match[1].trim()) name = match[1].trim();
                        }
                    }
                    if (oldId?.trim().startsWith("(") && oldId?.trim().endsWith(")")) {
                        oldId = oldId.trim().slice(1, -1);
                    }

                    const idPart = id && oldId ? `(${id}|${oldId})` : id ? `(${id})` : oldId ? `(${oldId})` : "";
                    membershipNumber = `${name} ${idPart}`.trim();
                }

                return {
                    ...rest,
                    "No.": index + 1,
                    "Transaction Date ('DD-MMM-YYYY')": formatDateDDMMMYYYY(selectedDate),
                    "Membership Number": membershipNumber,
                };
            });

        exportToExcel(dataToExport, fileNameToSave);
        analyticsService.trackEvent("download_excel", { fileName: fileNameToSave, records: dataToExport.length });

        // Log the transaction
        if (currentAssembly && titheListData.length > 0) {
            const logTithersCount = titheListData.filter(
                (r) => !isNaN(Number(r["Transaction Amount"])) && Number(r["Transaction Amount"]) > 0
            ).length;
            const logTotalAmount = titheListData.reduce((sum, r) => {
                const amt = Number(r["Transaction Amount"]);
                return !isNaN(amt) && amt > 0 ? sum + amt : sum;
            }, 0);

            const newLogEntry: TransactionLogEntry = {
                id: `${currentAssembly}-${formatDateDDMMMYYYY(selectedDate)}`,
                assemblyName: currentAssembly,
                timestamp: Date.now(),
                selectedDate: formatDateDDMMMYYYY(selectedDate),
                totalTitheAmount: logTotalAmount,
                soulsWonCount: soulsWonCount ?? 0,
                titherCount: logTithersCount,
                recordCount: titheListData.length,
                titheListData,
                concatenationConfig,
                descriptionText,
                amountMappingColumn,
            };

            setTransactionLog((prevLog) => {
                const existingIndex = prevLog.findIndex((log) => log.id === newLogEntry.id);
                if (existingIndex > -1) {
                    const updatedLog = [...prevLog];
                    updatedLog[existingIndex] = newLogEntry;
                    return updatedLog;
                }
                return [...prevLog, newLogEntry];
            });
            addToast("Transaction has been logged for reporting.", "info");
        }
    }, [fileNameToSave, titheListData, currentAssembly, selectedDate, soulsWonCount, setTransactionLog, addToast, concatenationConfig, descriptionText, amountMappingColumn, setInputErrors]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MEMBER HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const handleDeleteAssembly = useCallback((assemblyName: string) => {
        if (assemblyName === "ALL MEMBERS") {
            if (window.confirm("Are you sure you want to reset the entire database? This action cannot be undone.")) {
                setMemberDatabase({});
                addToast("All member data has been reset.", "success");
            }
        } else {
            if (window.confirm(`Are you sure you want to delete the data for ${assemblyName}?`)) {
                setMemberDatabase((prev) => {
                    const newState = { ...prev };
                    delete newState[assemblyName];
                    return newState;
                });
                addToast(`Data for ${assemblyName} has been deleted.`, "success");
                removeAssembly(assemblyName);
            }
        }
    }, [setMemberDatabase, addToast, removeAssembly]);

    const handleAddNewMemberToList = useCallback((newMember: MemberRecordA) => {
        if (!currentAssembly) return;

        const enrichedMember = {
            ...newMember,
            firstSeenDate: new Date().toISOString(),
            firstSeenSource: "manual_add",
        };

        setMemberDatabase((prev) => {
            const assemblyData = prev[currentAssembly]?.data || [];
            return {
                ...prev,
                [currentAssembly]: {
                    ...(prev[currentAssembly] || { lastUpdated: Date.now() }),
                    fileName: "Mixed Source",
                    data: [...assemblyData, enrichedMember],
                    lastUpdated: Date.now(),
                },
            };
        });

        const updatedData = [...(memberDatabase[currentAssembly]?.data || []), enrichedMember];
        syncWithMasterList(updatedData, currentAssembly).catch((err) =>
            console.error("Failed to sync new member:", err)
        );

        const newTitheRecord = createTitheList(
            [enrichedMember], concatenationConfig, selectedDate, descriptionText || `Tithe for ${formatDateDDMMMYYYY(selectedDate)}`, null
        )[0];

        setTitheListData((prev) => [...prev, newTitheRecord]);
        setSoulsWonCount((prev) => (prev || 0) + 1);
        addToast(`Added new member: ${newMember["First Name"]} ${newMember.Surname}`, "success");
    }, [currentAssembly, memberDatabase, concatenationConfig, selectedDate, descriptionText, setMemberDatabase, setTitheListData, setSoulsWonCount, addToast]);

    const handleAddExistingMemberToList = useCallback((member: MemberRecordA) => {
        // Use the workspace's selected date, not today's date
        const newTitheRecord = createTitheList(
            [member], concatenationConfig, selectedDate, descriptionText || `Tithe for ${formatDateDDMMMYYYY(selectedDate)}`, null
        )[0];
        setTitheListData((prev) => [...prev, newTitheRecord]);
        addToast(`Added existing member: ${member["First Name"]} ${member.Surname}`, "success");
    }, [concatenationConfig, selectedDate, descriptionText, setTitheListData, addToast]);

    const handleCreateTitheListFromDB = useCallback((members: MemberRecordA[], assembly: string) => {
        clearWorkspace();
        setCurrentAssembly(assembly);
        setOriginalData(members);
        setProcessedDataA(members);

        const sundayDate = getMostRecentSunday(new Date());
        const formattedDate = formatDateDDMMMYYYY(sundayDate);
        const defaultDescription = `Tithe for ${formattedDate}`;

        setDescriptionText(defaultDescription);
        setSelectedDate(sundayDate);
        setTitheListData(createTitheList(members, concatenationConfig, sundayDate, defaultDescription, null));
        setFileNameToSave(`${assembly}-TitheList-${formattedDate}`);

        navigate("/processor");
        addToast(`Created a new list with ${members.length} members from the database.`, "success");
    }, [clearWorkspace, setCurrentAssembly, setOriginalData, setProcessedDataA, setDescriptionText, setSelectedDate, setTitheListData, setFileNameToSave, concatenationConfig, navigate, addToast]);

    const startNewWeek = useCallback(async (assemblyName: string) => {
        const masterList = memberDatabase[assemblyName];
        if (!masterList?.data?.length) {
            addToast(`No member data found for ${assemblyName}. Please upload a master list first.`, "warning");
            return;
        }

        clearWorkspace();
        let memberSourceRecords = masterList.data;

        // Load persisted order from IndexedDB
        try {
            const orderedMembers = await getOrderedMembers(assemblyName);
            if (orderedMembers.length > 0) {
                const memberMap = new Map(
                    memberSourceRecords.map((m) => [(m["Membership Number"] || m["Old Membership Number"] || "").toLowerCase(), m])
                );
                const reordered = orderedMembers
                    .map((entry) => memberMap.get(entry.memberId.toLowerCase()))
                    .filter((m): m is MemberRecordA => !!m);
                const orderedIds = new Set(orderedMembers.map((e) => e.memberId.toLowerCase()));
                const leftovers = memberSourceRecords.filter(
                    (m) => !orderedIds.has((m["Membership Number"] || m["Old Membership Number"] || "").toLowerCase())
                );
                memberSourceRecords = [...reordered, ...leftovers];
            } else {
                await initializeOrder(memberSourceRecords, assemblyName).catch((err) =>
                    console.error("Failed to auto-initialize member order:", err)
                );
            }
        } catch (error) {
            console.error("Failed to load ordered members", error);
        }

        const sundayDate = getMostRecentSunday(new Date());
        const formattedDate = formatDateDDMMMYYYY(sundayDate);
        const newDescription = `Tithe for ${formattedDate}`;

        const freshTitheList = createTitheList(memberSourceRecords, concatenationConfig, sundayDate, newDescription, amountMappingColumn)
            .map((record, index) => ({ ...record, "Transaction Amount": "", "No.": index + 1 }));

        setTitheListData(freshTitheList);
        setOriginalData(memberSourceRecords);
        setProcessedDataA(memberSourceRecords);
        setDescriptionText(newDescription);
        setCurrentAssembly(assemblyName);
        setFileNameToSave(`${assemblyName}-TitheList-${formattedDate}`);
        setSoulsWonCount(0);
        setSelectedDate(sundayDate);
        setHasUnsavedChanges(false);
        clearAutoSaveDraft();

        navigate("/processor");
        addToast(`Started new week for ${assemblyName} using the master member list.`, "success");
    }, [memberDatabase, concatenationConfig, amountMappingColumn, clearWorkspace, clearAutoSaveDraft, navigate, addToast, setTitheListData, setOriginalData, setProcessedDataA, setDescriptionText, setCurrentAssembly, setFileNameToSave, setSoulsWonCount, setSelectedDate, setHasUnsavedChanges]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FAVORITE HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const handleSaveFavorite = useCallback((nameInput: string) => {
        if (!nameInput.trim()) {
            addToast("Favorite name cannot be empty.", "error");
            return;
        }
        if (!currentAssembly) {
            addToast("Cannot save favorite without an assembly.", "error");
            return;
        }

        const totalTitheAmount = titheListData.reduce((sum, r) => {
            const amt = Number(r["Transaction Amount"]);
            return !isNaN(amt) && amt > 0 ? sum + amt : sum;
        }, 0);

        const newFavorite: FavoriteConfig = {
            id: `${Date.now()}`,
            name: nameInput,
            timestamp: Date.now(),
            originalFileName: uploadedFile?.name || "Manual/Database Start",
            assemblyName: currentAssembly,
            ageRangeMin: Number(ageRangeMin) || undefined,
            ageRangeMax: Number(ageRangeMax) || undefined,
            concatenationConfig,
            selectedDate: formatDateDDMMMYYYY(selectedDate),
            descriptionText,
            amountMappingColumn,
            originalData: originalData.length > 0 ? originalData : undefined,
            processedDataA,
            titheListData,
            soulsWonCount: soulsWonCount ?? 0,
            processedRecordsCount: processedDataA.length,
            totalTitheAmount,
        };

        setFavorites((prev) => [newFavorite, ...prev.filter((f) => f.name !== newFavorite.name)]);
        addToast("Saved to favorites!", "success");
    }, [currentAssembly, uploadedFile, ageRangeMin, ageRangeMax, concatenationConfig, selectedDate, descriptionText, amountMappingColumn, originalData, processedDataA, titheListData, soulsWonCount, setFavorites, addToast]);

    const loadFavorite = useCallback((favId: string) => {
        const fav = favorites.find((f) => f.id === favId);
        if (!fav) {
            addToast("Favorite not found.", "error");
            return;
        }

        clearWorkspace();

        setOriginalData(fav.originalData || []);
        setProcessedDataA(fav.processedDataA || []);
        setTitheListData(fav.titheListData || []);
        setAgeRangeMin(String(fav.ageRangeMin || ""));
        setAgeRangeMax(String(fav.ageRangeMax || ""));
        setIsAgeFilterActive(!!(fav.ageRangeMin || fav.ageRangeMax));
        setConcatenationConfig(fav.concatenationConfig);
        setSelectedDate(getMostRecentSunday(new Date(fav.selectedDate)));
        setDescriptionText(fav.descriptionText);
        setAmountMappingColumn(fav.amountMappingColumn || null);

        const formattedDate = formatDateDDMMMYYYY(getMostRecentSunday(new Date(fav.selectedDate)));
        setFileNameToSave(`${fav.assemblyName}-TitheList-${formattedDate}`);
        setCurrentAssembly(fav.assemblyName);
        setSoulsWonCount(fav.soulsWonCount ?? 0);
        setHasUnsavedChanges(false);
        clearAutoSaveDraft();

        addToast(`Loaded favorite: "${fav.name}"`, "success");
        navigate("/processor");
    }, [favorites, addToast, clearWorkspace, clearAutoSaveDraft, navigate, setOriginalData, setProcessedDataA, setTitheListData, setAgeRangeMin, setAgeRangeMax, setIsAgeFilterActive, setConcatenationConfig, setSelectedDate, setDescriptionText, setAmountMappingColumn, setFileNameToSave, setCurrentAssembly, setSoulsWonCount, setHasUnsavedChanges]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RETURN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    return {
        titheProcessing: {
            handleApplyAgeFilter,
            handleRemoveAgeFilter,
            handleDescriptionChange,
            handleDateChange,
            handleConcatenationConfigChange,
        },
        download: {
            handleDownloadExcel,
        },
        members: {
            handleAddNewMemberToList,
            handleAddExistingMemberToList,
            handleCreateTitheListFromDB,
            handleDeleteAssembly,
            startNewWeek,
        },
        favorites: {
            handleSaveFavorite,
            loadFavorite,
        },
        save: {
            handleSaveFromPreview,
        },
    };
}
