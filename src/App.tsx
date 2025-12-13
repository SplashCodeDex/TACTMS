import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  MemberRecordA,
  TitheRecordB,
  FavoriteConfig,
  MembershipReconciliationReport,
} from "./types";
import Button from "@/components/Button";
import { Toaster } from "@/components/ui/sonner";
import Modal from "@/components/Modal";
import {
  ITEMS_PER_FULL_PREVIEW_PAGE,
} from "./constants";
import AmountEntryModal from "@/components/AmountEntryModal";
import AssemblySelectionModal from "@/components/AssemblySelectionModal";
import MembershipReconciliationModal from "@/components/MembershipReconciliationModal";
import ClearWorkspaceModal from "@/components/ClearWorkspaceModal";
import UpdateMasterListConfirmModal from "@/components/UpdateMasterListConfirmModal";
import EditMemberModal from "@/components/EditMemberModal";
import MobileHeader from "@/components/MobileHeader";
import DesktopNotifications from "@/components/DesktopNotifications";
import ValidationReportModal from "@/components/ValidationReportModal";
import CommandPalette from "@/components/CommandPalette";
import ParsingIndicator from "@/components/ParsingIndicator";
import { useGemini } from "@/hooks/useGemini";
import { usePWAFeatures } from "@/hooks/usePWAFeatures";
import { useGoogleDriveSync } from "@/hooks/useGoogleDriveSync";
import Sidebar from "@/components/Sidebar";
import FullTithePreviewModal from "@/components/FullTithePreviewModal";
import AddNewMemberModal from "@/components/AddNewMemberModal";
import CreateTitheListModal from "@/components/CreateTitheListModal";
import ImageVerificationModal from "@/components/ImageVerificationModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { WifiOff, Save, Trash2 } from "lucide-react";
import { parseExcelFile, detectExcelFileType } from "@/lib/excelUtils";
import { useThemePreferences } from "@/hooks/useThemePreferences";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCommandPaletteHotkeys } from "@/hooks/useCommandPaletteHotkeys";
import { useModalsPhase2 as useModals } from "@/hooks/useModals";
import { useModal } from "@/hooks/useModal";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
// Context hooks - shared state across app
import { useWorkspaceContext, useDatabaseContext, useToast, useAppConfigContext } from "@/context";
import { useFavorites } from "./hooks/useFavorites";
import { useAppActions } from "./hooks/useAppActions";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import MobileBottomNav from "@/components/MobileBottomNav";

import {
  createTitheList,
  reconcileMembers,
  filterMembersByAge,
} from "@/services/excelProcessor";

import { formatDateDDMMMYYYY, calculateSundayDate, getMostRecentSunday } from "@/lib/dataTransforms";

import {
  initializeOrder,
  getOrderedMembers,
  applyNewOrder,
  syncWithMasterList,
} from "@/services/memberOrderService";

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

// animation helper available: motion.div from framer-motion



