/**
 * MatrixReveal - Characters rain down Matrix-style and settle into the artwork
 */

import { AsciiArt } from "./AsciiArt.js";

const MATRIX_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";

export class MatrixReveal extends AsciiArt {
  constructor(container, asciiString, options = {}) {
    super(container, asciiString, options);
    this.columnStates = [];
    this.isRevealed = false;
    this.revealStartTime = null;
    this.initMatrix();
  }

  initMatrix() {
    // Initialize column states
    for (let col = 0; col < this.cols; col++) {
      this.columnStates[col] = {
        currentRow: -1,
        revealed: false,
        delay: Math.random() * 500,
      };
    }

    // Initially show random characters
    this.scramble();
  }

  scramble() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const originalChar = this.getChar(row, col);
        if (originalChar !== " ") {
          const randomChar =
            MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          this.setChar(row, col, randomChar);
          this.getElement(row, col)?.classList.add("matrix-char");
        }
      }
    }
  }

  onHover() {
    if (this.isRevealed) return;
    this.isRevealed = true;
    this.startRain();
  }

  resetColumns() {
    for (let col = 0; col < this.cols; col++) {
      this.columnStates[col].currentRow = -1;
      this.columnStates[col].revealed = false;
      this.columnStates[col].delay = Math.random() * 500;
    }
  }

  startRain() {
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      let allDone = true;

      for (let col = 0; col < this.cols; col++) {
        const state = this.columnStates[col];

        if (state.revealed) continue;
        if (elapsed < state.delay) {
          allDone = false;
          continue;
        }

        const adjustedTime = elapsed - state.delay;
        const targetRow = Math.floor(adjustedTime / 40); // Speed of rain

        if (targetRow > state.currentRow && state.currentRow < this.rows) {
          state.currentRow = Math.min(targetRow, this.rows - 1);

          // Rain effect: show random chars above, reveal correct char at current row
          for (let row = 0; row <= state.currentRow; row++) {
            const originalChar = this.getChar(row, col);
            const element = this.getElement(row, col);

            if (originalChar !== " ") {
              if (row === state.currentRow) {
                // Reveal the correct character
                this.setChar(row, col, originalChar);
                element?.classList.remove("matrix-char");
                element?.classList.add("matrix-revealed");
              }
            }
          }
        }

        if (state.currentRow >= this.rows - 1) {
          state.revealed = true;
        } else {
          allDone = false;
        }
      }

      if (allDone) {
        this.isCompleted = true;
        // Start reveal timer - after 1 second of completed state, start revealing image
        if (!this.revealStartTime) {
          this.revealStartTime = performance.now();
        }
      }

      // Check if we should reveal the image (1 second after completion while still hovering)
      if (this.isCompleted && this.isHovered && this.revealStartTime) {
        const timeSinceComplete = performance.now() - this.revealStartTime;
        if (timeSinceComplete > 1000) {
          this.fadeOutAscii();
          this.showRevealImage();
        }
      }

      if (!allDone && this.isHovered) {
        this.animationFrame = requestAnimationFrame(animate);
      } else if (this.isHovered) {
        // Continue animation loop to check for reveal
        this.animationFrame = requestAnimationFrame(animate);
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  onLeave() {
    // Hide reveal image and show ASCII again
    this.hideRevealImage();
    this.fadeInAscii();
    this.revealStartTime = null;

    // Reset after a delay if not completed
    setTimeout(() => {
      if (!this.isHovered && !this.isCompleted) {
        this.isRevealed = false;
        this.resetColumns();
        this.scramble();
      }
    }, 300);
  }
}
