# Studio Typo Website - Implementation Plan

## Overview

This plan outlines the complete implementation of Studio Typo, a premium technology consultancy website featuring an immersive 3D mechanical keyboard intro experience with ASMR typing sounds.

**Key Constraints:**

- Vanilla JS only (no React, Vue, Angular, jQuery)
- Only Three.js as external dependency
- No CSS frameworks (Tailwind, Bootstrap)
- No animation libraries (GSAP)
- Bundle size < 200KB gzipped (excluding assets)
- Total assets < 1.5MB

---

## Design Decisions (Clarified)

The following decisions have been made based on requirements clarification:

| Decision              | Choice                | Details                                                                                             |
| --------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| STUDIO keys reveal    | **Fade in place**     | Keys fade from invisible to visible in their final positions, left-to-right order (S first, O last) |
| Idle animation        | **Shimmer highlight** | Light moves around keycap edges like video game button prompts                                      |
| Duplicate keys (T, O) | **TYPO key only**     | When T or O pressed, only the TYPO grid key animates                                                |
| Section content       | **Placeholder text**  | Lorem ipsum with realistic structure                                                                |
| Sound style           | **Topre/Membrane**    | Thocky, deeper, muted sounds                                                                        |
| Camera behavior       | **Static**            | Keys slide right, camera stays in place                                                             |
| Offline support       | **No**                | Online only, no Service Worker                                                                      |
| Deployment            | **GitHub Pages**      | Static hosting with custom domain support                                                           |

---

## Phase 0: Project Initialization & Git Setup

### 0.1 Git Repository Setup

```bash
# Initialize git repository
git init

# Create initial README
echo "# studio-typo-website" >> README.md

# Initial commit
git add README.md
git commit -m "first commit"

# Set main branch
git branch -M master

# Add remote origin
git remote add origin git@github.com:ravaan/studio-typo-website.git

# Push to remote
git push -u origin master
```

### 0.2 Project Scaffolding

```bash
# Create Vite project (vanilla template)
npm create vite@latest . -- --template vanilla

# Install Three.js
npm install three

# Install dev dependencies
npm install -D terser
```

### 0.3 Create Directory Structure

```
studio-typo-website/
├── index.html
├── vite.config.js
├── package.json
├── .gitignore
├── README.md
├── plan.md
│
├── src/
│   ├── main.js
│   ├── config.js                 # Centralized configuration
│   │
│   ├── styles/
│   │   ├── main.css
│   │   ├── variables.css
│   │   ├── reset.css
│   │   ├── typography.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── animations.css
│   │   └── responsive.css
│   │
│   ├── js/
│   │   ├── App.js
│   │   │
│   │   ├── scene/
│   │   │   ├── SceneManager.js
│   │   │   ├── KeyModel.js
│   │   │   ├── KeyboardLayout.js
│   │   │   ├── Lighting.js
│   │   │   └── Environment.js
│   │   │
│   │   ├── audio/
│   │   │   └── AudioManager.js
│   │   │
│   │   ├── intro/
│   │   │   └── IntroSequence.js
│   │   │
│   │   ├── ui/
│   │   │   ├── Navigation.js
│   │   │   ├── ThemeToggle.js
│   │   │   ├── SoundToggle.js
│   │   │   └── ContentSections.js
│   │   │
│   │   └── utils/
│   │       ├── storage.js
│   │       ├── keyboard.js
│   │       ├── device.js
│   │       ├── easing.js
│   │       └── analytics.js
│   │
│   └── assets/
│       ├── models/
│       ├── textures/
│       ├── audio/
│       └── fonts/
│
└── public/
    ├── favicon.ico
    └── og-image.png
```

### 0.4 Centralized Configuration (config.js)

**CRITICAL: Single source of truth for all settings**

```javascript
// src/config.js
export const CONFIG = {
  // Scene settings
  scene: {
    camera: {
      fov: 45,
      near: 0.1,
      far: 100,
      position: { x: 0, y: 2, z: 8 },
    },
    renderer: {
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    },
  },

  // Key layout positions
  layout: {
    keySpacing: 1.2,
    slideDistance: 3.5, // World units to slide right
    // STUDIO row (initially hidden)
    studio: {
      S: { x: -3.0, y: 0, z: 0 },
      T: { x: -1.8, y: 0, z: 0 },
      U: { x: -0.6, y: 0, z: 0 },
      D: { x: 0.6, y: 0, z: 0 },
      I: { x: 1.8, y: 0, z: 0 },
      O: { x: 3.0, y: 0, z: 0 },
    },
    // TYPO grid (initially visible, centered)
    typo: {
      T: { x: -0.6, y: -1.2, z: 0 },
      Y: { x: 0.6, y: -1.2, z: 0 },
      P: { x: -0.6, y: -2.4, z: 0 },
      O: { x: 0.6, y: -2.4, z: 0 },
    },
  },

  // Animation timings (ms)
  timing: {
    keyPressDuration: 80,
    keyReleaseDuration: 120,
    studioRevealStagger: 100,
    slideRightDuration: 800,
    navRevealDelay: 100,
    sectionTransition: 300,
  },

  // Intro sequence
  intro: {
    totalDuration: 3500,
    steps: {
      audioInit: 0,
      keyPress: 200,
      keyRelease: 400,
      studioRevealStart: 600,
      slideStart: 1500,
      navReveal: 2300,
    },
  },

  // Audio
  audio: {
    masterVolume: 0.7,
    loopVolume: 0.5,
    keyPressVolume: 0.6,
    fadeInDuration: 1000,
    fadeOutDuration: 300,
  },

  // Performance
  performance: {
    maxPixelRatio: 2,
    raycastInterval: 50,
    resizeDebounce: 100,
  },
};
```

