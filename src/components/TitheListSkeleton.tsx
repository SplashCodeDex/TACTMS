import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TitheListSkeletonProps {
  rows?: number;
  className?: string;
  showHeader?: boolean;
}

/**
 * TACTMS-specific skeleton for tithe list tables
 * Provides realistic loading state for tithe data tables
 */
export const TitheListSkeleton: React.FC<TitheListSkeletonProps> = ({
  rows = 5,
  className,
  showHeader = true,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Table Header */}
      {showHeader && (
        <div className="flex items-center space-x-4 p-4 border-b bg-muted/30">
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      )}

      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-8 w-[80px] rounded-full" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-8 w-[80px] rounded" />
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between p-4 border-t">
        <Skeleton className="h-4 w-[100px]" />
        <div className="flex items-center space-x-2">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded bg-primary" />
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
  );
};

export default TitheListSkeleton;