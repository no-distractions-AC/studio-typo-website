/**
 * ASCII Density Mapping
 * Maps brightness values (0-255) to ASCII characters
 */

// Dense to sparse character ramp - perceptually ordered by visual density
const DENSITY_RAMP =
  " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

// Simplified ramp for faster rendering
const SIMPLE_RAMP = " .:-=+*#%@";

// Block characters for denser look
const BLOCK_RAMP = " ░▒▓█";

// Extended ramp with better perceptual ordering for photo conversion
const PHOTO_RAMP =
  " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@";

/**
 * Map brightness (0-255) to ASCII character
 * @param {number} brightness - Value from 0 (dark) to 255 (light)
 * @param {string} ramp - Which character ramp to use (preset key or custom string)
 * @returns {string} ASCII character
 */
export function brightnessToChar(brightness, ramp = "simple") {
  // Check if ramp is a preset key, otherwise treat as custom character string
  let chars;
  if (ramp === "full") {
    chars = DENSITY_RAMP;
  } else if (ramp === "block") {
    chars = BLOCK_RAMP;
  } else if (ramp === "photo") {
    chars = PHOTO_RAMP;
  } else if (ramp === "simple") {
    chars = SIMPLE_RAMP;
  } else {
    // Custom ramp - use the string directly (should start with space for lightest)
    chars = ramp.length > 0 ? ramp : SIMPLE_RAMP;
  }

  // Invert so dark = dense, light = sparse
  const inverted = 255 - brightness;
  const index = Math.floor((inverted / 255) * (chars.length - 1));
  return chars[Math.min(index, chars.length - 1)];
}

/**
 * Map character back to approximate brightness
 * @param {string} char - ASCII character
 * @param {string} ramp - Which character ramp to use
 * @returns {number} Brightness value 0-255
 */
export function charToBrightness(char, ramp = "simple") {
  const chars =
    ramp === "full"
      ? DENSITY_RAMP
      : ramp === "block"
        ? BLOCK_RAMP
        : ramp === "photo"
          ? PHOTO_RAMP
          : SIMPLE_RAMP;

  const index = chars.indexOf(char);
  if (index === -1) return 128; // Default mid-gray

  const inverted = (index / (chars.length - 1)) * 255;
  return 255 - inverted;
}

/**
 * Get the character ramp array
 * @param {string} ramp - Which ramp to get
 * @returns {string} Character ramp string
 */
export function getRamp(ramp = "simple") {
  return ramp === "full"
    ? DENSITY_RAMP
    : ramp === "block"
      ? BLOCK_RAMP
      : ramp === "photo"
        ? PHOTO_RAMP
        : SIMPLE_RAMP;
}

export { DENSITY_RAMP, SIMPLE_RAMP, BLOCK_RAMP, PHOTO_RAMP };
