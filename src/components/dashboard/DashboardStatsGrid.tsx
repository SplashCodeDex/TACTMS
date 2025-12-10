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
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:pb-0 md:mx-0 md:px-0">
            <div className="min-w-[85%] snap-center md:min-w-0">
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
            </div>
            <div className="min-w-[85%] snap-center md:min-w-0">
                <StatDisplayCard
                    icon={<TrendingUp />}
                    label={`Monthly Souls Won`}
                    value={<AnimatedNumber n={ytdSouls} />}
                />
            </div>
            <div className="min-w-[85%] snap-center md:min-w-0">
                <StatDisplayCard
                    icon={<Users />}
                    label="Total Members on Record"
                    value={<AnimatedNumber n={totalMembers} />}
                />
            </div>
        </div>
    );
};

export default DashboardStatsGrid;
