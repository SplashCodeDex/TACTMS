import React, { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  DollarSign,
  Users,
  TrendingUp,
  LineChart,
  Download,
} from "lucide-react";
import { TransactionLogEntry, MemberDatabase, ReportData } from "../types";
import AnimatedNumber from "../components/AnimatedNumber";
import StatDisplayCard from "../components/StatDisplayCard";
import { motion, AnimatePresence } from "framer-motion";
import DistrictTrendChart from "../components/DistrictTrendChart";
import { useOutletContext } from "react-router-dom";
import {
  aggregateYearlySummary,
  processDataForReports,
  exportToCsv,
} from "../lib/reportUtils";
import LoadingSpinner from "../components/LoadingSpinner";
import { LiquidButton } from "../components/LiquidButton";

interface ReportsSectionProps {
  transactionLog: TransactionLogEntry[];
  memberDatabase: MemberDatabase;
}

const ReportsSection: React.FC = () => {
  const { transactionLog = [], memberDatabase = {} } =
    useOutletContext<ReportsSectionProps>();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  const processedData = useMemo(
    () => processDataForReports(transactionLog, memberDatabase),
    [transactionLog, memberDatabase],
  );

  useEffect(() => {
    setIsLoading(true);
    // Simulate processing time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [processedData]);

  const yearOptions = useMemo(() => {
    const years = new Set(Object.keys(processedData).map(Number));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [processedData]);

  const reportDataByMonth = useMemo<Record<number, ReportData[]>>(() => {
    return processedData[selectedYear] || {};
  }, [selectedYear, processedData]);

  const yearSummary = useMemo(() => {
    return aggregateYearlySummary(reportDataByMonth);
  }, [reportDataByMonth]);

  const handleDownloadCsv = () => {
    const csvContent = exportToCsv(yearSummary, selectedYear);
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  if (isLoading) {
    return <LoadingSpinner message="Processing report data..." />;
  }

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
            <LiquidButton
              onClick={handleDownloadCsv}
            >
              <Download size={16} className="mr-2" />
              Download CSV
            </LiquidButton>
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
                ariaLabel={`District Total Tithe for ${selectedYear}: GH₵ ${yearSummary.totalTithe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <StatDisplayCard
                icon={<Users />}
                label={`District Souls Won (${selectedYear})`}
                value={<AnimatedNumber n={yearSummary.totalSouls} />}
                ariaLabel={`District Souls Won for ${selectedYear}: ${yearSummary.totalSouls}`}
              />
              <StatDisplayCard
                icon={<TrendingUp />}
                label="Top Assembly (Tithe)"
                value={yearSummary.topPerformingAssembly.name}
                subValue={`GH₵ ${yearSummary.topPerformingAssembly.value.toLocaleString()}`}
                valueClassName="text-gradient-primary"
                ariaLabel={`Top Assembly by Tithe: ${yearSummary.topPerformingAssembly.name} with GH₵ ${yearSummary.topPerformingAssembly.value.toLocaleString()}`}
              />
              <StatDisplayCard
                icon={<TrendingUp />}
                label="Top Assembly (Growth)"
                value={yearSummary.topGrowthAssembly.name}
                subValue={`${yearSummary.topGrowthAssembly.value} souls`}
                valueClassName="text-gradient-primary"
                ariaLabel={`Top Assembly by Growth: ${yearSummary.topGrowthAssembly.name} with ${yearSummary.topGrowthAssembly.value} souls`}
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
