/**
 * ScatterType - Tiles scattered in text shapes reassemble into image.
 *
 * Idle: tiles inside letter silhouette scattered outward, rest hidden.
 * Hover: tiles near cursor attracted toward home positions.
 * Click/keystroke: toggles full reveal -- all tiles snap to grid.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";
import { noise2D } from "../ascii/noise.js";

const SCATTER_DIST = 200;
const ATTRACT_RADIUS = 200;
const NOISE_SCALE = 0.005;
const NOISE_AMP = 4;
const TIME_SCALE = 0.2;

export class ScatterType extends CanvasTileEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, {
      ...options,
      tileShape: "hex",
      tileSize: 14,
      easeFactor: 0.12,
    });
    this._displayText = "TYPO";
    this._revealed = false;
    this._letterMask = null;
  }

  async init() {
    await super.init();
    this._buildLetterMask();
    this._computeScatterPositions();
  }

  _buildLetterMask() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext("2d");

    const text = this._displayText;
    const fontSize = Math.min(w * (0.8 / text.length), h * 0.75);
    ctx.font = `700 ${fontSize}px "Space Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, w / 2, h / 2);

    const imageData = ctx.getImageData(0, 0, w, h);
    this._letterMask = imageData.data;

    for (const tile of this.tiles) {
      const px = Math.round(Math.min(Math.max(tile.cx, 0), w - 1));
      const py = Math.round(Math.min(Math.max(tile.cy, 0), h - 1));
      const idx = (py * w + px) * 4 + 3;
      tile.inLetter = this._letterMask[idx] > 128;
    }
  }

  _computeScatterPositions() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const cx = w / 2;
    const cy = h / 2;

    for (const tile of this.tiles) {
      if (tile.inLetter) {
        // Scatter outward from center
        const dx = tile.cx - cx;
        const dy = tile.cy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2;
        const scatter = SCATTER_DIST * (0.5 + Math.random() * 0.5);
        tile.scatterX = Math.cos(angle) * scatter;
        tile.scatterY = Math.sin(angle) * scatter;

        // Start scattered
        tile.offsetX = tile.scatterX;
        tile.offsetY = tile.scatterY;
        tile.scale = 0.6;
        tile.opacity = 0.5;
      } else {
        tile.scatterX = 0;
        tile.scatterY = 0;
        tile.scale = 0;
        tile.opacity = 0;
        tile.targetScale = 0;
        tile.targetOpacity = 0;
      }
    }
  }

  updateTilePhysics(elapsed) {
    const mx = this.mousePx.x;
    const my = this.mousePx.y;
    const hovered = this.isHovered;

    for (const tile of this.tiles) {
      if (!tile.inLetter && !this._revealed) {
        tile.targetScale = 0;
        tile.targetOpacity = 0;
        continue;
      }

      if (!tile.inLetter && this._revealed) {
        tile.targetOpacity = 1;
        tile.targetScale = 1;
        tile.targetX = 0;
        tile.targetY = 0;
        tile.targetRotation = 0;
        this._applyShockwaves(tile);
        continue;
      }

      // Noise drift
      const nx = noise2D(
        tile.cx * NOISE_SCALE + elapsed * TIME_SCALE,
        tile.cy * NOISE_SCALE,
      );
      const ny = noise2D(
        tile.cx * NOISE_SCALE,
        tile.cy * NOISE_SCALE + elapsed * TIME_SCALE + 100,
      );

      if (this._revealed) {
        // All at home with gentle drift
        tile.targetX = nx * NOISE_AMP * 0.3;
        tile.targetY = ny * NOISE_AMP * 0.3;
        tile.targetScale = 1;
        tile.targetOpacity = 1;
        tile.targetRotation = 0;
      } else {
        // Default: scattered
        tile.targetX = tile.scatterX + nx * NOISE_AMP;
        tile.targetY = tile.scatterY + ny * NOISE_AMP;
        tile.targetScale = 0.6;
        tile.targetOpacity = 0.5;
        tile.targetRotation = tile.jitterAngle * 0.5;

        // Cursor attraction
        if (hovered) {
          const dx = tile.cx - mx;
          const dy = tile.cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < ATTRACT_RADIUS) {
            const falloff = 1 - dist / ATTRACT_RADIUS;
            const t = falloff * falloff;
            // Lerp toward home from scatter position
            tile.targetX = tile.scatterX * (1 - t * 3) + nx * NOISE_AMP * 0.3;
            tile.targetY = tile.scatterY * (1 - t * 3) + ny * NOISE_AMP * 0.3;
            tile.targetScale = 0.6 + 0.4 * falloff;
            tile.targetOpacity = 0.5 + 0.5 * falloff;
            tile.targetRotation = tile.jitterAngle * 0.5 * (1 - falloff);
          }
        }
      }

      this._applyShockwaves(tile);
    }
  }

  setDisplayText(text) {
    this._displayText = text.toUpperCase();
    this._buildLetterMask();
    this._computeScatterPositions();
  }

  triggerShockwave(x, y) {
    this._revealed = !this._revealed;
    super.triggerShockwave(x, y);
  }

  _updateRendererSize() {
    super._updateRendererSize();
    if (this.tiles.length > 0) {
      this._buildLetterMask();
      this._computeScatterPositions();
    }
  }
}
