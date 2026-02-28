/**
 * VortexSpiral - Tiles orbit + rotate + shrink in a spiral around cursor.
 *
 * Creates a whirlpool/tornado effect. Tiles near the cursor orbit
 * tangentially, spin on their axis, and scale down into the vortex.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";

const RADIUS = 200;
const SPIRAL_FORCE = 30;
const MAX_ROTATION = Math.PI * 1.2;
const MIN_SCALE = 0.4;

export class VortexSpiral extends CanvasTileEffect {
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
        tile.targetRotation = 0;
        tile.targetScale = 1;
        continue;
      }

      const dx = tile.cx - mx;
      const dy = tile.cy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RADIUS && dist > 0) {
        const falloff = 1 - dist / RADIUS;
        const f2 = falloff * falloff;
        const strength = SPIRAL_FORCE * f2 * tile.strengthMult;

        // Tangential direction (perpendicular to radius) = orbital motion
        const tx = -dy / dist;
        const ty = dx / dist;

        // Slight inward pull creates spiral, not just circular orbit
        const inward = strength * 0.3;
        tile.targetX = tx * strength - (dx / dist) * inward;
        tile.targetY = ty * strength - (dy / dist) * inward;

        // Per-tile rotation: alternating spin direction based on jitter
        tile.targetRotation =
          MAX_ROTATION * f2 * (tile.jitterAngle > 0 ? 1 : -1);

        // Scale: shrink near center
        tile.targetScale = 1 - (1 - MIN_SCALE) * f2;
      } else {
        tile.targetX = 0;
        tile.targetY = 0;
        tile.targetRotation = 0;
        tile.targetScale = 1;
      }

      this._applyShockwaves(tile);
    }
  }
}
