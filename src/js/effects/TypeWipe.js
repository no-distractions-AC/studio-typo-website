/**
 * TypeWipe - Text peels away like a sticker revealing image.
 *
 * Hybrid DOM + Canvas. Layers: bright image -> dark overlay -> text span
 * with background-clip:text -> canvas for particle fragments.
 * Hover: circular peel follows cursor, hex fragments fly at peel edge.
 * Click: toggle full reveal -- overlay fades, full bright image.
 */

import { ImageEffect } from "./ImageEffect.js";
import { getPixelRatio } from "../utils/device.js";

const PEEL_RADIUS = 120;
const FRAGMENT_FORCE = 15;
const MAX_FRAGMENTS = 80;
const TILE_SIZE = 10;
const FRAGMENT_LIFE = 1.0;
const TWO_PI = Math.PI * 2;

export class TypeWipe extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._displayText = "TYPO";
    this._wrapper = null;
    this._imgEl = null;
    this._overlay = null;
    this._textEl = null;
    this._canvas = null;
    this._ctx = null;
    this._dpr = getPixelRatio(2);
    this._revealed = false;
    this._fragments = [];
    this._fragmentIndex = 0;
    this._lastSpawnDist = 0;
    this._lastMx = 0;
    this._lastMy = 0;
    this._shockwaves = [];
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
      "width:100%;height:100%;position:relative;overflow:hidden;background:#0f1114;";

    // Bright base image
    this._imgEl = document.createElement("img");
    this._imgEl.crossOrigin = "anonymous";
    this._imgEl.src = this.imageSrc;
    this._imgEl.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:0;";
    this._wrapper.appendChild(this._imgEl);

    // Dark overlay (dims the image)
    this._overlay = document.createElement("div");
    this._overlay.style.cssText =
      "position:absolute;inset:0;z-index:1;background:rgba(15,17,20,0.75);" +
      "transition:opacity 0.4s ease;";
    this._wrapper.appendChild(this._overlay);

    // Text span with background-clip:text
    const text = this._displayText;
    const fontSize = Math.min(w * (0.8 / text.length), h * 0.7);
    this._textEl = document.createElement("span");
    this._textEl.textContent = text;
    this._textEl.style.cssText =
      `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
      `font-family:"Space Mono",monospace;font-weight:700;` +
      `font-size:${fontSize.toFixed(0)}px;line-height:1;` +
      `background-image:url(${this.imageSrc});` +
      `background-size:cover;background-position:center;` +
      `-webkit-background-clip:text;background-clip:text;` +
      `color:transparent;z-index:2;pointer-events:none;`;
    this._wrapper.appendChild(this._textEl);

    // Canvas for particle fragments
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;z-index:3;pointer-events:none;";
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
    this._ctx = this._canvas.getContext("2d");
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this._wrapper.appendChild(this._canvas);

    this.container.appendChild(this._wrapper);
  }

  _spawnFragments(mx, my) {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TWO_PI;
      const dist = PEEL_RADIUS * (0.85 + Math.random() * 0.3);
      const fx = mx + Math.cos(angle) * dist;
      const fy = my + Math.sin(angle) * dist;

      const outAngle = angle + (Math.random() - 0.5) * 0.8;
      const force = FRAGMENT_FORCE * (0.5 + Math.random() * 0.5);

      const fragment = {
        x: fx,
        y: fy,
        vx: Math.cos(outAngle) * force,
        vy: Math.sin(outAngle) * force,
        rotation: Math.random() * TWO_PI,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        scale: 0.5 + Math.random() * 0.5,
        life: FRAGMENT_LIFE,
        maxLife: FRAGMENT_LIFE,
      };

      // Ring buffer
      if (this._fragments.length < MAX_FRAGMENTS) {
        this._fragments.push(fragment);
      } else {
        this._fragments[this._fragmentIndex] = fragment;
      }
      this._fragmentIndex = (this._fragmentIndex + 1) % MAX_FRAGMENTS;
    }
  }

  update() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const mx = this.mousePx.x;
    const my = this.mousePx.y;
    const hovered = this.isHovered;

    // Update peel mask on overlay + text
    if (this._revealed) {
      this._overlay.style.opacity = "0";
      this._textEl.style.webkitMaskImage =
        "radial-gradient(circle 9999px at 50% 50%, transparent 80%, black 100%)";
      this._textEl.style.maskImage =
        "radial-gradient(circle 9999px at 50% 50%, transparent 80%, black 100%)";
    } else if (hovered) {
      this._overlay.style.opacity = "1";
      const pctX = (mx / w) * 100;
      const pctY = (my / h) * 100;
      const maskStr = `radial-gradient(circle ${PEEL_RADIUS}px at ${pctX.toFixed(1)}% ${pctY.toFixed(1)}%, transparent 60%, black 100%)`;
      this._overlay.style.webkitMaskImage = maskStr;
      this._overlay.style.maskImage = maskStr;
      this._textEl.style.webkitMaskImage = maskStr;
      this._textEl.style.maskImage = maskStr;

      // Spawn fragments based on cursor movement
      const dx = mx - this._lastMx;
      const dy = my - this._lastMy;
      this._lastSpawnDist += Math.sqrt(dx * dx + dy * dy);
      if (this._lastSpawnDist > 8) {
        this._spawnFragments(mx, my);
        this._lastSpawnDist = 0;
      }
    } else {
      this._overlay.style.opacity = "1";
      this._overlay.style.webkitMaskImage = "none";
      this._overlay.style.maskImage = "none";
      this._textEl.style.webkitMaskImage = "none";
      this._textEl.style.maskImage = "none";
    }

    this._lastMx = mx;
    this._lastMy = my;

    // Update shockwaves
    const now = performance.now();
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i];
      if (((now - sw.startTime) / 1000) * 250 > 400) {
        this._shockwaves.splice(i, 1);
      }
    }

    // Update + draw fragments
    const ctx = this._ctx;
    const ts = TILE_SIZE;
    const halfTs = ts / 2;
    ctx.clearRect(0, 0, w, h);

    for (const frag of this._fragments) {
      if (frag.life <= 0) continue;

      frag.life -= 0.016;
      frag.x += frag.vx;
      frag.y += frag.vy;
      frag.vx *= 0.96;
      frag.vy *= 0.96;
      frag.vy += 0.15; // gravity
      frag.rotation += frag.rotationSpeed;

      const lifeRatio = Math.max(0, frag.life / frag.maxLife);

      ctx.save();
      ctx.globalAlpha = lifeRatio * 0.8;
      ctx.translate(frag.x, frag.y);
      ctx.rotate(frag.rotation);
      ctx.scale(frag.scale * lifeRatio, frag.scale * lifeRatio);

      // Draw hex fragment
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = halfTs * Math.cos(angle);
        const y = halfTs * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * lifeRatio})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * lifeRatio})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  setDisplayText(text) {
    this._displayText = text.toUpperCase();
    if (this._textEl) {
      this._textEl.textContent = this._displayText;
    }
  }

  triggerShockwave(x, y) {
    this._revealed = !this._revealed;
    const cx = x || this.container.clientWidth / 2;
    const cy = y || this.container.clientHeight / 2;
    this._shockwaves.push({ x: cx, y: cy, startTime: performance.now() });
    if (this._shockwaves.length > 5) this._shockwaves.shift();
    this._needsRender = true;
  }

  _updateRendererSize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);

    // Update text font size
    const text = this._displayText;
    const fontSize = Math.min(w * (0.8 / text.length), h * 0.7);
    this._textEl.style.fontSize = `${fontSize.toFixed(0)}px`;
  }

  dispose() {
    this._fragments = [];
    this._shockwaves = [];
    this._ctx = null;
    this._wrapper?.remove();
    super.dispose();
  }
}
