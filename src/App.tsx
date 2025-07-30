
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MemberRecordA, TitheRecordB, ConcatenationConfig, FavoriteConfig, AutoSaveDraft, MembershipReconciliationReport, ViewType, MemberDatabase, TransactionLogEntry, GoogleUserProfile } from './types.ts';
import Button from './components/Button';
import { ToastContainer, ToastMessage, ToastAction } from './components/Toast';
import Modal from './components/Modal';
import {
  createTitheList,
  exportToExcel,
  filterMembersByAge,
  formatDateDDMMMYYYY,
  reconcileMembers,
  parseExcelFile
} from './services/excelProcessor.ts';
import FullTithePreviewModal from './components/FullTithePreviewModal';
import AddNewMemberModal from './components/AddNewMemberModal';
import CreateTitheListModal from './components/CreateTitheListModal';

import { Save, Trash2, BotMessageSquare } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

import Sidebar from './components/Sidebar';
import FavoritesView from './sections/FavoritesView';
import AnalyticsSection from './sections/AnalyticsSection';
import ReportsSection from './sections/ReportsSection';
import MemberDatabaseSection from './components/MemberDatabaseSection';
import { useGoogleDriveSync } from './hooks/useGoogleDriveSync.ts';

import { 
  DEFAULT_CONCAT_CONFIG, AUTO_SAVE_KEY, AUTO_SAVE_DEBOUNCE_TIME, ITEMS_PER_FULL_PREVIEW_PAGE,
  APP_THEME_STORAGE_KEY, DEFAULT_CONCAT_CONFIG_STORAGE_KEY, ASSEMBLIES, THEME_OPTIONS, APP_ACCENT_COLOR_KEY,
  MEMBER_DATABASE_STORAGE_KEY
} from './constants.ts';
import DataEntryModal from './components/DataEntryModal';
import AssemblySelectionModal from './components/AssemblySelectionModal';
import { MembershipReconciliationModal } from './components/MembershipReconciliationModal';
import EmptyState from './components/EmptyState';
import ClearWorkspaceModal from './components/ClearWorkspaceModal';
import UpdateMasterListConfirmModal from './components/UpdateMasterListConfirmModal';
import EditMemberModal from './components/EditMemberModal';
import MobileHeader from './components/MobileHeader';
import ValidationReportModal from './components/ValidationReportModal';
import DashboardSection from './sections/DashboardSection';
import CommandPalette from './components/CommandPalette';
import ListOverviewActionsSection from './sections/ListOverviewActionsSection';
import ConfigurationSection from './sections/ConfigurationSection';


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

const MotionDiv = motion.div;

