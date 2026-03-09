/**
 * TypoRotator - Cycles the "o" in "Typo" through o, a, c, r
 * Shows colored letters with a red squiggly underline for non-"o" letters.
 */

import { prefersReducedMotion } from "../utils/device.js";

const LETTERS = ["o", "a", "c", "r"];
const O_DURATION = 1500; // 1.5s on the correct letter
const TYPO_DURATION = 1000; // 1s on each typo letter
const EXIT_DURATION = 120; // fade out timing
const ENTER_DURATION = 180; // fade in timing

export class TypoRotator {
  constructor(letterEl) {
    this.letterEl = letterEl;
    this.currentIndex = 0;
    this.timeoutId = null;
    this.isActive = false;
  }

  /** Start the rotation cycle */
  start() {
    if (this.isActive || prefersReducedMotion()) return;
    this.isActive = true;
    this.scheduleNext();
  }

  /** Stop rotation and reset to "o" */
  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.resetToOriginal();
  }

  scheduleNext() {
    if (!this.isActive) return;
    const delay = this.currentIndex === 0 ? O_DURATION : TYPO_DURATION;

    this.timeoutId = setTimeout(() => {
      this.advance();
      this.scheduleNext();
    }, delay);
  }

  advance() {
    this.currentIndex = (this.currentIndex + 1) % LETTERS.length;
    this.swapLetter(this.currentIndex);
  }

  swapLetter(index) {
    const letter = LETTERS[index];
    const isTypo = index !== 0;

    // Fade out
    this.letterEl.classList.add("letter-exiting");

    setTimeout(() => {
      // Swap text
      this.letterEl.textContent = letter;
      this.letterEl.classList.remove("letter-exiting");
      this.letterEl.classList.add("letter-entering");

      // Set letter data for color, squiggly only on non-"o" letters
      this.letterEl.dataset.typoLetter = letter;
      if (isTypo) {
        this.letterEl.classList.add("is-typo");
      } else {
        this.letterEl.classList.remove("is-typo");
      }

      // Clean up entering class after animation
      setTimeout(() => {
        this.letterEl.classList.remove("letter-entering");
      }, ENTER_DURATION);
    }, EXIT_DURATION);
  }

  resetToOriginal() {
    this.currentIndex = 0;
    this.letterEl.textContent = "o";
    this.letterEl.classList.remove(
      "is-typo",
      "letter-exiting",
      "letter-entering",
    );
    delete this.letterEl.dataset.typoLetter;
  }

  dispose() {
    this.stop();
  }
}
