/**
 * Navigation - Minimal navigation controller
 */

export class Navigation {
  constructor(navElement, controlsElement, onNavigate) {
    this.navElement = navElement;
    this.controlsElement = controlsElement;
    this.onNavigate = onNavigate;

    this.sections = ["services", "about", "work", "contact"];
    this.navLinks = [];

    this.init();
  }

  /**
   * Initialize navigation
   */
  init() {
    // Get all nav links
    this.navLinks = this.navElement.querySelectorAll(".nav-link");

    // Set up click handlers
    this.navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const section = link.getAttribute("data-section");
        this.onNavigate?.(section);
      });
    });
  }

  /**
   * Show the navigation and controls
   */
  show() {
    this.navElement.classList.remove("hidden");
    this.navElement.classList.add("visible");

    this.controlsElement?.classList.remove("hidden");
    this.controlsElement?.classList.add("visible");
  }

  /**
   * Hide the navigation and controls
   */
  hide() {
    this.navElement.classList.remove("visible");
    this.navElement.classList.add("hidden");

    this.controlsElement?.classList.remove("visible");
    this.controlsElement?.classList.add("hidden");
  }
}
