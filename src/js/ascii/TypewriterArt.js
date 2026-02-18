/**
 * TypewriterArt - Types out character-by-character with blinking cursor
 */

import { AsciiArt } from "./AsciiArt.js";

export class TypewriterArt extends AsciiArt {
  constructor(container, asciiString, options = {}) {
    super(container, asciiString, options);
    this.currentIndex = 0;
    this.totalChars = this.rows * this.cols;
    this.cursor = null;
    this.isTyping = false;
    this.revealStartTime = null;
    // Speed multiplier: 1 = normal, 2 = 2x faster, 0.5 = 2x slower
    this.speed = options.speed || 1;
    this.initTypewriter();
  }

  initTypewriter() {
    // Hide all characters initially
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const element = this.getElement(row, col);
        if (element) {
          element.style.opacity = "0";
        }
      }
    }

    // Create cursor element
    this.cursor = document.createElement("span");
    this.cursor.className = "typewriter-cursor";
    this.cursor.textContent = "█";
    this.container.querySelector(".ascii-pre")?.appendChild(this.cursor);
    this.updateCursorPosition(0, 0);
  }

  updateCursorPosition(row, col) {
    const element = this.getElement(row, col);
    if (element && this.cursor) {
      const rect = element.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      this.cursor.style.left = `${rect.left - containerRect.left}px`;
      this.cursor.style.top = `${rect.top - containerRect.top}px`;
    }
  }

  indexToPosition(index) {
    const row = Math.floor(index / this.cols);
    const col = index % this.cols;
    return { row, col };
  }

  onHover() {
    if (this.isTyping) return;
    this.isTyping = true;
    this.cursor?.classList.add("typing");
    this.startTyping();
  }

  onLeave() {
    // Hide reveal image and show ASCII again
    this.hideRevealImage();
    this.fadeInAscii();
    this.revealStartTime = null;

    // Quick reset only if not completed
    setTimeout(() => {
      if (!this.isHovered && !this.isCompleted) {
        this.isTyping = false;
        this.currentIndex = 0;
        this.cursor?.classList.remove("typing");

        // Hide all characters
        for (let row = 0; row < this.rows; row++) {
          for (let col = 0; col < this.cols; col++) {
            const element = this.getElement(row, col);
            if (element) {
              element.style.opacity = "0";
            }
          }
        }

        this.updateCursorPosition(0, 0);
      }
    }, 200);
  }

  startTyping() {
    const type = () => {
      if (!this.isHovered || this.currentIndex >= this.totalChars) {
        if (this.currentIndex >= this.totalChars) {
          this.isCompleted = true;
          this.cursor?.classList.remove("typing");
          this.cursor?.classList.add("done");

          // Start reveal timer
          if (!this.revealStartTime) {
            this.revealStartTime = performance.now();
            this.checkForReveal();
          }
        }
        return;
      }

      const { row, col } = this.indexToPosition(this.currentIndex);
      const element = this.getElement(row, col);
      const char = this.getChar(row, col);

      if (element) {
        element.style.opacity = "1";
        element.classList.add("typewriter-typed");
      }

      this.currentIndex++;

      // Update cursor position
      if (this.currentIndex < this.totalChars) {
        const nextPos = this.indexToPosition(this.currentIndex);
        this.updateCursorPosition(nextPos.row, nextPos.col);
      }

      // Variable typing speed (adjusted by speed multiplier)
      const baseDelay = char === " " ? 10 : 15 + Math.random() * 25;
      const delay = baseDelay / this.speed;
      setTimeout(type, delay);
    };

    type();
  }

  checkForReveal() {
    if (!this.isHovered || !this.isCompleted || !this.revealStartTime) return;

    const timeSinceComplete = performance.now() - this.revealStartTime;
    if (timeSinceComplete > 1000) {
      this.fadeOutAscii();
      this.showRevealImage();
    } else {
      requestAnimationFrame(() => this.checkForReveal());
    }
  }
}
