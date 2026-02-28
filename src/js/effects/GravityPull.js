/**
 * GravityPull - Tiles attract toward cursor.
 *
 * Opposite of TileRepel -- creates a suction/lens effect
 * where the image warps inward toward the cursor position.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";

const RADIUS = 200;
const FORCE = 30;

export class GravityPull extends CanvasTileEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, {
      ...options,
      tileShape: "circle",
      tileSize: 16,
    });
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

      const dx = mx - tile.cx;
      const dy = my - tile.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RADIUS && dist > 0) {
        const strength = FORCE * (1 - dist / RADIUS) * tile.strengthMult;
        const angle = Math.atan2(dy, dx) + tile.jitterAngle * 0.3;
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
