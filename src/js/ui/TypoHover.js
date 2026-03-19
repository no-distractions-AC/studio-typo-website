/**
 * TypoHover - Global hover effect that turns letters into random "typos"
 * with a red wavy underline, extending the brand's typo concept site-wide.
 */

const TYPO_COLORS = ["#ff3b30", "#2dd4bf", "#a78bfa", "#34d399"];
const RANDOM_CHARS = "abcdefghijklmnopqrstuvwxyz";
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "SVG",
  "IMG",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "CANVAS",
  "VIDEO",
  "AUDIO",
  "IFRAME",
  "BR",
  "HR",
]);

export class TypoHover {
  constructor() {
    this.observer = null;
    this.audio = null;
    this._onMouseEnter = this._onMouseEnter.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
  }

  setAudioManager(audioManager) {
    this.audio = audioManager;
  }

  init() {
    // Process existing content
    const heading = document.getElementById("site-heading");
    const content = document.getElementById("content");
    const nav = document.getElementById("navigation");
    const enterScreen = document.getElementById("enter-screen");

    if (heading) this.processElement(heading);
    if (content) this.processElement(content);
    if (nav) this.processElement(nav);
    if (enterScreen) this.processElement(enterScreen);

    // Watch for dynamically added content
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processElement(node);
          }
        }
      }
    });

    const observeTarget = content || document.body;
    this.observer.observe(observeTarget, {
      childList: true,
      subtree: true,
    });

    // Also observe nav for dynamic nav links
    if (nav) {
      this.observer.observe(nav, { childList: true, subtree: true });
    }

    // Event delegation for hover
    document.body.addEventListener("mouseenter", this._onMouseEnter, true);
    document.body.addEventListener("mouseleave", this._onMouseLeave, true);
  }

  processElement(el) {
    // Skip the rotating letter in the logo
    if (el.id === "typo-rotating-letter") return;
    if (el.closest?.("#typo-rotating-letter")) return;

    // Skip elements that already have been processed
    if (el.dataset?.typoProcessed) return;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.id === "typo-rotating-letter")
          return NodeFilter.FILTER_REJECT;
        if (parent.classList?.contains("typo-letter"))
          return NodeFilter.FILTER_REJECT;
        if (parent.closest?.("#typo-rotating-letter"))
          return NodeFilter.FILTER_REJECT;
        if (parent.closest?.("svg")) return NodeFilter.FILTER_REJECT;
        if (parent.closest?.(".work-showcase-counter"))
          return NodeFilter.FILTER_REJECT;
        // Only process nodes with actual visible characters
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (const textNode of textNodes) {
      this._wrapTextNode(textNode);
    }

    el.dataset.typoProcessed = "1";
  }

  _wrapTextNode(textNode) {
    const text = textNode.textContent;
    if (!text) return;

    const fragment = document.createDocumentFragment();

    for (const char of text) {
      if (char.trim() === "") {
        // Preserve whitespace as-is
        fragment.appendChild(document.createTextNode(char));
      } else {
        const span = document.createElement("span");
        span.className = "typo-letter";
        span.textContent = char;
        fragment.appendChild(span);
      }
    }

    textNode.parentNode.replaceChild(fragment, textNode);
  }

  _applyTypo(el) {
    if (el.dataset.original) return; // already typo'd
    el.dataset.original = el.textContent;
    el.textContent =
      RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
    el.classList.add("typo-hover-active");
    el.style.color =
      TYPO_COLORS[Math.floor(Math.random() * TYPO_COLORS.length)];
    this.audio?.playKeyPress(el.textContent);
  }

  _removeTypo(el) {
    if (!el.dataset.original) return;
    el.textContent = el.dataset.original;
    el.classList.remove("typo-hover-active");
    el.style.color = "";
    delete el.dataset.original;
    this.audio?.playKeyRelease(el.textContent);
  }

  _getNeighbors(el, count) {
    const neighbors = [];
    let prev = el.previousElementSibling;
    let next = el.nextElementSibling;

    for (let i = 0; i < count; i++) {
      // Alternate between picking next and prev neighbors
      if (i % 2 === 0 && next?.classList?.contains("typo-letter")) {
        neighbors.push(next);
        next = next.nextElementSibling;
      } else if (prev?.classList?.contains("typo-letter")) {
        neighbors.push(prev);
        prev = prev.previousElementSibling;
      } else if (next?.classList?.contains("typo-letter")) {
        neighbors.push(next);
        next = next.nextElementSibling;
      }
    }
    return neighbors;
  }

  _onMouseEnter(e) {
    const el = e.target;
    if (!el.classList?.contains("typo-letter")) return;
    // Already typo'd as someone else's neighbor — don't cascade
    if (el.dataset.original) return;

    // Apply typo to hovered letter
    this._applyTypo(el);

    // Roll for spread: 80% single, 15% +1 neighbor, 5% +2 neighbors
    const roll = Math.random();
    let spreadCount = 0;
    if (roll > 0.95) {
      spreadCount = 2;
    } else if (roll > 0.8) {
      spreadCount = 1;
    }

    const neighbors = this._getNeighbors(el, spreadCount);
    for (const neighbor of neighbors) {
      this._applyTypo(neighbor);
    }

    // Store neighbors for cleanup
    el._typoNeighbors = neighbors;
  }

  _onMouseLeave(e) {
    const el = e.target;
    if (!el.classList?.contains("typo-letter")) return;

    this._removeTypo(el);

    // Clean up neighbors
    if (el._typoNeighbors) {
      for (const neighbor of el._typoNeighbors) {
        this._removeTypo(neighbor);
      }
      delete el._typoNeighbors;
    }
  }

  dispose() {
    this.observer?.disconnect();
    document.body.removeEventListener("mouseenter", this._onMouseEnter, true);
    document.body.removeEventListener("mouseleave", this._onMouseLeave, true);
  }
}
