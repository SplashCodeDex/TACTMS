import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TransactionLogEntry,
  MemberDatabase,
  FavoriteConfig,
  GoogleUserProfile,
  MasterListData,
  MemberRecordA,
  TitheRecordB,
} from "../types";
import { formatDateDDMMMYYYY } from "../lib/dataTransforms";
import { useOutletContext } from "react-router-dom";
import ChatInterface from "../components/ChatInterface";
import { useGeminiChat } from "../hooks/useGemini";
import { useModal } from "../hooks/useModal";
import {
  RecentMembersList,
  RecentActivityList,
  WeeklyTrendChart,
  DashboardStatsGrid,
  QuickActionsGrid,
  ScanAssemblyModal,
} from "../components/dashboard";
import BatchImageProcessor from "../components/BatchImageProcessor";
import { processTitheImageWithValidation } from "@/services/imageProcessor";
import { validateTitheBookImage, validateExtractedTitheData } from "@/services/imageValidator";

interface DashboardSectionProps {
  transactionLog: TransactionLogEntry[];
  memberDatabase: MemberDatabase;
  favorites: FavoriteConfig[];
  onStartNewWeek: (assemblyName: string) => void;
  userProfile: GoogleUserProfile | null;
  onUploadFile: (file: File | null, isMasterList: boolean) => void;
  onScanImage: (file: File, assemblyName?: string, month?: string, week?: string) => void;
}

