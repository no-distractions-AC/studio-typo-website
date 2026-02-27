/**
 * TypingReaction - Highlights matching letters across the page when typing
 * Only the exact characters that match the typed key light up;
 * everything else stays completely still.
 */

export class TypingReaction {
  constructor(sectionEl, audioManager, particleCanvas) {
    this.section = sectionEl;
    this.audioManager = audioManager || null;
    this.particleCanvas = particleCanvas || null;
    this.reactiveElements = [];
    this.attached = false;
    this.charsSplit = false;
    this.handleKeystroke = this.handleKeystroke.bind(this);
    this.handleKeyup = this.handleKeyup.bind(this);
  }

  init() {
    this.reactiveElements = [
      ...this.section.querySelectorAll(".contact-reactive"),
    ];

    // Pre-split all text into individual char spans for letter highlighting
    if (!this.charsSplit) {
      this.splitTextIntoChars();
      this.charsSplit = true;
    }
  }

  attach() {
    if (this.attached) return;
    this.attached = true;

    const inputs = this.section.querySelectorAll(".form-input, .form-textarea");
    inputs.forEach((input) => {
      input.addEventListener("keydown", this.handleKeystroke);
      input.addEventListener("keyup", this.handleKeyup);
    });
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;

    const inputs = this.section.querySelectorAll(".form-input, .form-textarea");
    inputs.forEach((input) => {
      input.removeEventListener("keydown", this.handleKeystroke);
      input.removeEventListener("keyup", this.handleKeyup);
    });
  }

  /**
   * Split all text inside reactive elements into individual <span class="char"> wrappers
   * so we can highlight matching letters on keystroke
   */
  splitTextIntoChars() {
    for (const el of this.reactiveElements) {
      this.splitNode(el);
    }
  }

  splitNode(node) {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        if (!text.trim()) continue;
        const frag = document.createDocumentFragment();
        for (const ch of text) {
          if (/[a-zA-Z]/.test(ch)) {
            const span = document.createElement("span");
            span.className = "char";
            span.dataset.char = ch.toLowerCase();
            span.textContent = ch;
            frag.appendChild(span);
          } else {
            frag.appendChild(document.createTextNode(ch));
          }
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        this.splitNode(child);
      }
    }
  }

  handleKeystroke(event) {
    this.audioManager?.playKeyPress(event.key);
    if (event.key.length !== 1) return;
    this.particleCanvas?.spawn(event.key);
  }

  handleKeyup(event) {
    this.audioManager?.playKeyRelease(event.key);
  }

  /**
   * Highlight every matching character on the page — only those chars change,
   * non-matching characters stay completely untouched
   */
  highlightMatchingChars(key) {
    const lower = key.toLowerCase();
    const matches = this.section.querySelectorAll(
      `.char[data-char="${lower}"]`,
    );
    matches.forEach((span) => {
      span.classList.remove("char-lit");
      void span.offsetWidth; // force reflow to restart animation
      span.classList.add("char-lit");
    });
  }

  dispose() {
    this.detach();
    this.reactiveElements = [];
  }
}
