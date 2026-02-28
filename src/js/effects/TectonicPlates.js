/**
 * TectonicPlates - Horizontal strips with lateral shear physics.
 *
 * 5 strips of varying height slide left/right based on cursor Y.
 * Strips above cursor slide left, below slide right.
 * Underdamped springs create visible wobble on settle.
 */

import { ImageEffect } from "./ImageEffect.js";

const SPRING = 0.06;
const DAMPING = 0.8;
const SHEAR_FORCE = 30;
const DRIFT_AMP = 2;
const KEYSTROKE_IMPULSE = 40;

const STRIPS = [
  { top: 0, bottom: 82, centerY: 0.09 },
  { top: 18, bottom: 60, centerY: 0.29 },
  { top: 40, bottom: 40, centerY: 0.5 },
  { top: 60, bottom: 18, centerY: 0.71 },
  { top: 82, bottom: 0, centerY: 0.91 },
];

export class TectonicPlates extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

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

    this._pieces = STRIPS.map((strip) => {
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;inset:0;will-change:transform;" +
        `clip-path:inset(${strip.top}% 0% ${strip.bottom}% 0%);`;

      const img = document.createElement("img");
      img.src = this.imageSrc;
      img.alt = "";
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;";

      el.appendChild(img);
      this._wrapper.appendChild(el);

      return {
        el,
        centerY: strip.centerY,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        vRot: 0,
        jitter: Math.random() * 100,
      };
    });

    this.container.appendChild(this._wrapper);
  }

  update(delta, elapsed) {
    for (let i = 0; i < this._pieces.length; i++) {
      const p = this._pieces[i];

      // Subtle vertical noise drift
      const driftY = Math.sin(elapsed * 0.35 + p.jitter) * DRIFT_AMP;
      let targetX = 0;
      let targetY = driftY;
      let targetRot = 0;

      if (this.isHovered) {
        // Cursor Y normalized 0-1 (top=0, bottom=1)
        const cursorY = 1 - this.mousePos.y;
        const diff = p.centerY - cursorY;
        targetX = diff * SHEAR_FORCE;
        targetRot = targetX * 0.04;
      }

      // Velocity spring
      p.vx = (p.vx + (targetX - p.x) * SPRING) * DAMPING;
      p.vy = (p.vy + (targetY - p.y) * SPRING) * DAMPING;
      p.vRot = (p.vRot + (targetRot - p.rot) * SPRING) * DAMPING;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;

      p.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.rot.toFixed(2)}deg)`;
    }
  }

  triggerShockwave() {
    // Alternating lateral impulses (seismograph)
    for (let i = 0; i < this._pieces.length; i++) {
      const p = this._pieces[i];
      const sign = i % 2 === 0 ? 1 : -1;
      // Stagger the impulse timing
      setTimeout(() => {
        if (this.isDisposed) return;
        p.vx += sign * KEYSTROKE_IMPULSE;
        p.vRot += sign * 2;
      }, i * 60);
    }
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
