/**
 * Design Tokens - Typography
 * Single source of truth for fonts and font sizes
 *
 * IMPORTANT: Keep CSS variables in src/styles/variables.css in sync with these values
 */

// Font families
export const fonts = {
  mono: '"Space Mono", "SF Mono", "Consolas", monospace',
};

// Font sizes (matching CSS rem values)
export const fontSizes = {
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  base: "1rem", // 16px
  lg: "1.125rem", // 18px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "2rem", // 32px
  "4xl": "2.5rem", // 40px
};

// Font weights
export const fontWeights = {
  normal: 400,
  bold: 700,
};

// Line heights
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

// Letter spacing
export const letterSpacing = {
  tighter: "-0.02em",
  tight: "-0.01em",
  normal: "0",
  wide: "0.02em",
};
