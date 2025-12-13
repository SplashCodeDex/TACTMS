/**
 * Predictive Analytics Service
 * AI-powered predictions and trend analysis
 */

import { TransactionLogEntry, MemberDatabase } from "../types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_NAME } from "@/constants";

export interface Prediction {
    id: string;
    type: 'tithe_trend' | 'member_churn' | 'souls_forecast' | 'seasonal' | 'anomaly';
    title: string;
    message: string;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    actionable: boolean;
    action?: string;
}

export interface AnalyticsSummary {
    predictions: Prediction[];
    healthScore: number; // 0-100
    keyMetrics: {
        monthOverMonth: number; // percentage change
        weekOverWeek: number;
        averageTithe: number;
        activeMemberRate: number;
    };
}

/**
 * Generate predictions from transaction history
 * Uses statistical analysis + AI insights
 */
export const generatePredictions = async (
    transactionLogs: TransactionLogEntry[],
    memberDatabase: MemberDatabase,
    apiKey?: string
): Promise<AnalyticsSummary> => {
    const predictions: Prediction[] = [];

    if (transactionLogs.length < 2) {
        return {
            predictions: [{
                id: 'insufficient_data',
                type: 'anomaly',
                title: 'More Data Needed',
                message: 'Upload at least 2 weeks of tithe data to see predictions',
                confidence: 1,
                trend: 'stable',
                actionable: false
            }],
            healthScore: 50,
            keyMetrics: { monthOverMonth: 0, weekOverWeek: 0, averageTithe: 0, activeMemberRate: 0 }
        };
    }

    // Sort by date
    const sortedLogs = [...transactionLogs].sort(
        (a, b) => new Date(a.selectedDate).getTime() - new Date(b.selectedDate).getTime()
    );

    // Calculate metrics
    const metrics = calculateMetrics(sortedLogs, memberDatabase);

    // Statistical predictions
    predictions.push(...generateStatisticalPredictions(metrics));

    // AI-enhanced predictions (if API key available)
    if (apiKey && sortedLogs.length >= 4) {
        try {
            const aiPredictions = await generateAIPredictions(sortedLogs, apiKey);
            predictions.push(...aiPredictions);
        } catch (e) {
            console.warn('AI predictions failed, using statistical only:', e);
        }
    }

    // Calculate health score
    const healthScore = calculateHealthScore(metrics, predictions);

    return {
        predictions: predictions.slice(0, 5), // Top 5 predictions
        healthScore,
        keyMetrics: metrics
    };
};

/**
 * Calculate key metrics from transaction logs
 */
const calculateMetrics = (
    sortedLogs: TransactionLogEntry[],
    memberDatabase: MemberDatabase
): AnalyticsSummary['keyMetrics'] => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    let thisWeekTotal = 0;
    let lastWeekTotal = 0;
    let totalAmount = 0;
    let totalTithers = 0;

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    sortedLogs.forEach(log => {
        const logDate = new Date(log.selectedDate);
        totalAmount += log.totalTitheAmount;
        totalTithers += log.titherCount;

        if (logDate.getMonth() === thisMonth) {
            thisMonthTotal += log.totalTitheAmount;
        } else if (logDate.getMonth() === lastMonth) {
            lastMonthTotal += log.totalTitheAmount;
        }

        if (logDate >= oneWeekAgo) {
            thisWeekTotal += log.totalTitheAmount;
        } else if (logDate >= twoWeeksAgo && logDate < oneWeekAgo) {
            lastWeekTotal += log.totalTitheAmount;
        }
    });

    const monthOverMonth = lastMonthTotal > 0
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

    const weekOverWeek = lastWeekTotal > 0
        ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
        : 0;

    const averageTithe = totalTithers > 0 ? totalAmount / totalTithers : 0;

    // Active member rate
    let totalMembers = 0;
    Object.values(memberDatabase).forEach(ml => {
        totalMembers += ml.data.length;
    });
    const uniqueTithers = new Set(sortedLogs.flatMap(l =>
        (l.titheListData || []).map(t => t["Membership Number"])
    )).size;
    const activeMemberRate = totalMembers > 0 ? (uniqueTithers / totalMembers) * 100 : 0;

    return {
        monthOverMonth: Math.round(monthOverMonth * 10) / 10,
        weekOverWeek: Math.round(weekOverWeek * 10) / 10,
        averageTithe: Math.round(averageTithe),
        activeMemberRate: Math.round(activeMemberRate * 10) / 10
    };
};

