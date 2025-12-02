import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ListPlus,
  UploadCloud,
  User,
  Camera,
  Sparkles,
  ArrowRight,
  FilePlus
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  TransactionLogEntry,
  MemberDatabase,
  FavoriteConfig,
  GoogleUserProfile,
  MasterListData,
  MemberRecordA,
} from "../types";
import StatDisplayCard from "../components/StatDisplayCard";
import AnimatedNumber from "../components/AnimatedNumber";
import Button from "../components/Button";
import { ASSEMBLIES } from "../constants";
import { formatDateDDMMMYYYY } from "../services/excelProcessor";
import { useOutletContext } from "react-router-dom";
import BarChart from "../components/BarChart";
import ChatInterface from "../components/ChatInterface";
import { useGeminiChat } from "../hooks/useGemini";

interface DashboardSectionProps {
  transactionLog: TransactionLogEntry[];
  memberDatabase: MemberDatabase;
  favorites: FavoriteConfig[];
  onStartNewWeek: (assemblyName: string) => void;
  userProfile: GoogleUserProfile | null;
  onUploadFile: (file: File | null, isMasterList: boolean) => void;
  onScanImage: (file: File) => void;
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

  // Chat Integration
  const {
    chatHistory,
    chartData,
    isLoading: isChatLoading,
    error: chatError,
    initializeChat,
    sendMessage
  } = useGeminiChat(import.meta.env.VITE_API_KEY);

