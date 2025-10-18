import { TransactionLogEntry, MemberDatabase, ReportData } from "../types";
import { ASSEMBLIES } from "../constants";

export const calculateMonthlyReportData = (
  month: number,
  selectedYear: number,
  transactionLog: TransactionLogEntry[],
  memberDatabase: MemberDatabase,
): ReportData[] => {
  return ASSEMBLIES.map((name) => {
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
};

export const aggregateYearlySummary = (
  monthlyReportData: Record<number, ReportData[]>,
) => {
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
    if (monthlyReportData[month]) {
      monthlyReportData[month].forEach((report) => {
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
    }
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
};

export const processDataForReports = (
  transactionLog: TransactionLogEntry[],
  memberDatabase: MemberDatabase,
) => {
  const yearlyData: Record<
    number,
    Record<number, ReportData[]>
  > = {};

  transactionLog.forEach((log) => {
    const logDate = new Date(log.selectedDate);
    const year = logDate.getFullYear();
    const month = logDate.getMonth();

    if (!yearlyData[year]) {
      yearlyData[year] = {};
    }
    if (!yearlyData[year][month]) {
      yearlyData[year][month] = ASSEMBLIES.map((name) => ({
        assemblyName: name,
        totalTithe: 0,
        soulsWon: 0,
        titherCount: 0,
        recordCount: 0,
      }));
    }

    const assemblyReport = yearlyData[year][month].find(
      (r) => r.assemblyName === log.assemblyName,
    );

    if (assemblyReport) {
      assemblyReport.totalTithe += log.totalTitheAmount;
      assemblyReport.titherCount += log.titherCount;
      assemblyReport.recordCount += log.recordCount;
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

          if (yearlyData[year] && yearlyData[year][month]) {
            const assemblyReport = yearlyData[year][month].find(
              (r) => r.assemblyName === assemblyName,
            );
            if (assemblyReport) {
              assemblyReport.soulsWon += 1;
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

export const exportToCsv = (yearSummary: any, selectedYear: number) => {
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `Yearly Summary for ${selectedYear}\n`;
  csvContent += `Total Tithe,Total Souls Won\n`;
  csvContent += `${yearSummary.totalTithe},${yearSummary.totalSouls}\n\n`;

  csvContent += `Top Performing Assembly (Tithe),${yearSummary.topPerformingAssembly.name},${yearSummary.topPerformingAssembly.value}\n`;
  csvContent += `Top Performing Assembly (Growth),${yearSummary.topGrowthAssembly.name},${yearSummary.topGrowthAssembly.value}\n\n`;

  csvContent += `Monthly Performance\n`;
  csvContent += `Month,Total Tithe,Souls Won\n`;

  yearSummary.monthlyPerformance.forEach((perf: any) => {
    csvContent += `${monthLabels[perf.month]},${perf.totalTithe},${perf.soulsWon}\n`;
  });

  return csvContent;
};
