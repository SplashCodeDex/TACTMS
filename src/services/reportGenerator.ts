/**
 * Report Generator Service
 * AI-powered report generation for various formats
 */

import { TransactionLogEntry } from "../types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_NAME } from "@/constants";

export type ReportType = 'weekly_summary' | 'monthly_pdf' | 'year_end' | 'custom';

export interface ReportConfig {
    type: ReportType;
    startDate?: Date;
    endDate?: Date;
    assembly?: string;
    includeCharts?: boolean;
    format: 'markdown' | 'html' | 'text';
}

export interface GeneratedReport {
    title: string;
    content: string;
    format: 'markdown' | 'html' | 'text';
    generatedAt: Date;
    metadata: {
        period: string;
        assembly: string;
        totalAmount: number;
        titherCount: number;
    };
}

/**
 * Generate a report based on configuration
 */
export const generateReport = async (
    config: ReportConfig,
    transactionLogs: TransactionLogEntry[],
    apiKey?: string
): Promise<GeneratedReport> => {
    const { type, startDate, endDate, assembly, format } = config;

    // Filter logs by date range and assembly
    let filteredLogs = transactionLogs;
    if (startDate) {
        filteredLogs = filteredLogs.filter(l => new Date(l.selectedDate) >= startDate);
    }
    if (endDate) {
        filteredLogs = filteredLogs.filter(l => new Date(l.selectedDate) <= endDate);
    }
    if (assembly && assembly !== 'all') {
        filteredLogs = filteredLogs.filter(l => l.assemblyName === assembly);
    }

    // Generate based on type
    switch (type) {
        case 'weekly_summary':
            return generateWeeklySummary(filteredLogs, assembly || 'All Assemblies', format);
        case 'monthly_pdf':
            return generateMonthlyReport(filteredLogs, assembly || 'All Assemblies', format);
        case 'year_end':
            return generateYearEndReport(filteredLogs, assembly || 'All Assemblies', format);
        default:
            return generateCustomReport(filteredLogs, config, apiKey);
    }
};

/**
 * Generate weekly summary for WhatsApp/messaging
 */
const generateWeeklySummary = async (
    logs: TransactionLogEntry[],
    assembly: string,
    format: 'markdown' | 'html' | 'text'
): Promise<GeneratedReport> => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekLogs = logs.filter(l => new Date(l.selectedDate) >= weekAgo);
    const totalAmount = weekLogs.reduce((sum, l) => sum + l.totalTitheAmount, 0);
    const totalTithers = weekLogs.reduce((sum, l) => sum + l.titherCount, 0);
    const uniqueTithers = new Set(weekLogs.flatMap(l =>
        l.titheListData.map(t => t["Membership Number"])
    )).size;

    const content = format === 'text' ? `
📊 WEEKLY TITHE SUMMARY
${assembly.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━

📅 Week: ${formatDate(weekAgo)} - ${formatDate(now)}

💰 Total Tithe: GHS ${totalAmount.toLocaleString()}
👥 Unique Tithers: ${uniqueTithers}
📝 Transactions: ${totalTithers}

Top 5 Contributors:
${getTopTithers(weekLogs).map((t, i) => `${i + 1}. ${t.name}: GHS ${t.amount}`).join('\n')}

🙏 Thank you for your faithful giving!
`.trim() : `
# 📊 Weekly Tithe Summary
## ${assembly}

**Period:** ${formatDate(weekAgo)} - ${formatDate(now)}

| Metric | Value |
|--------|-------|
| 💰 Total Tithe | GHS ${totalAmount.toLocaleString()} |
| 👥 Unique Tithers | ${uniqueTithers} |
| 📝 Transactions | ${totalTithers} |

### Top 5 Contributors
${getTopTithers(weekLogs).map((t, i) => `${i + 1}. **${t.name}**: GHS ${t.amount}`).join('\n')}

---
🙏 *Thank you for your faithful giving!*
`.trim();

    return {
        title: `Weekly Summary - ${assembly}`,
        content,
        format,
        generatedAt: now,
        metadata: {
            period: `${formatDate(weekAgo)} - ${formatDate(now)}`,
            assembly,
            totalAmount,
            titherCount: uniqueTithers
        }
    };
};