### 0.5 Configure Vite

**vite.config.js:**

```javascript
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  publicDir: "public",
  base: "/studio-typo-website/", // GitHub Pages base path
  build: {
    outDir: "dist",
    assetsDir: "assets",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
    chunkSizeWarningLimit: 200,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
```

### 0.6 Configure .gitignore

```
node_modules/
dist/
.DS_Store
*.local
.env
.env.*
```

### Deliverables - Phase 0:

- [x] Git repository initialized with remote
- [x] Vite project created
- [x] Directory structure in place
- [x] Three.js installed
- [x] config.js created
- [x] Build configuration complete for GitHub Pages

---

## Phase 1: Foundation (CSS & HTML)

### 1.1 CSS Variables (variables.css)

```css
/* Dark Theme (Default) */
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a24;

  /* Text */
  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;

  /* Accent - Azure */
  --accent: #0080fe;
  --accent-hover: #0066cc;
  --accent-subtle: rgba(0, 128, 254, 0.1);

  /* Borders */
  --border-primary: #2a2a3a;
  --border-secondary: #3a3a4a;

  /* Typography */
  --font-mono: "Space Mono", "SF Mono", "Consolas", monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;
  --text-4xl: 2.5rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;

  /* Easings (CSS cubic-bezier) */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-key-press: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-key-release: cubic-bezier(0.34, 1.2, 0.64, 1);
}

/* Light Theme */
[data-theme="light"] {
  --bg-primary: #fafafa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f4f4f5;

  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-tertiary: #a1a1aa;

  --border-primary: #e4e4e7;
  --border-secondary: #d4d4d8;

  /* Accent stays same but with adjusted subtle */
  --accent-subtle: rgba(0, 128, 254, 0.08);
}
```

### 1.2 Inline Critical CSS

**CRITICAL: Must be inlined in `<head>` for fast first paint**

```css
/* Inline in index.html <head> */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html {
  font-family: "Space Mono", monospace;
  -webkit-font-smoothing: antialiased;
}
body {
  background: #0a0a0f;
  color: #f4f4f5;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
}
#canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
}
.loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  z-index: 100;
}
.loading-text {
  font-size: 0.875rem;
  color: #a1a1aa;
  letter-spacing: 0.1em;
}
```

### 1.3 iOS Safari Height Fix

**CRITICAL: Use dvh with fallback for iOS Safari**

```css
/* In layout.css */
body {
  min-height: 100vh; /* Fallback */
  min-height: 100dvh; /* Dynamic viewport height */
}

#canvas {
  height: 100vh;
  height: 100dvh;
}

/* Mobile with bottom nav */
@media (max-width: 767px) {
  #canvas {
    height: calc(100vh - 64px);
    height: calc(100dvh - 64px);
  }
}
```

