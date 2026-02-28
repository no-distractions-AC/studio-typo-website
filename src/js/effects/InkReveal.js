/**
 * InkReveal - Grayscale → color painting effect.
 *
 * Image renders desaturated at rest. Cursor proximity "paints"
 * tiles to full color. Activation decays over time, creating
 * a trail that slowly fades back to grayscale.
 *
 * Tiles DON'T MOVE -- only their color changes.
 */

import { CanvasTileEffect } from "./CanvasTileEffect.js";

const REVEAL_RADIUS = 160;
const REVEAL_SPEED = 0.15;
const DECAY_RATE = 0.985;

export class InkReveal extends CanvasTileEffect {
  async init() {
    this.img = await this._loadImage(this.imageSrc);
    this._createCanvas2D();
    this._createGrayscaleSource();
    this._buildTileGrid();
    this._setupEvents();
    this._startLoop();
  }

  _createGrayscaleSource() {
    this.grayCanvas = document.createElement("canvas");
    this.grayCanvas.width = this.img.width;
    this.grayCanvas.height = this.img.height;
    const gctx = this.grayCanvas.getContext("2d");
    gctx.filter = "grayscale(1)";
    gctx.drawImage(this.img, 0, 0);
  }

  _buildTileGrid() {
    super._buildTileGrid();
    // Add activation property to each tile
    for (const tile of this.tiles) {
      tile.activation = 0;
    }
  }

  updateTilePhysics() {
    const mx = this.mousePx.x;
    const my = this.mousePx.y;

    for (const tile of this.tiles) {
      // Decay all tiles toward grayscale
      tile.activation *= DECAY_RATE;

      if (this.isHovered) {
        const dx = tile.cx - mx;
        const dy = tile.cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REVEAL_RADIUS) {
          const influence = 1 - dist / REVEAL_RADIUS;
          tile.activation += (1 - tile.activation) * influence * REVEAL_SPEED;
        }
      }

      // No displacement (shockwaves can add some)
      tile.targetX = 0;
      tile.targetY = 0;

      this._applyShockwaves(tile);
    }
  }

  /**
   * Custom render: draw grayscale base, then overlay color with activation alpha.
   */
  update(delta, elapsed) {
    if (!this.ctx || !this.img || !this.grayCanvas) return;

    this.updateTilePhysics(elapsed);

    const ts = this.tileSize;
    const halfTs = ts / 2;
    const ctx = this.ctx;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    ctx.clearRect(0, 0, w, h);

    for (const tile of this.tiles) {
      // Spring easing on position (always 0 for InkReveal, but keeps base consistent)
      tile.offsetX += (tile.targetX - tile.offsetX) * this.easeFactor;
      tile.offsetY += (tile.targetY - tile.offsetY) * this.easeFactor;

      const dx = tile.cx - halfTs + tile.offsetX;
      const dy = tile.cy - halfTs + tile.offsetY;

      // Draw grayscale base tile
      ctx.drawImage(
        this.grayCanvas,
        tile.srcX,
        tile.srcY,
        tile.srcW,
        tile.srcH,
        dx,
        dy,
        ts,
        ts,
      );

      // Overlay color tile with activation alpha
      if (tile.activation > 0.01) {
        ctx.globalAlpha = tile.activation;
        ctx.drawImage(
          this.img,
          tile.srcX,
          tile.srcY,
          tile.srcW,
          tile.srcH,
          dx,
          dy,
          ts,
          ts,
        );
        ctx.globalAlpha = 1;
      }
    }
  }

  dispose() {
    this.grayCanvas = null;
    super.dispose();
  }
}
