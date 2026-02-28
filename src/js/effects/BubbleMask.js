/**
 * BubbleMask - SVG bubble clip-path reveal.
 *
 * Image is clipped through a compound SVG path of ~12 circles.
 * Idle: small bubbles show fragments of the image.
 * Hover: bubbles expand smoothly to reveal the full image.
 * Keystroke: brief pulse of bubble radii.
 */

import { ImageEffect } from "./ImageEffect.js";

const BUBBLES = [
  { cx: 0.15, cy: 0.2, rMin: 0.06, rMax: 0.22 },
  { cx: 0.45, cy: 0.12, rMin: 0.08, rMax: 0.25 },
  { cx: 0.78, cy: 0.18, rMin: 0.07, rMax: 0.23 },
  { cx: 0.25, cy: 0.5, rMin: 0.09, rMax: 0.26 },
  { cx: 0.55, cy: 0.42, rMin: 0.1, rMax: 0.28 },
  { cx: 0.85, cy: 0.52, rMin: 0.07, rMax: 0.24 },
  { cx: 0.1, cy: 0.78, rMin: 0.08, rMax: 0.24 },
  { cx: 0.38, cy: 0.82, rMin: 0.07, rMax: 0.22 },
  { cx: 0.65, cy: 0.75, rMin: 0.09, rMax: 0.27 },
  { cx: 0.9, cy: 0.85, rMin: 0.06, rMax: 0.21 },
  { cx: 0.5, cy: 0.6, rMin: 0.11, rMax: 0.3 },
  { cx: 0.3, cy: 0.35, rMin: 0.07, rMax: 0.23 },
];

let uidCounter = 0;

export class BubbleMask extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._wrapper = null;
    this._img = null;
    this._circles = [];
    this._clipId = `bubble-clip-${uidCounter++}`;
    this._pulseAmount = 0;
  }

  async init() {
    this._buildDOM();
    this._setupEvents();
    this._startLoop();
  }

  _buildDOM() {
    this._wrapper = document.createElement("div");
    this._wrapper.style.cssText =
      "width:100%;height:100%;position:relative;overflow:hidden;background:#000;";

    // SVG defs for clip path
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const clipPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "clipPath",
    );
    clipPath.setAttribute("id", this._clipId);
    clipPath.setAttribute("clipPathUnits", "objectBoundingBox");

    this._circles = BUBBLES.map((b) => {
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", b.cx);
      circle.setAttribute("cy", b.cy);
      circle.setAttribute("r", b.rMin);
      clipPath.appendChild(circle);
      return circle;
    });

    defs.appendChild(clipPath);
    svg.appendChild(defs);

    this._img = document.createElement("img");
    this._img.src = this.imageSrc;
    this._img.alt = "";
    this._img.style.cssText =
      "width:100%;height:100%;object-fit:cover;display:block;" +
      `clip-path:url(#${this._clipId});`;

    this._wrapper.appendChild(svg);
    this._wrapper.appendChild(this._img);
    this.container.appendChild(this._wrapper);
  }

  update() {
    // Decay pulse
    if (this._pulseAmount > 0) {
      this._pulseAmount *= 0.92;
      if (this._pulseAmount < 0.01) this._pulseAmount = 0;
    }

    const t = this.hoverProgress + this._pulseAmount * 0.4;
    const clamped = Math.min(t, 1);

    for (let i = 0; i < BUBBLES.length; i++) {
      const b = BUBBLES[i];
      const r = b.rMin + (b.rMax - b.rMin) * clamped;
      this._circles[i].setAttribute("r", r.toFixed(4));
    }
  }

  triggerShockwave() {
    this._pulseAmount = 1.0;
  }

  dispose() {
    this._wrapper?.remove();
    super.dispose();
  }
}
