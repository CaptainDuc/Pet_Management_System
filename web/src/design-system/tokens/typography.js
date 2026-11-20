/**
 * PetCare Design System — Typography Tokens
 * Based on landing page usage:
 * - font-display: 'Fira Sans' for headings
 * - font-sans: 'Nunito Sans' for body text
 * - font-script: 'Dancing Script' for tagline/accent
 */

export const fontFamilies = {
  sans: ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
  display: ['"Fira Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
  script: ['"Dancing Script"', 'cursive'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', '"Roboto Mono"', 'monospace'],
};

export const fontWeights = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

export const fontSizes = {
  // Fluid typography using clamp for responsive scaling
  // Format: { min, max, clamp }
  '2xs': { min: '0.625rem', max: '0.6875rem', clamp: 'clamp(0.625rem, 0.6rem + 0.125vw, 0.6875rem)' }, // 10-11px
  xs: { min: '0.75rem', max: '0.8125rem', clamp: 'clamp(0.75rem, 0.725rem + 0.125vw, 0.8125rem)' },     // 12-13px
  sm: { min: '0.875rem', max: '0.9375rem', clamp: 'clamp(0.875rem, 0.85rem + 0.125vw, 0.9375rem)' },     // 14-15px
  base: { min: '1rem', max: '1.0625rem', clamp: 'clamp(1rem, 0.975rem + 0.125vw, 1.0625rem)' },           // 16-17px
  lg: { min: '1.125rem', max: '1.1875rem', clamp: 'clamp(1.125rem, 1.1rem + 0.125vw, 1.1875rem)' },       // 18-19px
  xl: { min: '1.25rem', max: '1.375rem', clamp: 'clamp(1.25rem, 1.2rem + 0.25vw, 1.375rem)' },             // 20-22px
  '2xl': { min: '1.5rem', max: '1.75rem', clamp: 'clamp(1.5rem, 1.4rem + 0.5vw, 1.75rem)' },               // 24-28px
  '3xl': { min: '1.875rem', max: '2.25rem', clamp: 'clamp(1.875rem, 1.7rem + 0.875vw, 2.25rem)' },         // 30-36px
  '4xl': { min: '2.25rem', max: '3rem', clamp: 'clamp(2.25rem, 2rem + 1.25vw, 3rem)' },                    // 36-48px
  '5xl': { min: '3rem', max: '4rem', clamp: 'clamp(3rem, 2.5rem + 2.5vw, 4rem)' },                         // 48-64px
  '6xl': { min: '3.75rem', max: '5rem', clamp: 'clamp(3.75rem, 3rem + 3.75vw, 5rem)' },                    // 60-80px
  '7xl': { min: '4.5rem', max: '6rem', clamp: 'clamp(4.5rem, 3.5rem + 5vw, 6rem)' },                       // 72-96px
};

export const lineHeights = {
  none: '1',
  tight: '1.1',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
};

export const letterSpacings = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
  trackingTight: '-0.02em',
  trackingWide: '0.02em',
  trackingWider: '0.1em',
  trackingWidest: '0.2em',
};

// Semantic type styles (composed tokens)
export const typeStyles = {
  // Display styles (marketing, hero)
  display: {
    '2xl': {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes['5xl'].clamp,
      fontWeight: fontWeights.extrabold,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacings.tighter,
    },
    xl: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes['4xl'].clamp,
      fontWeight: fontWeights.extrabold,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacings.tighter,
    },
    lg: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes['3xl'].clamp,
      fontWeight: fontWeights.extrabold,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacings.tight,
    },
    md: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes['2xl'].clamp,
      fontWeight: fontWeights.bold,
      lineHeight: lineHeights.snug,
      letterSpacing: letterSpacings.tight,
    },
    sm: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes.xl.clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.snug,
      letterSpacing: letterSpacings.normal,
    },
    xs: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes.lg.clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
  },

  // Heading styles (content headings)
  heading: {
    h1: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes['4xl'].clamp,
      fontWeight: fontWeights.extrabold,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacings.tighter,
    },
    h2: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes['3xl'].clamp,
      fontWeight: fontWeights.extrabold,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacings.tight,
    },
    h3: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes['2xl'].clamp,
      fontWeight: fontWeights.bold,
      lineHeight: lineHeights.snug,
      letterSpacing: letterSpacings.tight,
    },
    h4: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes.xl.clamp,
      fontWeight: fontWeights.bold,
      lineHeight: lineHeights.snug,
      letterSpacing: letterSpacings.normal,
    },
    h5: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes.lg.clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
    h6: {
      fontFamily: fontFamilies.display.join(', '),
      fontSize: fontSizes.base.clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
  },

  // Body styles
  body: {
    lg: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes.lg.clamp,
      fontWeight: fontWeights.normal,
      lineHeight: lineHeights.relaxed,
      letterSpacing: letterSpacings.normal,
    },
    md: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes.base.clamp,
      fontWeight: fontWeights.normal,
      lineHeight: lineHeights.relaxed,
      letterSpacing: letterSpacings.normal,
    },
    sm: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes.sm.clamp,
      fontWeight: fontWeights.normal,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
    xs: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes.xs.clamp,
      fontWeight: fontWeights.normal,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
    '2xs': {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes['2xs'].clamp,
      fontWeight: fontWeights.normal,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
  },

  // Label / UI text
  label: {
    lg: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes.sm.clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.wide,
      textTransform: 'uppercase',
    },
    md: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes.xs.clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.wide,
      textTransform: 'uppercase',
    },
    sm: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes['2xs'].clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.widest,
      textTransform: 'uppercase',
    },
  },

  // Code / mono
  code: {
    sm: {
      fontFamily: fontFamilies.mono.join(', '),
      fontSize: fontSizes.sm.clamp,
      fontWeight: fontWeights.normal,
      lineHeight: lineHeights.normal,
    },
    md: {
      fontFamily: fontFamilies.mono.join(', '),
      fontSize: fontSizes.base.clamp,
      fontWeight: fontWeights.normal,
      lineHeight: lineHeights.normal,
    },
  },

  // Accent / script
  accent: {
    lg: {
      fontFamily: fontFamilies.script.join(', '),
      fontSize: fontSizes['3xl'].clamp,
      fontWeight: fontWeights.bold,
      lineHeight: lineHeights.tight,
    },
    md: {
      fontFamily: fontFamilies.script.join(', '),
      fontSize: fontSizes['2xl'].clamp,
      fontWeight: fontWeights.bold,
      lineHeight: lineHeights.tight,
    },
    sm: {
      fontFamily: fontFamilies.script.join(', '),
      fontSize: fontSizes.xl.clamp,
      fontWeight: fontWeights.bold,
      lineHeight: lineHeights.tight,
    },
  },

  // Button text
  button: {
    lg: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes.sm.clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
    md: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes.xs.clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
    sm: {
      fontFamily: fontFamilies.sans.join(', '),
      fontSize: fontSizes['2xs'].clamp,
      fontWeight: fontWeights.semibold,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacings.normal,
    },
  },
};

