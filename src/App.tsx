import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  MemberRecordA,
  TitheRecordB,
  ConcatenationConfig,
  FavoriteConfig,
  AutoSaveDraft,
  MembershipReconciliationReport,
  MemberDatabase,
  TransactionLogEntry,
} from "./types";
import Button from "./components/Button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import Modal from "./components/Modal";
import {
  createTitheList,
  exportToExcel,
  filterMembersByAge,
  formatDateDDMMMYYYY,
  reconcileMembers,
} from "./services/excelProcessor";
import { parseExcelFile } from "./lib/excelUtils";
import FullTithePreviewModal from "./components/FullTithePreviewModal";
import AddNewMemberModal from "./components/AddNewMemberModal";
import CreateTitheListModal from "./components/CreateTitheListModal";

import { Save, Trash2, WifiOff } from "lucide-react";
import { pushAnalyticsEvent } from "./services/offline-analytics";

import { useGemini } from "./hooks/useGemini";

import Sidebar from "./components/Sidebar";
import { useGoogleDriveSync } from "./hooks/useGoogleDriveSync";
import { usePWAFeatures } from "./hooks/usePWAFeatures";

import {
  DEFAULT_CONCAT_CONFIG,
  AUTO_SAVE_KEY,
  AUTO_SAVE_DEBOUNCE_TIME,
  ITEMS_PER_FULL_PREVIEW_PAGE,
  APP_THEME_STORAGE_KEY,
  DEFAULT_CONCAT_CONFIG_STORAGE_KEY,
  ASSEMBLIES,
  THEME_OPTIONS,
  APP_ACCENT_COLOR_KEY,
  MEMBER_DATABASE_STORAGE_KEY,
} from "./constants";
import AmountEntryModal from "./components/AmountEntryModal";
import AssemblySelectionModal from "./components/AssemblySelectionModal";
import MembershipReconciliationModal from "./components/MembershipReconciliationModal";
import ClearWorkspaceModal from "./components/ClearWorkspaceModal";
import UpdateMasterListConfirmModal from "./components/UpdateMasterListConfirmModal";
import EditMemberModal from "./components/EditMemberModal";
import MobileHeader from "./components/MobileHeader";
import DesktopNotifications from "./components/DesktopNotifications";
import ValidationReportModal from "./components/ValidationReportModal";
import CommandPalette from "./components/CommandPalette";
import ParsingIndicator from "./components/ParsingIndicator";

interface PendingData {
  data: MemberRecordA[];
  fileName: string;
  file: File;
  suggestedAssembly?: string;
  isMasterList?: boolean;
}

interface PendingMasterListUpdate {
  assemblyName: string;
  newData: MemberRecordA[];
  newFileName: string;
}

export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}

const MotionDiv = motion.div;

