import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardSkeletonProps {
  className?: string;
  showCharts?: boolean;
  showStats?: boolean;
}

/**
 * TACTMS-specific skeleton for dashboard loading states
 * Provides realistic loading state for the main dashboard
 */
export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  className,
  showCharts = true,
  showStats = true,
}) => {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
        <div className="flex items-center space-x-3">
          <Skeleton className="w-32 h-10 rounded" />
          <Skeleton className="w-24 h-10 rounded" />
        </div>
      </div>

      {/* Stats Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="w-8 h-8 rounded" />
              </div>
              <Skeleton className="h-8 w-[140px]" />
              <Skeleton className="h-3 w-[100px]" />
            </div>
          ))}
        </div>
      )}

      {/* Chart Sections */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Chart */}
          <div className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-[300px] w-full" />
          </div>

          {/* Secondary Chart */}
          <div className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-6 w-[180px]" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="p-6 border rounded-lg space-y-4">
        <Skeleton className="h-6 w-[160px]" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
              <Skeleton className="h-6 w-[80px] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;