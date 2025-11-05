import React from "react";
import { motion } from "framer-motion";

export interface ChartData {
  label: string;
  count: number;
}

interface BarChartProps {
  data: ChartData[];
  chartHeight?: number;
  barWidth?: number;
  barMargin?: number;
}

const MotionRect = motion.rect;
const MotionText = motion.text;

const BarChart: React.FC<BarChartProps> = ({
  data,
  chartHeight = 220,
}) => {
  const chartWidth = 1000; // A fixed width for the viewBox coordinate system
  const totalBarSpace = chartWidth / data.length;
  const barWidth = totalBarSpace * 0.6; // 60% of the space for the bar
  const barMargin = totalBarSpace * 0.4; // 40% for margin

  const maxValue = Math.max(...data.map((d) => d.count), 0);
  const bottomPadding = 45; // Increased padding for labels

  return (
    <div className="bar-chart-container w-full overflow-x-auto pb-4">
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        aria-label="Contribution Distribution Chart"
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform="translate(0, 10)">
          {data.map((d, i) => {
            const barHeight =
              maxValue > 0 ? (d.count / maxValue) * (chartHeight - bottomPadding - 10) : 0;
            return (
              <g
                key={d.label}
                transform={`translate(${i * totalBarSpace + barMargin / 2}, 0)`}
              >
                <title>{`${d.label}: ${d.count} members`}</title>
                <MotionRect
                  className="bar"
                  x={0}
                  y={chartHeight - bottomPadding - barHeight}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  rx="4"
                  ry="4"
                  initial={{ height: 0, y: chartHeight - bottomPadding }}
                  animate={{
                    height: barHeight,
                    y: chartHeight - bottomPadding - barHeight,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                    delay: i * 0.1,
                  }}
                />
                <MotionText
                  className="bar-value"
                  x={barWidth / 2}
                  y={chartHeight - bottomPadding - 5 - barHeight}
                  textAnchor="middle"
                  initial={{ opacity: 0, y: chartHeight - bottomPadding }}
                  animate={{ opacity: 1, y: chartHeight - bottomPadding - 5 - barHeight }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                    delay: i * 0.1 + 0.3,
                  }}
                >
                  {d.count}
                </MotionText>
                <text
                  className="axis-text"
                  x={barWidth / 2}
                  y={chartHeight - bottomPadding + 15}
                  textAnchor="middle"
                >
                  {d.label.startsWith("Week of ") ? (
                    <>
                      <tspan x={barWidth / 2} dy="-0.3em">
                        {"Week of"}
                      </tspan>
                      <tspan x={barWidth / 2} dy="1.2em">
                        {d.label.substring(8)}
                      </tspan>
                    </>
                  ) : (
                    d.label
                  )}
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
