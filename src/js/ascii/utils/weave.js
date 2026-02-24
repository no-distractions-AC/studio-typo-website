/**
 * Weave ASCII Generation
 * Generates ASCII art from an image using custom text as the character set,
 * cycling through the characters sequentially (weave mode).
 */

import { loadImage, sampleCanvasWithColor } from "./brightness.js";

/**
 * Generate ASCII art from an image using a name/text as the character set
 * @param {string} imageSrc - URL of the image
 * @param {number} cols - Number of columns
 * @param {string} nameText - Text to weave as characters (e.g. person's name)
 * @param {number} gamma - Gamma correction (default 1.8)
 * @returns {Promise<{ascii: string, colors: Array, rows: number, cols: number}>}
 */
export async function generateWeaveAscii(
  imageSrc,
  cols,
  nameText,
  gamma = 1.8,
) {
  const canvas = await loadImage(imageSrc);
  const aspectRatio = canvas.height / canvas.width;
  const rows = Math.round(cols * aspectRatio * 0.5);

  const { brightness, colors } = sampleCanvasWithColor(
    canvas,
    cols,
    rows,
    gamma,
  );

  return weaveFromBrightness(brightness, colors, rows, cols, nameText);
}

/**
 * Generate weave ASCII from pre-computed brightness/color grids
 * @param {number[][]} brightness - 2D brightness grid
 * @param {Array} colors - 2D color grid
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @param {string} nameText - Text to weave as characters
 * @returns {{ascii: string, colors: Array, rows: number, cols: number}}
 */
export function weaveFromBrightness(brightness, colors, rows, cols, nameText) {
  const chars = nameText.replace(/\s/g, "");

  let ascii = "";
  let charIndex = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const b = brightness[y][x];
      // Bright areas (background) become spaces to preserve silhouette
      if (b > 230) {
        ascii += " ";
      } else {
        ascii += chars[charIndex % chars.length];
        charIndex++;
      }
    }
    if (y < rows - 1) ascii += "\n";
  }

  return { ascii, colors, rows, cols };
}

/**
 * Generate a placeholder image canvas with gradient and initials
 * @param {string} name - Person's name
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {string} Data URL of the generated image
 */
export function generatePlaceholderImage(name, width = 400, height = 500) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Create a subtle gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(1) * 13) % 360;
  gradient.addColorStop(0, `hsl(${hue}, 15%, 25%)`);
  gradient.addColorStop(1, `hsl(${(hue + 40) % 360}, 20%, 15%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle noise-like pattern for texture
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.15;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Draw a silhouette-like shape (head + shoulders)
  ctx.fillStyle = `hsl(${hue}, 10%, 35%)`;

  // Head (circle)
  const headCenterX = width / 2;
  const headCenterY = height * 0.35;
  const headRadius = width * 0.18;
  ctx.beginPath();
  ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders (ellipse)
  ctx.beginPath();
  ctx.ellipse(
    width / 2,
    height * 0.72,
    width * 0.4,
    height * 0.25,
    0,
    Math.PI,
    0,
  );
  ctx.fill();

  // Neck
  ctx.fillRect(
    width * 0.4,
    headCenterY + headRadius - 5,
    width * 0.2,
    height * 0.12,
  );

  return canvas.toDataURL("image/png");
}

/**
 * Generate a high-contrast silhouette mask for ASCII brightness sampling
 * White background + dark silhouette = correct brightness thresholding
 * @param {string} name - Person's name (used for consistent geometry)
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {string} Data URL of the mask image
 */
export function generateSilhouetteMask(name, width = 400, height = 500) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Bright background → brightness > 230 → spaces
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, width, height);

  // Dark silhouette → brightness < 230 → name characters
  ctx.fillStyle = "#222222";

  // Same geometry as generatePlaceholderImage
  const headCenterX = width / 2;
  const headCenterY = height * 0.35;
  const headRadius = width * 0.18;
  ctx.beginPath();
  ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(
    width / 2,
    height * 0.72,
    width * 0.4,
    height * 0.25,
    0,
    Math.PI,
    0,
  );
  ctx.fill();

  ctx.fillRect(
    width * 0.4,
    headCenterY + headRadius - 5,
    width * 0.2,
    height * 0.12,
  );

  return canvas.toDataURL("image/png");
}