const App: React.FC = () => {
  const [globalNotifications, setGlobalNotifications] = useState<Notification[]>([]);
  const [inputErrors, setInputErrors] = useState<{ [key: string]: string }>({});
  const [reconciliationReport, setReconciliationReport] =
    useState<MembershipReconciliationReport | null>(null);
  const [, setIsReconciliationModalOpen] = useState(false);
  const [favoritesSearchTerm, setFavoritesSearchTerm] = useState("");
  const [selectedFavoriteForDetails, setSelectedFavoriteForDetails] =
    useState<FavoriteConfig | null>(null);
  const [favToDeleteId, setFavToDeleteId] = useState<string | null>(null);

  const { assemblySelection: _assemblySelection, reconciliation: _reconciliation } = useModals();
  const fullPreview = useModal("fullPreview");
  const amountEntry = useModal("amountEntry");
  const validationReport = useModal("validationReport");
  const updateConfirm = useModal("updateConfirm");
  const editMember = useModal("editMember");
  const favoriteDetailsModal = useModal("favoriteDetails");
  const clearWorkspaceModal = useModal("clearWorkspace");
  // Backwards-compatible adapters for existing props/usages during refactor
  const setIsFullPreviewModalOpen = (open: boolean) =>
    open ? fullPreview.open() : fullPreview.close();
  const isAmountEntryModalOpen = amountEntry.isOpen;
  const setIsAmountEntryModalOpen = (open: boolean) =>
    open ? amountEntry.open() : amountEntry.close();
  // Favorites adapters (Phase 2 temporary)

  const [isAddNewMemberModalOpen, setIsAddNewMemberModalOpen] = useState(false);
  const [isCrossAssemblySearch, setIsCrossAssemblySearch] = useState(false);
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



  const { theme, setTheme, accentColor, setAccentColor } = useThemePreferences();

  // saveFavorite handled via useModalsPhase2()
  const [favoriteNameInput, setFavoriteNameInput] = useState("");
  const saveFavorite = useModal("saveFavorite");
  const deleteFavoriteModal = useModal("deleteFavorite");

  // Global keyboard shortcuts: Ctrl+S (save), Ctrl+K (search/command palette)
  useGlobalShortcuts({
    onSave: () => {
      if (titheListData.length > 0 && currentAssembly) {
        saveFavorite.open();
      }
    },
    onSearch: () => setIsCommandPaletteOpen(true),
  });






  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    window.innerWidth < 768,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auto-close mobile sidebar on route change
  const location = useLocation();
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // ESC key to close mobile sidebar
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [isMobileSidebarOpen]);

  // Swipe-left to close mobile sidebar
  const sidebarSwipeHandlers = useSwipeGesture({
    onSwipeLeft: () => setIsMobileSidebarOpen(false),
    threshold: 50,
  });


  const assemblySelectionModal = useModal("assemblySelection");
  // Backwards-compat adapters for in-flight refactor
  const isAssemblySelectionModalOpen = assemblySelectionModal.isOpen;
  const pendingData = (assemblySelectionModal.payload as any)?.pending as PendingData | null;
  const setIsAssemblySelectionModalOpen = (open: boolean) =>
    open ? assemblySelectionModal.open(assemblySelectionModal.payload as any) : assemblySelectionModal.close();



  // migrated to ModalProvider: clearWorkspaceModal

  // --- Context Hooks (shared state) ---
  const addToast = useToast();
  const { assemblies, addAssembly, removeAssembly: _removeAssembly } = useAppConfigContext();

  // Workspace context - tithe processing state
  const {
    uploadedFile,
    setUploadedFile,
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
    hasUnsavedChanges,
    setHasUnsavedChanges,
    ageRangeMin,
    setAgeRangeMin,
    ageRangeMax,
    setAgeRangeMax,
    isAgeFilterActive,
    setIsAgeFilterActive,
    soulsWonCount,
    setSoulsWonCount,
    concatenationConfig,
    setConcatenationConfig: _setConcatenationConfig,
    amountMappingColumn,
    setAmountMappingColumn,
    clearWorkspace,
    clearAutoSaveDraft,
  } = useWorkspaceContext();

  // Database context - member database operations
  const {
    memberDatabase,
    setMemberDatabase,
    updateMember,
  } = useDatabaseContext();

  const [isParsing, setIsParsing] = useState(false);
  const [isImageScanning, setIsImageScanning] = useState(false);

  // State for editing members in the database
  const [memberToEdit, setMemberToEdit] = useState<{
    member: MemberRecordA;
    assemblyName: string;
  } | null>(null);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Image Verification State
  const [isImageVerificationModalOpen, setIsImageVerificationModalOpen] = useState(false);
  const [extractedTitheData, setExtractedTitheData] = useState<TitheRecordB[]>([]);
  const [imageVerificationMasterData, setImageVerificationMasterData] = useState<MemberRecordA[]>([]);
  // Notebook format detection state
  const [isNotebookFormat, setIsNotebookFormat] = useState(false);
  const [notebookMetadata, setNotebookMetadata] = useState<{ detectedDate?: string; attendance?: number } | undefined>(undefined);

  // Favorites hook - provides saveFavorite, deleteFavorite, updateFavoriteName, etc.
  const favoritesHook = useFavorites(addToast);



  const { analyzeImage } = useGemini(
    import.meta.env.VITE_GEMINI_API_KEY,
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

  useOnlineStatus((online) => setIsOffline(!online));

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

  useCommandPaletteHotkeys(setIsCommandPaletteOpen);

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

  // App Actions hook - centralized handlers extracted from App.tsx
  const appActions = useAppActions({
    setInputErrors,
    setHasUnsavedChanges,
    setFavorites,
    setTransactionLog,
    favorites,
    clearAutoSaveDraft,
  });

  useEffect(() => {
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(
      theme === "light" ? "light-theme" : "dark-theme",
    );
  }, [theme]);


  // Cleanup: Remove any accidental "true" assembly keys created by earlier uploads
  useEffect(() => {
    if ((memberDatabase as any)?.true) {
      setMemberDatabase((prev) => {
        const copy: any = { ...prev };
        delete copy.true;
        return copy;
      });
      addToast("Cleaned up an invalid 'true' assembly entry from the database.", "info");
    }
  }, [memberDatabase, setMemberDatabase, addToast]);

  // accent color persistence handled by useThemePreferences()



  // ...



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
        sourceFileDate: uploadedFile?.lastModified || Date.now(), // Capture file date
      },
    }));
    addToast(
      `${assemblyName} master list has been updated with ${newData.length} records.`,
      "success",
    );
  };

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
        const fileType = await detectExcelFileType(file);
        const parsedData = await parseExcelFile(file);

        // Intelligent Detection Override
        // If we detect it's a Master List, treat it as one.
        // If we detect it's a Tithe List, treat it as one.
        // Fallback to isMasterList flag if UNKNOWN.
        const isActuallyMasterList =
          fileType === "MASTER_LIST" || (fileType === "UNKNOWN" && isMasterList);

        if (isActuallyMasterList) {
          // It's a Master List
          const targetAssembly =
            assemblyName ||
            assemblies.find((name: string) =>
              file.name.toLowerCase().includes(name.toLowerCase()),
            );

          if (targetAssembly) {
            const existingData = memberDatabase[targetAssembly];
            // If data exists, or if we are just uploading a fresh master list for an assembly
            // We should probably always confirm if it's an update to an existing one,
            // but for now let's stick to the existing logic of checking if data > 0
            if (existingData && existingData.data.length > 0) {
              updateConfirm.open({
                pending: {
                  assemblyName: targetAssembly,
                  newData: parsedData,
                  newFileName: file.name,
                }
              });
            } else {
              handleMasterListUpdate(targetAssembly, parsedData, file.name);
            }
          } else {
            addToast(
              "Detected a Master List, but could not identify the Assembly from the filename. Please rename the file to include the Assembly name (e.g., 'Maranatha Members.xlsx').",
              "error",
              6000
            );
          }
        } else {
          // It's a Tithe List (or Unknown treated as Tithe List)
          const detectedAssembly =
            assemblies.find((name: string) =>
              file.name.toLowerCase().includes(name.toLowerCase()),
            ) || "";

          assemblySelectionModal.open({
            pending: {
              data: parsedData,
              fileName: file.name,
              file: file,
              suggestedAssembly: detectedAssembly,
              isMasterList: false,
            }
          });
        }
      } catch (e: any) {
        const errorMessage =
          e.message || "An unknown error occurred during parsing.";
        addToast(`Error parsing file: ${errorMessage}`, "error", 5000);
      } finally {
        setIsParsing(false); // Set isParsing to false
      }
    },
    [
      hasUnsavedChanges,
      addToast,
      memberDatabase,
      clearWorkspace,
      assemblies,
      assemblySelectionModal,
      handleMasterListUpdate,
      setUploadedFile,
      updateConfirm,
    ],
  );

  useEffect(() => {
    if ("launchQueue" in window && window["launchQueue"]) {
      window["launchQueue"].setConsumer(
        async (launchParams: { files: FileSystemFileHandle[] }) => {
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



  // handleDeleteAssembly moved to useAppActions hook

  const navigate = useNavigate();
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
                  ...member, // MERGE STRATEGY: Keep existing data (e.g. Notes, Custom Fields)
                  ...change.newRecord, // Overwrite only with fields present in the new file
                  // Preserve internal metadata from the existing record (explicitly, to be safe)
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
              sourceFileDate: uploadedFile?.lastModified || Date.now(), // Update source file date
              data: updatedData,
              lastUpdated: Date.now(),
            },
          };
        });
      }

      if (
        report.newMembers.length > 0 ||
        report.changedMembers.length > 0 ||
        report.conflicts.length > 0
      ) {
        setReconciliationReport({
          ...report,
          newMembers:
            enrichedNewMembers.length > 0
              ? enrichedNewMembers
              : report.newMembers,
          previousFileDate: `Master List (updated ${new Date(masterList.lastUpdated).toLocaleDateString()})`,
        });

        // Time Travel Check
        const currentFileDate = uploadedFile?.lastModified || 0;
        const dbFileDate = masterList.sourceFileDate || 0;

        if (dbFileDate > currentFileDate) {
          addToast(
            "Warning: The uploaded file appears to be older than the current database version.",
            "warning",
            8000
          );
        }

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
          sourceFileDate: uploadedFile?.lastModified || Date.now(),
        },
      }));

      let filteredData: MemberRecordA[] = enrichedData;
      if (ageRangeMin || ageRangeMax) {
        filteredData = filterMembersByAge(
          enrichedData,
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

      // Sync with Member Order Service (IndexedDB)
      syncWithMasterList(enrichedData, assembly).catch((err) =>
        console.error("Failed to sync member order:", err),
      );
    };
  };

  const handleConfirmAssemblySelection = useCallback(
    async (assembly: string) => {
      const pending = assemblySelectionModal.payload?.pending as PendingData | undefined;
      if (!pending) return;

      clearWorkspace();
      setUploadedFile(pending.file);
      setCurrentAssembly(assembly);

      processData(pending.data, assembly, pending.file.name);

      navigate("/processor");
      assemblySelectionModal.close();
    },
    [assemblySelectionModal, clearWorkspace, navigate, processData, setCurrentAssembly, setUploadedFile],
  );





  // handleApplyAgeFilter moved to useAppActions hook

  // handleRemoveAgeFilter, handleDescriptionChange, handleDateChange,
  // handleConcatenationConfigChange moved to useAppActions hook

  const handleSaveFromPreview = (updatedList: TitheRecordB[]) => {
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
          const newOrder =
            member["No."] !== undefined
              ? newOrderMap.get(member["No."])
              : undefined;
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
    fullPreview.close()

    // Persist to IndexedDB using atomic sequential reorder
    if (currentAssembly) {
      const orderedMemberIds = updatedList
        .map((record) =>
          record.memberDetails?.["Membership Number"] ||
          record.memberDetails?.["Old Membership Number"]
        )
        .filter((id): id is string => !!id);

      if (orderedMemberIds.length > 0) {
        applyNewOrder(orderedMemberIds, currentAssembly).catch((err) =>
          console.error("Failed to persist member order:", err),
        );
      }
    }
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

  // handleDownloadExcel moved to useAppActions hook


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
    saveFavorite.close();
  };

  // loadFavorite moved to useAppActions hook



  const startNewWeek = async (assemblyName: string) => {
    const masterList = memberDatabase[assemblyName];
    if (!masterList || !masterList.data || masterList.data.length === 0) {
      addToast(
        `No member data found for ${assemblyName} in the database. Please upload a master list first.`,
        "warning",
      );
      return;
    }

    clearWorkspace();

    let memberSourceRecords = masterList.data;

    // Load persisted order from IndexedDB
    try {
      const orderedMembers = await getOrderedMembers(assemblyName);
      if (orderedMembers.length > 0) {
        const memberMap = new Map(
          memberSourceRecords.map((m) => [
            (
              m["Membership Number"] ||
              m["Old Membership Number"] ||
              ""
            ).toLowerCase(),
            m,
          ]),
        );

        const reordered = orderedMembers
          .map((entry) => memberMap.get(entry.memberId.toLowerCase()))
          .filter((m): m is MemberRecordA => !!m);

        const orderedIds = new Set(
          orderedMembers.map((e) => e.memberId.toLowerCase()),
        );
        const leftovers = memberSourceRecords.filter(
          (m) =>
            !orderedIds.has(
              (
                m["Membership Number"] ||
                m["Old Membership Number"] ||
                ""
              ).toLowerCase(),
            ),
        );

        // leftovers.sort... (could sort leftovers alphabetically or by customOrder if needed)

        memberSourceRecords = [...reordered, ...leftovers];
        console.log("Loaded member order from DB", memberSourceRecords.length);
      } else {
        // Migration: No order in DB, populate it from current list
        await initializeOrder(memberSourceRecords, assemblyName).catch((err) =>
          console.error("Failed to auto-initialize member order:", err),
        );
        console.log("Auto-initialized member order from current list.");
      }
    } catch (error) {
      console.error("Failed to load ordered members", error);
    }

    const sundayDate = getMostRecentSunday(new Date()); // Use the helper function
    const formattedDate = formatDateDDMMMYYYY(sundayDate);
    const newDescription = `Tithe for ${formattedDate}`;

    const freshTitheList = createTitheList(
      memberSourceRecords,
      concatenationConfig,
      sundayDate, // Use sundayDate here
      newDescription,
      amountMappingColumn,
    ).map((record, index) => ({
      ...record,
      "Transaction Amount": "",
      "No.": index + 1 // Ensure No. is reset
    }));

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

  const handleDeleteFavorite = (favId: string) => {
    setFavToDeleteId(favId);
    deleteFavoriteModal.open()
  };

  const confirmDeleteFavorite = () => {
    if (!favToDeleteId) return;
    favoritesHook.deleteFavorite(favToDeleteId);
    deleteFavoriteModal.close();
    setFavToDeleteId(null);
  };

  const updateFavoriteName = (favId: string, newName: string) => {
    favoritesHook.updateFavoriteName(favId, newName);
  };

  const viewFavoriteDetails = (fav: FavoriteConfig) => {
    setSelectedFavoriteForDetails(fav);
    favoriteDetailsModal.open()
  };

  const handleConfirmClearWorkspace = () => {
    clearWorkspace();
    addToast("Workspace cleared.", "info");
    clearWorkspaceModal.close();
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

      // Sync new member to order service
      const updatedAssemblyData = [...(memberDatabase[currentAssembly]?.data || []), enrichedMember];
      syncWithMasterList(updatedAssemblyData, currentAssembly).catch(err =>
        console.error("Failed to sync new member to order service:", err)
      );

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
    // Use the workspace's selected date, not today's date
    const formattedDate = formatDateDDMMMYYYY(selectedDate);

    const newTitheRecord = createTitheList(
      [member],
      concatenationConfig,
      selectedDate,
      descriptionText || `Tithe for ${formattedDate}`,
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

    // Update member in database using context
    updateMember(member, assemblyName);

    // Also update the tithe list if this member is in it
    setTitheListData((prev) =>
      prev.map((record) => {
        if (
          record["Membership Number"] === (member["Membership Number"] || member["Old Membership Number"])
        ) {
          return {
            ...record,
            "Membership Number": member["Membership Number"] || member["Old Membership Number"] || record["Membership Number"],
          };
        }
        return record;
      }),
    );

    editMember.close();
    setMemberToEdit(null);
  };

  const openAddMemberToListModal = (crossAssembly: boolean = false) => {
    if (!currentAssembly) {
      addToast("An assembly must be active to add a member.", "warning");
      return;
    }
    setIsCrossAssemblySearch(crossAssembly);
    setIsAddNewMemberModalOpen(true);
  };

  const handleResolveConflict = (resolution: "use_new" | "keep_existing") => {
    if (!reconciliationReport) return;

    const { conflicts, newMembers, changedMembers } = reconciliationReport;
    const assembly = currentAssembly || ""; // Should be set during upload context

    if (!assembly) {
      addToast("Error: Could not determine assembly context.", "error");
      return;
    }

    const prevAssemblyData = memberDatabase[assembly]?.data || [];
    let updatedData = [...prevAssemblyData];

    // 1. Apply Changes (Non-conflicting)
    if (changedMembers.length > 0) {
      const changesMap = new Map(
        changedMembers.map((c) => [c.oldRecord, c]),
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
        conflicts.map((c) => [c.existingMember, c]),
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
          } else {
            // Keep existing, do nothing
            return member;
          }
        }
        return member;
      });
    }

    // 3. Append New Members
    if (newMembers.length > 0) {
      updatedData = [...updatedData, ...newMembers];
    }

    setMemberDatabase((prev) => ({
      ...prev,
      [assembly]: {
        ...(prev[assembly] || {
          lastUpdated: Date.now(),
        }),
        data: updatedData,
        lastUpdated: Date.now(),
        fileName: reconciliationReport.previousFileDate.includes("updated")
          ? prev[assembly].fileName
          : "Mixed Source",
      },
    }));

    // Sync with Member Order Service
    syncWithMasterList(updatedData, assembly).catch((err) =>
      console.error("Failed to sync member order after reconciliation:", err),
    );

    setIsReconciliationModalOpen(false);
    setReconciliationReport(null);
    addToast(
      `Reconciliation complete. Resolved ${conflicts.length} conflicts using "${resolution === "use_new" ? "New File" : "Existing Database"}".`,
      "success",
    );
  };

  const handleImageVerificationConfirm = (verifiedData: TitheRecordB[]) => {
    setTitheListData((prev) => [...prev, ...verifiedData]);
    setSoulsWonCount((prev) => (prev || 0) + verifiedData.length);
    addToast(`Added ${verifiedData.length} records from image.`, "success");
    setIsImageVerificationModalOpen(false);
    navigate("/processor");
    setHasUnsavedChanges(true);
  };


  return (
    <div className={`app-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""}${isMobileSidebarOpen ? " sidebar-open" : ""}`}>
      <div className="app-container-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
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
        touchHandlers={sidebarSwipeHandlers}
      />

      <div className="main-content pb-safe-bottom md:pb-0">
        <MobileHeader
          onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          title={currentAssembly ? `${currentAssembly} Assembly` : "TACTMS"}
          globalNotifications={globalNotifications}
          accentColor={accentColor}
        />

        <DesktopNotifications globalNotifications={globalNotifications} accentColor={accentColor} />

        <main className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          <ErrorBoundary showRetry onError={(e) => console.error('[App] Section crashed:', e)}>
            <Outlet
              context={{
                transactionLog,
                memberDatabase,
                favorites,
                onStartNewWeek: appActions.members.startNewWeek,
                userProfile: driveUserProfile,
                onUploadFile: handleFileAccepted,
                onScanImage: async (file: File, assemblyName?: string, month?: string, week?: string) => {
                  // Use provided assembly name or fall back to current context
                  const targetAssembly = assemblyName || currentAssembly;

                  if (!targetAssembly) {
                    addToast("Please select an assembly first.", "warning");
                    return;
                  }

                  // If a specific assembly was selected (and it's different), update the context
                  if (assemblyName && assemblyName !== currentAssembly) {
                    setCurrentAssembly(assemblyName);
                    // Note: We don't necessarily need to "startNewWeek" here if we just want to add to existing data
                    // But if we want to ensure the view updates, setting currentAssembly is key.
                  }

                  const masterList = memberDatabase[targetAssembly];
                  if (!masterList || !masterList.data) {
                    addToast(`No member data found for ${targetAssembly} Assembly.`, "warning");
                    return;
                  }

                  setIsImageScanning(true);
                  // Generate a date string for the transaction
                  const currentYear = new Date().getFullYear();
                  let dateString = "";
                  let targetDateObj = new Date();

                  if (month && week) {
                    targetDateObj = calculateSundayDate(month, week, currentYear);
                    dateString = formatDateDDMMMYYYY(targetDateObj);

                    // Update App State for Persistence
                    setSelectedDate(targetDateObj);
                    setFileNameToSave(`${targetAssembly.toUpperCase()}-${dateString}-TITHERS`);
                  } else {
                    targetDateObj = selectedDate;
                    dateString = formatDateDDMMMYYYY(selectedDate);
                  }

                  try {
                    const result = await analyzeImage(file, month, week, dateString, masterList.data);
                    if (result) {
                      setExtractedTitheData(result.entries);
                      // Store notebook format info
                      setIsNotebookFormat(result.isNotebookFormat ?? false);
                      setNotebookMetadata(result.notebookMetadata);
                      // Ensure we use the master data for the TARGET assembly
                      setImageVerificationMasterData(masterList.data);
                      setIsImageVerificationModalOpen(true);
                    }
                  } finally {
                    setIsImageScanning(false);
                  }
                },
                // Processor Props
                uploadedFile,
                originalData,
                processedDataA,
                setProcessedDataA,
                favoritesSearchTerm,
                setFavoritesSearchTerm,
                loadFavorite: appActions.favorites.loadFavorite,
                deleteFavorite: handleDeleteFavorite,
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
                  setIsCreateTitheListModalOpen(true); // TODO: move into useModalsPhase2 later
                },
                onEditMember: (member: MemberRecordA, assemblyName: string) => {
                  setMemberToEdit({ member, assemblyName });
                  editMember.open({ target: memberToEdit! });
                },
                onDeleteAssembly: appActions.members.handleDeleteAssembly,
                onAddAssembly: (assemblyName: string) => {
                  if (memberDatabase[assemblyName]) {
                    addToast(`Assembly "${assemblyName}" already exists.`, "warning");
                    return;
                  }
                  // Add to memberDatabase
                  setMemberDatabase((prev) => ({
                    ...prev,
                    [assemblyName]: {
                      data: [],
                      lastUpdated: Date.now(),
                      fileName: "",
                    },
                  }));
                  // Also add to AppConfigContext so it appears in dropdowns
                  addAssembly(assemblyName);
                  addToast(`Assembly "${assemblyName}" created. Upload a master list to populate it.`, "success");
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
                handleDownloadExcel: appActions.download.handleDownloadExcel,
                openSaveFavoriteModal: () => saveFavorite.open(),
                onClearWorkspace: () => clearWorkspaceModal.open(),
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
                handleApplyAgeFilter: appActions.titheProcessing.handleApplyAgeFilter,
                handleRemoveAgeFilter: appActions.titheProcessing.handleRemoveAgeFilter,
                concatenationConfig,
                handleConcatenationConfigChange: appActions.titheProcessing.handleConcatenationConfigChange,
                descriptionText,
                handleDescriptionChange: appActions.titheProcessing.handleDescriptionChange,
                amountMappingColumn,
                setAmountMappingColumn,
                theme,
                setTheme,
                accentColor,
                setAccentColor,
                isSubscribed,
                requestNotificationPermission,
                onDateChange: appActions.titheProcessing.handleDateChange,
              }}
            />
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onMenuClick={() => setIsMobileSidebarOpen(true)} />
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveView={(view) => navigate(view === "dashboard" ? "/" : `/${view}`)}
        setTheme={setTheme}
        onStartNewWeek={startNewWeek}
        favorites={favorites}
        theme={theme}
      />




      <Toaster richColors theme={theme} />

      {
        fullPreview.isOpen && (
          <FullTithePreviewModal
            isOpen={fullPreview.isOpen}
            onClose={() => fullPreview.close()}
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
        )
      }

      {
        isAmountEntryModalOpen && (
          <AmountEntryModal
            isOpen={isAmountEntryModalOpen}
            onClose={() => setIsAmountEntryModalOpen(false)}
            titheListData={titheListData}
            onSave={handleSaveFromPreview}
            openAddMemberToListModal={() => openAddMemberToListModal(true)}
          />
        )
      }

      {
        isAddNewMemberModalOpen && (
          <AddNewMemberModal
            isOpen={isAddNewMemberModalOpen}
            onClose={() => {
              setIsAddNewMemberModalOpen(false);
              setIsCrossAssemblySearch(false);
            }}
            onConfirm={handleAddNewMemberToList}
            onAddExistingMember={handleAddExistingMemberToList}
            currentAssembly={currentAssembly}
            memberDatabase={
              currentAssembly ? memberDatabase[currentAssembly]?.data || [] : []
            }
            titheListData={titheListData}
            fullMemberDatabase={memberDatabase}
            crossAssemblySearch={isCrossAssemblySearch}
          />
        )
      }

      {
        isCreateTitheListModalOpen && (
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
        )
      }
      {
        saveFavorite.isOpen && (
          <Modal
            isOpen={saveFavorite.isOpen}
            onClose={() => saveFavorite.close()}
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
                onClick={() => saveFavorite.close()}
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
        )
      }
      {
        deleteFavoriteModal.isOpen && (
          <Modal
            isOpen={deleteFavoriteModal.isOpen}
            onClose={() => deleteFavoriteModal.close()}
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
                onClick={() => deleteFavoriteModal.close()}
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
        )
      }
      {
        selectedFavoriteForDetails && (
          <Modal
            isOpen={favoriteDetailsModal.isOpen}
            onClose={() => favoriteDetailsModal.close()}
            title={`Details for "${selectedFavoriteForDetails.name}"`}
            size="lg"
          >
            <pre className="text-xs bg-[var(--bg-elevated)] p-4 rounded-md max-h-96 overflow-auto">
              {JSON.stringify(selectedFavoriteForDetails, null, 2)}
            </pre>
          </Modal>
        )
      }
      {
        isAssemblySelectionModalOpen && pendingData && (
          <AssemblySelectionModal
            isOpen={isAssemblySelectionModalOpen}
            onClose={() => setIsAssemblySelectionModalOpen(false)}
            onConfirm={handleConfirmAssemblySelection}
            fileName={pendingData.fileName}
            suggestedAssembly={pendingData.suggestedAssembly}
          />
        )
      }
      {
        _reconciliation.isOpen && _reconciliation.report && (
          <MembershipReconciliationModal
            isOpen={_reconciliation.isOpen}
            onClose={() => _reconciliation.close()}
            report={_reconciliation.report}
            onResolveConflict={(_, resolution) => handleResolveConflict(resolution === "new" ? "use_new" : "keep_existing")}
          />
        )
      }
      {
        clearWorkspaceModal.isOpen && (
          <ClearWorkspaceModal
            isOpen={clearWorkspaceModal.isOpen}
            onClose={() => clearWorkspaceModal.close()}
            onConfirm={handleConfirmClearWorkspace}
          />
        )
      }
      {
        updateConfirm.isOpen && (updateConfirm.payload as any)?.pending && (
          <UpdateMasterListConfirmModal
            isOpen={updateConfirm.isOpen}
            onClose={() => updateConfirm.close()}
            onConfirm={() => {
              const pending = (updateConfirm.payload as any).pending as PendingMasterListUpdate;
              handleMasterListUpdate(
                pending.assemblyName,
                pending.newData,
                pending.newFileName,
              );
              updateConfirm.close();
            }}
            existingData={memberDatabase[(updateConfirm.payload as any).pending.assemblyName]}
            pendingUpdate={(updateConfirm.payload as any).pending}
          />
        )
      }
      {
        editMember.isOpen && (editMember.payload as any)?.target && (
          <EditMemberModal
            isOpen={editMember.isOpen}
            onClose={() => editMember.close()}
            onSave={handleEditMemberInDB}
            memberData={(editMember.payload as any).target.member}
            assemblyName={(editMember.payload as any).target.assemblyName}
          />
        )
      }
      {
        isImageVerificationModalOpen && (
          <ImageVerificationModal
            isOpen={isImageVerificationModalOpen}
            onClose={() => setIsImageVerificationModalOpen(false)}
            extractedData={extractedTitheData}
            masterData={imageVerificationMasterData}
            onConfirm={handleImageVerificationConfirm}
            memberDatabase={memberDatabase}
            isNotebookFormat={isNotebookFormat}
            notebookMetadata={notebookMetadata}
          />
        )
      }

      {
        validationReport.isOpen && (
          <ValidationReportModal
            isOpen={validationReport.isOpen}
            onClose={() => validationReport.close()}
            reportContent={(validationReport.payload as any)?.content}
            isLoading={(validationReport.payload as any)?.isLoading}
          />
        )
      }

      <ParsingIndicator
        isOpen={isParsing || isImageScanning}
        message={isImageScanning ? "Processing image..." : "Parsing file..."}
        subMessage={isImageScanning ? "The AI is analyzing your tithe record..." : "This may take a moment."}
      />
    </div >
  );
};

export default App;
