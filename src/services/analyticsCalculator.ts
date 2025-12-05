/**
 * Analytics Calculator Service
 * Computes tithe trends, member patterns, and assembly performance metrics
 */

import { TitheRecordB, TransactionLogEntry, MemberDatabase, MemberRecordA } from '../types';

/**
 * Individual member tithing pattern
 */
export interface MemberTithingPattern {
    memberId: string;
    memberName: string;
    assemblyName: string;
    totalTitheYTD: number;
    weeksPaid: number;
    weeksInPeriod: number;
    consistencyScore: number;  // 0-100
    averageTithe: number;
    lastTitheDate: string;
    lastTitheAmount: number;
    trend: 'increasing' | 'stable' | 'declining' | 'irregular' | 'new';
    tithes: Array<{ date: string; amount: number }>;
}

/**
 * Assembly-level analytics
 */
export interface AssemblyAnalytics {
    assemblyName: string;
    totalTitheYTD: number;
    avgWeeklyTithe: number;
    memberCount: number;
    activeTithers: number;        // Members who tithed at least once
    consistentTithers: number;    // >80% weeks
    irregularTithers: number;     // <50% weeks
    topTithers: MemberTithingPattern[];
    irregularMembers: MemberTithingPattern[];
    weeklyData: Array<{ date: string; amount: number; tithersCount: number }>;
}

/**
 * Period comparison result
 */
export interface PeriodComparison {
    period1Label: string;
    period2Label: string;
    period1Total: number;
    period2Total: number;
    percentageChange: number;
    trendDirection: 'up' | 'down' | 'stable';
}

/**
 * Extract member ID from the concatenated Membership Number field
 * e.g., "ELDER JOHN DOE (TAC89JOD123)" -> "TAC89JOD123"
 */
const extractMemberId = (membershipNumber: string): string => {
    const match = membershipNumber.match(/\(([^)]+)\)/);
    if (match) {
        return match[1].trim();
    }
    return membershipNumber;
};

/**
 * Calculate individual member tithing patterns
 */
