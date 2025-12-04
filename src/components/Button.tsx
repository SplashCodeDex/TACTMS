import React from "react";
import { LucideProps } from "lucide-react";
import { Button as UIButton, type ButtonProps as UIButtonProps } from "./ui/button";
import { cn } from "@/lib/utils";

// Backward-compatible Button props, adapted to the design-system Button underneath
interface LegacyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "subtle";
  size?: "sm" | "md" | "lg" | "icon";
  leftIcon?: React.ReactElement<LucideProps>;
  rightIcon?: React.ReactElement<LucideProps>;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const mapVariant = (
  v: LegacyButtonProps["variant"] | undefined,
): UIButtonProps["variant"] => {
  switch (v) {
    case "primary":
      return "default";
    case "danger":
      return "destructive";
    case "secondary":
      return "secondary";
    case "ghost":
      return "ghost";
    case "outline":
      return "outline";
    case "subtle":
      // Approximate with secondary to keep subdued look
      return "secondary";
    default:
      return "default";
  }
};

const mapSize = (
  s: LegacyButtonProps["size"] | undefined,
): UIButtonProps["size"] => {
  switch (s) {
    case "sm":
      return "sm";
    case "lg":
      return "lg";
    case "icon":
      return "icon";
    case "md":
    default:
      return "default";
  }
};

const Button = React.forwardRef<HTMLButtonElement, LegacyButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      isLoading,
      className,
      disabled,
      fullWidth,
      ...props
    },
    ref,
  ) => {
    return (
      <UIButton
        ref={ref}
        variant={mapVariant(variant)}
        size={mapSize(size)}
        className={cn(
          fullWidth ? "w-full" : undefined,
          // Restore legacy visual identity for color-rich variants
          variant === "primary" && "bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-[var(--text-on-accent)] hover:opacity-95",
          variant === "secondary" && "bg-gradient-to-r from-[var(--secondary-accent-start)] to-[var(--secondary-accent-end)] text-[var(--text-on-accent)]",
          variant === "danger" && "bg-gradient-to-r from-[var(--danger-start)] to-[var(--danger-end)] text-[var(--text-on-accent)] hover:opacity-90",
          variant === "subtle" && "bg-[var(--bg-card-subtle-accent)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]",
          // Shape/feel closer to legacy
          "rounded-lg",
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-5 w-5 text-current"
            style={children ? { marginRight: "0.5rem", marginLeft: "-0.25rem" } : {}}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {leftIcon && !isLoading && (
          <span className={children ? "mr-2 flex-shrink-0" : "flex-shrink-0"}>
            {React.cloneElement(leftIcon as any, {
              size: size === "sm" ? 16 : size === "icon" ? 20 : 18,
            })}
          </span>
        )}
        {children && <span className="flex-grow-0">{children}</span>}
        {rightIcon && !isLoading && (
          <span className={children ? "ml-2 flex-shrink-0" : "flex-shrink-0"}>
            {React.cloneElement(rightIcon as any, {
              size: size === "sm" ? 16 : size === "icon" ? 20 : 18,
            })}
          </span>
        )}
      </UIButton>
    );
  },
);

Button.displayName = "Button";
export default React.memo(Button);
