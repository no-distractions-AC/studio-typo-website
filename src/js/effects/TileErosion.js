/**
 * TileErosion - Inverted TextErosion. Hex tile mosaic erodes near cursor,
 * revealing image-filled text beneath.
 *
 * Hybrid DOM + Canvas. Full hex tile grid covers everything.
 * Hover: tiles near cursor erode (edge tiles drift outward + gravity,
 * inner tiles fade), revealing background-clip:text underneath.
 * Click: toggle full reveal -- all tiles erode, text fully visible.
 *
 * All physics parameters are tunable via setParam() for live slider control.
 */

import { ImageEffect } from "./ImageEffect.js";
import { getPixelRatio } from "../utils/device.js";

const TWO_PI = Math.PI * 2;

export class TileErosion extends ImageEffect {
  static SLIDER_DEFS = [
    {
      key: "tileShape",
      label: "Shape",
      type: "select",
      options: ["hex", "circle", "square"],
    },
    { key: "tileSize", label: "Tile Size", min: 6, max: 80, step: 1 },
    { key: "gap", label: "Gap", min: 0, max: 10, step: 0.5 },
    { key: "erosionRadius", label: "Radius", min: 40, max: 400, step: 10 },
    { key: "driftForce", label: "Drift", min: 0, max: 60, step: 1 },
    { key: "gravity", label: "Gravity", min: 0, max: 2, step: 0.05 },
    { key: "easeSpeed", label: "Ease", min: 0.02, max: 0.4, step: 0.01 },
    { key: "rotation", label: "Spin", min: 0, max: 0.2, step: 0.005 },
    { key: "shockForce", label: "Shock F.", min: 0, max: 60, step: 1 },
    { key: "shockSpeed", label: "Shock V.", min: 50, max: 600, step: 10 },
  ];

  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._params = {
      tileShape: "hex",
      tileSize: 14,
      gap: 0,
      erosionRadius: 160,
      driftForce: 20,
      gravity: 0.3,
      easeSpeed: 0.15,
      rotation: 0.04,
      shockForce: 20,
      shockSpeed: 250,
    };

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
    this._rebuildTimer = null;

    this._animatedGap = 0;
    this._gapClosing = false;
    this._gapCloseStart = 0;
    this._gapCloseFrom = 0;

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

  setParam(key, value) {
    this._params[key] = value;
    if (key === "tileSize" || key === "tileShape") {
      clearTimeout(this._rebuildTimer);
      this._rebuildTimer = setTimeout(() => {
        this._buildTileGrid();
        this._tagEdgeTiles();
      }, 100);
    }
    this._needsRender = true;
  }

  _buildDOM() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this._wrapper = document.createElement("div");
    this._wrapper.style.cssText =
      "width:100%;height:100%;position:relative;overflow:hidden;background:#0f1114;";

    // Text span BEHIND canvas (z-index:0) -- revealed when tiles erode
    const text = this._displayText;
    const fontSize = Math.min(w * (0.8 / text.length), h * 0.7);
    this._textEl = document.createElement("span");
    this._textEl.textContent = text;
    this._textEl.style.cssText =
      `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
      `font-family:"Space Mono",monospace;font-weight:700;` +
      `font-size:${fontSize.toFixed(0)}px;line-height:1;` +
      `color:#fff;z-index:0;pointer-events:none;`;
    this._wrapper.appendChild(this._textEl);

    // Canvas for hex tiles ON TOP (z-index:1)
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;pointer-events:none;";
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
    this._ctx = this._canvas.getContext("2d");
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this._wrapper.appendChild(this._canvas);

    this._computeCover(w, h);
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

    // Build text mask (for edge detection)
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

    // Build tile grid at gap=0 (gap is animated dynamically)
    const ts = this._params.tileSize;
    const shape = this._params.tileShape;
    const useHexPacking = shape === "hex" || shape === "circle";

    const rowSpacing = useHexPacking ? ts * 0.866 : ts;
    const rows = Math.ceil(h / rowSpacing) + 2;
    const cols = Math.ceil(w / ts) + 2;
    this._tiles = [];

