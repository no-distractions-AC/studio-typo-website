/**
 * PixelWind - Velocity-based wind displacement.
 *
 * Tiles blow in the direction of cursor movement.
 * Fast cursor = strong wind. Tiles spring back when cursor stops.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";

const RADIUS = 250;
const FORCE_MULT = 3.0;
const MAX_FORCE = 50;

export class PixelWind extends CanvasTileEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, { ...options, tileShape: "hex", tileSize: 16 });
    this._velX = 0;
    this._velY = 0;
  }

  updateTilePhysics() {
    const mx = this.mousePx.x;
    const my = this.mousePx.y;

    // Compute cursor velocity (smoothed)
    const rawVx = this.mousePx.x - this.prevMousePx.x;
    const rawVy = this.mousePx.y - this.prevMousePx.y;
    this._velX += (rawVx - this._velX) * 0.3;
    this._velY += (rawVy - this._velY) * 0.3;

    const speed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);

    for (const tile of this.tiles) {
      if (!this.isHovered || speed < 0.5) {
        tile.targetX = 0;
        tile.targetY = 0;
        continue;
      }

      const dx = tile.cx - mx;
      const dy = tile.cy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RADIUS) {
        const falloff = 1 - dist / RADIUS;
        const force =
          Math.min(speed * FORCE_MULT, MAX_FORCE) * falloff * tile.strengthMult;

        // Displacement in the direction of cursor movement
        const nx = this._velX / (speed || 1);
        const ny = this._velY / (speed || 1);
        tile.targetX = nx * force;
        tile.targetY = ny * force;
      } else {
        tile.targetX = 0;
        tile.targetY = 0;
      }

      this._applyShockwaves(tile);
    }
  }
}
