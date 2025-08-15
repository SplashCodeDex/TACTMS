import React from "react";
import { Check } from "lucide-react";

interface CheckboxButtonProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  size?: "sm" | "md";
}

const CheckboxButton: React.FC<CheckboxButtonProps> = ({
  label,
  checked,
  onChange,
  id,
  size = "md",
}) => {
  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs", // Adjusted padding for better feel
    md: "px-4 py-2 text-sm", // Adjusted padding
  };
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${sizeStyles[size]} border rounded-lg font-medium transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)] focus-visible:ring-[var(--primary-accent-start)] btn-animated
        ${
          checked
            ? "bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-[var(--text-on-accent)] border-transparent shadow-md hover:opacity-95"
            : "bg-[var(--input-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card-subtle-accent)] hover:border-[var(--border-color-light)] hover:text-[var(--text-primary)]"
        }`}
    >
      <div className="flex items-center justify-center">
        {checked && (
          <Check
            size={size === "sm" ? 14 : 16}
            className="mr-1.5 text-white/90"
          />
        )}
        {!checked && (
          <span
            className={`mr-2 ${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} rounded-full border-2 border-[var(--text-muted)] inline-block bg-transparent`}
          ></span>
        )}
        {label}
      </div>
    </button>
  );
};

export default React.memo(CheckboxButton);
