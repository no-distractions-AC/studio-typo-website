/**
 * Design Tokens - Colors
 * Single source of truth for all colors used in CSS and Three.js
 *
 * IMPORTANT: Keep CSS variables in src/styles/variables.css in sync with these values
 */

// Helper to convert hex string to Three.js number format
export const hexToThreeColor = (hex) => parseInt(hex.replace("#", ""), 16);

// Base color palette (hex strings for CSS compatibility)
export const palette = {
  black: "#0f1114", // Soft blueish black
  white: "#ffffff",
  darkGray: "#1a1b20", // Blueish dark gray
  blue: "#0080fe",
  lightBlue: "#8080ff",
  gray: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#eeeeee",
    300: "#cccccc",
    400: "#aaaaaa",
    500: "#8a8a94", // Slightly blue-tinted
    600: "#5a5a64", // Slightly blue-tinted
    700: "#3a3a44",
    800: "#2a2a34",
    900: "#16161c",
    950: "#0c0c10",
  },
};

// Semantic theme colors
export const themes = {
  dark: {
    bg: {
      primary: palette.black,
      secondary: palette.gray[950],
      tertiary: palette.gray[900],
    },
    text: {
      primary: palette.white,
      secondary: palette.gray[500],
      tertiary: palette.gray[600],
    },
    border: {
      primary: palette.gray[800],
      secondary: palette.gray[700],
    },
    key: {
      surface: palette.white,
      text: palette.black,
    },
    accent: palette.white,
    accentHover: palette.gray[300],
    shimmer: palette.blue,
    typoHighlight: "rgba(0, 128, 254, 0.25)",
    typoHighlightBorder: palette.blue,
    lighting: {
      main: palette.white,
      fill: palette.lightBlue,
    },
    // Gradient overlay colors for key depth effect
    gradient: {
      start: "rgba(0, 0, 0, 0.03)",
      end: "rgba(0, 0, 0, 0.08)",
    },
  },
  light: {
    bg: {
      primary: palette.white,
      secondary: palette.gray[100],
      tertiary: palette.gray[200],
    },
    text: {
      primary: palette.black,
      secondary: palette.gray[600],
      tertiary: palette.gray[500],
    },
    border: {
      primary: palette.gray[300],
      secondary: palette.gray[400],
    },
    key: {
      surface: palette.darkGray,
      text: palette.white,
    },
    accent: palette.black,
    accentHover: "#333333",
    shimmer: palette.blue,
    typoHighlight: "rgba(128, 128, 255, 0.15)",
    typoHighlightBorder: palette.lightBlue,
    lighting: {
      main: palette.white,
      fill: palette.white,
    },
    // Gradient overlay colors for key depth effect
    gradient: {
      start: "rgba(255, 255, 255, 0.03)",
      end: "rgba(0, 0, 0, 0.08)",
    },
  },
};

// Three.js compatible colors (pre-converted to hex numbers)
export const threeColors = {
  dark: {
    keySurface: hexToThreeColor(themes.dark.key.surface),
    keyText: themes.dark.key.text, // Keep as string for canvas
    shimmer: hexToThreeColor(themes.dark.shimmer),
    lightMain: hexToThreeColor(themes.dark.lighting.main),
    lightFill: hexToThreeColor(themes.dark.lighting.fill),
  },
  light: {
    keySurface: hexToThreeColor(themes.light.key.surface),
    keyText: themes.light.key.text, // Keep as string for canvas
    shimmer: hexToThreeColor(themes.light.shimmer),
    lightMain: hexToThreeColor(themes.light.lighting.main),
    lightFill: hexToThreeColor(themes.light.lighting.fill),
  },
};

// Helper to get Three.js colors by theme
export const getThreeColors = (isDark) =>
  isDark ? threeColors.dark : threeColors.light;

// Helper to get semantic theme
export const getTheme = (isDark) => (isDark ? themes.dark : themes.light);
