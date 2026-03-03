/**
 * ImageEffect - Base class for all image effects.
 *
 * Manages per-effect Three.js lifecycle: canvas, WebGLRenderer,
 * OrthographicCamera, Scene, PlaneGeometry, ShaderMaterial.
 *
 * Subclasses override: setupMaterial(), update(), onHover(), onLeave(), onThemeChange()
 */

import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  TextureLoader,
  Vector2,
  Clock,
} from "three";
import { getPixelRatio, prefersReducedMotion } from "../utils/device.js";

export class ImageEffect {
  /**
   * @param {HTMLElement} container - DOM element to mount the canvas into
   * @param {string} imageSrc - URL of the image to render
   * @param {Object} options - { theme, reducedMotion }
   */
  constructor(container, imageSrc, options = {}) {
    this.container = container;
    this.imageSrc = imageSrc;
    this.options = options;

    // Three.js objects
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = null;
    this.geometry = null;
    this.material = null;
    this.mesh = null;
    this.texture = null;

    // State
    this.isHovered = false;
    this.mousePos = new Vector2(0.5, 0.5);
    this.targetMousePos = new Vector2(0.5, 0.5);
    this.mousePx = { x: 0, y: 0 };
    this.prevMousePx = { x: 0, y: 0 };
    this.hoverProgress = 0;
    this.animationId = null;
    this.isDisposed = false;
    this.reducedMotion = options.reducedMotion ?? prefersReducedMotion();
    this._startTime = performance.now();

    // Subclasses set to false for CSS-only effects
    this.usesWebGL = true;
    // Subclasses set to true for continuous animation (e.g., fluid distortion)
    this.alwaysAnimate = false;

    // Track for render-on-demand
    this._lastRenderedHover = -1;
    this._needsRender = true;

    // Keystroke reaction (decaying intensity for shader effects)
    this.keystrokeIntensity = 0;

    // Bound event handlers
    this._onMouseEnter = this._handleMouseEnter.bind(this);
    this._onMouseLeave = this._handleMouseLeave.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);
  }

  /**
   * Async initialization. Call after construction.
   */
  async init() {
    if (this.usesWebGL) {
      this._createCanvas();
      this._createRenderer();
      this._createScene();
      this._createCamera();
      this.clock = new Clock();
      this.texture = await this._loadTexture(this.imageSrc);
    }

    this.setupMaterial();
    this._injectCoverUniforms();
    this._setupMesh();
    this._setupEvents();
    this._startLoop();
  }

  /** Override in subclass to create ShaderMaterial */
  setupMaterial() {}

  /** Override in subclass to update uniforms per frame */
  update(delta, elapsed) {}

  /** Override for hover-start logic */
  onHover() {}

  /** Override for hover-end logic */
  onLeave() {}

  /** Override to react to theme changes */
  onThemeChange(isDark) {}

  /**
   * Trigger a keystroke reaction. Canvas effects override this
   * for shockwave rings; shader effects use keystrokeIntensity decay.
   */
  triggerShockwave() {
    this.keystrokeIntensity = 1.0;
    this._needsRender = true;
  }

  /**
   * Decay keystrokeIntensity and push it to the shader uniform.
   * Call in subclass update() to get keyboard reactions.
   */
  _decayKeystroke() {
    if (!this.keystrokeIntensity) return;
    this.keystrokeIntensity *= 0.94;
    if (this.keystrokeIntensity < 0.01) this.keystrokeIntensity = 0;
    if (this.material?.uniforms?.uKeystrokeIntensity) {
      this.material.uniforms.uKeystrokeIntensity.value =
        this.keystrokeIntensity;
    }
    if (this.keystrokeIntensity > 0) this._needsRender = true;
  }

  /** Called externally by the page controller */
  setTheme(isDark) {
    this.options.theme = isDark ? "dark" : "light";
    this.onThemeChange(isDark);
    this._needsRender = true;
  }

  // --- Private methods ---

  _createCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.container.appendChild(this.canvas);
  }

  _createRenderer() {
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      powerPreference: "default",
    });
    this.renderer.setPixelRatio(getPixelRatio(2));
    this._updateRendererSize();
  }

  _createScene() {
    this.scene = new Scene();
  }

  _createCamera() {
    // Orthographic camera: -0.5 to 0.5 maps cleanly to UV space
    this.camera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    this.camera.position.z = 1;
  }

  async _loadTexture(src) {
    const loader = new TextureLoader();
    const tex = await loader.loadAsync(src);
    // Don't set SRGBColorSpace -- ShaderMaterial doesn't re-encode
    // linear-to-sRGB on output, so raw sRGB bytes should pass through as-is.
    return tex;
  }

  /**
   * Inject uCoverScale uniform into the material for aspect-ratio-correct
   * "object-fit: cover" UV mapping. Called after setupMaterial().
   */
  _injectCoverUniforms() {
    if (!this.usesWebGL || !this.material || !this.texture) return;
    if (!this.material.uniforms) return;

    this.material.uniforms.uCoverScale = { value: new Vector2(1, 1) };
    this._updateCoverScale();
  }

  _updateCoverScale() {
    if (!this.material?.uniforms?.uCoverScale || !this.texture?.image) return;

    const img = this.texture.image;
    const imageAspect = img.width / img.height;
    const { clientWidth: cw, clientHeight: ch } = this.container;
    if (cw === 0 || ch === 0) return;
    const containerAspect = cw / ch;

    // "cover": scale whichever axis is too large down to fit
    const scaleX = Math.min(containerAspect / imageAspect, 1.0);
    const scaleY = Math.min(imageAspect / containerAspect, 1.0);

    this.material.uniforms.uCoverScale.value.set(scaleX, scaleY);
  }

  _setupMesh() {
    if (!this.usesWebGL || !this.material) return;

    // Plane fills the ortho camera view
    this.geometry = new PlaneGeometry(1, 1);
    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  _setupEvents() {
    this.container.addEventListener("mouseenter", this._onMouseEnter);
    this.container.addEventListener("mouseleave", this._onMouseLeave);
    this.container.addEventListener("mousemove", this._onMouseMove);
    this.container.addEventListener("touchstart", this._onTouchStart, {
      passive: true,
    });
    this.container.addEventListener("touchend", this._onTouchEnd, {
      passive: true,
    });

    this._resizeObserver = new ResizeObserver(() => {
      this._updateRendererSize();
      this._updateCoverScale();
      this._needsRender = true;
    });
    this._resizeObserver.observe(this.container);
  }

  _updateRendererSize() {
    if (!this.renderer || !this.container) return;
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
  }

  _handleMouseEnter() {
    this.isHovered = true;
    this._needsRender = true;
    this.onHover();
  }

  _handleMouseLeave() {
    this.isHovered = false;
    this._needsRender = true;
    this.onLeave();
  }

  _handleMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    this.targetMousePos.x = (e.clientX - rect.left) / rect.width;
    this.targetMousePos.y = 1.0 - (e.clientY - rect.top) / rect.height;
    this.prevMousePx.x = this.mousePx.x;
    this.prevMousePx.y = this.mousePx.y;
    this.mousePx.x = e.clientX - rect.left;
    this.mousePx.y = e.clientY - rect.top;
    this._needsRender = true;
  }

  _handleTouchStart(e) {
    if (e.touches.length > 0) {
      const rect = this.container.getBoundingClientRect();
      const touch = e.touches[0];
      this.targetMousePos.x = (touch.clientX - rect.left) / rect.width;
      this.targetMousePos.y = 1.0 - (touch.clientY - rect.top) / rect.height;
    }
    this.isHovered = true;
    this._needsRender = true;
    this.onHover();
  }

  _handleTouchEnd() {
    this.isHovered = false;
    this._needsRender = true;
    this.onLeave();
  }

  _startLoop() {
    const animate = () => {
      if (this.isDisposed) return;
      this.animationId = requestAnimationFrame(animate);

      // Smoothly interpolate hoverProgress
      const target = this.isHovered ? 1 : 0;
      if (this.reducedMotion) {
        this.hoverProgress = target;
      } else {
        const speed = this.isHovered ? 0.08 : 0.05;
        this.hoverProgress += (target - this.hoverProgress) * speed;
      }

      // Lerp mouse position
      this.mousePos.x += (this.targetMousePos.x - this.mousePos.x) * 0.1;
      this.mousePos.y += (this.targetMousePos.y - this.mousePos.y) * 0.1;

      // Check if we need to render
      const hoverDelta = Math.abs(this.hoverProgress - this._lastRenderedHover);
      if (!this._needsRender && !this.alwaysAnimate && hoverDelta < 0.001) {
        return;
      }

      if (this.usesWebGL && this.clock) {
        this.update(this.clock.getDelta(), this.clock.getElapsedTime());
        this.renderer.render(this.scene, this.camera);
      } else {
        const elapsed = (performance.now() - this._startTime) / 1000;
        this.update(0, elapsed);
      }

      this._lastRenderedHover = this.hoverProgress;
      this._needsRender = false;
    };
    animate();
  }

  pause() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume() {
    if (this.isDisposed || this.animationId) return;
    this._startLoop();
  }

  dispose() {
    this.isDisposed = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this._resizeObserver?.disconnect();

    this.container.removeEventListener("mouseenter", this._onMouseEnter);
    this.container.removeEventListener("mouseleave", this._onMouseLeave);
    this.container.removeEventListener("mousemove", this._onMouseMove);
    this.container.removeEventListener("touchstart", this._onTouchStart);
    this.container.removeEventListener("touchend", this._onTouchEnd);

    this.texture?.dispose();
    this.geometry?.dispose();
    this.material?.dispose();
    this.renderer?.dispose();
    this.canvas?.remove();
  }
}
