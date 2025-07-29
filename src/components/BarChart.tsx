import React from 'react';
import { motion } from 'framer-motion';

export interface ChartData {
  label: string;
  count: number;
}

interface BarChartProps {
  data: ChartData[];
}

const MotionRect = motion.rect as React.FC<any>;
const MotionText = motion.text as React.FC<any>;

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-[var(--text-muted)] text-sm">No chart data available.</p>;
  }

  const chartHeight = 220;
  const barWidth = 35;
  const barMargin = 20;
  const chartWidth = data.length * (barWidth + barMargin);
  const maxValue = Math.max(...data.map(d => d.count), 0);

  return (
    <div className="bar-chart-container w-full overflow-x-auto pb-4">
      <svg width={chartWidth} height={chartHeight} aria-label="Contribution Distribution Chart">
        <g transform="translate(0, 10)">
          {data.map((d, i) => {
            const barHeight = maxValue > 0 ? (d.count / maxValue) * (chartHeight - 40) : 0;
            return (
              <g key={d.label} transform={`translate(${i * (barWidth + barMargin)}, 0)`}>
                <title>{`${d.label}: ${d.count} members`}</title>
                <MotionRect
                  className="bar"
                  x={0}
                  y={chartHeight - 30 - barHeight}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  rx="4"
                  ry="4"
                  initial={{ height: 0, y: chartHeight - 30 }}
                  animate={{ height: barHeight, y: chartHeight - 30 - barHeight }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                />
                <MotionText
                  className="bar-value"
                  x={barWidth / 2}
                  y={chartHeight - 35 - barHeight}
                  textAnchor="middle"
                  initial={{ opacity: 0, y: chartHeight - 30 }}
                  animate={{ opacity: 1, y: chartHeight - 35 - barHeight }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.1 + 0.3 }}
                >
                  {d.count}
                </MotionText>
                <text
                  className="axis-text"
                  x={barWidth / 2}
                  y={chartHeight - 15}
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </g>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-accent-hover-start)" />
            <stop offset="100%" stopColor="var(--primary-accent-start)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default BarChart;
