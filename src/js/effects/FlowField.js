/**
 * FlowField - Vector field flowing typography.
 *
 * ASCII grid where each character rotates and translates along a 2D noise
 * vector field. Field evolves over time creating organic flow.
 * Idle: characters drift like leaves on water.
 * Hover: cursor creates a local vortex distorting the field.
 * Keystroke: field direction reverses sharply (180-degree flip).
 */

import { ImageEffect } from "./ImageEffect.js";
import { loadImage, sampleCanvasWithColor } from "../ascii/utils/brightness.js";
import { brightnessToChar } from "../ascii/utils/ascii-density.js";
import { getPixelRatio } from "../utils/device.js";

const TARGET_COLS = 50;
const SPRING = 0.07;
const DAMPING = 0.85;
const FIELD_STRENGTH = 6;
const VORTEX_RADIUS = 160;
const VORTEX_FORCE = 3;
const REVERSE_DURATION = 0.8;

export class FlowField extends ImageEffect {
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

    // Field direction multiplier (1 or -1, spring-eased)
    this._fieldDir = 1;
    this._fieldDirTarget = 1;
    this._fieldDirVel = 0;

    // Keystroke reversal
    this._reverseStart = -10;
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
          // Physics
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          rot: 0,
          vRot: 0,
          seed: Math.random() * 100,
        });
      }
    }
  }

  // Simple 2D noise-like field angle (no library needed)
  _fieldAngle(x, y, time) {
    return (
      Math.sin(x * 0.02 + time * 0.3) *
      Math.cos(y * 0.025 + time * 0.2) *
      Math.PI *
      this._fieldDir
    );
  }

  update(delta, elapsed) {
    if (!this._ctx || this._cells.length === 0) return;

    const ctx = this._ctx;
    const dpr = this._dpr;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const mx = this.mousePx.x;
    const my = this.mousePx.y;

    // Spring the field direction
    const reverseAge = (performance.now() - this._reverseStart) / 1000;
    if (reverseAge < REVERSE_DURATION) {
      this._fieldDirTarget = -1;
    } else {
      this._fieldDirTarget = 1;
    }
    this._fieldDirVel =
      (this._fieldDirVel + (this._fieldDirTarget - this._fieldDir) * 0.05) *
      0.9;
    this._fieldDir += this._fieldDirVel;

    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    const fontSize = this._cellW * dpr;
    ctx.font = `bold ${fontSize.toFixed(1)}px "Space Mono", monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    for (const cell of this._cells) {
      const baseX = cell.col * this._cellW + this._cellW / 2;
      const baseY = cell.row * this._cellH + this._cellH / 2;

      // Field vector at this position
      const angle = this._fieldAngle(baseX, baseY, elapsed);
      let targetX = Math.cos(angle) * FIELD_STRENGTH;
      let targetY = Math.sin(angle) * FIELD_STRENGTH;
      let targetRot = angle * 0.3;

      // Vortex from cursor
      if (this.isHovered) {
        const dx = baseX - mx;
        const dy = baseY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < VORTEX_RADIUS && dist > 1) {
          const falloff = 1 - dist / VORTEX_RADIUS;
          const strength = VORTEX_FORCE * falloff * falloff;
          // Tangential force (perpendicular to radial)
          const tangX = -dy / dist;
          const tangY = dx / dist;
          targetX += tangX * strength * 10;
          targetY += tangY * strength * 10;
          targetRot += strength * 0.8;
        }
      }

      // Spring physics
      cell.vx = (cell.vx + (targetX - cell.x) * SPRING) * DAMPING;
      cell.vy = (cell.vy + (targetY - cell.y) * SPRING) * DAMPING;
      cell.vRot = (cell.vRot + (targetRot - cell.rot) * SPRING) * DAMPING;
      cell.x += cell.vx;
      cell.y += cell.vy;
      cell.rot += cell.vRot;

      // Render
      const drawX = (baseX + cell.x) * dpr;
      const drawY = (baseY + cell.y) * dpr;
      const { r, g, b } = cell.color;

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(cell.rot);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(cell.char, 0, 0);
      ctx.restore();
    }
  }

  triggerShockwave() {
    this._reverseStart = performance.now();
  }

  dispose() {
    this._canvas?.remove();
    super.dispose();
  }
}
