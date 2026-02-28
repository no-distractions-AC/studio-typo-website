/**
 * Displacement - Mouse-driven noise displacement effect.
 *
 * Simplex noise offsets UV coordinates near the cursor position.
 * The distortion strength is driven by hover progress.
 */

import { ShaderMaterial, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import noiseGlsl from "../shaders/noise.glsl?raw";
import displacementFrag from "../shaders/displacement.frag.glsl?raw";

export class Displacement extends ImageEffect {
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
      fragmentShader: noiseGlsl + "\n" + displacementFrag,
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
