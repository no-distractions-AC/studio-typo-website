/**
 * BloomPetals - Flower-like petal segments with asymmetric bloom physics.
 *
 * 6 petal-shaped segments radiate from center.
 * Petals bloom outward toward the cursor with spring physics.
 * Cursor direction influences which petals open more.
 */

import { ImageEffect } from "./ImageEffect.js";

const PETALS = 6;
const SPRING = 0.055;
const DAMPING = 0.86;
const BASE_BLOOM = 14;
const PROXIMITY_BLOOM = 18;
const BLOOM_ROT = 0.4;
const KEYSTROKE_IMPULSE = 35;

/**
 * Generate petal clip-path. Each petal is a wedge with slightly
 * curved-ish polygon approximation for organic shape.
 */
function petalClipPath(index) {
  const step = (2 * Math.PI) / PETALS;
  const a = index * step - Math.PI / 2;
  const aNext = (index + 1) * step - Math.PI / 2;
  const aMid = (a + aNext) / 2;

  // Inner control points (near center, slightly wider than wedge)
  const ri = 0.08;
  const ix1 = 50 + Math.cos(a + 0.15) * ri * 100;
  const iy1 = 50 + Math.sin(a + 0.15) * ri * 100;
  const ix2 = 50 + Math.cos(aNext - 0.15) * ri * 100;
  const iy2 = 50 + Math.sin(aNext - 0.15) * ri * 100;

  // Outer points (wide bulge for petal shape)
  const ro = 0.55;
  const bulge = 0.12;
  const ox1 = 50 + Math.cos(a + bulge) * ro * 100;
  const oy1 = 50 + Math.sin(a + bulge) * ro * 100;
  const ox2 = 50 + Math.cos(aNext - bulge) * ro * 100;
  const oy2 = 50 + Math.sin(aNext - bulge) * ro * 100;

  // Tip point (outermost, along bisector)
  const rt = 0.62;
  const tx = 50 + Math.cos(aMid) * rt * 100;
  const ty = 50 + Math.sin(aMid) * rt * 100;

  return (
    `polygon(50% 50%, ${ix1.toFixed(1)}% ${iy1.toFixed(1)}%, ` +
    `${ox1.toFixed(1)}% ${oy1.toFixed(1)}%, ${tx.toFixed(1)}% ${ty.toFixed(1)}%, ` +
    `${ox2.toFixed(1)}% ${oy2.toFixed(1)}%, ${ix2.toFixed(1)}% ${iy2.toFixed(1)}%)`
  );
}

function bisectorAngle(index) {
  const step = (2 * Math.PI) / PETALS;
  return (index + 0.5) * step - Math.PI / 2;
}

export class BloomPetals extends ImageEffect {
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
      "width:100%;height:100%;position:relative;overflow:hidden;" +
      "background:radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%);";

    for (let i = 0; i < PETALS; i++) {
      const angle = bisectorAngle(i);
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;inset:0;will-change:transform;" +
        `clip-path:${petalClipPath(i)};`;

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
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        translate: 0,
        vTranslate: 0,
        rot: 0,
        vRot: 0,
      });
    }

    this.container.appendChild(this._wrapper);
  }

  update(delta, elapsed) {
    // Cursor angle from center (for directional bloom)
    let cursorAngle = 0;
    if (this.isHovered) {
      const cx = this.mousePos.x - 0.5;
      const cy = -(this.mousePos.y - 0.5); // flip Y
      cursorAngle = Math.atan2(cy, cx);
    }

    for (const p of this._pieces) {
      let targetTranslate = 0;
      let targetRot = 0;

      if (this.isHovered) {
        // Base bloom
        targetTranslate = BASE_BLOOM * this.hoverProgress;

        // Proximity bonus: how close is this petal's angle to cursor angle?
        let angleDiff = Math.abs(p.angle - cursorAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        const proximity = 1 - angleDiff / Math.PI;
        targetTranslate +=
          PROXIMITY_BLOOM * proximity * proximity * this.hoverProgress;

        targetRot = targetTranslate * BLOOM_ROT;
      }

      // Velocity spring
      p.vTranslate =
        (p.vTranslate + (targetTranslate - p.translate) * SPRING) * DAMPING;
      p.translate += p.vTranslate;

      p.vRot = (p.vRot + (targetRot - p.rot) * SPRING) * DAMPING;
      p.rot += p.vRot;

      const tx = p.dx * p.translate;
      const ty = p.dy * p.translate;

      p.el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${p.rot.toFixed(2)}deg)`;
    }
  }

  triggerShockwave() {
    for (let i = 0; i < this._pieces.length; i++) {
      const p = this._pieces[i];
      p.vTranslate += KEYSTROKE_IMPULSE;
      p.vRot += 8 * (i % 2 === 0 ? 1 : -1);
    }
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
