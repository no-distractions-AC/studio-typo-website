/**
 * ElasticLens - Smooth fisheye/barrel UV distortion.
 *
 * Image bulges outward at cursor like pressing on rubber from behind.
 * Subtle chromatic aberration at the distortion boundary.
 */

import { ShaderMaterial, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import fragmentShader from "../shaders/lensdistort.frag.glsl?raw";

export class ElasticLens extends ImageEffect {
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