### 1.4 HTML Structure (index.html)

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Studio Typo - Premium Technology Consultancy"
    />

    <!-- Preload critical assets -->
    <link
      rel="preload"
      href="/src/assets/fonts/space-mono.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />

    <!-- Critical CSS (inline) -->
    <style>
      *,
      *::before,
      *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html {
        font-family: "Space Mono", monospace;
        -webkit-font-smoothing: antialiased;
      }
      body {
        background: #0a0a0f;
        color: #f4f4f5;
        min-height: 100vh;
        min-height: 100dvh;
        overflow: hidden;
      }
      #canvas {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .loading {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0a0a0f;
        z-index: 100;
      }
      .loading-text {
        font-size: 0.875rem;
        color: #a1a1aa;
        letter-spacing: 0.1em;
      }
      .hidden {
        display: none !important;
      }
    </style>

    <title>Studio Typo</title>

    <!-- Favicon -->
    <link rel="icon" href="/favicon.ico" />

    <!-- Open Graph -->
    <meta property="og:title" content="Studio Typo" />
    <meta property="og:description" content="Premium Technology Consultancy" />
    <meta property="og:image" content="/og-image.png" />
    <meta
      property="og:url"
      content="https://ravaan.github.io/studio-typo-website/"
    />

    <!-- Mixpanel SDK (load async) -->
    <script>
      (function (c, a) {
        if (!a.__SV) {
          var b = window;
          try {
            var d,
              m,
              j,
              k = b.location,
              f = k.hash;
            d = function (a, b) {
              return (m = a.match(RegExp(b + "=([^&]*)"))) ? m[1] : null;
            };
            f &&
              d(f, "state") &&
              ((j = JSON.parse(decodeURIComponent(d(f, "state")))),
              "mpeditor" === j.action &&
                (b.sessionStorage.setItem("_mpcehash", f),
                history.replaceState(
                  j.desiredHash || "",
                  c.title,
                  k.pathname + k.search,
                )));
          } catch (n) {}
          var l, h;
          window.mixpanel = a;
          a._i = [];
          a.init = function (b, d, g) {
            function c(b, i) {
              var a = i.split(".");
              2 == a.length && ((b = b[a[0]]), (i = a[1]));
              b[i] = function () {
                b.push([i].concat(Array.prototype.slice.call(arguments, 0)));
              };
            }
            var e = a;
            "undefined" !== typeof g ? (e = a[g] = []) : (g = "mixpanel");
            e.people = e.people || [];
            e.toString = function (b) {
              var a = "mixpanel";
              "mixpanel" !== g && (a += "." + g);
              b || (a += " (stub)");
              return a;
            };
            e.people.toString = function () {
              return e.toString(1) + ".people (stub)";
            };
            l =
              "disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(
                " ",
              );
            for (h = 0; h < l.length; h++) c(e, l[h]);
            var f = "set set_once union unset remove delete".split(" ");
            e.get_group = function () {
              function a(c) {
                b[c] = function () {
                  call2_args = arguments;
                  call2 = [c].concat(Array.prototype.slice.call(call2_args, 0));
                  e.push([d, call2]);
                };
              }
              for (
                var b = {},
                  d = ["get_group"].concat(
                    Array.prototype.slice.call(arguments, 0),
                  ),
                  c = 0;
                c < f.length;
                c++
              )
                a(f[c]);
              return b;
            };
            a._i.push([b, d, g]);
          };
          a.__SV = 1.2;
        }
      })(document, window.mixpanel || []);
    </script>
  </head>
  <body>
    <!-- Skip link for accessibility -->
    <a href="#content" class="skip-link">Skip to content</a>

    <!-- Loading State -->
    <div id="loading" class="loading">
      <span class="loading-text">Loading...</span>
    </div>

    <!-- 3D Canvas -->
    <canvas id="canvas"></canvas>

    <!-- Navigation (initially hidden) -->
    <nav id="navigation" class="sidebar hidden" aria-label="Main navigation">
      <ul class="nav-list">
        <li><a href="#services" class="nav-item active">Services</a></li>
        <li><a href="#about" class="nav-item">About</a></li>
        <li><a href="#work" class="nav-item">Work</a></li>
        <li><a href="#contact" class="nav-item">Contact</a></li>
      </ul>

      <div class="sidebar-controls">
        <button
          id="theme-toggle"
          aria-label="Toggle theme"
          aria-pressed="false"
        ></button>
        <button
          id="sound-toggle"
          aria-label="Toggle sound"
          aria-pressed="true"
        ></button>
      </div>
    </nav>

    <!-- Content Sections (initially hidden) -->
    <main id="content" class="content hidden">
      <section id="services" class="section active">
        <h2>Services</h2>
        <p>
          We build exceptional digital experiences that drive business growth.
        </p>
        <ul>
          <li>Web Application Development</li>
          <li>Mobile App Development</li>
          <li>UI/UX Design</li>
          <li>Technical Consulting</li>
        </ul>
      </section>
      <section id="about" class="section">
        <h2>About</h2>
        <p>
          Studio Typo is a premium technology consultancy founded on the belief
          that great software requires both technical excellence and thoughtful
          design.
        </p>
        <p>
          Our team brings decades of combined experience building products for
          startups and Fortune 500 companies alike.
        </p>
      </section>
      <section id="work" class="section">
        <h2>Work</h2>
        <p>Selected projects showcasing our expertise.</p>
        <div class="work-grid">
          <article class="work-item">
            <h3>Project Alpha</h3>
            <p>Enterprise SaaS platform serving 100k+ users</p>
          </article>
          <article class="work-item">
            <h3>Project Beta</h3>
            <p>Mobile-first e-commerce experience</p>
          </article>
        </div>
      </section>
      <section id="contact" class="section">
        <h2>Contact</h2>
        <p>Ready to build something great?</p>
        <p>
          Email: <a href="mailto:hello@studiotypo.com">hello@studiotypo.com</a>
        </p>
      </section>
    </main>

    <!-- Interaction Hint (READY state) -->
    <div id="hint" class="hint">Click a key or type TYPO</div>

    <!-- Main Script -->
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

### 1.5 Animations (animations.css)

```css
/* Fade animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* Slide animations */
@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Shimmer animation for key idle state */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Pulse for hint text */
@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* Classes */
.animate-in {
  animation: fadeIn var(--duration-normal) var(--ease-out) forwards;
}

.animate-out {
  animation: fadeOut var(--duration-normal) var(--ease-in) forwards;
}

.hint {
  animation: pulse 2s ease-in-out infinite;
}
```

