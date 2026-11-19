import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Menu } from 'lucide-react';
import './Sidebar.css';

/**
 * PetCare Design System — Sidebar Component
 * Unified sidebar replacing:
 * - AdminConsole navigation sidebar
 * - Dashboard sidebar
 * - Mobile navigation drawer
 * - Settings panels
 */

const Sidebar = forwardRef(function Sidebar(
  {
    isOpen = false,
    onClose,
    children,
    position = 'left',
    variant = 'permanent',
    width = 'md',
    collapsible = false,
    collapsed = false,
    onCollapseChange,
    header,
    footer,
    className = '',
    'aria-label': ariaLabel = 'Sidebar navigation',
    ...props
  },
  ref
) {
  const sidebarRef = useRef(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (variant === 'drawer') {
      setIsMobileOpen(isOpen);
      if (isOpen) {
        document.body.style.overflow = 'hidden';
        document.body.setAttribute('data-sidebar-open', 'true');
      } else {
        document.body.style.overflow = '';
        document.body.removeAttribute('data-sidebar-open');
      }
      return () => {
        document.body.style.overflow = '';
        document.body.removeAttribute('data-sidebar-open');
      };
    }
  }, [isOpen, variant]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && variant === 'drawer' && isMobileOpen) {
      onClose?.();
    }
  };

  useEffect(() => {
    if (variant === 'drawer') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [variant, isMobileOpen]);

  const widthClasses = {
    sm: 'sidebar--width-sm',
    md: 'sidebar--width-md',
    lg: 'sidebar--width-lg',
    xl: 'sidebar--width-xl',
  };

  const variantClasses = {
    permanent: 'sidebar--permanent',
    persistent: 'sidebar--persistent',
    drawer: 'sidebar--drawer',
  };

  const positionClasses = {
    left: 'sidebar--left',
    right: 'sidebar--right',
  };

  const overlayClassNames = [
    'sidebar__overlay',
    positionClasses[position],
    isMobileOpen ? 'sidebar__overlay--open' : '',
  ].filter(Boolean).join(' ');

  const sidebarClassNames = [
    'sidebar',
    variantClasses[variant],
    positionClasses[position],
    widthClasses[width],
    collapsible && collapsed ? 'sidebar--collapsed' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleOverlayClick = () => {
    if (variant === 'drawer') {
      onClose?.();
    }
  };

  const renderSidebar = () => (
    <aside
      ref={sidebarRef}
      className={sidebarClassNames}
      role="navigation"
      aria-label={ariaLabel}
      {...props}
    >
      {header && (
        <header className="sidebar__header">
          {header}
        </header>
      )}

      <nav className="sidebar__nav" role="navigation">
        {children}
      </nav>

      {footer && (
        <footer className="sidebar__footer">
          {footer}
        </footer>
      )}

      {collapsible && variant !== 'drawer' && (
        <button
          type="button"
          className={`sidebar__collapse-btn ${collapsed ? 'sidebar__collapse-btn--collapsed' : ''}`}
          onClick={() => onCollapseChange?.(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {position === 'left' ? (
            collapsed ? <ChevronRight size={20} strokeWidth={2.5} /> : <ChevronLeft size={20} strokeWidth={2.5} />
          ) : (
            collapsed ? <ChevronLeft size={20} strokeWidth={2.5} /> : <ChevronRight size={20} strokeWidth={2.5} />
          )}
        </button>
      )}
    </aside>
  );

  if (variant === 'drawer') {
    return (
      <>
        <div
          className={overlayClassNames}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
        {isMobileOpen && createPortal(renderSidebar(), document.body)}
      </>
    );
  }

  return renderSidebar();
});

Sidebar.displayName = 'Sidebar';

// Navigation item component
const NavItem = forwardRef(function NavItem(
  {
    label,
    href,
    icon,
    badge,
    active = false,
    disabled = false,
    onClick,
    className = '',
    children,
    'aria-current': ariaCurrent,
    ...props
  },
  ref
) {
  const isLink = !!href;
  const Component = isLink ? 'a' : 'button';

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <Component
      ref={ref}
      href={href}
      className={`sidebar__nav-item ${active ? 'sidebar__nav-item--active' : ''} ${disabled ? 'sidebar__nav-item--disabled' : ''} ${className}`}
      onClick={handleClick}
      aria-current={active ? (ariaCurrent || 'page') : undefined}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      {...props}
    >
      {icon && <span className="sidebar__nav-icon" aria-hidden="true">{icon}</span>}
      <span className="sidebar__nav-label">{label}</span>
      {badge && <span className="sidebar__nav-badge">{badge}</span>}
      {children && <span className="sidebar__nav-children">{children}</span>}
      {!collapsed && children && <ChevronRight className="sidebar__nav-chevron" size={16} strokeWidth={2.5} />}
    </Component>
  );
});
NavItem.displayName = 'NavItem';

// Navigation group component
const NavGroup = forwardRef(function NavGroup(
  {
    label,
    children,
    className = '',
    initiallyOpen = true,
    ...props
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div ref={ref} className={`sidebar__nav-group ${className}`} {...props}>
      <button
        type="button"
        className={`sidebar__nav-group-toggle ${isOpen ? 'sidebar__nav-group-toggle--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`${label}-group`}
      >
        <span className="sidebar__nav-group-label">{label}</span>
        <ChevronRight
          className={`sidebar__nav-group-chevron ${isOpen ? 'sidebar__nav-group-chevron--open' : ''}`}
          size={16}
          strokeWidth={2.5}
        />
      </button>
      <div
        id={`${label}-group`}
        className={`sidebar__nav-group-content ${isOpen ? 'sidebar__nav-group-content--open' : ''}`}
        role="group"
        aria-label={`${label} navigation`}
      >
        {children}
      </div>
    </div>
  );
});
NavGroup.displayName = 'NavGroup';

// Divider
const NavDivider = () => (
  <hr className="sidebar__divider" role="separator" aria-orientation="horizontal" />
);

Sidebar.NavItem = NavItem;
Sidebar.NavGroup = NavGroup;
Sidebar.Divider = NavDivider;

export default Sidebar;

export const SIDEBAR_WIDTHS = ['sm', 'md', 'lg', 'xl'];
export const SIDEBAR_VARIANTS = ['permanent', 'persistent', 'drawer'];
export const SIDEBAR_POSITIONS = ['left', 'right'];