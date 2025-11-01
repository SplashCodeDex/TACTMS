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
    favorites = [],
    onStartNewWeek,
    userProfile,
    onUploadFile,
  } = useOutletContext<DashboardSectionProps>();
  const [selectedAssembly, setSelectedAssembly] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      .slice(0, 5);

    return { ytdTithe, ytdSouls, totalMembers, recentActivities };
  }, [transactionLog, memberDatabase]);

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
                  <select
                    id="assembly-start-select-dash"
                    value={selectedAssembly}
                    onChange={(e) => setSelectedAssembly(e.target.value)}
                    className="form-input-light w-full"
                    disabled={Object.keys(memberDatabase).length === 0}
                  >
                    <option value="" disabled>
                      -- Select Assembly --
                    </option>
                    {ASSEMBLIES.map((assembly) => (
                      <option
                        key={assembly}
                        value={assembly}
                        disabled={!assembliesWithData.has(assembly)}
                      >
                        {assembly}{" "}
                        {assembliesWithData.has(assembly)
                          ? ""
                          : "(No member data)"}
                      </option>
                    ))}
                  </select>
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
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="content-card">
          <h2 className="section-heading">
            <Activity size={22} className="mr-3 icon-primary" />
            Recent Activity
          </h2>
          {stats.recentActivities.length > 0 ? (
            <ul className="space-y-3">
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
                      <span className="text-[var(--text-muted)] mx-1">•</span>
                      <span className="font-medium text-[var(--success-text)]">
                        GH₵ {log.totalTitheAmount.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-center py-8 text-[var(--text-muted)]">
              No recent transactions logged.
            </p>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
};

export default DashboardSection;
