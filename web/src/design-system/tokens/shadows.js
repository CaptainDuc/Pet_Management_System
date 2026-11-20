/**
 * PetCare Design System — Shadow & Elevation Tokens
 * Based on landing page usage and auth components
 */

export const shadows = {
  // Elevation levels (0-5)
  none: 'none',
  xs: '0 1px 2px 0 rgba(7, 11, 20, 0.05)',
  sm: '0 1px 3px 0 rgba(7, 11, 20, 0.1), 0 1px 2px -1px rgba(7, 11, 20, 0.1)',
  md: '0 4px 6px -1px rgba(7, 11, 20, 0.1), 0 2px 4px -2px rgba(7, 11, 20, 0.1)',
  lg: '0 10px 15px -3px rgba(7, 11, 20, 0.1), 0 4px 6px -4px rgba(7, 11, 20, 0.1)',
  xl: '0 20px 25px -5px rgba(7, 11, 20, 0.1), 0 8px 10px -6px rgba(7, 11, 20, 0.1)',
  '2xl': '0 25px 50px -12px rgba(7, 11, 20, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(7, 11, 20, 0.05)',

  // Brand-colored shadows (used in landing page)
  brand: {
    sm: '0 2px 8px -2px rgba(39, 49, 114, 0.15)',
    md: '0 8px 20px -4px rgba(39, 49, 114, 0.2)',
    lg: '0 20px 40px -8px rgba(39, 49, 114, 0.25)',
    xl: '0 25px 60px -15px rgba(39, 49, 114, 0.35)', // From landing page hero
    glow: '0 0 20px rgba(73, 179, 244, 0.3)',
    glowPeach: '0 0 20px rgba(255, 188, 125, 0.3)',
  },

  // Colored shadows for interactive states
  colored: {
    primary: {
      sm: '0 2px 8px -2px rgba(37, 99, 235, 0.25)',
      md: '0 4px 12px -2px rgba(37, 99, 235, 0.3)',
      lg: '0 8px 24px -4px rgba(37, 99, 235, 0.35)',
    },
    success: {
      sm: '0 2px 8px -2px rgba(35, 164, 85, 0.25)',
      md: '0 4px 12px -2px rgba(35, 164, 85, 0.3)',
    },
    warning: {
      sm: '0 2px 8px -2px rgba(255, 188, 125, 0.3)',
      md: '0 4px 12px -2px rgba(255, 188, 125, 0.35)',
    },
    error: {
      sm: '0 2px 8px -2px rgba(220, 38, 38, 0.25)',
      md: '0 4px 12px -2px rgba(220, 38, 38, 0.3)',
    },
  },

  // Focus rings
  focus: {
    primary: '0 0 0 3px rgba(37, 99, 235, 0.2)',
    error: '0 0 0 3px rgba(220, 38, 38, 0.2)',
    success: '0 0 0 3px rgba(35, 164, 85, 0.2)',
    info: '0 0 0 3px rgba(73, 179, 244, 0.2)',
  },

  // Component-specific shadows
  card: {
    default: '0 1px 3px 0 rgba(7, 11, 20, 0.08), 0 1px 2px -1px rgba(7, 11, 20, 0.08)',
    hover: '0 10px 25px -5px rgba(7, 11, 20, 0.1), 0 8px 10px -6px rgba(7, 11, 20, 0.1)',
    elevated: '0 20px 40px -12px rgba(7, 11, 20, 0.15)',
  },

  modal: {
    overlay: '0 25px 50px -12px rgba(7, 11, 20, 0.5)',
    content: '0 20px 60px -15px rgba(7, 11, 20, 0.35)',
  },

  dropdown: {
    default: '0 10px 15px -3px rgba(7, 11, 20, 0.1), 0 4px 6px -4px rgba(7, 11, 20, 0.1)',
  },

  tooltip: {
    default: '0 4px 12px -2px rgba(7, 11, 20, 0.15)',
  },
};

// Semantic elevation mapping
export const elevation = {
  level0: shadows.none,
  level1: shadows.sm,    // Cards, buttons (rest)
  level2: shadows.md,    // Cards (hover), dropdowns
  level3: shadows.lg,    // Modals, elevated cards
  level4: shadows.xl,    // Large modals, drawers
  level5: shadows['2xl'], // Tooltips, popovers, max elevation
};

// CSS custom properties
export const cssVariables = Object.fromEntries(
  Object.entries(shadows).flatMap(([key, value]) => {
    if (typeof value === 'object') {
      return Object.entries(value).map(([subKey, subValue]) => [
        `--shadow-${key}-${subKey}`,
        subValue,
      ]);
    }
    return [[`--shadow-${key}`, value]];
  })
);

export default { shadows, elevation, cssVariables };