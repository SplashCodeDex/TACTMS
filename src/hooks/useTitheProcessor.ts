import { useCallback, useMemo } from "react";
import {
    MemberRecordA,
    TitheRecordB,
    ConcatenationConfig,
} from "../types";
import { createTitheList, filterMembersByAge } from "../services/excelProcessor";
import { exportToExcel } from "../lib/excelUtils";
import { DEFAULT_CONCAT_CONFIG_STORAGE_KEY } from "../constants";

interface TitheProcessorState {
    originalData: MemberRecordA[];
    processedDataA: MemberRecordA[];
    titheListData: TitheRecordB[];
    concatenationConfig: ConcatenationConfig;
    selectedDate: Date;
    descriptionText: string;
    amountMappingColumn: string | null;
    ageRangeMin: string;
    ageRangeMax: string;
    fileNameToSave: string;
}

interface TitheProcessorSetters {
    setProcessedDataA: React.Dispatch<React.SetStateAction<MemberRecordA[]>>;
    setTitheListData: React.Dispatch<React.SetStateAction<TitheRecordB[]>>;
    setConcatenationConfig: React.Dispatch<React.SetStateAction<ConcatenationConfig>>;
    setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
    setDescriptionText: React.Dispatch<React.SetStateAction<string>>;
    setAgeRangeMin: React.Dispatch<React.SetStateAction<string>>;
    setAgeRangeMax: React.Dispatch<React.SetStateAction<string>>;
    setIsAgeFilterActive: React.Dispatch<React.SetStateAction<boolean>>;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    setInputErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

interface UseTitheProcessorReturn {
    tithersCount: number;
    totalTitheAmount: number;
    applyAgeFilter: () => void;
    removeAgeFilter: () => void;
    handleDescriptionChange: (newDescription: string) => void;
    handleDateChange: (newDate: Date) => void;
    handleConcatenationConfigChange: (key: keyof ConcatenationConfig) => void;
    downloadExcel: () => void;
}

/**
 * Hook to handle tithe list processing operations.
 */
export function useTitheProcessor(
    state: TitheProcessorState,
    setters: TitheProcessorSetters,
    addToast: (message: string, type: "info" | "success" | "error" | "warning") => void
): UseTitheProcessorReturn {
    const {
        originalData,
        processedDataA,
        titheListData,
        concatenationConfig,
        selectedDate,
        descriptionText,
        amountMappingColumn,
        ageRangeMin,
        ageRangeMax,
        fileNameToSave,
    } = state;

    const {
        setProcessedDataA,
        setTitheListData,
        setConcatenationConfig,
        setSelectedDate,
        setDescriptionText,
        setAgeRangeMin,
        setAgeRangeMax,
        setIsAgeFilterActive,
        setHasUnsavedChanges,
        setInputErrors,
    } = setters;

    const { tithersCount, totalTitheAmount } = useMemo(() => {
        let tithers = 0;
        const totalAmount = titheListData.reduce((sum, record) => {
            const amount = Number(record["Transaction Amount"]);
            if (!isNaN(amount) && amount > 0) {
                tithers++;
                return sum + amount;
            }
            return sum;
        }, 0);

        return { tithersCount: tithers, totalTitheAmount: totalAmount };
    }, [titheListData]);

    const applyAgeFilter = useCallback(() => {
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
    }, [
        ageRangeMin, ageRangeMax, originalData, concatenationConfig,
        selectedDate, descriptionText, amountMappingColumn, addToast,
        setInputErrors, setProcessedDataA, setIsAgeFilterActive, setTitheListData, setHasUnsavedChanges,
    ]);

    const removeAgeFilter = useCallback(() => {
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
    }, [
        originalData, concatenationConfig, selectedDate, descriptionText, amountMappingColumn, addToast,
        setAgeRangeMin, setAgeRangeMax, setInputErrors, setProcessedDataA, setIsAgeFilterActive, setTitheListData, setHasUnsavedChanges,
    ]);

    const handleDescriptionChange = useCallback(
        (newDescription: string) => {
            setDescriptionText(newDescription);
            if (originalData.length > 0) {
                setTitheListData(
                    createTitheList(processedDataA, concatenationConfig, selectedDate, newDescription, amountMappingColumn)
                );
                setHasUnsavedChanges(true);
            }
        },
        [originalData, processedDataA, concatenationConfig, selectedDate, amountMappingColumn, setDescriptionText, setTitheListData, setHasUnsavedChanges]
    );

    const handleDateChange = useCallback(
        (newDate: Date) => {
            setSelectedDate(newDate);
            if (originalData.length > 0) {
                setTitheListData(
                    createTitheList(processedDataA, concatenationConfig, newDate, descriptionText, amountMappingColumn)
                );
                setHasUnsavedChanges(true);
            }
        },
        [originalData, processedDataA, concatenationConfig, descriptionText, amountMappingColumn, setSelectedDate, setTitheListData, setHasUnsavedChanges]
    );

    const handleConcatenationConfigChange = useCallback(
        (key: keyof ConcatenationConfig) => {
            setConcatenationConfig((prev) => {
                const newConfig = { ...prev, [key]: !prev[key] };
                localStorage.setItem(DEFAULT_CONCAT_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
                if (originalData.length > 0) {
                    setTitheListData(
                        createTitheList(processedDataA, newConfig, selectedDate, descriptionText, amountMappingColumn)
                    );
                    setHasUnsavedChanges(true);
                }
                return newConfig;
            });
        },
        [originalData, processedDataA, selectedDate, descriptionText, amountMappingColumn, setConcatenationConfig, setTitheListData, setHasUnsavedChanges]
    );

    const downloadExcel = useCallback(() => {
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
            .map((record) => ({
                "No.": record["No."],
                "Transaction Type": record["Transaction Type"],
                "Payment Source Type": record["Payment Source Type"],
                "Membership Number": record["Membership Number"],
                "Transaction Date ('DD-MMM-YYYY')": record["Transaction Date ('DD-MMM-YYYY')"],
                Currency: record.Currency,
                "Exchange Rate": record["Exchange Rate"],
                "Payment Method": record["Payment Method"],
                "Transaction Amount": record["Transaction Amount"],
                "Narration/Description": record["Narration/Description"],
            }));

        if (dataToExport.length === 0) {
            addToast("No transactions to export. Please enter at least one amount.", "warning");
            return;
        }

        exportToExcel(dataToExport, fileNameToSave);
        addToast(`Exported ${dataToExport.length} records to ${fileNameToSave}.xlsx`, "success");
    }, [titheListData, fileNameToSave, addToast, setInputErrors]);

    return {
        tithersCount,
        totalTitheAmount,
        applyAgeFilter,
        removeAgeFilter,
        handleDescriptionChange,
        handleDateChange,
        handleConcatenationConfigChange,
        downloadExcel,
    };
}
