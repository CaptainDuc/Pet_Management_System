import React, { forwardRef } from 'react';
import { X } from 'lucide-react';
import './Badge.css';

/**
 * PetCare Design System — Badge Component
 * Unified badge replacing:
 * - Status badges (appointment, order, payment)
 * - Role badges
 * - Tag labels
 * - Notification counters
 * - Landing page feature tags
 */

const Badge = forwardRef(function Badge(
  {
    children,
    variant = 'default',
    size = 'md',
    dot = false,
    removable = false,
    onRemove,
    className = '',
    'aria-label': ariaLabel,
    ...props
  },
  ref
) {
  const variantClasses = {
    default: 'badge--default',
    primary: 'badge--primary',
    secondary: 'badge--secondary',
    success: 'badge--success',
    warning: 'badge--warning',
    error: 'badge--error',
    info: 'badge--info',
    outline: 'badge--outline',
    ghost: 'badge--ghost',
  };

  const sizeClasses = {
    xs: 'badge--xs',
    sm: 'badge--sm',
    md: 'badge--md',
    lg: 'badge--lg',
  };

  const classNames = [
    'badge',
    variantClasses[variant],
    sizeClasses[size],
    dot ? 'badge--dot' : '',
    removable ? 'badge--removable' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove?.(e);
  };

  return (
    <span
      ref={ref}
      className={classNames}
      role={removable ? 'button' : 'status'}
      aria-label={ariaLabel || (removable ? `Remove ${children}` : undefined)}
      {...props}
    >
      {dot && <span className="badge__dot" aria-hidden="true" />}
      <span className="badge__text">{children}</span>
      {removable && (
        <button
          type="button"
          className="badge__remove"
          onClick={handleRemove}
          aria-label={`Remove ${children}`}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;

export const BADGE_VARIANTS = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info', 'outline', 'ghost'];
export const BADGE_SIZES = ['xs', 'sm', 'md', 'lg'];