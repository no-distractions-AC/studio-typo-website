/**
 * AsciiPortrait - Colored ASCII rendering of the image.
 *
 * The signature "Studio Typo" effect. Image is rendered as colored
 * ASCII characters on canvas. On hover, a growing circle around
 * the cursor reveals the actual image beneath the characters.
 * Keystroke scrambles all characters briefly.
 */

import { ImageEffect } from "./ImageEffect.js";
import { loadImage, sampleCanvasWithColor } from "../ascii/utils/brightness.js";
import { brightnessToChar } from "../ascii/utils/ascii-density.js";
import { getPixelRatio } from "../utils/device.js";

const TARGET_COLS = 60;
const REVEAL_RADIUS_MAX = 120;
const REVEAL_SPRING = 0.06;
const REVEAL_DAMPING = 0.82;
const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";

export class AsciiPortrait extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._canvas = null;
    this._ctx = null;
    this._imgCanvas = null;
    this._charGrid = null;
    this._colorGrid = null;
    this._cols = 0;
    this._rows = 0;
    this._cellW = 0;
    this._cellH = 0;
    this._dpr = getPixelRatio(2);

    // Reveal circle
    this._revealRadius = 0;
    this._revealVel = 0;

    // Scramble
    this._scrambleAmount = 0;
  }

  async init() {
    this._imgCanvas = await loadImage(this.imageSrc);
    this._createRenderCanvas();
    this._sampleImage();
    this._setupEvents();
    this._startLoop();
  }

  _createRenderCanvas() {
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "width:100%;height:100%;display:block;";
    this.container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d");
    this._updateCanvasSize();
  }

  _updateCanvasSize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
  }

  _sampleImage() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    // Measure character dimensions
    this._ctx.font = `bold 10px "Space Mono", monospace`;
    const metrics = this._ctx.measureText("M");
    const charAspect = metrics.width / 10; // width / fontSize

    // Calculate grid
    this._cols = TARGET_COLS;
    this._cellW = w / this._cols;
    this._cellH = this._cellW / charAspect;
    this._rows = Math.ceil(h / this._cellH);

    // Sample image
    const { brightness, colors } = sampleCanvasWithColor(
      this._imgCanvas,
      this._cols,
      this._rows,
      1.8,
    );

    this._charGrid = brightness.map((row) =>
      row.map((b) => brightnessToChar(b, "photo")),
    );
    this._colorGrid = colors;
  }

  update() {
    if (!this._charGrid || !this._ctx) return;

    const ctx = this._ctx;
    const dpr = this._dpr;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    // Spring the reveal radius
    const targetRadius = this.isHovered ? REVEAL_RADIUS_MAX : 0;
    this._revealVel =
      (this._revealVel + (targetRadius - this._revealRadius) * REVEAL_SPRING) *
      REVEAL_DAMPING;
    this._revealRadius += this._revealVel;

    // Decay scramble
    if (this._scrambleAmount > 0) {
      this._scrambleAmount *= 0.92;
      if (this._scrambleAmount < 0.01) this._scrambleAmount = 0;
    }

    // Clear
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // Draw reveal image (actual image in circle)
    if (this._revealRadius > 1 && this.isHovered) {
      const mx = this.mousePx.x * dpr;
      const my = this.mousePx.y * dpr;
      const r = this._revealRadius * dpr;

      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.clip();

      // Draw original image scaled to cover
      const imgW = this._imgCanvas.width;
      const imgH = this._imgCanvas.height;
      const imgAspect = imgW / imgH;
      const containerAspect = w / h;
      let drawW, drawH, drawX, drawY;

      if (containerAspect > imgAspect) {
        drawW = w * dpr;
        drawH = drawW / imgAspect;
        drawX = 0;
        drawY = (h * dpr - drawH) / 2;
      } else {
        drawH = h * dpr;
        drawW = drawH * imgAspect;
        drawX = (w * dpr - drawW) / 2;
        drawY = 0;
      }

      ctx.drawImage(this._imgCanvas, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    // Draw ASCII characters
    const fontSize = this._cellW * dpr;
    ctx.font = `bold ${fontSize.toFixed(1)}px "Space Mono", monospace`;
    ctx.textBaseline = "top";

    const mxPx = this.mousePx.x;
    const myPx = this.mousePx.y;

    for (let row = 0; row < this._rows; row++) {
      if (row >= this._charGrid.length) break;
      for (let col = 0; col < this._cols; col++) {
        if (col >= this._charGrid[row].length) break;

        const x = col * this._cellW;
        const y = row * this._cellH;

        // Skip chars inside reveal circle
        if (this._revealRadius > 1 && this.isHovered) {
          const dx = x + this._cellW / 2 - mxPx;
          const dy = y + this._cellH / 2 - myPx;
          if (dx * dx + dy * dy < this._revealRadius * this._revealRadius) {
            continue;
          }
        }

        // Get character (potentially scrambled)
        let char = this._charGrid[row][col];
        if (this._scrambleAmount > 0 && Math.random() < this._scrambleAmount) {
          char =
            SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }

        const color = this._colorGrid[row][col];
        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        ctx.fillText(char, x * dpr, y * dpr);
      }
    }
  }

  triggerShockwave() {
    this._scrambleAmount = 1.0;
  }

  dispose() {
    this._canvas?.remove();
    super.dispose();
  }
}
