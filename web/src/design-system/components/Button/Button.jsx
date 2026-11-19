import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

/**
 * PetCare Design System — Button Component
 * Unified button replacing:
 * - SubmitButton (auth)
 * - Landing page CTAs
 * - Dashboard action buttons
 * - AdminConsole buttons
 * - Modal actions
 */

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    className = '',
    type = 'button',
    onClick,
    'aria-label': ariaLabel,
    ...props
  },
  ref
) {
  const variantClasses = {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    outline: 'btn--outline',
    ghost: 'btn--ghost',
    danger: 'btn--danger',
    success: 'btn--success',
    warning: 'btn--warning',
    link: 'btn--link',
  };

  const sizeClasses = {
    xs: 'btn--xs',
    sm: 'btn--sm',
    md: 'btn--md',
    lg: 'btn--lg',
    xl: 'btn--xl',
  };

  const widthClass = fullWidth ? 'btn--full-width' : '';

  const classNames = [
    'btn',
    variantClasses[variant],
    sizeClasses[size],
    widthClass,
    loading ? 'btn--loading' : '',
    disabled ? 'btn--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  const showLeftIcon = leftIcon && !loading;
  const showRightIcon = rightIcon && !loading;

  const content = loading ? (
    <span className="btn__spinner" aria-hidden="true">
      <Loader2 className="btn__spinner-icon" size={16} strokeWidth={2.5} />
    </span>
  ) : (
    [
      showLeftIcon && <span key="left" className="btn__icon btn__icon--left" aria-hidden="true">{leftIcon}</span>,
      <span key="text" className="btn__text">{children}</span>,
      showRightIcon && <span key="right" className="btn__icon btn__icon--right" aria-hidden="true">{rightIcon}</span>,
    ]
  );

  return (
    <button
      ref={ref}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      onClick={handleClick}
      {...props}
    >
      {content}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

// Re-export types for consumers
export const BUTTON_VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'warning', 'link'];
export const BUTTON_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];