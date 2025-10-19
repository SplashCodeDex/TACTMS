import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  variant?: "card" | "table" | "form" | "chart" | "chat" | "simple" | "tithe-list" | "member-card" | "dashboard";
  rows?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Enhanced skeleton loader using shadcn/ui Skeleton component
 * Provides TACTMS-specific loading states for better UX
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SkeletonLoader variant="chat" />
 *
 * // TACTMS-specific variants
 * <SkeletonLoader variant="tithe-list" rows={5} />
 * <SkeletonLoader variant="dashboard" />
 * <SkeletonLoader variant="member-card" />
 * ```
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = "chat",
  rows = 3,
  className,
  animated = true,
}) => {
  const renderVariant = () => {
    switch (variant) {
      case "card":
        return (
          <div className={cn("space-y-4 p-6 border rounded-lg", className)}>
            <Skeleton className="h-6 w-[250px]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        );

      case "tithe-list":
        return (
          <div className={cn("space-y-3", className)}>
            {/* Header row */}
            <div className="flex items-center space-x-4 p-4 border-b">
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
            {/* Data rows */}
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-[80px] rounded-full" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        );

      case "member-card":
        return (
          <div className={cn("space-y-4 p-6 border rounded-lg", className)}>
            <div className="flex items-center space-x-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-[80px] mb-2" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
              <div>
                <Skeleton className="h-4 w-[80px] mb-2" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            </div>
          </div>
        );

      case "dashboard":
        return (
          <div className={cn("space-y-6", className)}>
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="w-8 h-8 rounded" />
                  </div>
                  <Skeleton className="h-8 w-[120px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
              ))}
            </div>
            {/* Chart area */}
            <div className="p-6 border rounded-lg space-y-4">
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          </div>
        );

      case "table":
        return (
          <div className={cn("space-y-3", className)}>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-8 w-[60px] rounded-full" />
              </div>
            ))}
          </div>
        );

      case "form":
        return (
          <div className={cn("space-y-6 p-6 border rounded-lg", className)}>
            <Skeleton className="h-6 w-[200px]" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-[120px]" />
                <Skeleton className="h-10 w-[100px]" />
              </div>
            </div>
          </div>
        );

      case "chart":
        return (
          <div className={cn("space-y-4 p-6 border rounded-lg", className)}>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        );

      case "chat":
        return (
          <div className={cn("space-y-6 p-4", className)}>
            <div className="flex items-end gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="w-3/5">
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            </div>
            <div className="flex items-end gap-3 flex-row-reverse">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="w-1/2">
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="w-4/5">
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            </div>
          </div>
        );

      default:
        return <Skeleton className={cn("h-[200px] w-full", className)} />;
    }
  };

  return renderVariant();
};

export default SkeletonLoader;
