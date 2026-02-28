/**
 * RayBurst - Wedge explosion effect.
 *
 * Image is duplicated into 8 wedge-shaped fragments via clip-path: polygon().
 * Idle: wedges scatter outward with slight rotation.
 * Hover: wedges converge to center forming the complete image.
 * Keystroke: brief explosion burst then return.
 */

import { ImageEffect } from "./ImageEffect.js";

const SEGMENTS = 8;
const SCATTER_DIST = 35; // px
const SCATTER_ROT = 8; // degrees
const KEYSTROKE_DIST = 60;
const KEYSTROKE_ROT = 15;

const TRANSITION = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * Generate clip-path polygon points for a wedge sector.
 * Center at 50% 50%, with two edge points on the bounding box edge.
 */
function wedgeClipPath(index) {
  const step = 360 / SEGMENTS;
  const a1 = (index * step - 90) * (Math.PI / 180);
  const a2 = ((index + 1) * step - 90) * (Math.PI / 180);

  // Project rays to a large radius (100%) and clamp to box
  const r = 1.0; // normalized radius, enough to reach edges
  const x1 = 50 + Math.cos(a1) * r * 100;
  const y1 = 50 + Math.sin(a1) * r * 100;
  const x2 = 50 + Math.cos(a2) * r * 100;
  const y2 = 50 + Math.sin(a2) * r * 100;

  return `polygon(50% 50%, ${x1.toFixed(1)}% ${y1.toFixed(1)}%, ${x2.toFixed(1)}% ${y2.toFixed(1)}%)`;
}

/**
 * Get scatter direction (midpoint angle of the wedge).
 */
function scatterDir(index) {
  const step = 360 / SEGMENTS;
  const midAngle = ((index + 0.5) * step - 90) * (Math.PI / 180);
  return { dx: Math.cos(midAngle), dy: Math.sin(midAngle) };
}

export class RayBurst extends ImageEffect {
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

    for (let i = 0; i < SEGMENTS; i++) {
      const piece = document.createElement("div");
      const dir = scatterDir(i);
      const tx = dir.dx * SCATTER_DIST;
      const ty = dir.dy * SCATTER_DIST;
      const rot = (Math.random() - 0.5) * SCATTER_ROT * 2;

      piece.style.cssText =
        "position:absolute;inset:0;will-change:transform;" +
        `clip-path:${wedgeClipPath(i)};` +
        `transition:${TRANSITION};` +
        `transition-delay:${i * 30}ms;` +
        `transform:translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg);`;

      const img = document.createElement("img");
      img.src = this.imageSrc;
      img.alt = "";
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;";

      piece.appendChild(img);
      this._wrapper.appendChild(piece);
      this._pieces.push({ el: piece, dir, idleRot: rot, index: i });
    }

    this.container.appendChild(this._wrapper);
  }

  onHover() {
    for (const p of this._pieces) {
      p.el.style.transform = "translate(0, 0) rotate(0deg)";
    }
  }

  onLeave() {
    for (const p of this._pieces) {
      const tx = p.dir.dx * SCATTER_DIST;
      const ty = p.dir.dy * SCATTER_DIST;
      p.el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${p.idleRot.toFixed(1)}deg)`;
    }
  }

  triggerShockwave() {
    for (const p of this._pieces) {
      const tx = p.dir.dx * KEYSTROKE_DIST;
      const ty = p.dir.dy * KEYSTROKE_DIST;
      const rot = (Math.random() - 0.5) * KEYSTROKE_ROT * 2;
      p.el.style.transition = "transform 0.15s ease-out";
      p.el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
    }

    setTimeout(() => {
      if (this.isDisposed) return;
      for (const p of this._pieces) {
        p.el.style.transition = TRANSITION;
        if (this.isHovered) {
          p.el.style.transform = "translate(0, 0) rotate(0deg)";
        } else {
          const tx = p.dir.dx * SCATTER_DIST;
          const ty = p.dir.dy * SCATTER_DIST;
          p.el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${p.idleRot.toFixed(1)}deg)`;
        }
      }
    }, 150);
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
