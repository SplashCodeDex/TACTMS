/**
 * Tithe Trend Dashboard Component
 * Displays analytics, trends, and member patterns
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TransactionLogEntry, MemberDatabase } from '../../types';
import {
    calculateMemberPatterns,
    calculateAssemblyAnalytics,
    getMonthlyTitheSummary,
    getTopAssemblies,
    MemberTithingPattern,
    AssemblyAnalytics
} from '../../services/analyticsCalculator';

interface TrendDashboardProps {
    transactionLog: TransactionLogEntry[];
    memberDatabase: MemberDatabase;
    currentAssembly?: string;
}

const TrendDashboard: React.FC<TrendDashboardProps> = ({
    transactionLog,
    memberDatabase,
    currentAssembly
}) => {
    const [selectedAssembly, setSelectedAssembly] = useState(currentAssembly || '');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const assemblies = Object.keys(memberDatabase);

    // Calculate analytics
    const analytics = useMemo((): AssemblyAnalytics | null => {
        if (!selectedAssembly || transactionLog.length === 0) return null;
        return calculateAssemblyAnalytics(transactionLog, memberDatabase, selectedAssembly);
    }, [transactionLog, memberDatabase, selectedAssembly]);

    const monthlyData = useMemo(() => {
        return getMonthlyTitheSummary(transactionLog, selectedYear, selectedAssembly || undefined);
    }, [transactionLog, selectedYear, selectedAssembly]);

    const topAssemblies = useMemo(() => {
        return getTopAssemblies(transactionLog, memberDatabase);
    }, [transactionLog, memberDatabase]);

    // Calculate trend chart max for scaling
    const maxMonthlyAmount = Math.max(...monthlyData.map(m => m.total), 1);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <select
                    value={selectedAssembly}
                    onChange={e => setSelectedAssembly(e.target.value)}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2"
                >
                    <option value="">All Assemblies</option>
                    {assemblies.map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
                <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2"
                >
                    {[0, 1, 2, 3, 4].map(i => {
                        const year = new Date().getFullYear() - i;
                        return <option key={year} value={year}>{year}</option>;
                    })}
                </select>
            </div>

            {/* KPI Cards */}
            {analytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard
                        title="Total Tithe YTD"
                        value={`GHS ${analytics.totalTitheYTD.toLocaleString()}`}
                        icon="💰"
                        color="emerald"
                    />
                    <KPICard
                        title="Avg Weekly"
                        value={`GHS ${analytics.avgWeeklyTithe.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        icon="📊"
                        color="blue"
                    />
                    <KPICard
                        title="Consistent Tithers"
                        value={`${analytics.consistentTithers}/${analytics.activeTithers}`}
                        subtitle={`${Math.round((analytics.consistentTithers / Math.max(analytics.activeTithers, 1)) * 100)}%`}
                        icon="✅"
                        color="green"
                    />
                    <KPICard
                        title="Need Follow-up"
                        value={analytics.irregularTithers.toString()}
                        subtitle="Below 50% weeks"
                        icon="⚠️"
                        color="amber"
                    />
                </div>
            )}

            {/* Monthly Trend Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--border-color)]"
            >
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                    Monthly Tithe Trend - {selectedYear}
                </h3>
                <div className="flex items-end gap-2 h-48">
                    {monthlyData.map((month, i) => {
                        const height = (month.total / maxMonthlyAmount) * 100;
                        return (
                            <div key={month.month} className="flex-1 flex flex-col items-center">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ delay: i * 0.05 }}
                                    className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-md relative group cursor-pointer"
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        GHS {month.total.toLocaleString()}
                                    </div>
                                </motion.div>
                                <span className="text-xs text-[var(--text-tertiary)] mt-2">
                                    {month.month.slice(0, 3)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Tithers */}
                {analytics && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--border-color)]"
                    >
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            🏆 Top Tithers
                        </h3>
                        <div className="space-y-3">
                            {analytics.topTithers.slice(0, 7).map((tither, i) => (
                                <TitherRow
                                    key={tither.memberId}
                                    rank={i + 1}
                                    tither={tither}
                                />
                            ))}
                            {analytics.topTithers.length === 0 && (
                                <p className="text-[var(--text-tertiary)] text-center py-4">No tithe data available</p>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Need Follow-up */}
                {analytics && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--border-color)]"
                    >
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            ⚠️ Members Needing Follow-up
                        </h3>
                        <div className="space-y-3">
                            {analytics.irregularMembers.slice(0, 7).map((member, i) => (
                                <TitherRow
                                    key={member.memberId}
                                    rank={i + 1}
                                    tither={member}
                                    showConsistency
                                />
                            ))}
                            {analytics.irregularMembers.length === 0 && (
                                <p className="text-green-500 text-center py-4">
                                    ✨ All tithers are consistent!
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Top Assemblies (when no specific assembly selected) */}
            {!selectedAssembly && topAssemblies.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--border-color)]"
                >
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        🏛️ Top Performing Assemblies
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {topAssemblies.map((assembly, i) => (
                            <div
                                key={assembly.assembly}
                                className="bg-[var(--bg-secondary)] rounded-lg p-4 text-center"
                            >
                                <div className="text-2xl mb-1">
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                </div>
                                <div className="font-semibold text-[var(--text-primary)]">
                                    {assembly.assembly}
                                </div>
                                <div className="text-emerald-500 font-medium">
                                    GHS {assembly.total.toLocaleString()}
                                </div>
                                <div className="text-xs text-[var(--text-tertiary)]">
                                    Per capita: GHS {assembly.perCapita.toFixed(0)}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

// KPI Card Component
interface KPICardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color: 'emerald' | 'blue' | 'green' | 'amber';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, color }) => {
    const colorClasses = {
        emerald: 'from-emerald-500 to-teal-500',
        blue: 'from-blue-500 to-indigo-500',
        green: 'from-green-500 to-emerald-500',
        amber: 'from-amber-500 to-orange-500',
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border-color)]"
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-xl`}>
                    {icon}
                </div>
                <div>
                    <div className="text-xs text-[var(--text-tertiary)]">{title}</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
                    {subtitle && <div className="text-xs text-[var(--text-secondary)]">{subtitle}</div>}
                </div>
            </div>
        </motion.div>
    );
};

// Tither Row Component
interface TitherRowProps {
    rank: number;
    tither: MemberTithingPattern;
    showConsistency?: boolean;
}

const TitherRow: React.FC<TitherRowProps> = ({ rank, tither, showConsistency }) => {
    const displayName = tither.memberName.replace(/\s*\([^)]*\)/, '');

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
            <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold">
                {rank}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {displayName}
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">
                    {tither.weeksPaid} weeks
                    {showConsistency && ` • ${tither.consistencyScore}% consistency`}
                </div>
            </div>
            <div className="text-right">
                <div className="text-sm font-semibold text-emerald-500">
                    GHS {tither.totalTitheYTD.toLocaleString()}
                </div>
                {!showConsistency && (
                    <div className={`text-xs ${tither.trend === 'increasing' ? 'text-green-500' :
                            tither.trend === 'declining' ? 'text-red-500' :
                                'text-gray-500'
                        }`}>
                        {tither.trend === 'increasing' && '↑ '}
                        {tither.trend === 'declining' && '↓ '}
                        {tither.trend}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrendDashboard;
