/**
 * PetCare Design System — Unified Component Exports
 * Single entry point for all design system components
 */

// Buttons
export { default as Button, BUTTON_VARIANTS, BUTTON_SIZES } from './Button/Button';

// Inputs
export { default as Input, INPUT_SIZES } from './Input/Input';

// Selects
export { default as Select, SELECT_SIZES } from './Select/Select';

// Cards
export {
  default as Card,
  CARD_VARIANTS,
  CARD_PADDING,
} from './Card/Card';

// Badges
export { default as Badge, BADGE_VARIANTS, BADGE_SIZES } from './Badge/Badge';

// Tables
export { default as Table, TABLE_COLUMN_DEFAULTS } from './Table/Table';

// Modals
export {
  default as Modal,
  MODAL_SIZES,
  MODAL_VARIANTS,
} from './Modal/Modal';

// Sidebars
export {
  default as Sidebar,
  SIDEBAR_WIDTHS,
  SIDEBAR_VARIANTS,
  SIDEBAR_POSITIONS,
} from './Sidebar/Sidebar';

// Avatars
export {
  default as Avatar,
  AVATAR_SIZES,
  AVATAR_SHAPES,
  AVATAR_STATUSES,
} from './Avatar/Avatar';

// Tooltips
export {
  default as Tooltip,
  TOOLTIP_POSITIONS,
  TOOLTIP_VARIANTS,
  TOOLTIP_SIZES,
} from './Tooltip/Tooltip';

// Re-export all as namespace for convenience
export * from './Button/Button';
export * from './Input/Input';
export * from './Select/Select';
export * from './Card/Card';
export * from './Badge/Badge';
export * from './Table/Table';
export * from './Modal/Modal';
export * from './Sidebar/Sidebar';
export * from './Avatar/Avatar';
export * from './Tooltip/Tooltip';