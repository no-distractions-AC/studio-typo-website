/**
 * DepthField - Cinematic rack focus on ASCII art.
 *
 * Characters near cursor are sharp and bright; characters far from cursor
 * are progressively blurred and dimmed. Blur simulated via offset copies.
 * Idle: gentle ambient focus drift. Hover: focus tracks cursor.
 * Keystroke: rapid left-to-right rack focus sweep.
 */

import { ImageEffect } from "./ImageEffect.js";
import { loadImage, sampleCanvasWithColor } from "../ascii/utils/brightness.js";
import { brightnessToChar } from "../ascii/utils/ascii-density.js";
import { getPixelRatio } from "../utils/device.js";

const TARGET_COLS = 55;
const SPRING = 0.06;
const DAMPING = 0.82;
const FOCUS_INNER = 80;
const FOCUS_OUTER = 220;
const IDLE_BLUR = 0.5;
const SWEEP_DURATION = 0.6;

export class DepthField extends ImageEffect {
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

    // Focus position (spring-eased)
    this._focusX = 0;
    this._focusY = 0;
    this._focusVX = 0;
    this._focusVY = 0;
    this._targetFocusX = 0;
    this._targetFocusY = 0;

    // Ambient drift
    this._ambientPhase = Math.random() * Math.PI * 2;

    // Keystroke sweep
    this._sweepActive = false;
    this._sweepStart = 0;
  }

  async init() {
    const imgCanvas = await loadImage(this.imageSrc);
    this._createRenderCanvas();
    this._sampleAndBuildGrid(imgCanvas);

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this._focusX = w / 2;
    this._focusY = h / 2;
    this._targetFocusX = w / 2;
    this._targetFocusY = h / 2;

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
          seed: Math.random() * 100,
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

    // Update focus target
    if (this.isHovered) {
      this._targetFocusX = this.mousePx.x;
      this._targetFocusY = this.mousePx.y;
    } else {
      // Ambient drift
      this._ambientPhase += delta * 0.3;
      this._targetFocusX = w / 2 + Math.sin(this._ambientPhase) * w * 0.2;
      this._targetFocusY =
        h / 2 + Math.cos(this._ambientPhase * 0.7) * h * 0.15;
    }

    // Spring focus position
    this._focusVX =
      (this._focusVX + (this._targetFocusX - this._focusX) * SPRING) * DAMPING;
    this._focusVY =
      (this._focusVY + (this._targetFocusY - this._focusY) * SPRING) * DAMPING;
    this._focusX += this._focusVX;
    this._focusY += this._focusVY;

    // Sweep override
    let sweepFocusX = this._focusX;
    let sweepBlurOverride = -1;
    if (this._sweepActive) {
      const sweepAge = (performance.now() - this._sweepStart) / 1000;
      if (sweepAge < SWEEP_DURATION) {
        const t = sweepAge / SWEEP_DURATION;
        sweepFocusX = t * w;
        sweepBlurOverride = 0;
      } else {
        this._sweepActive = false;
      }
    }

    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    const fontSize = this._cellW * dpr;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const focusX = sweepFocusX;
    const focusY = this._focusY;
    const baseFontStr = `bold ${fontSize.toFixed(1)}px "Space Mono", monospace`;

    for (const cell of this._cells) {
      const baseX = cell.col * this._cellW + this._cellW / 2;
      const baseY = cell.row * this._cellH + this._cellH / 2;

      const dx = baseX - focusX;
      const dy = baseY - focusY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Calculate blur amount (0 = sharp, 1 = max blur)
      let blur;
      if (sweepBlurOverride >= 0) {
        // During sweep: sharp near sweep line
        const sweepDist = Math.abs(baseX - focusX);
        blur = Math.min(
          1,
          Math.max(0, (sweepDist - FOCUS_INNER) / (FOCUS_OUTER - FOCUS_INNER)),
        );
      } else if (this.isHovered) {
        blur = Math.min(
          1,
          Math.max(0, (dist - FOCUS_INNER) / (FOCUS_OUTER - FOCUS_INNER)),
        );
      } else {
        // Idle: everything somewhat soft
        blur = IDLE_BLUR + Math.sin(elapsed * 0.5 + cell.seed) * 0.15;
      }

      const drawX = baseX * dpr;
      const drawY = baseY * dpr;
      const { r, g, b } = cell.color;

      this._drawBlurredChar(
        ctx,
        cell.char,
        drawX,
        drawY,
        blur,
        r,
        g,
        b,
        fontSize,
        baseFontStr,
      );
    }
  }

  _drawBlurredChar(ctx, char, x, y, blur, r, g, b, fontSize, fontStr) {
    if (blur < 0.1) {
      // Sharp
      ctx.font = fontStr;
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(char, x, y);
    } else if (blur < 0.4) {
      // Light blur: 2 offset copies + center
      const spread = blur * 4;
      ctx.font = fontStr;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.globalAlpha = 0.25;
      ctx.fillText(char, x - spread, y - spread);
      ctx.fillText(char, x + spread, y + spread);
      ctx.globalAlpha = 0.6;
      ctx.fillText(char, x, y);
    } else {
      // Heavy blur: multiple offset copies, slightly larger
      const spread = blur * 6;
      const copies = Math.ceil(blur * 4);
      const bigFontSize = fontSize * (1 + blur * 0.15);
      ctx.font = `bold ${bigFontSize.toFixed(1)}px "Space Mono", monospace`;
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      // Deterministic offsets for consistency (no random flicker)
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < copies; i++) {
        const angle = (i / copies) * Math.PI * 2;
        const ox = Math.cos(angle) * spread;
        const oy = Math.sin(angle) * spread;
        ctx.fillText(char, x + ox, y + oy);
      }
      // Dimmed center
      ctx.globalAlpha = 0.35 * (1 - blur * 0.4);
      ctx.fillText(char, x, y);
    }
    ctx.globalAlpha = 1;
  }

  triggerShockwave() {
    this._sweepActive = true;
    this._sweepStart = performance.now();
  }

  dispose() {
    this._canvas?.remove();
    super.dispose();
  }
}
