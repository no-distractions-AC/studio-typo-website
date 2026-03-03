/**
 * ScrollController - Orchestrates scroll-based heading animation,
 * canvas fade, section reveal, and active section tracking.
 *
 * Replaces the old click-based PageTransition.
 */

export class ScrollController {
  constructor({
    headingEl,
    contentEl,
    canvasEl,
    onSectionChange,
    onSectionVisible,
  }) {
    this.heading = headingEl;
    this.content = contentEl;
    this.canvas = canvasEl;
    this.onSectionChange = onSectionChange;
    this.onSectionVisible = onSectionVisible;

    this.sections = [];
    this.activeSection = null;
    this.heroHeight = window.innerHeight;
    this.headingLocked = false;

    this.sectionObserver = null;
    this.revealObserver = null;
    this.lazyObserver = null;
    this.handleScroll = null;

    this.init();
  }

  init() {
    // Collect sections
    const sectionElements = this.content.querySelectorAll(".content-section");
    sectionElements.forEach((el) => {
      const id = el.id.replace("section-", "");
      this.sections.push({ id, element: el });
    });

    // Bind scroll handler (attached later in reveal())
    this.handleScroll = this.onScroll.bind(this);

    // Resize listener to update heroHeight
    this.handleResize = () => {
      this.heroHeight = window.innerHeight;
    };
    window.addEventListener("resize", this.handleResize);

    // Heading click scrolls back to top
    this.heading.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  onScroll() {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / this.heroHeight, 1);

    // Canvas fade: 1 -> 0 over the first viewport of scroll
    this.canvas.style.opacity = 1 - progress;
    this.canvas.style.pointerEvents = progress > 0.5 ? "none" : "";

    // Heading: toggle top-left with hysteresis
    if (progress > 0.4 && !this.headingLocked) {
      this.heading.classList.add("top-left");
      this.headingLocked = true;
    } else if (progress <= 0.3 && this.headingLocked) {
      this.heading.classList.remove("top-left");
      this.headingLocked = false;
    }
  }

  setupSectionObserver() {
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "");
            if (id !== this.activeSection) {
              this.activeSection = id;
              this.onSectionChange?.(id);
            }
          }
        }
      },
      { threshold: 0.3 },
    );

    this.sections.forEach(({ element }) => {
      this.sectionObserver.observe(element);
    });
  }

  setupRevealObserver() {
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            this.revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0 },
    );

    this.sections.forEach(({ element }) => {
      this.revealObserver.observe(element);
    });
  }

  setupLazyObserver() {
    this.lazyObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "");
            this.onSectionVisible?.(id);
            this.lazyObserver.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px 200px 0px" },
    );

    this.sections.forEach(({ element }) => {
      this.lazyObserver.observe(element);
    });
  }

  /**
   * Called after intro completes - makes content visible and enables scrolling
   */
  reveal() {
    // Reset scroll to top before enabling scrolling
    window.scrollTo(0, 0);
    this.canvas.style.opacity = 1;

    this.content.classList.add("visible");
    document.body.classList.add("scrollable");

    // Now attach scroll listener and set up observers
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    this.setupSectionObserver();
    this.setupRevealObserver();
    this.setupLazyObserver();

    // Auto-scroll to first content section after intro
    setTimeout(() => {
      this.sections[0]?.element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 300);
  }

  /**
   * Smooth scroll to a section by ID
   */
  scrollToSection(sectionId) {
    const section = this.sections.find((s) => s.id === sectionId);
    if (section) {
      section.element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /**
   * Get current active section ID
   */
  getActiveSection() {
    return this.activeSection;
  }

  dispose() {
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);
    this.sectionObserver?.disconnect();
    this.revealObserver?.disconnect();
    this.lazyObserver?.disconnect();
  }
}
