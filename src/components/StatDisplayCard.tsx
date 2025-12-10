import React from "react";

interface StatDisplayCardProps {
  icon: React.ReactElement<{ size?: string | number }>;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  valueClassName?: string;
  ariaLabel?: string;
}

const StatDisplayCard: React.FC<StatDisplayCardProps> = ({
  icon,
  label,
  value,
  subValue,
  valueClassName,
  ariaLabel,
}) => {
  return (
    <div
      className="flex items-center p-4 rounded-2xl shadow-lg transition-all duration-300 ease-in-out bg-[var(--bg-card-subtle-accent)] border border-[var(--border-color)] card-glow-on-hover"
      role="group"
      aria-label={ariaLabel}
    >
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-white shadow-md mr-4`}
      >
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium break-words whitespace-normal"
          title={label}
        >
          {label}
        </p>
        <div
          className={`text-lg sm:text-xl font-bold text-[var(--text-primary)] break-words whitespace-normal ${valueClassName || ""}`}
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </div>
        {subValue && (
          <p
            className="text-xs text-[var(--text-secondary)] mt-0.5 break-words whitespace-normal"
            title={subValue}
          >
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(StatDisplayCard);