### Deliverables - Phase 1:

- [x] All CSS files created with design system
- [x] HTML structure complete with placeholder content
- [x] Critical CSS inlined in head
- [x] iOS Safari dvh fix implemented
- [x] Font preloading configured (Google Fonts)
- [x] Mixpanel SDK loaded async
- [x] Skip link for accessibility

---

## Phase 2: 3D Scene Setup

### 2.1 Tree-Shaking Three.js Imports

**CRITICAL: Import only what's needed to reduce bundle size**

```javascript
// DO THIS - tree-shaking imports
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  Group,
  Vector2,
  Vector3,
  Raycaster,
  Clock,
  PMREMGenerator,
  Color,
  CanvasTexture,
} from "three";

// Import loaders from examples
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// DON'T DO THIS - imports entire library
// import * as THREE from 'three';
```

### 2.2 SceneManager.js

```javascript
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Clock,
  ACESFilmicToneMapping,
} from "three";
import { CONFIG } from "../config.js";
import { debounce } from "../utils/helpers.js";

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new Scene();
    this.camera = null;
    this.renderer = null;
    this.clock = new Clock();
    this.animationId = null;
    this.isPaused = false;
    this.onUpdate = null; // Callback for animation loop
  }

  init() {
    this.setupCamera();
    this.setupRenderer();
    this.setupEventListeners();
  }

  setupCamera() {
    const { fov, near, far, position } = CONFIG.scene.camera;
    const aspect = window.innerWidth / window.innerHeight;

    this.camera = new PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(position.x, position.y, position.z);
  }

  setupRenderer() {
    const { antialias, alpha, powerPreference } = CONFIG.scene.renderer;
    const maxPixelRatio = CONFIG.performance.maxPixelRatio;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias,
      alpha,
      powerPreference,
    });

    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, maxPixelRatio),
    );
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  setupEventListeners() {
    // Debounced resize handler
    const debouncedResize = debounce(
      this.handleResize.bind(this),
      CONFIG.performance.resizeDebounce,
    );
    window.addEventListener("resize", debouncedResize);

    // Visibility change - pause/resume when tab hidden
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });

    // WebGL context loss handling
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.handleContextLost();
    });

    this.canvas.addEventListener("webglcontextrestored", () => {
      this.handleContextRestored();
    });
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  handleContextLost() {
    console.warn("WebGL context lost");
    this.pause();
    // Show user message
    document.getElementById("loading").innerHTML = `
      <div class="error-message">
        <p>Graphics context lost. Please refresh the page.</p>
      </div>
    `;
    document.getElementById("loading").classList.remove("hidden");
  }

  handleContextRestored() {
    console.log("WebGL context restored");
    this.resume();
  }

  start(updateCallback) {
    this.onUpdate = updateCallback;
    this.animate();
  }

  animate() {
    if (this.isPaused) return;

    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Call update callback
    this.onUpdate?.(delta, elapsed);

    this.renderer.render(this.scene, this.camera);
  }

  pause() {
    this.isPaused = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.clock.start();
    this.animate();
  }

  dispose() {
    this.pause();

    // Dispose all scene objects
    this.scene.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        this.disposeMaterial(child.material);
      }
    });

    this.renderer.dispose();
  }

  disposeMaterial(material) {
    if (Array.isArray(material)) {
      material.forEach((m) => this.disposeMaterial(m));
      return;
    }

    // Dispose textures
    if (material.map) material.map.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.envMap) material.envMap.dispose();

    material.dispose();
  }
}
```

### 2.3 KeyModel.js with Shimmer Effect

