/**
 * Tilt3D - CSS perspective tilt effect.
 *
 * Card tilts in 3D following the cursor with spring physics.
 * A radial gradient highlight follows the cursor to simulate
 * light reflection on the surface.
 */

import { ImageEffect } from "./ImageEffect.js";

const MAX_TILT = 12; // degrees
const SPRING = 0.08;
const DAMPING = 0.85;

export class Tilt3D extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._wrapper = null;
    this._img = null;
    this._highlight = null;

    // Spring physics state
    this._rotX = 0;
    this._rotY = 0;
    this._velX = 0;
    this._velY = 0;
    this._targetRotX = 0;
    this._targetRotY = 0;
  }

  async init() {
    this._buildDOM();
    this._setupEvents();
    this._startLoop();
  }

  _buildDOM() {
    this._wrapper = document.createElement("div");
    this._wrapper.style.cssText =
      "width:100%;height:100%;perspective:800px;overflow:hidden;";

    const inner = document.createElement("div");
    inner.style.cssText =
      "width:100%;height:100%;position:relative;" +
      "transform-style:preserve-3d;will-change:transform;";
    this._inner = inner;

    this._img = document.createElement("img");
    this._img.src = this.imageSrc;
    this._img.alt = "";
    this._img.style.cssText =
      "width:100%;height:100%;object-fit:cover;display:block;";

    this._highlight = document.createElement("div");
    this._highlight.style.cssText =
      "position:absolute;inset:0;pointer-events:none;opacity:0;" +
      "transition:opacity 0.3s ease;";

    inner.appendChild(this._img);
    inner.appendChild(this._highlight);
    this._wrapper.appendChild(inner);
    this.container.appendChild(this._wrapper);
  }

  onHover() {
    this._highlight.style.opacity = "1";
  }

  onLeave() {
    this._targetRotX = 0;
    this._targetRotY = 0;
    this._highlight.style.opacity = "0";
  }

  update(delta, elapsed) {
    if (this.isHovered) {
      // Map normalized mouse (0-1) to tilt angle
      // mousePos.x: 0=left, 1=right -> rotateY: -MAX to +MAX
      // mousePos.y: 0=bottom, 1=top -> rotateX: +MAX to -MAX (inverted for natural feel)
      this._targetRotY = (this.targetMousePos.x - 0.5) * 2 * MAX_TILT;
      this._targetRotX = -(this.targetMousePos.y - 0.5) * 2 * MAX_TILT;

      // Update highlight position
      const hx = this.targetMousePos.x * 100;
      const hy = (1 - this.targetMousePos.y) * 100;
      this._highlight.style.background = `radial-gradient(circle at ${hx}% ${hy}%, rgba(255,255,255,0.15) 0%, transparent 60%)`;
    }

    // Spring physics
    const ax = (this._targetRotX - this._rotX) * SPRING;
    const ay = (this._targetRotY - this._rotY) * SPRING;
    this._velX = (this._velX + ax) * DAMPING;
    this._velY = (this._velY + ay) * DAMPING;
    this._rotX += this._velX;
    this._rotY += this._velY;

    this._inner.style.transform = `rotateX(${this._rotX.toFixed(2)}deg) rotateY(${this._rotY.toFixed(2)}deg)`;
  }

  triggerShockwave() {
    this._velX += (Math.random() - 0.5) * 15;
    this._velY += (Math.random() - 0.5) * 15;
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
