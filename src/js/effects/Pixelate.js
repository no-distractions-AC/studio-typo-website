/**
 * Pixelate - Hex-pixel pixelation-to-reveal effect.
 *
 * Image starts as large hexagonal mosaic blocks. On hover, block size
 * shrinks to reveal the full-detail photograph. Keyboard triggers
 * briefly re-pixelate the image.
 */

import { ShaderMaterial, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import fragmentShader from "../shaders/pixelate.frag.glsl?raw";

export class Pixelate extends ImageEffect {
  setupMaterial() {
    const { clientWidth: w, clientHeight: h } = this.container;

    this.material = new ShaderMaterial({
      uniforms: {
        uTexture: { value: this.texture },
        uHover: { value: 0.0 },
        uKeystrokeIntensity: { value: 0.0 },
        uResolution: { value: new Vector2(w || 400, h || 300) },
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