/**
 * Generate monthly report for meetings
 */
const generateMonthlyReport = async (
    logs: TransactionLogEntry[],
    assembly: string,
    format: 'markdown' | 'html' | 'text'
): Promise<GeneratedReport> => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthLogs = logs.filter(l => new Date(l.selectedDate) >= monthStart);
    const totalAmount = monthLogs.reduce((sum, l) => sum + l.totalTitheAmount, 0);
    const totalTithers = new Set(monthLogs.flatMap(l =>
        l.titheListData.map(t => t["Membership Number"])
    )).size;

    // Assembly breakdown
    const breakdown = new Map<string, number>();
    monthLogs.forEach(l => {
        breakdown.set(l.assemblyName, (breakdown.get(l.assemblyName) || 0) + l.totalTitheAmount);
    });

    // Weekly breakdown
    const weeklyData = new Map<number, number>();
    monthLogs.forEach(l => {
        const week = getWeekNumber(new Date(l.selectedDate));
        weeklyData.set(week, (weeklyData.get(week) || 0) + l.totalTitheAmount);
    });

    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const content = `
# 📈 Monthly Tithe Report
## ${assembly} - ${monthName}

---

### Summary
| Metric | Value |
|--------|-------|
| 💰 **Total Tithe** | GHS ${totalAmount.toLocaleString()} |
| 👥 **Unique Tithers** | ${totalTithers} |
| 📊 **Weekly Average** | GHS ${Math.round(totalAmount / Math.max(weeklyData.size, 1)).toLocaleString()} |

---

### Weekly Breakdown
| Week | Amount |
|------|--------|
${Array.from(weeklyData.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([week, amt]) => `| Week ${week} | GHS ${amt.toLocaleString()} |`)
            .join('\n')}

---

### Assembly Breakdown
${Array.from(breakdown.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([asm, amt]) => `- **${asm}**: GHS ${amt.toLocaleString()}`)
            .join('\n')}

---

### Top 10 Contributors
${getTopTithers(monthLogs, 10).map((t, i) => `${i + 1}. **${t.name}**: GHS ${t.amount.toLocaleString()}`).join('\n')}

---

*Report generated by TACTMS on ${now.toLocaleString()}*
`.trim();

    return {
        title: `Monthly Report - ${assembly} - ${monthName}`,
        content,
        format,
        generatedAt: now,
        metadata: {
            period: monthName,
            assembly,
            totalAmount,
            titherCount: totalTithers
        }
    };
};

/**
 * Generate year-end comprehensive report
 */
const generateYearEndReport = async (
    logs: TransactionLogEntry[],
    assembly: string,
    format: 'markdown' | 'html' | 'text'
): Promise<GeneratedReport> => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const yearLogs = logs.filter(l => new Date(l.selectedDate) >= yearStart);
    const totalAmount = yearLogs.reduce((sum, l) => sum + l.totalTitheAmount, 0);

    // Monthly breakdown
    const monthlyData = new Map<string, number>();
    yearLogs.forEach(l => {
        const month = new Date(l.selectedDate).toLocaleDateString('en-US', { month: 'short' });
        monthlyData.set(month, (monthlyData.get(month) || 0) + l.totalTitheAmount);
    });

    // All-time top tithers
    const topTithers = getTopTithers(yearLogs, 20);

    const content = `
# 📊 Year-End Tithe Report
## ${now.getFullYear()} - ${assembly}

---

## Annual Summary

| Metric | Value |
|--------|-------|
| 💰 **Total Annual Tithe** | GHS ${totalAmount.toLocaleString()} |
| 📅 **Weeks Recorded** | ${yearLogs.length} |
| 📈 **Monthly Average** | GHS ${Math.round(totalAmount / 12).toLocaleString()} |

---

## Monthly Trend
| Month | Amount | % of Total |
|-------|--------|------------|
${Array.from(monthlyData.entries())
            .map(([month, amt]) => `| ${month} | GHS ${amt.toLocaleString()} | ${Math.round(amt / totalAmount * 100)}% |`)
            .join('\n')}

---

## Top 20 Contributors
| Rank | Name | Total | Avg/Week |
|------|------|-------|----------|
${topTithers.map((t, i) =>
                `| ${i + 1} | ${t.name} | GHS ${t.amount.toLocaleString()} | GHS ${Math.round(t.amount / yearLogs.length)} |`
            ).join('\n')}

---

## Highlights
- **Highest Month**: ${getBestMonth(monthlyData)}
- **Total Transactions**: ${yearLogs.reduce((sum, l) => sum + l.recordCount, 0).toLocaleString()}
- **Average Tithe**: GHS ${Math.round(totalAmount / Math.max(yearLogs.reduce((sum, l) => sum + l.titherCount, 0), 1))}

---

*Glory to God for a blessed ${now.getFullYear()}!*

*Report generated by TACTMS on ${now.toLocaleString()}*
`.trim();

    return {
        title: `Year-End Report - ${assembly} - ${now.getFullYear()}`,
        content,
        format,
        generatedAt: now,
        metadata: {
            period: String(now.getFullYear()),
            assembly,
            totalAmount,
            titherCount: new Set(yearLogs.flatMap(l => l.titheListData.map(t => t["Membership Number"]))).size
        }
    };
};

