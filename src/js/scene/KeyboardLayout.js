/**
 * KeyboardLayout - Manages all keyboard keys
 */

import { Group } from "three";
import { CONFIG } from "../../config.js";
import { KeyModel } from "./KeyModel.js";
import { animate, easings } from "../utils/easing.js";

export class KeyboardLayout {
  constructor(scene) {
    this.scene = scene;
    this.group = new Group();

    // Key storage
    this.typoKeys = new Map(); // T, Y, P, O
    this.studioKeys = new Map(); // S, T, U, D, I, O
    this.allKeys = [];
  }

  /**
   * Initialize the keyboard layout
   */
  async init() {
    // Create TYPO keys (visible, interactive)
    for (const [letter, position] of Object.entries(CONFIG.layout.typo)) {
      const key = new KeyModel(letter, position, true);
      key.create();
      this.typoKeys.set(letter, key);
      this.allKeys.push(key);
      this.group.add(key.group);
    }

    // Create STUDIO keys (hidden initially)
    for (const [letter, position] of Object.entries(CONFIG.layout.studio)) {
      const key = new KeyModel(letter, position, false);
      key.create();
      this.studioKeys.set(letter, key);
      this.allKeys.push(key);
      this.group.add(key.group);
    }

    this.scene.add(this.group);
  }

  /**
   * Get a TYPO key by letter
   * For T and O, returns the TYPO version (not STUDIO)
   */
  getTypoKey(letter) {
    return this.typoKeys.get(letter.toUpperCase());
  }

  /**
   * Get a STUDIO key by letter
   */
  getStudioKey(letter) {
    return this.studioKeys.get(letter.toUpperCase());
  }

  /**
   * Get any key by letter (prefers TYPO)
   */
  getKey(letter) {
    const upper = letter.toUpperCase();
    return this.typoKeys.get(upper) || this.studioKeys.get(upper);
  }

  /**
   * Update shimmer on all visible keys
   */
  updateShimmer(elapsed) {
    for (const key of this.allKeys) {
      key.updateShimmer(elapsed);
    }
  }

  /**
   * Update theme colors on all keys
   */
  updateTheme(isDark) {
    for (const key of this.allKeys) {
      key.updateTheme(isDark);
    }
  }

  /**
   * Reveal STUDIO keys in sequence
   */
  async revealStudioKeys() {
    const letters = ["S", "T", "U", "D", "I", "O"];
    const stagger = CONFIG.timing.studioRevealStagger;

    for (let i = 0; i < letters.length; i++) {
      const key = this.studioKeys.get(letters[i]);
      if (key) {
        // Don't await - let them overlap for stagger effect
        key.reveal();

        // Wait for stagger delay before next key
        if (i < letters.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, stagger));
        }
      }
    }

    // Wait for last key to finish revealing
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  /**
   * Slide all keys to the right
   */
  async slideRight(distance, duration) {
    const startX = this.group.position.x;
    const targetX = startX + distance;

    await animate(
      duration,
      (progress) => {
        this.group.position.x = startX + (targetX - startX) * progress;
      },
      easings.easeInOut,
    );
  }

  /**
   * Get all visible keys
   */
  getVisibleKeys() {
    return this.allKeys.filter((key) => key.isVisible);
  }

  /**
   * Clean up all keys
   */
  dispose() {
    for (const key of this.allKeys) {
      key.dispose();
    }
    this.scene.remove(this.group);
  }
}
