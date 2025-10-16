import React from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  text: string | React.ReactNode;
  iconSize?: number;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const getTooltipPositionClass = (position: InfoTooltipProps["position"]) => {
  switch (position) {
    case "top":
      return "info-tooltip-top";
    case "bottom":
      return "info-tooltip-bottom";
    case "left":
      return "info-tooltip-left";
    case "right":
      return "info-tooltip-right";
    default:
      return "info-tooltip-top"; // Default to top
  }
};

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  text,
  iconSize = 18,
  className,
  position = "top", // Set default position
}) => {
  const positionClass = getTooltipPositionClass(position);

  return (
    <div
      className={`info-tooltip-container ${className || ""}`}
      tabIndex={0}
      role="tooltip"
    >
      <Info
        size={iconSize}
        className="info-tooltip-icon text-[var(--text-muted)] hover:text-[var(--primary-accent-start)] transition-colors"
      />
      <div className={`info-tooltip-content ${positionClass}`}>
        {typeof text === "string" ? <p className="text-sm">{text}</p> : text}
      </div>
    </div>
  );
};

export default InfoTooltip;
