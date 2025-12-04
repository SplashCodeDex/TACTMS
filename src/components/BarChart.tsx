import React from "react";
import { motion } from "framer-motion";
import { ChartData } from "../types";

interface BarChartProps {
  data: ChartData[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="w-full h-full flex items-end gap-2 pt-4">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="relative w-full flex justify-center items-end h-[120px]">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : "0%" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="w-full max-w-[20px] bg-blue-500 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity"
            >
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {item.count}
              </div>
            </motion.div>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] truncate w-full text-center" title={item.label}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BarChart;
