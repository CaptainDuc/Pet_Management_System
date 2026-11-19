/**
 * PetCare Design System — Color Tokens
 * Derived from landing page (App.jsx) and tailwind.config.js
 * Single source of truth for all color values across web and portal
 */

// Primitive color palette (raw values)
export const primitiveColors = {
  // Brand colors
  brand: {
    navy: '#171d3f',        // Primary brand navy (landing page uses #171d3f)
    blue: '#49B3F4',        // Primary brand blue
    peach: '#FFBC7D',       // Brand peach accent
    green: '#23A455',       // Brand green (success)
    soft: '#F3F8FE',        // Brand soft background
  },

  // Neutral grays
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#070B14',
  },

  // Semantic status colors
  status: {
    success: {
      light: '#ECFDF5',
      main: '#23A455',
      dark: '#065F46',
      text: '#065F46',
      border: '#A7F3D0',
    },
    warning: {
      light: '#FFFAEB',
      main: '#FFBC7D',
      dark: '#92400E',
      text: '#92400E',
      border: '#FDE68A',
    },
    error: {
      light: '#FEF2F2',
      main: '#DC2626',
      dark: '#991B1B',
      text: '#DC2626',
      border: '#FECACA',
    },
    info: {
      light: '#F3F8FE',
      main: '#49B3F4',
      dark: '#1E40AF',
      text: '#1E40AF',
      border: '#BAE6FD',
    },
  },

  // Interactive states
  interactive: {
    primary: {
      main: '#2563EB',
      hover: '#1D4ED8',
      active: '#1E40AF',
      light: '#DBEAFE',
      text: '#FFFFFF',
      focusRing: '#2563EB',
    },
    secondary: {
      main: '#64748B',
      hover: '#475569',
      active: '#334155',
      light: '#F1F5F9',
      text: '#FFFFFF',
      focusRing: '#64748B',
    },
    ghost: {
      main: 'transparent',
      hover: '#F1F5F9',
      active: '#E2E8F0',
      text: '#475569',
      focusRing: '#64748B',
    },
    outline: {
      main: 'transparent',
      border: '#CBD5E1',
      hover: '#F8FAFC',
      active: '#F1F5F9',
      text: '#475569',
      focusRing: '#2563EB',
    },
  },

  // Surface colors
  surface: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    elevated: '#FFFFFF',
    overlay: 'rgba(7, 11, 20, 0.4)',
    backdrop: 'rgba(255, 255, 255, 0.95)',
  },

  // Text colors
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    disabled: '#94A3B8',
    inverse: '#FFFFFF',
    link: '#2563EB',
    linkHover: '#1D4ED8',
  },

  // Border colors
  border: {
    light: '#E2E8F0',
    main: '#CBD5E1',
    dark: '#94A3B8',
    focus: '#2563EB',
    error: '#DC2626',
  },

  // Gradient definitions
  gradients: {
    primary: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    primaryHover: 'linear-gradient(135deg, #1D4ED8 0%, #0284C7 100%)',
    brand: 'linear-gradient(135deg, #171d3f 0%, #49B3F4 100%)',
    brandReverse: 'linear-gradient(135deg, #49B3F4 0%, #171d3f 100%)',
    peach: 'linear-gradient(135deg, #FFBC7D 0%, #FF9F43 100%)',
    hero: 'linear-gradient(135deg, #171d3f 0%, #1f2760 50%, #171d3f 100%)',
    cardHover: 'linear-gradient(135deg, rgba(39, 49, 114, 0.1) 0%, rgba(73, 179, 244, 0.1) 100%)',
    textBrand: 'linear-gradient(135deg, #49B3F4 0%, #171d3f 100%)',
  },
};

