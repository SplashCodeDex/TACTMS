
import React from 'react';
import { motion } from 'framer-motion';

interface PerformanceData {
    month: number;
    totalTithe: number;
    soulsWon: number;
}

interface DistrictTrendChartProps {
    performanceData: PerformanceData[];
}

const MotionPath = motion.path as React.FC<any>;
const MotionCircle = motion.circle as React.FC<any>;

const DistrictTrendChart: React.FC<DistrictTrendChartProps> = ({ performanceData }) => {
    const width = 800;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const maxTithe = Math.max(...performanceData.map(d => d.totalTithe), 0);
    const maxSouls = Math.max(...performanceData.map(d => d.soulsWon), 0);

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const getPath = (dataKey: 'totalTithe' | 'soulsWon', maxValue: number) => {
        if (maxValue === 0) return `M 0 ${chartHeight}`;
        let path = `M 0 ${chartHeight - (performanceData[0][dataKey] / maxValue) * chartHeight}`;
        performanceData.forEach((d, i) => {
            if (i > 0) {
                const x = (i / 11) * chartWidth;
                const y = chartHeight - (d[dataKey] / maxValue) * chartHeight;
                path += ` L ${x} ${y}`;
            }
        });
        return path;
    };

    const getAreaPath = (dataKey: 'totalTithe' | 'soulsWon', maxValue: number) => {
        const linePath = getPath(dataKey, maxValue);
        return `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
    };
    
    // Y-Axis for Tithe
    const yAxisTitheTicks = 5;
    const titheTickValues = Array.from({ length: yAxisTitheTicks + 1 }, (_, i) => Math.ceil(maxTithe / yAxisTitheTicks) * i);
    
    // Y-Axis for Souls Won
    const yAxisSoulsTicks = Math.min(5, maxSouls);
    const soulsTickValues = maxSouls > 0 ? Array.from({ length: yAxisSoulsTicks + 1 }, (_, i) => Math.round( (maxSouls / yAxisSoulsTicks) * i)) : [0];

    return (
        <div className="w-full overflow-x-auto">
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} aria-label="District performance trend chart">
                <defs>
                    <linearGradient id="titheAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary-accent-start)" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="var(--primary-accent-start)" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="soulsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--success-start)" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="var(--success-start)" stopOpacity="0"/>
                    </linearGradient>
                </defs>

                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Grid Lines */}
                    {titheTickValues.map(value => (
                        <line key={`grid-${value}`} x1="0" y1={chartHeight - (value / maxTithe) * chartHeight} x2={chartWidth} y2={chartHeight - (value / maxTithe) * chartHeight}
                              className="stroke-current text-[var(--border-color)]" strokeDasharray="3,3" />
                    ))}

                    {/* Tithe Path */}
                    <MotionPath d={getAreaPath('totalTithe', maxTithe)} fill="url(#titheAreaGradient)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} />
                    <MotionPath d={getPath('totalTithe', maxTithe)} fill="none" stroke="var(--primary-accent-start)" strokeWidth="2"
                                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }} />

                    {/* Souls Won Path */}
                    <MotionPath d={getAreaPath('soulsWon', maxSouls)} fill="url(#soulsAreaGradient)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}/>
                    <MotionPath d={getPath('soulsWon', maxSouls)} fill="none" stroke="var(--success-start)" strokeWidth="2"
                                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }} />

                    {/* Data Points */}
                    {performanceData.map((d, i) => (
                        <g key={`point-group-${i}`} transform={`translate(${(i / 11) * chartWidth}, 0)`}>
                            {d.totalTithe > 0 && 
                                <MotionCircle cy={chartHeight - (d.totalTithe / maxTithe) * chartHeight} r="4" fill="var(--primary-accent-start)"
                                              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, delay: 1.5 + i*0.05 }}>
                                    <title>GH₵ {d.totalTithe.toLocaleString()}</title>
                                </MotionCircle>
                            }
                             {d.soulsWon > 0 && 
                                <MotionCircle cy={chartHeight - (d.soulsWon / maxSouls) * chartHeight} r="4" fill="var(--success-start)"
                                              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, delay: 1.7 + i*0.05 }}>
                                    <title>{d.soulsWon} Souls Won</title>
                                </MotionCircle>
                            }
                        </g>
                    ))}


                    {/* Y Axis - Tithe */}
                    <line x1="0" y1="0" x2="0" y2={chartHeight} className="stroke-current text-[var(--border-color-light)]" />
                    {titheTickValues.map(value => (
                        <text key={`y-tick-tithe-${value}`} x="-10" y={chartHeight - (value / maxTithe) * chartHeight + 4} textAnchor="end" className="fill-current text-[var(--text-secondary)] text-xs">
                           {value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                        </text>
                    ))}
                    <text transform={`translate(${-margin.left + 20}, ${chartHeight / 2}) rotate(-90)`} textAnchor="middle" className="fill-current text-[var(--text-primary)] text-sm">
                        Total Tithe (GH₵)
                    </text>

                     {/* Y Axis - Souls */}
                    <line x1={chartWidth} y1="0" x2={chartWidth} y2={chartHeight} className="stroke-current text-[var(--border-color-light)]" />
                    {soulsTickValues.map(value => (
                        <text key={`y-tick-souls-${value}`} x={chartWidth + 10} y={chartHeight - (value / maxSouls) * chartHeight + 4} textAnchor="start" className="fill-current text-[var(--text-secondary)] text-xs">
                           {value}
                        </text>
                    ))}
                     <text transform={`translate(${chartWidth + margin.right - 15}, ${chartHeight / 2}) rotate(90)`} textAnchor="middle" className="fill-current text-[var(--text-primary)] text-sm">
                        Souls Won
                    </text>

                    {/* X Axis */}
                    <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} className="stroke-current text-[var(--border-color-light)]" />
                    {monthLabels.map((label, i) => (
                        <text key={`x-tick-${i}`} x={(i / 11) * chartWidth} y={chartHeight + 20} textAnchor="middle" className="fill-current text-[var(--text-secondary)] text-xs">
                            {label}
                        </text>
                    ))}
                </g>
            </svg>
             <div className="flex justify-center items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--primary-accent-start)]"></div>
                    <span className="text-[var(--text-secondary)]">Total Tithe</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--success-start)]"></div>
                    <span className="text-[var(--text-secondary)]">Souls Won</span>
                </div>
            </div>
        </div>
    );
};

export default DistrictTrendChart;
