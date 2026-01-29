/**
 * Environment - HDR environment map setup
 */

import { PMREMGenerator, Color, Scene as ThreeScene } from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export class Environment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.envMap = null;
    this.pmremGenerator = null;
  }

  /**
   * Load environment map
   * @param {string} url - Optional HDR file URL
   */
  async load(url = null) {
    this.pmremGenerator = new PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    if (url) {
      try {
        const texture = await this.loadHDR(url);
        this.envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        texture.dispose(); // Free original texture
      } catch (error) {
        console.warn("Failed to load HDR, using fallback:", error);
        this.createFallbackEnv();
      }
    } else {
      // Use procedural fallback
      this.createFallbackEnv();
    }

    this.scene.environment = this.envMap;
    this.pmremGenerator.dispose();
  }

  /**
   * Load HDR texture
   */
  loadHDR(url) {
    return new Promise((resolve, reject) => {
      const loader = new RGBELoader();
      loader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error),
      );
    });
  }

  /**
   * Create procedural fallback environment
   */
  createFallbackEnv() {
    // Create a simple gradient environment
    const envScene = new ThreeScene();

    // Pure black background matching the design
    envScene.background = new Color(0x000000);

    // Generate environment map from scene
    this.envMap = this.pmremGenerator.fromScene(envScene, 0.04).texture;
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.envMap) {
      this.envMap.dispose();
    }
  }
}
