/**
 * App - Main Application Controller with State Machine
 */

import { CONFIG } from "../config.js";
import { SceneManager } from "./scene/SceneManager.js";
import { KeyboardLayout } from "./scene/KeyboardLayout.js";
import { AudioManager } from "./audio/AudioManager.js";
import { IntroSequence } from "./intro/IntroSequence.js";
import { Navigation } from "./ui/Navigation.js";
import { ThemeToggle } from "./ui/ThemeToggle.js";
import { SoundToggle } from "./ui/SoundToggle.js";
import {
  createKeyboardHandler,
  createTypoTracker,
  isTypoKey,
} from "./utils/keyboard.js";
import { getTheme, getSoundEnabled } from "./utils/storage.js";
import {
  supportsWebGL,
  getWebGLCapabilities,
  prefersReducedMotion,
} from "./utils/device.js";
import { analytics } from "./utils/analytics.js";

// Application states
export const STATES = {
  LOADING: "loading",
  READY: "ready",
  INTRO: "intro",
  MAIN: "main",
  TRANSITIONING: "transitioning",
};

// Valid state transitions
const VALID_TRANSITIONS = {
  [STATES.LOADING]: [STATES.READY],
  [STATES.READY]: [STATES.INTRO],
  [STATES.INTRO]: [STATES.MAIN],
  [STATES.MAIN]: [STATES.TRANSITIONING],
  [STATES.TRANSITIONING]: [STATES.MAIN],
};

export class App {
  constructor() {
    this.state = STATES.LOADING;
    this.previousState = null;

    // Core managers
    this.sceneManager = null;
    this.keyboardLayout = null;
    this.audioManager = null;
    this.introSequence = null;

    // UI components
    this.navigation = null;
    this.themeToggle = null;
    this.soundToggle = null;

    // Input handlers
    this.keyboardHandler = null;
    this.typoTracker = null;

    // DOM elements
    this.loadingEl = null;
    this.hintEl = null;
    this.progressBar = null;

    // Loading state
    this.loadProgress = 0;
  }

  /**
   * Initialize the application
   */
  async init() {
    // Cache DOM elements
    this.loadingEl = document.getElementById("loading");
    this.hintEl = document.getElementById("hint");
    this.progressBar = document.getElementById("loading-progress-bar");

    // Check WebGL support
    if (!supportsWebGL()) {
      this.showError("WebGL is not supported on your device.");
      return;
    }

    // Track WebGL capabilities
    const capabilities = getWebGLCapabilities();
    analytics.trackWebGLCapabilities(capabilities);

    try {
      // Initialize components in parallel where possible
      this.updateProgress(10);

      // Initialize scene
      const canvas = document.getElementById("canvas");
      this.sceneManager = new SceneManager(canvas);
      await this.sceneManager.init();
      this.updateProgress(30);

      // Initialize keyboard layout
      this.keyboardLayout = new KeyboardLayout(this.sceneManager.scene);
      await this.keyboardLayout.init();
      this.updateProgress(50);

      // Initialize audio (don't start yet)
      this.audioManager = new AudioManager();
      this.updateProgress(60);

      // Initialize UI components
      this.initUI();
      this.updateProgress(70);

      // Initialize intro sequence
      this.introSequence = new IntroSequence(this);
      this.updateProgress(80);

      // Set up input handlers
      this.initInputHandlers();
      this.updateProgress(90);

      // Start render loop
      this.sceneManager.start((delta, elapsed) => {
        this.update(delta, elapsed);
      });

      this.updateProgress(100);

      // Transition to READY state
      await this.waitForProgress();
      this.setState(STATES.READY);

      // Track performance
      this.trackLoadPerformance();
    } catch (error) {
      console.error("Initialization error:", error);
      analytics.trackError("init", error.message, error.stack);
      this.showError("Failed to initialize. Please refresh the page.");
      throw error;
    }
  }

  /**
   * Initialize UI components
   */
  initUI() {
    // Apply saved theme
    const savedTheme = getTheme(CONFIG.theme.default);
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Initialize theme toggle with callback to update 3D keys
    this.themeToggle = new ThemeToggle(
      document.getElementById("theme-toggle"),
      savedTheme,
      (isDark) => {
        this.keyboardLayout?.updateTheme(isDark);
      },
    );

    // Initialize sound toggle
    const soundEnabled = getSoundEnabled(CONFIG.sound.default);
    this.soundToggle = new SoundToggle(
      document.getElementById("sound-toggle"),
      soundEnabled,
      (enabled) => {
        this.audioManager.setEnabled(enabled);
        analytics.trackSoundToggle(enabled);
      },
    );

    // Initialize navigation
    this.navigation = new Navigation(
      document.getElementById("navigation"),
      document.getElementById("controls"),
      (section) => {
        analytics.trackNavigation(section);
      },
    );
  }

