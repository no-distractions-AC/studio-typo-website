/**
 * AsciiArt - Base class for ASCII art animations
 */

export class AsciiArt {
  constructor(container, asciiString, options = {}) {
    this.container = container;
    this.asciiString = asciiString;
    this.lines = asciiString.split("\n");
    this.rows = this.lines.length;
    this.cols = Math.max(...this.lines.map((l) => l.length));
    this.elements = [];
    this.isHovered = false;
    this.animationFrame = null;
    this.colors = options.colors || null;
    this.revealImage = options.revealImage || null;
    this.isCompleted = false;

    this.init();
  }

  /**
   * Initialize the ASCII art
   */
  init() {
    this.createGrid();
    this.sizeRevealImage();
    this.setupEvents();
  }

  /**
   * Create grid of span elements for each character
   */
  createGrid() {
    // Remove existing pre element but preserve other elements (like reveal image)
    const existingPre = this.container.querySelector(".ascii-pre");
    if (existingPre) {
      existingPre.remove();
    }

    const pre = document.createElement("pre");
    pre.className = "ascii-pre";

    for (let row = 0; row < this.rows; row++) {
      const line = this.lines[row] || "";
      const rowElements = [];

      for (let col = 0; col < this.cols; col++) {
        const char = line[col] || " ";
        const span = document.createElement("span");
        span.className = "ascii-char";
        span.textContent = char;
        span.dataset.row = row;
        span.dataset.col = col;
        span.dataset.char = char;

        // Apply color if available
        if (this.colors && this.colors[row] && this.colors[row][col]) {
          const color = this.colors[row][col];
          const boost = 1.3;
          const r = Math.min(255, Math.round(color.r * boost));
          const g = Math.min(255, Math.round(color.g * boost));
          const b = Math.min(255, Math.round(color.b * boost));
          span.style.color = `rgb(${r},${g},${b})`;
        }

        pre.appendChild(span);
        rowElements.push(span);
      }

      // Add newline
      pre.appendChild(document.createTextNode("\n"));
      this.elements.push(rowElements);
    }

    this.container.appendChild(pre);
  }

  /**
   * Set up hover events
   */
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

  /**
   * Get character at position
   */
  getChar(row, col) {
    const line = this.lines[row] || "";
    return line[col] || " ";
  }

  /**
   * Set character display
   */
  setChar(row, col, char) {
    if (this.elements[row] && this.elements[row][col]) {
      this.elements[row][col].textContent = char;
    }
  }

  /**
   * Get element at position
   */
  getElement(row, col) {
    return this.elements[row]?.[col];
  }

  /**
   * Override in subclass - called on hover
   */
  onHover() {}

  /**
   * Override in subclass - called on leave
   */
  onLeave() {}

  /**
   * Show the reveal image (call from subclass when effect completes)
   */
  showRevealImage() {
    if (this.revealImage) {
      this.revealImage.classList.add("visible");
    }
  }

  /**
   * Hide the reveal image
   */
  hideRevealImage() {
    if (this.revealImage) {
      this.revealImage.classList.remove("visible");
    }
  }

  /**
   * Measure actual character dimensions from the container's computed styles
   */
  measureCharDimensions() {
    const pre = this.container.querySelector(".ascii-pre");
    const referenceElement = pre || this.container;

    // Create a hidden test element to measure actual character dimensions
    const testSpan = document.createElement("span");
    testSpan.textContent = "M"; // Use 'M' as reference (consistent monospace char)
    testSpan.style.cssText = `
      position: absolute;
      visibility: hidden;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      letter-spacing: inherit;
      white-space: pre;
    `;
    referenceElement.appendChild(testSpan);

    const charWidth = testSpan.getBoundingClientRect().width;
    const charHeight = testSpan.getBoundingClientRect().height;

    testSpan.remove();

    return { charWidth, charHeight };
  }

  /**
   * Size the reveal image to match the ASCII art dimensions
   */
  sizeRevealImage() {
    if (!this.revealImage) return;

    const pre = this.container.querySelector(".ascii-pre");
    if (!pre) return;

    // Measure actual character dimensions
    const { charWidth, charHeight } = this.measureCharDimensions();

    // Calculate exact dimensions based on character grid
    const width = this.cols * charWidth;
    const height = this.rows * charHeight;

    // Get the padding from the container (where the pre starts)
    const containerStyle = getComputedStyle(this.container);
    const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;

    // Apply exact dimensions and position to reveal image
    this.revealImage.style.width = `${width}px`;
    this.revealImage.style.height = `${height}px`;
    this.revealImage.style.top = `${paddingTop}px`;
    this.revealImage.style.left = `${paddingLeft}px`;
  }

  /**
   * Fade out all ASCII characters
   */
  fadeOutAscii() {
    const pre = this.container.querySelector(".ascii-pre");
    if (pre) {
      pre.style.transition = "opacity 0.5s ease";
      pre.style.opacity = "0";
    }
  }

  /**
   * Fade in all ASCII characters
   */
  fadeInAscii() {
    const pre = this.container.querySelector(".ascii-pre");
    if (pre) {
      pre.style.transition = "opacity 0.3s ease";
      pre.style.opacity = "1";
    }
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
