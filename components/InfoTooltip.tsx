
import React from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string | React.ReactNode;
  iconSize?: number;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, iconSize = 18, className, position = 'top' }) => {
  // Position classes can be expanded here based on the 'position' prop
  // For now, default top positioning is handled by global CSS
  return (
    <div className={`info-tooltip-container ${className || ''}`} tabIndex={0} role="tooltip">
      <Info size={iconSize} className="info-tooltip-icon text-[var(--text-muted)] hover:text-[var(--primary-accent-start)] transition-colors" />
      <div className="info-tooltip-content">
        {typeof text === 'string' ? <p className="text-sm">{text}</p> : text}
      </div>
    </div>
  );
};

export default InfoTooltip;
