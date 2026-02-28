/**
 * TileType - Hex tiles arranged into "TYPO" letter silhouettes.
 *
 * Idle: tiles within letter shapes are visible, others hidden. Desaturated with noise drift.
 * Hover: inner ring vortex, outer ring attracts hidden tiles toward cursor.
 * Click/keystroke: shockwave toggles between letter-mode and full-image reveal.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";
import { noise2D } from "../ascii/noise.js";

const INNER_RADIUS = 120;
const OUTER_RADIUS = 300;
const VORTEX_FORCE = 25;
const ATTRACT_FORCE = 18;
const MAX_ROTATION = Math.PI * 0.8;
const MIN_SCALE = 0.5;
const NOISE_SCALE = 0.008;
const TIME_SCALE = 0.3;
const NOISE_AMP = 3;

export class TileType extends CanvasTileEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, {
      ...options,
      tileShape: "hex",
      tileSize: 16,
      easeFactor: 0.18,
    });
    this._revealed = false;
    this._revealProgress = 0;
    this._letterMask = null;
    this._displayText = "TYPO";
  }

  async init() {
    await super.init();
    this._buildLetterMask();
    this._applyLetterState();
  }

  _buildLetterMask() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext("2d");

    // Render text centered, auto-scale to fit
    const text = this._displayText;
    const fontSize = Math.min(w * (0.8 / text.length), h * 0.75);
    ctx.font = `700 ${fontSize}px "Space Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, w / 2, h / 2);

    // Sample alpha channel
    const imageData = ctx.getImageData(0, 0, w, h);
    this._letterMask = imageData.data;
    this._maskWidth = w;

    // Tag each tile
    for (const tile of this.tiles) {
      const px = Math.round(Math.min(Math.max(tile.cx, 0), w - 1));
      const py = Math.round(Math.min(Math.max(tile.cy, 0), h - 1));
      const idx = (py * w + px) * 4 + 3; // alpha channel
      tile.inLetter = this._letterMask[idx] > 128;
    }
  }

  _applyLetterState() {
    for (const tile of this.tiles) {
      if (!this._revealed && !tile.inLetter) {
        tile.targetScale = 0;
        tile.targetOpacity = 0;
        tile.scale = 0;
        tile.opacity = 0;
      }
    }
  }

  updateTilePhysics(elapsed) {
    const mx = this.mousePx.x;
    const my = this.mousePx.y;
    const hovered = this.isHovered;

    // Ease reveal progress
    const revealTarget = this._revealed ? 1 : 0;
    this._revealProgress += (revealTarget - this._revealProgress) * 0.12;

    for (const tile of this.tiles) {
      // Noise drift (always alive for in-letter tiles or revealed tiles)
      const isVisible = tile.inLetter || this._revealed;
      const nx = noise2D(
        tile.cx * NOISE_SCALE + elapsed * TIME_SCALE,
        tile.cy * NOISE_SCALE,
      );
      const ny = noise2D(
        tile.cx * NOISE_SCALE,
        tile.cy * NOISE_SCALE + elapsed * TIME_SCALE + 100,
      );

      if (this._revealed) {
        // Revealed mode: all tiles at home, standard noise drift + repel
        tile.targetX = nx * NOISE_AMP * tile.strengthMult;
        tile.targetY = ny * NOISE_AMP * tile.strengthMult;
        tile.targetScale = 1;
        tile.targetOpacity = 1;
        tile.targetRotation = 0;

        if (hovered) {
          const dx = tile.cx - mx;
          const dy = tile.cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < INNER_RADIUS && dist > 0) {
            const falloff = 1 - dist / INNER_RADIUS;
            const f = VORTEX_FORCE * falloff * falloff * tile.strengthMult;
            const tx = -dy / dist;
            const ty = dx / dist;
            tile.targetX += tx * f;
            tile.targetY += ty * f;
            tile.targetRotation =
              MAX_ROTATION * falloff * (tile.jitterAngle > 0 ? 1 : -1);
          }
        }
      } else {
        // Letter mode
        if (tile.inLetter) {
          tile.targetX = nx * NOISE_AMP * tile.strengthMult;
          tile.targetY = ny * NOISE_AMP * tile.strengthMult;
          tile.targetScale = 1;
          tile.targetOpacity = hovered ? 1 : 0.65;
          tile.targetRotation = 0;

          if (hovered) {
            const dx = tile.cx - mx;
            const dy = tile.cy - my;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Inner vortex on in-letter tiles
            if (dist < INNER_RADIUS && dist > 0) {
              const falloff = 1 - dist / INNER_RADIUS;
              const f = VORTEX_FORCE * falloff * falloff * tile.strengthMult;
              const tx = -dy / dist;
              const ty = dx / dist;
              tile.targetX += tx * f;
              tile.targetY += ty * f;
              tile.targetRotation =
                MAX_ROTATION * falloff * (tile.jitterAngle > 0 ? 1 : -1);
              tile.targetScale = 1 - (1 - MIN_SCALE) * falloff * falloff;
            }
          }
        } else {
          // Hidden tiles - but attract toward cursor on hover
          if (hovered) {
            const dx = tile.cx - mx;
            const dy = tile.cy - my;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < OUTER_RADIUS && dist > INNER_RADIUS) {
              const range = OUTER_RADIUS - INNER_RADIUS;
              const falloff = 1 - (dist - INNER_RADIUS) / range;
              const f = ATTRACT_FORCE * falloff * falloff * tile.strengthMult;

              // Pull toward cursor
              tile.targetX = -(dx / dist) * f;
              tile.targetY = -(dy / dist) * f;
              tile.targetScale = falloff * 0.8;
              tile.targetOpacity = falloff * 0.9;
            } else {
              tile.targetX = 0;
              tile.targetY = 0;
              tile.targetScale = 0;
              tile.targetOpacity = 0;
            }
          } else {
            tile.targetX = 0;
            tile.targetY = 0;
            tile.targetScale = 0;
            tile.targetOpacity = 0;
          }
        }
      }

      this._applyShockwaves(tile);
    }
  }

  setDisplayText(text) {
    this._displayText = text.toUpperCase();
    this._buildLetterMask();
    if (!this._revealed) this._applyLetterState();
  }

  triggerShockwave(x, y) {
    this._revealed = !this._revealed;
    super.triggerShockwave(x, y);
  }

  _updateRendererSize() {
    super._updateRendererSize();
    if (this.tiles.length > 0) {
      this._buildLetterMask();
      if (!this._revealed) this._applyLetterState();
    }
  }
}
