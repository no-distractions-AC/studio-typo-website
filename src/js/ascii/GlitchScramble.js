/**
 * GlitchScramble - Characters glitch wildly, then stabilize on hover
 */

import { AsciiArt } from "./AsciiArt.js";

const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`░▒▓█▄▀■□▪▫";

export class GlitchScramble extends AsciiArt {
  constructor(container, asciiString, options = {}) {
    super(container, asciiString, options);
    this.charStates = [];
    this.glitchInterval = null;
    this.revealStartTime = null;
    this.initGlitch();
  }

  initGlitch() {
    // Initialize char states and start glitching
    for (let row = 0; row < this.rows; row++) {
      this.charStates[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.charStates[row][col] = {
          locked: false,
          glitchSpeed: 50 + Math.random() * 100,
          lastGlitch: 0,
        };
      }
    }

    // Start continuous glitching
    this.startGlitching();
  }

  startGlitching() {
    const glitch = () => {
      // Don't glitch at all while hovered - characters should stay revealed
      if (this.isHovered) {
        this.animationFrame = requestAnimationFrame(glitch);
        return;
      }

      const now = performance.now();

      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const state = this.charStates[row][col];
          const originalChar = this.getChar(row, col);

          if (originalChar === " ") continue;

          // Skip locked characters (they show the original)
          if (state.locked) {
            continue;
          }

          if (now - state.lastGlitch > state.glitchSpeed) {
            const glitchChar =
              GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            this.setChar(row, col, glitchChar);
            this.getElement(row, col)?.classList.add("glitching");
            state.lastGlitch = now;
          }
        }
      }

      this.animationFrame = requestAnimationFrame(glitch);
    };

    this.animationFrame = requestAnimationFrame(glitch);
  }

  onHover() {
    // Immediately reveal all characters to their original state
    // This prevents any glitching from showing through during hover
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const originalChar = this.getChar(row, col);
        if (originalChar === " ") continue;

        const element = this.getElement(row, col);
        this.setChar(row, col, originalChar);
        element?.classList.remove("glitching");
      }
    }

    // Lock in characters with staggered timing for visual effect
    const lockOrder = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.getChar(row, col) !== " ") {
          lockOrder.push({ row, col });
        }
      }
    }

    // Shuffle for random lock-in order
    for (let i = lockOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lockOrder[i], lockOrder[j]] = [lockOrder[j], lockOrder[i]];
    }

    // Lock in with stagger (visual effect only, chars already revealed)
    const totalDuration = lockOrder.length * 15 + 50; // Estimate total lock-in time

    lockOrder.forEach((pos, index) => {
      setTimeout(
        () => {
          if (!this.isHovered) return;

          const { row, col } = pos;
          const state = this.charStates[row][col];
          const element = this.getElement(row, col);

          state.locked = true;
          element?.classList.add("locked");
        },
        index * 15 + Math.random() * 30,
      );
    });

    // Mark as completed after all characters are locked in
    setTimeout(() => {
      if (this.isHovered) {
        this.isCompleted = true;
        this.revealStartTime = performance.now();
        this.checkForReveal();
      }
    }, totalDuration);
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

  onLeave() {
    // Hide reveal image and show ASCII again
    this.hideRevealImage();
    this.fadeInAscii();
    this.revealStartTime = null;

    // Unlock all after delay, but only if not completed
    setTimeout(() => {
      if (!this.isHovered && !this.isCompleted) {
        for (let row = 0; row < this.rows; row++) {
          for (let col = 0; col < this.cols; col++) {
            this.charStates[row][col].locked = false;
            this.getElement(row, col)?.classList.remove("locked");
          }
        }
      }
    }, 300);
  }
}