  // Initialize chat with latest data when available
  useEffect(() => {
    if (transactionLog.length > 0 || Object.keys(memberDatabase).length > 0) {
      // Get the most recent tithe list from logs if available, or empty
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
    if (file && onScanImage) {
      onScanImage(file);
    }
    if (event.target) event.target.value = "";
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

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <StatDisplayCard
          icon={<DollarSign />}
          label={`Monthly Tithe (${new Date().toLocaleString('default', { month: 'long' })})`}
          value={
            <>
              GH₵{" "}
              <AnimatedNumber
                n={stats.ytdTithe}
                formatter={(n) =>
                  n.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }
              />
            </>
          }
        />
        <StatDisplayCard
          icon={<TrendingUp />}
          label={`Monthly Souls Won`}
          value={<AnimatedNumber n={stats.ytdSouls} />}
        />
        <StatDisplayCard
          icon={<Users />}
          label="Total Members on Record"
          value={<AnimatedNumber n={stats.totalMembers} />}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.section
          variants={itemVariants}
          className="lg:col-span-2 content-card flex flex-col h-full gap-6"
        >
          <h2 className="section-heading mb-0 pb-3 border-b border-[var(--border-color)]">
            <ListPlus size={22} className="mr-3 icon-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Start New Weekly List Card */}
            <motion.div
              whileHover={{ y: -5 }}
              className="glassmorphism-card p-6 rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
              onClick={handleStartWeek}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FilePlus size={80} className="text-blue-500" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <FilePlus size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Start New Weekly List</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  Create a fresh tithe list for the current week.
                </p>
                <div className="space-y-2">
                  <Select
                    value={selectedAssembly}
                    onValueChange={setSelectedAssembly}
                    disabled={Object.keys(memberDatabase).length === 0}
                  >
                    <SelectTrigger
                      id="assembly-start-select-dash"
                      className="w-full"
                    >
                      <SelectValue placeholder="-- Select Assembly --" />
                    </SelectTrigger>
                    <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                      {ASSEMBLIES.map((assembly) => (
                        <SelectItem
                          key={assembly}
                          value={assembly}
                          disabled={!assembliesWithData.has(assembly)}
                        >
                          {assembly}{" "}
                          {assembliesWithData.has(assembly)
                            ? ""
                            : "(No member data)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="primary" className="w-full group-hover:shadow-lg transition-all" onClick={handleStartWeek} disabled={!selectedAssembly}>
                    Create List <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </motion.div>



            {/* Scan Tithe Book (AI) Card */}
            <motion.div
              whileHover={{ y: -5 }}
              className="relative p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)"
              }}
              onClick={handleScanClick}
            >
              {/* New Badge */}
              <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                NEW AI
              </div>

              <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Camera size={100} className="text-indigo-500" />
              </div>

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Camera size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Scan Tithe Book (AI)</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  Take a photo of a physical tithe book page to digitize it instantly.
                </p>
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md group-hover:shadow-lg transition-all">
                  Scan Image <Sparkles size={16} className="ml-2" />
                </Button>
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUploadChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </motion.div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
            className={`p-8 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center space-y-3 flex-grow cursor-pointer ${isDragOver
              ? "border-[var(--primary-accent-start)] bg-[var(--primary-accent-start)]/10"
              : "border-[var(--border-color)] bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-subtle-accent)]"
              }`}
            style={{ minHeight: "150px" }}
          >
            <div className={`p-4 rounded-full ${isDragOver ? "bg-[var(--primary-accent-start)]/20" : "bg-[var(--bg-elevated)]"}`}>
              <UploadCloud size={32} className={isDragOver ? "text-[var(--primary-accent-start)]" : "text-[var(--text-muted)]"} />
            </div>
            <div>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {isDragOver ? "Drop file here" : "Drag & drop files here"}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                or click to browse
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".xlsx, .xls"
            />
          </div>
        </motion.section>

        <div className="space-y-8">
          <motion.section variants={itemVariants} className="content-card">
            <h2 className="section-heading">
              <Users size={22} className="mr-3 icon-primary" />
              Recently Added Members
            </h2>
            {recentlyAddedMembers.length > 0 ? (
              <ScrollArea className="h-[200px]"> {/* Adjust height to show approx 3 items */}
                <ul className="space-y-3 pr-4">
                  {recentlyAddedMembers.map((member) => (
                    <li
                      key={member["No."]}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-card-subtle-accent)] transition-colors"
                    >
                      <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] rounded-lg flex items-center justify-center text-white">
                        <User size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                          {member["First Name"]} {member.Surname}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {member.firstSeenSource}
                          <span className="text-[var(--text-muted)] mx-1"> • </span>
                          {formatDateDDMMMYYYY(new Date(member.firstSeenDate!))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-center py-8 text-[var(--text-muted)]">
                No new members recorded recently.
              </p>
            )}
          </motion.section>

          <motion.section variants={itemVariants} className="content-card">
            <h2 className="section-heading">
              <Activity size={22} className="mr-3 icon-primary" />
              Recent Activity
            </h2>
            {stats.recentActivities.length > 0 ? (
              <ScrollArea className="h-[200px]"> {/* Adjust height to show approx 3 items */}
                <ul className="space-y-3 pr-4">
                  {stats.recentActivities.map((log) => (
                    <li
                      key={log.id + log.timestamp}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-card-subtle-accent)] transition-colors"
                    >
                      <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] rounded-lg flex items-center justify-center text-white">
                        <User size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                          {log.assemblyName} Assembly
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatDateDDMMMYYYY(new Date(log.selectedDate))}
                          <span className="text-[var(--text-muted)] mx-1"> • </span>
                          <span className="font-medium text-[var(--success-text)]">
                            GH₵ {log.totalTitheAmount.toLocaleString()}
                          </span>
                          <span className="text-[var(--text-muted)] mx-1"> • </span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {log.titherCount} Tithers
                          </span>
                          <span className="text-[var(--text-muted)] mx-1"> • </span>
                          <span className="font-medium text-[var(--accent-purple)]">
                            {log.soulsWonCount} Souls Won
                          </span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-center py-8 text-[var(--text-muted)]">
                No recent transactions logged.
              </p>
            )}
          </motion.section>
        </div>
        <motion.section
          variants={itemVariants}
          className="lg:col-span-3 content-card relative"
        >
          <h2 className="section-heading">
            <TrendingUp size={22} className="mr-3 icon-primary" />
            Weekly Tithe Trend
          </h2>
          <p className="text-sm text-center py-4 text-[var(--text-muted)]">
            Showing data for the last 6 weeks.
          </p>
          <BarChart data={weeklyTitheData} />
          {weeklyTitheData.every((d) => d.count === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-card)]/50 backdrop-blur-sm rounded-xl">
              <TrendingUp size={32} className="mb-2 opacity-50" />
              <p>No tithe data recorded recently</p>
            </div>
          )}
        </motion.section>
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
    </motion.div>
  );
};

export default DashboardSection;
