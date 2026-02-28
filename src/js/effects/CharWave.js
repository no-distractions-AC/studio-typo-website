/**
 * CharWave - ASCII grid with per-character spring physics.
 *
 * Image sampled as colored ASCII characters. Each character has
 * spring-based physics for displacement, rotation, and scale.
 * Cursor creates radial ripple that displaces characters outward.
 * Keystroke sends shockwave ring through the character grid.
 */

import { ImageEffect } from "./ImageEffect.js";
import { loadImage, sampleCanvasWithColor } from "../ascii/utils/brightness.js";
import { brightnessToChar } from "../ascii/utils/ascii-density.js";
import { getPixelRatio } from "../utils/device.js";

const TARGET_COLS = 50;
const SPRING = 0.08;
const DAMPING = 0.85;
const RIPPLE_RADIUS = 150;
const RIPPLE_FORCE = 12;
const DRIFT_AMP = 2;
const SHOCKWAVE_FORCE = 18;
const SHOCKWAVE_SPEED = 280;
const SHOCKWAVE_MAX_RADIUS = 400;

export class CharWave extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._canvas = null;
    this._ctx = null;
    this._cells = [];
    this._cols = 0;
    this._rows = 0;
    this._cellW = 0;
    this._cellH = 0;
    this._dpr = getPixelRatio(2);
    this._shockwaves = [];
  }

  async init() {
    const imgCanvas = await loadImage(this.imageSrc);
    this._createRenderCanvas();
    this._sampleAndBuildGrid(imgCanvas);
    this._setupEvents();
    this._startLoop();
  }

  _createRenderCanvas() {
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "width:100%;height:100%;display:block;";
    this.container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d");

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
  }

  _sampleAndBuildGrid(imgCanvas) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    // Measure char dimensions
    this._ctx.font = `bold 10px "Space Mono", monospace`;
    const charAspect = this._ctx.measureText("M").width / 10;

    this._cols = TARGET_COLS;
    this._cellW = w / this._cols;
    this._cellH = this._cellW / charAspect;
    this._rows = Math.ceil(h / this._cellH);

    const { brightness, colors } = sampleCanvasWithColor(
      imgCanvas,
      this._cols,
      this._rows,
      1.8,
    );

    this._cells = [];
    for (let row = 0; row < this._rows; row++) {
      if (row >= brightness.length) break;
      for (let col = 0; col < this._cols; col++) {
        if (col >= brightness[row].length) break;
        this._cells.push({
          row,
          col,
          char: brightnessToChar(brightness[row][col], "photo"),
          color: colors[row][col],
          // Physics state
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          rot: 0,
          vRot: 0,
          jitter: Math.random() * 100,
        });
      }
    }
  }

  update(delta, elapsed) {
    if (!this._ctx || this._cells.length === 0) return;

    const ctx = this._ctx;
    const dpr = this._dpr;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const mx = this.mousePx.x;
    const my = this.mousePx.y;
    const now = performance.now();

    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    const fontSize = this._cellW * dpr;
    ctx.font = `bold ${fontSize.toFixed(1)}px "Space Mono", monospace`;
    ctx.textBaseline = "middle";

    for (const cell of this._cells) {
      const baseX = cell.col * this._cellW + this._cellW / 2;
      const baseY = cell.row * this._cellH + this._cellH / 2;

      // Noise drift
      const driftX = Math.sin(elapsed * 0.3 + cell.jitter) * DRIFT_AMP;
      const driftY = Math.cos(elapsed * 0.25 + cell.jitter * 1.3) * DRIFT_AMP;
      let targetX = driftX;
      let targetY = driftY;
      let targetRot = 0;

      // Cursor ripple
      if (this.isHovered) {
        const dx = baseX - mx;
        const dy = baseY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < RIPPLE_RADIUS && dist > 0) {
          const falloff = 1 - dist / RIPPLE_RADIUS;
          const f = RIPPLE_FORCE * falloff * falloff;
          targetX += (dx / dist) * f;
          targetY += (dy / dist) * f;
          targetRot = f * 0.05 * (cell.jitter > 50 ? 1 : -1);
        }
      }

      // Shockwave displacement
      for (const sw of this._shockwaves) {
        const age = (now - sw.startTime) / 1000;
        const ringRadius = age * SHOCKWAVE_SPEED;
        const life = 1 - ringRadius / SHOCKWAVE_MAX_RADIUS;
        if (life <= 0) continue;

        const dx = baseX - sw.x;
        const dy = baseY - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ringDist = Math.abs(dist - ringRadius);
        const bandWidth = 60;

        if (ringDist < bandWidth && dist > 0) {
          const proximity = 1 - ringDist / bandWidth;
          const f = SHOCKWAVE_FORCE * proximity * life;
          targetX += (dx / dist) * f;
          targetY += (dy / dist) * f;
        }
      }

      // Velocity spring
      cell.vx = (cell.vx + (targetX - cell.x) * SPRING) * DAMPING;
      cell.vy = (cell.vy + (targetY - cell.y) * SPRING) * DAMPING;
      cell.vRot = (cell.vRot + (targetRot - cell.rot) * SPRING) * DAMPING;
      cell.x += cell.vx;
      cell.y += cell.vy;
      cell.rot += cell.vRot;

      // Render
      const drawX = (baseX + cell.x) * dpr;
      const drawY = (baseY + cell.y) * dpr;

      if (Math.abs(cell.rot) > 0.001) {
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(cell.rot);
        ctx.fillStyle = `rgb(${cell.color.r},${cell.color.g},${cell.color.b})`;
        ctx.fillText(cell.char, 0, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = `rgb(${cell.color.r},${cell.color.g},${cell.color.b})`;
        ctx.fillText(cell.char, drawX, drawY);
      }
    }

    // Clean expired shockwaves
    this._shockwaves = this._shockwaves.filter((sw) => {
      const age = (now - sw.startTime) / 1000;
      return age * SHOCKWAVE_SPEED < SHOCKWAVE_MAX_RADIUS;
    });
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
    this._canvas?.remove();
    super.dispose();
  }
}
