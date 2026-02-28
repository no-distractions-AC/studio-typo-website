/**
 * ShatterDrift - Broken glass shards with noise drift and cursor repulsion.
 *
 * 6 irregular polygon shards breathe with subtle noise drift at rest.
 * Cursor repels nearby shards, revealing thin gaps.
 * Spring physics with overshoot for organic feel.
 */

import { ImageEffect } from "./ImageEffect.js";

const SPRING = 0.05;
const DAMPING = 0.84;
const REPEL_RADIUS = 250;
const REPEL_FORCE = 18;
const DRIFT_AMP = 3;
const SHOCKWAVE_FORCE = 25;
const SHOCKWAVE_SPEED = 300;
const SHOCKWAVE_MAX_RADIUS = 400;

const SHARDS = [
  {
    clip: "polygon(0% 0%, 42% 0%, 38% 44%, 0% 36%)",
    cx: 0.2,
    cy: 0.2,
  },
  {
    clip: "polygon(42% 0%, 100% 0%, 100% 32%, 62% 48%, 38% 44%)",
    cx: 0.7,
    cy: 0.2,
  },
  {
    clip: "polygon(100% 32%, 100% 100%, 58% 100%, 62% 48%)",
    cx: 0.85,
    cy: 0.65,
  },
  {
    clip: "polygon(62% 48%, 58% 100%, 40% 100%, 42% 62%, 38% 44%)",
    cx: 0.5,
    cy: 0.7,
  },
  {
    clip: "polygon(0% 36%, 38% 44%, 42% 62%, 40% 100%, 0% 100%)",
    cx: 0.18,
    cy: 0.7,
  },
];

export class ShatterDrift extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._wrapper = null;
    this._pieces = [];
    this._shockwaves = [];
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

    this._pieces = SHARDS.map((shard) => {
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;inset:0;will-change:transform;" +
        `clip-path:${shard.clip};`;

      const img = document.createElement("img");
      img.src = this.imageSrc;
      img.alt = "";
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;";

      el.appendChild(img);
      this._wrapper.appendChild(el);

      return {
        el,
        cx: shard.cx,
        cy: shard.cy,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        jitter: Math.random() * 100,
      };
    });

    this.container.appendChild(this._wrapper);
  }

  update(delta, elapsed) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    for (const p of this._pieces) {
      // Noise drift (always active)
      const nx = Math.sin(elapsed * 0.4 + p.jitter) * DRIFT_AMP;
      const ny = Math.cos(elapsed * 0.3 + p.jitter * 1.7) * DRIFT_AMP;
      let targetX = nx;
      let targetY = ny;

      // Cursor repulsion
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
          targetX += (dx / dist) * f;
          targetY += (dy / dist) * f;
        }
      }

      // Shockwave displacement
      this._applyShockwave(p, targetX, targetY, w, h);
      targetX = p._swX ?? targetX;
      targetY = p._swY ?? targetY;

      // Velocity spring
      p.vx = (p.vx + (targetX - p.x) * SPRING) * DAMPING;
      p.vy = (p.vy + (targetY - p.y) * SPRING) * DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      p.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    }

    // Clean expired shockwaves
    const now = performance.now();
    this._shockwaves = this._shockwaves.filter((sw) => {
      const age = (now - sw.startTime) / 1000;
      return age * SHOCKWAVE_SPEED < SHOCKWAVE_MAX_RADIUS;
    });
  }

  _applyShockwave(piece, baseX, baseY, w, h) {
    let swX = baseX;
    let swY = baseY;
    const now = performance.now();
    const pcx = piece.cx * w;
    const pcy = piece.cy * h;

    for (const sw of this._shockwaves) {
      const age = (now - sw.startTime) / 1000;
      const ringRadius = age * SHOCKWAVE_SPEED;
      const life = 1 - ringRadius / SHOCKWAVE_MAX_RADIUS;
      if (life <= 0) continue;

      const dx = pcx - sw.x;
      const dy = pcy - sw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ringDist = Math.abs(dist - ringRadius);
      const bandWidth = 80;

      if (ringDist < bandWidth && dist > 0) {
        const proximity = 1 - ringDist / bandWidth;
        const f = SHOCKWAVE_FORCE * proximity * life;
        swX += (dx / dist) * f;
        swY += (dy / dist) * f;
      }
    }

    piece._swX = swX;
    piece._swY = swY;
  }

  triggerShockwave(x, y) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this._shockwaves.push({
      x: x ?? w / 2,
      y: y ?? h / 2,
      startTime: performance.now(),
    });
    if (this._shockwaves.length > 5) this._shockwaves.shift();
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
