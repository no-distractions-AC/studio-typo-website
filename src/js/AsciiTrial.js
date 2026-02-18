/**
 * ASCII Trial Controller
 * Manages image upload, ASCII conversion, and effect application
 */

import { loadImage, sampleCanvasWithColor } from "./ascii/utils/brightness.js";
import { brightnessToChar } from "./ascii/utils/ascii-density.js";
import { initAsciiArt } from "./ascii/index.js";

export class AsciiTrial {
  constructor() {
    // DOM elements
    this.uploadZone = document.getElementById("trial-upload");
    this.fileInput = document.getElementById("trial-file-input");
    this.previewImg = document.getElementById("trial-preview-img");
    this.uploadPrompt = document.getElementById("upload-prompt");
    this.previewContainer = document.getElementById("trial-preview");
    this.effectButtons = document.getElementById("trial-effects");
    this.colsInput = document.getElementById("trial-cols");
    this.colsValue = document.getElementById("trial-cols-value");
    this.rampSelect = document.getElementById("trial-ramp");

    // State
    this.imageCanvas = null;
    this.currentEffect = null;
    this.currentEffectName = "static";
    this.cols = 120;
    this.ramp = "photo";
    this.customRamp = " .oO@";
    this.weaveText = true;
    this.colorMode = true;
    this.gamma = 1.8;
    this.typewriterSpeed = 1;
    this.currentImageUrl = null;

    this.init();
  }

  init() {
    this.setupUpload();
    this.setupEffectSelector();
    this.setupSettings();
  }

