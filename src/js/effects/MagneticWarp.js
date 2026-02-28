/**
 * MagneticWarp - WebGL vertex displacement effect.
 *
 * A high-subdivision plane mesh deforms toward the cursor
 * like pressing on elastic fabric. Vertices pull toward the
 * mouse position with a smooth falloff.
 */

import { ShaderMaterial, PlaneGeometry, Mesh, Vector2 } from "three";
import { ImageEffect } from "./ImageEffect.js";
import vertexShader from "../shaders/magnetic.vert.glsl?raw";
import fragmentShader from "../shaders/magnetic.frag.glsl?raw";

export class MagneticWarp extends ImageEffect {
  setupMaterial() {
    this.material = new ShaderMaterial({
      uniforms: {
        uTexture: { value: this.texture },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uHover: { value: 0.0 },
        uCoverScale: { value: new Vector2(1, 1) },
        uKeystrokeIntensity: { value: 0.0 },
      },
      vertexShader,
      fragmentShader,
    });
  }

  _setupMesh() {
    if (!this.material) return;
    // High subdivision for smooth vertex displacement
    this.geometry = new PlaneGeometry(1, 1, 64, 64);
    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  // Override: magnetic.vert.glsl already has uCoverScale, skip auto-inject
  _injectCoverUniforms() {
    this._updateCoverScale();
  }

  update(delta, elapsed) {
    this._decayKeystroke();
    const u = this.material.uniforms;
    u.uHover.value = this.hoverProgress;
    u.uMouse.value.copy(this.mousePos);
  }
}
