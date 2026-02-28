/**
 * GlyphGrid - Repeating text characters tile the image like dense ASCII.
 *
 * Pure Canvas 2D. Dense grid of repeating custom text chars, each colored
 * from the image. Hover: characters near cursor fade + scatter outward,
 * revealing bright image beneath. Click: toggle full reveal.
 */

import { ImageEffect } from "./ImageEffect.js";
import { getPixelRatio } from "../utils/device.js";

const CHAR_SIZE = 16;
const REVEAL_RADIUS = 140;
const SCATTER_FORCE = 8;
const FADE_SPEED = 0.15;

export class GlyphGrid extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._displayText = "TYPO";
    this._canvas = null;
    this._ctx = null;
    this._img = null;
    this._dpr = getPixelRatio(2);
    this._cells = [];
    this._revealed = false;
    this._shockwaves = [];

    // Pre-sampled image data for coloring chars
    this._colorData = null;
    this._colorW = 0;
    this._colorH = 0;

    // Cover crop
    this._cropX = 0;
    this._cropY = 0;
    this._drawW = 0;
    this._drawH = 0;
  }

  async init() {
    this._img = await this._loadImg(this.imageSrc);
    this._buildCanvas();
    this._sampleColors();
    this._buildCellGrid();
    this._setupEvents();
    this._startLoop();
  }

  _loadImg(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  _buildCanvas() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "width:100%;height:100%;display:block;";
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
    this._ctx = this._canvas.getContext("2d");
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this.container.appendChild(this._canvas);

    this._computeCover(w, h);
  }

  _computeCover(cw, ch) {
    const iw = this._img.width;
    const ih = this._img.height;
    const containerAspect = cw / ch;
    const imageAspect = iw / ih;

    if (containerAspect > imageAspect) {
      this._drawW = cw;
      this._drawH = cw / imageAspect;
    } else {
      this._drawH = ch;
      this._drawW = ch * imageAspect;
    }
    this._cropX = (cw - this._drawW) / 2;
    this._cropY = (ch - this._drawH) / 2;
  }

  _sampleColors() {
    // Draw image to offscreen canvas at container size for color sampling
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const octx = offscreen.getContext("2d");

    octx.drawImage(
      this._img,
      this._cropX,
      this._cropY,
      this._drawW,
      this._drawH,
    );

    this._colorData = octx.getImageData(0, 0, w, h).data;
    this._colorW = w;
    this._colorH = h;
  }

  _getColorAt(x, y) {
    const px = Math.round(Math.min(Math.max(x, 0), this._colorW - 1));
    const py = Math.round(Math.min(Math.max(y, 0), this._colorH - 1));
    const idx = (py * this._colorW + px) * 4;
    return {
      r: this._colorData[idx],
      g: this._colorData[idx + 1],
      b: this._colorData[idx + 2],
    };
  }

  _buildCellGrid() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    const cs = CHAR_SIZE;
    const cols = Math.ceil(w / cs);
    const rows = Math.ceil(h / cs);
    const chars = this._displayText.split("");
    this._cells = [];

    let charIdx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cs + cs / 2;
        const cy = row * cs + cs / 2;

        const color = this._getColorAt(cx, cy);

        this._cells.push({
          cx,
          cy,
          char: chars[charIdx % chars.length],
          r: color.r,
          g: color.g,
          b: color.b,
          offsetX: 0,
          offsetY: 0,
          targetX: 0,
          targetY: 0,
          opacity: 1,
          targetOpacity: 1,
          jitterAngle: (Math.random() - 0.5) * 1.2,
          strengthMult: 0.5 + Math.random(),
        });
        charIdx++;
      }
    }
  }

  update() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const mx = this.mousePx.x;
    const my = this.mousePx.y;
    const hovered = this.isHovered;
    const ctx = this._ctx;
    const cs = CHAR_SIZE;

    ctx.clearRect(0, 0, w, h);

    // Draw dimmed base image
    ctx.save();
    ctx.globalAlpha = this._revealed ? 1 : 0.25;
    ctx.drawImage(
      this._img,
      this._cropX,
      this._cropY,
      this._drawW,
      this._drawH,
    );
    ctx.restore();

    // Draw bright image clipped to reveal circle (when hovering, not revealed)
    if (hovered && !this._revealed) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, REVEAL_RADIUS, 0, TWO_PI);
      ctx.clip();
      ctx.drawImage(
        this._img,
        this._cropX,
        this._cropY,
        this._drawW,
        this._drawH,
      );
      ctx.restore();
    }

    // Update shockwaves
    const now = performance.now();
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i];
      if (((now - sw.startTime) / 1000) * 250 > 400) {
        this._shockwaves.splice(i, 1);
      }
    }

    // Draw character grid
    ctx.font = `700 ${cs * 0.75}px "Space Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const cell of this._cells) {
      if (this._revealed) {
        cell.targetOpacity = 0;
        cell.targetX = 0;
        cell.targetY = 0;
      } else if (hovered) {
        const dx = cell.cx - mx;
        const dy = cell.cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REVEAL_RADIUS) {
          const falloff = 1 - dist / REVEAL_RADIUS;
          cell.targetOpacity = 1 - falloff;

          if (dist > 0) {
            const f = SCATTER_FORCE * falloff * falloff * cell.strengthMult;
            const angle = Math.atan2(dy, dx) + cell.jitterAngle * 0.3;
            cell.targetX = Math.cos(angle) * f;
            cell.targetY = Math.sin(angle) * f;
          }
        } else {
          cell.targetOpacity = 1;
          cell.targetX = 0;
          cell.targetY = 0;
        }
      } else {
        cell.targetOpacity = 1;
        cell.targetX = 0;
        cell.targetY = 0;
      }

      // Apply shockwaves
      for (const sw of this._shockwaves) {
        const age = (now - sw.startTime) / 1000;
        const ringRadius = age * 250;
        const life = 1 - ringRadius / 400;
        if (life <= 0) continue;

        const dx = cell.cx - sw.x;
        const dy = cell.cy - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ringDist = Math.abs(dist - ringRadius);
        if (ringDist < 50 && dist > 0) {
          const proximity = 1 - ringDist / 50;
          const f = 12 * proximity * life * cell.strengthMult;
          cell.targetX += (dx / dist) * f;
          cell.targetY += (dy / dist) * f;
        }
      }

      // Ease
      cell.offsetX += (cell.targetX - cell.offsetX) * FADE_SPEED;
      cell.offsetY += (cell.targetY - cell.offsetY) * FADE_SPEED;
      cell.opacity += (cell.targetOpacity - cell.opacity) * FADE_SPEED;

      if (cell.opacity < 0.01) continue;

      ctx.save();
      ctx.globalAlpha = cell.opacity * 0.85;
      ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`;
      ctx.fillText(cell.char, cell.cx + cell.offsetX, cell.cy + cell.offsetY);
      ctx.restore();
    }
  }

  setDisplayText(text) {
    this._displayText = text.toUpperCase();
    const chars = this._displayText.split("");
    for (let i = 0; i < this._cells.length; i++) {
      this._cells[i].char = chars[i % chars.length];
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
    this._computeCover(w, h);
    this._sampleColors();
    this._buildCellGrid();
  }

  dispose() {
    this._cells = [];
    this._shockwaves = [];
    this._colorData = null;
    this._img = null;
    this._ctx = null;
    this._canvas?.remove();
    super.dispose();
  }
}