const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalData, setOriginalData] = useState<MemberRecordA[]>([]);
  const [processedDataA, setProcessedDataA] = useState<MemberRecordA[]>([]);
  const [titheListData, setTitheListData] = useState<TitheRecordB[]>([]);

  const [globalNotifications, setGlobalNotifications] = useState<Notification[]>([]);
  const [isAmountEntryModalOpen, setIsAmountEntryModalOpen] = useState(false);

  const [inputErrors, setInputErrors] = useState<{ [key: string]: string }>({});

  const [reconciliationReport, setReconciliationReport] =
    useState<MembershipReconciliationReport | null>(null);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] =
    useState(false);
  const [soulsWonCount, setSoulsWonCount] = useState<number | null>(0);

  const [ageRangeMin, setAgeRangeMin] = useState<string>("");
  const [ageRangeMax, setAgeRangeMax] = useState<string>("");
  const [isAgeFilterActive, setIsAgeFilterActive] = useState(false);

  const [concatenationConfig, setConcatenationConfig] =
    useState<ConcatenationConfig>(() => {
      const savedConfig = localStorage.getItem(
        DEFAULT_CONCAT_CONFIG_STORAGE_KEY,
      );
      return savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONCAT_CONFIG;
    });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [descriptionText, setDescriptionText] = useState<string>("Tithe");
  const [amountMappingColumn, setAmountMappingColumn] = useState<string | null>(
    null,
  );

  const [fileNameToSave, setFileNameToSave] = useState("GeneratedTitheList");

  const [favoritesSearchTerm, setFavoritesSearchTerm] = useState("");
  const [isFavDetailsModalOpen, setIsFavDetailsModalOpen] = useState(false);
  const [selectedFavoriteForDetails, setSelectedFavoriteForDetails] =
    useState<FavoriteConfig | null>(null);
  const [isDeleteFavConfirmModalOpen, setIsDeleteFavConfirmModalOpen] =
    useState(false);
  const [favToDeleteId, setFavToDeleteId] = useState<string | null>(null);

  const [isFullPreviewModalOpen, setIsFullPreviewModalOpen] = useState(false);

  const [isAddNewMemberModalOpen, setIsAddNewMemberModalOpen] = useState(false);
  const [isCreateTitheListModalOpen, setIsCreateTitheListModalOpen] =
    useState(false);
  const [pendingTitheListMembers, setPendingTitheListMembers] = useState<
    MemberRecordA[] | null
  >(null);
  const [pendingTitheListAssembly, setPendingTitheListAssembly] = useState<
    string | null
  >(null);

  const [fullPreviewSearchTerm, setFullPreviewSearchTerm] = useState("");
  const [fullPreviewSortConfig, setFullPreviewSortConfig] = useState<{
    key: keyof TitheRecordB;
    direction: "asc" | "desc";
  } | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const storedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY) as
      | "dark"
      | "light"
      | null;
    return storedTheme || "dark";
  });

  const [accentColor, setAccentColor] = useState(() => {
    const storedColorKey = localStorage.getItem(APP_ACCENT_COLOR_KEY);
    return (
      THEME_OPTIONS.find((t) => t.key === storedColorKey) || THEME_OPTIONS[0]
    );
  });

  const [isSaveFavoriteModalOpen, setIsSaveFavoriteModalOpen] = useState(false);
  const [favoriteNameInput, setFavoriteNameInput] = useState("");

  const autoSaveTimerRef = useRef<number | null>(null);
  // const listOverviewRef = useRef<HTMLElement>(null); // TODO: Use to scroll to the list overview section.

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    window.innerWidth < 768,
  );

  const [currentAssembly, setCurrentAssembly] = useState<string | null>(null);
  const [isAssemblySelectionModalOpen, setIsAssemblySelectionModalOpen] =
    useState(false);
  const [pendingData, setPendingData] = useState<PendingData | null>(null);

  const [isClearWorkspaceModalOpen, setIsClearWorkspaceModalOpen] =
    useState(false);

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
            lastUpdated: new Date(0).getTime(), // Use epoch for clearly migrated data
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

  const [isParsing, setIsParsing] = useState(false);

  const [pendingUpdate, setPendingUpdate] =
    useState<PendingMasterListUpdate | null>(null);
  const [isUpdateConfirmModalOpen, setIsUpdateConfirmModalOpen] =
    useState(false);

  // State for editing members in the database
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<{
    member: MemberRecordA;
    assemblyName: string;
  } | null>(null);



  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  const addToast = useCallback(
    (
      message: string,
      type: "info" | "success" | "error" | "warning",
      duration?: number,
      actions?: { label: string; onClick: () => void }[],
    ) => {
      const toastOptions: Parameters<typeof toast>[1] = {
        duration,
        action: actions && actions.length > 0 ? {
          label: actions[0].label,
          onClick: actions[0].onClick
        } : undefined,
      };

      switch (type) {
        case "success":
          toast.success(message, toastOptions);
          break;
        case "error":
          toast.error(message, toastOptions);
          break;
        case "warning":
          toast.warning(message, toastOptions);
          break;
        case "info":
        default:
          toast.info(message, toastOptions);
          break;
      }
    },
    [],
  );

  const { isGeneratingReport, validationReportContent, generateValidationReport } = useGemini(
    import.meta.env.VITE_API_KEY,
    addToast,
  );

  const {
    isSubscribed,
    requestNotificationPermission,
    // registerBackgroundSync, // TODO: Implement background sync for offline data.
    // registerPeriodicSync, // TODO: Implement periodic sync for fetching updates.
  } = usePWAFeatures(addToast, setNewWorker);

  useEffect(() => {
    if (newWorker) {
      setGlobalNotifications((prev) => [
        ...prev,
        {
          id: "new-version-available",
          message: "A new version is available!",
          type: "info",
          action: {
            label: "Reload",
            onClick: () => {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            },
          },
        },
      ]);
    }
  }, [newWorker]);

  useEffect(() => {
    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const OFFLINE_TOAST_ID = "offline-indicator";
    const OfflineIcon = <WifiOff size={18} />;
    if (isOffline) {
      setGlobalNotifications((prev) => {
        if (!prev.some((n) => n.id === OFFLINE_TOAST_ID)) {
          return [
            ...prev,
            {
              id: OFFLINE_TOAST_ID,
              message: "You are currently offline.",
              type: "error",
              icon: OfflineIcon,
            },
          ];
        }
        return prev;
      });
    } else {
      setGlobalNotifications((prev) =>
        prev.filter((n) => n.id !== OFFLINE_TOAST_ID),
      );
    }
  }, [isOffline]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((p) => !p);
      } else if (e.key === "Escape" && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isCommandPaletteOpen]);

  const {
    favorites,
    setFavorites,
    transactionLog,
    setTransactionLog,
    isLoggedIn: isDriveLoggedIn,
    userProfile: driveUserProfile,
    syncStatus: driveSyncStatus,
    signIn: driveSignIn,
    signOut: driveSignOut,
    isConfigured: isDriveConfigured,
  } = useGoogleDriveSync(addToast);

  useEffect(() => {
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(
      theme === "light" ? "light-theme" : "dark-theme",
    );
    localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      MEMBER_DATABASE_STORAGE_KEY,
      JSON.stringify(memberDatabase),
    );
  }, [memberDatabase]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-hue", accentColor.values.h.toString());
    root.style.setProperty("--primary-saturation", `${accentColor.values.s}%`);
    root.style.setProperty("--primary-lightness", `${accentColor.values.l}%`);
    localStorage.setItem(APP_ACCENT_COLOR_KEY, accentColor.key);
  }, [accentColor]);

  const clearAutoSaveDraft = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
  }, []);

  const clearWorkspace = useCallback(() => {
    setUploadedFile(null);
    setOriginalData([]);
    setProcessedDataA([]);
    setTitheListData([]);
    setInputErrors({});
    setAgeRangeMin("");
    setAgeRangeMax("");
    setIsAgeFilterActive(false);
    setSelectedDate(new Date());
    setDescriptionText("Tithe");
    setFileNameToSave("GeneratedTitheList");
    setHasUnsavedChanges(false);
    clearAutoSaveDraft();
    setCurrentAssembly(null);
    setSoulsWonCount(0);
    setReconciliationReport(null);
    setAmountMappingColumn(null);
    // Close all modals
    setIsReconciliationModalOpen(false);
    setIsFavDetailsModalOpen(false);
    setIsDeleteFavConfirmModalOpen(false);
    setIsFullPreviewModalOpen(false);
    setIsAmountEntryModalOpen(false);
    setIsAddNewMemberModalOpen(false);
    setIsCreateTitheListModalOpen(false);
    setIsSaveFavoriteModalOpen(false);
    setIsAssemblySelectionModalOpen(false);
    setIsUpdateConfirmModalOpen(false);
    setIsEditMemberModalOpen(false);
    setIsValidationModalOpen(false);
    setIsCommandPaletteOpen(false);
  }, [clearAutoSaveDraft]);

  const handleDateChange = useCallback(
    (date: Date) => {
      const sundayDate = getMostRecentSunday(date); // Adjust input date to Sunday
      const isSameDay =
        sundayDate.setHours(0, 0, 0, 0) ===
        selectedDate.setHours(0, 0, 0, 0); if (isSameDay) {
          return;
        }

      if (currentAssembly) {
        const startOfDay = sundayDate.setHours(0, 0, 0, 0); // Use sundayDate here
        const logsForDay = transactionLog
          .filter((log) => {
            if (log.assemblyName !== currentAssembly) return false;
            const logDate = getMostRecentSunday(new Date(log.selectedDate)).setHours(0, 0, 0, 0); // Adjust logDate to Sunday
            return logDate === startOfDay;
          }).sort((a, b) => b.timestamp - a.timestamp);

        const latestLogForDate = logsForDay[0];

        if (latestLogForDate && latestLogForDate.titheListData) {
          const sundayDate = getMostRecentSunday(new Date(latestLogForDate.selectedDate));
          addToast(
            `Loading saved record for ${formatDateDDMMMYYYY(sundayDate)}.`,
            "info",
            3000,
          );

          setTitheListData(latestLogForDate.titheListData);
          setConcatenationConfig(latestLogForDate.concatenationConfig);
          setDescriptionText(latestLogForDate.descriptionText);
          setAmountMappingColumn(latestLogForDate.amountMappingColumn);
          setSoulsWonCount(latestLogForDate.soulsWonCount);
          setSelectedDate(sundayDate);

          setOriginalData([]);
          setProcessedDataA([]);
          setAgeRangeMin("");
          setAgeRangeMax("");
          setIsAgeFilterActive(false);
          setUploadedFile(
            new File(
              [],
              `Record from ${formatDateDDMMMYYYY(sundayDate)}`,
              { type: "text/plain" },
            ),
          );
          setFileNameToSave(
            `${latestLogForDate.assemblyName}-TitheList-${formatDateDDMMMYYYY(sundayDate)}`,
          );

          setHasUnsavedChanges(false);
          clearAutoSaveDraft();
          return;
        }
      }

      // If no log found, prepare the current list for the new date by resetting amounts.
      setSelectedDate(sundayDate);
      if (titheListData.length > 0) {
        const formattedDate = formatDateDDMMMYYYY(sundayDate);
        const newDescription = descriptionText.replace(
          /{DD-MMM-YYYY}/gi,
          formattedDate,
        );

        const freshList = titheListData.map((record) => ({
          ...record,
          "Transaction Amount": "", // Reset amount for the new date
          "Transaction Date ('DD-MMM-YYYY')": formattedDate,
          "Narration/Description": newDescription,
        }));

        setTitheListData(freshList);
        setSoulsWonCount(0); // Reset souls won for the new period
        setHasUnsavedChanges(true); // Mark as unsaved
      }

      if (currentAssembly) {
        const newFileName = `${currentAssembly}-TitheList-${formatDateDDMMMYYYY(sundayDate)}`;
        setFileNameToSave(newFileName);
      }
    },
    [
      currentAssembly,
      selectedDate,
      transactionLog,
      addToast,
      descriptionText,
      titheListData,
      clearAutoSaveDraft,
    ],
  );
  const handleDescriptionChange = useCallback(
    (text: string) => {
      setDescriptionText(text);
      if (titheListData.length > 0) {
        setTitheListData(
          createTitheList(
            processedDataA,
            concatenationConfig,
            selectedDate,
            text,
            amountMappingColumn,
          ),
        );
        setHasUnsavedChanges(true);
      }
    },
    [
      titheListData.length,
      processedDataA,
      concatenationConfig,
      selectedDate,
      amountMappingColumn,
    ],
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const draftDataRef = useRef({ titheListData, selectedDate, descriptionText, concatenationConfig, ageRangeMin, ageRangeMax, fileNameToSave, amountMappingColumn, uploadedFile, originalData, processedDataA, currentAssembly, soulsWonCount });

  useEffect(() => {
    draftDataRef.current = { titheListData, selectedDate, descriptionText, concatenationConfig, ageRangeMin, ageRangeMax, fileNameToSave, amountMappingColumn, uploadedFile, originalData, processedDataA, currentAssembly, soulsWonCount };
  }, [titheListData, selectedDate, descriptionText, concatenationConfig, ageRangeMin, ageRangeMax, fileNameToSave, amountMappingColumn, uploadedFile, originalData, processedDataA, currentAssembly, soulsWonCount]);

  const saveDraft = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      const { titheListData, currentAssembly, selectedDate, descriptionText, concatenationConfig, ageRangeMin, ageRangeMax, fileNameToSave, amountMappingColumn, uploadedFile, originalData, processedDataA, soulsWonCount } = draftDataRef.current;
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
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
      setHasUnsavedChanges(false);
      addToast("Draft auto-saved!", "success", 2000);
    }, AUTO_SAVE_DEBOUNCE_TIME);
  }, [addToast]);

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

  const handleFileAccepted = useCallback(
    async (file: File | null, isMasterList: boolean, assemblyName?: string) => {
      if (!file) {
        if (isMasterList) return;
        clearWorkspace();
        return;
      }
      setUploadedFile(file);

      // Check for unsaved changes before processing any file
      if (hasUnsavedChanges) {
        addToast(
          "You have unsaved changes. Please save or discard them before loading a new file.",
          "warning",
          5000,
        );
        return;
      }

      setIsParsing(true); // Set isParsing to true

      try {
        const parsedData = await parseExcelFile(file);

        if (isMasterList && assemblyName) {
          const existingData = memberDatabase[assemblyName];
          if (existingData && existingData.data.length > 0) {
            setPendingUpdate({
              assemblyName,
              newData: parsedData,
              newFileName: file.name,
            });
            setIsUpdateConfirmModalOpen(true);
          } else {
            handleMasterListUpdate(assemblyName, parsedData, file.name);
          }
        } else {
          const detectedAssembly =
            ASSEMBLIES.find((name) =>
              file.name.toLowerCase().includes(name.toLowerCase()),
            ) || "";

          setPendingData({
            data: parsedData,
            fileName: file.name,
            file,
            suggestedAssembly: detectedAssembly,
            isMasterList: false,
          });
          setIsAssemblySelectionModalOpen(true);
        }
      } catch (e: any) {
        const errorMessage =
          e.message || "An unknown error occurred during parsing.";
        addToast(`Error parsing file: ${errorMessage}`, "error", 5000);
      } finally {
        setIsParsing(false); // Set isParsing to false
      }
    },
    [hasUnsavedChanges, addToast, memberDatabase, clearWorkspace],
  );

  useEffect(() => {
    if ("launchQueue" in window) {
      (window as any).launchQueue.setConsumer(
        async (launchParams: { files: any[] }) => {
          if (!launchParams.files || launchParams.files.length === 0) {
            return;
          }
          for (const fileHandle of launchParams.files) {
            const file = await fileHandle.getFile();
            handleFileAccepted(file, false);
          }
        },
      );
    }
  }, [handleFileAccepted]);

  const handleMasterListUpdate = (
    assemblyName: string,
    newData: MemberRecordA[],
    newFileName: string,
  ) => {
    setMemberDatabase((prev) => ({
      ...prev,
      [assemblyName]: {
        data: newData,
        lastUpdated: Date.now(),
        fileName: newFileName,
      },
    }));
    addToast(
      `${assemblyName} master list has been updated with ${newData.length} records.`,
      "success",
    );
  };

  const navigate = useNavigate();
  const handleConfirmAssemblySelection = useCallback(
    async (assembly: string) => {
      if (!pendingData) return;

      clearWorkspace();
      setUploadedFile(pendingData.file);
      setCurrentAssembly(assembly);

      processData(pendingData.data, assembly, pendingData.file.name);

      navigate("/processor");
      setIsAssemblySelectionModalOpen(false);
      setPendingData(null);
    },
    [pendingData, clearWorkspace, navigate],
  );

  const processData = (
    data: MemberRecordA[],
    assembly: string,
    sourceFileName: string,
  ) => {
    setOriginalData(data);

    const masterList = memberDatabase[assembly];
    if (masterList?.data) {
      const report = reconcileMembers(data, masterList.data);
      let enrichedNewMembers: MemberRecordA[] = [];

      if (report.newMembers.length > 0) {
        const now = new Date().toISOString();

        enrichedNewMembers = report.newMembers.map((member) => ({
          ...member,
          firstSeenDate: now,
          firstSeenSource: sourceFileName,
        }));
      }

      // Consolidate updates: Apply changes AND add new members
      if (enrichedNewMembers.length > 0 || report.changedMembers.length > 0) {
        setMemberDatabase((prev) => {
          const prevAssemblyData = prev[assembly]?.data || [];
          let updatedData = [...prevAssemblyData];

          // 1. Apply Changes to existing members
          if (report.changedMembers.length > 0) {
            const changesMap = new Map(
              report.changedMembers.map((c) => [c.oldRecord, c]),
            );
            updatedData = updatedData.map((member) => {
              const change = changesMap.get(member);
              if (change) {
                return {
                  ...change.newRecord,
                  // Preserve internal metadata from the existing record
                  firstSeenDate: member.firstSeenDate,
                  firstSeenSource: member.firstSeenSource,
                  customOrder: member.customOrder,
                };
              }
              return member;
            });
          }

          // 2. Append New Members
          if (enrichedNewMembers.length > 0) {
            updatedData = [...updatedData, ...enrichedNewMembers];
          }

          return {
            ...prev,
            [assembly]: {
              ...(prev[assembly] || {
                lastUpdated: Date.now(),
              }),
              fileName: sourceFileName, // Always update with the latest source file name
              data: updatedData,
              lastUpdated: Date.now(),
            },
          };
        });
      }

      if (
        report.newMembers.length > 0 ||
        report.missingMembers.length > 0 ||
        report.changedMembers.length > 0
      ) {
        setReconciliationReport({
          ...report,
          newMembers:
            enrichedNewMembers.length > 0
              ? enrichedNewMembers
              : report.newMembers,
          previousFileDate: `Master List (updated ${new Date(masterList.lastUpdated).toLocaleDateString()})`,
        });
        setSoulsWonCount(report.newMembers.length);
        setIsReconciliationModalOpen(true);
      } else {
        setSoulsWonCount(0);
        addToast(
          "No changes detected. The uploaded file matches the master list.",
          "info",
        );
      }
    } else {
      setSoulsWonCount(data.length);
      addToast(
        `${data.length} members added as the first master list for ${assembly}.`,
        "success",
      );
      const now = new Date().toISOString();
      const enrichedData = data.map((member) => ({
        ...member,
        firstSeenDate: now,
        firstSeenSource: sourceFileName,
      }));
      setMemberDatabase((prev) => ({
        ...prev,
        [assembly]: {
          data: enrichedData,
          lastUpdated: Date.now(),
          fileName: sourceFileName,
        },
      }));
    }

    let filteredData = data;
    if (ageRangeMin || ageRangeMax) {
      filteredData = filterMembersByAge(
        data,
        Number(ageRangeMin) || undefined,
        Number(ageRangeMax) || undefined,
      );
      setIsAgeFilterActive(true);
    } else {
      setIsAgeFilterActive(false);
    }

    setProcessedDataA(filteredData);

    const listData = createTitheList(
      filteredData,
      concatenationConfig,
      selectedDate,
      descriptionText,
      amountMappingColumn,
    );

    setTitheListData(listData);
    setFileNameToSave(
      `${assembly}-TitheList-${formatDateDDMMMYYYY(new Date())}`,
    );
    addToast(
      `${assembly} data processed. ${data.length} records loaded.`,
      "success",
    );
  };

  const handleKeepReconciliationMembers = (membersToKeep: MemberRecordA[]) => {
    const newTitheRecords = createTitheList(
      membersToKeep,
      concatenationConfig,
      selectedDate,
      descriptionText,
      amountMappingColumn,
    );

    setTitheListData((prev) => {
      const existingNos = new Set(prev.map((r) => r["No."]));
      const recordsToAdd = newTitheRecords.filter(
        (r) => !existingNos.has(r["No."]),
      );
      return [...prev, ...recordsToAdd];
    });

    setProcessedDataA((prev) => [...prev, ...membersToKeep]);

    addToast(
      `Kept ${membersToKeep.length} missing members in the list.`,
      "success",
    );
  };

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
      createTitheList(
        filtered,
        concatenationConfig,
        selectedDate,
        descriptionText,
        amountMappingColumn,
      ),
    );
    addToast(`Age filter applied. ${filtered.length} records match.`, "info");
    setHasUnsavedChanges(true);
  }, [
    ageRangeMin,
    ageRangeMax,
    originalData,
    concatenationConfig,
    selectedDate,
    descriptionText,
    amountMappingColumn,
    addToast,
  ]);

  const handleRemoveAgeFilter = useCallback(() => {
    setAgeRangeMin("");
    setAgeRangeMax("");
    setInputErrors({});
    setProcessedDataA(originalData);
    setIsAgeFilterActive(false);
    setTitheListData(
      createTitheList(
        originalData,
        concatenationConfig,
        selectedDate,
        descriptionText,
        amountMappingColumn,
      ),
    );
    addToast("Age filter removed.", "info");
    setHasUnsavedChanges(true);
  }, [
    originalData,
    concatenationConfig,
    selectedDate,
    descriptionText,
    amountMappingColumn,
    addToast,
  ]);

  const handleConcatenationConfigChange = (key: keyof ConcatenationConfig) => {
    setConcatenationConfig((prev) => {
      const newConfig = { ...prev, [key]: !prev[key] };
      localStorage.setItem(
        DEFAULT_CONCAT_CONFIG_STORAGE_KEY,
        JSON.stringify(newConfig),
      );
      if (originalData.length > 0) {
        setTitheListData(
          createTitheList(
            processedDataA,
            newConfig,
            selectedDate,
            descriptionText,
            amountMappingColumn,
          ),
        );
        setHasUnsavedChanges(true);
      }
      return newConfig;
    });
  };

  const handleSaveFromPreview = (updatedList: TitheRecordB[]) => {
    setTitheListData(updatedList);

    if (currentAssembly) {
      const newOrderMap = new Map<string | number, number>();
      updatedList.forEach((record, index) => {
        newOrderMap.set(record["No."], index);
      });

      setMemberDatabase(prev => {
        const newDb = { ...prev };
        const assemblyData = newDb[currentAssembly]?.data || [];
        const updatedAssemblyData = assemblyData.map(member => {
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
    }

    setHasUnsavedChanges(true); // Mark the workspace as dirty
    addToast(
      "Changes from list view have been saved to the workspace.",
      "success",
    );
    setIsFullPreviewModalOpen(false);
  };

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

    return {
      tithersCount: tithers,
      totalTitheAmount: totalAmount,
    };
  }, [titheListData]);

  const handleDownloadExcel = useCallback(() => {
    if (!fileNameToSave.trim()) {
      setInputErrors((prev) => ({
        ...prev,
        fileName: "File name is required.",
      }));
      return;
    }
    setInputErrors((prev) => ({ ...prev, fileName: "" }));

    const dataToExport = titheListData.map((record, index) => ({
      ...record,
      "No.": index + 1,
    }));

    exportToExcel(dataToExport, fileNameToSave);
    pushAnalyticsEvent({
      type: "download_excel",
      payload: { fileName: fileNameToSave, records: dataToExport.length },
    });

    // Log the transaction
    if (currentAssembly && titheListData.length > 0) {
      const newLogEntry: TransactionLogEntry = {
        id: `${currentAssembly}-${formatDateDDMMMYYYY(selectedDate)}`, // Use formatted date for ID
        assemblyName: currentAssembly,
        timestamp: Date.now(),
        selectedDate: formatDateDDMMMYYYY(selectedDate), // Use formatted date for selectedDate
        totalTitheAmount: totalTitheAmount,
        soulsWonCount: soulsWonCount ?? 0,
        titherCount: tithersCount,
        recordCount: titheListData.length,
        // Snapshot data
        titheListData: titheListData,
        concatenationConfig: concatenationConfig,
        descriptionText: descriptionText,
        amountMappingColumn: amountMappingColumn,
      };
      setTransactionLog((prevLog) => {
        const existingIndex = prevLog.findIndex(
          (log) => log.id === newLogEntry.id,
        );
        if (existingIndex > -1) {
          const updatedLog = [...prevLog];
          updatedLog[existingIndex] = newLogEntry;
          return updatedLog;
        }
        return [...prevLog, newLogEntry];
      });
      addToast("Transaction has been logged for reporting.", "info");
    }
  }, [
    fileNameToSave,
    titheListData,
    currentAssembly,
    selectedDate,
    totalTitheAmount,
    soulsWonCount,
    tithersCount,
    setTransactionLog,
    addToast,
    concatenationConfig,
    descriptionText,
    amountMappingColumn,
  ]);

  const openSaveFavoriteModal = () => {
    const name = `${currentAssembly} - ${formatDateDDMMMYYYY(selectedDate)}`;
    setFavoriteNameInput(name);
    setIsSaveFavoriteModalOpen(true);
  };

  const handleSaveFavorite = () => {
    if (!favoriteNameInput.trim()) {
      addToast("Favorite name cannot be empty.", "error");
      return;
    }
    if (!currentAssembly) {
      addToast("Cannot save favorite without an assembly.", "error");
      return;
    }

    const favId = `${Date.now()}`;
    const newFavorite: FavoriteConfig = {
      id: favId,
      name: favoriteNameInput,
      timestamp: Date.now(),
      originalFileName: uploadedFile?.name || "Manual/Database Start",
      assemblyName: currentAssembly,
      ageRangeMin: Number(ageRangeMin) || undefined,
      ageRangeMax: Number(ageRangeMax) || undefined,
      concatenationConfig,
      selectedDate: formatDateDDMMMYYYY(selectedDate), // Use formatted date for selectedDate
      descriptionText,
      amountMappingColumn,
      originalData: originalData.length > 0 ? originalData : undefined,
      processedDataA: processedDataA,
      titheListData,
      soulsWonCount: soulsWonCount ?? 0,
      processedRecordsCount: processedDataA.length,
      totalTitheAmount: totalTitheAmount,
    };

    setFavorites((prev) => [
      newFavorite,
      ...prev.filter((f) => f.name !== newFavorite.name),
    ]);
    addToast("Saved to favorites!", "success");
    setIsSaveFavoriteModalOpen(false);
  };

  const loadFavorite = useCallback(
    (favId: string) => {
      const fav = favorites.find((f) => f.id === favId);
      if (!fav) {
        addToast(`Favorite not found.`, "error");
        return;
      }

      clearWorkspace();

      // Restore state from favorite
      setUploadedFile(
        fav.originalFileName
          ? new File([], fav.originalFileName, { type: "text/plain" })
          : null,
      );
      setOriginalData(fav.originalData || []);
      setProcessedDataA(fav.processedDataA || []);
      setTitheListData(fav.titheListData || []);

      setAgeRangeMin(String(fav.ageRangeMin || ""));
      setAgeRangeMax(String(fav.ageRangeMax || ""));
      setIsAgeFilterActive(!!(fav.ageRangeMin || fav.ageRangeMax));

      setConcatenationConfig(fav.concatenationConfig);
      setSelectedDate(getMostRecentSunday(new Date(fav.selectedDate))); // Adjust to most recent Sunday
      setDescriptionText(fav.descriptionText);
      setAmountMappingColumn(fav.amountMappingColumn || null);

      const formattedDate = formatDateDDMMMYYYY(getMostRecentSunday(new Date(fav.selectedDate))); // Adjust to most recent Sunday
      setFileNameToSave(`${fav.assemblyName}-TitheList-${formattedDate}`);
      setCurrentAssembly(fav.assemblyName);
      setSoulsWonCount(fav.soulsWonCount ?? 0);

      setHasUnsavedChanges(false);
      clearAutoSaveDraft();

      addToast(`Loaded favorite: "${fav.name}"`, "success");
      navigate("/processor");
    },
    [favorites, addToast, clearWorkspace, clearAutoSaveDraft, navigate],
  );



  const startNewWeek = (assemblyName: string) => {
    const masterList = memberDatabase[assemblyName];
    if (!masterList || !masterList.data || masterList.data.length === 0) {
      addToast(
        `No member data found for ${assemblyName} in the database. Please upload a master list first.`,
        "warning",
      );
      return;
    }

    clearWorkspace();

    const memberSourceRecords = masterList.data;
    const sundayDate = getMostRecentSunday(new Date()); // Use the helper function
    const formattedDate = formatDateDDMMMYYYY(sundayDate);
    const newDescription = `Tithe for ${formattedDate}`;

    const freshTitheList = createTitheList(
      memberSourceRecords,
      concatenationConfig,
      sundayDate, // Use sundayDate here
      newDescription,
      amountMappingColumn,
    ).map((record) => ({ ...record, "Transaction Amount": "" }));

    setTitheListData(freshTitheList);

    setOriginalData(memberSourceRecords);
    setProcessedDataA(memberSourceRecords);
    setDescriptionText(newDescription);
    setCurrentAssembly(assemblyName);
    setFileNameToSave(`${assemblyName}-TitheList-${formattedDate}`);
    setSoulsWonCount(0);
    setSelectedDate(sundayDate); // Set the Sunday date
    setHasUnsavedChanges(false);
    clearAutoSaveDraft();

    navigate("/processor");
    addToast(
      `Started new week for ${assemblyName} using the master member list.`,
      "success",
    );
  };

  const deleteFavorite = (favId: string) => {
    setFavToDeleteId(favId);
    setIsDeleteFavConfirmModalOpen(true);
  };

  const confirmDeleteFavorite = () => {
    if (!favToDeleteId) return;
    setFavorites((prev) => prev.filter((f) => f.id !== favToDeleteId));
    addToast("Favorite deleted.", "success");
    setIsDeleteFavConfirmModalOpen(false);
    setFavToDeleteId(null);
  };

  const updateFavoriteName = (favId: string, newName: string) => {
    setFavorites((prev) =>
      prev.map((f) =>
        f.id === favId ? { ...f, name: newName, timestamp: Date.now() } : f
      ),
    );
  };

  const viewFavoriteDetails = (fav: FavoriteConfig) => {
    setSelectedFavoriteForDetails(fav);
    setIsFavDetailsModalOpen(true);
  };

  const handleConfirmClearWorkspace = () => {
    clearWorkspace();
    addToast("Workspace cleared.", "info");
    setIsClearWorkspaceModalOpen(false);
    navigate("/"); // Navigate to dashboard after clearing workspace
  };

  const handleAddNewMemberToList = (newMember: MemberRecordA) => {
    if (currentAssembly) {
      const enrichedMember = {
        ...newMember,
        firstSeenDate: new Date().toISOString(),
        firstSeenSource: "manual_add",
      };

      setMemberDatabase((prev) => {
        const assemblyData = prev[currentAssembly]?.data || [];
        const updatedAssemblyData = [...assemblyData, enrichedMember];
        return {
          ...prev,
          [currentAssembly]: {
            ...(prev[currentAssembly] || {
              lastUpdated: Date.now(),
            }),
            fileName: "Mixed Source", // Always set to Mixed Source on manual add
            data: updatedAssemblyData,
            lastUpdated: Date.now(),
          },
        };
      });

      const sundayDate = getMostRecentSunday(new Date());
      const formattedDate = formatDateDDMMMYYYY(sundayDate);
      const defaultDescription = `Tithe for ${formattedDate}`;

      const newTitheRecord = createTitheList(
        [enrichedMember],
        concatenationConfig,
        sundayDate, // Use sundayDate here
        defaultDescription, // Use defaultDescription here
        null,
      )[0];
      setTitheListData((prev) => [...prev, newTitheRecord]);
      setSoulsWonCount((prev) => (prev || 0) + 1);
      addToast(
        `Added new member: ${newMember["First Name"]} ${newMember.Surname}`,
        "success",
      );
      setIsAddNewMemberModalOpen(false);
    }
  };

  const handleAddExistingMemberToList = (member: MemberRecordA) => {
    const sundayDate = getMostRecentSunday(new Date());
    const formattedDate = formatDateDDMMMYYYY(sundayDate);
    const defaultDescription = `Tithe for ${formattedDate}`;

    const newTitheRecord = createTitheList(
      [member],
      concatenationConfig,
      sundayDate, // Use sundayDate here
      defaultDescription, // Use defaultDescription here
      null,
    )[0];
    setTitheListData((prev) => [...prev, newTitheRecord]);
    addToast(
      `Added existing member: ${member["First Name"]} ${member.Surname}`,
      "success",
    );
  };

  const handleCreateTitheListFromDB = (
    members: MemberRecordA[],
    assembly: string,
  ) => {
    clearWorkspace();
    setCurrentAssembly(assembly);
    setOriginalData(members);
    setProcessedDataA(members);

    const sundayDate = getMostRecentSunday(new Date()); // Use the helper function
    const formattedDate = formatDateDDMMMYYYY(sundayDate);
    const defaultDescription = `Tithe for ${formattedDate}`;
    setDescriptionText(defaultDescription);
    setSelectedDate(sundayDate); // Set the Sunday date

    const list = createTitheList(
      members,
      concatenationConfig,
      sundayDate, // Use sundayDate here
      defaultDescription,
      null,
    );
    setTitheListData(list);
    setFileNameToSave(
      `${assembly}-TitheList-${formattedDate}`,
    );
    navigate("/processor");
    setIsCreateTitheListModalOpen(false);
    addToast(
      `Created a new list with ${members.length} members from the database.`,
      "success",
    );
  };

  const handleEditMemberInDB = (member: MemberRecordA) => {
    if (!memberToEdit) return;
    const { assemblyName } = memberToEdit;

    setMemberDatabase((prev) => {
      const assemblyData = prev[assemblyName]?.data || [];
      const isNewMember = String(member["No."]).startsWith("new_");
      let updatedData;

      if (isNewMember) {
        const finalNewMember = {
          ...member,
          "No.": assemblyData.length + 1,
          firstSeenDate: new Date().toISOString(),
          firstSeenSource: "manual_db_add",
        };
        updatedData = [...assemblyData, finalNewMember];
        addToast(`New member added to ${assemblyName} database.`, "success");
      } else {
        updatedData = assemblyData.map((m) => {
          if (m["No."] === member["No."]) {
            return { ...m, ...member };
          }
          return m;
        });
        addToast(
          `Member details updated in ${assemblyName} database.`,
          "success",
        );
      }

      return {
        ...prev,
        [assemblyName]: {
          ...(prev[assemblyName] || {}), // Removed fileName: "Mixed Source" from here
          fileName: "Mixed Source", // Always set to Mixed Source on edit/add via this function
          data: updatedData,
          lastUpdated: Date.now(),
        },
      };
    });

    setIsEditMemberModalOpen(false);
    setMemberToEdit(null);
  };

  const openAddMemberToListModal = () => {
    if (!currentAssembly) {
      addToast("An assembly must be active to add a member.", "warning");
      return;
    }
    setIsAddNewMemberModalOpen(true);
  };

  const getMostRecentSunday = (date: Date): Date => {
    const day = date.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
    const diff = date.getDate() - day; // Calculate difference to get to Sunday
    const sunday = new Date(date.setDate(diff));
    sunday.setHours(0, 0, 0, 0); // Set to the beginning of the day to normalize
    return sunday;
  };

  const location = useLocation();
  const viewTitles: Record<string, string> = {
    "/": "Dashboard",
    "/processor": "Tithe Processor",
    "/database": "Member Database",
    "/favorites": "Favorites",
    "/reports": "Reports",
    "/analytics": "AI Analytics",
  };

  return (
    <div
      className={`app-container ${!isSidebarCollapsed && window.innerWidth < 768 ? "sidebar-open" : ""}`}
    >
      <Sidebar
        theme={theme}
        setTheme={setTheme}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isLoggedIn={isDriveLoggedIn}
        userProfile={driveUserProfile}
        syncStatus={driveSyncStatus}
        signIn={driveSignIn}
        signOut={driveSignOut}
        isConfigured={isDriveConfigured}
        openCommandPalette={() => setIsCommandPaletteOpen(true)}
        isOnline={!isOffline}
      />
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            setTheme={setTheme}
            onStartNewWeek={startNewWeek}
            favorites={favorites}
            theme={theme}
            setActiveView={(view) => navigate(view)}
          />
        )}
      </AnimatePresence>
      <div
        className="app-container-overlay"
        onClick={() => setIsSidebarCollapsed(true)}
      />
      <main className="main-content">
        <MobileHeader
          onMenuClick={() => setIsSidebarCollapsed(false)}
          title={viewTitles[location.pathname] || "TACTMS"}
          globalNotifications={globalNotifications}
          accentColor={accentColor}
        />
        <DesktopNotifications
          globalNotifications={globalNotifications}
          accentColor={accentColor}
        />
        <AnimatePresence mode="wait">
          <MotionDiv
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet
              context={{
                // Dashboard
                transactionLog,
                memberDatabase,
                favorites,
                onStartNewWeek: startNewWeek,
                userProfile: driveUserProfile,
                onUploadFile: handleFileAccepted,
                onGenerateValidationReport: () => {
                  generateValidationReport(originalData);
                  setIsValidationModalOpen(true);
                },
                // Favorites
                favoritesSearchTerm,
                setFavoritesSearchTerm,
                loadFavorite,
                deleteFavorite,
                viewFavoriteDetails,
                updateFavoriteName,
                addToast,
                // Analytics
                titheListData,
                currentAssembly,
                selectedDate,
                // Reports
                // MemberDatabase
                onUploadMasterList: (file: File, assembly: string) =>
                  handleFileAccepted(file, true, assembly),
                onCreateTitheList: (
                  members: MemberRecordA[],
                  assembly: string,
                ) => {
                  setPendingTitheListMembers(members);
                  setPendingTitheListAssembly(assembly);
                  setIsCreateTitheListModalOpen(true);
                },
                onEditMember: (member: MemberRecordA, assemblyName: string) => {
                  setMemberToEdit({ member, assemblyName });
                  setIsEditMemberModalOpen(true);
                },
                // ListOverviewActions
                currentTotalTithe: totalTitheAmount,
                hasUnsavedChanges,
                tithersCount,
                nonTithersCount: processedDataA.length - tithersCount,
                tithersPercentage:
                  processedDataA.length > 0
                    ? (tithersCount / processedDataA.length) * 100
                    : 0,
                setIsFullPreviewModalOpen,
                setIsAmountEntryModalOpen,
                fileNameToSave,
                setFileNameToSave,
                inputErrors,
                setInputErrors,
                handleDownloadExcel,
                openSaveFavoriteModal,
                onClearWorkspace: () => setIsClearWorkspaceModalOpen(true),
                soulsWonCount,
                // Configuration
                isLoggedIn: isDriveLoggedIn,
                syncStatus: driveSyncStatus,
                signIn: driveSignIn,
                signOut: driveSignOut,
                isConfigured: isDriveConfigured,
                ageRangeMin,
                setAgeRangeMin,
                ageRangeMax,
                setAgeRangeMax,
                isAgeFilterActive,
                handleApplyAgeFilter,
                handleRemoveAgeFilter,
                concatenationConfig,
                handleConcatenationConfigChange,
                descriptionText,
                handleDescriptionChange,
                amountMappingColumn,
                setAmountMappingColumn,
                theme,
                setTheme,
                accentColor,
                setAccentColor,
                isSubscribed,
                requestNotificationPermission,
                onDateChange: handleDateChange, // Add this line
              }}
            />
          </MotionDiv>
        </AnimatePresence>
      </main>



      <Toaster richColors theme={theme} />

      {isFullPreviewModalOpen && (
        <FullTithePreviewModal
          isOpen={isFullPreviewModalOpen}
          onClose={() => setIsFullPreviewModalOpen(false)}
          titheListData={titheListData}
          onSave={handleSaveFromPreview}
          itemsPerPage={ITEMS_PER_FULL_PREVIEW_PAGE}
          addToast={addToast}
          searchTerm={fullPreviewSearchTerm}
          setSearchTerm={setFullPreviewSearchTerm}
          sortConfig={fullPreviewSortConfig}
          setSortConfig={setFullPreviewSortConfig}
          openAddMemberToListModal={openAddMemberToListModal}
          assemblyName={currentAssembly || ""}
        />
      )}

      {isAmountEntryModalOpen && (
        <AmountEntryModal
          isOpen={isAmountEntryModalOpen}
          onClose={() => setIsAmountEntryModalOpen(false)}
          titheListData={titheListData}
          onSave={handleSaveFromPreview}
        />
      )}

      {isAddNewMemberModalOpen && (
        <AddNewMemberModal
          isOpen={isAddNewMemberModalOpen}
          onClose={() => setIsAddNewMemberModalOpen(false)}
          onConfirm={handleAddNewMemberToList}
          onAddExistingMember={handleAddExistingMemberToList}
          currentAssembly={currentAssembly}
          memberDatabase={
            currentAssembly ? memberDatabase[currentAssembly]?.data || [] : []
          }
          titheListData={titheListData}
        />
      )}

      {isCreateTitheListModalOpen && (
        <CreateTitheListModal
          isOpen={isCreateTitheListModalOpen}
          onClose={() => setIsCreateTitheListModalOpen(false)}
          onConfirm={() => {
            if (pendingTitheListMembers && pendingTitheListAssembly) {
              handleCreateTitheListFromDB(
                pendingTitheListMembers,
                pendingTitheListAssembly,
              );
            }
          }}
          memberCount={pendingTitheListMembers?.length || 0}
          assemblyName={pendingTitheListAssembly || ""}
        />
      )}
      {isSaveFavoriteModalOpen && (
        <Modal
          isOpen={isSaveFavoriteModalOpen}
          onClose={() => setIsSaveFavoriteModalOpen(false)}
          title="Save Configuration to Favorites"
          closeOnOutsideClick={false}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="favName" className="form-label">
                Favorite Name
              </label>
              <input
                id="favName"
                type="text"
                value={favoriteNameInput}
                onChange={(e) => setFavoriteNameInput(e.target.value)}
                className="form-input-light w-full"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsSaveFavoriteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveFavorite}
              leftIcon={<Save size={16} />}
            >
              Save Favorite
            </Button>
          </div>
        </Modal>
      )}
      {isDeleteFavConfirmModalOpen && (
        <Modal
          isOpen={isDeleteFavConfirmModalOpen}
          onClose={() => setIsDeleteFavConfirmModalOpen(false)}
          title="Delete Favorite?"
          closeOnOutsideClick={false}
        >
          <p>
            Are you sure you want to delete this favorite? This action cannot be
            undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteFavConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteFavorite}
              leftIcon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}
      {selectedFavoriteForDetails && (
        <Modal
          isOpen={isFavDetailsModalOpen}
          onClose={() => setIsFavDetailsModalOpen(false)}
          title={`Details for "${selectedFavoriteForDetails.name}"`}
          size="lg"
        >
          <pre className="text-xs bg-[var(--bg-elevated)] p-4 rounded-md max-h-96 overflow-auto">
            {JSON.stringify(selectedFavoriteForDetails, null, 2)}
          </pre>
        </Modal>
      )}
      {isAssemblySelectionModalOpen && pendingData && (
        <AssemblySelectionModal
          isOpen={isAssemblySelectionModalOpen}
          onClose={() => setIsAssemblySelectionModalOpen(false)}
          onConfirm={handleConfirmAssemblySelection}
          fileName={pendingData.fileName}
          suggestedAssembly={pendingData.suggestedAssembly}
        />
      )}
      {isReconciliationModalOpen && reconciliationReport && (
        <MembershipReconciliationModal
          isOpen={isReconciliationModalOpen}
          onClose={() => setIsReconciliationModalOpen(false)}
          report={reconciliationReport}
          onKeepMembers={handleKeepReconciliationMembers}
        />
      )}
      {isClearWorkspaceModalOpen && (
        <ClearWorkspaceModal
          isOpen={isClearWorkspaceModalOpen}
          onClose={() => setIsClearWorkspaceModalOpen(false)}
          onConfirm={handleConfirmClearWorkspace}
        />
      )}
      {isUpdateConfirmModalOpen && pendingUpdate && (
        <UpdateMasterListConfirmModal
          isOpen={isUpdateConfirmModalOpen}
          onClose={() => setIsUpdateConfirmModalOpen(false)}
          onConfirm={() => {
            handleMasterListUpdate(
              pendingUpdate.assemblyName,
              pendingUpdate.newData,
              pendingUpdate.newFileName,
            );
            setIsUpdateConfirmModalOpen(false);
          }}
          existingData={memberDatabase[pendingUpdate.assemblyName]}
          pendingUpdate={pendingUpdate}
        />
      )}
      {isEditMemberModalOpen && memberToEdit && (
        <EditMemberModal
          isOpen={isEditMemberModalOpen}
          onClose={() => setIsEditMemberModalOpen(false)}
          onSave={handleEditMemberInDB}
          memberData={memberToEdit.member}
          assemblyName={memberToEdit.assemblyName}
        />
      )}
      {isValidationModalOpen && (
        <ValidationReportModal
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
          reportContent={validationReportContent}
          isLoading={isGeneratingReport}
        />
      )}

      <ParsingIndicator isOpen={isParsing} />
    </div>
  );
};

export default App;
