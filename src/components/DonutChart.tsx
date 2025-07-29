import React from 'react';
import { motion } from 'framer-motion';

interface DonutChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const MotionCircle = motion.circle as React.FC<any>;
const MotionSpan = motion.span as React.FC<any>;

const DonutChart: React.FC<DonutChartProps> = ({
  percentage,
  size = 100,
  strokeWidth = 10,
  color,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colorVar = color || 'var(--primary-accent-start)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--bg-card-subtle-accent)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <MotionCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorVar}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'circOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <MotionSpan
            className="text-xl font-bold text-[var(--text-primary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
        >
            {Math.round(percentage)}%
        </MotionSpan>
      </div>
    </div>
  );
};

export default DonutChart;
