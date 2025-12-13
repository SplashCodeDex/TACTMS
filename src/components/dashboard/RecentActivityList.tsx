import React from "react";
import { Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionLogEntry } from "../../types";
import { formatDateDDMMMYYYY } from "../../lib/dataTransforms";

interface RecentActivityListProps {
    activities: TransactionLogEntry[];
    embedded?: boolean;
}

const RecentActivityList: React.FC<RecentActivityListProps> = ({
    activities,
    embedded = false,
}) => {
    const Container = embedded ? "div" : "section";
    const containerClasses = embedded ? "mt-6" : "content-card";

    return (
        <Container className={containerClasses}>
            <h2 className="section-heading">
                <Activity size={22} className="mr-3 icon-primary" />
                Recent Activity
            </h2>
            {activities.length > 0 ? (
                <ScrollArea className="h-[auto] md:h-[200px]">
                    <ul className="flex overflow-x-auto snap-x gap-4 pb-4 -mx-4 px-4 no-scrollbar md:block md:space-y-3 md:pb-0 md:mx-0 md:px-0">
                        {activities.map((log, index) => (
                            <li
                                key={`activity-${log.id}-${log.timestamp}-${index}`}
                                className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-4 md:p-3 min-w-[280px] snap-center md:snap-none border border-[var(--border-color)] md:border-0 rounded-xl md:rounded-lg bg-[var(--bg-card-subtle-accent)] md:bg-transparent md:hover:bg-[var(--bg-card-subtle-accent)] transition-colors max-w-[80vw]"
                            >
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] rounded-lg flex items-center justify-center text-white">
                                        <Activity size={20} />
                                    </div>
                                    <div className="flex-1 md:hidden">
                                        <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                                            {log.assemblyName} Assembly
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {formatDateDDMMMYYYY(new Date(log.selectedDate))}
                                        </p>
                                    </div>
                                </div>

                                <div className="overflow-hidden w-full">
                                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate hidden md:block">
                                        {log.assemblyName} Assembly
                                    </p>

                                    {/* Mobile: Horizontal tags */}
                                    <div className="flex flex-wrap gap-2 mt-1 md:hidden">
                                        <span className="text-xs font-medium text-[var(--success-text)] bg-[var(--success-bg)]/10 px-2 py-0.5 rounded-full">
                                            GH₵ {log.totalTitheAmount.toLocaleString()}
                                        </span>
                                        <span className="text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                                            {log.titherCount} Tithers
                                        </span>
                                    </div>

                                    {/* Desktop: Inline Details */}
                                    <p className="text-xs text-[var(--text-secondary)] hidden md:block">
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
        </Container>
    );
};

export default RecentActivityList;
