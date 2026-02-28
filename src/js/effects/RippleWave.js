/**
 * RippleWave - Concentric wave displacement.
 *
 * Tiles displace in a radial sine wave pattern emanating
 * from the cursor position. Creates a water-ripple effect.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";

const RADIUS = 300;
const FREQUENCY = 0.04;
const SPEED = 4.0;
const AMPLITUDE = 18;

export class RippleWave extends CanvasTileEffect {
  updateTilePhysics(elapsed) {
    const mx = this.mousePx.x;
    const my = this.mousePx.y;

    for (const tile of this.tiles) {
      if (!this.isHovered) {
        tile.targetX = 0;
        tile.targetY = 0;
        continue;
      }

      const dx = tile.cx - mx;
      const dy = tile.cy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RADIUS && dist > 0) {
        // Sine wave displacement radiating outward
        const falloff = 1 - dist / RADIUS;
        const wave = Math.sin(dist * FREQUENCY - elapsed * SPEED) * falloff;
        const strength = wave * AMPLITUDE * tile.strengthMult;

        // Displacement direction is radial (outward from cursor)
        const nx = dx / dist;
        const ny = dy / dist;
        tile.targetX = nx * strength;
        tile.targetY = ny * strength;
      } else {
        tile.targetX = 0;
        tile.targetY = 0;
      }

      this._applyShockwaves(tile);
    }
  }
}
