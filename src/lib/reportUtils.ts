import { TransactionLogEntry, MemberDatabase, ReportData } from "../types";
import { ASSEMBLIES } from "../constants";
import { escapeCsvField } from "./exportUtils";

const getWeekOfYear = (date: Date) => {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
};

export const processDataForReports = (
  transactionLog: TransactionLogEntry[],
  memberDatabase: MemberDatabase,
) => {
  const yearlyData: Record<
    number,
    {
      months: Record<number, ReportData[]>;
      weeks: Record<number, ReportData[]>;
      days: Record<number, Record<number, ReportData[]>>;
    }
  > = {};

  const initAssemblyData = () => ASSEMBLIES.map((name) => ({
    assemblyName: name,
    totalTithe: 0,
    soulsWon: 0,
    titherCount: 0,
    recordCount: 0,
  }));

  transactionLog.forEach((log) => {
    const logDate = new Date(log.selectedDate);
    const year = logDate.getFullYear();
    const month = logDate.getMonth();
    const week = getWeekOfYear(logDate);
    const day = logDate.getDate();

    if (!yearlyData[year]) {
      yearlyData[year] = { months: {}, weeks: {}, days: {} };
    }
    if (!yearlyData[year].months[month]) {
      yearlyData[year].months[month] = initAssemblyData();
    }
    if (!yearlyData[year].weeks[week]) {
      yearlyData[year].weeks[week] = initAssemblyData();
    }
    if (!yearlyData[year].days[month]) {
      yearlyData[year].days[month] = {};
    }
    if (!yearlyData[year].days[month][day]) {
      yearlyData[year].days[month][day] = initAssemblyData();
    }

    const assemblyReportMonth = yearlyData[year].months[month].find(
      (r) => r.assemblyName === log.assemblyName,
    );
    const assemblyReportWeek = yearlyData[year].weeks[week].find(
      (r) => r.assemblyName === log.assemblyName,
    );
    const assemblyReportDay = yearlyData[year].days[month][day].find(
      (r) => r.assemblyName === log.assemblyName,
    );

    if (assemblyReportMonth) {
      assemblyReportMonth.totalTithe += log.totalTitheAmount;
      assemblyReportMonth.titherCount += log.titherCount;
      assemblyReportMonth.recordCount += log.recordCount;
    }
    if (assemblyReportWeek) {
      assemblyReportWeek.totalTithe += log.totalTitheAmount;
      assemblyReportWeek.titherCount += log.titherCount;
      assemblyReportWeek.recordCount += log.recordCount;
    }
    if (assemblyReportDay) {
      assemblyReportDay.totalTithe += log.totalTitheAmount;
      assemblyReportDay.titherCount += log.titherCount;
      assemblyReportDay.recordCount += log.recordCount;
    }
  });

  Object.keys(memberDatabase).forEach((assemblyName) => {
    const assemblyMasterList = memberDatabase[assemblyName]?.data || [];
    assemblyMasterList.forEach((member) => {
      if (member.firstSeenDate) {
        try {
          const seenDate = new Date(member.firstSeenDate);
          const year = seenDate.getFullYear();
          const month = seenDate.getMonth();
          const week = getWeekOfYear(seenDate);
          const day = seenDate.getDate();

          if (yearlyData[year]) {
            if (yearlyData[year].months[month]) {
              const assemblyReport = yearlyData[year].months[month].find(
                (r) => r.assemblyName === assemblyName,
              );
              if (assemblyReport) assemblyReport.soulsWon += 1;
            }
            if (yearlyData[year].weeks[week]) {
              const assemblyReport = yearlyData[year].weeks[week].find(
                (r) => r.assemblyName === assemblyName,
              );
              if (assemblyReport) assemblyReport.soulsWon += 1;
            }
            if (yearlyData[year].days[month] && yearlyData[year].days[month][day]) {
              const assemblyReport = yearlyData[year].days[month][day].find(
                (r) => r.assemblyName === assemblyName,
              );
              if (assemblyReport) assemblyReport.soulsWon += 1;
            }
          }
        } catch (e) {
          // Invalid date format
        }
      }
    });
  });

  return yearlyData;
};

export const aggregateReportData = (
  data: Record<string, any>,
  granularity: "months" | "weeks" | "days",
) => {
  const summary = {
    totalTithe: 0,
    totalSouls: 0,
    topPerformingAssembly: { name: "N/A", value: 0 },
    topGrowthAssembly: { name: "N/A", value: 0 },
    performance: [] as any[],
  };

  const assemblyTotals = new Map<
    string,
    { totalTithe: number; soulsWon: number }
  >();

  if (granularity === "days") {
    Object.keys(data).forEach((month) => {
      Object.keys(data[month]).forEach((day) => {
        let periodTithe = 0;
        let periodSouls = 0;
        data[month][day].forEach((report: ReportData) => {
          periodTithe += report.totalTithe;
          periodSouls += report.soulsWon;
          const current = assemblyTotals.get(report.assemblyName) || {
            totalTithe: 0,
            soulsWon: 0,
          };
          assemblyTotals.set(report.assemblyName, {
            totalTithe: current.totalTithe + report.totalTithe,
            soulsWon: current.soulsWon + report.soulsWon,
          });
        });
        summary.totalTithe += periodTithe;
        summary.totalSouls += periodSouls;
        summary.performance.push({
          key: `${month}/${day}`,
          totalTithe: periodTithe,
          soulsWon: periodSouls,
        });
      });
    });
  } else {
    Object.keys(data).forEach((key) => {
      let periodTithe = 0;
      let periodSouls = 0;
      data[key].forEach((report: ReportData) => {
        periodTithe += report.totalTithe;
        periodSouls += report.soulsWon;
        const current = assemblyTotals.get(report.assemblyName) || {
          totalTithe: 0,
          soulsWon: 0,
        };
        assemblyTotals.set(report.assemblyName, {
          totalTithe: current.totalTithe + report.totalTithe,
          soulsWon: current.soulsWon + report.soulsWon,
        });
      });
      summary.totalTithe += periodTithe;
      summary.totalSouls += periodSouls;
      summary.performance.push({
        key,
        totalTithe: periodTithe,
        soulsWon: periodSouls,
      });
    });
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
};

export const exportToCsv = (summary: any, selectedYear: number, granularity: string) => {
  let csvContent = "data:text/csv;charset=utf-8,";

  // Use shared CSV escape utility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const escapeCsvField = (field: any) => {
    // This body will be replaced by import below.
    return "";
  };

  csvContent += `Summary for ${selectedYear}\n`;
  csvContent += `Total Tithe,Total Souls Won\n`;
  csvContent += `${escapeCsvField(summary.totalTithe)},${escapeCsvField(summary.totalSouls)}\n\n`;

  csvContent += `Top Performing Assembly (Tithe),${escapeCsvField(summary.topPerformingAssembly.name)},${escapeCsvField(summary.topPerformingAssembly.value)}\n`;
  csvContent += `Top Performing Assembly (Growth),${escapeCsvField(summary.topGrowthAssembly.name)},${escapeCsvField(summary.topGrowthAssembly.value)}\n\n`;

  csvContent += `Performance Data (${granularity})\n`;
  csvContent += `Period,Total Tithe,Souls Won\n`;

  summary.performance.forEach((perf: any) => {
    csvContent += `${escapeCsvField(perf.key)},${escapeCsvField(perf.totalTithe)},${escapeCsvField(perf.soulsWon)}\n`;
  });

  return csvContent;
};
