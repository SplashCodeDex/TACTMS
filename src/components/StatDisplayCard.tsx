import React from "react";

interface StatDisplayCardProps {
  icon: React.ReactElement<{ size?: string | number }>;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  valueClassName?: string;
}

const StatDisplayCard: React.FC<StatDisplayCardProps> = ({
  icon,
  label,
  value,
  subValue,
  valueClassName,
}) => {
  return (
    <div className="flex items-center p-4 rounded-xl shadow-lg transition-all duration-300 ease-in-out bg-[var(--bg-card-subtle-accent)] border border-[var(--border-color)] card-glow-on-hover">
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-white shadow-md mr-4`}
      >
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className="overflow-hidden">
        <p
          className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium truncate"
          title={label}
        >
          {label}
        </p>
        <div
          className={`text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate ${valueClassName || ""}`}
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </div>
        {subValue && (
          <p
            className="text-xs text-[var(--text-secondary)] mt-0.5 truncate"
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
