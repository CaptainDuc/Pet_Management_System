/**
 * PetCare Design System — Border Radius Tokens
 * Based on landing page and auth component usage
 */

export const borderRadius = {
  none: '0',
  xs: '0.125rem',    // 2px
  sm: '0.25rem',     // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  '4xl': '2rem',     // 32px
  full: '9999px',    // Fully rounded (pills, circles)
};

// Semantic radius for components
export const semanticRadius = {
  // Buttons
  button: {
    sm: '0.5rem',      // 8px - lg
    md: '0.75rem',     // 12px - xl (default)
    lg: '1rem',        // 16px - 2xl
    pill: '9999px',    // Full pill
  },

  // Inputs
  input: {
    sm: '0.5rem',      // 8px - lg
    md: '0.75rem',     // 12px - xl (default)
    lg: '1rem',        // 16px - 2xl
  },

  // Cards
  card: {
    sm: '0.75rem',     // 12px - xl
    md: '1rem',        // 16px - 2xl (default)
    lg: '1.5rem',      // 24px - 3xl
    xl: '2rem',        // 32px - 4xl (landing page cards)
  },

  // Modals
  modal: {
    sm: '1rem',        // 16px - 2xl
    md: '1.5rem',      // 24px - 3xl (default)
    lg: '2rem',        // 32px - 4xl
  },

  // Badges / Tags
  badge: {
    sm: '0.375rem',    // 6px - md
    md: '0.5rem',      // 8px - lg
    lg: '9999px',      // Pill
  },

  // Avatars
  avatar: {
    sm: '0.5rem',      // 8px - lg (rounded-square)
    md: '0.75rem',     // 12px - xl
    lg: '1rem',        // 16px - 2xl
    full: '9999px',    // Circle
  },

  // Tables
  table: {
    cell: '0',
    header: '0',
    row: '0',
    container: '0.75rem', // 12px - xl
  },

  // Dropdowns / Popovers
  dropdown: {
    sm: '0.5rem',      // 8px - lg
    md: '0.75rem',     // 12px - xl (default)
    lg: '1rem',        // 16px - 2xl
  },

  // Tooltips
  tooltip: {
    sm: '0.375rem',    // 6px - md
    md: '0.5rem',      // 8px - lg (default)
  },

  // Images
  image: {
    sm: '0.5rem',      // 8px - lg
    md: '0.75rem',     // 12px - xl
    lg: '1rem',        // 16px - 2xl
    xl: '2rem',        // 32px - 4xl (hero images)
    full: '9999px',    // Circle
  },
};

// Tailwind class mappings
export const tailwindClasses = {
  none: 'rounded-none',
  xs: 'rounded',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  '4xl': 'rounded-4xl',
  full: 'rounded-full',
};

// CSS custom properties
export const cssVariables = Object.fromEntries(
  Object.entries(borderRadius).map(([key, value]) => [`--radius-${key}`, value])
);

export default { borderRadius, semanticRadius, tailwindClasses, cssVariables };