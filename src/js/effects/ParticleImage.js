/**
 * ParticleImage - GPU particle dissolve/reform effect.
 *
 * Image pixels are sampled into colored particles. Particles start
 * scattered randomly and reform into the image on hover.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  PerspectiveCamera,
} from "three";
import { ImageEffect } from "./ImageEffect.js";
import { getPixelRatio } from "../utils/device.js";
import vertexShader from "../shaders/particle.vert.glsl?raw";
import fragmentShader from "../shaders/particle.frag.glsl?raw";

const SAMPLE_SIZE = 100; // Sample image at 100x100 grid max

export class ParticleImage extends ImageEffect {
  constructor(container, imageSrc, options) {
    super(container, imageSrc, options);
    this.alwaysAnimate = true;
  }

  _createCamera() {
    // Particle effect needs PerspectiveCamera for gl_PointSize depth scaling
    const aspect =
      this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.z = 1;
  }

  _updateRendererSize() {
    super._updateRendererSize();
    if (this.camera && this.camera.isPerspectiveCamera) {
      const { clientWidth: w, clientHeight: h } = this.container;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }
    }
  }

  setupMaterial() {
    const { positions, targetPositions, colors, sizes } = this._sampleImage();

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(positions, 3),
    );
    this.geometry.setAttribute(
      "targetPosition",
      new Float32BufferAttribute(targetPositions, 3),
    );
    this.geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new Float32BufferAttribute(sizes, 1));

    this.material = new ShaderMaterial({
      uniforms: {
        uHover: { value: 0.0 },
        uTime: { value: 0.0 },
        uPixelRatio: { value: getPixelRatio(2) },
        uKeystrokeIntensity: { value: 0.0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }

  _setupMesh() {
    if (!this.material) return;
    this.mesh = new Points(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  _sampleImage() {
    // Draw image to an offscreen canvas to read pixel data
    const img = this.texture.image;
    const canvas = document.createElement("canvas");
    const aspect = img.width / img.height;

    const cols = Math.min(SAMPLE_SIZE, img.width);
    const rows = Math.round(cols / aspect);

    canvas.width = cols;
    canvas.height = rows;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, cols, rows);
    const imageData = ctx.getImageData(0, 0, cols, rows);
    const pixels = imageData.data;

    const positions = [];
    const targetPositions = [];
    const colors = [];
    const sizes = [];

    // Map pixel grid to world space centered at origin
    // The plane is roughly 0.6 units wide to fit in the perspective camera view
    const planeW = 0.6;
    const planeH = planeW / aspect;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const a = pixels[i + 3] / 255;

        // Skip fully transparent pixels
        if (a < 0.1) continue;

        // Target position: map to centered plane
        const tx = (x / cols - 0.5) * planeW;
        const ty = -(y / rows - 0.5) * planeH;
        const tz = 0;

        targetPositions.push(tx, ty, tz);

        // Scattered start position: random within a larger radius
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.4;
        const sx = Math.cos(angle) * radius;
        const sy = Math.sin(angle) * radius;
        const sz = (Math.random() - 0.5) * 0.3;

        positions.push(sx, sy, sz);
        colors.push(r, g, b);
        sizes.push(0.8 + Math.random() * 0.6);
      }
    }

    return {
      positions: new Float32Array(positions),
      targetPositions: new Float32Array(targetPositions),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes),
    };
  }

  update(delta, elapsed) {
    this._decayKeystroke();
    const u = this.material.uniforms;
    u.uHover.value = this.hoverProgress;
    u.uTime.value = elapsed;
  }
}
