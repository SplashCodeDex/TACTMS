import React, { useMemo, forwardRef } from "react";
import {
  Activity,
  FileSpreadsheet,
  Users,
  DollarSign,
  Download,
  Save,
  ListChecks,
  TrendingUp,
  AlertTriangle,
  Keyboard,
  TrendingDown,
  History,
  CalendarCheck,
  UserPlus,
  Eraser,
} from "lucide-react";
import { motion } from "framer-motion";
import Button from "../components/Button";
import { TitheRecordB, TransactionLogEntry } from "../types";
import AnimatedNumber from "../components/AnimatedNumber";
import DonutChart from "../components/DonutChart";
import InfoTooltip from "../components/InfoTooltip";
import StatDisplayCard from "../components/StatDisplayCard";

interface ListOverviewActionsSectionProps {
  currentAssembly: string | null;
  selectedDate: Date;
  currentTotalTithe: number;
  hasUnsavedChanges: boolean;
  titheListData: TitheRecordB[];
  tithersCount: number;
  nonTithersCount: number;
  tithersPercentage: number;
  setIsFullPreviewModalOpen: (isOpen: boolean) => void;
  setIsDataEntryModalOpen: (isOpen: boolean) => void;
  fileNameToSave: string;
  setFileNameToSave: (name: string) => void;
  inputErrors: { [key: string]: string };
  setInputErrors: (
    errors: React.SetStateAction<{ [key: string]: string }>,
  ) => void;
  handleDownloadExcel: () => void;
  openSaveFavoriteModal: () => void;
  onClearWorkspace: () => void;
  transactionLog: TransactionLogEntry[];
  soulsWonCount: number | null;
}

const MotionSection = motion.section;