/**
 * Generate statistical predictions
 */
const generateStatisticalPredictions = (
    metrics: AnalyticsSummary['keyMetrics']
): Prediction[] => {
    const predictions: Prediction[] = [];

    // Month-over-month trend
    if (Math.abs(metrics.monthOverMonth) >= 10) {
        predictions.push({
            id: 'mom_trend',
            type: 'tithe_trend',
            title: metrics.monthOverMonth > 0 ? 'Tithe Growth' : 'Tithe Decline',
            message: `Tithe is ${Math.abs(metrics.monthOverMonth)}% ${metrics.monthOverMonth > 0 ? 'higher' : 'lower'} than last month`,
            confidence: 0.85,
            trend: metrics.monthOverMonth > 0 ? 'up' : 'down',
            actionable: metrics.monthOverMonth < -10,
            action: metrics.monthOverMonth < -10 ? 'Consider member outreach this week' : undefined
        });
    }

    // Week-over-week volatility
    if (Math.abs(metrics.weekOverWeek) >= 20) {
        predictions.push({
            id: 'wow_volatility',
            type: 'anomaly',
            title: 'Weekly Fluctuation',
            message: `This week's tithe ${metrics.weekOverWeek > 0 ? 'spiked' : 'dropped'} by ${Math.abs(metrics.weekOverWeek)}%`,
            confidence: 0.7,
            trend: metrics.weekOverWeek > 0 ? 'up' : 'down',
            actionable: true,
            action: 'Review attendance data for this period'
        });
    }

    // Low engagement warning
    if (metrics.activeMemberRate < 30) {
        predictions.push({
            id: 'low_engagement',
            type: 'member_churn',
            title: 'Low Engagement',
            message: `Only ${metrics.activeMemberRate}% of members have tithed recently`,
            confidence: 0.9,
            trend: 'down',
            actionable: true,
            action: 'Consider sending reminder messages to inactive members'
        });
    }

    // Seasonal prediction (December usually higher)
    const currentMonth = new Date().getMonth();
    if (currentMonth === 10) { // November
        predictions.push({
            id: 'december_forecast',
            type: 'seasonal',
            title: 'December Forecast',
            message: 'Historically, December tithe is 15-20% higher due to year-end giving',
            confidence: 0.75,
            trend: 'up',
            actionable: false
        });
    }

    return predictions;
};

/**
 * Generate AI-enhanced predictions using Gemini
 */
const generateAIPredictions = async (
    logs: TransactionLogEntry[],
    apiKey: string
): Promise<Prediction[]> => {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: GEMINI_MODEL_NAME });

    // Prepare summary data for AI
    const summary = logs.slice(-8).map(l => ({
        date: l.selectedDate,
        amount: l.totalTitheAmount,
        tithers: l.titherCount,
        assembly: l.assemblyName
    }));

    const prompt = `Analyze this church tithe data and provide 1-2 actionable insights as JSON:
${JSON.stringify(summary, null, 2)}

Return ONLY valid JSON array with objects having: id, type (tithe_trend|member_churn|souls_forecast), title, message, confidence (0-1), trend (up|down|stable), actionable (boolean), action (optional string)`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.warn('AI prediction parsing failed:', e);
    }

    return [];
};

/**
 * Calculate overall health score
 */
const calculateHealthScore = (
    metrics: AnalyticsSummary['keyMetrics'],
    predictions: Prediction[]
): number => {
    let score = 50; // Base score

    // Positive factors
    if (metrics.monthOverMonth > 10) score += 15;
    else if (metrics.monthOverMonth > 0) score += 10;

    if (metrics.activeMemberRate > 50) score += 20;
    else if (metrics.activeMemberRate > 30) score += 10;

    // Negative factors
    if (metrics.monthOverMonth < -15) score -= 20;
    else if (metrics.monthOverMonth < 0) score -= 10;

    if (metrics.activeMemberRate < 20) score -= 15;

    // Prediction impact
    const negativeCount = predictions.filter(p => p.trend === 'down' && p.actionable).length;
    score -= negativeCount * 5;

    return Math.max(0, Math.min(100, score));
};