/**
 * Generate custom report with AI assistance
 */
const generateCustomReport = async (
    logs: TransactionLogEntry[],
    config: ReportConfig,
    apiKey?: string
): Promise<GeneratedReport> => {
    const now = new Date();
    const totalAmount = logs.reduce((sum, l) => sum + l.totalTitheAmount, 0);

    // If we have API key, use AI to generate custom insights
    if (apiKey) {
        try {
            const ai = new GoogleGenerativeAI(apiKey);
            const model = ai.getGenerativeModel({ model: GEMINI_MODEL_NAME });

            const summary = {
                period: config.startDate && config.endDate
                    ? `${formatDate(config.startDate)} - ${formatDate(config.endDate)}`
                    : 'All time',
                assembly: config.assembly || 'All',
                totalAmount,
                weekCount: logs.length,
                topTithers: getTopTithers(logs, 5)
            };

            const prompt = `Generate a brief, professional church tithe report summary in Markdown based on this data:
${JSON.stringify(summary, null, 2)}

Include: Overview, key highlights, and a spiritual encouragement. Keep it under 300 words.`;

            const result = await model.generateContent(prompt);
            const content = result.response.text();

            return {
                title: `Custom Report - ${config.assembly || 'All Assemblies'}`,
                content,
                format: config.format,
                generatedAt: now,
                metadata: {
                    period: summary.period,
                    assembly: config.assembly || 'All',
                    totalAmount,
                    titherCount: logs.reduce((sum, l) => sum + l.titherCount, 0)
                }
            };
        } catch (e) {
            console.warn('AI report generation failed:', e);
        }
    }

    // Fallback to basic report
    return generateWeeklySummary(logs, config.assembly || 'All Assemblies', config.format);
};

// Helper functions
const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getWeekNumber = (date: Date): number => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    return Math.ceil((date.getDate() + firstDayOfMonth.getDay()) / 7);
};

const getTopTithers = (logs: TransactionLogEntry[], limit: number = 5): Array<{ name: string; amount: number }> => {
    const tithers = new Map<string, number>();

    logs.forEach(log => {
        log.titheListData.forEach(record => {
            const name = String(record["Membership Number"]).split("(")[0].trim();
            const amount = typeof record["Transaction Amount"] === 'number'
                ? record["Transaction Amount"]
                : parseFloat(String(record["Transaction Amount"])) || 0;
            tithers.set(name, (tithers.get(name) || 0) + amount);
        });
    });

    return Array.from(tithers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, amount]) => ({ name, amount }));
};

const getBestMonth = (data: Map<string, number>): string => {
    let best = { month: '', amount: 0 };
    data.forEach((amount, month) => {
        if (amount > best.amount) {
            best = { month, amount };
        }
    });
    return `${best.month} (GHS ${best.amount.toLocaleString()})`;
};
