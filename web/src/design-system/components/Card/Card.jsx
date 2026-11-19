import React, { forwardRef } from 'react';
import './Card.css';

/**
 * PetCare Design System — Card Component
 * Unified card replacing:
 * - Landing page feature cards
 * - Dashboard stat cards
 * - AdminConsole data cards
 * - Pet/profile cards
 * - Appointment cards
 */

const Card = forwardRef(function Card(
  {
    children,
    variant = 'default',
    padding = 'md',
    hoverable = false,
    bordered = true,
    className = '',
    as: Component = 'article',
    ...props
  },
  ref
) {
  const variantClasses = {
    default: 'card--default',
    elevated: 'card--elevated',
    outlined: 'card--outlined',
    filled: 'card--filled',
    ghost: 'card--ghost',
  };

  const paddingClasses = {
    none: 'card--padding-none',
    sm: 'card--padding-sm',
    md: 'card--padding-md',
    lg: 'card--padding-lg',
    xl: 'card--padding-xl',
  };

  const classNames = [
    'card',
    variantClasses[variant],
    paddingClasses[padding],
    hoverable ? 'card--hoverable' : '',
    !bordered ? 'card--no-border' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component ref={ref} className={classNames} {...props}>
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

// Sub-components
const CardHeader = forwardRef(function CardHeader({ children, className = '', ...props }, ref) {
  return (
    <header ref={ref} className={`card__header ${className}`} {...props}>
      {children}
    </header>
  );
});
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(function CardTitle({ children, className = '', as: Component = 'h3', ...props }, ref) {
  return (
    <Component ref={ref} className={`card__title ${className}`} {...props}>
      {children}
    </Component>
  );
});
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef(function CardDescription({ children, className = '', ...props }, ref) {
  return (
    <p ref={ref} className={`card__description ${className}`} {...props}>
      {children}
    </p>
  );
});
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef(function CardContent({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`card__content ${className}`} {...props}>
      {children}
    </div>
  );
});
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef(function CardFooter({ children, className = '', ...props }, ref) {
  return (
    <footer ref={ref} className={`card__footer ${className}`} {...props}>
      {children}
    </footer>
  );
});
CardFooter.displayName = 'CardFooter';

const CardMedia = forwardRef(function CardMedia({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`card__media ${className}`} {...props}>
      {children}
    </div>
  );
});
CardMedia.displayName = 'CardMedia';

const CardAction = forwardRef(function CardAction({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`card__action ${className}`} {...props}>
      {children}
    </div>
  );
});
CardAction.displayName = 'CardAction';

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Media = CardMedia;
Card.Action = CardAction;

export default Card;

export const CARD_VARIANTS = ['default', 'elevated', 'outlined', 'filled', 'ghost'];
export const CARD_PADDING = ['none', 'sm', 'md', 'lg', 'xl'];