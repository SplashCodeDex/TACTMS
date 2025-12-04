import { useState, useCallback, useRef, useEffect } from "react";
import {
    MemberRecordA,
    TitheRecordB,
    ConcatenationConfig,
    AutoSaveDraft,
} from "../types";
import {
    DEFAULT_CONCAT_CONFIG,
    AUTO_SAVE_KEY,
    AUTO_SAVE_DEBOUNCE_TIME,
    DEFAULT_CONCAT_CONFIG_STORAGE_KEY,
} from "../constants";

export interface WorkspaceState {
    uploadedFile: File | null;
    originalData: MemberRecordA[];
    processedDataA: MemberRecordA[];
    titheListData: TitheRecordB[];
    currentAssembly: string | null;
    selectedDate: Date;
    descriptionText: string;
    fileNameToSave: string;
    hasUnsavedChanges: boolean;
    ageRangeMin: string;
    ageRangeMax: string;
    isAgeFilterActive: boolean;
    soulsWonCount: number | null;
    concatenationConfig: ConcatenationConfig;
    amountMappingColumn: string | null;
}

export interface WorkspaceActions {
    setUploadedFile: (file: File | null) => void;
    setOriginalData: (data: MemberRecordA[]) => void;
    setProcessedDataA: (data: MemberRecordA[]) => void;
    setTitheListData: React.Dispatch<React.SetStateAction<TitheRecordB[]>>;
    setCurrentAssembly: (assembly: string | null) => void;
    setSelectedDate: (date: Date) => void;
    setDescriptionText: (text: string) => void;
    setFileNameToSave: (name: string) => void;
    setHasUnsavedChanges: (value: boolean) => void;
    setAgeRangeMin: (value: string) => void;
    setAgeRangeMax: (value: string) => void;
    setIsAgeFilterActive: (value: boolean) => void;
    setSoulsWonCount: React.Dispatch<React.SetStateAction<number | null>>;
    setConcatenationConfig: React.Dispatch<React.SetStateAction<ConcatenationConfig>>;
    setAmountMappingColumn: (value: string | null) => void;
    clearWorkspace: () => void;
    clearAutoSaveDraft: () => void;
}

/**
 * Hook to manage the core workspace state for tithe list processing.
 * Handles file uploads, processed data, assembly selection, and auto-save.
 */