```javascript
import {
  Group,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  CanvasTexture,
} from "three";
import { animate, easings } from "../utils/easing.js";
import { CONFIG } from "../config.js";

export class KeyModel {
  constructor(letter, position, isTypoKey = false) {
    this.letter = letter;
    this.position = { ...position };
    this.originalY = position.y;
    this.isTypoKey = isTypoKey;

    this.group = new Group();
    this.mesh = null;
    this.shimmerMesh = null; // For edge highlight effect

    this.isPressed = false;
    this.isHovered = false;
    this.isVisible = isTypoKey; // TYPO keys start visible

    this.shimmerOffset = Math.random() * Math.PI * 2; // Random start phase
  }

  create() {
    // Key cap geometry
    const geometry = new BoxGeometry(1, 0.4, 1);

    // Material with letter texture
    const material = new MeshStandardMaterial({
      color: 0x2a2a35,
      metalness: 0.8,
      roughness: 0.3,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.position.y = 0.2;

    // Create letter texture
    this.applyLetterTexture();

    // Create shimmer edge (thin ring around key)
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

  applyLetterTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#2A2A35";
    ctx.fillRect(0, 0, 128, 128);

    // Letter
    ctx.fillStyle = "#F4F4F5";
    ctx.font = "bold 64px Space Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.letter, 64, 64);

    const texture = new CanvasTexture(canvas);
    this.mesh.material.map = texture;
    this.mesh.material.needsUpdate = true;
  }

  createShimmerEdge() {
    // Create edge highlight geometry (slightly larger box, only edges visible)
    const edgeGeometry = new BoxGeometry(1.05, 0.42, 1.05);
    const edgeMaterial = new MeshStandardMaterial({
      color: 0x0080fe,
      emissive: 0x0080fe,
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
    });

    this.shimmerMesh = new Mesh(edgeGeometry, edgeMaterial);
    this.shimmerMesh.position.y = 0.2;
    this.group.add(this.shimmerMesh);
  }

  // Called every frame for idle shimmer animation
  updateShimmer(elapsed) {
    if (!this.isVisible || !this.shimmerMesh) return;

    // Moving highlight effect like game button prompts
    const phase = elapsed * 2 + this.shimmerOffset;
    const intensity = ((Math.sin(phase) + 1) / 2) * 0.3;

    this.shimmerMesh.material.emissiveIntensity = intensity;
    this.shimmerMesh.material.opacity = intensity * 0.5;
  }

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

  // Fade in for STUDIO keys reveal
  async reveal() {
    if (this.isVisible) return;

    this.group.visible = true;

    await animate(
      300,
      (progress) => {
        this.group.scale.setScalar(0.8 + 0.2 * progress);
        this.mesh.material.opacity = progress;
      },
      easings.easeOut,
    );

    this.isVisible = true;
  }

  hover(isHovering) {
    this.isHovered = isHovering;
    // Increase shimmer on hover
    if (this.shimmerMesh) {
      this.shimmerMesh.material.emissiveIntensity = isHovering ? 0.5 : 0;
    }
  }

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
```

### 2.4 Environment.js with HDR Loading

```javascript
import { PMREMGenerator, Color } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export class Environment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.envMap = null;
    this.pmremGenerator = null;
  }

  async load(url = null) {
    this.pmremGenerator = new PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    if (url) {
      // Load actual HDR file
      try {
        const rgbeLoader = new RGBELoader();
        const texture = await new Promise((resolve, reject) => {
          rgbeLoader.load(url, resolve, undefined, reject);
        });

        this.envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        texture.dispose(); // Dispose original to save memory
      } catch (error) {
        console.warn('Failed to load HDR, using fallback:', error);
        this.createFallbackEnv();
      }
    } else {
      // Use procedural fallback
      this.createFallbackEnv();
    }

    this.scene.environment = this.envMap;
    this.pmremGenerator.dispose();
  }

  createFallbackEnv() {
    // Create simple procedural environment
    const envScene = new (await import('three')).Scene();
    envScene.background = new Color(0x0A0A0F);

    this.envMap = this.pmremGenerator.fromScene(envScene, 0.04).texture;
  }

  dispose() {
    this.envMap?.dispose();
  }
}
```

### Deliverables - Phase 2:

- [x] SceneManager with tree-shaken imports
- [x] Debounced resize handler
- [x] Visibility change pause/resume
- [x] WebGL context loss handling
- [x] KeyModel with shimmer idle animation
- [x] Canvas texture for key letters
- [x] Environment with HDR loading + fallback
- [x] Proper disposal of all resources

---

## Phase 3: State Machine & Intro Sequence

### 3.1 App.js - State Machine with Re-entry Prevention

```javascript
import { CONFIG } from "./config.js";

const STATES = {
  LOADING: "loading",
  READY: "ready",
  INTRO: "intro",
  MAIN: "main",
  TRANSITIONING: "transitioning",
};

export class App {
  constructor() {
    this.state = STATES.LOADING;
    this.previousState = null;

    this.sceneManager = null;
    this.keyboardLayout = null;
    this.audioManager = null;
    this.introSequence = null;
    this.navigation = null;
    this.themeToggle = null;
    this.soundToggle = null;
    this.keyboardManager = null;
    this.interactionManager = null;
  }

  async init() {
    // ... initialization code
  }

  setState(newState) {
    // Prevent re-entry to same state
    if (this.state === newState) {
      console.warn(`Already in state: ${newState}`);
      return false;
    }

    // Validate transitions
    const validTransitions = {
      [STATES.LOADING]: [STATES.READY],
      [STATES.READY]: [STATES.INTRO],
      [STATES.INTRO]: [STATES.MAIN],
      [STATES.MAIN]: [STATES.TRANSITIONING],
      [STATES.TRANSITIONING]: [STATES.MAIN],
    };

    if (!validTransitions[this.state]?.includes(newState)) {
      console.warn(`Invalid transition: ${this.state} -> ${newState}`);
      return false;
    }

    this.previousState = this.state;
    this.state = newState;

    this.onStateChange(newState);
    return true;
  }

  onStateChange(newState) {
    switch (newState) {
      case STATES.READY:
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("hint").classList.remove("hidden");
        break;

      case STATES.INTRO:
        document.getElementById("hint").classList.add("hidden");
        break;

      case STATES.MAIN:
        document.getElementById("navigation").classList.remove("hidden");
        document.getElementById("content").classList.remove("hidden");
        break;
    }
  }

  triggerIntro(keyLetter) {
    // Prevent triggering if not in READY state
    if (this.state !== STATES.READY) {
      return;
    }

    if (!this.setState(STATES.INTRO)) {
      return;
    }

    this.introSequence.play(keyLetter);
  }
}
```