// Tailwind class mappings for easy use
export const tailwindClasses = {
  display: {
    '2xl': 'font-display text-5xl font-extrabold leading-tight tracking-tight',
    xl: 'font-display text-4xl font-extrabold leading-tight tracking-tight',
    lg: 'font-display text-3xl font-bold leading-snug tracking-tight',
    md: 'font-display text-2xl font-bold leading-snug tracking-tight',
    sm: 'font-display text-xl font-semibold leading-snug',
    xs: 'font-display text-lg font-semibold leading-normal',
  },
  heading: {
    h1: 'font-display text-4xl font-extrabold leading-tight tracking-tight',
    h2: 'font-display text-3xl font-extrabold leading-tight tracking-tight',
    h3: 'font-display text-2xl font-bold leading-snug tracking-tight',
    h4: 'font-display text-xl font-bold leading-snug',
    h5: 'font-display text-lg font-semibold leading-normal',
    h6: 'font-display text-base font-semibold leading-normal',
  },
  body: {
    lg: 'text-lg leading-relaxed',
    md: 'text-base leading-relaxed',
    sm: 'text-sm leading-normal',
    xs: 'text-xs leading-normal',
    '2xs': 'text-[10px] leading-normal',
  },
  label: {
    lg: 'text-sm font-semibold uppercase tracking-wide',
    md: 'text-xs font-semibold uppercase tracking-wide',
    sm: 'text-[10px] font-semibold uppercase tracking-widest',
  },
  accent: {
    lg: 'font-script text-3xl font-bold leading-tight',
    md: 'font-script text-2xl font-bold leading-tight',
    sm: 'font-script text-xl font-bold leading-tight',
  },
  button: {
    lg: 'text-sm font-semibold',
    md: 'text-xs font-semibold',
    sm: 'text-[10px] font-semibold',
  },
};

export default {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacings,
  typeStyles,
  tailwindClasses,
};