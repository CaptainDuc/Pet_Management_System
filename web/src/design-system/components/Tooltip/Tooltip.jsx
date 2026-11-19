import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

/**
 * PetCare Design System — Tooltip Component
 * Unified tooltip replacing:
 * - Icon tooltips
 * - Truncated text tooltips
 * - Form field hints
 * - Action button hints
 * - Data point tooltips
 */

const Tooltip = forwardRef(function Tooltip(
  {
    children,
    content,
    position = 'top',
    variant = 'default',
    size = 'md',
    delay = 200,
    hideDelay = 100,
    offset = 8,
    open = false,
    onOpenChange,
    className = '',
    'aria-label': ariaLabel,
    ...props
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [tooltipRect, setTooltipRect] = useState({});
  const timeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const controlled = open !== undefined;

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      onOpenChange?.(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      onOpenChange?.(false);
    }, hideDelay);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isOpen) {
      hideTooltip();
      triggerRef.current?.focus();
    }
  };

  useEffect(() => {
    if (controlled) {
      setIsOpen(open);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [open, controlled]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const positionClasses = {
    top: 'tooltip--top',
    bottom: 'tooltip--bottom',
    left: 'tooltip--left',
    right: 'tooltip--right',
    'top-start': 'tooltip--top-start',
    'top-end': 'tooltip--top-end',
    'bottom-start': 'tooltip--bottom-start',
    'bottom-end': 'tooltip--bottom-end',
    'left-start': 'tooltip--left-start',
    'left-end': 'tooltip--left-end',
    'right-start': 'tooltip--right-start',
    'right-end': 'tooltip--right-end',
  };

  const variantClasses = {
    default: 'tooltip--default',
    info: 'tooltip--info',
    warning: 'tooltip--warning',
    error: 'tooltip--error',
    success: 'tooltip--success',
  };

  const sizeClasses = {
    sm: 'tooltip--sm',
    md: 'tooltip--md',
    lg: 'tooltip--lg',
  };

  const tooltipClassNames = [
    'tooltip',
    positionClasses[position],
    variantClasses[variant],
    sizeClasses[size],
    isOpen ? 'tooltip--open' : '',
    className,
  ].filter(Boolean).join(' ');

  const arrowPositionStyles = {
    top: { bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    bottom: { top: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    left: { right: '-4px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
    right: { left: '-4px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
    'top-start': { bottom: '-4px', left: '12px', transform: 'rotate(45deg)' },
    'top-end': { bottom: '-4px', right: '12px', transform: 'rotate(45deg)' },
    'bottom-start': { top: '-4px', left: '12px', transform: 'rotate(45deg)' },
    'bottom-end': { top: '-4px', right: '12px', transform: 'rotate(45deg)' },
    'left-start': { right: '-4px', top: '12px', transform: 'rotate(45deg)' },
    'left-end': { right: '-4px', bottom: '12px', transform: 'rotate(45deg)' },
    'right-start': { left: '-4px', top: '12px', transform: 'rotate(45deg)' },
    'right-end': { left: '-4px', bottom: '12px', transform: 'rotate(45deg)' },
  };

  const tooltipContent = isOpen && content ? (
    <div
      ref={tooltipRef}
      className={tooltipClassNames}
      role="tooltip"
      id={ariaLabel ? `${ariaLabel}-tooltip` : undefined}
      style={{
        ...tooltipRect,
        ...(position.startsWith('top') && { marginBottom: offset }),
        ...(position.startsWith('bottom') && { marginTop: offset }),
        ...(position.startsWith('left') && { marginRight: offset }),
        ...(position.startsWith('right') && { marginLeft: offset }),
      }}
    >
      <div className="tooltip__content">
        {content}
      </div>
      <div
        className="tooltip__arrow"
        style={arrowPositionStyles[position]}
        aria-hidden="true"
      />
    </div>
  ) : null;

  const triggerProps = {
    ref: triggerRef,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    onTouchStart: showTooltip,
    onTouchEnd: hideTooltip,
    'aria-describedby': isOpen && ariaLabel ? `${ariaLabel}-tooltip` : undefined,
    ...props,
  };

  const child = React.Children.only(children);

  return (
    <>
      {React.cloneElement(child, triggerProps)}
      {createPortal(tooltipContent, document.body)}
    </>
  );
});

Tooltip.displayName = 'Tooltip';

export default Tooltip;

export const TOOLTIP_POSITIONS = [
  'top', 'bottom', 'left', 'right',
  'top-start', 'top-end',
  'bottom-start', 'bottom-end',
  'left-start', 'left-end',
  'right-start', 'right-end',
];
export const TOOLTIP_VARIANTS = ['default', 'info', 'warning', 'error', 'success'];
export const TOOLTIP_SIZES = ['sm', 'md', 'lg'];