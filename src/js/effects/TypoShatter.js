/**
 * TypoShatter - Giant TYPO letters dissolve into hex tiles near cursor.
 *
 * Hybrid DOM + Canvas effect. Letters are filled with the image via
 * background-clip: text, arranged in quadrants (like MaskSplit).
 * Near the cursor, letters dissolve into hex tiles that repel away.
 * Click/keystroke triggers full reveal via expanding shockwave.
 */

import { ImageEffect } from "./ImageEffect.js";
import { getPixelRatio } from "../utils/device.js";

const SPRING = 0.12;
const DAMPING = 0.88;
const GAP = 15;
const DISSOLVE_RADIUS = 180;
const TILE_SIZE = 16;
const TILE_EASE = 0.18;
const REPEL_FORCE = 30;
const REPEL_RADIUS = 160;
const TWO_PI = Math.PI * 2;

const QUARTER_POSITIONS = [
  { inset: "0 50% 50% 0", dx: -1, dy: -1 },
  { inset: "0 0 50% 50%", dx: 1, dy: -1 },
  { inset: "50% 50% 0 0", dx: -1, dy: 1 },
  { inset: "50% 0 0 50%", dx: 1, dy: 1 },
];

export class TypoShatter extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._wrapper = null;
    this._letters = [];
    this._canvas = null;
    this._ctx = null;
    this._img = null;
    this._tiles = [];
    this._dpr = getPixelRatio(2);
    this._revealed = false;
    this._revealRadius = 0;
    this._revealCenter = { x: 0, y: 0 };
    this._shockwaves = [];
    this._displayText = "TYPO";

    // Cover crop
    this._cropX = 0;
    this._cropY = 0;
    this._drawW = 0;
    this._drawH = 0;
  }

  async init() {
    this._img = await this._loadImg(this.imageSrc);
    this._buildDOM();
    this._buildTileGrid();
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

    // Canvas layer (behind letters)
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;";
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
    this._ctx = this._canvas.getContext("2d");
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this._wrapper.appendChild(this._canvas);

    // Compute cover crop
    this._computeCover(w, h);

    // Letter spans (on top of canvas)
    const chars = this._displayText.split("").slice(0, 4);
    const fontSize = Math.min(w * (0.8 / Math.max(chars.length, 1)), h * 0.7);
    const letterContainer = document.createElement("div");
    letterContainer.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;" +
      "justify-content:center;z-index:1;pointer-events:none;";

    this._letters = chars.map((letter, i) => {
      const q = QUARTER_POSITIONS[i] || QUARTER_POSITIONS[0];
      const span = document.createElement("span");
      span.textContent = letter;
      span.style.cssText =
        `font-family:"Space Mono",monospace;font-weight:700;` +
        `font-size:${fontSize.toFixed(0)}px;line-height:1;` +
        `background-image:url(${this.imageSrc});` +
        `background-size:${w}px ${h}px;` +
        `background-position:center;` +
        `-webkit-background-clip:text;background-clip:text;` +
        `color:transparent;display:inline-block;` +
        `filter:grayscale(1);` +
        `transition:filter 0.4s ease;` +
        `-webkit-mask-image:radial-gradient(circle 0px at 50% 50%, transparent 0%, black 0%);` +
        `mask-image:radial-gradient(circle 0px at 50% 50%, transparent 0%, black 0%);`;

      letterContainer.appendChild(span);

      return {
        el: span,
        quarter: q,
        x: q.dx * GAP,
        y: q.dy * GAP,
        vx: 0,
        vy: 0,
      };
    });

    this._wrapper.appendChild(letterContainer);
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

  update() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const mx = this.mousePx.x;
    const my = this.mousePx.y;
    const hovered = this.isHovered;

    // --- Update letter positions (spring physics) ---
    const containerRect = this.container.getBoundingClientRect();

    for (const letter of this._letters) {
      const q = letter.quarter;
      const targetX = hovered ? 0 : q.dx * GAP;
      const targetY = hovered ? 0 : q.dy * GAP;

      letter.vx = (letter.vx + (targetX - letter.x) * SPRING) * DAMPING;
      letter.vy = (letter.vy + (targetY - letter.y) * SPRING) * DAMPING;
      letter.x += letter.vx;
      letter.y += letter.vy;

      letter.el.style.transform = `translate(${letter.x.toFixed(1)}px, ${letter.y.toFixed(1)}px)`;

      // Dissolve mask near cursor
      if (hovered && !this._revealed) {
        const rect = letter.el.getBoundingClientRect();
        const localMx = mx - (rect.left - containerRect.left);
        const localMy = my - (rect.top - containerRect.top);
        const maskX = (localMx / rect.width) * 100;
        const maskY = (localMy / rect.height) * 100;
        const maskStr = `radial-gradient(circle ${DISSOLVE_RADIUS}px at ${maskX.toFixed(1)}% ${maskY.toFixed(1)}%, transparent 60%, black 100%)`;
        letter.el.style.webkitMaskImage = maskStr;
        letter.el.style.maskImage = maskStr;
      } else if (this._revealed) {
        letter.el.style.webkitMaskImage =
          "radial-gradient(circle 9999px at 50% 50%, transparent 60%, black 100%)";
        letter.el.style.maskImage =
          "radial-gradient(circle 9999px at 50% 50%, transparent 60%, black 100%)";
      } else {
        letter.el.style.webkitMaskImage = "none";
        letter.el.style.maskImage = "none";
      }
    }

    // --- Update shockwaves ---
    const now = performance.now();
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i];
      const age = (now - sw.startTime) / 1000;
      const ringRadius = age * 250;
      if (ringRadius > 400) {
        this._shockwaves.splice(i, 1);
      }
    }

    // --- Update tiles ---
    const ctx = this._ctx;
    const ts = TILE_SIZE;
    const halfTs = ts / 2;

    ctx.clearRect(0, 0, w, h);

    for (const tile of this._tiles) {
      // Determine if tile should be visible
      let shouldShow = false;

      if (this._revealed) {
        shouldShow = true;
        tile.targetOpacity = 1;
        tile.targetScale = 1;
        tile.targetX = 0;
        tile.targetY = 0;
        tile.targetRotation = 0;

        // Repel from cursor in revealed mode
        if (hovered) {
          const dx = tile.cx - mx;
          const dy = tile.cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPEL_RADIUS && dist > 0) {
            const falloff = 1 - dist / REPEL_RADIUS;
            const f = REPEL_FORCE * falloff * falloff * tile.strengthMult;
            const angle = Math.atan2(dy, dx) + tile.jitterAngle;
            tile.targetX = Math.cos(angle) * f;
            tile.targetY = Math.sin(angle) * f;
          }
        }
      } else if (hovered) {
        const dx = tile.cx - mx;
        const dy = tile.cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < DISSOLVE_RADIUS) {
          shouldShow = true;
          const falloff = 1 - dist / DISSOLVE_RADIUS;
          tile.targetOpacity = falloff;
          tile.targetScale = 0.5 + falloff * 0.5;

          // Repel from cursor
          if (dist > 0) {
            const f = REPEL_FORCE * falloff * tile.strengthMult;
            const angle = Math.atan2(dy, dx) + tile.jitterAngle;
            tile.targetX = Math.cos(angle) * f;
            tile.targetY = Math.sin(angle) * f;
            tile.targetRotation = f * 0.03 * tile.jitterAngle;
          }
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

      // Apply shockwave forces
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

      // Ease toward targets
      tile.offsetX += (tile.targetX - tile.offsetX) * TILE_EASE;
      tile.offsetY += (tile.targetY - tile.offsetY) * TILE_EASE;
      tile.rotation += (tile.targetRotation - tile.rotation) * TILE_EASE;
      tile.scale += (tile.targetScale - tile.scale) * TILE_EASE;
      tile.opacity += (tile.targetOpacity - tile.opacity) * TILE_EASE;

      // Skip invisible tiles
      if (tile.opacity < 0.01) continue;

      // Draw hex tile
      ctx.save();
      ctx.globalAlpha = tile.opacity;
      ctx.translate(tile.cx + tile.offsetX, tile.cy + tile.offsetY);
      ctx.rotate(tile.rotation);
      ctx.scale(tile.scale, tile.scale);

      // Hex clip
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

  onHover() {
    for (const letter of this._letters) {
      letter.el.style.filter = "grayscale(0)";
    }
  }

  onLeave() {
    for (const letter of this._letters) {
      letter.el.style.filter = "grayscale(1)";
    }
  }

  setDisplayText(text) {
    this._displayText = text.toUpperCase();
    this._wrapper?.remove();
    this._letters = [];
    this._buildDOM();
    this._buildTileGrid();
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
