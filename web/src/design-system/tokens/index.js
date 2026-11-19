/**
 * PetCare Design System — Unified Token Exports
 * Single entry point for all design tokens
 */

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
export * from './borderRadius';
export * from './transitions';

// Convenience re-exports for common combinations
export const tokens = {
  colors: require('./colors').default,
  spacing: require('./spacing').default,
  typography: require('./typography').default,
  shadows: require('./shadows').default,
  borderRadius: require('./borderRadius').default,
  transitions: require('./transitions').default,
};

// CSS custom properties for global injection (optional)
export const allCssVariables = {
  ...require('./colors').cssVariables,
  ...require('./spacing').cssVariables,
  ...require('./typography').cssVariables,
  ...require('./shadows').cssVariables,
  ...require('./borderRadius').cssVariables,
  ...require('./transitions').cssVariables,
};

export default tokens;