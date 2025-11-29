import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ListPlus,
  UploadCloud,
  Building2,
  User,
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

interface DashboardSectionProps {
  transactionLog: TransactionLogEntry[];
  memberDatabase: MemberDatabase;
  favorites: FavoriteConfig[];
  onStartNewWeek: (assemblyName: string) => void;
  userProfile: GoogleUserProfile | null;
  onUploadFile: (file: File | null, isMasterList: boolean) => void;
}

const DashboardSection: React.FC = () => {
  const {
    transactionLog = [],
    memberDatabase = {},
    onStartNewWeek,
    onUploadFile,
    userProfile,
  } = useOutletContext<DashboardSectionProps>();
  const [selectedAssembly, setSelectedAssembly] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    const currentYear = new Date().getFullYear();

    const ytdTithe = transactionLog
      .filter(
        (log: TransactionLogEntry) =>
          new Date(log.selectedDate).getFullYear() === currentYear,
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
              if (
                new Date(member.firstSeenDate).getFullYear() === currentYear
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
          label={`Year-to-Date Tithe (${new Date().getFullYear()})`}
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
          label={`Year-to-Date Souls Won`}
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
          className="lg:col-span-2 content-card space-y-6"
        >
          <h2 className="section-heading">
            <ListPlus size={22} className="mr-3 icon-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)] text-left space-y-4">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Start New Weekly List
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Load the latest tithe list for an assembly.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-grow">
                  <label
                    htmlFor="assembly-start-select-dash"
                    className="form-label"
                  >
                    Select Assembly
                  </label>
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
                </div>
                <Button
                  onClick={handleStartWeek}
                  disabled={!selectedAssembly}
                  leftIcon={<Building2 size={16} />}
                >
                  Start
                </Button>
              </div>
            </div>
            <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)] text-left space-y-4 flex flex-col justify-center">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Upload a New List File
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                If you have a new file to process from an assembly.
              </p>
              <Button
                onClick={handleUploadClick}
                fullWidth
                variant="secondary"
                size="lg"
                leftIcon={<UploadCloud size={18} />}
              >
                Upload Excel File
              </Button>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
            className={`mt-6 border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer group ${
              isDragOver
                ? "border-[var(--primary-accent-start)] bg-[var(--primary-accent-start)]/5"
                : "border-[var(--border-color)] hover:border-[var(--primary-accent-start)] hover:bg-[var(--bg-elevated)]"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-4 pointer-events-none">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300 ${
                isDragOver ? "bg-[var(--primary-accent-start)]/20" : "bg-[var(--bg-secondary)] group-hover:bg-[var(--primary-accent-start)]/10"
              }`}>
                <UploadCloud
                  size={32}
                  className={`transition-colors duration-300 ${
                    isDragOver ? "text-[var(--primary-accent-start)]" : "text-[var(--text-secondary)] group-hover:text-[var(--primary-accent-start)]"
                  }`}
                />
              </div>
              <div>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {isDragOver ? "Drop file to upload" : "Drag and drop your Excel file here"}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  or click anywhere to browse
                </p>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
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
          className="lg:col-span-3 content-card"
        >
          <h2 className="section-heading">
            <TrendingUp size={22} className="mr-3 icon-primary" />
            Weekly Tithe Trend
          </h2>
          <p className="text-sm text-center py-4 text-[var(--text-muted)]">
            Showing data for the last 6 weeks.
          </p>
          <BarChart data={weeklyTitheData} />
        </motion.section>
      </div>
    </motion.div>
  );
};

export default DashboardSection;
