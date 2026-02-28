/**
 * DuotoneGrain - Lightweight CSS/Canvas effect.
 *
 * Image starts with a grayscale + sepia duotone tint and a canvas grain overlay.
 * On hover, the tint fades to reveal the full-color image, and grain fades out.
 */

import { ImageEffect } from "./ImageEffect.js";

export class DuotoneGrain extends ImageEffect {
  constructor(container, imageSrc, options = {}) {
    super(container, imageSrc, options);
    this.usesWebGL = false;

    this._wrapper = null;
    this._img = null;
    this._grainCanvas = null;
    this._grainCtx = null;
    this._grainAnimId = null;
  }

  async init() {
    this._buildDOM();
    this._setupGrain();
    this._setupEvents();
    this._startLoop();
  }

  _buildDOM() {
    this._wrapper = document.createElement("div");
    this._wrapper.className = "duotone-effect";
    this._wrapper.style.cssText =
      "position:relative;width:100%;height:100%;overflow:hidden;";

    this._img = document.createElement("img");
    this._img.src = this.imageSrc;
    this._img.alt = "";
    this._img.style.cssText =
      "width:100%;height:100%;object-fit:cover;display:block;" +
      "filter:grayscale(1) sepia(0.3) brightness(0.9) contrast(1.1);" +
      "transition:filter 0.6s cubic-bezier(0.4, 0, 0.2, 1);";

    this._grainCanvas = document.createElement("canvas");
    this._grainCanvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;" +
      "pointer-events:none;opacity:0.12;" +
      "transition:opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);" +
      "mix-blend-mode:overlay;";

    this._wrapper.appendChild(this._img);
    this._wrapper.appendChild(this._grainCanvas);
    this.container.appendChild(this._wrapper);
  }

  _setupGrain() {
    this._grainCanvas.width = 256;
    this._grainCanvas.height = 256;
    this._grainCtx = this._grainCanvas.getContext("2d");
    this._drawGrain();

    if (!this.reducedMotion) {
      this._startGrainAnimation();
    }
  }

  _drawGrain() {
    const ctx = this._grainCtx;
    const w = 256;
    const h = 256;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  _startGrainAnimation() {
    let lastDraw = 0;
    const animateGrain = (time) => {
      if (this.isDisposed) return;
      this._grainAnimId = requestAnimationFrame(animateGrain);

      // Redraw grain every ~80ms for subtle animation
      if (time - lastDraw > 80) {
        this._drawGrain();
        lastDraw = time;
      }
    };
    this._grainAnimId = requestAnimationFrame(animateGrain);
  }

  onHover() {
    this._img.style.filter = "grayscale(0) sepia(0) brightness(1) contrast(1)";
    this._grainCanvas.style.opacity = "0.03";
  }

  onLeave() {
    this._img.style.filter =
      "grayscale(1) sepia(0.3) brightness(0.9) contrast(1.1)";
    this._grainCanvas.style.opacity = "0.12";
  }

  triggerShockwave() {
    if (!this._img) return;
    this._img.style.filter =
      "grayscale(0.5) sepia(0.1) brightness(1.3) contrast(1.2)";
    this._grainCanvas.style.opacity = "0.25";
    // CSS transition handles fade back
    setTimeout(() => {
      if (this.isDisposed) return;
      if (this.isHovered) {
        this._img.style.filter =
          "grayscale(0) sepia(0) brightness(1) contrast(1)";
        this._grainCanvas.style.opacity = "0.03";
      } else {
        this._img.style.filter =
          "grayscale(1) sepia(0.3) brightness(0.9) contrast(1.1)";
        this._grainCanvas.style.opacity = "0.12";
      }
    }, 150);
  }

  dispose() {
    if (this._grainAnimId) cancelAnimationFrame(this._grainAnimId);
    this._wrapper?.remove();
    super.dispose();
  }
}
