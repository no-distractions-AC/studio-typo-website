/**
 * Studio Typo - Centralized Configuration
 * Single source of truth for all settings
 */

export const CONFIG = {
  // Scene settings
  scene: {
    camera: {
      fov: 45,
      near: 0.1,
      far: 100,
      position: { x: -2, y: 6, z: 2.5 },
    },
    renderer: {
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    },
  },

  // Key layout positions (world units)
  layout: {
    keySpacing: 1.2,
    slideDistance: 3.5, // World units to slide right

    // STUDIO row (initially hidden, fade in place)
    studio: {
      S: { x: -3.0, y: 0, z: 0 },
      T: { x: -1.8, y: 0, z: 0 },
      U: { x: -0.6, y: 0, z: 0 },
      D: { x: 0.6, y: 0, z: 0 },
      I: { x: 1.8, y: 0, z: 0 },
      O: { x: 3.0, y: 0, z: 0 },
    },

    // TYPO grid (initially visible, centered)
    typo: {
      T: { x: -0.6, y: -1.2, z: 0 },
      Y: { x: 0.6, y: -1.2, z: 0 },
      P: { x: -0.6, y: -2.4, z: 0 },
      O: { x: 0.6, y: -2.4, z: 0 },
    },
  },

  // Animation timings (ms)
  timing: {
    keyPressDuration: 80,
    keyReleaseDuration: 120,
    studioRevealStagger: 100,
    slideRightDuration: 800,
    navRevealDelay: 100,
    sectionTransition: 300,
  },

  // Intro sequence timings
  intro: {
    totalDuration: 3500,
    steps: {
      audioInit: 0,
      keyPress: 200,
      keyRelease: 400,
      studioRevealStart: 600,
      slideStart: 1500,
      navReveal: 2300,
    },
  },

  // Audio settings
  audio: {
    masterVolume: 0.7,
    loopVolume: 0.5,
    keyPressVolume: 0.6,
    fadeInDuration: 1000,
    fadeOutDuration: 300,
  },

  // Performance settings
  performance: {
    maxPixelRatio: 2,
    raycastInterval: 50,
    resizeDebounce: 100,
  },

  // Analytics
  analytics: {
    mixpanelToken: "2efc0427d414930083137662762ead88",
  },

  // Theme
  theme: {
    default: "dark",
    storageKey: "studio-typo-theme",
  },

  // Sound preference
  sound: {
    default: true,
    storageKey: "studio-typo-sound",
  },
};