export function useWorkspace(
    addToast: (message: string, type: "info" | "success" | "error" | "warning", duration?: number) => void
): WorkspaceState & WorkspaceActions {
    // Core data state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [originalData, setOriginalData] = useState<MemberRecordA[]>([]);
    const [processedDataA, setProcessedDataA] = useState<MemberRecordA[]>([]);
    const [titheListData, setTitheListData] = useState<TitheRecordB[]>([]);

    // Assembly and date
    const [currentAssembly, setCurrentAssembly] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [descriptionText, setDescriptionText] = useState<string>("Tithe");
    const [fileNameToSave, setFileNameToSave] = useState("GeneratedTitheList");

    // Unsaved changes tracking
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Age filter state
    const [ageRangeMin, setAgeRangeMin] = useState<string>("");
    const [ageRangeMax, setAgeRangeMax] = useState<string>("");
    const [isAgeFilterActive, setIsAgeFilterActive] = useState(false);

    // Souls won count
    const [soulsWonCount, setSoulsWonCount] = useState<number | null>(0);

    // Concatenation config with localStorage persistence
    const [concatenationConfig, setConcatenationConfig] = useState<ConcatenationConfig>(() => {
        const savedConfig = localStorage.getItem(DEFAULT_CONCAT_CONFIG_STORAGE_KEY);
        return savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONCAT_CONFIG;
    });

    // Amount mapping
    const [amountMappingColumn, setAmountMappingColumn] = useState<string | null>(null);

    // Auto-save references
    const autoSaveTimerRef = useRef<number | null>(null);
    const draftDataRef = useRef({
        titheListData,
        currentAssembly,
        selectedDate,
        descriptionText,
        concatenationConfig,
        ageRangeMin,
        ageRangeMax,
        fileNameToSave,
        amountMappingColumn,
        uploadedFile,
        originalData,
        processedDataA,
        soulsWonCount,
    });

    // Keep draft data ref in sync
    useEffect(() => {
        draftDataRef.current = {
            titheListData,
            currentAssembly,
            selectedDate,
            descriptionText,
            concatenationConfig,
            ageRangeMin,
            ageRangeMax,
            fileNameToSave,
            amountMappingColumn,
            uploadedFile,
            originalData,
            processedDataA,
            soulsWonCount,
        };
    }, [
        titheListData,
        currentAssembly,
        selectedDate,
        descriptionText,
        concatenationConfig,
        ageRangeMin,
        ageRangeMax,
        fileNameToSave,
        amountMappingColumn,
        uploadedFile,
        originalData,
        processedDataA,
        soulsWonCount,
    ]);

    // Clear auto-save draft
    const clearAutoSaveDraft = useCallback(() => {
        try {
            localStorage.removeItem(AUTO_SAVE_KEY);
        } catch (e) {
            console.error("Failed to clear auto-save draft:", e);
        }
    }, []);

    // Clear entire workspace
    const clearWorkspace = useCallback(() => {
        setUploadedFile(null);
        setOriginalData([]);
        setProcessedDataA([]);
        setTitheListData([]);
        setCurrentAssembly(null);
        setSelectedDate(new Date());
        setDescriptionText("Tithe");
        setFileNameToSave("GeneratedTitheList");
        setSoulsWonCount(0);
        setHasUnsavedChanges(false);
        setAgeRangeMin("");
        setAgeRangeMax("");
        setIsAgeFilterActive(false);
        setConcatenationConfig(() => {
            const savedConfig = localStorage.getItem(DEFAULT_CONCAT_CONFIG_STORAGE_KEY);
            return savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONCAT_CONFIG;
        });
        setAmountMappingColumn(null);
        clearAutoSaveDraft();
    }, [clearAutoSaveDraft]);

    // Auto-save draft
    const saveDraft = useCallback(() => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = window.setTimeout(() => {
            const currentDraftData = draftDataRef.current;
            const {
                titheListData,
                currentAssembly,
                selectedDate,
                descriptionText,
                concatenationConfig,
                ageRangeMin,
                ageRangeMax,
                fileNameToSave,
                amountMappingColumn,
                uploadedFile,
                originalData,
                processedDataA,
                soulsWonCount,
            } = currentDraftData;

            if (titheListData.length === 0 || !currentAssembly) return;

            const draft: AutoSaveDraft = {
                timestamp: Date.now(),
                titheListData,
                selectedDate: selectedDate.toISOString(),
                descriptionText,
                concatenationConfig,
                ageRangeMin,
                ageRangeMax,
                fileNameToSave,
                amountMappingColumn,
                uploadedFileName: uploadedFile?.name,
                originalDataRecordCount: originalData.length,
                processedDataARecordCount: processedDataA.length,
                assemblyName: currentAssembly,
                soulsWonCount,
            };

            try {
                localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
                setHasUnsavedChanges(false);
                addToast("Draft auto-saved!", "success", 2000);
            } catch (e) {
                console.error("Failed to auto-save draft:", e);
                addToast("Auto-save failed: Storage full.", "warning", 3000);
            }
        }, AUTO_SAVE_DEBOUNCE_TIME);
    }, [addToast]);

    // Auto-save effect
    useEffect(() => {
        if (hasUnsavedChanges && titheListData.length > 0) {
            saveDraft();
        }
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [hasUnsavedChanges, titheListData, saveDraft]);

    return {
        // State
        uploadedFile,
        originalData,
        processedDataA,
        titheListData,
        currentAssembly,
        selectedDate,
        descriptionText,
        fileNameToSave,
        hasUnsavedChanges,
        ageRangeMin,
        ageRangeMax,
        isAgeFilterActive,
        soulsWonCount,
        concatenationConfig,
        amountMappingColumn,
        // Actions
        setUploadedFile,
        setOriginalData,
        setProcessedDataA,
        setTitheListData,
        setCurrentAssembly,
        setSelectedDate,
        setDescriptionText,
        setFileNameToSave,
        setHasUnsavedChanges,
        setAgeRangeMin,
        setAgeRangeMax,
        setIsAgeFilterActive,
        setSoulsWonCount,
        setConcatenationConfig,
        setAmountMappingColumn,
        clearWorkspace,
        clearAutoSaveDraft,
    };
}
