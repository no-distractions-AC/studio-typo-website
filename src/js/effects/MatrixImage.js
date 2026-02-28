/**
 * MatrixImage - Matrix rain that builds the image in ASCII.
 *
 * Green characters rain down column by column. When a raindrop reaches
 * a row, it deposits the correct ASCII character colored by the image.
 * Over time the image resolves. Hover speeds up rain near cursor.
 * Keystroke corrupts settled characters which then re-settle.
 */

import { ImageEffect } from "./ImageEffect.js";
import { loadImage, sampleCanvasWithColor } from "../ascii/utils/brightness.js";
import { brightnessToChar } from "../ascii/utils/ascii-density.js";
import { getPixelRatio } from "../utils/device.js";

const TARGET_COLS = 55;
const RAIN_COLOR = "#00cc66";
const RAIN_BRIGHT = "#66ffaa";
const TRAIL_LENGTH = 5;
const BASE_SPEED = 0.08;
const HOVER_SPEED_BOOST = 3;
const RANDOM_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class MatrixImage extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.usesWebGL = false;
    this.alwaysAnimate = true;

    this._canvas = null;
    this._ctx = null;
    this._charGrid = null;
    this._colorGrid = null;
    this._cols = 0;
    this._rows = 0;
    this._cellW = 0;
    this._cellH = 0;
    this._dpr = getPixelRatio(2);
    this._columns = [];
    this._corrupted = false;
  }

  async init() {
    const imgCanvas = await loadImage(this.imageSrc);
    this._createRenderCanvas();
    this._sampleImage(imgCanvas);
    this._initRain();
    this._setupEvents();
    this._startLoop();
  }

  _createRenderCanvas() {
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "width:100%;height:100%;display:block;";
    this.container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d");

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this._canvas.width = w * this._dpr;
    this._canvas.height = h * this._dpr;
  }

  _sampleImage(imgCanvas) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    this._ctx.font = `bold 10px "Space Mono", monospace`;
    const charAspect = this._ctx.measureText("M").width / 10;

    this._cols = TARGET_COLS;
    this._cellW = w / this._cols;
    this._cellH = this._cellW / charAspect;
    this._rows = Math.ceil(h / this._cellH);

    const { brightness, colors } = sampleCanvasWithColor(
      imgCanvas,
      this._cols,
      this._rows,
      1.8,
    );

    this._charGrid = brightness.map((row) =>
      row.map((b) => brightnessToChar(b, "photo")),
    );
    this._colorGrid = colors;
  }

  _initRain() {
    this._columns = [];
    for (let col = 0; col < this._cols; col++) {
      this._columns.push({
        y: -Math.random() * this._rows * 2, // staggered start
        speed: BASE_SPEED + Math.random() * 0.04,
        settled: new Array(this._rows).fill(false),
        currentChars: new Array(this._rows).fill(""),
      });

      // Initialize with random chars
      for (let row = 0; row < this._rows; row++) {
        this._columns[col].currentChars[row] = this._randomChar();
      }
    }
  }

  _randomChar() {
    return RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }

  update() {
    if (!this._ctx || !this._charGrid) return;

    const ctx = this._ctx;
    const dpr = this._dpr;
    const fontSize = this._cellW * dpr;

    // Dark background with slight fade (creates trail effect)
    ctx.fillStyle = "rgba(15, 17, 20, 0.15)";
    ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    ctx.font = `bold ${fontSize.toFixed(1)}px "Space Mono", monospace`;
    ctx.textBaseline = "top";

    const mx = this.mousePx.x;

    for (let col = 0; col < this._cols; col++) {
      const column = this._columns[col];

      // Speed boost near cursor
      let speed = column.speed;
      if (this.isHovered) {
        const colCenterX = (col + 0.5) * this._cellW;
        const dist = Math.abs(colCenterX - mx);
        if (dist < 100) {
          speed *= 1 + HOVER_SPEED_BOOST * (1 - dist / 100);
        }
      }

      column.y += speed;

      const headRow = Math.floor(column.y);

      // Settle the character when raindrop passes
      if (headRow >= 0 && headRow < this._rows && !column.settled[headRow]) {
        column.settled[headRow] = true;
        if (
          headRow < this._charGrid.length &&
          col < this._charGrid[headRow].length
        ) {
          column.currentChars[headRow] = this._charGrid[headRow][col];
        }
      }

      // Reset when past bottom
      if (headRow > this._rows + TRAIL_LENGTH) {
        column.y = -TRAIL_LENGTH - Math.random() * this._rows * 0.5;
        column.speed = BASE_SPEED + Math.random() * 0.04;
      }

      // Draw all characters in this column
      for (let row = 0; row < this._rows; row++) {
        if (row >= this._charGrid.length) break;

        const x = col * this._cellW * dpr;
        const y = row * this._cellH * dpr;
        const char = column.currentChars[row];
        if (!char || char === " ") continue;

        if (column.settled[row]) {
          // Settled: use image color
          const color = this._colorGrid[row][col];
          ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
          ctx.fillText(char, x, y);
        } else {
          // Trail: green with distance-based opacity
          const distFromHead = headRow - row;
          if (distFromHead >= 0 && distFromHead <= TRAIL_LENGTH) {
            const alpha = 1 - distFromHead / TRAIL_LENGTH;
            if (distFromHead === 0) {
              ctx.fillStyle = RAIN_BRIGHT;
            } else {
              ctx.fillStyle = RAIN_COLOR;
              ctx.globalAlpha = alpha * 0.7;
            }
            // Show random char in trail
            if (Math.random() < 0.3) {
              column.currentChars[row] = this._randomChar();
            }
            ctx.fillText(column.currentChars[row], x, y);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }

  triggerShockwave() {
    // Corrupt all settled characters
    for (const column of this._columns) {
      for (let row = 0; row < this._rows; row++) {
        if (column.settled[row]) {
          column.settled[row] = false;
          column.currentChars[row] = this._randomChar();
        }
      }
      // Reset rain to re-settle
      column.y = -Math.random() * this._rows;
    }
  }

  dispose() {
    this._canvas?.remove();
    super.dispose();
  }
}
