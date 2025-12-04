import React from "react";
import { Activity, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionLogEntry } from "../../types";
import { formatDateDDMMMYYYY } from "../../lib/dataTransforms";

interface RecentActivityListProps {
    activities: TransactionLogEntry[];
}

const RecentActivityList: React.FC<RecentActivityListProps> = ({
    activities,
}) => {
    return (
        <section className="content-card">
            <h2 className="section-heading">
                <Activity size={22} className="mr-3 icon-primary" />
                Recent Activity
            </h2>
            {activities.length > 0 ? (
                <ScrollArea className="h-[200px]">
                    <ul className="space-y-3 pr-4">
                        {activities.map((log, index) => (
                            <li
                                key={`activity-${log.id}-${log.timestamp}-${index}`}
                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-card-subtle-accent)] transition-colors"
                            >
                                <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] rounded-lg flex items-center justify-center text-white">
                                    <User size={20} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                                        {log.assemblyName} Assembly
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {formatDateDDMMMYYYY(new Date(log.selectedDate))}
                                        <span className="text-[var(--text-muted)] mx-1"> • </span>
                                        <span className="font-medium text-[var(--success-text)]">
                                            GH₵ {log.totalTitheAmount.toLocaleString()}
                                        </span>
                                        <span className="text-[var(--text-muted)] mx-1"> • </span>
                                        <span className="font-medium text-[var(--text-primary)]">
                                            {log.titherCount} Tithers
                                        </span>
                                        <span className="text-[var(--text-muted)] mx-1"> • </span>
                                        <span className="font-medium text-[var(--accent-purple)]">
                                            {log.soulsWonCount} Souls Won
                                        </span>
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            ) : (
                <p className="text-sm text-center py-8 text-[var(--text-muted)]">
                    No recent transactions logged.
                </p>
            )}
        </section>
    );
};

export default RecentActivityList;
