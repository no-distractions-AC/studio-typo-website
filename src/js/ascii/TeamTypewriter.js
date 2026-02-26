/**
 * TeamTypewriter - TypewriterArt adapted for team section
 * Auto-loops: types in, pauses, fades out, repeats.
 * Hover fires callbacks for detail panel.
 */

import { AsciiArt } from "./AsciiArt.js";

export class TeamTypewriter extends AsciiArt {
  constructor(container, asciiString, options = {}) {
    const { onFormComplete, onScatter, speed, ...parentOptions } = options;
    super(container, asciiString, parentOptions);

    this._onFormComplete = onFormComplete || (() => {});
    this._onScatter = onScatter || (() => {});
    this.speed = speed || 1;
    this.currentIndex = 0;
    this.totalChars = this.rows * this.cols;
    this.loopTimer = null;
    this.disposed = false;

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

    // Start the auto-loop
    this.startTyping();
  }

  indexToPosition(index) {
    const row = Math.floor(index / this.cols);
    const col = index % this.cols;
    return { row, col };
  }

  onHover() {
    this._onFormComplete();
  }

  onLeave() {
    this._onScatter();
  }

  startTyping() {
    const charsPerFrame = Math.max(1, Math.floor(this.totalChars / 120));

    const type = () => {
      if (this.disposed) return;

      if (this.currentIndex >= this.totalChars) {
        // Fully typed — pause, then fade out and restart
        this.loopTimer = setTimeout(() => {
          this.fadeOutAll(() => {
            this.loopTimer = setTimeout(() => {
              this.startTyping();
            }, 800);
          });
        }, 2000);
        return;
      }

      for (
        let i = 0;
        i < charsPerFrame && this.currentIndex < this.totalChars;
        i++
      ) {
        const { row, col } = this.indexToPosition(this.currentIndex);
        const element = this.getElement(row, col);

        if (element) {
          element.style.opacity = "1";
        }

        this.currentIndex++;
      }

      this.animationFrame = requestAnimationFrame(type);
    };

    this.currentIndex = 0;
    type();
  }

  fadeOutAll(onComplete) {
    if (this.disposed) return;

    const charsPerFrame = Math.max(1, Math.floor(this.totalChars / 60));
    let index = 0;

    const fade = () => {
      if (this.disposed) return;

      if (index >= this.totalChars) {
        if (onComplete) onComplete();
        return;
      }

      for (let i = 0; i < charsPerFrame && index < this.totalChars; i++) {
        const { row, col } = this.indexToPosition(index);
        const element = this.getElement(row, col);
        if (element) {
          element.style.opacity = "0";
        }
        index++;
      }

      this.animationFrame = requestAnimationFrame(fade);
    };

    fade();
  }

  dispose() {
    this.disposed = true;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
    }
    super.dispose();
  }
}
