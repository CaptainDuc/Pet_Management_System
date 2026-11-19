/**
 * PetCare Design System — Transition & Animation Tokens
 * Based on index.css and component usage
 * Replaces bounce/spring easing with smooth exponential easing
 */

export const durations = {
  instant: '0ms',
  fastest: '50ms',
  faster: '100ms',
  fast: '150ms',      // --duration-fast
  normal: '200ms',    // --duration-normal (default)
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',   // --duration-entrance
  entrance: '500ms',  // Form entrance
  ripple: '650ms',    // --duration-ripple
};

export const easings = {
  // Linear
  linear: 'linear',

  // Standard easings (recommended)
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Exponential (smooth deceleration) — REPLACES bounce/spring
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',

  // Spring-like but controlled (for deliberate micro-interactions only)
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',

  // Legacy (DEPRECATED - bounce/spring)
  // easeSpring: 'cubic-bezier(0.22, 1, 0.36, 1)', // REMOVED - too bouncy
};

export const transitions = {
  // Property-specific
  colors: `color ${durations.fast} ${easings.easeOut}, background-color ${durations.fast} ${easings.easeOut}, border-color ${durations.fast} ${easings.easeOut}, fill ${durations.fast} ${easings.easeOut}, stroke ${durations.fast} ${easings.easeOut}`,
  opacity: `opacity ${durations.fast} ${easings.easeOut}`,
  transform: `transform ${durations.fast} ${easings.easeOut}`,
  boxShadow: `box-shadow ${durations.fast} ${easings.easeOut}`,
  all: `all ${durations.normal} ${easings.easeOut}`,

  // Component-specific
  button: `background-color ${durations.fast} ${easings.easeOut}, transform ${durations.fast} ${easings.easeOut}, box-shadow ${durations.fast} ${easings.easeOut}`,
  input: `border-color ${durations.fast} ${easings.easeOut}, box-shadow ${durations.fast} ${easings.easeOut}, background-color ${durations.fast} ${easings.easeOut}`,
  card: `transform ${durations.normal} ${easings.easeOut}, box-shadow ${durations.normal} ${easings.easeOut}`,
  modal: `opacity ${durations.normal} ${easings.easeOut}, transform ${durations.normal} ${easings.easeOut}`,
  dropdown: `opacity ${durations.fast} ${easings.easeOut}, transform ${durations.fast} ${easings.easeOut}`,
  tooltip: `opacity ${durations.faster} ${easings.easeOut}, transform ${durations.faster} ${easings.easeOut}`,
  nav: `color ${durations.fast} ${easings.easeOut}, background-color ${durations.fast} ${easings.easeOut}`,
  tab: `color ${durations.fast} ${easings.easeOut}, border-color ${durations.fast} ${easings.easeOut}`,
  badge: `background-color ${durations.fast} ${easings.easeOut}, color ${durations.fast} ${easings.easeOut}`,
};

