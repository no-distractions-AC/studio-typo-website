/**
 * TypoRotator - Typewriter effect that types "Studio.Typo" letter by letter,
 * then cycles through typo corrections (backspace + retype) for the last letter.
 * Fires onComplete after one full cycle.
 */

import { prefersReducedMotion } from "../utils/device.js";

// Default timing values
const DEFAULTS = {
  typeSpeed: 120,
  backspaceSpeed: 80,
  typoPause: 1000,
  finalPause: 1400,
  cursorSettle: 1400,
  autoScrollDelay: 800,
  cursorBlinkRate: 530,
};

const STORAGE_KEY = "typo-timings";

// Shared mutable timings object
const timings = { ...DEFAULTS };

// Load saved timings from localStorage
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved) Object.assign(timings, saved);
} catch {
  // ignore
}

/** Get current timings */
export function getTimings() {
  return { ...timings };
}

/** Get default timings */
export function getDefaults() {
  return { ...DEFAULTS };
}

/** Update timings (partial or full) */
export function setTimings(obj) {
  Object.assign(timings, obj);
  // Update cursor blink CSS variable
  document.documentElement.style.setProperty(
    "--cursor-blink-rate",
    `${timings.cursorBlinkRate}ms`,
  );
}

/** Save current timings to localStorage */
export function saveTimings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timings));
}

/** Reset timings to defaults and clear localStorage */
export function resetTimings() {
  Object.assign(timings, DEFAULTS);
  localStorage.removeItem(STORAGE_KEY);
  document.documentElement.style.setProperty(
    "--cursor-blink-rate",
    `${DEFAULTS.cursorBlinkRate}ms`,
  );
}

// The full text broken into segments matching HTML spans
const SEGMENTS = [
  { target: "studio", text: "Studio" },
  { target: "dot", text: "." },
  { target: "typo-text", text: "Typ" },
  { target: "typo-o", text: "a" },
];

// Typo cycle letters (after initial type-out of "a")
const TYPO_LETTERS = ["c", "r", "o"];

export class TypoRotator {
  constructor(letterEl, audioManager) {
    this.letterEl = letterEl; // #typo-rotating-letter (.heading-typo-o)
    this.audio = audioManager || null;

    // Grab sibling span references from the heading
    const brand = letterEl.closest(".heading-brand");
    this.studioEl = brand.querySelector(".heading-studio");
    this.dotEl = brand.querySelector(".heading-dot");
    this.typoTextEl = brand.querySelector(".heading-typo-text");

    this.cursor = null;
    this.timeoutId = null;
    this.isActive = false;
    this.onComplete = null;

    // Apply initial cursor blink rate
    document.documentElement.style.setProperty(
      "--cursor-blink-rate",
      `${timings.cursorBlinkRate}ms`,
    );
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
        if (segment.target === "typo-o") {
          this.letterEl.style.transition = "none";
          this.letterEl.classList.add("is-typo");
          this.letterEl.dataset.typoLetter = segment.text[i];
        }
        el.textContent += segment.text[i];
        if (segment.target === "typo-o") {
          this.letterEl.offsetHeight; // force style recalc
          this.letterEl.style.transition = "";
        }
        this._moveCursorAfter(el);
        this._playKey(segment.text[i]);
        await this._wait(timings.typeSpeed);
      }
    }

    // Brief pause after full text is typed
    if (!this.isActive) return;
    await this._wait(timings.cursorSettle);

    // Phase 2: Typo cycle — backspace last letter, type typo, repeat
    for (const typoLetter of TYPO_LETTERS) {
      if (!this.isActive) return;

      // Backspace the current last letter
      this.letterEl.textContent = "";
      this.letterEl.classList.remove("is-typo");
      delete this.letterEl.dataset.typoLetter;
      this._moveCursorAfter(this.letterEl);
      this._playKey("Backspace");
      await this._wait(timings.backspaceSpeed);

      if (!this.isActive) return;

      // Type the new letter
      this._playKey(typoLetter);
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
      const pause = typoLetter === "o" ? timings.finalPause : timings.typoPause;
      await this._wait(pause);
    }

    // Phase 3: Done — remove cursor and fire callback
    if (!this.isActive) return;
    this.isActive = false;
    this._removeCursor();
    this.onComplete?.();
  }

  /** Play a key press + release sound */
  _playKey(key) {
    if (!this.audio) return;
    this.audio.playKeyPress(key);
    setTimeout(() => this.audio.playKeyRelease(key), 50);
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
