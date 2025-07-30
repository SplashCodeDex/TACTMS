import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading,
  className,
  disabled,
  fullWidth,
  ...props
}, ref) => {
  const baseStyle =
    `font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)] focus-visible:ring-opacity-70 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg`;

  const borderRadius = 'rounded-lg';

  const variantStyles = {
    primary: `bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-[var(--text-on-accent)] focus-visible:ring-[var(--primary-accent-start)] hover:opacity-95`,
    secondary: `bg-gradient-to-r from-[var(--secondary-accent-start)] to-[var(--secondary-accent-end)] text-[var(--text-on-accent)] focus-visible:ring-[var(--secondary-accent-start)]`,
    danger: `bg-gradient-to-r from-[var(--danger-start)] to-[var(--danger-end)] text-[var(--text-on-accent)] focus-visible:ring-[var(--danger-start)] hover:opacity-90`,
    ghost: `bg-transparent hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-gray-500 shadow-none`,
    outline: `bg-transparent border border-[var(--primary-accent-start)] text-[var(--primary-accent-start)] hover:bg-[var(--primary-accent-start)]/10 focus-visible:ring-[var(--primary-accent-start)] shadow-none`,
    subtle: `bg-[var(--bg-card-subtle-accent)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-gray-500 border border-[var(--border-color)] shadow-none`,
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2 text-sm',
    lg: 'px-7 py-2.5 text-base',
    icon: 'p-2.5 text-sm', // For icon-only buttons
  };
  
  const widthStyle = fullWidth ? 'w-full' : '';

  const disabledStyle = 'opacity-40 cursor-not-allowed !shadow-none hover:!transform-none';

  const currentSizeStyle = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      ref={ref}
      className={`${baseStyle} ${variantStyles[variant]} ${currentSizeStyle} ${borderRadius} ${
        disabled || isLoading ? disabledStyle : ''
      } ${widthStyle} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-5 w-5 text-current"
          style={ children ? { marginRight: '0.5rem', marginLeft: '-0.25rem'} : {}}
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {leftIcon && !isLoading && <span className={children ? "mr-2 flex-shrink-0" : "flex-shrink-0"}>{React.cloneElement(leftIcon as any, { size: size === 'sm' ? 16 : (size === 'icon' ? 20 : 18) })}</span>}
      {children && <span className="flex-grow-0">{children}</span>}
      {rightIcon && !isLoading && <span className={children ? "ml-2 flex-shrink-0" : "flex-shrink-0"}>{React.cloneElement(rightIcon as any, { size: size === 'sm' ? 16 : (size === 'icon' ? 20 : 18) })}</span>}
    </button>
  );
});

Button.displayName = 'Button';
export default React.memo(Button);