/**
 * MaskSplit - Greyscale split & colorize effect.
 *
 * Image is duplicated into 4 quadrants via clip-path: inset().
 * Idle: pieces separated AND greyscale.
 * Hover: pieces join together AND colorize.
 * Keystroke: briefly scatters + greys out then returns.
 */

import { ImageEffect } from "./ImageEffect.js";

const GAP = 20; // px separation in idle state
const KEYSTROKE_GAP = 40;

const QUARTERS = [
  { key: "tl", inset: "0 50% 50% 0", dx: -1, dy: -1 },
  { key: "tr", inset: "0 0 50% 50%", dx: 1, dy: -1 },
  { key: "bl", inset: "50% 50% 0 0", dx: -1, dy: 1 },
  { key: "br", inset: "50% 0 0 50%", dx: 1, dy: 1 },
];

const TRANSITION =
  "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), filter 0.5s cubic-bezier(0.4, 0, 0.2, 1)";

export class MaskSplit extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = false;

    this._wrapper = null;
    this._pieces = [];
  }

  async init() {
    this._buildDOM();
    this._setupEvents();
    this._startLoop();
  }

  _buildDOM() {
    this._wrapper = document.createElement("div");
    this._wrapper.style.cssText =
      "width:100%;height:100%;position:relative;overflow:hidden;";

    this._pieces = QUARTERS.map((q, i) => {
      const piece = document.createElement("div");
      piece.style.cssText =
        "position:absolute;inset:0;will-change:transform,filter;" +
        `clip-path:inset(${q.inset});` +
        `transition:${TRANSITION};` +
        `transition-delay:${i * 50}ms;` +
        `transform:translate(${q.dx * GAP}px, ${q.dy * GAP}px);` +
        "filter:grayscale(1);";

      const img = document.createElement("img");
      img.src = this.imageSrc;
      img.alt = "";
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;";

      piece.appendChild(img);
      this._wrapper.appendChild(piece);
      return { el: piece, quarter: q };
    });

    this.container.appendChild(this._wrapper);
  }

  onHover() {
    for (const p of this._pieces) {
      p.el.style.transform = "translate(0, 0)";
      p.el.style.filter = "grayscale(0)";
    }
  }

  onLeave() {
    for (const p of this._pieces) {
      const q = p.quarter;
      p.el.style.transform = `translate(${q.dx * GAP}px, ${q.dy * GAP}px)`;
      p.el.style.filter = "grayscale(1)";
    }
  }

  triggerShockwave() {
    for (const p of this._pieces) {
      const q = p.quarter;
      p.el.style.transition = "transform 0.15s ease-out, filter 0.15s ease-out";
      p.el.style.transform = `translate(${q.dx * KEYSTROKE_GAP}px, ${q.dy * KEYSTROKE_GAP}px)`;
      p.el.style.filter = "grayscale(1) brightness(1.3)";
    }

    setTimeout(() => {
      if (this.isDisposed) return;
      for (const p of this._pieces) {
        const q = p.quarter;
        p.el.style.transition = TRANSITION;
        if (this.isHovered) {
          p.el.style.transform = "translate(0, 0)";
          p.el.style.filter = "grayscale(0)";
        } else {
          p.el.style.transform = `translate(${q.dx * GAP}px, ${q.dy * GAP}px)`;
          p.el.style.filter = "grayscale(1)";
        }
      }
    }, 150);
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