### 3.2 Easing Functions (Corrected to Match CSS)

**CRITICAL: These must match CSS cubic-bezier values exactly**

```javascript
// src/utils/easing.js

// Attempt to match CSS cubic-bezier(x1, y1, x2, y2)
// Using Bezier curve calculation
function cubicBezier(x1, y1, x2, y2) {
  return function (t) {
    // Newton-Raphson iteration to find t for given x
    const epsilon = 1e-6;
    let x = t;

    for (let i = 0; i < 8; i++) {
      const currentX = bezierX(x, x1, x2) - t;
      if (Math.abs(currentX) < epsilon) break;
      const derivative = bezierDerivativeX(x, x1, x2);
      if (Math.abs(derivative) < epsilon) break;
      x -= currentX / derivative;
    }

    return bezierY(x, y1, y2);
  };
}

function bezierX(t, x1, x2) {
  return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
}

function bezierY(t, y1, y2) {
  return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
}

function bezierDerivativeX(t, x1, x2) {
  return (
    3 * (1 - t) * (1 - t) * x1 +
    6 * (1 - t) * t * (x2 - x1) +
    3 * t * t * (1 - x2)
  );
}

export const easings = {
  // Matches CSS: cubic-bezier(0, 0, 0.2, 1)
  easeOut: cubicBezier(0, 0, 0.2, 1),

  // Matches CSS: cubic-bezier(0.4, 0, 1, 1)
  easeIn: cubicBezier(0.4, 0, 1, 1),

  // Matches CSS: cubic-bezier(0.4, 0, 0.2, 1)
  easeInOut: cubicBezier(0.4, 0, 0.2, 1),

  // Matches CSS: cubic-bezier(0.25, 0.46, 0.45, 0.94)
  keyPress: cubicBezier(0.25, 0.46, 0.45, 0.94),

  // Matches CSS: cubic-bezier(0.34, 1.2, 0.64, 1) - overshoot/bounce
  keyRelease: cubicBezier(0.34, 1.2, 0.64, 1),

  // Linear
  linear: (t) => t,
};

// Generic animation function
export function animate(duration, callback, easing = easings.easeOut) {
  return new Promise((resolve) => {
    const startTime = performance.now();

    function tick(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      callback(easedProgress);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(tick);
  });
}
```

### 3.3 IntroSequence.js (STUDIO Keys Fade In Place)

