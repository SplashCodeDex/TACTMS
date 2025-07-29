
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text, className }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-[3px]',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className || ''}`}>
      <div
        className={`${sizeClasses[size]} border-t-transparent border-[var(--primary-accent-start)] rounded-full animate-spin`}
      ></div>
      {text && <p className="mt-4 text-[var(--text-secondary)]">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
