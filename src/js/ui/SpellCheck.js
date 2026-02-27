/**
 * SpellCheck - Client-side spell checking with visual highlights
 * Uses a mirror overlay to render typo highlights on a textarea
 */

import { debounce } from "../utils/helpers.js";
import { DICTIONARY } from "../data/dictionary.js";

export class SpellCheck {
  constructor(textareaEl, mirrorEl) {
    this.textarea = textareaEl;
    this.mirror = mirrorEl;
    this.dictionary = new Set(DICTIONARY);
    this.previousTypos = new Set();
    this.attached = false;
    this.resizeObserver = null;

    this.debouncedCheck = debounce(() => this.check(), 300);
  }

  attach() {
    if (this.attached) return;
    this.attached = true;

    this.textarea.addEventListener("input", this.handleInput);
    this.textarea.addEventListener("scroll", this.syncScroll);

    this.syncMirrorSize();
    this.resizeObserver = new ResizeObserver(() => this.syncMirrorSize());
    this.resizeObserver.observe(this.textarea);
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;

    this.textarea.removeEventListener("input", this.handleInput);
    this.textarea.removeEventListener("scroll", this.syncScroll);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.mirror.innerHTML = "";
  }

  handleInput = () => {
    this.debouncedCheck();
  };

  syncScroll = () => {
    this.mirror.scrollTop = this.textarea.scrollTop;
  };

  syncMirrorSize() {
    const computed = getComputedStyle(this.textarea);
    this.mirror.style.width = computed.width;
    this.mirror.style.height = computed.height;
  }

  check() {
    const text = this.textarea.value;
    if (!text.trim()) {
      this.mirror.innerHTML = "";
      this.previousTypos.clear();
      return;
    }

    const newTypos = new Set();
    let html = "";
    let lastIndex = 0;

    const wordPattern = /[a-zA-Z']+/g;
    let match;

    while ((match = wordPattern.exec(text)) !== null) {
      const word = match[0];
      const start = match.index;
      const end = start + word.length;

      // Add text before this word (escaped)
      html += this.escapeHtml(text.slice(lastIndex, start));

      // Strip leading/trailing apostrophes for lookup
      const stripped = word.replace(/^'+|'+$/g, "");
      const lower = stripped.toLowerCase();

      const isMisspelled =
        lower.length > 1 &&
        !this.dictionary.has(lower) &&
        !this.isLikelyProperNoun(word, start, text) &&
        !this.isNumber(word);

      if (isMisspelled) {
        const isNew = !this.previousTypos.has(lower);
        const className = isNew ? "typo-highlight new" : "typo-highlight";
        html += `<span class="${className}">${this.escapeHtml(word)}</span>`;
        newTypos.add(lower);
      } else {
        html += this.escapeHtml(word);
      }

      lastIndex = end;
    }

    // Add remaining text
    html += this.escapeHtml(text.slice(lastIndex));

    // Preserve trailing newline for correct height
    if (text.endsWith("\n")) {
      html += "<br>";
    }

    this.mirror.innerHTML = html;
    this.previousTypos = newTypos;
    this.syncScroll();

    // Remove "new" class after wiggle animation completes
    setTimeout(() => {
      this.mirror.querySelectorAll(".typo-highlight.new").forEach((el) => {
        el.classList.remove("new");
      });
    }, 350);
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  /**
   * Heuristic: if a word starts with uppercase and follows a sentence boundary
   * or is at the start of text, it might be a proper noun — be lenient
   */
  isLikelyProperNoun(word, position, fullText) {
    if (word.length <= 1) return false;
    if (word[0] !== word[0].toUpperCase()) return false;
    if (word === word.toUpperCase()) return false; // ALL CAPS — not a proper noun

    // If the lowercase version is in the dictionary, it's just capitalized
    // (e.g., "The" at start of sentence) — not a typo
    if (this.dictionary.has(word.toLowerCase())) return true;

    // Capitalized word not in dictionary — could be a name, skip flagging
    return true;
  }

  isNumber(word) {
    return /^\d+$/.test(word);
  }

  dispose() {
    this.detach();
  }
}