```javascript
import { CONFIG } from "../config.js";
import { STATES } from "./App.js";

export class IntroSequence {
  constructor(app) {
    this.app = app;
    this.isPlaying = false;
  }

  async play(triggeredKey) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const { steps } = CONFIG.intro;

    // 0.0s - Initialize audio, start typing loop
    await this.app.audioManager.init();
    this.app.audioManager.startTypingLoop();

    // 0.2s - Press the triggered key (TYPO key only)
    await this.wait(steps.keyPress);
    const key = this.app.keyboardLayout.getTypoKey(triggeredKey);
    key.press();
    this.app.audioManager.playKeyPress();

    // 0.4s - Release key
    await this.wait(steps.keyRelease - steps.keyPress);
    key.release();

    // 0.6s-1.1s - STUDIO keys fade in place (staggered, left to right)
    await this.wait(steps.studioRevealStart - steps.keyRelease);

    const studioLetters = ["S", "T", "U", "D", "I", "O"];
    for (const letter of studioLetters) {
      const studioKey = this.app.keyboardLayout.getStudioKey(letter);
      studioKey.reveal(); // Fade in at current position
      this.app.audioManager.playKeyPress();
      await this.wait(CONFIG.timing.studioRevealStagger);
    }

    // 1.5s - Brief pause, all keys visible
    await this.wait(
      steps.slideStart -
        (steps.studioRevealStart +
          studioLetters.length * CONFIG.timing.studioRevealStagger),
    );

    // 2.0s - Slide entire arrangement right (keys move, camera static)
    this.app.keyboardLayout.slideRight(
      CONFIG.layout.slideDistance,
      CONFIG.timing.slideRightDuration,
    );

    // 2.8s - Navigation fades in
    await this.wait(steps.navReveal - steps.slideStart);
    this.app.navigation.reveal();

    // 3.5s - Complete
    await this.wait(CONFIG.intro.totalDuration - steps.navReveal);

    this.isPlaying = false;
    this.app.setState(STATES.MAIN);
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Deliverables - Phase 3:

- [x] App.js with state re-entry prevention
- [x] Valid transition enforcement
- [x] Corrected easing functions matching CSS cubic-bezier
- [x] IntroSequence with fade-in-place for STUDIO keys
- [x] Proper timing coordination from config

---

## Phase 4: Audio System

### 4.1 AudioManager.js with Error Handling & Topre Sound

```javascript
import { CONFIG } from "../config.js";

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.typingLoopSource = null;
    this.typingLoopBuffer = null;
    this.keyPressBuffer = null;
    this.enabled = true;
    this.initialized = false;
    this.typingLoopTimeout = null;
  }

  async init() {
    if (this.initialized) return;

    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.masterGain.gain.value = CONFIG.audio.masterVolume;

      // Resume context (required after user interaction)
      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      this.enabled = false;
    }
  }

  async loadSounds() {
    try {
      // Try to load actual audio files
      const [loopBuffer, pressBuffer] = await Promise.all([
        this.loadSound("/assets/audio/typing-loop.mp3"),
        this.loadSound("/assets/audio/key-press.mp3"),
      ]);

      this.typingLoopBuffer = loopBuffer;
      this.keyPressBuffer = pressBuffer;
    } catch (error) {
      console.warn("Audio files not found, using synthetic sounds");
      // Will use synthetic sounds as fallback
    }
  }

  async loadSound(url) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return await this.context.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn(`Failed to load audio: ${url}`, error);
      return null;
    }
  }

  startTypingLoop() {
    if (!this.enabled || !this.initialized) return;

    if (this.typingLoopBuffer) {
      // Use loaded audio
      this.typingLoopSource = this.context.createBufferSource();
      this.typingLoopSource.buffer = this.typingLoopBuffer;
      this.typingLoopSource.loop = true;

      const loopGain = this.context.createGain();
      loopGain.gain.setValueAtTime(0, this.context.currentTime);
      loopGain.gain.linearRampToValueAtTime(
        CONFIG.audio.loopVolume,
        this.context.currentTime + CONFIG.audio.fadeInDuration / 1000,
      );

      this.typingLoopSource.connect(loopGain);
      loopGain.connect(this.masterGain);
      this.typingLoopSource.start();
    } else {
      // Use synthetic typing loop
      this.startSyntheticTypingLoop();
    }
  }

  stopTypingLoop() {
    if (this.typingLoopSource) {
      this.typingLoopSource.stop();
      this.typingLoopSource.disconnect();
      this.typingLoopSource = null;
    }

    if (this.typingLoopTimeout) {
      clearTimeout(this.typingLoopTimeout);
      this.typingLoopTimeout = null;
    }
  }

  playKeyPress() {
    if (!this.enabled || !this.initialized) return;

    if (this.keyPressBuffer) {
      this.playBuffer(this.keyPressBuffer);
    } else {
      this.createSyntheticTopreSound();
    }
  }

  playBuffer(buffer) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Slight pitch variation for realism
    source.playbackRate.value = 0.95 + Math.random() * 0.1;

    const pressGain = this.context.createGain();
    pressGain.gain.value = CONFIG.audio.keyPressVolume;

    source.connect(pressGain);
    pressGain.connect(this.masterGain);
    source.start();

    // Auto cleanup
    source.onended = () => {
      source.disconnect();
      pressGain.disconnect();
    };
  }

  // Topre/Membrane style - thocky, deeper, muted
  createSyntheticTopreSound() {
    if (!this.context) return;

    // Low frequency thock
    const osc1 = this.context.createOscillator();
    const gain1 = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    // Deep thock character
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(
      150 + Math.random() * 30,
      this.context.currentTime,
    );
    osc1.frequency.exponentialRampToValueAtTime(
      60,
      this.context.currentTime + 0.08,
    );

    // Low-pass filter for muted sound
    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.Q.value = 1;

    // Quick attack, medium decay (thock)
    gain1.gain.setValueAtTime(0, this.context.currentTime);
    gain1.gain.linearRampToValueAtTime(0.4, this.context.currentTime + 0.005);
    gain1.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + 0.15,
    );

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start();
    osc1.stop(this.context.currentTime + 0.15);

    // Add subtle click layer
    const osc2 = this.context.createOscillator();
    const gain2 = this.context.createGain();

    osc2.type = "square";
    osc2.frequency.setValueAtTime(2000, this.context.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(
      500,
      this.context.currentTime + 0.02,
    );

    gain2.gain.setValueAtTime(0.05, this.context.currentTime);
    gain2.gain.exponentialRampToValueAtTime(
      0.001,
      this.context.currentTime + 0.03,
    );

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc2.start();
    osc2.stop(this.context.currentTime + 0.03);
  }

  startSyntheticTypingLoop() {
    const scheduleNextKey = () => {
      if (!this.enabled) {
        this.typingLoopTimeout = null;
        return;
      }

      this.createSyntheticTopreSound();

      // Random interval for natural typing rhythm
      const nextDelay = 100 + Math.random() * 150;
      this.typingLoopTimeout = setTimeout(scheduleNextKey, nextDelay);
    };

    // Start with slight delay
    this.typingLoopTimeout = setTimeout(scheduleNextKey, 500);
  }

  setEnabled(enabled) {
    this.enabled = enabled;

    // Fade instead of abrupt cut
    if (this.masterGain && this.context) {
      this.masterGain.gain.linearRampToValueAtTime(
        enabled ? CONFIG.audio.masterVolume : 0,
        this.context.currentTime + CONFIG.audio.fadeOutDuration / 1000,
      );
    }

    // Stop/resume typing loop
    if (!enabled) {
      this.stopTypingLoop();
    }

    // Persist preference
    localStorage.setItem("studio-typo-sound", String(enabled));
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  dispose() {
    this.stopTypingLoop();
    this.context?.close();
  }
}
```

### Deliverables - Phase 4:

- [x] AudioManager with error handling
- [x] Try/catch for audio loading failures
- [x] Topre/Membrane style synthetic sounds
- [x] Proper typing loop cleanup on disable
- [x] Sound toggle with persistence

---

## Phase 5-10: UI, Keyboard, Utilities, Loading, Responsive, Polish

_(These phases remain largely the same as the original plan with the following key additions)_

### Additional Critical Items to Implement:

#### Utility: Debounce Helper

```javascript
// src/utils/helpers.js
export function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

