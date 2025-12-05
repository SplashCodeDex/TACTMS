/**
 * Query Templates Service
 * Pre-built templates for common natural language queries
 */

import { TitheRecordB, TransactionLogEntry, MemberDatabase } from "../types";

export interface QuerySuggestion {
    id: string;
    label: string;
    query: string;
    category: 'tithers' | 'trends' | 'comparison' | 'members';
}

export const QUERY_SUGGESTIONS: QuerySuggestion[] = [
    {
        id: 'top_10_tithers',
        label: 'Top 10 Tithers This Month',
        query: 'Show me the top 10 highest tithers this month with their amounts',
        category: 'tithers'
    },
    {
        id: 'inactive_members',
        label: 'Inactive Members (4+ weeks)',
        query: 'List all members who have not tithed in the last 4 weeks',
        category: 'members'
    },
    {
        id: 'month_comparison',
        label: 'Compare to Last Month',
        query: 'Compare this month\'s total tithe to last month. What is the difference?',
        category: 'comparison'
    },
    {
        id: 'assembly_breakdown',
        label: 'Total by Assembly',
        query: 'Show total tithe amount broken down by each assembly',
        category: 'trends'
    },
    {
        id: 'weekly_trend',
        label: 'Weekly Trend',
        query: 'What is the weekly tithe trend for the past 4 weeks?',
        category: 'trends'
    },
    {
        id: 'new_tithers',
        label: 'New Tithers This Month',
        query: 'List all members who tithed for the first time this month',
        category: 'members'
    },
    {
        id: 'consistent_tithers',
        label: 'Most Consistent Tithers',
        query: 'Who are the most consistent tithers (tithed every week this month)?',
        category: 'tithers'
    },
    {
        id: 'average_tithe',
        label: 'Average Tithe Amount',
        query: 'What is the average tithe amount per person this month?',
        category: 'trends'
    }
];

/**
 * Pre-process data for AI context to save tokens
 */
export interface DataContext {
    currentMonthTotal: number;
    lastMonthTotal: number;
    currentWeekTithers: number;
    totalMembers: number;
    topTithers: Array<{ name: string; amount: number }>;
    assemblyBreakdown: Record<string, number>;
    weeklyTotals: Array<{ week: string; amount: number }>;
}

export const buildDataContext = (
    titheListData: TitheRecordB[],
    transactionLogs: TransactionLogEntry[],
    memberDatabase: MemberDatabase,
    currentAssembly?: string
): DataContext => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current month total
    let currentMonthTotal = 0;
    let lastMonthTotal = 0;
    const assemblyBreakdown: Record<string, number> = {};
    const weeklyTotals: Array<{ week: string; amount: number }> = [];
    const titherAmounts: Map<string, number> = new Map();

    // Process transaction logs
    transactionLogs.forEach(log => {
        const logDate = new Date(log.selectedDate);
        const amount = log.totalTitheAmount;

        if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
            currentMonthTotal += amount;
        } else if (
            (logDate.getMonth() === currentMonth - 1 && logDate.getFullYear() === currentYear) ||
            (currentMonth === 0 && logDate.getMonth() === 11 && logDate.getFullYear() === currentYear - 1)
        ) {
            lastMonthTotal += amount;
        }

        // Assembly breakdown
        if (!assemblyBreakdown[log.assemblyName]) {
            assemblyBreakdown[log.assemblyName] = 0;
        }
        assemblyBreakdown[log.assemblyName] += amount;

        // Weekly totals (last 4 weeks)
        const weekKey = logDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        weeklyTotals.push({ week: weekKey, amount });
    });

    // Current tithe list analysis
    titheListData.forEach(record => {
        const name = String(record["Membership Number"]).split("(")[0].trim();
        const amount = typeof record["Transaction Amount"] === 'number'
            ? record["Transaction Amount"]
            : parseFloat(String(record["Transaction Amount"])) || 0;

        titherAmounts.set(name, (titherAmounts.get(name) || 0) + amount);
    });

    // Top tithers
    const topTithers = Array.from(titherAmounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, amount]) => ({ name, amount }));

    // Total members
    let totalMembers = 0;
    if (currentAssembly && memberDatabase[currentAssembly]) {
        totalMembers = memberDatabase[currentAssembly].data.length;
    } else {
        Object.values(memberDatabase).forEach(ml => {
            totalMembers += ml.data.length;
        });
    }

    return {
        currentMonthTotal,
        lastMonthTotal,
        currentWeekTithers: titheListData.length,
        totalMembers,
        topTithers,
        assemblyBreakdown,
        weeklyTotals: weeklyTotals.slice(-4).reverse()
    };
};

/**
 * Build optimized prompt context for AI
 */
export const buildPromptContext = (context: DataContext): string => {
    return `
TITHE DATA SUMMARY:
- Current Month Total: GHS ${context.currentMonthTotal.toLocaleString()}
- Last Month Total: GHS ${context.lastMonthTotal.toLocaleString()}
- Current Week Tithers: ${context.currentWeekTithers}
- Total Members: ${context.totalMembers}

TOP 10 TITHERS:
${context.topTithers.map((t, i) => `${i + 1}. ${t.name}: GHS ${t.amount}`).join('\n')}

ASSEMBLY BREAKDOWN:
${Object.entries(context.assemblyBreakdown).map(([a, amt]) => `- ${a}: GHS ${amt.toLocaleString()}`).join('\n')}

WEEKLY TREND:
${context.weeklyTotals.map(w => `- ${w.week}: GHS ${w.amount.toLocaleString()}`).join('\n')}
`.trim();
};
