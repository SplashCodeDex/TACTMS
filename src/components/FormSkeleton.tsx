import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FormSkeletonProps {
  fields?: number;
  showSubmitButton?: boolean;
  showTitle?: boolean;
  className?: string;
  layout?: "vertical" | "horizontal" | "grid";
}

/**
 * TACTMS-specific skeleton for form loading states
 * Provides realistic loading state for various form types
 */
export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  showSubmitButton = true,
  showTitle = true,
  className,
  layout = "vertical",
}) => {
  const getFieldLayout = () => {
    switch (layout) {
      case "horizontal":
        return "grid grid-cols-2 gap-4";
      case "grid":
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
      default:
        return "space-y-4";
    }
  };

  return (
    <div className={cn("space-y-6 p-6 border rounded-lg", className)}>
      {/* Form Title */}
      {showTitle && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
      )}

      {/* Form Fields */}
      <div className={getFieldLayout()}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Text Area Field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-32 w-full" />
      </div>

      {/* Submit Button */}
      {showSubmitButton && (
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      )}
    </div>
  );
};

export default FormSkeleton;