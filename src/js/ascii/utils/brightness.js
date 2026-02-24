/**
 * Brightness Sampling Utilities
 * Extract brightness grids from images, video, and canvas
 */

/**
 * Load an image and return a canvas with it drawn
 * @param {string} src - Image URL
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Sample brightness from a canvas into a grid
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @param {boolean} enhanceContrast - Whether to apply histogram stretching
 * @returns {number[][]} 2D array of brightness values (0-255)
 */
export function sampleCanvas(canvas, cols, rows, enhanceContrast = true) {
  const ctx = canvas.getContext("2d");
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  // Get all image data at once (much faster than per-pixel getImageData)
  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = fullImageData.data;
  const imgWidth = canvas.width;

  const grid = [];
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      // Sample multiple points in each cell for better accuracy
      const startX = Math.floor(x * cellWidth);
      const startY = Math.floor(y * cellHeight);
      const endX = Math.floor((x + 1) * cellWidth);
      const endY = Math.floor((y + 1) * cellHeight);

      let totalBrightness = 0;
      let sampleCount = 0;

      // Sample a 3x3 grid within each cell for accuracy
      const stepX = Math.max(1, Math.floor((endX - startX) / 3));
      const stepY = Math.max(1, Math.floor((endY - startY) / 3));

      for (let sy = startY; sy < endY; sy += stepY) {
        for (let sx = startX; sx < endX; sx += stepX) {
          const px = Math.min(sx, canvas.width - 1);
          const py = Math.min(sy, canvas.height - 1);
          const idx = (py * imgWidth + px) * 4;

          // Luminance formula
          totalBrightness +=
            0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          sampleCount++;
        }
      }

      const brightness = Math.round(totalBrightness / sampleCount);
      row.push(brightness);

      // Track min/max for contrast enhancement
      if (brightness < minBrightness) minBrightness = brightness;
      if (brightness > maxBrightness) maxBrightness = brightness;
    }
    grid.push(row);
  }

  // Apply contrast enhancement (histogram stretching)
  if (enhanceContrast && maxBrightness > minBrightness) {
    const range = maxBrightness - minBrightness;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        grid[y][x] = Math.round(((grid[y][x] - minBrightness) / range) * 255);
      }
    }
  }

  return grid;
}

/**
 * Sample both brightness and color from a canvas into grids
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @param {number} gamma - Gamma correction value (default 1.0 = no correction, 2.2 = standard)
 * @returns {{brightness: number[][], colors: {r: number, g: number, b: number}[][]}} Brightness and color grids
 */
export function sampleCanvasWithColor(canvas, cols, rows, gamma = 1.0) {
  const ctx = canvas.getContext("2d");
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = fullImageData.data;
  const imgWidth = canvas.width;

  const brightnessGrid = [];
  const colorGrid = [];
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let y = 0; y < rows; y++) {
    const brightnessRow = [];
    const colorRow = [];

    for (let x = 0; x < cols; x++) {
      const startX = Math.floor(x * cellWidth);
      const startY = Math.floor(y * cellHeight);
      const endX = Math.floor((x + 1) * cellWidth);
      const endY = Math.floor((y + 1) * cellHeight);

      let totalR = 0,
        totalG = 0,
        totalB = 0;
      let totalBrightness = 0;
      let sampleCount = 0;

      const stepX = Math.max(1, Math.floor((endX - startX) / 3));
      const stepY = Math.max(1, Math.floor((endY - startY) / 3));

      for (let sy = startY; sy < endY; sy += stepY) {
        for (let sx = startX; sx < endX; sx += stepX) {
          const px = Math.min(sx, canvas.width - 1);
          const py = Math.min(sy, canvas.height - 1);
          const idx = (py * imgWidth + px) * 4;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // Transparent pixels contribute as white (will become spaces)
          if (a < 128) {
            totalR += 255;
            totalG += 255;
            totalB += 255;
            totalBrightness += 255;
          } else {
            totalR += r;
            totalG += g;
            totalB += b;
            totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
          }
          sampleCount++;
        }
      }

      let brightness = totalBrightness / sampleCount;

      // Apply gamma correction for better mid-tone preservation
      if (gamma !== 1.0) {
        brightness = Math.pow(brightness / 255, 1 / gamma) * 255;
      }

      brightness = Math.round(brightness);
      brightnessRow.push(brightness);

      colorRow.push({
        r: Math.round(totalR / sampleCount),
        g: Math.round(totalG / sampleCount),
        b: Math.round(totalB / sampleCount),
      });

      if (brightness < minBrightness) minBrightness = brightness;
      if (brightness > maxBrightness) maxBrightness = brightness;
    }
    brightnessGrid.push(brightnessRow);
    colorGrid.push(colorRow);
  }

  // Apply contrast enhancement
  if (maxBrightness > minBrightness) {
    const range = maxBrightness - minBrightness;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        brightnessGrid[y][x] = Math.round(
          ((brightnessGrid[y][x] - minBrightness) / range) * 255,
        );
      }
    }
  }

  return { brightness: brightnessGrid, colors: colorGrid };
}

/**
 * Sample brightness from a video element
 * @param {HTMLVideoElement} video - Video element
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @param {HTMLCanvasElement} [scratchCanvas] - Reusable canvas for performance
 * @returns {number[][]} 2D array of brightness values (0-255)
 */
export function sampleVideo(video, cols, rows, scratchCanvas = null) {
  const canvas = scratchCanvas || document.createElement("canvas");
  canvas.width = video.videoWidth || video.width;
  canvas.height = video.videoHeight || video.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return sampleCanvas(canvas, cols, rows);
}

/**
 * Sample brightness from an image URL
 * @param {string} src - Image URL
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @returns {Promise<number[][]>} 2D array of brightness values
 */
export async function sampleImage(src, cols, rows) {
  const canvas = await loadImage(src);
  return sampleCanvas(canvas, cols, rows);
}

/**
 * Get average brightness of a region
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} x - Start X
 * @param {number} y - Start Y
 * @param {number} width - Region width
 * @param {number} height - Region height
 * @returns {number} Average brightness 0-255
 */
export function getRegionBrightness(canvas, x, y, width, height) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(x, y, width, height).data;

  let total = 0;
  const pixelCount = width * height;

  for (let i = 0; i < imageData.length; i += 4) {
    total +=
      0.299 * imageData[i] +
      0.587 * imageData[i + 1] +
      0.114 * imageData[i + 2];
  }

  return Math.round(total / pixelCount);
}

/**
 * Create a brightness grid from raw image data
 * @param {ImageData} imageData - Raw image data
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @returns {number[][]} 2D array of brightness values
 */
export function imageDataToGrid(imageData, cols, rows) {
  const { width, height, data } = imageData;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  const grid = [];

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const px = Math.floor(x * cellWidth + cellWidth / 2);
      const py = Math.floor(y * cellHeight + cellHeight / 2);
      const idx = (py * width + px) * 4;

      const brightness =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      row.push(Math.round(brightness));
    }
    grid.push(row);
  }

  return grid;
}
