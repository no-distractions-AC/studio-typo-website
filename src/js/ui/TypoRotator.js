/**
 * TypoRotator - Typewriter effect that types "Studio.Typo" letter by letter,
 * then cycles through typo corrections (backspace + retype) for the last letter.
 * Fires onComplete after one full cycle.
 */

import { prefersReducedMotion } from "../utils/device.js";

// Timing
const TYPE_SPEED = 120; // ms per character typed
const BACKSPACE_SPEED = 80; // ms per character deleted
const TYPO_PAUSE = 1000; // pause on each typo letter
const FINAL_PAUSE = 1400; // pause after returning to "o" before onComplete
const CURSOR_SETTLE = 1400; // let cursor blink a bit after typing finishes

// The full text broken into segments matching HTML spans
const SEGMENTS = [
  { target: "studio", text: "Studio" },
  { target: "dot", text: "." },
  { target: "typo-text", text: "Typ" },
  { target: "typo-o", text: "o" },
];

// Typo cycle letters (after initial type-out)
const TYPO_LETTERS = ["a", "c", "r", "o"];

export class TypoRotator {
  constructor(letterEl) {
    this.letterEl = letterEl; // #typo-rotating-letter (.heading-typo-o)

    // Grab sibling span references from the heading
    const brand = letterEl.closest(".heading-brand");
    this.studioEl = brand.querySelector(".heading-studio");
    this.dotEl = brand.querySelector(".heading-dot");
    this.typoTextEl = brand.querySelector(".heading-typo-text");

    this.cursor = null;
    this.timeoutId = null;
    this.isActive = false;
    this.onComplete = null;
  }

  /**
   * Start the typewriter animation.
   * @param {Function} onComplete - called after the full cycle finishes
   */
  start(onComplete) {
    if (this.isActive) return;

    this.onComplete = onComplete || null;

    if (prefersReducedMotion()) {
      this._showFinalState();
      setTimeout(() => this.onComplete?.(), 100);
      return;
    }

    this._clearText();
    this.isActive = true;
    this._createCursor();
    this._runTypewriter();
  }

  /** Stop animation and show final state */
  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this._removeCursor();
    this._showFinalState();
  }

  _clearText() {
    this.studioEl.textContent = "";
    this.dotEl.textContent = "";
    this.typoTextEl.textContent = "";
    this.letterEl.textContent = "";
    this.letterEl.classList.remove(
      "is-typo",
      "letter-exiting",
      "letter-entering",
    );
    delete this.letterEl.dataset.typoLetter;
    this._removeCursor();
  }

  _createCursor() {
    this.cursor = document.createElement("span");
    this.cursor.className = "typing-cursor";
    // Start cursor right after the studio span
    this.studioEl.after(this.cursor);
  }

  _removeCursor() {
    if (this.cursor) {
      this.cursor.remove();
      this.cursor = null;
    }
  }

  /** Move cursor to appear right after the given element */
  _moveCursorAfter(el) {
    if (this.cursor && el) {
      el.after(this.cursor);
    }
  }

  _getElForSegment(target) {
    switch (target) {
      case "studio":
        return this.studioEl;
      case "dot":
        return this.dotEl;
      case "typo-text":
        return this.typoTextEl;
      case "typo-o":
        return this.letterEl;
      default:
        return null;
    }
  }

  async _runTypewriter() {
    if (!this.isActive) return;

    // Phase 1: Type out "Studio.Typo" letter by letter
    for (const segment of SEGMENTS) {
      const el = this._getElForSegment(segment.target);
      for (let i = 0; i < segment.text.length; i++) {
        if (!this.isActive) return;
        el.textContent += segment.text[i];
        this._moveCursorAfter(el);
        await this._wait(TYPE_SPEED);
      }
    }

    // Brief pause after full text is typed
    if (!this.isActive) return;
    await this._wait(CURSOR_SETTLE);

    // Phase 2: Typo cycle — backspace last letter, type typo, repeat
    for (const typoLetter of TYPO_LETTERS) {
      if (!this.isActive) return;

      // Backspace the current last letter
      this.letterEl.textContent = "";
      this.letterEl.classList.remove("is-typo");
      delete this.letterEl.dataset.typoLetter;
      this._moveCursorAfter(this.letterEl);
      await this._wait(BACKSPACE_SPEED);

      if (!this.isActive) return;

      // Type the new letter
      this.letterEl.textContent = typoLetter;
      const isTypo = typoLetter !== "o";
      if (isTypo) {
        this.letterEl.classList.add("is-typo");
        this.letterEl.dataset.typoLetter = typoLetter;
      } else {
        this.letterEl.classList.remove("is-typo");
        this.letterEl.dataset.typoLetter = typoLetter;
      }
      this._moveCursorAfter(this.letterEl);

      // Pause on the letter
      const pause = typoLetter === "o" ? FINAL_PAUSE : TYPO_PAUSE;
      await this._wait(pause);
    }

    // Phase 3: Done — remove cursor and fire callback
    if (!this.isActive) return;
    this.isActive = false;
    this._removeCursor();
    this.onComplete?.();
  }

  _wait(ms) {
    return new Promise((resolve) => {
      this.timeoutId = setTimeout(resolve, ms);
    });
  }

  _showFinalState() {
    this.studioEl.textContent = "Studio";
    this.dotEl.textContent = ".";
    this.typoTextEl.textContent = "Typ";
    this.letterEl.textContent = "o";
    this.letterEl.classList.remove(
      "is-typo",
      "letter-exiting",
      "letter-entering",
    );
    delete this.letterEl.dataset.typoLetter;
    this._removeCursor();
  }

  dispose() {
    this.stop();
  }
}