  /**
   * Initialize keyboard and interaction handlers
   */
  initInputHandlers() {
    // TYPO sequence tracker
    this.typoTracker = createTypoTracker(() => {
      this.triggerIntro("T"); // Start with T when TYPO is typed
    });

    // Keyboard handler
    this.keyboardHandler = createKeyboardHandler({
      onValidKey: (key, eventType) => {
        if (eventType !== "keydown") return;

        // Track key press
        analytics.trackKeyPress(key, "keyboard");

        // In READY state, check for TYPO sequence or direct trigger
        if (this.state === STATES.READY) {
          if (isTypoKey(key)) {
            this.typoTracker.track(key);
          }
        }

        // In MAIN state, animate key press
        if (this.state === STATES.MAIN) {
          const keyModel = this.keyboardLayout.getTypoKey(key);
          if (keyModel) {
            keyModel.press();
            this.audioManager.playKeyPress();
            setTimeout(() => keyModel.release(), 100);
          }
        }
      },
    });

    this.keyboardHandler.attach();

    // Click handler for 3D keys
    this.sceneManager.onKeyClick = (keyModel) => {
      analytics.trackKeyPress(keyModel.letter, "click");

      if (this.state === STATES.READY && keyModel.isTypoKey) {
        this.triggerIntro(keyModel.letter);
      } else if (this.state === STATES.MAIN) {
        keyModel.press();
        this.audioManager.playKeyPress();
        setTimeout(() => keyModel.release(), 100);
      }
    };
  }

  /**
   * Update loop - called every frame
   */
  update(delta, elapsed) {
    // Update shimmer on all visible keys
    if (this.state === STATES.READY || this.state === STATES.MAIN) {
      this.keyboardLayout.updateShimmer(elapsed);
    }
  }

  /**
   * Set application state with validation
   */
  setState(newState) {
    // Prevent re-entry to same state
    if (this.state === newState) {
      console.warn(`Already in state: ${newState}`);
      return false;
    }

    // Validate transition
    if (!VALID_TRANSITIONS[this.state]?.includes(newState)) {
      console.warn(`Invalid transition: ${this.state} -> ${newState}`);
      return false;
    }

    this.previousState = this.state;
    this.state = newState;

    this.onStateChange(newState);
    return true;
  }

  /**
   * Handle state change side effects
   */
  onStateChange(newState) {
    switch (newState) {
      case STATES.READY:
        // Hide loading, show hint
        this.loadingEl?.classList.add("hidden");
        this.hintEl?.classList.remove("hidden");
        break;

      case STATES.INTRO:
        // Hide hint during intro
        this.hintEl?.classList.add("hidden");
        break;

      case STATES.MAIN:
        // Show navigation and content
        this.navigation.show();
        break;
    }
  }

  /**
   * Trigger intro sequence
   */
  triggerIntro(keyLetter) {
    // Prevent triggering if not in READY state
    if (this.state !== STATES.READY) {
      return;
    }

    if (!this.setState(STATES.INTRO)) {
      return;
    }

    analytics.trackIntroTriggered("click", keyLetter);

    // Skip intro animation for users who prefer reduced motion
    if (prefersReducedMotion()) {
      this.introSequence.skip();
    } else {
      this.introSequence.play(keyLetter);
    }
  }

  /**
   * Called when intro sequence completes
   */
  onIntroComplete() {
    this.setState(STATES.MAIN);
    analytics.trackIntroComplete(CONFIG.intro.totalDuration);
  }

  /**
   * Update loading progress
   */
  updateProgress(percent) {
    this.loadProgress = percent;
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
  }

  /**
   * Wait for progress animation to complete
   */
  waitForProgress() {
    return new Promise((resolve) => setTimeout(resolve, 300));
  }

  /**
   * Show error message
   */
  showError(message) {
    if (this.loadingEl) {
      this.loadingEl.innerHTML = `
        <div class="error-message">
          <p>${message}</p>
          <button onclick="location.reload()">Refresh</button>
        </div>
      `;
    }
  }

  /**
   * Track loading performance metrics
   */
  trackLoadPerformance() {
    if (window.performance) {
      const timing = performance.timing;
      const metrics = {
        domContentLoaded:
          timing.domContentLoadedEventEnd - timing.navigationStart,
        load: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType("paint")[0]?.startTime || 0,
      };
      analytics.trackLoadPerformance(metrics);
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.keyboardHandler?.detach();
    this.sceneManager?.dispose();
    this.audioManager?.dispose();
  }
}
