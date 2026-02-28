/**
 * OrbitalFan - Wedge segments with orbital cursor physics.
 *
 * 8 wedge pieces orbit tangentially around the cursor like a pinwheel.
 * Velocity-based spring physics produce satisfying overshoot and bounce.
 */

import { ImageEffect } from "./ImageEffect.js";

const SEGMENTS = 8;
const SPRING = 0.07;
const DAMPING = 0.83;
const ORBIT_RADIUS = 200;
const TANGENT_FORCE = 25;
const INWARD_RATIO = 0.2;
const IDLE_GAP = 2;
const SHOCKWAVE_FORCE = 30;
const SHOCKWAVE_SPEED = 300;
const SHOCKWAVE_MAX_RADIUS = 400;

function wedgeClipPath(index) {
  const step = 360 / SEGMENTS;
  const a1 = (index * step - 90) * (Math.PI / 180);
  const a2 = ((index + 1) * step - 90) * (Math.PI / 180);
  const r = 1.0;
  const x1 = 50 + Math.cos(a1) * r * 100;
  const y1 = 50 + Math.sin(a1) * r * 100;
  const x2 = 50 + Math.cos(a2) * r * 100;
  const y2 = 50 + Math.sin(a2) * r * 100;
  return `polygon(50% 50%, ${x1.toFixed(1)}% ${y1.toFixed(1)}%, ${x2.toFixed(1)}% ${y2.toFixed(1)}%)`;
}

function bisectorAngle(index) {
  const step = 360 / SEGMENTS;
  return ((index + 0.5) * step - 90) * (Math.PI / 180);
}

export class OrbitalFan extends ImageEffect {
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

    for (let i = 0; i < SEGMENTS; i++) {
      const angle = bisectorAngle(i);
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;inset:0;will-change:transform;" +
        `clip-path:${wedgeClipPath(i)};` +
        `transform:translate(${Math.cos(angle) * IDLE_GAP}px, ${Math.sin(angle) * IDLE_GAP}px);`;

      const img = document.createElement("img");
      img.src = this.imageSrc;
      img.alt = "";
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;";

      el.appendChild(img);
      this._wrapper.appendChild(el);

      this._pieces.push({
        el,
        angle,
        cx: 0.5 + Math.cos(angle) * 0.35,
        cy: 0.5 + Math.sin(angle) * 0.35,
        x: Math.cos(angle) * IDLE_GAP,
        y: Math.sin(angle) * IDLE_GAP,
        vx: 0,
        vy: 0,
        rot: 0,
        vRot: 0,
      });
    }

    this.container.appendChild(this._wrapper);
  }

  update(delta, elapsed) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    for (const p of this._pieces) {
      const idleX = Math.cos(p.angle) * IDLE_GAP;
      const idleY = Math.sin(p.angle) * IDLE_GAP;
      let targetX = idleX;
      let targetY = idleY;
      let targetRot = 0;

      if (this.isHovered) {
        const pcx = p.cx * w;
        const pcy = p.cy * h;
        const mx = this.mousePx.x;
        const my = this.mousePx.y;
        const dx = pcx - mx;
        const dy = pcy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ORBIT_RADIUS && dist > 0) {
          const falloff = 1 - dist / ORBIT_RADIUS;
          const f = TANGENT_FORCE * falloff * falloff;

          // Tangential (perpendicular to radial, clockwise)
          const tx = -dy / dist;
          const ty = dx / dist;
          targetX = idleX + tx * f;
          targetY = idleY + ty * f;

          // Slight inward pull
          targetX += (-dx / dist) * f * INWARD_RATIO;
          targetY += (-dy / dist) * f * INWARD_RATIO;

          targetRot = f * 0.5;
        }
      }

      // Shockwave
      this._applyShockwave(p, w, h);

      // Velocity spring for position
      p.vx = (p.vx + (targetX - p.x) * SPRING) * DAMPING;
      p.vy = (p.vy + (targetY - p.y) * SPRING) * DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      // Velocity spring for rotation
      p.vRot = (p.vRot + (targetRot - p.rot) * SPRING) * DAMPING;
      p.rot += p.vRot;

      p.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.rot.toFixed(2)}deg)`;
    }

    // Clean expired shockwaves
    const now = performance.now();
    this._shockwaves = this._shockwaves.filter((sw) => {
      const age = (now - sw.startTime) / 1000;
      return age * SHOCKWAVE_SPEED < SHOCKWAVE_MAX_RADIUS;
    });
  }

  _applyShockwave(piece, w, h) {
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
        piece.vx += (dx / dist) * f * 0.3;
        piece.vy += (dy / dist) * f * 0.3;
        piece.vRot += f * 0.4 * (piece.angle > 0 ? 1 : -1);
      }
    }
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
