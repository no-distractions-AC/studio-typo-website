/**
 * FluidDistortion - Always-alive noise distortion with RGB split.
 *
 * Multi-octave simplex noise continuously warps UV coordinates
 * (subtle breathing when idle, amplified on hover). Chromatic
 * aberration is layered on during hover.
 */

import { ShaderMaterial } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import noiseGlsl from "../shaders/noise.glsl?raw";
import fluidFrag from "../shaders/fluid.frag.glsl?raw";

export class FluidDistortion extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    // This effect is always animating (breathing)
    this.alwaysAnimate = true;
  }

  setupMaterial() {
    this.material = new ShaderMaterial({
      uniforms: {
        uTexture: { value: this.texture },
        uHover: { value: 0.0 },
        uTime: { value: 0.0 },
        uKeystrokeIntensity: { value: 0.0 },
      },
      vertexShader,
      fragmentShader: noiseGlsl + "\n" + fluidFrag,
    });
  }

  update(delta, elapsed) {
    this._decayKeystroke();
    const u = this.material.uniforms;
    u.uHover.value = this.hoverProgress;
    u.uTime.value = elapsed;
  }
}
