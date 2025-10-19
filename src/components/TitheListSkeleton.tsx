import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TitheListSkeletonProps {
  rows?: number;
  showHeaders?: boolean;
  className?: string;
}

/**
 * Skeleton loader for tithe list tables
 */
export const TitheListSkeleton: React.FC<TitheListSkeletonProps> = ({
  rows = 8,
  showHeaders = true,
  className,
}) => {
  return (
    <div className={`space-y-4 ${className || ""}`}>
      {showHeaders && (
        <div className="grid grid-cols-12 gap-4 p-4 border-b">
          <Skeleton className="h-4 w-[60px] col-span-1" />
          <Skeleton className="h-4 w-[120px] col-span-2" />
          <Skeleton className="h-4 w-[100px] col-span-2" />
          <Skeleton className="h-4 w-[80px] col-span-1" />
          <Skeleton className="h-4 w-[100px] col-span-2" />
          <Skeleton className="h-4 w-[80px] col-span-1" />
          <Skeleton className="h-4 w-[60px] col-span-1" />
          <Skeleton className="h-4 w-[80px] col-span-2" />
        </div>
      )}

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0">
          <Skeleton className="h-4 w-[60px] col-span-1" />
          <Skeleton className="h-4 w-[120px] col-span-2" />
          <Skeleton className="h-4 w-[100px] col-span-2" />
          <Skeleton className="h-4 w-[80px] col-span-1" />
          <Skeleton className="h-4 w-[100px] col-span-2" />
          <Skeleton className="h-4 w-[80px] col-span-1" />
          <Skeleton className="h-4 w-[60px] col-span-1" />
          <Skeleton className="h-8 w-[80px] col-span-2 rounded-full" />
        </div>
      ))}
    </div>
  );
};