// Role-based color tokens (derived from landing page brand palette)
const roleColors = {
  CUSTOMER: {
    // Blue theme - matches brand primary
    main: primitiveColors.brand.blue,
    light: '#DBEAFE',        // blue-50
    dark: '#1E40AF',         // blue-800
    text: '#1E40AF',         // blue-800
    border: '#93C5FD',       // blue-300
    bg: '#EFF6FF',           // blue-50
  },
  VETERINARIAN: {
    // Teal/Green theme - matches brand green
    main: primitiveColors.brand.green,
    light: '#ECFDF5',        // emerald-50
    dark: '#065F46',         // emerald-800
    text: '#065F46',         // emerald-800
    border: '#A7F3D0',       // emerald-300
    bg: '#F0FDF4',           // green-50
  },
  STAFF: {
    // Sky/Info theme - matches brand info
    main: primitiveColors.status.info.main,
    light: '#F3F8FE',        // sky-50 / brand.soft
    dark: '#1E40AF',         // blue-800
    text: '#1E40AF',         // blue-800
    border: '#BAE6FD',       // sky-300
    bg: '#EFF6FF',           // blue-50
  },
  OWNER: {
    // Indigo theme - executive
    main: '#6366F1',         // indigo-500
    light: '#EEF2FF',        // indigo-50
    dark: '#3730A3',         // indigo-800
    text: '#3730A3',         // indigo-800
    border: '#C7D2FE',       // indigo-300
    bg: '#EEF2FF',           // indigo-50
  },
  ADMIN: {
    // Purple theme - system admin
    main: '#A855F7',         // purple-500
    light: '#FAF5FF',        // purple-50
    dark: '#6B21A8',         // purple-800
    text: '#6B21A8',         // purple-800
    border: '#D8B4FE',       // purple-300
    bg: '#FAF5FF',           // purple-50
  },
};

// Semantic color aliases for easier consumption
export const semanticColors = {
  // Backgrounds
  bg: {
    primary: primitiveColors.surface.primary,
    secondary: primitiveColors.surface.secondary,
    tertiary: primitiveColors.surface.tertiary,
    brand: primitiveColors.brand.navy,
    brandSoft: primitiveColors.brand.soft,
    inverted: primitiveColors.neutral[950],
  },

  // Text
  fg: {
    primary: primitiveColors.text.primary,
    secondary: primitiveColors.text.secondary,
    tertiary: primitiveColors.text.tertiary,
    disabled: primitiveColors.text.disabled,
    inverse: primitiveColors.text.inverse,
    brand: primitiveColors.brand.navy,
    link: primitiveColors.text.link,
  },

  // Borders
  bd: {
    light: primitiveColors.border.light,
    main: primitiveColors.border.main,
    dark: primitiveColors.border.dark,
    focus: primitiveColors.border.focus,
    error: primitiveColors.border.error,
  },

  // Status
  status: primitiveColors.status,

  // Interactive
  interactive: primitiveColors.interactive,

  // Role-based colors
  role: roleColors,
};

