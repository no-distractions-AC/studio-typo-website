/**
 * FourCorners - Quadrant split & join effect.
 *
 * Image is duplicated into 4 quadrants via clip-path: inset().
 * Idle: quadrants are separated with a gap.
 * Hover: quadrants slide together forming the complete image.
 * Keystroke: briefly scatters quadrants outward.
 */

import { ImageEffect } from "./ImageEffect.js";

const GAP = 14; // px separation in idle state
const KEYSTROKE_GAP = 30; // px separation on keystroke

const CORNERS = [
  { key: "tl", inset: "0 50% 50% 0", dx: -1, dy: -1 },
  { key: "tr", inset: "0 0 50% 50%", dx: 1, dy: -1 },
  { key: "bl", inset: "50% 50% 0 0", dx: -1, dy: 1 },
  { key: "br", inset: "50% 0 0 50%", dx: 1, dy: 1 },
];

const TRANSITION = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";

export class FourCorners extends ImageEffect {
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

    this._pieces = CORNERS.map((c, i) => {
      const piece = document.createElement("div");
      piece.style.cssText =
        "position:absolute;inset:0;will-change:transform;" +
        `clip-path:inset(${c.inset});` +
        `transition:${TRANSITION};` +
        `transition-delay:${i * 40}ms;` +
        `transform:translate(${c.dx * GAP}px, ${c.dy * GAP}px);`;

      const img = document.createElement("img");
      img.src = this.imageSrc;
      img.alt = "";
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;";

      piece.appendChild(img);
      this._wrapper.appendChild(piece);
      return { el: piece, corner: c };
    });

    this.container.appendChild(this._wrapper);
  }

  onHover() {
    for (const p of this._pieces) {
      p.el.style.transform = "translate(0, 0)";
    }
  }

  onLeave() {
    for (const p of this._pieces) {
      const c = p.corner;
      p.el.style.transform = `translate(${c.dx * GAP}px, ${c.dy * GAP}px)`;
    }
  }

  triggerShockwave() {
    for (const p of this._pieces) {
      const c = p.corner;
      p.el.style.transition = "transform 0.15s ease-out";
      p.el.style.transform = `translate(${c.dx * KEYSTROKE_GAP}px, ${c.dy * KEYSTROKE_GAP}px)`;
    }

    setTimeout(() => {
      if (this.isDisposed) return;
      for (const p of this._pieces) {
        const c = p.corner;
        p.el.style.transition = TRANSITION;
        if (this.isHovered) {
          p.el.style.transform = "translate(0, 0)";
        } else {
          p.el.style.transform = `translate(${c.dx * GAP}px, ${c.dy * GAP}px)`;
        }
      }
    }, 150);
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