const DashboardSection: React.FC = () => {
  const {
    transactionLog = [],
    memberDatabase = {},
    onStartNewWeek,
    onUploadFile,
    userProfile,
    onScanImage,
  } = useOutletContext<DashboardSectionProps>();
  const [selectedAssembly, setSelectedAssembly] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Modals
  const batchProcessor = useModal("batchProcessor");
  const scanAssemblyModal = useModal("scanAssembly");

  // Image Scan State
  const [pendingScanFile, setPendingScanFile] = useState<File | null>(null);
  const [scanAssembly, setScanAssembly] = useState("");
  const [scanMonth, setScanMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const [scanWeek, setScanWeek] = useState<string>("Week 1");

  // Handlers
  const handleBatchScanClick = () => {
    batchProcessor.open();
  };


  // Chat Integration
  const {
    chatHistory,
    chartData,
    isLoading: isChatLoading,
    error: chatError,
    initializeChat,
    sendMessage
  } = useGeminiChat(import.meta.env.VITE_GEMINI_API_KEY);

  // Initialize chat with latest data when available
  useEffect(() => {
    if (transactionLog.length > 0 || Object.keys(memberDatabase).length > 0) {
      const latestLog = transactionLog.length > 0
        ? transactionLog.sort((a, b) => b.timestamp - a.timestamp)[0]
        : null;

      const currentTitheData = latestLog ? latestLog.titheListData : [];
      const currentAssembly = latestLog ? latestLog.assemblyName : "General";

      initializeChat(currentTitheData, memberDatabase, currentAssembly);
    }
  }, [transactionLog, memberDatabase, initializeChat]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0] || null;
    if (onUploadFile) {
      onUploadFile(file, false);
    }
  };

  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const ytdTithe = transactionLog
      .filter(
        (log: TransactionLogEntry) => {
          const logDate = new Date(log.selectedDate);
          return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
        }
      )
      .reduce(
        (sum: number, log: TransactionLogEntry) => sum + log.totalTitheAmount,
        0,
      );

    let ytdSouls = 0;
    Object.values(memberDatabase).forEach((listData: MasterListData) => {
      if (listData && Array.isArray(listData.data)) {
        listData.data.forEach((member: MemberRecordA) => {
          if (member.firstSeenDate) {
            try {
              const memberDate = new Date(member.firstSeenDate);
              if (
                memberDate.getMonth() === currentMonth &&
                memberDate.getFullYear() === currentYear
              ) {
                ytdSouls++;
              }
            } catch (e) {
              /* ignore invalid dates */
            }
          }
        });
      }
    });

    const totalMembers = Object.values(memberDatabase).reduce(
      (sum: number, listData: MasterListData) => sum + (listData?.data?.length || 0),
      0,
    );

    const recentActivities = [...transactionLog]
      .sort(
        (a: TransactionLogEntry, b: TransactionLogEntry) =>
          b.timestamp - a.timestamp,
      )
      .slice(0, 20);

    return { ytdTithe, ytdSouls, totalMembers, recentActivities };
  }, [transactionLog, memberDatabase]);

  const weeklyTitheData = useMemo(() => {
    const weeks = 6;
    const today = new Date();
    const weeklyData: { [key: string]: number } = {};

    for (let i = 0; i < weeks; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 7);
      const weekLabel = `Week of ${formatDateDDMMMYYYY(date)}`;
      weeklyData[weekLabel] = 0;
    }

    transactionLog.forEach((log) => {
      const logDate = new Date(log.selectedDate);
      for (let i = 0; i < weeks; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i * 7);
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        if (logDate >= weekStart && logDate <= weekEnd) {
          const weekLabel = `Week of ${formatDateDDMMMYYYY(date)}`;
          weeklyData[weekLabel] += log.totalTitheAmount;
          break;
        }
      }
    });

    return Object.entries(weeklyData).map(([label, count]) => ({ label, count })).reverse();
  }, [transactionLog]);

  const assembliesWithData = useMemo(() => {
    return new Set(
      Object.keys(memberDatabase).filter(
        (name) => memberDatabase[name]?.data?.length > 0,
      ),
    );
  }, [memberDatabase]);

  const handleStartWeek = () => {
    if (selectedAssembly) {
      onStartNewWeek(selectedAssembly);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (onUploadFile) {
      onUploadFile(file, false);
    }
    if (event.target) event.target.value = "";
  };

  const handleScanClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setPendingScanFile(file);
      setScanAssembly(selectedAssembly || "");
      scanAssemblyModal.open({ file, assembly: selectedAssembly || "" });
    }
    if (event.target) event.target.value = "";
  };

  const handleConfirmScanAssembly = () => {
    if (!scanAssembly) {
      window.alert("Please select an assembly.");
      return;
    }
    if (!scanMonth || !scanWeek) {
      window.alert("Please select both a Target Month and Week for accurate scanning.");
      return;
    }
    scanAssemblyModal.close();
    onScanImage(pendingScanFile!, scanAssembly, scanMonth, scanWeek);
    setPendingScanFile(null);
  };

  // Batch Image Processing Handler
  const handleBatchProcess = async (
    files: File[],
    _assembly: string,
    month: string,
    week: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<TitheRecordB[]> => {
    setIsBatchProcessing(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
      const dateStr = new Date().toDateString();
      const results: TitheRecordB[] = [];

      let completed = 0;
      const total = files.length;
      for (const file of files) {
        try {
          // Pre-validate the image file before expensive OCR
          const imgValidation = await validateTitheBookImage(file);
          if (!imgValidation.isValid) {
            console.warn("Skipping invalid image:", imgValidation.errors.join("; "));
            continue;
          }

          const extraction = await processTitheImageWithValidation(
            file,
            apiKey,
            month,
            week,
            dateStr
          );

          // Validate extracted rows structurally
          const structuralValidation = validateExtractedTitheData(
            extraction.entries.map(e => ({
              Name: e["Membership Number"],
              Amount: e["Transaction Amount"],
              Confidence: e["Confidence"],
            }))
          );

          if (!structuralValidation.isValidFormat) {
            console.warn("Extracted data failed structural validation");
          }

          results.push(...extraction.entries);
          completed += 1;
          onProgress?.(completed, total);
        } catch (err) {
          console.warn("Failed to process one image in batch:", err);
        }
      }

      return results;
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const recentlyAddedMembers = useMemo(() => {
    const allMembers = Object.values(memberDatabase).flatMap(
      (listData: MasterListData) => listData?.data || [],
    );

    return allMembers
      .filter((member: MemberRecordA) => member.firstSeenDate)
      .sort((a: MemberRecordA, b: MemberRecordA) => {
        try {
          return new Date(b.firstSeenDate!).getTime() - new Date(a.firstSeenDate!).getTime();
        } catch (e) {
          return 0;
        }
      })
      .slice(0, 20);
  }, [memberDatabase]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {greeting}
          {userProfile ? `, ${userProfile.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-lg text-[var(--text-secondary)]">
          Here's your district's overview for today.
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <DashboardStatsGrid
          ytdTithe={stats.ytdTithe}
          ytdSouls={stats.ytdSouls}
          totalMembers={stats.totalMembers}
          currentMonth={currentMonth}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <QuickActionsGrid
            selectedAssembly={selectedAssembly}
            setSelectedAssembly={setSelectedAssembly}
            assembliesWithData={assembliesWithData}
            memberDatabaseEmpty={Object.keys(memberDatabase).length === 0}
            onStartWeek={handleStartWeek}
            onUploadClick={handleUploadClick}
            onScanClick={handleScanClick}
            onBatchScanClick={handleBatchScanClick}
            isDragOver={isDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            fileInputRef={fileInputRef}
            imageInputRef={imageInputRef}
            onFileChange={handleFileChange}
            onImageChange={handleImageUploadChange}
          />
        </motion.div>

        <div className="space-y-8">
          <motion.div variants={itemVariants}>
            <RecentMembersList members={recentlyAddedMembers} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <RecentActivityList activities={stats.recentActivities} />
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="lg:col-span-3">
          <WeeklyTrendChart data={weeklyTitheData} />
        </motion.div>
      </div>

      {/* Chat Interface */}
      <ChatInterface
        chatHistory={chatHistory}
        chartData={chartData}
        isLoading={isChatLoading}
        error={chatError}
        onSendMessage={sendMessage}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Assembly Selection Modal for Image Scan */}
      <ScanAssemblyModal
        isOpen={scanAssemblyModal.isOpen}
        onClose={() => {
          scanAssemblyModal.close();
          setPendingScanFile(null);
        }}
        scanAssembly={scanAssembly}
        setScanAssembly={setScanAssembly}
        scanMonth={scanMonth}
        setScanMonth={setScanMonth}
        scanWeek={scanWeek}
        setScanWeek={setScanWeek}
        assembliesWithData={assembliesWithData}
        onConfirm={handleConfirmScanAssembly}
      />

      {/* Batch Image Processor Modal */}
      <BatchImageProcessor
        isOpen={batchProcessor.isOpen}
        onClose={batchProcessor.close}
        onProcess={handleBatchProcess}
        assemblies={Array.from(assembliesWithData)}
        isProcessing={isBatchProcessing}
      />

    </motion.div>
  );
};

export default DashboardSection;
