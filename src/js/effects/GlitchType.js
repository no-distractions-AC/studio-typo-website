/**
 * GlitchType - RGB-separated multi-layer glitch corruption.
 *
 * Three ASCII grids rendered with offset, each in one color channel (R, G, B).
 * Additive blending via globalCompositeOperation = "screen".
 * Idle: occasional micro-glitch strips. Hover: channels separate.
 * Keystroke: catastrophic full-frame corruption burst.
 */

import { ImageEffect } from "./ImageEffect.js";
import { loadImage, sampleCanvasWithColor } from "../ascii/utils/brightness.js";
import { brightnessToChar } from "../ascii/utils/ascii-density.js";
import { getPixelRatio } from "../utils/device.js";

const TARGET_COLS = 55;
const SPRING = 0.07;
const DAMPING = 0.83;
const MAX_CHANNEL_OFFSET = 8;
const BLOCK_GLITCH_INTERVAL = 2.5;
const BLOCK_GLITCH_DURATION = 0.08;
const KEYSTROKE_SCATTER = 30;
const KEYSTROKE_DECAY = 0.92;

export class GlitchType extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._canvas = null;
    this._ctx = null;
    this._charGrid = null;
    this._colorGrid = null;
    this._cols = 0;
    this._rows = 0;
    this._cellW = 0;
    this._cellH = 0;
    this._dpr = getPixelRatio(2);

    // Channel offsets (spring-eased)
    this._rOff = { x: 0, y: 0, vx: 0, vy: 0 };
    this._gOff = { x: 0, y: 0, vx: 0, vy: 0 };
    this._bOff = { x: 0, y: 0, vx: 0, vy: 0 };

    // Block corruption strips
    this._strips = [];
    this._nextGlitch = BLOCK_GLITCH_INTERVAL;

    // Keystroke
    this._corruptionIntensity = 0;
  }

  async init() {
    const imgCanvas = await loadImage(this.imageSrc);
    this._createRenderCanvas();
    this._sampleImage(imgCanvas);
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

  _sampleImage(imgCanvas) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

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

    this._charGrid = brightness.map((row) =>
      row.map((b) => brightnessToChar(b, "photo")),
    );
    this._colorGrid = colors;
  }

  update(delta, elapsed) {
    if (!this._charGrid || !this._ctx) return;

    const ctx = this._ctx;
    const dpr = this._dpr;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    // Decay keystroke corruption
    if (this._corruptionIntensity > 0) {
      this._corruptionIntensity *= KEYSTROKE_DECAY;
      if (this._corruptionIntensity < 0.01) this._corruptionIntensity = 0;
    }

    // Calculate target channel offsets
    const hoverStrength = this.isHovered ? 1 : 0;
    const chaos = this._corruptionIntensity;

    const targetRX =
      -MAX_CHANNEL_OFFSET * hoverStrength +
      (Math.random() - 0.5) * KEYSTROKE_SCATTER * chaos;
    const targetRY = (Math.random() - 0.5) * KEYSTROKE_SCATTER * 0.3 * chaos;
    const targetGX = (Math.random() - 0.5) * KEYSTROKE_SCATTER * 0.5 * chaos;
    const targetGY =
      -MAX_CHANNEL_OFFSET * 0.4 * hoverStrength +
      (Math.random() - 0.5) * KEYSTROKE_SCATTER * 0.3 * chaos;
    const targetBX =
      MAX_CHANNEL_OFFSET * hoverStrength +
      (Math.random() - 0.5) * KEYSTROKE_SCATTER * chaos;
    const targetBY = (Math.random() - 0.5) * KEYSTROKE_SCATTER * 0.3 * chaos;

    // Spring ease offsets
    this._springOffset(this._rOff, targetRX, targetRY);
    this._springOffset(this._gOff, targetGX, targetGY);
    this._springOffset(this._bOff, targetBX, targetBY);

    // Idle micro-glitch strips
    this._nextGlitch -= delta;
    if (this._nextGlitch <= 0 && this._corruptionIntensity < 0.1) {
      this._nextGlitch = BLOCK_GLITCH_INTERVAL * (0.5 + Math.random());
      const stripRow = Math.floor(Math.random() * this._rows);
      const stripHeight = 1 + Math.floor(Math.random() * 3);
      this._strips.push({
        row: stripRow,
        height: stripHeight,
        offsetX: (Math.random() - 0.5) * 30,
        birth: performance.now(),
      });
    }

    // During corruption, add more strips
    if (chaos > 0.3) {
      const count = Math.floor(chaos * 6);
      for (let i = 0; i < count; i++) {
        this._strips.push({
          row: Math.floor(Math.random() * this._rows),
          height: 1 + Math.floor(Math.random() * 4),
          offsetX: (Math.random() - 0.5) * 60 * chaos,
          birth: performance.now(),
        });
      }
    }

    // Expire old strips
    const now = performance.now();
    this._strips = this._strips.filter(
      (s) => (now - s.birth) / 1000 < BLOCK_GLITCH_DURATION,
    );

    // Build strip lookup
    const stripMap = new Map();
    for (const s of this._strips) {
      for (let r = s.row; r < s.row + s.height && r < this._rows; r++) {
        stripMap.set(r, (stripMap.get(r) || 0) + s.offsetX);
      }
    }

    // Clear with black (needed for screen blending)
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    const fontSize = this._cellW * dpr;
    ctx.font = `bold ${fontSize.toFixed(1)}px "Space Mono", monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.globalCompositeOperation = "screen";

    // Render three channel passes
    const channels = [
      { off: this._rOff, extract: (c) => `rgb(${c.r},0,0)` },
      { off: this._gOff, extract: (c) => `rgb(0,${c.g},0)` },
      { off: this._bOff, extract: (c) => `rgb(0,0,${c.b})` },
    ];

    for (const ch of channels) {
      const offX = ch.off.x * dpr;
      const offY = ch.off.y * dpr;

      for (let row = 0; row < this._rows; row++) {
        if (row >= this._charGrid.length) break;
        const stripOff = (stripMap.get(row) || 0) * dpr;

        for (let col = 0; col < this._cols; col++) {
          if (col >= this._charGrid[row].length) break;

          const baseX = (col * this._cellW + this._cellW / 2) * dpr;
          const baseY = (row * this._cellH + this._cellH / 2) * dpr;

          ctx.fillStyle = ch.extract(this._colorGrid[row][col]);
          ctx.fillText(
            this._charGrid[row][col],
            baseX + offX + stripOff,
            baseY + offY,
          );
        }
      }
    }

    ctx.globalCompositeOperation = "source-over";
  }

  _springOffset(off, tx, ty) {
    off.vx = (off.vx + (tx - off.x) * SPRING) * DAMPING;
    off.vy = (off.vy + (ty - off.y) * SPRING) * DAMPING;
    off.x += off.vx;
    off.y += off.vy;
  }

  triggerShockwave() {
    this._corruptionIntensity = 1.0;
  }

  dispose() {
    this._canvas?.remove();
    super.dispose();
  }
}
