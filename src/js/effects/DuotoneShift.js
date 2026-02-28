/**
 * DuotoneShift - Two-color palette mapping.
 *
 * Image luminance is mapped to a duotone palette.
 * Cursor X blends between two palette pairs (purple/gold and teal/coral).
 * Keystroke briefly flashes to monochrome.
 */

import { ShaderMaterial, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import fragmentShader from "../shaders/duotoneshift.frag.glsl?raw";

export class DuotoneShift extends ImageEffect {
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
