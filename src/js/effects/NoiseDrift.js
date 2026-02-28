/**
 * NoiseDrift - Always-alive noise field tile displacement.
 *
 * All tiles drift gently based on a 2D simplex noise field
 * that evolves over time. Cursor proximity amplifies the drift.
 * Creates an organic, breathing image effect.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";
import { noise2D } from "../ascii/noise.js";

const BASE_AMPLITUDE = 3;
const HOVER_AMPLITUDE = 15;
const NOISE_SCALE = 0.008;
const TIME_SCALE = 0.4;
const CURSOR_RADIUS = 250;

export class NoiseDrift extends CanvasTileEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, {
      ...options,
      tileShape: "circle",
      tileSize: 16,
    });
  }

  updateTilePhysics(elapsed) {
    for (const tile of this.tiles) {
      // Sample 2D noise field at tile position + time
      const nx = noise2D(
        tile.cx * NOISE_SCALE + elapsed * TIME_SCALE,
        tile.cy * NOISE_SCALE,
      );
      const ny = noise2D(
        tile.cx * NOISE_SCALE,
        tile.cy * NOISE_SCALE + elapsed * TIME_SCALE + 100,
      );

      // Base amplitude (always alive)
      let amp = BASE_AMPLITUDE;

      // Amplify near cursor
      if (this.isHovered) {
        const dx = tile.cx - this.mousePx.x;
        const dy = tile.cy - this.mousePx.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CURSOR_RADIUS) {
          const boost = 1 - dist / CURSOR_RADIUS;
          amp += HOVER_AMPLITUDE * boost * boost;
        }
      }

      tile.targetX = nx * amp * tile.strengthMult;
      tile.targetY = ny * amp * tile.strengthMult;

      this._applyShockwaves(tile);
    }
  }
}