export const calculateMemberPatterns = (
    logs: TransactionLogEntry[],
    assemblyName?: string
): MemberTithingPattern[] => {
    // Filter logs by assembly if specified
    const filteredLogs = assemblyName
        ? logs.filter(log => log.assemblyName === assemblyName)
        : logs;

    if (filteredLogs.length === 0) return [];

    // Get date range
    const dates = filteredLogs.map(log => new Date(log.selectedDate).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Calculate weeks in period
    const weeksInPeriod = Math.ceil((maxDate.getTime() - minDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    // Aggregate data by member
    const memberData = new Map<string, {
        memberId: string;
        memberName: string;
        assemblyName: string;
        tithes: Array<{ date: string; amount: number }>;
    }>();

    for (const log of filteredLogs) {
        for (const record of log.titheListData) {
            const amount = Number(record["Transaction Amount"]) || 0;
            if (amount <= 0) continue;

            const memberName = record["Membership Number"];
            const memberId = extractMemberId(memberName);
            const date = record["Transaction Date ('DD-MMM-YYYY')"];

            if (!memberData.has(memberId)) {
                memberData.set(memberId, {
                    memberId,
                    memberName,
                    assemblyName: log.assemblyName,
                    tithes: [],
                });
            }

            memberData.get(memberId)!.tithes.push({ date, amount });
        }
    }

    // Calculate patterns for each member
    const patterns: MemberTithingPattern[] = [];

    for (const [memberId, data] of memberData) {
        const tithes = data.tithes;
        const totalTitheYTD = tithes.reduce((sum, t) => sum + t.amount, 0);
        const weeksPaid = new Set(tithes.map(t => t.date)).size;
        const consistencyScore = Math.round((weeksPaid / weeksInPeriod) * 100);
        const averageTithe = totalTitheYTD / weeksPaid;

        // Sort by date to find latest
        const sortedTithes = [...tithes].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const lastTitheDate = sortedTithes[0]?.date || '';
        const lastTitheAmount = sortedTithes[0]?.amount || 0;

        // Calculate trend
        let trend: MemberTithingPattern['trend'] = 'stable';
        if (weeksPaid <= 2) {
            trend = 'new';
        } else if (weeksPaid >= 3) {
            const recentAvg = sortedTithes.slice(0, Math.ceil(weeksPaid / 2))
                .reduce((sum, t) => sum + t.amount, 0) / Math.ceil(weeksPaid / 2);
            const oldAvg = sortedTithes.slice(Math.ceil(weeksPaid / 2))
                .reduce((sum, t) => sum + t.amount, 0) / Math.floor(weeksPaid / 2);

            if (recentAvg > oldAvg * 1.2) trend = 'increasing';
            else if (recentAvg < oldAvg * 0.8) trend = 'declining';
            else if (consistencyScore < 50) trend = 'irregular';
        }

        patterns.push({
            memberId,
            memberName: data.memberName,
            assemblyName: data.assemblyName,
            totalTitheYTD,
            weeksPaid,
            weeksInPeriod,
            consistencyScore,
            averageTithe,
            lastTitheDate,
            lastTitheAmount,
            trend,
            tithes: sortedTithes,
        });
    }

    return patterns.sort((a, b) => b.totalTitheYTD - a.totalTitheYTD);
};

/**
 * Calculate assembly-level analytics
 */
export const calculateAssemblyAnalytics = (
    logs: TransactionLogEntry[],
    memberDatabase: MemberDatabase,
    assemblyName: string
): AssemblyAnalytics => {
    const patterns = calculateMemberPatterns(logs, assemblyName);
    const memberCount = memberDatabase[assemblyName]?.data?.length || 0;

    const totalTitheYTD = patterns.reduce((sum, p) => sum + p.totalTitheYTD, 0);

    // Calculate weekly data
    const weeklyMap = new Map<string, { amount: number; tithers: Set<string> }>();

    for (const log of logs.filter(l => l.assemblyName === assemblyName)) {
        const weekKey = log.selectedDate.toString();
        if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, { amount: 0, tithers: new Set() });
        }

        for (const record of log.titheListData) {
            const amount = Number(record["Transaction Amount"]) || 0;
            if (amount > 0) {
                weeklyMap.get(weekKey)!.amount += amount;
                weeklyMap.get(weekKey)!.tithers.add(extractMemberId(record["Membership Number"]));
            }
        }
    }

    const weeklyData = Array.from(weeklyMap.entries())
        .map(([date, data]) => ({
            date,
            amount: data.amount,
            tithersCount: data.tithers.size,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const avgWeeklyTithe = weeklyData.length > 0
        ? totalTitheYTD / weeklyData.length
        : 0;

    const activeTithers = patterns.length;
    const consistentTithers = patterns.filter(p => p.consistencyScore >= 80).length;
    const irregularTithers = patterns.filter(p => p.consistencyScore < 50).length;

    // Top 10 tithers by total
    const topTithers = patterns.slice(0, 10);

    // Irregular members (tithed but <50% weeks)
    const irregularMembers = patterns
        .filter(p => p.consistencyScore < 50 && p.consistencyScore > 0)
        .slice(0, 10);

    return {
        assemblyName,
        totalTitheYTD,
        avgWeeklyTithe,
        memberCount,
        activeTithers,
        consistentTithers,
        irregularTithers,
        topTithers,
        irregularMembers,
        weeklyData,
    };
};

/**
 * Identify members who need follow-up
 */
export const identifyIrregularMembers = (
    patterns: MemberTithingPattern[],
    consistencyThreshold: number = 50
): MemberTithingPattern[] => {
    // Members who have tithed at least once but below threshold
    return patterns
        .filter(p => p.weeksPaid > 0 && p.consistencyScore < consistencyThreshold)
        .sort((a, b) => a.consistencyScore - b.consistencyScore);
};

/**
 * Compare tithe performance between two periods
 */
export const comparePerformance = (
    logs: TransactionLogEntry[],
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date,
    assemblyName?: string
): PeriodComparison => {
    const filteredLogs = assemblyName
        ? logs.filter(log => log.assemblyName === assemblyName)
        : logs;

    const period1Total = filteredLogs
        .filter(log => {
            const date = new Date(log.selectedDate);
            return date >= period1Start && date <= period1End;
        })
        .reduce((sum, log) => sum + log.totalTitheAmount, 0);

    const period2Total = filteredLogs
        .filter(log => {
            const date = new Date(log.selectedDate);
            return date >= period2Start && date <= period2End;
        })
        .reduce((sum, log) => sum + log.totalTitheAmount, 0);

    const percentageChange = period1Total > 0
        ? ((period2Total - period1Total) / period1Total) * 100
        : period2Total > 0 ? 100 : 0;

    const trendDirection: 'up' | 'down' | 'stable' =
        percentageChange > 5 ? 'up' :
            percentageChange < -5 ? 'down' : 'stable';

    return {
        period1Label: `${period1Start.toLocaleDateString()} - ${period1End.toLocaleDateString()}`,
        period2Label: `${period2Start.toLocaleDateString()} - ${period2End.toLocaleDateString()}`,
        period1Total,
        period2Total,
        percentageChange,
        trendDirection,
    };
};

/**
 * Get monthly tithe summary
 */
export const getMonthlyTitheSummary = (
    logs: TransactionLogEntry[],
    year: number,
    assemblyName?: string
): Array<{ month: string; total: number; tithersCount: number }> => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const filteredLogs = assemblyName
        ? logs.filter(log => log.assemblyName === assemblyName)
        : logs;

    const monthlyData = months.map((month, index) => {
        const monthLogs = filteredLogs.filter(log => {
            const date = new Date(log.selectedDate);
            return date.getFullYear() === year && date.getMonth() === index;
        });

        const total = monthLogs.reduce((sum, log) => sum + log.totalTitheAmount, 0);
        const tithers = new Set<string>();

        for (const log of monthLogs) {
            for (const record of log.titheListData) {
                if ((Number(record["Transaction Amount"]) || 0) > 0) {
                    tithers.add(extractMemberId(record["Membership Number"]));
                }
            }
        }

        return {
            month,
            total,
            tithersCount: tithers.size,
        };
    });

    return monthlyData;
};

/**
 * Get top performing assemblies
 */
export const getTopAssemblies = (
    logs: TransactionLogEntry[],
    memberDatabase: MemberDatabase,
    limit: number = 5
): Array<{ assembly: string; total: number; perCapita: number }> => {
    const assemblyTotals = new Map<string, number>();

    for (const log of logs) {
        const current = assemblyTotals.get(log.assemblyName) || 0;
        assemblyTotals.set(log.assemblyName, current + log.totalTitheAmount);
    }

    return Array.from(assemblyTotals.entries())
        .map(([assembly, total]) => {
            const memberCount = memberDatabase[assembly]?.data?.length || 1;
            return {
                assembly,
                total,
                perCapita: total / memberCount,
            };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
};
