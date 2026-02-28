/**
 * GlitchMosh - Data corruption / glitch effect.
 *
 * Random horizontal blocks displace with RGB channel separation.
 * Intensity increases on hover; keystrokes trigger corruption bursts.
 */

import { ShaderMaterial } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/common.vert.glsl?raw";
import fragmentShader from "../shaders/glitch.frag.glsl?raw";

export class GlitchMosh extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
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
      fragmentShader,
    });
  }

  update(delta, elapsed) {
    this._decayKeystroke();
    const u = this.material.uniforms;
    u.uHover.value = this.hoverProgress;
    u.uTime.value = elapsed;
  }
}
