import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TransactionLogEntry,
  MemberDatabase,
  FavoriteConfig,
  GoogleUserProfile,
  MasterListData,
  MemberRecordA,
} from "@/types";
import { formatDateDDMMMYYYY } from "@/lib/dataTransforms";
import { useOutletContext } from "react-router-dom";
import ChatInterface from "@/components/ChatInterface";
import { useGeminiChat } from "@/hooks/useGemini";
import { useModal } from "@/hooks/useModal";
import { detectSmartDate } from "@/utils/smartDateDetection";
import {
  RecentMembersList,
  RecentActivityList,
  WeeklyTrendChart,
  DashboardStatsGrid,
  QuickActionsGrid,
  ScanAssemblyModal,
} from "@/components/dashboard";
import PredictiveInsightsCard from "@/components/dashboard/PredictiveInsightsCard";

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
    userProfile,
    onScanImage,
  } = useOutletContext<DashboardSectionProps>();
  const [selectedAssembly, setSelectedAssembly] = useState("");
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Modals
  const scanAssemblyModal = useModal("scanAssembly");

  // Image Scan State
  const [pendingScanFile, setPendingScanFile] = useState<File | null>(null);
  const [scanAssembly, setScanAssembly] = useState("");
  const [scanMonth, setScanMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const [scanWeek, setScanWeek] = useState<string>("Week 1");




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
  // Initialize chat with latest data when available
  useEffect(() => {
    // Always initialize, even with empty data, so the chat works for general questions or "no data" states
    const latestLog = transactionLog.length > 0
      ? [...transactionLog].sort((a, b) => b.timestamp - a.timestamp)[0]
      : null;

    const currentTitheData = latestLog ? latestLog.titheListData : [];
    const currentAssembly = latestLog ? latestLog.assemblyName : "General";

    initializeChat(currentTitheData, memberDatabase, currentAssembly);

  }, [transactionLog, memberDatabase, initializeChat]);

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

  const handleScanClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageUploadChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setPendingScanFile(file);
      setScanAssembly(selectedAssembly || "");

      // Smart date detection from image metadata/filename
      try {
        const detected = await detectSmartDate(file);
        if (detected.month !== undefined) {
          const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
          setScanMonth(months[detected.month]);
        }
        if (detected.week) {
          setScanWeek(`Week ${detected.week}`);
        }
        console.log('[SmartDate] Auto-detected:', detected);
      } catch (e) {
        // Fallback to current month if detection fails
        console.warn('[SmartDate] Detection failed:', e);
      }

      scanAssemblyModal.open({ file, assembly: selectedAssembly || "" });
    }
    if (event.target) event.target.value = "";
  }, [selectedAssembly, scanAssemblyModal]);

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
      className="space-y-6 md:space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
          {greeting}
          {userProfile ? `, ${userProfile.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-base md:text-lg text-[var(--text-secondary)]">
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
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          <QuickActionsGrid
            selectedAssembly={selectedAssembly}
            setSelectedAssembly={setSelectedAssembly}
            assembliesWithData={assembliesWithData}
            memberDatabaseEmpty={Object.keys(memberDatabase).length === 0}
            onStartWeek={handleStartWeek}
            onScanClick={handleScanClick}
            imageInputRef={imageInputRef}
            onImageChange={handleImageUploadChange}
          />

          {/* Side-by-side: Recently Added Members & Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RecentMembersList members={recentlyAddedMembers} />
            <RecentActivityList activities={stats.recentActivities} />
          </div>
        </motion.div>

        {/* AI Predictions Card - Stretches to match left column */}
        <motion.div variants={itemVariants} className="h-full">
          <PredictiveInsightsCard
            transactionLogs={transactionLog}
            memberDatabase={memberDatabase}
            apiKey={import.meta.env.VITE_GEMINI_API_KEY}
            className="h-full"
          />
        </motion.div>

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



    </motion.div>
  );
};

export default DashboardSection;
