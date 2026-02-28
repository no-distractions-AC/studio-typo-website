/**
 * QuadTile - Four quadrant circle tile mosaics that spring together.
 *
 * Idle: 4 quadrants separated by gaps, desaturated, with noise drift shimmer.
 * Hover: quadrants spring together, tiles repel from cursor, color returns.
 * When fully joined, a "TYPO" text flashes as an ephemeral signature.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";
import { noise2D } from "../ascii/noise.js";

const QUAD_GAP = 15;
const REPEL_RADIUS = 180;
const REPEL_FORCE = 25;
const NOISE_SCALE = 0.008;
const TIME_SCALE = 0.35;
const NOISE_AMP = 2;
const TYPO_FADE_DURATION = 800;

// Quadrant direction multipliers
const QUAD_DIRS = [
  { dx: -1, dy: -1 }, // top-left
  { dx: 1, dy: -1 }, // top-right
  { dx: -1, dy: 1 }, // bottom-left
  { dx: 1, dy: 1 }, // bottom-right
];

export class QuadTile extends CanvasTileEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, {
      ...options,
      tileShape: "circle",
      tileSize: 14,
      easeFactor: 0.18,
    });
    this._typoFlashStart = 0;
    this._wasRevealed = false;
    this._displayText = "TYPO";
  }

  _makeTile(cx, cy, ts) {
    const tile = super._makeTile(cx, cy, ts);

    // Tag quadrant based on position relative to center
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const isRight = cx >= w / 2;
    const isBottom = cy >= h / 2;
    tile.quadrant = (isBottom ? 2 : 0) + (isRight ? 1 : 0);

    return tile;
  }

  updateTilePhysics(elapsed) {
    const mx = this.mousePx.x;
    const my = this.mousePx.y;
    const hovered = this.isHovered;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    // Gap easing via hoverProgress (0 = full gap, 1 = no gap)
    const gapFactor = 1 - this.hoverProgress;
    const currentGap = QUAD_GAP * gapFactor;

    // Detect reveal moment (gap closes)
    const isRevealed = this.hoverProgress > 0.95;
    if (isRevealed && !this._wasRevealed) {
      this._typoFlashStart = performance.now();
    }
    this._wasRevealed = isRevealed;

    for (const tile of this.tiles) {
      const dir = QUAD_DIRS[tile.quadrant];

      // Quadrant offset
      const qOffsetX = dir.dx * currentGap;
      const qOffsetY = dir.dy * currentGap;

      // Noise drift (always alive)
      const nx = noise2D(
        tile.cx * NOISE_SCALE + elapsed * TIME_SCALE,
        tile.cy * NOISE_SCALE,
      );
      const ny = noise2D(
        tile.cx * NOISE_SCALE,
        tile.cy * NOISE_SCALE + elapsed * TIME_SCALE + 100,
      );

      tile.targetX = qOffsetX + nx * NOISE_AMP * tile.strengthMult;
      tile.targetY = qOffsetY + ny * NOISE_AMP * tile.strengthMult;
      tile.targetRotation = 0;
      tile.targetScale = 1;
      tile.targetOpacity = 0.6 + 0.4 * this.hoverProgress;

      // Repel from cursor
      if (hovered) {
        // Adjust cursor position relative to tile's displaced position
        const tilePosX = tile.cx + qOffsetX;
        const tilePosY = tile.cy + qOffsetY;
        const dx = tilePosX - mx;
        const dy = tilePosY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0) {
          const falloff = 1 - dist / REPEL_RADIUS;
          const f = REPEL_FORCE * falloff * falloff * tile.strengthMult;
          const angle = Math.atan2(dy, dx) + tile.jitterAngle;
          tile.targetX += Math.cos(angle) * f;
          tile.targetY += Math.sin(angle) * f;
          tile.targetRotation = f * 0.02 * tile.jitterAngle;
        }
      }

      this._applyShockwaves(tile);
    }
  }

  /**
   * Override update to draw TYPO flash overlay after tiles render.
   */
  update(delta, elapsed) {
    super.update(delta, elapsed);

    // Draw TYPO flash if active
    if (this._typoFlashStart > 0) {
      const age = performance.now() - this._typoFlashStart;
      if (age < TYPO_FADE_DURATION) {
        const progress = age / TYPO_FADE_DURATION;
        const opacity = 0.3 * (1 - progress);
        const scale = 0.95 + 0.05 * progress;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        const ctx = this.ctx;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = "#ffffff";
        const fontSize = Math.min(w * 0.2, h * 0.5);
        ctx.font = `700 ${fontSize}px "Space Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this._displayText, 0, 0);
        ctx.restore();
      } else {
        this._typoFlashStart = 0;
      }
    }
  }

  setDisplayText(text) {
    this._displayText = text.toUpperCase();
  }
}
