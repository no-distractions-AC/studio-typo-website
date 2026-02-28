/**
 * TextErosion - Letters erode into hex tiles near cursor.
 *
 * Hybrid DOM + Canvas. Large text filled with image via background-clip:text.
 * Hover: text dissolves near cursor, hex tile fragments break off and drift.
 * Click: toggle full reveal -- tiles settle into grid, full image shown.
 */

import { ImageEffect } from "./ImageEffect.js";
import { getPixelRatio } from "../utils/device.js";

const TILE_SIZE = 14;
const TILE_EASE = 0.15;
const EROSION_RADIUS = 160;
const DRIFT_FORCE = 20;
const GRAVITY = 0.3;
const TWO_PI = Math.PI * 2;

export class TextErosion extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._displayText = "TYPO";
    this._wrapper = null;
    this._textEl = null;
    this._canvas = null;
    this._ctx = null;
    this._img = null;
    this._tiles = [];
    this._dpr = getPixelRatio(2);
    this._revealed = false;
    this._shockwaves = [];

    this._cropX = 0;
    this._cropY = 0;
    this._drawW = 0;
    this._drawH = 0;
  }

  async init() {
    this._img = await this._loadImg(this.imageSrc);
    this._buildDOM();
    this._buildTileGrid();
    this._tagEdgeTiles();
    this._setupEvents();
    this._startLoop();
  }

  _loadImg(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  _buildDOM() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this._wrapper = document.createElement("div");
    this._wrapper.style.cssText =
      "width:100%;height:100%;position:relative;overflow:hidden;background:#0f1114;";

    // Canvas for tile fragments
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;";
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
    this._ctx = this._canvas.getContext("2d");
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this._wrapper.appendChild(this._canvas);

    this._computeCover(w, h);

    // Text span on top
    const text = this._displayText;
    const fontSize = Math.min(w * (0.8 / text.length), h * 0.7);
    this._textEl = document.createElement("span");
    this._textEl.textContent = text;
    this._textEl.style.cssText =
      `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
      `font-family:"Space Mono",monospace;font-weight:700;` +
      `font-size:${fontSize.toFixed(0)}px;line-height:1;` +
      `background-image:url(${this.imageSrc});` +
      `background-size:cover;background-position:center;` +
      `-webkit-background-clip:text;background-clip:text;` +
      `color:transparent;z-index:1;pointer-events:none;`;

    this._wrapper.appendChild(this._textEl);
    this.container.appendChild(this._wrapper);
  }

  _computeCover(cw, ch) {
    const iw = this._img.width;
    const ih = this._img.height;
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

  _buildTileGrid() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    // Build text mask
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const mctx = offscreen.getContext("2d");

    const text = this._displayText;
    const fontSize = Math.min(w * (0.8 / text.length), h * 0.7);
    mctx.font = `700 ${fontSize}px "Space Mono", monospace`;
    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    mctx.fillStyle = "#fff";
    mctx.fillText(text, w / 2, h / 2);

    const maskData = mctx.getImageData(0, 0, w, h).data;

    // Build hex grid
    const ts = TILE_SIZE;
    const rowSpacing = ts * 0.866;
    const rows = Math.ceil(h / rowSpacing) + 1;
    const cols = Math.ceil(w / ts) + 1;
    this._tiles = [];

    for (let row = 0; row < rows; row++) {
      const isOdd = row % 2 === 1;
      const xOffset = isOdd ? ts / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const cx = col * ts + ts / 2 + xOffset;
        const cy = row * rowSpacing + ts / 2;
        if (cx < -ts || cx > w + ts || cy < -ts || cy > h + ts) continue;

        const px = Math.round(Math.min(Math.max(cx, 0), w - 1));
        const py = Math.round(Math.min(Math.max(cy, 0), h - 1));
        const inText = maskData[(py * w + px) * 4 + 3] > 128;

        const srcX = ((cx - this._cropX) / this._drawW) * this._img.width;
        const srcY = ((cy - this._cropY) / this._drawH) * this._img.height;
        const srcW = (ts / this._drawW) * this._img.width;
        const srcH = (ts / this._drawH) * this._img.height;

        this._tiles.push({
          cx,
          cy,
          srcX,
          srcY,
          srcW,
          srcH,
          inText,
          isEdge: false,
          offsetX: 0,
          offsetY: 0,
          targetX: 0,
          targetY: 0,
          rotation: 0,
          targetRotation: 0,
          scale: 1,
          targetScale: 1,
          opacity: 0,
          targetOpacity: 0,
          jitterAngle: (Math.random() - 0.5) * 1.2,
          strengthMult: 0.5 + Math.random(),
        });
      }
    }
  }

  _tagEdgeTiles() {
    const w = this.container.clientWidth;
    const ts = TILE_SIZE;

    // Build lookup set of in-text tile positions
    const inTextSet = new Set();
    for (const tile of this._tiles) {
      if (tile.inText) {
        const key = `${Math.round(tile.cx / ts)},${Math.round(tile.cy / ts)}`;
        inTextSet.add(key);
      }
    }

    // A tile is an edge tile if it's in text but has a neighbor not in text
    for (const tile of this._tiles) {
      if (!tile.inText) continue;
      const col = Math.round(tile.cx / ts);
      const row = Math.round(tile.cy / ts);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (!inTextSet.has(`${col + dx},${row + dy}`)) {
            tile.isEdge = true;
            break;
          }
        }
        if (tile.isEdge) break;
      }
    }
  }

  update() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const mx = this.mousePx.x;
    const my = this.mousePx.y;
    const hovered = this.isHovered;

    // Update text mask near cursor
    if (this._revealed) {
      this._textEl.style.webkitMaskImage =
        "radial-gradient(circle 9999px at 50% 50%, transparent 80%, black 100%)";
      this._textEl.style.maskImage =
        "radial-gradient(circle 9999px at 50% 50%, transparent 80%, black 100%)";
    } else if (hovered) {
      const pctX = (mx / w) * 100;
      const pctY = (my / h) * 100;
      const maskStr = `radial-gradient(circle ${EROSION_RADIUS}px at ${pctX.toFixed(1)}% ${pctY.toFixed(1)}%, transparent 60%, black 100%)`;
      this._textEl.style.webkitMaskImage = maskStr;
      this._textEl.style.maskImage = maskStr;
    } else {
      this._textEl.style.webkitMaskImage = "none";
      this._textEl.style.maskImage = "none";
    }

    // Update shockwaves
    const now = performance.now();
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i];
      if (((now - sw.startTime) / 1000) * 250 > 400) {
        this._shockwaves.splice(i, 1);
      }
    }

    // Update tiles
    const ctx = this._ctx;
    const ts = TILE_SIZE;
    const halfTs = ts / 2;
    ctx.clearRect(0, 0, w, h);

    for (const tile of this._tiles) {
      if (this._revealed) {
        // All tiles visible, settle to grid
        tile.targetOpacity = 1;
        tile.targetScale = 1;
        tile.targetX = 0;
        tile.targetY = 0;
        tile.targetRotation = 0;

        // Repel from cursor
        if (hovered) {
          const dx = tile.cx - mx;
          const dy = tile.cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EROSION_RADIUS && dist > 0) {
            const falloff = 1 - dist / EROSION_RADIUS;
            const f = DRIFT_FORCE * falloff * falloff * tile.strengthMult;
            const angle = Math.atan2(dy, dx) + tile.jitterAngle;
            tile.targetX = Math.cos(angle) * f;
            tile.targetY = Math.sin(angle) * f;
          }
        }
      } else if (hovered && tile.inText) {
        const dx = tile.cx - mx;
        const dy = tile.cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < EROSION_RADIUS && tile.isEdge) {
          // Edge tiles erode -- drift outward + gravity
          const falloff = 1 - dist / EROSION_RADIUS;
          tile.targetOpacity = falloff * 0.9;
          tile.targetScale = 0.5 + falloff * 0.5;

          const angle = Math.atan2(dy, dx) + tile.jitterAngle;
          const f = DRIFT_FORCE * falloff * tile.strengthMult;
          tile.targetX = Math.cos(angle) * f;
          tile.targetY = Math.sin(angle) * f + GRAVITY * DRIFT_FORCE;
          tile.targetRotation = f * 0.04 * tile.jitterAngle;
        } else {
          tile.targetOpacity = 0;
          tile.targetScale = 0;
          tile.targetX = 0;
          tile.targetY = 0;
          tile.targetRotation = 0;
        }
      } else {
        tile.targetOpacity = 0;
        tile.targetScale = 0;
        tile.targetX = 0;
        tile.targetY = 0;
        tile.targetRotation = 0;
      }

      // Apply shockwaves
      for (const sw of this._shockwaves) {
        const age = (now - sw.startTime) / 1000;
        const ringRadius = age * 250;
        const life = 1 - ringRadius / 400;
        if (life <= 0) continue;

        const dx = tile.cx - sw.x;
        const dy = tile.cy - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ringDist = Math.abs(dist - ringRadius);
        if (ringDist < 50 && dist > 0) {
          const proximity = 1 - ringDist / 50;
          const f = 20 * proximity * life * tile.strengthMult;
          tile.targetX += (dx / dist) * f;
          tile.targetY += (dy / dist) * f;
        }
      }

      // Ease
      tile.offsetX += (tile.targetX - tile.offsetX) * TILE_EASE;
      tile.offsetY += (tile.targetY - tile.offsetY) * TILE_EASE;
      tile.rotation += (tile.targetRotation - tile.rotation) * TILE_EASE;
      tile.scale += (tile.targetScale - tile.scale) * TILE_EASE;
      tile.opacity += (tile.targetOpacity - tile.opacity) * TILE_EASE;

      if (tile.opacity < 0.01) continue;

      // Draw hex tile
      ctx.save();
      ctx.globalAlpha = tile.opacity;
      ctx.translate(tile.cx + tile.offsetX, tile.cy + tile.offsetY);
      ctx.rotate(tile.rotation);
      ctx.scale(tile.scale, tile.scale);

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = halfTs * Math.cos(angle);
        const y = halfTs * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(
        this._img,
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
    }
  }

  setDisplayText(text) {
    this._displayText = text.toUpperCase();
    this._wrapper?.remove();
    this._buildDOM();
    this._buildTileGrid();
    this._tagEdgeTiles();
  }

  triggerShockwave(x, y) {
    this._revealed = !this._revealed;
    const cx = x || this.container.clientWidth / 2;
    const cy = y || this.container.clientHeight / 2;
    this._shockwaves.push({ x: cx, y: cy, startTime: performance.now() });
    if (this._shockwaves.length > 5) this._shockwaves.shift();
    this._needsRender = true;
  }

  _updateRendererSize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this._computeCover(w, h);
    this._buildTileGrid();
    this._tagEdgeTiles();
  }

  dispose() {
    this._tiles = [];
    this._shockwaves = [];
    this._img = null;
    this._ctx = null;
    this._wrapper?.remove();
    super.dispose();
  }
}
