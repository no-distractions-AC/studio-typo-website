/**
 * RGBShift - Chromatic aberration effect.
 *
 * R, G, B channels are sampled at offset UVs radiating from the cursor.
 * The shift intensity is driven by hover progress.
 */

import { ShaderMaterial, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import fragmentShader from "../shaders/rgbshift.frag.glsl?raw";

export class RGBShift extends ImageEffect {
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
      fragmentShader,
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
