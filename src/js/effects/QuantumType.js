/**
 * QuantumType - Superposition ghosting typography.
 *
 * Each character rendered 3-4 times at slightly different positions
 * with decreasing opacity, creating quantum vibration. Hover
 * "collapses the wave function" — characters near cursor snap to
 * a single crisp state. Keystroke flashes all characters to clarity.
 */

import { ImageEffect } from "./ImageEffect.js";
import { loadImage, sampleCanvasWithColor } from "../ascii/utils/brightness.js";
import { brightnessToChar } from "../ascii/utils/ascii-density.js";
import { getPixelRatio } from "../utils/device.js";

const TARGET_COLS = 55;
const SPRING = 0.06;
const DAMPING = 0.82;
const COLLAPSE_RADIUS = 120;
const COLLAPSE_TRANSITION = 80;
const FLASH_DURATION = 0.3;

// Ghost configuration
const GHOSTS = [
  { opacity: 0.3, maxOffset: 3, huShift: 0 },
  { opacity: 0.15, maxOffset: 6, huShift: 15 },
  { opacity: 0.08, maxOffset: 10, huShift: -15 },
];

export class QuantumType extends ImageEffect {
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

    // Collapse center (spring-eased)
    this._collapseX = 0;
    this._collapseY = 0;
    this._collapseVX = 0;
    this._collapseVY = 0;

    // Keystroke flash
    this._flashStart = -10;
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
          // Ghost seeds for noise-based drift
          ghostSeeds: GHOSTS.map(() => Math.random() * 100),
          // Per-cell collapse amount (spring-eased)
          collapse: 0,
          collapseVel: 0,
        });
      }
    }
  }

  update(delta, elapsed) {
    if (!this._ctx || this._cells.length === 0) return;

    const ctx = this._ctx;
    const dpr = this._dpr;
    const mx = this.mousePx.x;
    const my = this.mousePx.y;

    // Spring collapse center to cursor
    if (this.isHovered) {
      this._collapseVX =
        (this._collapseVX + (mx - this._collapseX) * SPRING) * DAMPING;
      this._collapseVY =
        (this._collapseVY + (my - this._collapseY) * SPRING) * DAMPING;
    }
    this._collapseX += this._collapseVX;
    this._collapseY += this._collapseVY;

    // Keystroke flash
    const flashAge = (performance.now() - this._flashStart) / 1000;
    const flashActive = flashAge < FLASH_DURATION;
    const flashCollapse = flashActive
      ? 1 - (flashAge / FLASH_DURATION) * (flashAge / FLASH_DURATION)
      : 0;

    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    const fontSize = this._cellW * dpr;
    ctx.font = `bold ${fontSize.toFixed(1)}px "Space Mono", monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    for (const cell of this._cells) {
      const baseX = cell.col * this._cellW + this._cellW / 2;
      const baseY = cell.row * this._cellH + this._cellH / 2;

      // Determine target collapse for this cell
      let targetCollapse = 0;
      if (this.isHovered) {
        const dx = baseX - this._collapseX;
        const dy = baseY - this._collapseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < COLLAPSE_RADIUS) {
          targetCollapse = 1;
        } else if (dist < COLLAPSE_RADIUS + COLLAPSE_TRANSITION) {
          targetCollapse = 1 - (dist - COLLAPSE_RADIUS) / COLLAPSE_TRANSITION;
        }
      }
      // Flash override
      targetCollapse = Math.max(targetCollapse, flashCollapse);

      // Spring ease collapse
      cell.collapseVel =
        (cell.collapseVel + (targetCollapse - cell.collapse) * SPRING) *
        DAMPING;
      cell.collapse += cell.collapseVel;
      const c = Math.max(0, Math.min(1, cell.collapse));

      const drawX = baseX * dpr;
      const drawY = baseY * dpr;
      const { r, g, b } = cell.color;

      // Draw ghosts (back to front)
      for (let gi = GHOSTS.length - 1; gi >= 0; gi--) {
        const ghost = GHOSTS[gi];
        const seed = cell.ghostSeeds[gi];

        // Ghost offset drifts with noise
        const ox = Math.sin(elapsed * 0.7 + seed) * ghost.maxOffset * (1 - c);
        const oy =
          Math.cos(elapsed * 0.5 + seed * 1.3) * ghost.maxOffset * (1 - c);
        const ghostOpacity = ghost.opacity * (1 - c);

        if (ghostOpacity < 0.02) continue;

        // Desaturate ghost color slightly
        const shift = ghost.huShift;
        const gr = Math.max(0, Math.min(255, r + shift));
        const gg = Math.max(0, Math.min(255, g + shift * 0.5));
        const gb = Math.max(0, Math.min(255, b - shift * 0.3));

        ctx.globalAlpha = ghostOpacity;
        ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
        ctx.fillText(cell.char, drawX + ox * dpr, drawY + oy * dpr);
      }

      // Draw primary character
      const primaryOpacity = 0.6 + 0.4 * c; // Brighter when collapsed
      ctx.globalAlpha = primaryOpacity;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(cell.char, drawX, drawY);
    }

    ctx.globalAlpha = 1;
  }

  triggerShockwave() {
    this._flashStart = performance.now();
  }

  dispose() {
    this._canvas?.remove();
    super.dispose();
  }
}
