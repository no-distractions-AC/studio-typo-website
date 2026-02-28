/**
 * CanvasTileEffect - Shared base for canvas-based tile displacement effects.
 *
 * Loads an image, divides it into a grid of tiles, and renders each tile
 * at a displaced position on a 2D canvas. Subclasses override
 * updateTilePhysics() to define the displacement behavior.
 *
 * Supports tile shapes: 'square', 'hex', 'circle'.
 * Hex and circle use offset hex-packing grids for organic layouts.
 */

import { ImageEffect } from "./ImageEffect.js";
import { getPixelRatio } from "../utils/device.js";

const DEFAULT_TILE_SIZE = 14;
const EASE_FACTOR = 0.1;
const TWO_PI = Math.PI * 2;

export class CanvasTileEffect extends ImageEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this.tileSize = options.tileSize || DEFAULT_TILE_SIZE;
    this.tileShape = options.tileShape || "square";
    this.easeFactor = options.easeFactor || EASE_FACTOR;
    this.tiles = [];
    this.img = null;
    this.ctx = null;
    this.dpr = getPixelRatio(2);

    // Cover crop offsets (for object-fit: cover math)
    this._cropX = 0;
    this._cropY = 0;
    this._drawW = 0;
    this._drawH = 0;

    // Shockwave ring effects triggered by keyboard
    this.shockwaves = [];
  }

  async init() {
    this.img = await this._loadImage(this.imageSrc);
    this._createCanvas2D();
    this._buildTileGrid();
    this._setupEvents();
    this._startLoop();
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  _createCanvas2D() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "width:100%;height:100%;display:block;";
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this._sizeCanvas();
  }

  _sizeCanvas() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this._computeCoverCrop(w, h);
  }

  /**
   * Compute source crop and destination draw dimensions
   * so the image fills the container like object-fit: cover.
   */
  _computeCoverCrop(cw, ch) {
    const iw = this.img.width;
    const ih = this.img.height;
    const containerAspect = cw / ch;
    const imageAspect = iw / ih;

    if (containerAspect > imageAspect) {
      this._drawW = cw;
      this._drawH = cw / imageAspect;
    } else {
      this._drawH = ch;
      this._drawW = ch * imageAspect;
    }

    this._cropX = (cw - this._drawW) / 2;
    this._cropY = (ch - this._drawH) / 2;
  }

  // --- Grid builders ---

  _buildTileGrid() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    if (this.tileShape === "hex" || this.tileShape === "circle") {
      this._buildHexGrid(w, h);
    } else {
      this._buildSquareGrid(w, h);
    }
  }

  _buildSquareGrid(w, h) {
    const ts = this.tileSize;
    const cols = Math.ceil(w / ts);
    const rows = Math.ceil(h / ts);

    this.tiles = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * ts + ts / 2;
        const cy = row * ts + ts / 2;
        this.tiles.push(this._makeTile(cx, cy, ts));
      }
    }
  }

  _buildHexGrid(w, h) {
    const ts = this.tileSize;
    const rowSpacing = ts * 0.866; // sqrt(3)/2
    const rows = Math.ceil(h / rowSpacing) + 1;
    const cols = Math.ceil(w / ts) + 1;

    this.tiles = [];

    for (let row = 0; row < rows; row++) {
      const isOdd = row % 2 === 1;
      const xOffset = isOdd ? ts / 2 : 0;

      for (let col = 0; col < cols; col++) {
        const cx = col * ts + ts / 2 + xOffset;
        const cy = row * rowSpacing + ts / 2;

        // Skip tiles entirely outside the container
        if (cx < -ts || cx > w + ts || cy < -ts || cy > h + ts) continue;

        this.tiles.push(this._makeTile(cx, cy, ts));
      }
    }
  }

  _makeTile(cx, cy, ts) {
    const srcX = ((cx - this._cropX) / this._drawW) * this.img.width;
    const srcY = ((cy - this._cropY) / this._drawH) * this.img.height;
    const srcW = (ts / this._drawW) * this.img.width;
    const srcH = (ts / this._drawH) * this.img.height;

    return {
      cx,
      cy,
      srcX,
      srcY,
      srcW,
      srcH,
      offsetX: 0,
      offsetY: 0,
      targetX: 0,
      targetY: 0,
      rotation: 0,
      targetRotation: 0,
      scale: 1,
      targetScale: 1,
      opacity: 1,
      targetOpacity: 1,
      jitterAngle: (Math.random() - 0.5) * 1.2,
      strengthMult: 0.5 + Math.random(),
    };
  }

  // --- Tile clip paths ---

  /**
   * Apply a clip path for the current tile shape.
   * Called with the context already translated to tile center.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} r - half tile size
   */
  _clipTile(ctx, r) {
    if (this.tileShape === "hex") {
      // Pointy-top hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
    } else if (this.tileShape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, 0, TWO_PI);
      ctx.clip();
    }
  }

  // --- Shockwave system ---

  /**
   * Trigger a shockwave ring at the given position (in container px).
   * Called by keyboard handler or subclass.
   */
  triggerShockwave(x, y) {
    this.shockwaves.push({
      x,
      y,
      startTime: performance.now(),
      speed: 250,
      maxRadius: 300,
      force: 20,
    });
    if (this.shockwaves.length > 5) this.shockwaves.shift();
    this._needsRender = true;
  }

  /**
   * Apply shockwave displacement to a single tile.
   * Call at end of subclass updateTilePhysics() loop.
   */
  _applyShockwaves(tile) {
    const now = performance.now();
    const bandWidth = 50;

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      const age = (now - sw.startTime) / 1000;
      const ringRadius = age * sw.speed;
      const life = 1 - ringRadius / sw.maxRadius;

      if (life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      const dx = tile.cx - sw.x;
      const dy = tile.cy - sw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // How close is the tile to the ring edge?
      const ringDist = Math.abs(dist - ringRadius);
      if (ringDist < bandWidth && dist > 0) {
        const proximity = 1 - ringDist / bandWidth;
        const f = sw.force * proximity * life * tile.strengthMult;

        // Radial outward push
        tile.targetX += (dx / dist) * f;
        tile.targetY += (dy / dist) * f;

        // Slight rotation kick
        tile.targetRotation += f * 0.02 * tile.jitterAngle;
      }
    }
  }

  /**
   * Override in subclass to set tile.targetX and tile.targetY
   * based on cursor position, time, etc.
   */
  updateTilePhysics(elapsed) {}

  update(delta, elapsed) {
    if (!this.ctx || !this.img) return;

    // Let subclass set targets
    this.updateTilePhysics(elapsed);

    const ease = this.easeFactor;
    const ts = this.tileSize;
    const halfTs = ts / 2;
    const ctx = this.ctx;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const needsClip = this.tileShape !== "square";

    ctx.clearRect(0, 0, w, h);

    for (const tile of this.tiles) {
      // Spring easing toward targets
      tile.offsetX += (tile.targetX - tile.offsetX) * ease;
      tile.offsetY += (tile.targetY - tile.offsetY) * ease;
      tile.rotation += (tile.targetRotation - tile.rotation) * ease;
      tile.scale += (tile.targetScale - tile.scale) * ease;
      tile.opacity += (tile.targetOpacity - tile.opacity) * ease;

      const needsTransform =
        Math.abs(tile.rotation) > 0.001 || Math.abs(tile.scale - 1) > 0.001;
      const needsAlpha = tile.opacity < 0.999;

      if (needsTransform || needsAlpha || needsClip) {
        // Slow path: per-tile canvas transforms / clip
        ctx.save();
        if (needsAlpha) ctx.globalAlpha = tile.opacity;
        ctx.translate(tile.cx + tile.offsetX, tile.cy + tile.offsetY);
        if (needsTransform) {
          ctx.rotate(tile.rotation);
          ctx.scale(tile.scale, tile.scale);
        }
        if (needsClip) this._clipTile(ctx, halfTs);
        ctx.drawImage(
          this.img,
          tile.srcX,
          tile.srcY,
          tile.srcW,
          tile.srcH,
          -halfTs,
          -halfTs,
          ts,
          ts,
        );
        ctx.restore();
      } else {
        // Fast path: no transforms needed
        ctx.drawImage(
          this.img,
          tile.srcX,
          tile.srcY,
          tile.srcW,
          tile.srcH,
          tile.cx - halfTs + tile.offsetX,
          tile.cy - halfTs + tile.offsetY,
          ts,
          ts,
        );
      }
    }
  }

  _setupEvents() {
    super._setupEvents();
  }

  _updateRendererSize() {
    this._sizeCanvas();
    this._buildTileGrid();
  }

  dispose() {
    this.tiles = [];
    this.shockwaves = [];
    this.img = null;
    this.ctx = null;
    super.dispose();
  }
}
