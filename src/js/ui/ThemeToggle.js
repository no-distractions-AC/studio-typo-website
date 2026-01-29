/**
 * ThemeToggle - Dark/light theme controller
 */

import { setTheme } from "../utils/storage.js";
import { analytics } from "../utils/analytics.js";

export class ThemeToggle {
  constructor(buttonElement, initialTheme = "dark", onThemeChange = null) {
    this.button = buttonElement;
    this.currentTheme = initialTheme;
    this.onThemeChange = onThemeChange;

    this.init();
  }

  /**
   * Initialize the toggle
   */
  init() {
    // Set initial state
    this.updateButton();

    // Click handler
    this.button.addEventListener("click", () => {
      this.toggle();
    });

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      // Only auto-switch if user hasn't explicitly chosen
      const stored = localStorage.getItem("studio-typo-theme");
      if (!stored) {
        this.setTheme(e.matches ? "dark" : "light");
      }
    });
  }

  /**
   * Toggle between themes
   */
  toggle() {
    const newTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }

  /**
   * Set specific theme
   */
  setTheme(theme) {
    this.currentTheme = theme;

    // Update DOM
    document.documentElement.setAttribute("data-theme", theme);

    // Persist
    setTheme(theme);

    // Update button
    this.updateButton();

    // Notify listener
    this.onThemeChange?.(theme === "dark");

    // Track
    analytics.trackThemeToggle(theme);
  }

  /**
   * Update button state
   */
  updateButton() {
    const isLight = this.currentTheme === "light";
    this.button.setAttribute("aria-pressed", String(isLight));
    this.button.setAttribute(
      "title",
      isLight ? "Switch to dark theme" : "Switch to light theme",
    );
  }

  /**
   * Get current theme
   */
  getTheme() {
    return this.currentTheme;
  }
}
