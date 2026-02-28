/**
 * NoiseDissolve - Fractal erosion with ember-glow edges.
 *
 * Simplex noise-driven dissolution eats away the image from
 * the cursor outward. The erosion boundary glows like burning embers.
 */

import { ShaderMaterial, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import noiseGlsl from "../shaders/noise.glsl?raw";
import dissolveFrag from "../shaders/dissolve.frag.glsl?raw";

export class NoiseDissolve extends ImageEffect {
  setupMaterial() {
    this.material = new ShaderMaterial({
      uniforms: {
        uTexture: { value: this.texture },
        uHover: { value: 0.0 },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uTime: { value: 0.0 },
        uKeystrokeIntensity: { value: 0.0 },
      },
      vertexShader,
      fragmentShader: noiseGlsl + "\n" + dissolveFrag,
      transparent: true,
    });
  }

  update(delta, elapsed) {
    this._decayKeystroke();
    const u = this.material.uniforms;
    u.uHover.value = this.hoverProgress;
    u.uMouse.value.copy(this.mousePos);
    u.uTime.value = elapsed;
  }
}
