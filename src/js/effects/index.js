/**
 * Image Effects Registry
 *
 * 22 effects organized into 4 categories.
 * Factory function creates and initializes effect instances.
 */

import { VortexSpiral } from "./VortexSpiral.js";
import { NoiseDrift } from "./NoiseDrift.js";
import { GravityPull } from "./GravityPull.js";
import { RippleWave } from "./RippleWave.js";
import { PixelWind } from "./PixelWind.js";
import { TileRepel } from "./TileRepel.js";
import { BubbleMask } from "./BubbleMask.js";
import { FourCorners } from "./FourCorners.js";
import { RayBurst } from "./RayBurst.js";
import { MaskSplit } from "./MaskSplit.js";

import { AsciiPortrait } from "./AsciiPortrait.js";
import { TypeMask } from "./TypeMask.js";
import { CharWave } from "./CharWave.js";
import { MatrixImage } from "./MatrixImage.js";

import { TileType } from "./TileType.js";
import { TypoShatter } from "./TypoShatter.js";
import { QuadTile } from "./QuadTile.js";
import { TextErosion } from "./TextErosion.js";
import { ScatterType } from "./ScatterType.js";
import { TypeWipe } from "./TypeWipe.js";
import { GlyphGrid } from "./GlyphGrid.js";
import { TileErosion } from "./TileErosion.js";

export const CATEGORIES = [
  {
    key: "typo",
    label: "Typography",
    desc: "Character and letterform-based image effects",
  },
  {
    key: "tiles",
    label: "Tile Physics",
    desc: "Canvas tile displacement and spring physics",
  },
  {
    key: "mask",
    label: "Mask & Split",
    desc: "CSS clip-path and SVG masking effects",
  },
  {
    key: "fusion",
    label: "Fusion",
    desc: "Merged typography, tile physics, and masking effects",
  },
];

export const EFFECTS_MAP = {
  // Typography
  asciiPortrait: {
    class: AsciiPortrait,
    label: "ASCII Portrait",
    shape: "canvas",
    category: "typo",
  },
  typeMask: {
    class: TypeMask,
    label: "Type Mask",
    shape: "css",
    category: "typo",
  },
  charWave: {
    class: CharWave,
    label: "Char Wave",
    shape: "canvas",
    category: "typo",
  },
  matrixImage: {
    class: MatrixImage,
    label: "Matrix Rain",
    shape: "canvas",
    category: "typo",
  },

  // Tile Physics
  vortexSpiral: {
    class: VortexSpiral,
    label: "Vortex Spiral",
    shape: "hexagon",
    category: "tiles",
  },
  noiseDrift: {
    class: NoiseDrift,
    label: "Noise Drift",
    shape: "circle",
    category: "tiles",
  },
  tileRepel: {
    class: TileRepel,
    label: "Tile Repel",
    shape: "hexagon",
    category: "tiles",
  },
  gravityPull: {
    class: GravityPull,
    label: "Gravity Pull",
    shape: "circle",
    category: "tiles",
  },
  rippleWave: {
    class: RippleWave,
    label: "Ripple Wave",
    shape: "square",
    category: "tiles",
  },
  pixelWind: {
    class: PixelWind,
    label: "Pixel Wind",
    shape: "hexagon",
    category: "tiles",
  },

  // Mask & Split
  bubbleMask: {
    class: BubbleMask,
    label: "Bubble Mask",
    shape: "svg-mask",
    category: "mask",
  },
  fourCorners: {
    class: FourCorners,
    label: "Four Corners",
    shape: "clip-path",
    category: "mask",
  },
  rayBurst: {
    class: RayBurst,
    label: "Ray Burst",
    shape: "clip-path",
    category: "mask",
  },
  maskSplit: {
    class: MaskSplit,
    label: "Mask Split",
    shape: "clip-path",
    category: "mask",
  },

  // Fusion
  tileType: {
    class: TileType,
    label: "Tile Type",
    shape: "hexagon",
    category: "fusion",
    textAware: true,
  },
  typoShatter: {
    class: TypoShatter,
    label: "Typo Shatter",
    shape: "hex-pixel",
    category: "fusion",
    textAware: true,
  },
  quadTile: {
    class: QuadTile,
    label: "Quad Tile",
    shape: "circle",
    category: "fusion",
    textAware: true,
  },
  textErosion: {
    class: TextErosion,
    label: "Text Erosion",
    shape: "hex-pixel",
    category: "fusion",
    textAware: true,
  },
  scatterType: {
    class: ScatterType,
    label: "Scatter Type",
    shape: "hexagon",
    category: "fusion",
    textAware: true,
  },
  typeWipe: {
    class: TypeWipe,
    label: "Type Wipe",
    shape: "hybrid",
    category: "fusion",
    textAware: true,
  },
  glyphGrid: {
    class: GlyphGrid,
    label: "Glyph Grid",
    shape: "canvas",
    category: "fusion",
    textAware: true,
  },
  tileErosion: {
    class: TileErosion,
    label: "Tile Erosion",
    shape: "hex-pixel",
    category: "fusion",
    textAware: true,
    hasSliders: true,
  },
};

/**
 * Create and initialize an effect instance.
 * @param {string} key - Effect key from EFFECTS_MAP
 * @param {HTMLElement} container - DOM element to mount into
 * @param {string} imageSrc - Image URL
 * @param {Object} options - { theme, reducedMotion }
 * @returns {Promise<ImageEffect>}
 */
export async function createEffect(key, container, imageSrc, options = {}) {
  const entry = EFFECTS_MAP[key];
  if (!entry) throw new Error(`Unknown effect: ${key}`);

  const effect = new entry.class(container, imageSrc, options);
  await effect.init();
  return effect;
}