// Keyframe animations
export const keyframes = {
  // Entrance animations
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  fadeOut: {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  slideUp: {
    '0%': { opacity: '0', transform: 'translateY(10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  slideDown: {
    '0%': { opacity: '0', transform: 'translateY(-10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  slideInRight: {
    '0%': { opacity: '0', transform: 'translateX(10px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
  slideInLeft: {
    '0%': { opacity: '0', transform: 'translateX(-10px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
  scaleIn: {
    '0%': { opacity: '0', transform: 'scale(0.95)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
  scaleOut: {
    '0%': { opacity: '1', transform: 'scale(1)' },
    '100%': { opacity: '0', transform: 'scale(0.95)' },
  },

  // Loading / spinner
  spin: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  bounce: {
    '0%, 100%': { transform: 'translateY(-5%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
    '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
  },

  // Ripple effect (from AuthLayout)
  ripple: {
    '0%': { transform: 'translate(-50%, -50%) scale(0.2)', opacity: '0.85' },
    '45%': { opacity: '0.55' },
    '100%': { transform: 'translate(-50%, -50%) scale(1.25)', opacity: '0' },
  },

  // Shimmer (skeleton loading)
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },

  // Error shake
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  },
};

// Animation definitions (name + duration + easing)
export const animations = {
  // Entrance
  'fade-in': { keyframe: 'fadeIn', duration: durations.fast, easing: easings.easeOut },
  'fade-out': { keyframe: 'fadeOut', duration: durations.fast, easing: easings.easeIn },
  'slide-up': { keyframe: 'slideUp', duration: durations.normal, easing: easings.easeOut },
  'slide-down': { keyframe: 'slideDown', duration: durations.normal, easing: easings.easeOut },
  'slide-in-right': { keyframe: 'slideInRight', duration: durations.normal, easing: easings.easeOut },
  'slide-in-left': { keyframe: 'slideInLeft', duration: durations.normal, easing: easings.easeOut },
  'scale-in': { keyframe: 'scaleIn', duration: durations.normal, easing: easings.easeOut },
  'scale-out': { keyframe: 'scaleOut', duration: durations.fast, easing: easings.easeIn },

  // Form entrance (from index.css)
  'form-entrance': { keyframe: 'slideUp', duration: durations.entrance, easing: easings.easeOutQuart },
  'page-slide': { keyframe: 'slideUp', duration: durations.normal, easing: easings.easeOutQuart },
  'error-slide': { keyframe: 'slideDown', duration: durations.fast, easing: easings.easeOutQuart },

  // Interactive
  spin: { keyframe: 'spin', duration: '1s', easing: easings.linear, iterationCount: 'infinite' },
  pulse: { keyframe: 'pulse', duration: '2s', easing: easings.easeInOut, iterationCount: 'infinite' },
  shimmer: { keyframe: 'shimmer', duration: '1.5s', easing: easings.linear, iterationCount: 'infinite' },
  ripple: { keyframe: 'ripple', duration: durations.ripple, easing: easings.easeOutQuint },
  shake: { keyframe: 'shake', duration: '0.5s', easing: easings.easeInOut },

  // Hover/tap feedback
  'tap-feedback': { keyframe: 'scaleIn', duration: durations.fastest, easing: easings.easeOut },
};

// Tailwind class mappings (for utility classes)
export const tailwindClasses = {
  // Durations
  'duration-instant': 'duration-0',
  'duration-fastest': 'duration-50',
  'duration-faster': 'duration-100',
  'duration-fast': 'duration-150',
  'duration-normal': 'duration-200',
  'duration-slow': 'duration-300',
  'duration-slower': 'duration-400',
  'duration-slowest': 'duration-500',
  'duration-entrance': 'duration-500',
  'duration-ripple': 'duration-700',

  // Easings (using Tailwind's built-in + custom)
  'ease-linear': 'ease-linear',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  // Custom exponentials (need to be defined in tailwind.config.js)
  'ease-out-quad': 'ease-out',
  'ease-out-expo': 'ease-out',
};

// Reduced motion preferences
export const reducedMotion = {
  // These animations should be disabled/shortened for prefers-reduced-motion
  disabledAnimations: [
    'spin',
    'pulse',
    'bounce',
    'ripple',
    'shimmer',
    'slide-up',
    'slide-down',
    'slide-in-right',
    'slide-in-left',
    'scale-in',
    'scale-out',
    'form-entrance',
    'page-slide',
  ],
  // Safe animations that can run even with reduced motion
  safeAnimations: [
    'fade-in',
    'fade-out',
    'shake', // Accessibility: error feedback should remain
  ],
  // Duration override for reduced motion
  overrideDuration: '0.01ms',
};

// CSS custom properties
export const cssVariables = {
  ...Object.fromEntries(
    Object.entries(durations).map(([key, value]) => [`--duration-${key}`, value])
  ),
  ...Object.fromEntries(
    Object.entries(easings).map(([key, value]) => [`--ease-${key}`, value])
  ),
  ...Object.fromEntries(
    Object.entries(animations).map(([key, value]) => [
      `--animation-${key}`,
      `${value.keyframe} ${value.duration} ${value.easing}${value.iterationCount ? ` ${value.iterationCount}` : ''}`,
    ])
  ),
};

export default {
  durations,
  easings,
  transitions,
  keyframes,
  animations,
  tailwindClasses,
  reducedMotion,
  cssVariables,
};