/**
 * TeamPortrait - Extended ParticleReform for team section
 * Replaces reveal-image behavior with callbacks for showing details.
 * Unlike ParticleReform, the effect is repeatable (resets on mouse leave).
 */

import { ParticleReform } from "./ParticleReform.js";

export class TeamPortrait extends ParticleReform {
  constructor(container, asciiString, options = {}) {
    const { onFormComplete, onScatter, ...parentOptions } = options;
    super(container, asciiString, parentOptions);

    this._onFormComplete = onFormComplete || (() => {});
    this._onScatter = onScatter || (() => {});
    this.hasNotifiedComplete = false;
  }

  /**
   * Override initParticles to use a smaller scatter radius
   * (these portraits are much smaller than the trial page).
   */
  initParticles() {
    this.container.style.position = "relative";

    const pre = this.container.querySelector(".ascii-pre");
    if (pre) {
      pre.style.position = "relative";
    }

    let { charWidth, charHeight } = this.measureCharDimensions();

    // Fallback if measurement returns 0 (element not yet laid out)
    if (!charWidth || !charHeight) {
      charWidth = 3;
      charHeight = 5;
    }

    // Set explicit container size so it doesn't collapse
    // (all particles are position: absolute)
    this.container.style.width = `${this.cols * charWidth}px`;
    this.container.style.height = `${this.rows * charHeight}px`;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const element = this.getElement(row, col);
        const char = this.getChar(row, col);

        if (!element || char === " ") continue;

        const targetX = col * charWidth;
        const targetY = row * charHeight;

        // Start scattered for the flared-out initial effect
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50;
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

        element.style.position = "absolute";
        element.style.left = "0";
        element.style.top = "0";
        element.style.transform = `translate(${scatteredX}px, ${scatteredY}px)`;
        element.classList.add("particle");
      }
    }

    this.startPhysics();
  }

  /**
   * Override startPhysics to replace reveal-image behavior with callbacks.
   * The parent checks isCompleted and calls fadeOutAscii/showRevealImage.
   * We instead fire onFormComplete callback for the TeamSection to handle.
   */
  startPhysics() {
    const animate = () => {
      for (const particle of this.particles) {
        let targetX, targetY;

        if (this.isHovered) {
          targetX = particle.targetX;
          targetY = particle.targetY;
        } else {
          targetX = particle.currentX + (Math.random() - 0.5) * 2;
          targetY = particle.currentY + (Math.random() - 0.5) * 2;
        }

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

        if (this.isHovered) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) {
            particle.element.classList.add("particle-formed");
          }
        } else {
          particle.element.classList.remove("particle-formed");
        }
      }

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  onHover() {
    this.isFormed = true;
    this._onFormComplete();
  }

  onLeave() {
    this.revealStartTime = null;
    this.hasNotifiedComplete = false;
    this._onScatter();

    setTimeout(() => {
      if (!this.isHovered) {
        this.isFormed = false;

        // Explode particles outward (gentle for compact cards)
        for (const particle of this.particles) {
          const angle = Math.random() * Math.PI * 2;
          const force = 2 + Math.random() * 4;
          particle.velocityX += Math.cos(angle) * force;
          particle.velocityY += Math.sin(angle) * force;
        }
      }
    }, 100);
  }
}
