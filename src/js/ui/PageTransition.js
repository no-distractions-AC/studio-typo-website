/**
 * PageTransition - Orchestrates heading animation and content transitions
 */

// Section display names
const SECTION_NAMES = {
  services: "Services",
  work: "Work",
  about: "Who Are We",
  contact: "Contact Us",
};

// Sections that use full-width layout (no canvas interaction)
const WIDE_SECTIONS = new Set(["about"]);

export class PageTransition {
  constructor(headingEl, contentEl, onGoHome) {
    this.heading = headingEl;
    this.content = contentEl;
    this.onGoHome = onGoHome;
    this.sectionLabel = document.getElementById("section-label");
    this.canvas = document.getElementById("canvas");
    this.sections = new Map();
    this.currentSection = null;
    this.isInSection = false;
    this.isTransitioning = false;

    this.init();
  }

  /**
   * Initialize content sections
   */
  init() {
    const sectionElements = this.content.querySelectorAll(".content-section");
    sectionElements.forEach((section) => {
      // Extract section id (remove 'section-' prefix)
      const sectionId = section.id.replace("section-", "");
      this.sections.set(sectionId, section);
    });

    // Add click handler to heading for going back home
    this.heading.addEventListener("click", () => {
      if (this.isInSection) {
        this.goHome();
      }
    });
  }

  /**
   * Transition to a content section
   */
  async transitionTo(sectionId) {
    if (this.isTransitioning) return;
    if (sectionId === this.currentSection) return;

    const nextSection = this.sections.get(sectionId);
    if (!nextSection) return;

    this.isTransitioning = true;

    // If we have a current section, fade it out first
    if (this.currentSection) {
      const currentSectionEl = this.sections.get(this.currentSection);
      if (currentSectionEl) {
        currentSectionEl.classList.remove("active");
      }
      // Wait for fade out
      await this.wait(150);
    }

    // Update section label
    this.sectionLabel.textContent = SECTION_NAMES[sectionId] || sectionId;

    // First time entering a section - animate heading to top-left and fade canvas
    if (!this.isInSection) {
      this.heading.classList.add("top-left");
      this.content.classList.add("visible");
      this.canvas.classList.add("faded");
      this.isInSection = true;
      // Wait for heading animation
      await this.wait(300);
    }

    // Show new section
    nextSection.classList.add("active");
    this.currentSection = sectionId;

    // Toggle wide layout for sections that don't use the canvas
    this.content.classList.toggle("content-wide", WIDE_SECTIONS.has(sectionId));

    // Scroll content to top
    this.content.scrollTop = 0;

    this.isTransitioning = false;
  }

  /**
   * Go back to home state (no content visible)
   */
  async goHome() {
    if (this.isTransitioning) return;
    if (!this.isInSection) return;

    this.isTransitioning = true;

    // Hide current section
    if (this.currentSection) {
      const currentSectionEl = this.sections.get(this.currentSection);
      if (currentSectionEl) {
        currentSectionEl.classList.remove("active");
      }
    }

    // Hide content container
    this.content.classList.remove("visible");
    this.content.classList.remove("content-wide");

    // Wait for content to fade out
    await this.wait(300);

    // Animate heading back to center and show canvas
    this.heading.classList.remove("top-left");
    this.canvas.classList.remove("faded");

    // Clear section label after transition
    await this.wait(400);
    this.sectionLabel.textContent = "";

    this.currentSection = null;
    this.isInSection = false;
    this.isTransitioning = false;

    // Notify callback
    this.onGoHome?.();
  }

  /**
   * Check if currently in a section view
   */
  isInSectionView() {
    return this.isInSection;
  }

  /**
   * Get current section ID
   */
  getCurrentSection() {
    return this.currentSection;
  }

  /**
   * Utility: wait for specified milliseconds
   */
  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
