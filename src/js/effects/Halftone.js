/**
 * Halftone - Dot-pattern halftone effect.
 *
 * Image is rendered as a pattern of dots sized by luminance.
 * On hover, dots shrink and the full photograph is revealed.
 */

import { ShaderMaterial, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import fragmentShader from "../shaders/halftone.frag.glsl?raw";

export class Halftone extends ImageEffect {
  setupMaterial() {
    const { clientWidth: w, clientHeight: h } = this.container;

    this.material = new ShaderMaterial({
      uniforms: {
        uTexture: { value: this.texture },
        uHover: { value: 0.0 },
        uResolution: { value: new Vector2(w || 400, h || 300) },
        uKeystrokeIntensity: { value: 0.0 },
      },
      vertexShader,
      fragmentShader,
    });
  }

  update(delta, elapsed) {
    this._decayKeystroke();
    const u = this.material.uniforms;
    u.uHover.value = this.hoverProgress;

    const { clientWidth: w, clientHeight: h } = this.container;
    if (w > 0 && h > 0) {
      u.uResolution.value.set(w, h);
    }
  }
}
