import React, { useState, useMemo } from "react";
import {
  PieChart,
  DollarSign,
  Users,
  TrendingUp,
  LineChart,
} from "lucide-react";
import { TransactionLogEntry, MemberDatabase, ReportData } from "../types";
import { ASSEMBLIES } from "../constants";
import AnimatedNumber from "../components/AnimatedNumber";
import StatDisplayCard from "../components/StatDisplayCard";
import { motion, AnimatePresence } from "framer-motion";
import DistrictTrendChart from "../components/DistrictTrendChart";
import { useOutletContext } from "react-router-dom";

interface ReportsSectionProps {
  transactionLog: TransactionLogEntry[];
  memberDatabase: MemberDatabase;
}

const ReportsSection: React.FC = () => {
  const { transactionLog = [], memberDatabase = {} } =
    useOutletContext<ReportsSectionProps>();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const yearOptions = useMemo(() => {
    const years = new Set(
      transactionLog.map((f) => new Date(f.timestamp).getFullYear()),
    );
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [transactionLog]);

  const reportDataByMonth = useMemo<Record<number, ReportData[]>>(() => {
    const monthlyData: Record<number, ReportData[]> = {};

    for (let month = 0; month < 12; month++) {
      monthlyData[month] = ASSEMBLIES.map((name) => {
        const assemblyMasterList = memberDatabase[name]?.data || [];
        const soulsWonForMonth = assemblyMasterList.filter((member) => {
          if (!member.firstSeenDate) return false;
          try {
            const seenDate = new Date(member.firstSeenDate);
            return (
              seenDate.getMonth() === month &&
              seenDate.getFullYear() === selectedYear
            );
          } catch (e) {
            return false;
          }
        }).length;

        const assemblyLogsForMonth = transactionLog.filter((log) => {
          const logDate = new Date(log.selectedDate);
          return (
            log.assemblyName === name &&
            logDate.getMonth() === month &&
            logDate.getFullYear() === selectedYear
          );
        });

        const monthlyTotals = assemblyLogsForMonth.reduce(
          (acc, log) => {
            acc.totalTithe += log.totalTitheAmount;
            acc.titherCount += log.titherCount;
            acc.recordCount += log.recordCount;
            return acc;
          },
          { totalTithe: 0, titherCount: 0, recordCount: 0 },
        );

        return {
          assemblyName: name,
          totalTithe: monthlyTotals.totalTithe,
          soulsWon: soulsWonForMonth,
          titherCount: monthlyTotals.titherCount,
          recordCount: monthlyTotals.recordCount,
        };
      });
    }
    return monthlyData;
  }, [transactionLog, memberDatabase, selectedYear]);

  const yearSummary = useMemo(() => {
    const summary = {
      totalTithe: 0,
      totalSouls: 0,
      topPerformingAssembly: { name: "N/A", value: 0 },
      topGrowthAssembly: { name: "N/A", value: 0 },
      monthlyPerformance: Array(12)
        .fill(0)
        .map((_, i) => ({ month: i, totalTithe: 0, soulsWon: 0 })),
    };

    const assemblyTotals = new Map<
      string,
      { totalTithe: number; soulsWon: number }
    >();

    for (let month = 0; month < 12; month++) {
      let monthTithe = 0;
      let monthSouls = 0;
      reportDataByMonth[month].forEach((report) => {
        monthTithe += report.totalTithe;
        monthSouls += report.soulsWon;
        const current = assemblyTotals.get(report.assemblyName) || {
          totalTithe: 0,
          soulsWon: 0,
        };
        assemblyTotals.set(report.assemblyName, {
          totalTithe: current.totalTithe + report.totalTithe,
          soulsWon: current.soulsWon + report.soulsWon,
        });
      });
      summary.totalTithe += monthTithe;
      summary.totalSouls += monthSouls;
      summary.monthlyPerformance[month] = {
        month,
        totalTithe: monthTithe,
        soulsWon: monthSouls,
      };
    }

    const sortedByTithe = [...assemblyTotals.entries()].sort(
      (a, b) => b[1].totalTithe - a[1].totalTithe,
    );
    if (sortedByTithe.length > 0 && sortedByTithe[0][1].totalTithe > 0) {
      summary.topPerformingAssembly = {
        name: sortedByTithe[0][0],
        value: sortedByTithe[0][1].totalTithe,
      };
    }

    const sortedByGrowth = [...assemblyTotals.entries()].sort(
      (a, b) => b[1].soulsWon - a[1].soulsWon,
    );
    if (sortedByGrowth.length > 0 && sortedByGrowth[0][1].soulsWon > 0) {
      summary.topGrowthAssembly = {
        name: sortedByGrowth[0][0],
        value: sortedByGrowth[0][1].soulsWon,
      };
    }

    return summary;
  }, [reportDataByMonth]);

  const hasDataForPeriod =
    yearSummary.totalTithe > 0 || yearSummary.totalSouls > 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-8">
      <section className="content-card" aria-labelledby="reports-heading">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2
            id="reports-heading"
            className="section-heading border-none pb-0 mb-0"
          >
            <PieChart size={22} className="mr-3 icon-primary" />
            Annual Performance Dashboard
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="form-input-light"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {hasDataForPeriod ? (
        <AnimatePresence>
          <motion.div
            className="space-y-8"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.section
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <StatDisplayCard
                icon={<DollarSign />}
                label={`District Total Tithe (${selectedYear})`}
                value={
                  <>
                    GH₵{" "}
                    <AnimatedNumber
                      n={yearSummary.totalTithe}
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
                icon={<Users />}
                label={`District Souls Won (${selectedYear})`}
                value={<AnimatedNumber n={yearSummary.totalSouls} />}
              />
              <StatDisplayCard
                icon={<TrendingUp />}
                label="Top Assembly (Tithe)"
                value={yearSummary.topPerformingAssembly.name}
                subValue={`GH₵ ${yearSummary.topPerformingAssembly.value.toLocaleString()}`}
                valueClassName="text-gradient-primary"
              />
              <StatDisplayCard
                icon={<TrendingUp />}
                label="Top Assembly (Growth)"
                value={yearSummary.topGrowthAssembly.name}
                subValue={`${yearSummary.topGrowthAssembly.value} souls`}
                valueClassName="text-gradient-primary"
              />
            </motion.section>

            <motion.section variants={itemVariants} className="content-card">
              <h3 className="section-heading">
                <LineChart size={20} className="mr-3 icon-primary" />
                District Performance Over Time ({selectedYear})
              </h3>
              <DistrictTrendChart
                performanceData={yearSummary.monthlyPerformance}
              />
            </motion.section>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="text-center py-12 content-card">
          <PieChart
            size={52}
            className="mx-auto text-[var(--text-muted)] mb-4 opacity-50"
          />
          <p className="text-[var(--text-secondary)] text-lg">
            No report data for this period.
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Download a processed list from the "Tithe Processor" view to
            populate reports.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsSection;
