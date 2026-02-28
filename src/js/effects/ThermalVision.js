/**
 * ThermalVision - Heat-map color palette effect.
 *
 * Image luminance is mapped through a thermal gradient
 * (blue -> magenta -> red -> yellow -> white). Cursor creates
 * a hotspot. Hover blends between original and thermal.
 */

import { ShaderMaterial, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import fragmentShader from "../shaders/thermal.frag.glsl?raw";

export class ThermalVision extends ImageEffect {
  setupMaterial() {
    this.material = new ShaderMaterial({
      uniforms: {
        uTexture: { value: this.texture },
        uHover: { value: 0.0 },
        uMouse: { value: new Vector2(0.5, 0.5) },
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
  }
}
