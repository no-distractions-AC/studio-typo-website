/**
 * ASCII Art Animations - Export all effects
 */

// Base class
import { AsciiArt } from "./AsciiArt.js";

// Effects
import { MatrixReveal } from "./MatrixReveal.js";
import { TypewriterArt } from "./TypewriterArt.js";
import { GlitchScramble } from "./GlitchScramble.js";
import { ParticleReform } from "./ParticleReform.js";
import { CustomMatrixReveal } from "./CustomMatrixReveal.js";

// Re-export all classes
export {
  AsciiArt,
  MatrixReveal,
  CustomMatrixReveal,
  TypewriterArt,
  GlitchScramble,
  ParticleReform,
};

// Effect map for easy instantiation
export const EFFECTS = {
  matrix: MatrixReveal,
  textmatrix: CustomMatrixReveal,
  typewriter: TypewriterArt,
  glitch: GlitchScramble,
  particle: ParticleReform,
};

/**
 * Initialize ASCII art on an element
 * @param {HTMLElement} container - Container element
 * @param {string} asciiString - ASCII art string
 * @param {string} effectType - Effect type name
 * @param {Object} options - Optional parameters
 * @param {Array} options.colors - 2D array of {r,g,b} color objects for each character
 */
export function initAsciiArt(
  container,
  asciiString,
  effectType = "glitch",
  options = {},
) {
  const EffectClass = EFFECTS[effectType];
  if (!EffectClass) {
    console.warn(`Unknown ASCII effect: ${effectType}`);
    return null;
  }
  return new EffectClass(container, asciiString, options);
}
