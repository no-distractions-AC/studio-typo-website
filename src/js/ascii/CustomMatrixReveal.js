/**
 * CustomMatrixReveal - Two ASCII arts with collapsing horizontal sweep
 *
 * Before hover: Wide ASCII art of the image using custom characters (more columns, wider)
 * On hover: Horizontal sweep reveals normal high-quality ASCII art while width collapses
 */

const SWEEP_DURATION = 1500; // ms for the full sweep

export class CustomMatrixReveal {
  constructor(container, normalAscii, options = {}) {
    this.container = container;
    this.normalAscii = normalAscii;
    this.wideAscii = options.wideAscii || normalAscii;
    this.revealImage = options.revealImage || null;
    this.isHovered = false;
    this.isCompleted = false;
    this.animationFrame = null;
    this.revealStartTime = null;
    this.startWidth = 0;
    this.normalWidth = 0;
    this.wideHeight = 0;
    this.normalHeight = 0;
    this.measured = false;

    this.init();
  }

  init() {
    this.container.style.overflow = "hidden";

    // Wrapper controls visible dimensions and clips content
    this.wrapper = document.createElement("div");
    this.wrapper.style.position = "relative";
    this.wrapper.style.overflow = "hidden";

    // Wide pre (visible initially, in flow to set wrapper height)
    this.widePre = document.createElement("pre");
    this.widePre.className = "ascii-pre";
    this.widePre.textContent = this.wideAscii;

    // Normal pre (hidden initially)
    this.normalPre = document.createElement("pre");
    this.normalPre.className = "ascii-pre";
    this.normalPre.textContent = this.normalAscii;
    this.normalPre.style.position = "absolute";
    this.normalPre.style.top = "0";
    this.normalPre.style.left = "0";
    this.normalPre.style.opacity = "0";

    this.wrapper.appendChild(this.normalPre);
    this.wrapper.appendChild(this.widePre);
    this.container.appendChild(this.wrapper);

    // Measure dimensions after first paint
    requestAnimationFrame(() => {
      // Wide pre is in flow - wrapper has its height
      this.wideHeight = this.wrapper.offsetHeight;
      const wideFullWidth = this.widePre.scrollWidth;

      // Measure normal pre
      this.normalPre.style.position = "static";
      this.normalPre.style.opacity = "1";
      this.normalWidth = this.normalPre.scrollWidth;
      this.normalHeight = this.normalPre.scrollHeight;
      this.normalPre.style.position = "absolute";
      this.normalPre.style.opacity = "0";

      // Now position wide pre absolutely and set explicit wrapper size
      this.widePre.style.position = "absolute";
      this.widePre.style.top = "0";
      this.widePre.style.left = "0";

      // Start width = visible width (capped by container)
      this.startWidth = Math.min(wideFullWidth, this.container.clientWidth);
      this.wrapper.style.width = this.startWidth + "px";
      this.wrapper.style.height = this.wideHeight + "px";
      this.measured = true;
    });

    this.setupEvents();
  }

  setupEvents() {
    this.container.addEventListener("mouseenter", () => {
      this.isHovered = true;
      this.onHover();
    });

    this.container.addEventListener("mouseleave", () => {
      this.isHovered = false;
      this.onLeave();
    });
  }

  onHover() {
    if (this.isCompleted || !this.measured) return;
    this.startSweep();
  }

  startSweep() {
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / SWEEP_DURATION, 1);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      // Collapse wrapper width from startWidth to normalWidth
      const w = this.startWidth + (this.normalWidth - this.startWidth) * eased;
      const h = this.wideHeight + (this.normalHeight - this.wideHeight) * eased;
      this.wrapper.style.width = w + "px";
      this.wrapper.style.height = h + "px";

      // Cross-fade the two layers
      this.widePre.style.opacity = String(1 - eased);
      this.normalPre.style.opacity = String(eased);

      if (progress < 1 && this.isHovered) {
        this.animationFrame = requestAnimationFrame(animate);
      } else if (progress >= 1) {
        this.isCompleted = true;
        this.revealStartTime = performance.now();
        if (this.isHovered) {
          this.animationFrame = requestAnimationFrame(animate);
        }
      }

      // Check if we should reveal the image (1 second after completion)
      if (this.isCompleted && this.isHovered && this.revealStartTime) {
        const timeSinceComplete = currentTime - this.revealStartTime;
        if (timeSinceComplete > 1000 && this.revealImage) {
          this.wrapper.style.transition = "opacity 0.5s ease";
          this.wrapper.style.opacity = "0";
          this.revealImage.classList.add("visible");
        }
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  onLeave() {
    if (this.revealImage) {
      this.revealImage.classList.remove("visible");
    }

    // Restore wrapper
    this.wrapper.style.transition = "opacity 0.3s ease";
    this.wrapper.style.opacity = "1";

    this.revealStartTime = null;

    if (!this.isCompleted) {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }

      setTimeout(() => {
        if (!this.isHovered) {
          this.widePre.style.opacity = "1";
          this.normalPre.style.opacity = "0";
          this.wrapper.style.width = this.startWidth + "px";
          this.wrapper.style.height = this.wideHeight + "px";
        }
      }, 300);
    }
  }

  dispose() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
