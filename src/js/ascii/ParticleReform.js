/**
 * ParticleReform - Characters scatter and reform on hover
 */

import { AsciiArt } from "./AsciiArt.js";

export class ParticleReform extends AsciiArt {
  constructor(container, asciiString, options = {}) {
    super(container, asciiString, options);
    this.particles = [];
    this.isFormed = false;
    this.revealStartTime = null;
    this.initParticles();
  }

  /**
   * Measure actual character dimensions from the container's computed styles
   */
  measureCharDimensions() {
    const pre = this.container.querySelector(".ascii-pre");
    const referenceElement = pre || this.container;

    // Create a hidden test element to measure actual character width
    const testSpan = document.createElement("span");
    testSpan.textContent = "M"; // Use 'M' as reference (widest char in most fonts)
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

  initParticles() {
    // Set container to relative for absolute positioning
    this.container.style.position = "relative";

    const pre = this.container.querySelector(".ascii-pre");
    if (pre) {
      pre.style.position = "relative";
    }

    // Measure actual character dimensions from the container
    const { charWidth, charHeight } = this.measureCharDimensions();

    // Initialize particle positions
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const element = this.getElement(row, col);
        const char = this.getChar(row, col);

        if (!element || char === " ") continue;

        // Calculate target position (where char should be)
        const targetX = col * charWidth;
        const targetY = row * charHeight;

        // Random scattered position
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 150;
        const scatteredX = targetX + Math.cos(angle) * distance;
        const scatteredY = targetY + Math.sin(angle) * distance;

        const particle = {
          element,
          row,
          col,
          targetX,
          targetY,
          currentX: scatteredX,
          currentY: scatteredY,
          velocityX: 0,
          velocityY: 0,
        };

        this.particles.push(particle);

        // Style for absolute positioning
        element.style.position = "absolute";
        element.style.left = "0";
        element.style.top = "0";
        element.style.transform = `translate(${scatteredX}px, ${scatteredY}px)`;
        element.classList.add("particle");
      }
    }

    // Start physics simulation
    this.startPhysics();
  }

  startPhysics() {
    const animate = () => {
      for (const particle of this.particles) {
        let targetX, targetY;

        if (this.isHovered) {
          // Move towards formed position
          targetX = particle.targetX;
          targetY = particle.targetY;
        } else {
          // Stay scattered or drift
          targetX = particle.currentX + (Math.random() - 0.5) * 2;
          targetY = particle.currentY + (Math.random() - 0.5) * 2;
        }

        // Spring physics
        const springStrength = this.isHovered ? 0.08 : 0.01;
        const damping = 0.85;

        const dx = targetX - particle.currentX;
        const dy = targetY - particle.currentY;

        particle.velocityX += dx * springStrength;
        particle.velocityY += dy * springStrength;
        particle.velocityX *= damping;
        particle.velocityY *= damping;

        particle.currentX += particle.velocityX;
        particle.currentY += particle.velocityY;

        particle.element.style.transform = `translate(${particle.currentX}px, ${particle.currentY}px)`;

        // Add formed class when close to target
        if (this.isHovered) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) {
            particle.element.classList.add("particle-formed");
          }
        } else if (!this.isCompleted) {
          particle.element.classList.remove("particle-formed");
        }
      }

      // Check if all particles are formed and start reveal timer
      if (this.isHovered && !this.isCompleted) {
        const allFormed = this.particles.every((p) => {
          const pdx = p.targetX - p.currentX;
          const pdy = p.targetY - p.currentY;
          return Math.sqrt(pdx * pdx + pdy * pdy) < 2;
        });
        if (allFormed) {
          this.isCompleted = true;
          this.revealStartTime = performance.now();
        }
      }

      // Check if we should reveal the image
      if (this.isCompleted && this.isHovered && this.revealStartTime) {
        const timeSinceComplete = performance.now() - this.revealStartTime;
        if (timeSinceComplete > 1000) {
          this.fadeOutAscii();
          this.showRevealImage();
        }
      }

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  onHover() {
    this.isFormed = true;
  }

  onLeave() {
    // Hide reveal image and show ASCII again
    this.hideRevealImage();
    this.fadeInAscii();
    this.revealStartTime = null;

    setTimeout(() => {
      if (!this.isHovered && !this.isCompleted) {
        this.isFormed = false;

        // Explode particles
        for (const particle of this.particles) {
          const angle = Math.random() * Math.PI * 2;
          const force = 5 + Math.random() * 10;
          particle.velocityX += Math.cos(angle) * force;
          particle.velocityY += Math.sin(angle) * force;
        }
      }
    }, 100);
  }
}
