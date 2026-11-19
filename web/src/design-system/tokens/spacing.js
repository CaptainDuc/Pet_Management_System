/**
 * PetCare Design System — Spacing Tokens
 * Based on 4px base unit (Tailwind default)
 * Used consistently across landing page and portal
 */

export const spacing = {
  // Base unit: 4px
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  7: '1.75rem',   // 28px
  8: '2rem',      // 32px
  9: '2.25rem',   // 36px
  10: '2.5rem',   // 40px
  11: '2.75rem',  // 44px
  12: '3rem',     // 48px
  14: '3.5rem',   // 56px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  28: '7rem',     // 112px
  32: '8rem',     // 128px
  36: '9rem',     // 144px
  40: '10rem',    // 160px
  44: '11rem',    // 176px
  48: '12rem',    // 192px
  52: '13rem',    // 208px
  56: '14rem',    // 224px
  60: '15rem',    // 240px
  64: '16rem',    // 256px
  72: '18rem',    // 288px
  80: '20rem',    // 320px
  96: '24rem',    // 384px
};

// Semantic spacing for common patterns
export const semanticSpacing = {
  // Component internal spacing
  xs: spacing[1],      // 4px - tight
  sm: spacing[2],      // 8px - compact
  md: spacing[3],      // 12px - default
  lg: spacing[4],      // 16px - comfortable
  xl: spacing[5],      // 20px - spacious
  '2xl': spacing[6],   // 24px - generous
  '3xl': spacing[8],   // 32px - section

  // Layout spacing
  inline: spacing[2],      // 8px - inline elements
  stack: spacing[4],       // 16px - vertical stack
  group: spacing[6],       // 24px - related groups
  section: spacing[12],    // 48px - major sections
  page: spacing[16],       // 64px - page margins

  // Container
  container: {
    mobile: spacing[4],      // 16px
    tablet: spacing[6],      // 24px
    desktop: spacing[8],     // 32px
    wide: spacing[12],       // 48px
  },

  // Form
  form: {
    fieldGap: spacing[4],      // 16px between fields
    labelGap: spacing[1.5],    // 6px label to input
    helperGap: spacing[1],     // 4px input to helper
    sectionGap: spacing[6],    // 24px between field groups
  },

  // Card
  card: {
    padding: spacing[5],       // 20px default card padding
    paddingSm: spacing[4],     // 16px compact card
    paddingLg: spacing[6],     // 24px spacious card
    gap: spacing[4],           // 16px internal gap
  },

  // Modal
  modal: {
    padding: spacing[6],       // 24px
    gap: spacing[4],           // 16px
  },

  // Navigation
  nav: {
    itemGap: spacing[2],       // 8px between nav items
    itemPadding: spacing[3],   // 12px nav item padding
    sidebarWidth: '16rem',     // 256px (w-64)
    sidebarCollapsed: '4rem',  // 64px (w-16)
  },

  // Grid
  grid: {
    gap: spacing[4],           // 16px default grid gap
    gapSm: spacing[3],         // 12px tight grid
    gapLg: spacing[6],         // 24px spacious grid
  },
};

// CSS custom properties
export const cssVariables = Object.fromEntries(
  Object.entries(spacing).map(([key, value]) => [`--space-${key}`, value])
);

export default { spacing, semanticSpacing, cssVariables };