/**
 * ScrollController - Orchestrates scroll-based heading animation,
 * canvas fade, section reveal, active section tracking,
 * and custom smooth scroll-snapping between sections.
 */

// Configurable snap parameters
const SNAP_DURATION = 400; // ms
const SNAP_EASING = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class ScrollController {
  constructor({
    headingEl,
    contentEl,
    canvasEl,
    navigation,
    typoRotator,
    onSectionChange,
    onSectionVisible,
  }) {
    this.heading = headingEl;
    this.content = contentEl;
    this.canvas = canvasEl;
    this.navigation = navigation;
    this.typoRotator = typoRotator;
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

    // Snap state
    this.snapTargets = [];
    this.currentSnapIndex = 0;
    this.isSnapping = false;
    this.handleWheel = null;

    // Scroll indicator
    this.scrollIndicator = document.getElementById("scroll-indicator");

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
    this.handleWheel = this._onWheel.bind(this);

    // Resize listener to update heroHeight
    this.handleResize = () => {
      this.heroHeight = window.innerHeight;
    };
    window.addEventListener("resize", this.handleResize);

    // Heading click scrolls back to top
    this.heading.addEventListener("click", () => {
      this.snapTo(0);
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

      // Show nav, hide hero elements
      this.navigation?.show();
      this.typoRotator?.stop();
      this.scrollIndicator?.classList.remove("visible");
    } else if (progress <= 0.3 && this.headingLocked) {
      this.heading.classList.remove("top-left");
      this.headingLocked = false;

      // Hide nav, show hero elements
      this.navigation?.hide();
      this.typoRotator?.start();
      this.scrollIndicator?.classList.add("visible");
    }
  }

  _onWheel(e) {
    e.preventDefault();
    if (this.isSnapping) return;

    if (e.deltaY > 0 && this.currentSnapIndex < this.snapTargets.length - 1) {
      this.snapTo(this.currentSnapIndex + 1);
    } else if (e.deltaY < 0 && this.currentSnapIndex > 0) {
      this.snapTo(this.currentSnapIndex - 1);
    }
  }

  snapTo(index) {
    if (index < 0 || index >= this.snapTargets.length) return;
    this.isSnapping = true;
    this.currentSnapIndex = index;

    const target = this.snapTargets[index].offsetTop;
    const start = window.scrollY;
    const distance = target - start;

    if (Math.abs(distance) < 1) {
      this.isSnapping = false;
      return;
    }

    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SNAP_DURATION, 1);
      const eased = SNAP_EASING(progress);
      window.scrollTo(0, start + distance * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isSnapping = false;
      }
    };
    requestAnimationFrame(animate);
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

    // Build snap targets: hero spacer + all sections
    this.snapTargets = [
      document.getElementById("hero-spacer"),
      ...this.sections.map((s) => s.element),
    ];

    // Attach listeners
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("wheel", this.handleWheel, { passive: false });
    this.setupSectionObserver();
    this.setupRevealObserver();
    this.setupLazyObserver();

    // Show scroll indicator and start letter rotation at hero
    this.scrollIndicator?.classList.add("visible");
    this.typoRotator?.start();

    // Auto-scroll to first content section after hero pause
    setTimeout(() => {
      this.snapTo(1);
    }, 2500);
  }

  /**
   * Smooth scroll to a section by ID
   */
  scrollToSection(sectionId) {
    const idx = this.snapTargets.findIndex(
      (el) => el.id === `section-${sectionId}`,
    );
    if (idx !== -1) {
      this.snapTo(idx);
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
    window.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("resize", this.handleResize);
    this.sectionObserver?.disconnect();
    this.revealObserver?.disconnect();
    this.lazyObserver?.disconnect();
  }
}
