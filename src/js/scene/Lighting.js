/**
 * Lighting - Scene lighting setup
 */

import { AmbientLight, DirectionalLight, PointLight, Color } from "three";
import { threeColors } from "../../tokens/index.js";

export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
  }

  /**
   * Set up scene lighting for top-down camera view
   */
  setup() {
    // Get default (dark theme) light colors from tokens
    const lightColor = threeColors.dark.lightMain;

    // Strong ambient light for base illumination
    const ambient = new AmbientLight(new Color(lightColor), 0.6);
    this.scene.add(ambient);
    this.lights.push(ambient);

    // Main top-down light (directly above)
    const topLight = new DirectionalLight(new Color(lightColor), 1.5);
    topLight.position.set(0, 10, 0);
    topLight.castShadow = false;
    this.scene.add(topLight);
    this.lights.push(topLight);

    // Fill light for subtle side illumination
    const fillLight = new DirectionalLight(new Color(lightColor), 0.4);
    fillLight.position.set(5, 8, 5);
    this.scene.add(fillLight);
    this.lights.push(fillLight);

    // Secondary fill light (opposite side)
    const fillLight2 = new DirectionalLight(new Color(lightColor), 0.3);
    fillLight2.position.set(-5, 8, -5);
    this.scene.add(fillLight2);
    this.lights.push(fillLight2);
  }

  /**
   * Update light for theme change
   */
  setTheme(theme) {
    const colors = theme === "light" ? threeColors.light : threeColors.dark;

    if (theme === "light") {
      // Brighter, warmer lighting for light theme
      this.lights[0].intensity = 0.6; // ambient
      this.lights[1].intensity = 1.2; // key
      this.lights[2].color.setHex(colors.lightFill); // fill - neutral
    } else {
      // Original dark theme lighting
      this.lights[0].intensity = 0.4;
      this.lights[1].intensity = 1.0;
      this.lights[2].color.setHex(colors.lightFill); // blue tint fill
    }
  }

  /**
   * Clean up lights
   */
  dispose() {
    for (const light of this.lights) {
      this.scene.remove(light);
    }
    this.lights = [];
  }
}
