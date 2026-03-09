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
import { ScrollController } from "./ui/PageTransition.js";
import { TeamSection } from "./ui/TeamSection.js";
import { WorkSection } from "./ui/WorkSection.js";
import { ContactSection } from "./ui/ContactSection.js";
import { ParticleCanvas } from "./ui/ParticleCanvas.js";
import { ScrollParticleSpawner } from "./ui/ScrollParticleSpawner.js";
import { TypoRotator } from "./ui/TypoRotator.js";
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
};

// Valid state transitions
const VALID_TRANSITIONS = {
  [STATES.LOADING]: [STATES.READY, STATES.MAIN],
  [STATES.READY]: [STATES.INTRO],
  [STATES.INTRO]: [STATES.MAIN],
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
    this.scrollController = null;
    this.typoRotator = null;
    this.teamSection = null;

    // Particle effects
    this.particleCanvas = null;
    this.scrollSpawner = null;

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
      // Hide 3D canvas (background effect disabled for now)
      const canvas = document.getElementById("canvas");
      canvas.style.display = "none";

      // Apply saved theme
      document.documentElement.setAttribute(
        "data-theme",
        getTheme(CONFIG.theme.default),
      );

      // Initialize audio (don't start yet)
      this.audioManager = new AudioManager();

      // Initialize UI components
      this.initUI();

      // Set up input handlers
      this.initInputHandlers();

      this.updateProgress(100);

      // Jump directly to MAIN state (skip intro)
      await this.waitForProgress();
      this.setState(STATES.MAIN);

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

    // Initialize team section (lazy-initialized on first visit)
    this.teamSection = new TeamSection();

    // Initialize work section (lazy-initialized on first visit)
    this.workSection = new WorkSection();

    // Initialize contact section (lazy-initialized on first visit)
    // ParticleCanvas is created later in MAIN state and passed in
    this.contactSection = new ContactSection(this.audioManager, null);

    // Initialize navigation
    this.navigation = new Navigation(
      document.getElementById("navigation"),
      document.getElementById("controls"),
      (section) => {
        this.scrollController.scrollToSection(section);
        analytics.trackNavigation(section);
      },
    );

    // Initialize typo rotator (letter cycling on "o" in hero heading)
    const rotatingLetterEl = document.getElementById("typo-rotating-letter");
    if (rotatingLetterEl) {
      this.typoRotator = new TypoRotator(rotatingLetterEl);
    }

    // Initialize scroll controller
    this.scrollController = new ScrollController({
      headingEl: document.getElementById("site-heading"),
      contentEl: document.getElementById("content"),
      canvasEl: document.getElementById("canvas"),
      navigation: this.navigation,
      typoRotator: this.typoRotator,
      onSectionChange: (sectionId) => {
        this.navigation.setActive(sectionId);
        analytics.trackNavigation(sectionId);
      },
      onSectionVisible: (sectionId) => {
        if (sectionId === "work") {
          this.workSection.activate();
        }
        if (sectionId === "about") {
          this.teamSection.activate();
        }
        if (sectionId === "contact") {
          this.contactSection.activate();
        }
      },
    });
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

        // In MAIN state, animate key press (skip when typing in forms)
        if (this.state === STATES.MAIN) {
          const activeEl = document.activeElement;
          const isFormInput =
            activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA";

          if (!isFormInput) {
            const keyModel = this.keyboardLayout?.getTypoKey(key);
            if (keyModel) {
              keyModel.press();
              this.audioManager.playKeyPress(key);
              setTimeout(() => keyModel.release(), 100);
            }
          }
        }
      },
      onKeyUp: (key) => {
        if (this.state === STATES.MAIN) {
          const activeEl = document.activeElement;
          const isFormInput =
            activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA";

          if (!isFormInput) {
            this.audioManager.playKeyRelease(key);
          }
        }
      },
    });

    this.keyboardHandler.attach();

    // Click handler for 3D keys (only when scene is active)
    if (this.sceneManager) {
      this.sceneManager.onKeyClick = (keyModel) => {
        analytics.trackKeyPress(keyModel.letter, "click");

        if (this.state === STATES.READY && keyModel.isTypoKey) {
          this.triggerIntro(keyModel.letter);
        } else if (this.state === STATES.MAIN) {
          keyModel.press();
          this.audioManager.playKeyPress(keyModel.letter);
          setTimeout(() => {
            keyModel.release();
            this.audioManager.playKeyRelease(keyModel.letter);
          }, 100);
        }
      };
    }

    // Scroll down on hero triggers intro
    this.handleWheel = (e) => {
      if (this.state === STATES.READY && e.deltaY > 0) {
        this.triggerIntro("T");
      }
    };
    window.addEventListener("wheel", this.handleWheel, { passive: true });
  }

  /**
   * Update loop - called every frame
   */
  update(delta, elapsed) {
    // Update shimmer on all visible keys
    if (
      this.keyboardLayout &&
      (this.state === STATES.READY || this.state === STATES.MAIN)
    ) {
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
        // Hide loading/hint in case we jumped directly to MAIN
        this.loadingEl?.classList.add("hidden");
        this.hintEl?.classList.add("hidden");
        // Prepare navigation (DOM-ready but hidden), show heading, enable scrolling
        // Navigation visibility is managed by scroll position in ScrollController
        this.navigation.prepare();
        document.getElementById("site-heading").classList.add("visible");
        this.scrollController.reveal();

        // Particle text effect disabled for now
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

    // Remove wheel listener once intro starts
    window.removeEventListener("wheel", this.handleWheel);

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
    this.scrollController?.dispose();
    this.typoRotator?.dispose();
    this.scrollSpawner?.dispose();
    this.particleCanvas?.dispose();
  }
}