    for (let row = 0; row < rows; row++) {
      const isOdd = row % 2 === 1;
      const xOffset = useHexPacking && isOdd ? ts / 2 : 0;
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
          opacity: 1,
          targetOpacity: 1,
          jitterAngle: (Math.random() - 0.5) * 1.2,
          strengthMult: 0.5 + Math.random(),
        });
      }
    }
  }

  _tagEdgeTiles() {
    const ts = this._params.tileSize;

    const inTextSet = new Set();
    for (const tile of this._tiles) {
      if (tile.inText) {
        const key = `${Math.round(tile.cx / ts)},${Math.round(tile.cy / ts)}`;
        inTextSet.add(key);
      }
    }

    for (const tile of this._tiles) {
      if (!tile.inText) continue;
      tile.isEdge = false;
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
    const {
      erosionRadius,
      driftForce,
      gravity,
      easeSpeed,
      rotation,
      shockForce,
      shockSpeed,
      tileSize: ts,
      tileShape: shape,
      gap: targetGap,
    } = this._params;

    // Animate gap: fast open on hover, ease-out close over 2s when idle
    if (hovered) {
      this._gapClosing = false;
      this._animatedGap += (targetGap - this._animatedGap) * 0.08;
    } else if (this._animatedGap > 0.01) {
      if (!this._gapClosing) {
        this._gapClosing = true;
        this._gapCloseStart = performance.now();
        this._gapCloseFrom = this._animatedGap;
      }
      const t = Math.min((performance.now() - this._gapCloseStart) / 2000, 1);
      const eased = 1 - (1 - t) * (1 - t) * (1 - t); // ease-out cubic
      this._animatedGap = this._gapCloseFrom * (1 - eased);
      if (t >= 1) {
        this._animatedGap = 0;
        this._gapClosing = false;
      }
    } else {
      this._animatedGap = 0;
    }

    // Scale factor: tiles expand symmetrically from container center
    const gapScale = ts > 0 ? (ts + this._animatedGap) / ts : 1;
    const centerX = w / 2;
    const centerY = h / 2;

    // Update shockwaves
    const now = performance.now();
    const shockMaxRadius = shockSpeed * 1.6;
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i];
      if (((now - sw.startTime) / 1000) * shockSpeed > shockMaxRadius) {
        this._shockwaves.splice(i, 1);
      }
    }

    // Update tiles
    const ctx = this._ctx;
    const halfTs = ts / 2;
    ctx.clearRect(0, 0, w, h);

    for (const tile of this._tiles) {
      // Scale gap=0 position outward from center
      const renderCx = centerX + (tile.cx - centerX) * gapScale;
      const renderCy = centerY + (tile.cy - centerY) * gapScale;

      if (this._revealed) {
        tile.targetOpacity = 0;
        tile.targetScale = 0;
        tile.targetX = 0;
        tile.targetY = 0;
        tile.targetRotation = 0;

        if (hovered && tile.opacity > 0.05) {
          const dx = renderCx - mx;
          const dy = renderCy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < erosionRadius && dist > 0) {
            const falloff = 1 - dist / erosionRadius;
            const f = driftForce * falloff * falloff * tile.strengthMult;
            const angle = Math.atan2(dy, dx) + tile.jitterAngle;
            tile.targetX = Math.cos(angle) * f;
            tile.targetY = Math.sin(angle) * f;
          }
        }
      } else if (hovered) {
        const dx = renderCx - mx;
        const dy = renderCy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < erosionRadius) {
          if (tile.isEdge) {
            const falloff = 1 - dist / erosionRadius;
            tile.targetOpacity = (1 - falloff) * 0.9;
            tile.targetScale = 0.5 + (1 - falloff) * 0.5;

            const angle = Math.atan2(dy, dx) + tile.jitterAngle;
            const f = driftForce * falloff * tile.strengthMult;
            tile.targetX = Math.cos(angle) * f;
            tile.targetY = Math.sin(angle) * f + gravity * driftForce;
            tile.targetRotation = f * rotation * tile.jitterAngle;
          } else {
            const falloff = 1 - dist / erosionRadius;
            tile.targetOpacity = 1 - falloff;
            tile.targetScale = 1 - falloff * 0.5;
            tile.targetX = 0;
            tile.targetY = 0;
            tile.targetRotation = 0;
          }
        } else {
          tile.targetOpacity = 1;
          tile.targetScale = 1;
          tile.targetX = 0;
          tile.targetY = 0;
          tile.targetRotation = 0;
        }
      } else {
        tile.targetOpacity = 1;
        tile.targetScale = 1;
        tile.targetX = 0;
        tile.targetY = 0;
        tile.targetRotation = 0;
      }

      // Apply shockwaves
      for (const sw of this._shockwaves) {
        const age = (now - sw.startTime) / 1000;
        const ringRadius = age * shockSpeed;
        const life = 1 - ringRadius / shockMaxRadius;
        if (life <= 0) continue;

        const dx = renderCx - sw.x;
        const dy = renderCy - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ringDist = Math.abs(dist - ringRadius);
        if (ringDist < 50 && dist > 0) {
          const proximity = 1 - ringDist / 50;
          const f = shockForce * proximity * life * tile.strengthMult;
          tile.targetX += (dx / dist) * f;
          tile.targetY += (dy / dist) * f;
        }
      }

      // Ease
      tile.offsetX += (tile.targetX - tile.offsetX) * easeSpeed;
      tile.offsetY += (tile.targetY - tile.offsetY) * easeSpeed;
      tile.rotation += (tile.targetRotation - tile.rotation) * easeSpeed;
      tile.scale += (tile.targetScale - tile.scale) * easeSpeed;
      tile.opacity += (tile.targetOpacity - tile.opacity) * easeSpeed;

      if (tile.opacity < 0.01) continue;

      // Draw tile at render position
      ctx.save();
      ctx.globalAlpha = tile.opacity;
      ctx.translate(renderCx + tile.offsetX, renderCy + tile.offsetY);
      ctx.rotate(tile.rotation);
      ctx.scale(tile.scale, tile.scale);

      if (shape === "hex") {
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
      } else if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, halfTs * 0.88, 0, TWO_PI);
        ctx.clip();
      }
      // square: no clip needed

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
    clearTimeout(this._rebuildTimer);
    this._tiles = [];
    this._shockwaves = [];
    this._img = null;
    this._ctx = null;
    this._wrapper?.remove();
    super.dispose();
  }
}
