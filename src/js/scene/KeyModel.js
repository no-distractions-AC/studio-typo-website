/**
 * KeyModel - Individual 3D keyboard key with theme-aware colors
 */

import {
  Group,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  CanvasTexture,
  Color,
} from "three";
import { animate, easings } from "../utils/easing.js";
import { CONFIG } from "../../config.js";

export class KeyModel {
  constructor(letter, position, isTypoKey = false) {
    this.letter = letter;
    this.position = { ...position };
    this.originalY = position.y;
    this.isTypoKey = isTypoKey;

    this.group = new Group();
    this.mesh = null;
    this.shimmerMesh = null;

    this.isPressed = false;
    this.isHovered = false;
    this.isVisible = isTypoKey; // TYPO keys start visible, STUDIO keys start hidden

    // Random phase offset for shimmer animation
    this.shimmerOffset = Math.random() * Math.PI * 2;

    // Theme state
    this.isDarkTheme =
      document.documentElement.getAttribute("data-theme") === "dark";
  }

  /**
   * Create the key mesh
   */
  create() {
    // Key cap geometry
    const geometry = new BoxGeometry(1, 0.4, 1);

    // Get theme-aware colors
    const keyColor = this.isDarkTheme ? 0xffffff : 0x1a1a1f;

    // PBR material - lower metalness to show texture clearly
    const material = new MeshStandardMaterial({
      color: keyColor,
      metalness: 0.1,
      roughness: 0.4,
      transparent: !this.isTypoKey,
      opacity: this.isTypoKey ? 1 : 0,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.position.y = 0.2;

    // Apply letter texture
    this.applyLetterTexture();

    // Create shimmer edge effect
    this.createShimmerEdge();

    this.group.add(this.mesh);
    this.group.position.set(this.position.x, this.position.y, this.position.z);

    // Store reference for raycasting
    this.mesh.userData.keyModel = this;

    // Set initial visibility
    this.group.visible = this.isVisible;
    if (!this.isVisible) {
      this.group.scale.set(0.8, 0.8, 0.8);
    }

    return this.group;
  }

  /**
   * Apply letter texture to key top
   */
  applyLetterTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Theme-aware colors
    const bgColor = this.isDarkTheme ? "#ffffff" : "#1a1a1f";
    const textColor = this.isDarkTheme ? "#000000" : "#FFFFFF";

    // Background matching key color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle gradient for depth
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    if (this.isDarkTheme) {
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.03)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.08)");
    } else {
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.03)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.08)");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // Letter - opposite color for contrast
    // Flip both axes for correct orientation when viewed from top-down camera
    ctx.save();
    ctx.translate(256, 256);
    ctx.scale(-1, -1);
    ctx.fillStyle = textColor;
    ctx.font = "bold 120px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.letter, 128, 128);
    ctx.restore();

    const texture = new CanvasTexture(canvas);
    texture.flipY = false;

    // Dispose old texture if exists
    if (this.mesh.material.map) {
      this.mesh.material.map.dispose();
    }

    this.mesh.material.map = texture;
    this.mesh.material.needsUpdate = true;
  }

  /**
   * Update theme colors
   */
  updateTheme(isDark) {
    this.isDarkTheme = isDark;

    // Update material color
    const keyColor = isDark ? 0xffffff : 0x1a1a1f;
    this.mesh.material.color.setHex(keyColor);

    // Update texture with new colors
    this.applyLetterTexture();
  }

  /**
   * Create shimmer edge highlight effect
   */
  createShimmerEdge() {
    // Slightly larger box for edge highlight
    const edgeGeometry = new BoxGeometry(1.05, 0.42, 1.05);
    const edgeMaterial = new MeshStandardMaterial({
      color: 0x0080fe,
      emissive: new Color(0x0080fe),
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.shimmerMesh = new Mesh(edgeGeometry, edgeMaterial);
    this.shimmerMesh.position.y = 0.2;
    this.group.add(this.shimmerMesh);
  }

  /**
   * Update shimmer animation (called every frame)
   */
  updateShimmer(elapsed) {
    if (!this.isVisible || !this.shimmerMesh) return;

    // Moving highlight effect like game button prompts
    const phase = elapsed * 2 + this.shimmerOffset;
    const intensity = ((Math.sin(phase) + 1) / 2) * 0.3;

    this.shimmerMesh.material.emissiveIntensity = intensity;
    this.shimmerMesh.material.opacity = intensity * 0.5;
  }

  /**
   * Animate key press down
   */
  async press() {
    if (this.isPressed) return;
    this.isPressed = true;

    const startY = this.group.position.y;
    const targetY = this.originalY - 0.15;

    await animate(
      CONFIG.timing.keyPressDuration,
      (progress) => {
        this.group.position.y = startY + (targetY - startY) * progress;
      },
      easings.keyPress,
    );
  }

  /**
   * Animate key release up
   */
  async release() {
    if (!this.isPressed) return;

    const startY = this.group.position.y;
    const targetY = this.originalY;

    await animate(
      CONFIG.timing.keyReleaseDuration,
      (progress) => {
        this.group.position.y = startY + (targetY - startY) * progress;
      },
      easings.keyRelease,
    );

    this.isPressed = false;
  }

  /**
   * Reveal key (for STUDIO keys fade-in)
   */
  async reveal() {
    if (this.isVisible) return;

    this.group.visible = true;
    this.mesh.material.transparent = true;

    await animate(
      300,
      (progress) => {
        this.group.scale.setScalar(0.8 + 0.2 * progress);
        this.mesh.material.opacity = progress;
      },
      easings.easeOut,
    );

    this.mesh.material.opacity = 1;
    this.isVisible = true;
  }

  /**
   * Set hover state
   */
  hover(isHovering) {
    this.isHovered = isHovering;

    // Boost shimmer on hover
    if (this.shimmerMesh) {
      if (isHovering) {
        this.shimmerMesh.material.emissiveIntensity = 0.5;
        this.shimmerMesh.material.opacity = 0.4;
      }
      // Normal shimmer will resume in updateShimmer
    }
  }

  /**
   * Move key to new position (for slide animation)
   */
  async slideTo(targetX, duration) {
    const startX = this.group.position.x;

    await animate(
      duration,
      (progress) => {
        this.group.position.x = startX + (targetX - startX) * progress;
      },
      easings.easeInOut,
    );
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (this.mesh.material.map) {
        this.mesh.material.map.dispose();
      }
      this.mesh.material.dispose();
    }
    if (this.shimmerMesh) {
      this.shimmerMesh.geometry.dispose();
      this.shimmerMesh.material.dispose();
    }
  }
}