#### Analytics with Mixpanel SDK Loading

```javascript
// src/utils/analytics.js
class Analytics {
  constructor() {
    this.initialized = false;
  }

  init(token) {
    // Mixpanel is loaded async in HTML
    if (typeof window.mixpanel !== "undefined") {
      window.mixpanel.init(token, {
        debug: import.meta.env.DEV,
        track_pageview: false, // We'll track manually
      });
      this.initialized = true;
      this.trackPageLoad();
    } else {
      console.warn("Mixpanel SDK not loaded");
    }
  }

  track(event, properties = {}) {
    if (!this.initialized) return;

    window.mixpanel.track(event, {
      ...properties,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }

  trackPageLoad() {
    this.track("Page Load", {
      referrer: document.referrer,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    });
  }

  trackIntroTriggered(method) {
    this.track("Intro Triggered", { method });
  }

  trackNavigation(section) {
    this.track("Navigation", { section });
  }

  trackThemeToggle(theme) {
    this.track("Theme Toggle", { theme });
  }

  trackSoundToggle(enabled) {
    this.track("Sound Toggle", { enabled });
  }

  trackError(type, message) {
    this.track("Error", { type, message });
  }
}

export const analytics = new Analytics();
```

---

## Git Workflow

### Branch Strategy

```
master          - Production-ready code
├── develop     - Integration branch
    ├── feature/phase-0-init
    ├── feature/phase-1-foundation
    ├── feature/phase-2-3d-scene
    ├── feature/phase-3-intro
    ├── feature/phase-4-audio
    ├── feature/phase-5-ui
    ├── feature/phase-6-keyboard
    ├── feature/phase-7-utils
    ├── feature/phase-8-loading
    ├── feature/phase-9-responsive
    └── feature/phase-10-polish
```

### Commit Convention

```
feat(scope): add new feature
fix(scope): fix bug
refactor(scope): code refactoring
style(scope): styling changes
docs(scope): documentation
test(scope): testing
chore(scope): maintenance
```

---

## GitHub Pages Deployment

### Setup

```bash
# Install gh-pages for deployment
npm install -D gh-pages

# Add to package.json scripts:
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

### Vite Config for GitHub Pages

Already configured in Phase 0 with `base: '/studio-typo-website/'`

### Deploy Command

```bash
npm run deploy
```

---

## Success Criteria

1. First meaningful paint under 1.5 seconds
2. Smooth 60fps animations throughout
3. Interactive under 3 seconds
4. Bundle under 200KB gzipped (use tree-shaking)
5. Works on all modern browsers including iOS Safari
6. Fully accessible (WCAG AA)
7. Graceful fallbacks for WebGL/audio failures
8. Premium, polished feel with Topre-style sounds
9. Shimmer highlight animation on keys
10. Proper pause/resume on tab visibility change

---

## Review Checklist (From Technical Review)

### Must Fix Before Implementation

- [x] Tree-shaking Three.js imports
- [x] HDR loading with RGBELoader + fallback
- [x] Audio error handling
- [x] WebGL context loss handling
- [x] iOS Safari 100vh/dvh fix
- [x] Visibility change listener for pause/resume
- [x] Corrected easing functions
- [x] Texture disposal in cleanup
- [x] Resize debouncing
- [x] State machine re-entry prevention
- [x] Inline critical CSS
- [x] Mixpanel SDK loading
- [x] Centralized config.js

### Clarified Decisions

- [x] STUDIO keys: Fade in place
- [x] Idle animation: Shimmer highlight
- [x] Duplicate keys: TYPO key only
- [x] Sound style: Topre/Membrane
- [x] Camera: Static (keys slide)
- [x] Deployment: GitHub Pages
