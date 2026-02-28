/**
 * TileRepel - Divya-style tile displacement.
 *
 * Image tiles push away from the cursor with spring physics.
 * Each tile has random jitter and strength for organic feel.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";

const RADIUS = 220;
const FORCE = 40;

export class TileRepel extends CanvasTileEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, { ...options, tileShape: "hex", tileSize: 16 });
  }

  updateTilePhysics() {
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
        const strength = FORCE * (1 - dist / RADIUS) * tile.strengthMult;
        const angle = Math.atan2(dy, dx) + tile.jitterAngle;
        tile.targetX = Math.cos(angle) * strength;
        tile.targetY = Math.sin(angle) * strength;
      } else {
        tile.targetX = 0;
        tile.targetY = 0;
      }

      this._applyShockwaves(tile);
    }
  }
}