const ComparisonStatCard: React.FC<{
  title: string;
  stats: { change: number | null; current: number; previous: number | null };
  defaultIcon: React.ElementType;
}> = ({ title, stats, defaultIcon: DefaultIcon }) => {
  const { change, current, previous } = stats;

  if (previous === null || previous === undefined || previous === 0) {
    return (
      <div className="content-card card-glow-on-hover p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <DefaultIcon size={20} className="text-[var(--text-muted)]" />
        </div>
        <p className="text-xl font-bold mt-2 text-[var(--text-muted)]">
          No Data
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          No past records to compare.
        </p>
      </div>
    );
  }

  const isIncrease = change !== null && change > 0;
  const isDecrease = change !== null && change < 0;
  const colorClass = isIncrease
    ? "text-[var(--success-text)]"
    : isDecrease
      ? "text-[var(--danger-text)]"
      : "text-[var(--text-secondary)]";
  const Icon = isIncrease
    ? TrendingUp
    : isDecrease
      ? TrendingDown
      : DefaultIcon;

  const renderChange = () => {
    if (change === null) return "N/A";
    if (change === Infinity) return "+∞%";
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  return (
    <div className="content-card card-glow-on-hover p-5 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--text-secondary)]">{title}</p>
        <Icon size={20} className={colorClass} />
      </div>
      <p className={`text-3xl font-bold mt-2 ${colorClass}`}>
        {renderChange()}
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
        GH₵ {current.toLocaleString(undefined, { minimumFractionDigits: 2 })} vs
        GH₵ {previous.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
};

const ListOverviewActionsSection = React.memo(
  forwardRef<HTMLElement, ListOverviewActionsSectionProps>(
    (
      {
        currentAssembly,
        selectedDate,
        currentTotalTithe,
        hasUnsavedChanges,
        titheListData = [],
        tithersCount,
        nonTithersCount,
        tithersPercentage,
        setIsFullPreviewModalOpen,
        setIsDataEntryModalOpen,
        fileNameToSave,
        setFileNameToSave,
        inputErrors,
        setInputErrors,
        handleDownloadExcel,
        openSaveFavoriteModal,
        onClearWorkspace,
        transactionLog = [],
        soulsWonCount,
      },
      ref,
    ) => {
      const {
        lowestTitheAmount,
        highestTitheAmount,
        lowestTitherName,
        highestTitherName,
        historicalStats,
      } = useMemo(() => {
        const tithersWithAmount = titheListData
          .map((r) => ({
            ...r,
            amount: Number(r["Transaction Amount"]) || 0,
          }))
          .filter((r) => r.amount > 0);

        let lowestTither: (TitheRecordB & { amount: number }) | null = null;
        let highestTither: (TitheRecordB & { amount: number }) | null = null;

        if (tithersWithAmount.length > 0) {
          lowestTither = tithersWithAmount.reduce((prev, curr) =>
            prev.amount < curr.amount ? prev : curr,
          );
          highestTither = tithersWithAmount.reduce((prev, curr) =>
            prev.amount > curr.amount ? prev : curr,
          );
        }

        const lowestTitheAmount = lowestTither ? lowestTither.amount : 0;
        const highestTitheAmount = highestTither ? highestTither.amount : 0;
        const lowestTitherName = lowestTither
          ? lowestTither["Membership Number"]
          : undefined;
        const highestTitherName = highestTither
          ? highestTither["Membership Number"]
          : undefined;

        const calcChange = (current: number, previous: number | null) => {
          if (previous === null || previous === 0)
            return current > 0 ? Infinity : 0;
          return ((current - previous) / previous) * 100;
        };

        const validSelectedDate =
          selectedDate instanceof Date && !isNaN(selectedDate.getTime())
            ? selectedDate
            : new Date();

        const currentMonth = validSelectedDate.getMonth();
        const currentYear = validSelectedDate.getFullYear();

        const prevMonthDate = new Date(validSelectedDate);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevMonthYear = prevMonthDate.getFullYear();

        let lastMonthTotal: number | null = null;
        let lastYearTotal: number | null = null;
        let ytdTotal = 0;

        if (transactionLog && transactionLog.length > 0 && currentAssembly) {
          const assemblyLog = transactionLog.filter(
            (log) => log.assemblyName === currentAssembly,
          );

          lastMonthTotal = assemblyLog
            .filter((log) => {
              const logDate = new Date(log.selectedDate);
              return (
                logDate.getMonth() === prevMonth &&
                logDate.getFullYear() === prevMonthYear
              );
            })
            .reduce((sum, log) => sum + log.totalTitheAmount, 0);

          lastYearTotal = assemblyLog
            .filter((log) => {
              const logDate = new Date(log.selectedDate);
              return (
                logDate.getMonth() === currentMonth &&
                logDate.getFullYear() === currentYear - 1
              );
            })
            .reduce((sum, log) => sum + log.totalTitheAmount, 0);

          ytdTotal = assemblyLog
            .filter(
              (log) => new Date(log.selectedDate).getFullYear() === currentYear,
            )
            .reduce((sum, log) => sum + log.totalTitheAmount, 0);
        }
        ytdTotal += currentTotalTithe; // Add current list to YTD for real-time view

        return {
          lowestTitheAmount,
          highestTitheAmount,
          lowestTitherName,
          highestTitherName,
          historicalStats: {
            vsLastMonth: {
              change: calcChange(currentTotalTithe, lastMonthTotal),
              current: currentTotalTithe,
              previous: lastMonthTotal,
            },
            vsLastYear: {
              change: calcChange(currentTotalTithe, lastYearTotal),
              current: currentTotalTithe,
              previous: lastYearTotal,
            },
            ytdTotal: ytdTotal,
          },
        };
      }, [
        titheListData,
        transactionLog,
        selectedDate,
        currentTotalTithe,
        currentAssembly,
      ]);

      if (titheListData.length === 0) {
        return null;
      }

      return (
        <MotionSection
          ref={ref}
          className="space-y-8"
          aria-labelledby="overview-actions-heading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex justify-between items-center">
            <h2
              id="overview-actions-heading"
              className="section-heading !border-b-0 !pb-0 !mb-0"
            >
              <Activity size={22} className="mr-3 icon-primary" />
              {currentAssembly} Assembly Dashboard
            </h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsDataEntryModalOpen(true)}
                variant={"outline"}
                size="md"
                leftIcon={<Keyboard size={16} />}
              >
                Data Entry Mode
              </Button>
              <Button
                onClick={() => setIsFullPreviewModalOpen(true)}
                variant={"secondary"}
                size="md"
                leftIcon={<ListChecks size={16} />}
              >
                Full List View
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="content-card card-glow-on-hover p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Total Amount
                    </p>
                    <DollarSign
                      size={20}
                      className="text-[var(--success-text)]"
                    />
                  </div>
                  <p className="text-4xl font-bold text-[var(--text-primary)] mt-2">
                    GH₵{" "}
                    <AnimatedNumber
                      n={currentTotalTithe}
                      formatter={(n) =>
                        n.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      }
                    />
                  </p>
                </div>

                <div className="content-card card-glow-on-hover p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Participation
                    </p>
                    <Users
                      size={20}
                      className="text-[var(--primary-accent-start)]"
                    />
                  </div>
                  <div className="flex items-center justify-around mt-2">
                    <DonutChart
                      percentage={tithersPercentage}
                      size={90}
                      strokeWidth={8}
                    />
                    <div className="text-right">
                      <p className="font-bold text-2xl text-[var(--text-primary)]">
                        <AnimatedNumber n={tithersCount} />
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Tithers
                      </p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {nonTithersCount} Non-tithers
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatDisplayCard
                  icon={<UserPlus />}
                  label="Souls Won (New Members)"
                  value={<AnimatedNumber n={soulsWonCount ?? 0} />}
                />
                <StatDisplayCard
                  icon={<TrendingUp />}
                  label="Highest Tithe Amount"
                  value={
                    <>
                      GH₵{" "}
                      <AnimatedNumber
                        n={highestTitheAmount}
                        formatter={(n) =>
                          n.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        }
                      />
                    </>
                  }
                  subValue={highestTitherName}
                />
                <StatDisplayCard
                  icon={<TrendingDown />}
                  label="Lowest Tithe Amount"
                  value={
                    <>
                      GH₵{" "}
                      <AnimatedNumber
                        n={lowestTitheAmount > 0 ? lowestTitheAmount : 0}
                        formatter={(n) =>
                          n.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        }
                      />
                    </>
                  }
                  subValue={lowestTitherName}
                />
              </div>
            </div>

            <div className="lg:col-span-2 content-card card-glow-on-hover flex flex-col">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Download size={20} /> Export & Save
              </h3>
              <div className="flex-grow flex flex-col justify-center gap-4">
                <div>
                  <label htmlFor="fileNameToSave" className="form-label">
                    File Name for Download
                  </label>
                  <input
                    type="text"
                    id="fileNameToSave"
                    value={fileNameToSave}
                    onChange={(e) => {
                      setFileNameToSave(e.target.value);
                      setInputErrors((p) => ({ ...p, fileName: "" }));
                    }}
                    className={`form-input-light ${inputErrors.fileName ? "input-error" : ""}`}
                    placeholder="Enter file name"
                  />
                  {inputErrors.fileName && (
                    <p className="form-error-text">{inputErrors.fileName}</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleDownloadExcel}
                    leftIcon={<FileSpreadsheet size={18} />}
                    disabled={!fileNameToSave.trim()}
                    variant="primary"
                    fullWidth
                  >
                    Download Excel
                  </Button>
                  <Button
                    onClick={openSaveFavoriteModal}
                    leftIcon={<Save size={18} />}
                    variant="outline"
                    fullWidth
                  >
                    Save to Favorites
                  </Button>
                </div>
                <Button
                  onClick={onClearWorkspace}
                  leftIcon={<Eraser size={18} />}
                  variant="subtle"
                  className="!text-[var(--danger-text)] hover:!bg-[var(--danger-start)]/10"
                  fullWidth
                >
                  Clear Workspace
                </Button>
              </div>
              {hasUnsavedChanges && (
                <p className="text-xs text-[var(--warning-text)] mt-4 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> List has been modified. Apply
                  changes in 'Full List View' before saving or exporting for
                  accuracy.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="section-heading">
              <History size={22} className="mr-3 icon-primary" />
              Historical Comparison
              <InfoTooltip
                text="Compares the current list's total amount against data from your transaction log for the same assembly."
                className="ml-2"
              />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ComparisonStatCard
                title="vs. Last Month"
                stats={historicalStats.vsLastMonth}
                defaultIcon={History}
              />
              <ComparisonStatCard
                title="vs. Last Year (Same Month)"
                stats={historicalStats.vsLastYear}
                defaultIcon={History}
              />
              <StatDisplayCard
                icon={<CalendarCheck />}
                label="YTD Total (Live)"
                value={
                  <>
                    GH₵{" "}
                    <AnimatedNumber
                      n={historicalStats.ytdTotal}
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
            </div>
          </div>
        </MotionSection>
      );
    },
  ),
);

ListOverviewActionsSection.displayName = "ListOverviewActionsSection";

export default ListOverviewActionsSection;