const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalData, setOriginalData] = useState<MemberRecordA[]>([]);
  const [processedDataA, setProcessedDataA] = useState<MemberRecordA[]>([]);
  const [titheListData, setTitheListData] = useState<TitheRecordB[]>([]);
  
  const [appError, setAppError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<{ [key: string]: string }>({});

  const [reconciliationReport, setReconciliationReport] = useState<MembershipReconciliationReport | null>(null);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [soulsWonCount, setSoulsWonCount] = useState<number | null>(0);

  const [ageRangeMin, setAgeRangeMin] = useState<string>('');
  const [ageRangeMax, setAgeRangeMax] = useState<string>('');
  const [isAgeFilterActive, setIsAgeFilterActive] = useState(false);

  const [concatenationConfig, setConcatenationConfig] = useState<ConcatenationConfig>(() => {
    const savedConfig = localStorage.getItem(DEFAULT_CONCAT_CONFIG_STORAGE_KEY);
    return savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONCAT_CONFIG;
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [descriptionText, setDescriptionText] = useState<string>('Tithe');
  const [amountMappingColumn, setAmountMappingColumn] = useState<string | null>(null);
  
  const [fileNameToSave, setFileNameToSave] = useState('GeneratedTitheList');

  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  
  const [favoritesSearchTerm, setFavoritesSearchTerm] = useState('');
  const [isFavDetailsModalOpen, setIsFavDetailsModalOpen] = useState(false);
  const [selectedFavoriteForDetails, setSelectedFavoriteForDetails] = useState<FavoriteConfig | null>(null);
  const [isDeleteFavConfirmModalOpen, setIsDeleteFavConfirmModalOpen] = useState(false);
  const [favToDeleteId, setFavToDeleteId] = useState<string | null>(null);
  
  const [isFullPreviewModalOpen, setIsFullPreviewModalOpen] = useState(false);
  const [isDataEntryModalOpen, setIsDataEntryModalOpen] = useState(false);
  const [isAddNewMemberModalOpen, setIsAddNewMemberModalOpen] = useState(false);
  const [isCreateTitheListModalOpen, setIsCreateTitheListModalOpen] = useState(false);
  const [pendingTitheListMembers, setPendingTitheListMembers] = useState<MemberRecordA[] | null>(null);
  const [pendingTitheListAssembly, setPendingTitheListAssembly] = useState<string | null>(null);

  const [fullPreviewSearchTerm, setFullPreviewSearchTerm] = useState('');
  const [fullPreviewSortConfig, setFullPreviewSortConfig] = useState<{key: keyof TitheRecordB, direction: 'asc'|'desc'} | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const storedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY) as 'dark' | 'light' | null;
    return storedTheme || 'dark';
  });
  
  const [accentColor, setAccentColor] = useState(() => {
    const storedColorKey = localStorage.getItem(APP_ACCENT_COLOR_KEY);
    return THEME_OPTIONS.find(t => t.key === storedColorKey) || THEME_OPTIONS[0];
  });

  const [isSaveFavoriteModalOpen, setIsSaveFavoriteModalOpen] = useState(false);
  const [favoriteNameInput, setFavoriteNameInput] = useState('');
  
  const autoSaveTimerRef = useRef<number | null>(null);
  const listOverviewRef = useRef<HTMLElement>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 768);
  
  const [currentAssembly, setCurrentAssembly] = useState<string | null>(null);
  const [isAssemblySelectionModalOpen, setIsAssemblySelectionModalOpen] = useState(false);
  const [pendingData, setPendingData] = useState<PendingData | null>(null);

  const [isClearWorkspaceModalOpen, setIsClearWorkspaceModalOpen] = useState(false);

  const [memberDatabase, setMemberDatabase] = useState<MemberDatabase>(() => {
    const saved = localStorage.getItem(MEMBER_DATABASE_STORAGE_KEY);
    if (!saved) return {};
    try {
        const parsed = JSON.parse(saved);
        // Migration logic for old structure to new structure with metadata
        Object.keys(parsed).forEach(key => {
            if (Array.isArray(parsed[key])) { // This detects the old format: MemberRecordA[]
                parsed[key] = {
                    data: parsed[key],
                    lastUpdated: new Date(0).getTime(), // Use epoch for clearly migrated data
                    fileName: 'Unknown (migrated data)'
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

  const [pendingUpdate, setPendingUpdate] = useState<PendingMasterListUpdate | null>(null);
  const [isUpdateConfirmModalOpen, setIsUpdateConfirmModalOpen] = useState(false);

  // State for editing members in the database
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<{member: MemberRecordA, assemblyName: string} | null>(null);
  
  // State for AI Validation Report
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationReportContent, setValidationReportContent] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsCommandPaletteOpen(p => !p);
        } else if (e.key === 'Escape' && isCommandPaletteOpen) {
            setIsCommandPaletteOpen(false);
        }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isCommandPaletteOpen]);


  const addToast = useCallback((message: string, type: ToastMessage['type'], duration?: number, actions?: ToastAction[]) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prevToasts => [...prevToasts, { id, message, type, duration, actions }]);
  }, []);

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

  const dismissToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(theme === 'light' ? 'light-theme' : 'dark-theme');
    localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(MEMBER_DATABASE_STORAGE_KEY, JSON.stringify(memberDatabase));
  }, [memberDatabase]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-hue', accentColor.values.h.toString());
    root.style.setProperty('--primary-saturation', `${accentColor.values.s}%`);
    root.style.setProperty('--primary-lightness', `${accentColor.values.l}%`);
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
    setAppError(null);
    setInputErrors({});
    setAgeRangeMin(''); setAgeRangeMax(''); setIsAgeFilterActive(false);
    setSelectedDate(new Date()); setDescriptionText('Tithe');
    setFileNameToSave('GeneratedTitheList');
    setHasUnsavedChanges(false);
    clearAutoSaveDraft();
    setCurrentAssembly(null);
    setSoulsWonCount(0);
    setReconciliationReport(null);
    setAmountMappingColumn(null);
  }, [clearAutoSaveDraft]);

  const handleDateChange = useCallback((date: Date) => {
    const isSameDay = new Date(date).setHours(0,0,0,0) === new Date(selectedDate).setHours(0,0,0,0);
    if (isSameDay) {
        return;
    }

    if (currentAssembly) {
        const startOfDay = new Date(date).setHours(0,0,0,0);
        const logsForDay = transactionLog
            .filter(log => {
                if (log.assemblyName !== currentAssembly) return false;
                const logDate = new Date(log.selectedDate).setHours(0,0,0,0);
                return logDate === startOfDay;
            })
            .sort((a,b) => b.timestamp - a.timestamp);
        
        const latestLogForDate = logsForDay[0];

        if (latestLogForDate && latestLogForDate.titheListData) {
            addToast(`Loading saved record for ${formatDateDDMMMYYYY(date)}.`, 'info', 3000);
            
            setTitheListData(latestLogForDate.titheListData);
            setConcatenationConfig(latestLogForDate.concatenationConfig);
            setDescriptionText(latestLogForDate.descriptionText);
            setAmountMappingColumn(latestLogForDate.amountMappingColumn);
            setSoulsWonCount(latestLogForDate.soulsWonCount);
            setSelectedDate(new Date(latestLogForDate.selectedDate));

            setOriginalData([]);
            setProcessedDataA([]);
            setAgeRangeMin('');
            setAgeRangeMax('');
            setIsAgeFilterActive(false);
            setUploadedFile(new File([], `Record from ${formatDateDDMMMYYYY(new Date(latestLogForDate.selectedDate))}`, { type: 'text/plain' }));
            setFileNameToSave(`${latestLogForDate.assemblyName}-TitheList-${formatDateDDMMMYYYY(new Date(latestLogForDate.selectedDate))}`);

            setHasUnsavedChanges(false);
            clearAutoSaveDraft();
            return;
        }
    }

    // If no log found, prepare the current list for the new date by resetting amounts.
    setSelectedDate(date);
    if (titheListData.length > 0) {
        const formattedDate = formatDateDDMMMYYYY(date);
        const newDescription = descriptionText.replace(/{DD-MMM-YYYY}/gi, formattedDate);

        const freshList = titheListData.map(record => ({
            ...record,
            'Transaction Amount': '', // Reset amount for the new date
            'Transaction Date (\'DD-MMM-YYYY\')': formattedDate,
            'Narration/Description': newDescription,
        }));
        
        setTitheListData(freshList);
        setSoulsWonCount(0); // Reset souls won for the new period
        setHasUnsavedChanges(true); // Mark as unsaved
    }
    
    if (currentAssembly) {
        const newFileName = `${currentAssembly}-TitheList-${formatDateDDMMMYYYY(date)}`;
        setFileNameToSave(newFileName);
    }
  }, [
    currentAssembly, selectedDate, transactionLog, addToast, 
    descriptionText, titheListData, clearAutoSaveDraft
  ]);


  const handleDescriptionChange = useCallback((text: string) => {
    setDescriptionText(text);
    if (titheListData.length > 0) {
      setTitheListData(createTitheList(processedDataA, concatenationConfig, selectedDate, text, amountMappingColumn));
      setHasUnsavedChanges(true);
    }
  }, [titheListData.length, processedDataA, concatenationConfig, selectedDate, amountMappingColumn]);

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) {
            setIsSidebarCollapsed(true);
        } else {
            setIsSidebarCollapsed(false);
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const restoreDraft = useCallback((draft: AutoSaveDraft) => {
    setTitheListData(draft.titheListData || []);
    setSelectedDate(new Date(draft.selectedDate));
    setDescriptionText(draft.descriptionText);
    setConcatenationConfig(draft.concatenationConfig);
    setAgeRangeMin(draft.ageRangeMin);
    setAgeRangeMax(draft.ageRangeMax);
    setFileNameToSave(draft.fileNameToSave);
    setAmountMappingColumn(draft.amountMappingColumn);
    setCurrentAssembly(draft.assemblyName);
    setSoulsWonCount(draft.soulsWonCount);
    addToast("Restored your auto-saved draft.", "info");
    
    // Attempt to find original file name from a favorite if draft doesn't have it
    const matchingFavorite = favorites.find(f => f.assemblyName === draft.assemblyName);
    const fileName = draft.uploadedFileName || matchingFavorite?.originalFileName || "Previously Uploaded File";
    setUploadedFile(new File([], fileName));
  }, [addToast, favorites]);

  const saveDraft = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      if (titheListData.length === 0 || !currentAssembly) return;
      const draft: AutoSaveDraft = {
        timestamp: Date.now(),
        titheListData, selectedDate: selectedDate.toISOString(),
        descriptionText, concatenationConfig, ageRangeMin, ageRangeMax,
        fileNameToSave, amountMappingColumn,
        uploadedFileName: uploadedFile?.name,
        originalDataRecordCount: originalData.length,
        processedDataARecordCount: processedDataA.length,
        assemblyName: currentAssembly,
        soulsWonCount
      };
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
      setHasUnsavedChanges(false);
      addToast("Draft auto-saved!", "success", 2000);
    }, AUTO_SAVE_DEBOUNCE_TIME);
  }, [
    titheListData, selectedDate, descriptionText, concatenationConfig,
    ageRangeMin, ageRangeMax, fileNameToSave, amountMappingColumn,
    uploadedFile, originalData.length, processedDataA.length, currentAssembly,
    soulsWonCount, addToast
  ]);
  
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

  const handleFileAccepted = useCallback(async (file: File | null, isMasterList: boolean, assemblyName?: string) => {
    if (!file) {
      if (isMasterList) return;
      setUploadedFile(null);
      setOriginalData([]); 
      setProcessedDataA([]);
      clearWorkspace();
      return;
    }
    setUploadedFile(file);
    
    setIsParsing(true);
    setAppError(null);

    try {
        const parsedData = await parseExcelFile(file);
        
        if (isMasterList) {
           if(assemblyName){
              const existingData = memberDatabase[assemblyName];
              if (existingData && existingData.data.length > 0) {
                  setPendingUpdate({ assemblyName, newData: parsedData, newFileName: file.name });
                  setIsUpdateConfirmModalOpen(true);
              } else {
                  handleMasterListUpdate(assemblyName, parsedData, file.name);
              }
           }
        } else {
          if (hasUnsavedChanges) {
              addToast("You have unsaved changes. Please save or discard them before loading a new file.", "warning", 5000);
              setIsParsing(false);
              return;
          }

          const detectedAssembly = ASSEMBLIES.find(name => file.name.toLowerCase().includes(name.toLowerCase())) || '';
          
          setPendingData({ data: parsedData, fileName: file.name, file, suggestedAssembly: detectedAssembly, isMasterList: false });
          setIsAssemblySelectionModalOpen(true);
        }

    } catch (e: any) {
      const errorMessage = e.message || 'An unknown error occurred during parsing.';
      setAppError(`Error parsing file: ${errorMessage}`);
      addToast(`Error parsing file: ${errorMessage}`, 'error', 5000);
    } finally {
        setIsParsing(false);
    }
  }, [hasUnsavedChanges, addToast, memberDatabase, clearWorkspace]);
  
  const handleMasterListUpdate = (assemblyName: string, newData: MemberRecordA[], newFileName: string) => {
    setMemberDatabase(prev => ({
        ...prev,
        [assemblyName]: {
            data: newData,
            lastUpdated: Date.now(),
            fileName: newFileName,
        }
    }));
    addToast(`${assemblyName} master list has been updated with ${newData.length} records.`, 'success');
  }

  const handleConfirmAssemblySelection = useCallback(async (assembly: string) => {
    if (!pendingData) return;
    
    clearWorkspace();
    setUploadedFile(pendingData.file);
    setAppError(null);
    setCurrentAssembly(assembly);
    
    processData(pendingData.data, assembly, pendingData.file.name);

    setActiveView('processor');
    setIsAssemblySelectionModalOpen(false);
    setPendingData(null);
  }, [pendingData, clearWorkspace]);
  
  const processData = (data: MemberRecordA[], assembly: string, sourceFileName: string) => {
    setOriginalData(data);

    const masterList = memberDatabase[assembly];
    if (masterList?.data) {
        const report = reconcileMembers(data, masterList.data);
        
        if (report.newMembers.length > 0) {
            const now = new Date().toISOString();
            
            const enrichedNewMembers = report.newMembers.map(member => ({
                ...member,
                firstSeenDate: now,
                firstSeenSource: sourceFileName,
            }));

            setMemberDatabase(prev => {
                const updatedData = [...(prev[assembly]?.data || []), ...enrichedNewMembers];
                return {
                    ...prev,
                    [assembly]: {
                        ...(prev[assembly] || { fileName: 'Initial Data', lastUpdated: Date.now() }),
                        data: updatedData,
                        lastUpdated: Date.now(),
                    }
                };
            });
            
            setReconciliationReport({
                ...report,
                newMembers: enrichedNewMembers,
                previousFileDate: `Master List (updated ${new Date(masterList.lastUpdated).toLocaleDateString()})`
            });
            setSoulsWonCount(report.newMembers.length);
            setIsReconciliationModalOpen(true);

        } else if(report.missingMembers.length > 0){
             setReconciliationReport({
                ...report,
                newMembers: [],
                previousFileDate: `Master List (updated ${new Date(masterList.lastUpdated).toLocaleDateString()})`
            });
            setIsReconciliationModalOpen(true);
            setSoulsWonCount(0);
        } else {
             setSoulsWonCount(0);
        }

    } else {
        setSoulsWonCount(data.length);
        addToast(`${data.length} members added as the first master list for ${assembly}.`, 'success');
        const now = new Date().toISOString();
        const enrichedData = data.map(member => ({
            ...member,
            firstSeenDate: now,
            firstSeenSource: sourceFileName,
        }));
        setMemberDatabase(prev => ({
            ...prev,
            [assembly]: {
                data: enrichedData,
                lastUpdated: Date.now(),
                fileName: sourceFileName,
            }
        }));
    }
    
    let filteredData = data;
    if(ageRangeMin || ageRangeMax){
        filteredData = filterMembersByAge(data, Number(ageRangeMin) || undefined, Number(ageRangeMax) || undefined);
        setIsAgeFilterActive(true);
    } else {
        setIsAgeFilterActive(false);
    }

    setProcessedDataA(filteredData);
    
    const listData = createTitheList(filteredData, concatenationConfig, selectedDate, descriptionText, amountMappingColumn);

    setTitheListData(listData);
    setFileNameToSave(`${assembly}-TitheList-${formatDateDDMMMYYYY(new Date())}`);
    addToast(`${assembly} data processed. ${data.length} records loaded.`, 'success');
  }

  const handleKeepReconciliationMembers = (membersToKeep: MemberRecordA[]) => {
      const newTitheRecords = createTitheList(membersToKeep, concatenationConfig, selectedDate, descriptionText, amountMappingColumn);
      
      setTitheListData(prev => {
          const existingNos = new Set(prev.map(r => r['No.']));
          const recordsToAdd = newTitheRecords.filter(r => !existingNos.has(r['No.']));
          return [...prev, ...recordsToAdd];
      });

      setProcessedDataA(prev => [...prev, ...membersToKeep]);

      addToast(`Kept ${membersToKeep.length} missing members in the list.`, 'success');
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
    setTitheListData(createTitheList(filtered, concatenationConfig, selectedDate, descriptionText, amountMappingColumn));
    addToast(`Age filter applied. ${filtered.length} records match.`, 'info');
    setHasUnsavedChanges(true);
  }, [ageRangeMin, ageRangeMax, originalData, concatenationConfig, selectedDate, descriptionText, amountMappingColumn, addToast]);

  const handleRemoveAgeFilter = useCallback(() => {
    setAgeRangeMin('');
    setAgeRangeMax('');
    setInputErrors({});
    setProcessedDataA(originalData);
    setIsAgeFilterActive(false);
    setTitheListData(createTitheList(originalData, concatenationConfig, selectedDate, descriptionText, amountMappingColumn));
    addToast("Age filter removed.", "info");
    setHasUnsavedChanges(true);
  }, [originalData, concatenationConfig, selectedDate, descriptionText, amountMappingColumn, addToast]);


  const handleConcatenationConfigChange = (key: keyof ConcatenationConfig) => {
    setConcatenationConfig(prev => {
      const newConfig = { ...prev, [key]: !prev[key] };
      localStorage.setItem(DEFAULT_CONCAT_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
      if (originalData.length > 0) {
        setTitheListData(createTitheList(processedDataA, newConfig, selectedDate, descriptionText, amountMappingColumn));
        setHasUnsavedChanges(true);
      }
      return newConfig;
    });
  };

  const handleSaveFromPreview = (updatedList: TitheRecordB[]) => {
    setTitheListData(updatedList);
    setHasUnsavedChanges(true); // Mark the workspace as dirty
    addToast("Changes from list view have been saved to the workspace.", "success");
    setIsFullPreviewModalOpen(false);
  };
  
  const { tithersCount, totalTitheAmount, totalEntriesInList, nonTithersCount, tithersPercentage, nonTithersPercentage } = useMemo(() => {
    const totalEntries = titheListData.length;
    let tithers = 0;
    const totalAmount = titheListData.reduce((sum, record) => {
        const amount = Number(record['Transaction Amount']);
        if (!isNaN(amount) && amount > 0) {
            tithers++;
            return sum + amount;
        }
        return sum;
    }, 0);
    const nonTithers = totalEntries - tithers;
    const tithersPercent = totalEntries > 0 ? (tithers / totalEntries) * 100 : 0;
    const nonTithersPercent = totalEntries > 0 ? (nonTithers / totalEntries) * 100 : 0;

    return {
      tithersCount: tithers, 
      totalTitheAmount: totalAmount,
      totalEntriesInList: totalEntries,
      nonTithersCount: nonTithers,
      tithersPercentage: tithersPercent,
      nonTithersPercentage: nonTithersPercent
    };
  }, [titheListData]);

  const handleDownloadExcel = useCallback(() => {
    if (!fileNameToSave.trim()) {
      setInputErrors(prev => ({ ...prev, fileName: "File name is required." }));
      return;
    }
    setInputErrors(prev => ({ ...prev, fileName: '' }));

    const dataToExport = titheListData.map((record, index) => ({
        ...record,
        'No.': index + 1,
      }));

    exportToExcel(dataToExport, fileNameToSave);
    
    // Log the transaction
    if (currentAssembly && titheListData.length > 0) {
        const newLogEntry: TransactionLogEntry = {
            id: `${currentAssembly}-${selectedDate.toISOString().split('T')[0]}`,
            assemblyName: currentAssembly,
            timestamp: Date.now(),
            selectedDate: selectedDate.toISOString(),
            totalTitheAmount: totalTitheAmount,
            soulsWonCount: soulsWonCount ?? 0,
            titherCount: tithersCount,
            recordCount: totalEntriesInList,
            // Snapshot data
            titheListData: titheListData,
            concatenationConfig: concatenationConfig,
            descriptionText: descriptionText,
            amountMappingColumn: amountMappingColumn,
        };
        setTransactionLog(prevLog => {
            const existingIndex = prevLog.findIndex(log => log.id === newLogEntry.id);
            if (existingIndex > -1) {
                const updatedLog = [...prevLog];
                updatedLog[existingIndex] = newLogEntry;
                return updatedLog;
            }
            return [...prevLog, newLogEntry];
        });
        addToast("Transaction has been logged for reporting.", "info");
    }

  }, [fileNameToSave, titheListData, currentAssembly, selectedDate, totalTitheAmount, soulsWonCount, tithersCount, totalEntriesInList, setTransactionLog, addToast, concatenationConfig, descriptionText, amountMappingColumn]);
  
  const openSaveFavoriteModal = () => {
    const name = `${currentAssembly} - ${formatDateDDMMMYYYY(selectedDate)}`;
    setFavoriteNameInput(name);
    setIsSaveFavoriteModalOpen(true);
  };

  const handleSaveFavorite = () => {
    if (!favoriteNameInput.trim()) { addToast("Favorite name cannot be empty.", "error"); return; }
    if (!currentAssembly) { addToast("Cannot save favorite without an assembly.", "error"); return; }
    
    const favId = `${Date.now()}`;
    const newFavorite: FavoriteConfig = {
      id: favId,
      name: favoriteNameInput,
      timestamp: Date.now(),
      originalFileName: uploadedFile?.name || 'Manual/Database Start',
      assemblyName: currentAssembly,
      ageRangeMin: Number(ageRangeMin) || undefined,
      ageRangeMax: Number(ageRangeMax) || undefined,
      concatenationConfig,
      selectedDate: selectedDate.toISOString(),
      descriptionText,
      amountMappingColumn,
      originalData: originalData.length > 0 ? originalData : undefined,
      processedDataA: processedDataA,
      titheListData,
      soulsWonCount: soulsWonCount ?? 0,
      processedRecordsCount: processedDataA.length,
      totalTitheAmount: totalTitheAmount,
    };

    setFavorites(prev => [newFavorite, ...prev.filter(f => f.name !== newFavorite.name)]);
    addToast("Saved to favorites!", "success");
    setIsSaveFavoriteModalOpen(false);
  };
  
  const loadFavorite = useCallback((favId: string) => {
    const fav = favorites.find(f => f.id === favId);
    if (!fav) {
      addToast(`Favorite not found.`, 'error');
      return;
    }

    clearWorkspace();

    // Restore state from favorite
    setUploadedFile(fav.originalFileName ? new File([], fav.originalFileName, { type: "text/plain" }) : null);
    setOriginalData(fav.originalData || []);
    setProcessedDataA(fav.processedDataA || []);
    setTitheListData(fav.titheListData || []);
    
    setAgeRangeMin(String(fav.ageRangeMin || ''));
    setAgeRangeMax(String(fav.ageRangeMax || ''));
    setIsAgeFilterActive(!!(fav.ageRangeMin || fav.ageRangeMax));

    setConcatenationConfig(fav.concatenationConfig);
    setSelectedDate(new Date(fav.selectedDate));
    setDescriptionText(fav.descriptionText);
    setAmountMappingColumn(fav.amountMappingColumn || null);
    
    const formattedDate = formatDateDDMMMYYYY(new Date(fav.selectedDate));
    setFileNameToSave(`${fav.assemblyName}-TitheList-${formattedDate}`);
    setCurrentAssembly(fav.assemblyName);
    setSoulsWonCount(fav.soulsWonCount ?? 0);

    setHasUnsavedChanges(false);
    clearAutoSaveDraft();
    
    addToast(`Loaded favorite: "${fav.name}"`, 'success');
    setActiveView('processor');
  }, [favorites, addToast, clearWorkspace, clearAutoSaveDraft]);

  const findLatestFavorite = useCallback((assemblyName: string) => {
    return favorites
        .filter(f => f.assemblyName === assemblyName)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [favorites]);

  const startNewWeek = (assemblyName: string) => {
    const fav = findLatestFavorite(assemblyName);
    if (!fav) {
        addToast(`No saved data found for ${assemblyName}. Please upload a file first.`, 'warning');
        return;
    }

    clearWorkspace();

    const memberSourceRecords = fav.titheListData;
    if (!memberSourceRecords || memberSourceRecords.length === 0) {
        addToast(`The latest favorite for ${assemblyName} has no members.`, 'error');
        return;
    }

    const newDate = new Date(); // Today's date for the new week
    const formattedDate = formatDateDDMMMYYYY(newDate);
    const newDescription = fav.descriptionText.replace(/{DD-MMM-YYYY}/gi, formattedDate);

    const freshTitheList = memberSourceRecords.map(record => ({
        ...record,
        'Transaction Amount': '',
        'Transaction Date (\'DD-MMM-YYYY\')': formattedDate,
        'Narration/Description': newDescription,
    }));
    setTitheListData(freshTitheList);
    
    setOriginalData(fav.originalData || []);
    setProcessedDataA(fav.processedDataA || []); 
    setConcatenationConfig(fav.concatenationConfig);
    setDescriptionText(fav.descriptionText);
    setAmountMappingColumn(fav.amountMappingColumn || null);
    setCurrentAssembly(fav.assemblyName);
    if (fav.originalFileName) {
        setUploadedFile(new File([], fav.originalFileName, { type: "text/plain" }));
    }
    setFileNameToSave(`${fav.assemblyName}-TitheList-${formattedDate}`);
    
    setSoulsWonCount(0);
    setSelectedDate(newDate);
    
    setHasUnsavedChanges(false);
    clearAutoSaveDraft();

    setActiveView('processor');
    addToast(`Started new week for ${assemblyName} using the latest member list.`, 'success');
  };

  const deleteFavorite = (favId: string) => {
    setFavToDeleteId(favId);
    setIsDeleteFavConfirmModalOpen(true);
  };

  const confirmDeleteFavorite = () => {
    if (!favToDeleteId) return;
    setFavorites(prev => prev.filter(f => f.id !== favToDeleteId));
    addToast("Favorite deleted.", "success");
    setIsDeleteFavConfirmModalOpen(false);
    setFavToDeleteId(null);
  };
  
  const updateFavoriteName = (favId: string, newName: string) => {
      setFavorites(prev => prev.map(f => f.id === favId ? {...f, name: newName } : f));
  };

  const viewFavoriteDetails = (fav: FavoriteConfig) => {
    setSelectedFavoriteForDetails(fav);
    setIsFavDetailsModalOpen(true);
  };
  
  
  const handleConfirmClearWorkspace = () => {
    clearWorkspace();
    addToast("Workspace cleared.", "info");
    setIsClearWorkspaceModalOpen(false);
  };
  
  const handleAddNewMemberToList = (newMember: MemberRecordA) => {
      if (currentAssembly) {
          const enrichedMember = {
              ...newMember,
              firstSeenDate: new Date().toISOString(),
              firstSeenSource: 'manual_add'
          };

          setMemberDatabase(prev => {
              const assemblyData = prev[currentAssembly]?.data || [];
              const updatedAssemblyData = [...assemblyData, enrichedMember];
              return {
                  ...prev,
                  [currentAssembly]: {
                      ...(prev[currentAssembly] || { fileName: 'Mixed Source', lastUpdated: Date.now() }),
                      data: updatedAssemblyData,
                      lastUpdated: Date.now(),
                  }
              };
          });

          const newTitheRecord = createTitheList([enrichedMember], concatenationConfig, selectedDate, descriptionText, null)[0];
          setTitheListData(prev => [...prev, newTitheRecord]);
          setSoulsWonCount(prev => (prev || 0) + 1);
          addToast(`Added new member: ${newMember['First Name']} ${newMember.Surname}`, 'success');
          setIsAddNewMemberModalOpen(false);
      }
  };
  
  const handleAddExistingMemberToList = (member: MemberRecordA) => {
      const newTitheRecord = createTitheList([member], concatenationConfig, selectedDate, descriptionText, null)[0];
      setTitheListData(prev => [...prev, newTitheRecord]);
      addToast(`Added existing member: ${member['First Name']} ${member.Surname}`, 'success');
  }
  
  const handleCreateTitheListFromDB = (members: MemberRecordA[], assembly: string) => {
      clearWorkspace();
      setCurrentAssembly(assembly);
      setOriginalData(members);
      setProcessedDataA(members);
      const list = createTitheList(members, concatenationConfig, selectedDate, descriptionText, null);
      setTitheListData(list);
      setFileNameToSave(`${assembly}-TitheList-${formatDateDDMMMYYYY(new Date())}`);
      setActiveView('processor');
      setIsCreateTitheListModalOpen(false);
      addToast(`Created a new list with ${members.length} members from the database.`, 'success');
  };

  const handleEditMemberInDB = (member: MemberRecordA) => {
    if (!memberToEdit) return;
    const { assemblyName } = memberToEdit;

    setMemberDatabase(prev => {
        const assemblyData = prev[assemblyName]?.data || [];
        const isNewMember = String(member['No.']).startsWith('new_');
        let updatedData;

        if (isNewMember) {
            const finalNewMember = { 
                ...member, 
                'No.': assemblyData.length + 1,
                firstSeenDate: new Date().toISOString(),
                firstSeenSource: 'manual_db_add',
            };
            updatedData = [...assemblyData, finalNewMember];
            addToast(`New member added to ${assemblyName} database.`, 'success');
        } else {
            updatedData = assemblyData.map(m => {
                if (m['No.'] === member['No.']) {
                    return { ...m, ...member }; 
                }
                return m;
            });
            addToast(`Member details updated in ${assemblyName} database.`, 'success');
        }

        return {
            ...prev,
            [assemblyName]: {
                ...(prev[assemblyName] || { fileName: 'Mixed Source'}),
                data: updatedData,
                lastUpdated: Date.now(),
            }
        };
    });

    setIsEditMemberModalOpen(false);
    setMemberToEdit(null);
  };
  
  const openAddMemberToListModal = () => {
      if(!currentAssembly) {
          addToast("An assembly must be active to add a member.", "warning");
          return;
      }
      setIsAddNewMemberModalOpen(true);
  }

  const handleGenerateValidationReport = async () => {
    if (!originalData || originalData.length === 0) {
        addToast("No data to analyze. Please upload a file first.", "warning");
        return;
    }
    if (!process.env.API_KEY) {
        addToast("AI features are not configured. Please contact support.", "error");
        return;
    }

    setIsGeneratingReport(true);
    setIsValidationModalOpen(true);
    setValidationReportContent(''); // Clear previous report

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const sampleData = originalData.slice(0, 50); // Use a sample
        const prompt = `
You are a data quality analyst reviewing a church membership list. Analyze the following JSON data sample for quality issues. Provide a concise summary in markdown format. Focus on:
- Rows with missing critical information (e.g., missing phone numbers, email, membership numbers). List the row number or name if possible.
- Potential duplicates based on similar names or details.
- Inconsistent formatting (e.g., in names, phone numbers, or addresses).
- Any other logical inconsistencies you find.

Do not suggest changes, just report the issues found. Start the report with a main heading "# Data Quality Report" and a brief summary of findings, then provide details under subheadings like "## Missing Information" or "## Potential Duplicates".

Data Sample:
\`\`\`json
${JSON.stringify(sampleData, null, 2)}
\`\`\`
`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        setValidationReportContent(response.text);

    } catch (error) {
        console.error("Error generating validation report:", error);
        const errorMessage = "Sorry, I encountered an error while generating the report. Please check your connection or API configuration and try again.";
        setValidationReportContent(`# Error\n\n${errorMessage}`);
        addToast("Failed to generate AI report.", "error");
    } finally {
        setIsGeneratingReport(false);
    }
  };


  const viewTitles: Record<ViewType, string> = {
    dashboard: 'Dashboard',
    processor: 'Tithe Processor',
    database: 'Member Database',
    favorites: 'Favorites',
    reports: 'Reports',
    analytics: 'AI Analytics',
  };

  const renderContent = () => {
    switch(activeView) {
      case 'dashboard':
          return <DashboardSection 
                    setActiveView={setActiveView}
                    transactionLog={transactionLog}
                    memberDatabase={memberDatabase}
                    favorites={favorites}
                    onStartNewWeek={startNewWeek}
                    userProfile={driveUserProfile}
                    theme={theme}
                    onUploadFile={(file) => handleFileAccepted(file, false)}
                />;
      case 'processor':
        if (titheListData.length === 0 && !uploadedFile && !currentAssembly) {
          return <EmptyState 
                    setActiveView={setActiveView}
                    theme={theme}
                  />;
        }
        return (
          <div className="space-y-8">
            {isParsing ? (
                 <div className="flex flex-col items-center justify-center p-10 content-card">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                    >
                        <BotMessageSquare size={48} className="mx-auto mb-4 text-[var(--primary-accent-start)] animate-pulse"/>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                           {'Parsing your Excel file...'}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">This should only take a moment.</p>
                    </motion.div>
                </div>
            ) : !currentAssembly ? (
                <EmptyState 
                    setActiveView={setActiveView}
                    theme={theme}
                />
            ) : (
              <>
                <ListOverviewActionsSection
                  ref={listOverviewRef}
                  currentAssembly={currentAssembly} selectedDate={selectedDate}
                  currentTotalTithe={totalTitheAmount} hasUnsavedChanges={hasUnsavedChanges}
                  titheListData={titheListData} tithersCount={tithersCount} 
                  nonTithersCount={nonTithersCount}
                  tithersPercentage={tithersPercentage}
                  nonTithersPercentage={nonTithersPercentage}
                  totalEntriesInList={totalEntriesInList} 
                  setIsFullPreviewModalOpen={setIsFullPreviewModalOpen} setIsDataEntryModalOpen={setIsDataEntryModalOpen}
                  fileNameToSave={fileNameToSave} setFileNameToSave={setFileNameToSave}
                  inputErrors={inputErrors} setInputErrors={setInputErrors}
                  handleDownloadExcel={handleDownloadExcel} openSaveFavoriteModal={openSaveFavoriteModal}
                  onClearWorkspace={() => setIsClearWorkspaceModalOpen(true)}
                  transactionLog={transactionLog}
                  soulsWonCount={soulsWonCount}
                />
                <ConfigurationSection
                  ageRangeMin={ageRangeMin} setAgeRangeMin={setAgeRangeMin} ageRangeMax={ageRangeMax} setAgeRangeMax={setAgeRangeMax}
                  inputErrors={inputErrors} handleApplyAgeFilter={handleApplyAgeFilter} isAgeFilterActive={isAgeFilterActive}
                  handleRemoveAgeFilter={handleRemoveAgeFilter} isLoading={isParsing} originalData={originalData}
                  uploadedFile={uploadedFile} titheListData={titheListData} processedDataA={processedDataA}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                  concatenationConfig={concatenationConfig} handleConcatenationConfigChange={handleConcatenationConfigChange}
                  selectedDate={selectedDate} onDateChange={handleDateChange}
                  descriptionText={descriptionText} onDescriptionChange={handleDescriptionChange}
                  amountMappingColumn={amountMappingColumn} setAmountMappingColumn={setAmountMappingColumn}
                  handleGenerateValidationReport={handleGenerateValidationReport}
                  isGeneratingReport={isGeneratingReport}
                />
              </>
            )}
          </div>
        );
      case 'favorites':
        return <FavoritesView
                  favorites={favorites}
                  favoritesSearchTerm={favoritesSearchTerm} setFavoritesSearchTerm={setFavoritesSearchTerm}
                  loadFavorite={loadFavorite}
                  deleteFavorite={deleteFavorite} viewFavoriteDetails={viewFavoriteDetails}
                  updateFavoriteName={updateFavoriteName} addToast={addToast}
                />;
      case 'analytics':
        return <AnalyticsSection
                  titheListData={titheListData} currentAssembly={currentAssembly} selectedDate={selectedDate}
                  addToast={addToast} tithersCount={tithersCount} nonTithersCount={totalEntriesInList - tithersCount} totalAmount={totalTitheAmount}
                  reconciliationReport={reconciliationReport}
               />;
      case 'reports':
          return <ReportsSection transactionLog={transactionLog} memberDatabase={memberDatabase} />;
      case 'database':
        return <MemberDatabaseSection 
                 memberDatabase={memberDatabase} 
                 onUploadMasterList={(file, isMasterList, assemblyName) => handleFileAccepted(file, isMasterList, assemblyName)}
                 onCreateTitheList={(selectedMembers, assemblyName) => {
                     setPendingTitheListMembers(selectedMembers);
                     setPendingTitheListAssembly(assemblyName);
                     setIsCreateTitheListModalOpen(true);
                 }}
                 onEditMember={(member, assemblyName) => {
                    setMemberToEdit({ member, assemblyName });
                    setIsEditMemberModalOpen(true);
                 }}
                 addToast={addToast}
                />;
      default:
        return <div>Unknown view</div>;
    }
  }
  

  return (
    <div className={`app-container ${!isSidebarCollapsed && window.innerWidth < 768 ? 'sidebar-open' : ''}`}>
        <Sidebar 
            activeView={activeView} setActiveView={setActiveView}
            theme={theme} setTheme={setTheme}
            accentColor={accentColor} setAccentColor={setAccentColor}
            isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed}
            isLoggedIn={isDriveLoggedIn} userProfile={driveUserProfile} syncStatus={driveSyncStatus}
            signIn={driveSignIn} signOut={driveSignOut}
            isConfigured={isDriveConfigured}
            openCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
        <AnimatePresence>
            {isCommandPaletteOpen && (
                <CommandPalette
                    isOpen={isCommandPaletteOpen}
                    onClose={() => setIsCommandPaletteOpen(false)}
                    setActiveView={setActiveView}
                    setTheme={setTheme}
                    onStartNewWeek={startNewWeek}
                    favorites={favorites}
                    theme={theme}
                />
            )}
        </AnimatePresence>
        <div className="app-container-overlay" onClick={() => setIsSidebarCollapsed(true)} />
        <main className="main-content">
            <MobileHeader 
                onMenuClick={() => setIsSidebarCollapsed(false)}
                title={viewTitles[activeView]}
            />
            <AnimatePresence mode="wait">
              <MotionDiv
                key={activeView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderContent()}
              </MotionDiv>
            </AnimatePresence>
        </main>
        
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {isFullPreviewModalOpen && (
          <FullTithePreviewModal
            isOpen={isFullPreviewModalOpen}
            onClose={() => setIsFullPreviewModalOpen(false)}
            titheListData={titheListData}
            onSave={handleSaveFromPreview}
            itemsPerPage={ITEMS_PER_FULL_PREVIEW_PAGE}
            addToast={addToast}
            searchTerm={fullPreviewSearchTerm} setSearchTerm={setFullPreviewSearchTerm}
            sortConfig={fullPreviewSortConfig} setSortConfig={setFullPreviewSortConfig}
            openAddMemberToListModal={openAddMemberToListModal}
          />
        )}
        
        {isDataEntryModalOpen && (
            <DataEntryModal 
                isOpen={isDataEntryModalOpen}
                onClose={() => setIsDataEntryModalOpen(false)}
                titheListData={titheListData}
                onSave={(updatedList) => {
                    setTitheListData(updatedList);
                    setHasUnsavedChanges(true);
                    setIsDataEntryModalOpen(false);
                    addToast("Data entry saved to workspace.", "success");
                }}
            />
        )}

        {isAddNewMemberModalOpen && (
            <AddNewMemberModal
                isOpen={isAddNewMemberModalOpen}
                onClose={() => setIsAddNewMemberModalOpen(false)}
                onConfirm={handleAddNewMemberToList}
                onAddExistingMember={handleAddExistingMemberToList}
                currentAssembly={currentAssembly}
                memberDatabase={currentAssembly ? memberDatabase[currentAssembly]?.data || [] : []}
                titheListData={titheListData}
            />
        )}
        
        {isCreateTitheListModalOpen && (
            <CreateTitheListModal
                isOpen={isCreateTitheListModalOpen}
                onClose={() => setIsCreateTitheListModalOpen(false)}
                onConfirm={() => {
                    if (pendingTitheListMembers && pendingTitheListAssembly) {
                        handleCreateTitheListFromDB(pendingTitheListMembers, pendingTitheListAssembly);
                    }
                }}
                memberCount={pendingTitheListMembers?.length || 0}
                assemblyName={pendingTitheListAssembly || ''}
            />
        )}
        {isSaveFavoriteModalOpen && (
            <Modal isOpen={isSaveFavoriteModalOpen} onClose={() => setIsSaveFavoriteModalOpen(false)} title="Save Configuration to Favorites">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="favName" className="form-label">Favorite Name</label>
                        <input id="favName" type="text" value={favoriteNameInput} onChange={(e) => setFavoriteNameInput(e.target.value)} className="form-input-light w-full" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsSaveFavoriteModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveFavorite} leftIcon={<Save size={16}/>}>Save Favorite</Button>
                </div>
            </Modal>
        )}
        {isDeleteFavConfirmModalOpen && (
             <Modal isOpen={isDeleteFavConfirmModalOpen} onClose={() => setIsDeleteFavConfirmModalOpen(false)} title="Delete Favorite?">
                <p>Are you sure you want to delete this favorite? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsDeleteFavConfirmModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDeleteFavorite} leftIcon={<Trash2 size={16}/>}>Delete</Button>
                </div>
             </Modal>
        )}
        {selectedFavoriteForDetails && (
             <Modal isOpen={isFavDetailsModalOpen} onClose={() => setIsFavDetailsModalOpen(false)} title={`Details for "${selectedFavoriteForDetails.name}"`} size="lg">
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
                    handleMasterListUpdate(pendingUpdate.assemblyName, pendingUpdate.newData, pendingUpdate.newFileName);
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
    </div>
  );
};

export default App;
