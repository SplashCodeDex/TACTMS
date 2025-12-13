/**
 * Predictive Insights Card Component
 * Displays AI-powered predictions and health score on dashboard
 */

import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity, Sparkles } from "lucide-react";
import { generatePredictions, Prediction, AnalyticsSummary } from "@/services/predictiveAnalytics";
import { TransactionLogEntry, MemberDatabase } from "@/types";

interface PredictiveInsightsCardProps {
    transactionLogs: TransactionLogEntry[];
    memberDatabase: MemberDatabase;
    apiKey?: string;
}

const PredictiveInsightsCard: React.FC<PredictiveInsightsCardProps> = ({
    transactionLogs,
    memberDatabase,
    apiKey
}) => {
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadPredictions = async () => {
            if (transactionLogs.length < 1) return;

            setIsLoading(true);
            try {
                const result = await generatePredictions(transactionLogs, memberDatabase, apiKey);
                setAnalytics(result);
            } catch (e) {
                console.error("Failed to generate predictions:", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadPredictions();
    }, [transactionLogs, memberDatabase, apiKey]);

    const getTrendIcon = (trend: Prediction['trend']) => {
        switch (trend) {
            case 'up': return <TrendingUp className="text-green-500" size={16} />;
            case 'down': return <TrendingDown className="text-red-500" size={16} />;
            default: return <Minus className="text-gray-500" size={16} />;
        }
    };

    const getHealthColor = (score: number) => {
        if (score >= 70) return "text-green-500";
        if (score >= 40) return "text-yellow-500";
        return "text-red-500";
    };

    const getHealthBg = (score: number) => {
        if (score >= 70) return "bg-green-500/20";
        if (score >= 40) return "bg-yellow-500/20";
        return "bg-red-500/20";
    };

    if (isLoading) {
        return (
            <div className="content-card animate-pulse">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-purple-500" size={18} />
                    <h3 className="section-heading text-base !mb-0">AI Insights</h3>
                </div>
                <div className="h-24 bg-hover-bg rounded-lg"></div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="content-card">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-purple-500" size={18} />
                    <h3 className="section-heading text-base !mb-0">AI Insights</h3>
                </div>
                <p className="text-text-secondary text-sm">
                    Upload tithe data to see AI-powered predictions
                </p>
            </div>
        );
    }

    return (
        <div className="content-card">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-purple-500" size={18} />
                    <h3 className="section-heading text-base !mb-0">AI Insights</h3>
                </div>

                {/* Health Score Badge */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getHealthBg(analytics.healthScore)}`}>
                    <Activity size={14} className={getHealthColor(analytics.healthScore)} />
                    <span className={`text-sm font-semibold ${getHealthColor(analytics.healthScore)}`}>
                        {analytics.healthScore}%
                    </span>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-hover-bg rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                        Month vs Month
                        {analytics.keyMetrics.monthOverMonth >= 0
                            ? <TrendingUp size={12} className="text-green-500" />
                            : <TrendingDown size={12} className="text-red-500" />
                        }
                    </div>
                    <span className={`text-lg font-bold ${analytics.keyMetrics.monthOverMonth >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                        {analytics.keyMetrics.monthOverMonth >= 0 ? '+' : ''}{analytics.keyMetrics.monthOverMonth}%
                    </span>
                </div>
                <div className="bg-hover-bg rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-1">Active Members</div>
                    <span className="text-lg font-bold text-text-primary">
                        {analytics.keyMetrics.activeMemberRate}%
                    </span>
                </div>
            </div>

            {/* Predictions List */}
            <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                    {analytics.predictions.map((prediction) => (
                        <div
                            key={prediction.id}
                            className={`p-3 rounded-lg border transition-all ${prediction.actionable
                                ? 'border-yellow-500/50 bg-yellow-500/5'
                                : 'border-border-color bg-hover-bg/50'
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                {getTrendIcon(prediction.trend)}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-text-primary">
                                            {prediction.title}
                                        </span>
                                        {prediction.actionable && (
                                            <AlertTriangle size={12} className="text-yellow-500" />
                                        )}
                                    </div>
                                    <p className="text-xs text-text-secondary mt-0.5">
                                        {prediction.message}
                                    </p>
                                    {prediction.action && (
                                        <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                                            <Sparkles size={10} />
                                            {prediction.action}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default PredictiveInsightsCard;
