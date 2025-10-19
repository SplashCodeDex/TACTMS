import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonLoaderProps {
  variant?: "card" | "table" | "form" | "chart" | "chat" | "simple";
  rows?: number;
  className?: string;
}

/**
 * Enhanced skeleton loader using shadcn/ui Skeleton component
 * @deprecated Consider using Skeleton component directly for better control
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = "chat",
  rows = 3,
  className,
}) => {
  const renderVariant = () => {
    switch (variant) {
      case "card":
        return (
          <div className={`space-y-4 ${className || ""}`}>
            <Skeleton className="h-6 w-[250px]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        );

      case "table":
        return (
          <div className={`space-y-3 ${className || ""}`}>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
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
          <div className={`space-y-4 ${className || ""}`}>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        );

      case "chart":
        return (
          <div className={`space-y-4 ${className || ""}`}>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        );

      case "chat":
        return (
          <div className={`space-y-6 p-4 ${className || ""}`}>
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
        return <Skeleton className={`h-[200px] w-full ${className || ""}`} />;
    }
  };

  return renderVariant();
};

export default SkeletonLoader;
