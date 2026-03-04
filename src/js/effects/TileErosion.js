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
import { noise2D } from "../ascii/noise.js";

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
      tileShape: "square",
      tileSize: 14,
      gap: 0,
      erosionRadius: 160,
      driftForce: 20,
      gravity: 0.3,
      easeSpeed: 0.15,
      rotation: 0.04,
      shockForce: 20,
      shockSpeed: 250,
      noiseAmp: 0,
      noiseScale: 0.02,
      noiseSpeed: 0.35,
      renderMode: "image",
      showText: true,
      maskMode: "text",
      edgeMode: "text",
      baseOpacity: 1,
      overlayColor: null,
    };

    this._displayText = options.displayText || "TYPO";
    this._wrapper = null;
    this._textEl = null;
    this._canvas = null;
    this._ctx = null;
    this._img = null;
    this._imgEl = null;
    this._tiles = [];
    this._gridW = 0;
    this._gridH = 0;
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

    // Programmatic erosion level (null = use mouse, 0-1 = scroll-driven)
    this._erosionLevel = null;

    // Canvas bleed margin for tiles escaping the container
    this._bleed = 0;

    this._overlayColor = null;
    this._resolveOverlayColor();
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
    if (key === "overlayColor") {
      this._overlayColor = value;
    }
    this._needsRender = true;
  }

  _buildDOM() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this._wrapper = document.createElement("div");
    this._wrapper.style.cssText =
      "width:100%;height:100%;position:relative;background:var(--bg-primary, #0f1114);";

    this._imgEl = this._img;
    this._imgEl.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;";
    this._wrapper.appendChild(this._imgEl);

    if (this._params.showText && this._displayText.trim().length > 0) {
      const isDark = this.options.theme !== "light";
      const textColor = isDark ? "#f5f6f7" : "#0d0f12";
      // Text span ABOVE image (z-index:1)
      const lines = this._displayText.split("\n");
      const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
      const fontSize = Math.min(
        w * (0.72 / (longest.length * 0.6)),
        (h * 0.64) / lines.length,
      );
      this._textEl = document.createElement("span");
      this._textEl.style.cssText =
        `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;` +
        `font-family:"Space Mono",monospace;font-weight:700;` +
        `font-size:${fontSize.toFixed(0)}px;line-height:1.15;` +
        `color:${textColor};z-index:1;pointer-events:none;`;
      for (const line of lines) {
        const span = document.createElement("span");
        span.textContent = line;
        this._textEl.appendChild(span);
      }
      this._wrapper.appendChild(this._textEl);
    }

    // Canvas for hex tiles ON TOP (z-index:2) — oversized for tile overflow
    const bleed = Math.max(w, h) * 0.25;
    this._bleed = bleed;
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      `position:absolute;left:${-bleed}px;top:${-bleed}px;` +
      `width:${w + bleed * 2}px;height:${h + bleed * 2}px;` +
      `display:block;z-index:2;pointer-events:none;`;
    this._canvas.width = (w + bleed * 2) * this._dpr;
    this._canvas.height = (h + bleed * 2) * this._dpr;
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
    this._gridW = w;
    this._gridH = h;

    let maskData = null;
    const useTextMask =
      this._params.maskMode === "text" &&
      this._params.showText &&
      this._displayText.trim().length > 0;
    if (useTextMask) {
      // Build text mask (for edge detection)
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const mctx = offscreen.getContext("2d");

      const lines = this._displayText.split("\n");
      const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
      const fontSize = Math.min(
        w * (0.72 / (longest.length * 0.6)),
        (h * 0.64) / lines.length,
      );
      mctx.font = `700 ${fontSize}px "Space Mono", monospace`;
      mctx.textAlign = "center";
      mctx.textBaseline = "middle";
      mctx.fillStyle = "#fff";
      const lineHeight = fontSize * 1.15;
      const totalHeight = lineHeight * lines.length;
      const startY = h / 2 - totalHeight / 2 + lineHeight / 2;
      for (let i = 0; i < lines.length; i++) {
        mctx.fillText(lines[i], w / 2, startY + i * lineHeight);
      }

      maskData = mctx.getImageData(0, 0, w, h).data;
    }

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
        const inText = maskData ? maskData[(py * w + px) * 4 + 3] > 128 : true;

        const srcX =
          this._params.renderMode === "image"
            ? ((cx - this._cropX) / this._drawW) * this._img.width
            : 0;
        const srcY =
          this._params.renderMode === "image"
            ? ((cy - this._cropY) / this._drawH) * this._img.height
            : 0;
        const srcW =
          this._params.renderMode === "image"
            ? (ts / this._drawW) * this._img.width
            : 0;
        const srcH =
          this._params.renderMode === "image"
            ? (ts / this._drawH) * this._img.height
            : 0;

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

    if (this._params.edgeMode === "all") {
      for (const tile of this._tiles) {
        tile.isEdge = true;
      }
      return;
    }

    if (this._params.edgeMode === "perimeter") {
      const w = this._gridW;
      const h = this._gridH;
      for (const tile of this._tiles) {
        tile.isEdge =
          tile.cx < ts || tile.cx > w - ts || tile.cy < ts || tile.cy > h - ts;
      }
      return;
    }

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
      noiseAmp,
      noiseScale,
      noiseSpeed,
      renderMode,
      baseOpacity,
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
      // ease-in-out cubic: smooth acceleration + deceleration
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this._animatedGap = this._gapCloseFrom * (1 - eased);
      if (t >= 1) {
        this._animatedGap = 0;
        this._gapClosing = false;
      }
    } else {
      this._animatedGap = 0;
    }

    // Base gap scale (hover-driven only; scroll gap is per-tile for organic breakup)
    const baseGapScale = ts > 0 ? (ts + this._animatedGap) / ts : 1;
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
    const bleed = this._bleed;
    ctx.clearRect(0, 0, w + bleed * 2, h + bleed * 2);

    for (const tile of this._tiles) {
      // Uniform gap expansion during scroll erosion (per-tile variation comes from edge drift only)
      const tileExpand =
        this._erosionLevel !== null ? this._erosionLevel * 0.12 : 0;
      const tileGapScale = baseGapScale + tileExpand;
      const renderCx = centerX + (tile.cx - centerX) * tileGapScale;
      const renderCy = centerY + (tile.cy - centerY) * tileGapScale;

      // Programmatic scroll-driven erosion with physics-like acceleration
      if (this._erosionLevel !== null) {
        const level = this._erosionLevel;
        const accel = level * level; // quadratic — barely moves near center, accelerates away

        if (tile.isEdge) {
          const angle = tile.jitterAngle;
          const f = driftForce * 1.0 * accel * tile.strengthMult;
          tile.targetX = Math.cos(angle) * f;
          tile.targetY =
            Math.sin(angle) * f + gravity * driftForce * 1.0 * accel;
          tile.targetRotation = f * rotation * 1.5 * tile.jitterAngle;
          tile.targetOpacity = Math.min(baseOpacity * (0.2 + accel), 1);
          tile.targetScale = 1 - accel * 0.2;
        } else {
          // Inner tiles stay put — only edge tiles break away
          tile.targetX = 0;
          tile.targetY = 0;
          tile.targetOpacity = Math.min(baseOpacity * 0.25, 1);
          tile.targetScale = 1;
          tile.targetRotation = 0;
        }

        if (noiseAmp > 0 && !this.reducedMotion) {
          const t = (now - this._startTime) * 0.001 * noiseSpeed;
          const nx = noise2D(
            tile.cx * noiseScale + t,
            tile.cy * noiseScale + t,
          );
          const ny = noise2D(
            tile.cx * noiseScale + t + 100,
            tile.cy * noiseScale + t + 100,
          );
          tile.targetX += nx * noiseAmp * accel;
          tile.targetY += ny * noiseAmp * accel;
        }
      } else if (this._revealed) {
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
            tile.targetOpacity = baseOpacity * (0.2 + (1 - falloff));
            tile.targetScale = 0.5 + (1 - falloff) * 0.5;

            const angle = Math.atan2(dy, dx) + tile.jitterAngle;
            const f = driftForce * falloff * tile.strengthMult;
            tile.targetX = Math.cos(angle) * f;
            tile.targetY = Math.sin(angle) * f + gravity * driftForce;
            tile.targetRotation = f * rotation * tile.jitterAngle;
          } else {
            const falloff = 1 - dist / erosionRadius;
            tile.targetOpacity = baseOpacity * (1 - falloff);
            tile.targetScale = 1 - falloff * 0.5;
            tile.targetX = 0;
            tile.targetY = 0;
            tile.targetRotation = 0;
          }
        } else {
          tile.targetOpacity = baseOpacity;
          tile.targetScale = 1;
          tile.targetX = 0;
          tile.targetY = 0;
          tile.targetRotation = 0;
        }
      } else {
        tile.targetOpacity = baseOpacity;
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

      // Draw tile at render position (offset by bleed for oversized canvas)
      ctx.save();
      ctx.globalAlpha = tile.opacity;
      ctx.translate(
        renderCx + tile.offsetX + bleed,
        renderCy + tile.offsetY + bleed,
      );
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

      if (renderMode === "image") {
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
      } else {
        ctx.fillStyle = this._overlayColor || "#ffffff";
        ctx.fillRect(-halfTs, -halfTs, ts, ts);
      }
      ctx.restore();
    }
  }

  /**
   * Set programmatic erosion level (0 = assembled, 1 = scattered).
   * When set (not null), overrides mouse-hover erosion logic.
   */
  setErosionLevel(level) {
    this._erosionLevel = level;
    this._needsRender = true;
  }

  setDisplayText(text) {
    this._displayText = text.toUpperCase();
    this._wrapper?.remove();
    this._buildDOM();
    this._buildTileGrid();
    this._tagEdgeTiles();
  }

  _resolveOverlayColor() {
    if (this._params.overlayColor) {
      this._overlayColor = this._params.overlayColor;
      return;
    }
    const isDark = this.options.theme !== "light";
    this._overlayColor = isDark ? "#ffffff" : "#000000";
  }

  onThemeChange(isDark) {
    if (this._params.overlayColor) {
      this._overlayColor = this._params.overlayColor;
    } else {
      this._overlayColor = isDark ? "#ffffff" : "#000000";
    }
    if (this._textEl) {
      this._textEl.style.color = isDark ? "#f5f6f7" : "#0d0f12";
    }
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
    const bleed = Math.max(w, h) * 0.25;
    this._bleed = bleed;
    this._canvas.style.left = `${-bleed}px`;
    this._canvas.style.top = `${-bleed}px`;
    this._canvas.style.width = `${w + bleed * 2}px`;
    this._canvas.style.height = `${h + bleed * 2}px`;
    this._canvas.width = (w + bleed * 2) * this._dpr;
    this._canvas.height = (h + bleed * 2) * this._dpr;
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
    this._imgEl = null;
    this._ctx = null;
    this._wrapper?.remove();
    super.dispose();
  }
}