// CSS custom properties for runtime theming (optional)
export const cssVariables = {
  // Brand
  '--color-brand-navy': primitiveColors.brand.navy,
  '--color-brand-blue': primitiveColors.brand.blue,
  '--color-brand-peach': primitiveColors.brand.peach,
  '--color-brand-green': primitiveColors.brand.green,
  '--color-brand-soft': primitiveColors.brand.soft,

  // Neutral
  '--color-neutral-50': primitiveColors.neutral[50],
  '--color-neutral-100': primitiveColors.neutral[100],
  '--color-neutral-200': primitiveColors.neutral[200],
  '--color-neutral-300': primitiveColors.neutral[300],
  '--color-neutral-400': primitiveColors.neutral[400],
  '--color-neutral-500': primitiveColors.neutral[500],
  '--color-neutral-600': primitiveColors.neutral[600],
  '--color-neutral-700': primitiveColors.neutral[700],
  '--color-neutral-800': primitiveColors.neutral[800],
  '--color-neutral-900': primitiveColors.neutral[900],
  '--color-neutral-950': primitiveColors.neutral[950],

  // Semantic
  '--color-bg-primary': semanticColors.bg.primary,
  '--color-bg-secondary': semanticColors.bg.secondary,
  '--color-bg-tertiary': semanticColors.bg.tertiary,
  '--color-bg-brand': semanticColors.bg.brand,
  '--color-bg-brand-soft': semanticColors.bg.brandSoft,

  '--color-fg-primary': semanticColors.fg.primary,
  '--color-fg-secondary': semanticColors.fg.secondary,
  '--color-fg-tertiary': semanticColors.fg.tertiary,
  '--color-fg-disabled': semanticColors.fg.disabled,
  '--color-fg-inverse': semanticColors.fg.inverse,
  '--color-fg-brand': semanticColors.fg.brand,
  '--color-fg-link': semanticColors.fg.link,

  '--color-bd-light': semanticColors.bd.light,
  '--color-bd-main': semanticColors.bd.main,
  '--color-bd-focus': semanticColors.bd.focus,
  '--color-bd-error': semanticColors.bd.error,

  // Interactive
  '--color-primary-main': primitiveColors.interactive.primary.main,
  '--color-primary-hover': primitiveColors.interactive.primary.hover,
  '--color-primary-focus': primitiveColors.interactive.primary.focusRing,
  '--color-secondary-main': primitiveColors.interactive.secondary.main,
  '--color-ghost-hover': primitiveColors.interactive.ghost.hover,

  // Status
  '--color-success-main': primitiveColors.status.success.main,
  '--color-success-light': primitiveColors.status.success.light,
  '--color-success-text': primitiveColors.status.success.text,
  '--color-warning-main': primitiveColors.status.warning.main,
  '--color-warning-light': primitiveColors.status.warning.light,
  '--color-warning-text': primitiveColors.status.warning.text,
  '--color-error-main': primitiveColors.status.error.main,
  '--color-error-light': primitiveColors.status.error.light,
  '--color-error-text': primitiveColors.status.error.text,
  '--color-info-main': primitiveColors.status.info.main,
  '--color-info-light': primitiveColors.status.info.light,
  '--color-info-text': primitiveColors.status.info.text,

  // Role-based colors
  '--color-role-customer-main': roleColors.CUSTOMER.main,
  '--color-role-customer-light': roleColors.CUSTOMER.light,
  '--color-role-customer-dark': roleColors.CUSTOMER.dark,
  '--color-role-customer-text': roleColors.CUSTOMER.text,
  '--color-role-customer-border': roleColors.CUSTOMER.border,
  '--color-role-customer-bg': roleColors.CUSTOMER.bg,

  '--color-role-veterinarian-main': roleColors.VETERINARIAN.main,
  '--color-role-veterinarian-light': roleColors.VETERINARIAN.light,
  '--color-role-veterinarian-dark': roleColors.VETERINARIAN.dark,
  '--color-role-veterinarian-text': roleColors.VETERINARIAN.text,
  '--color-role-veterinarian-border': roleColors.VETERINARIAN.border,
  '--color-role-veterinarian-bg': roleColors.VETERINARIAN.bg,

  '--color-role-staff-main': roleColors.STAFF.main,
  '--color-role-staff-light': roleColors.STAFF.light,
  '--color-role-staff-dark': roleColors.STAFF.dark,
  '--color-role-staff-text': roleColors.STAFF.text,
  '--color-role-staff-border': roleColors.STAFF.border,
  '--color-role-staff-bg': roleColors.STAFF.bg,

  '--color-role-owner-main': roleColors.OWNER.main,
  '--color-role-owner-light': roleColors.OWNER.light,
  '--color-role-owner-dark': roleColors.OWNER.dark,
  '--color-role-owner-text': roleColors.OWNER.text,
  '--color-role-owner-border': roleColors.OWNER.border,
  '--color-role-owner-bg': roleColors.OWNER.bg,

  '--color-role-admin-main': roleColors.ADMIN.main,
  '--color-role-admin-light': roleColors.ADMIN.light,
  '--color-role-admin-dark': roleColors.ADMIN.dark,
  '--color-role-admin-text': roleColors.ADMIN.text,
  '--color-role-admin-border': roleColors.ADMIN.border,
  '--color-role-admin-bg': roleColors.ADMIN.bg,
};

export default {
  primitive: primitiveColors,
  semantic: semanticColors,
  cssVariables,
  role: roleColors,
};