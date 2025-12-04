import React from "react";
import { TrendingUp } from "lucide-react";
import BarChart from "../BarChart";

interface WeeklyTrendChartProps {
    data: { label: string; count: number }[];
}

const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({ data }) => {
    const hasNoData = data.every((d) => d.count === 0);

    return (
        <section className="lg:col-span-3 content-card relative">
            <h2 className="section-heading">
                <TrendingUp size={22} className="mr-3 icon-primary" />
                Weekly Tithe Trend
            </h2>
            <p className="text-sm text-center py-4 text-[var(--text-muted)]">
                Showing data for the last 6 weeks.
            </p>
            <BarChart data={data} />
            {hasNoData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-card)]/50 backdrop-blur-sm rounded-xl">
                    <TrendingUp size={32} className="mb-2 opacity-50" />
                    <p>No tithe data recorded recently</p>
                </div>
            )}
        </section>
    );
};

export default WeeklyTrendChart;