  setupUpload() {
    // Click to upload
    this.uploadZone.addEventListener("click", () => {
      this.fileInput.click();
    });

    // File selected
    this.fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFile(file);
      }
    });

    // Drag and drop
    this.uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.uploadZone.classList.add("dragover");
    });

    this.uploadZone.addEventListener("dragleave", () => {
      this.uploadZone.classList.remove("dragover");
    });

    this.uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove("dragover");

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        this.handleFile(file);
      }
    });
  }

  setupEffectSelector() {
    const buttons = this.effectButtons.querySelectorAll("button");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Update active state
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Apply effect
        this.currentEffectName = btn.dataset.effect;

        // Show/hide typewriter speed slider
        if (this.speedGroup) {
          this.speedGroup.style.display =
            this.currentEffectName === "typewriter" ? "block" : "none";
        }

        if (this.imageCanvas) {
          this.applyEffect();
        }
      });
    });
  }

  setupSettings() {
    // Columns slider
    this.colsInput.addEventListener("input", () => {
      this.cols = parseInt(this.colsInput.value, 10);
      this.colsValue.textContent = this.cols;

      if (this.imageCanvas) {
        this.applyEffect();
      }
    });

    // Ramp selector
    this.rampSelect.addEventListener("change", () => {
      this.ramp = this.rampSelect.value;

      // Show/hide custom ramp input and weave toggle
      const isCustom = this.ramp === "custom";
      if (this.customRampGroup) {
        this.customRampGroup.style.display = isCustom ? "block" : "none";
      }
      if (this.weaveTextGroup) {
        this.weaveTextGroup.style.display = isCustom ? "block" : "none";
      }

      if (this.imageCanvas) {
        this.applyEffect();
      }
    });

    // Custom ramp input
    this.customRampInput = document.getElementById("trial-custom-ramp");
    this.customRampGroup = document.getElementById("custom-ramp-group");
    if (this.customRampInput) {
      this.customRampInput.addEventListener("input", () => {
        this.customRamp = this.customRampInput.value;
        if (this.imageCanvas && this.ramp === "custom") {
          this.applyEffect();
        }
      });
    }

    // Weave text toggle
    this.weaveTextToggle = document.getElementById("trial-weave");
    this.weaveTextGroup = document.getElementById("weave-text-group");
    if (this.weaveTextToggle) {
      this.weaveTextToggle.addEventListener("change", () => {
        this.weaveText = this.weaveTextToggle.checked;
        if (this.imageCanvas && this.ramp === "custom") {
          this.applyEffect();
        }
      });
    }

    // Color toggle
    this.colorToggle = document.getElementById("trial-color");
    if (this.colorToggle) {
      this.colorToggle.addEventListener("change", () => {
        this.colorMode = this.colorToggle.checked;
        if (this.imageCanvas) {
          this.applyEffect();
        }
      });
    }

    // Gamma slider
    this.gammaInput = document.getElementById("trial-gamma");
    this.gammaValue = document.getElementById("trial-gamma-value");
    if (this.gammaInput) {
      this.gammaInput.addEventListener("input", () => {
        this.gamma = parseFloat(this.gammaInput.value);
        this.gammaValue.textContent = this.gamma.toFixed(1);
        if (this.imageCanvas) {
          this.applyEffect();
        }
      });
    }

    // Typewriter speed slider
    this.speedInput = document.getElementById("trial-speed");
    this.speedValue = document.getElementById("trial-speed-value");
    this.speedGroup = document.getElementById("typewriter-speed-group");
    if (this.speedInput) {
      this.speedInput.addEventListener("input", () => {
        this.typewriterSpeed = parseFloat(this.speedInput.value);
        this.speedValue.textContent = this.typewriterSpeed + "x";
        if (this.imageCanvas && this.currentEffectName === "typewriter") {
          this.applyEffect();
        }
      });
    }
  }

  async handleFile(file) {
    try {
      // Create object URL for preview
      const url = URL.createObjectURL(file);

      // Show preview image
      this.previewImg.src = url;
      this.previewImg.classList.remove("hidden");
      this.uploadPrompt.style.display = "none";

      // Store URL for reveal effect (create a persistent URL)
      if (this.currentImageUrl) {
        URL.revokeObjectURL(this.currentImageUrl);
      }
      this.currentImageUrl = URL.createObjectURL(file);

      // Load to canvas
      this.imageCanvas = await loadImage(url);

      // Apply effect
      this.applyEffect();

      // Cleanup the first URL (keep currentImageUrl for reveal)
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to load image:", err);
    }
  }

  generateAscii() {
    if (!this.imageCanvas) return null;

    // Calculate rows based on aspect ratio
    // Characters are roughly 2x taller than wide
    const aspectRatio = this.imageCanvas.height / this.imageCanvas.width;
    const rows = Math.round(this.cols * aspectRatio * 0.5);

    // Sample brightness and color
    const { brightness, colors } = sampleCanvasWithColor(
      this.imageCanvas,
      this.cols,
      rows,
      this.gamma,
    );

    // Store for colored rendering
    this.lastBrightness = brightness;
    this.lastColors = colors;
    this.lastRows = rows;

    // Determine which ramp to use
    const rampToUse = this.ramp === "custom" ? this.customRamp : this.ramp;

    // Check if weave text mode is enabled (custom ramp with weave toggle)
    const useWeave =
      this.ramp === "custom" && this.weaveText && this.customRamp.length > 0;

    // Convert to ASCII string (for non-colored effects)
    let ascii = "";
    let charIndex = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let char;
        if (useWeave) {
          // Weave mode: cycle through custom text sequentially
          char = this.customRamp[charIndex % this.customRamp.length];
          charIndex++;
        } else {
          // Normal mode: map brightness to character
          char = brightnessToChar(brightness[y][x], rampToUse);
        }
        ascii += char;
      }
      if (y < rows - 1) {
        ascii += "\n";
      }
    }

    return ascii;
  }

  generateAsciiWithRamp(ramp) {
    if (!this.imageCanvas) return null;

    const aspectRatio = this.imageCanvas.height / this.imageCanvas.width;
    const rows = Math.round(this.cols * aspectRatio * 0.5);

    const { brightness, colors } = sampleCanvasWithColor(
      this.imageCanvas,
      this.cols,
      rows,
      this.gamma,
    );

    this.lastBrightness = brightness;
    this.lastColors = colors;
    this.lastRows = rows;

    let ascii = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        ascii += brightnessToChar(brightness[y][x], ramp);
      }
      if (y < rows - 1) {
        ascii += "\n";
      }
    }

    return ascii;
  }

  generateAsciiAtCols(cols, ramp) {
    if (!this.imageCanvas) return null;

    const aspectRatio = this.imageCanvas.height / this.imageCanvas.width;
    const rows = Math.round(cols * aspectRatio * 0.5);

    const { brightness } = sampleCanvasWithColor(
      this.imageCanvas,
      cols,
      rows,
      this.gamma,
    );

    let ascii = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ascii += brightnessToChar(brightness[y][x], ramp);
      }
      if (y < rows - 1) {
        ascii += "\n";
      }
    }

    return ascii;
  }

  generateColoredHtml() {
    if (!this.lastBrightness || !this.lastColors) return null;

    const rows = this.lastRows;
    const rampToUse = this.ramp === "custom" ? this.customRamp : this.ramp;

    // Check if weave text mode is enabled
    const useWeave =
      this.ramp === "custom" && this.weaveText && this.customRamp.length > 0;

    let html = "";
    let charIndex = 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let char;
        if (useWeave) {
          // Weave mode: cycle through custom text sequentially
          char = this.customRamp[charIndex % this.customRamp.length];
          charIndex++;
        } else {
          // Normal mode: map brightness to character
          char = brightnessToChar(this.lastBrightness[y][x], rampToUse);
        }

        const color = this.lastColors[y][x];
        // Use a slightly brighter version of the color for better visibility
        const boost = 1.1;
        const r = Math.min(255, Math.round(color.r * boost));
        const g = Math.min(255, Math.round(color.g * boost));
        const b = Math.min(255, Math.round(color.b * boost));
        // Escape HTML special characters
        let escaped = char;
        if (char === "<") escaped = "&lt;";
        else if (char === ">") escaped = "&gt;";
        else if (char === "&") escaped = "&amp;";
        else if (char === " ") escaped = "&nbsp;";
        html += `<span style="color:rgb(${r},${g},${b})">${escaped}</span>`;
      }
      if (y < rows - 1) {
        html += "\n";
      }
    }

    return html;
  }

  applyEffect() {
    // For textmatrix: always use photo ramp for the revealed ASCII art
    let ascii;
    if (this.currentEffectName === "textmatrix") {
      ascii = this.generateAsciiWithRamp("photo");
    } else {
      ascii = this.generateAscii();
    }
    if (!ascii) return;

    // Clear previous effect
    if (this.currentEffect && this.currentEffect.dispose) {
      this.currentEffect.dispose();
    }
    this.previewContainer.innerHTML = "";

    // Create container for effect
    const container = document.createElement("div");
    container.className = "ascii-art-container";
    this.previewContainer.appendChild(container);

    // Create hidden image layer for reveal effect (for non-static effects)
    let revealImage = null;
    if (this.currentEffectName !== "static" && this.currentImageUrl) {
      revealImage = document.createElement("img");
      revealImage.className = "ascii-reveal-image";
      revealImage.src = this.currentImageUrl;
      revealImage.alt = "";
      container.appendChild(revealImage);
    }

    // Static mode - just render the ASCII (colored or not)
    if (this.currentEffectName === "static") {
      if (this.colorMode) {
        const coloredHtml = this.generateColoredHtml();
        container.innerHTML = `<pre class="colored-ascii">${coloredHtml}</pre>`;
      } else {
        container.innerHTML = `<pre class="colored-ascii">${ascii}</pre>`;
      }
      this.currentEffect = null;
      return;
    }

    // Apply the selected effect with optional color support
    const options = this.colorMode ? { colors: this.lastColors } : {};

    // Add speed option for typewriter effect
    if (this.currentEffectName === "typewriter") {
      options.speed = this.typewriterSpeed;
    }

    // Generate wide custom-char ASCII art for textmatrix effect
    if (this.currentEffectName === "textmatrix") {
      const rampChars =
        this.ramp === "custom" && this.customRamp.length > 0
          ? this.customRamp
          : "simple";
      const wideCols = Math.round(this.cols * 2);
      const wideAscii = this.generateAsciiAtCols(wideCols, rampChars);
      if (wideAscii) {
        options.wideAscii = wideAscii;
      }
    }

    // Add reveal image reference for hover reveal
    if (revealImage) {
      options.revealImage = revealImage;
    }

    this.currentEffect = initAsciiArt(
      container,
      ascii,
      this.currentEffectName,
      options,
    );
  }

  renderColoredWithEffect(container, ascii) {
    // For colored mode with effects, we render the colored base first
    // then let the effect animate over it
    const coloredHtml = this.generateColoredHtml();

    // Create a colored pre element as background
    const coloredPre = document.createElement("pre");
    coloredPre.className = "colored-ascii-base";
    coloredPre.innerHTML = coloredHtml;
    container.appendChild(coloredPre);

    // Create effect layer on top
    const effectLayer = document.createElement("div");
    effectLayer.className = "ascii-effect-layer";
    container.appendChild(effectLayer);

    // Apply effect to the effect layer
    this.currentEffect = initAsciiArt(
      effectLayer,
      ascii,
      this.currentEffectName,
    );

    // Add colored class for special styling
    container.classList.add("has-colored-base");
  }

  dispose() {
    if (this.currentEffect && this.currentEffect.dispose) {
      this.currentEffect.dispose();
    }
  }
}
