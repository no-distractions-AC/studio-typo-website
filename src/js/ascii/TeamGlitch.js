/**
 * TeamGlitch - GlitchScramble adapted for team section
 * Continuous glitch loop. On hover: characters lock into place.
 * On leave: unlocks and resumes glitching.
 */

import { AsciiArt } from "./AsciiArt.js";

const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`░▒▓█▄▀■□▪▫";

export class TeamGlitch extends AsciiArt {
  constructor(container, asciiString, options = {}) {
    const { onFormComplete, onScatter, ...parentOptions } = options;
    super(container, asciiString, parentOptions);

    this._onFormComplete = onFormComplete || (() => {});
    this._onScatter = onScatter || (() => {});
    this.charStates = [];

    this.initGlitch();
  }

  initGlitch() {
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

    this.startGlitching();
  }

  startGlitching() {
    const glitch = () => {
      if (this.isHovered) {
        this.animationFrame = requestAnimationFrame(glitch);
        return;
      }

      const now = performance.now();

      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const state = this.charStates[row][col];
          const originalChar = this.getChar(row, col);

          if (originalChar === " " || state.locked) continue;

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
    this._onFormComplete();

    // Reveal all characters immediately
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const originalChar = this.getChar(row, col);
        if (originalChar === " ") continue;

        this.setChar(row, col, originalChar);
        this.getElement(row, col)?.classList.remove("glitching");
      }
    }

    // Staggered lock-in for visual effect
    const lockOrder = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.getChar(row, col) !== " ") {
          lockOrder.push({ row, col });
        }
      }
    }

    for (let i = lockOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lockOrder[i], lockOrder[j]] = [lockOrder[j], lockOrder[i]];
    }

    lockOrder.forEach((pos, index) => {
      setTimeout(
        () => {
          if (!this.isHovered) return;
          const { row, col } = pos;
          this.charStates[row][col].locked = true;
          this.getElement(row, col)?.classList.add("locked");
        },
        index * 5 + Math.random() * 15,
      );
    });
  }

  onLeave() {
    this._onScatter();

    setTimeout(() => {
      if (!this.isHovered) {
        for (let row = 0; row < this.rows; row++) {
          for (let col = 0; col < this.cols; col++) {
            this.charStates[row][col].locked = false;
            this.getElement(row, col)?.classList.remove("locked");
          }
        }
      }
    }, 200);
  }
}
