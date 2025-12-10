import React from "react";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import StatDisplayCard from "../StatDisplayCard";
import AnimatedNumber from "../AnimatedNumber";

interface DashboardStatsGridProps {
    ytdTithe: number;
    ytdSouls: number;
    totalMembers: number;
    currentMonth: string;
}

const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({
    ytdTithe,
    ytdSouls,
    totalMembers,
    currentMonth,
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <StatDisplayCard
                icon={<DollarSign />}
                label={`Monthly Tithe (${currentMonth})`}
                value={
                    <>
                        GH₵{" "}
                        <AnimatedNumber
                            n={ytdTithe}
                            formatter={(n) =>
                                n.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })
                            }
                        />
                    </>
                }
            />
            <StatDisplayCard
                icon={<TrendingUp />}
                label={`Monthly Souls Won`}
                value={<AnimatedNumber n={ytdSouls} />}
            />
            <StatDisplayCard
                icon={<Users />}
                label="Total Members on Record"
                value={<AnimatedNumber n={totalMembers} />}
            />
        </div>
    );
};

export default DashboardStatsGrid;
