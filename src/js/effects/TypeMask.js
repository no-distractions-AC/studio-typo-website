/**
 * TypeMask - "TYPO" letters as image mask with spring physics.
 *
 * Giant "TYPO" letters filled with the image via background-clip: text.
 * Hover pushes letters apart with spring physics, revealing a ghosted
 * image beneath. Keystroke scatters letters with velocity impulse.
 */

import { ImageEffect } from "./ImageEffect.js";

const SPRING = 0.06;
const DAMPING = 0.84;
const REPEL_RADIUS = 200;
const REPEL_FORCE = 20;
const KEYSTROKE_IMPULSE = 40;

const LETTERS = ["T", "Y", "P", "O"];

export class TypeMask extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._wrapper = null;
    this._ghostImg = null;
    this._pieces = [];
  }

  async init() {
    this._buildDOM();
    this._setupEvents();
    this._startLoop();
  }

  _buildDOM() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this._wrapper = document.createElement("div");
    this._wrapper.style.cssText =
      "width:100%;height:100%;position:relative;overflow:hidden;" +
      "display:flex;align-items:center;justify-content:center;" +
      "background:#0f1114;";

    // Ghost image (visible when letters spread)
    this._ghostImg = document.createElement("img");
    this._ghostImg.src = this.imageSrc;
    this._ghostImg.alt = "";
    this._ghostImg.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" +
      "opacity:0.12;pointer-events:none;";
    this._wrapper.appendChild(this._ghostImg);

    // Letter container
    const letterContainer = document.createElement("div");
    letterContainer.style.cssText =
      "display:flex;align-items:center;justify-content:center;" +
      "position:relative;z-index:1;gap:0;";

    // Calculate font size to fill container width
    const fontSize = Math.min(w * 0.22, h * 0.7);

    this._pieces = LETTERS.map((letter, i) => {
      const span = document.createElement("span");
      span.textContent = letter;
      span.style.cssText =
        `font-family:"Space Mono",monospace;font-weight:700;` +
        `font-size:${fontSize.toFixed(0)}px;line-height:1;` +
        `background-image:url(${this.imageSrc});` +
        `background-size:${w}px ${h}px;` +
        `background-position:${-i * (w / LETTERS.length)}px center;` +
        `-webkit-background-clip:text;background-clip:text;` +
        `color:transparent;will-change:transform;` +
        `display:inline-block;`;

      letterContainer.appendChild(span);

      // Physics state
      const totalWidth = fontSize * 0.6 * LETTERS.length;
      const startX =
        -totalWidth / 2 + (i + 0.5) * (totalWidth / LETTERS.length);
      const normX = startX / (w / 2);

      return {
        el: span,
        index: i,
        cx: 0.25 + i * (0.5 / (LETTERS.length - 1)),
        cy: 0.5,
        normX,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        vRot: 0,
      };
    });

    this._wrapper.appendChild(letterContainer);
    this.container.appendChild(this._wrapper);
  }

  update() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    for (const p of this._pieces) {
      let targetX = 0;
      let targetY = 0;
      let targetRot = 0;

      if (this.isHovered) {
        const pcx = p.cx * w;
        const pcy = p.cy * h;
        const mx = this.mousePx.x;
        const my = this.mousePx.y;
        const dx = pcx - mx;
        const dy = pcy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0) {
          const falloff = 1 - dist / REPEL_RADIUS;
          const f = REPEL_FORCE * falloff * falloff;
          targetX = (dx / dist) * f;
          targetY = (dy / dist) * f;
          targetRot = targetX * 0.15;
        }
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

    // Ghost opacity increases when letters are displaced
    const maxDisp = Math.max(
      ...this._pieces.map((p) => Math.abs(p.x) + Math.abs(p.y)),
    );
    const ghostOpacity = Math.min(0.12 + maxDisp * 0.004, 0.4);
    this._ghostImg.style.opacity = ghostOpacity.toFixed(3);
  }

  triggerShockwave() {
    for (const p of this._pieces) {
      const angle = Math.random() * Math.PI * 2;
      p.vx += Math.cos(angle) * KEYSTROKE_IMPULSE;
      p.vy += Math.sin(angle) * KEYSTROKE_IMPULSE * 0.5;
      p.vRot += (Math.random() - 0.5) * 15;
    }
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
