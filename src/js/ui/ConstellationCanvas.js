/**
 * ConstellationCanvas - Three cluster nodes rotating in a triangle.
 * Steps between positions with easing, pauses, and hover control.
 * The bottom node automatically reveals its skills list.
 */

import { CLUSTERS } from "../data/constellation.js";
import { isTouchDevice, prefersReducedMotion } from "../utils/device.js";

const STEP_ANGLE = (2 * Math.PI) / 3; // 120 degrees per step
const PAUSE_DURATION = 2; // seconds to pause at each position
const EASE_SPEED = 5; // interpolation speed (higher = snappier)
const SNAP_THRESHOLD = 0.01; // radians — close enough to snap
const ORBIT_R = 0.25; // single radius for equilateral triangle
const EXPAND_SPEED = 3;
const NAV_OFFSET = 80; // shift center right to account for left nav

export class ConstellationCanvas {
  constructor(containerEl) {
    this.container = containerEl;
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "width:100%;height:100%;display:block;";
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.width = 0;
    this.height = 0;
    this.animId = null;
    this.lastTime = 0;
    this.elapsed = 0;
    this.active = false;
    this.isTouch = isTouchDevice();
    this.reducedMotion = prefersReducedMotion();

    // Stepped rotation state
    this.rotationAngle = 0; // current animated rotation
    this.targetAngle = 0; // target rotation (snaps in STEP_ANGLE increments)
    this.pauseTimer = PAUSE_DURATION; // countdown until next step
    this.isSettled = true; // true when rotation has reached target

    // Interaction state
    this.hoveredCluster = null;
    this.isHovering = false;
    this.bottomCluster = null;
    this.expandedCluster = null;
    this.expandProgress = 0;

    // Pre-compute skill lists per cluster
    this.skillsMap = new Map();
    for (const c of CLUSTERS) {
      this.skillsMap.set(c.id, c.skills);
    }

    // Colors
    this.colors = {};
    this.readColors();

    // Setup
    this.resize();

    // Events
    this.boundResize = () => this.resize();
    this.boundPointerMove = (e) => this.onPointerMove(e);
    this.boundPointerLeave = () => this.onPointerLeave();

    window.addEventListener("resize", this.boundResize);
    this.canvas.addEventListener("pointermove", this.boundPointerMove);
    this.canvas.addEventListener("pointerleave", this.boundPointerLeave);

    // Visibility observer
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) this.start();
        else this.stop();
      },
      { threshold: 0.1 },
    );
    this.observer.observe(this.container);

    // Theme observer
    this.themeObserver = new MutationObserver(() => this.readColors());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  readColors() {
    const s = getComputedStyle(document.documentElement);
    this.colors = {
      textPrimary: s.getPropertyValue("--text-primary").trim(),
      textSecondary: s.getPropertyValue("--text-secondary").trim(),
      textTertiary: s.getPropertyValue("--text-tertiary").trim(),
      border: s.getPropertyValue("--border-primary").trim(),
      squiggly: s.getPropertyValue("--typo-squiggly").trim(),
      font:
        s.getPropertyValue("--font-mono").trim() || "'Space Mono', monospace",
    };
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop() {
    this.active = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  tick() {
    if (!this.active) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.elapsed += dt;

    // --- Stepped rotation logic ---
    if (!this.reducedMotion) {
      const diff = this.targetAngle - this.rotationAngle;

      if (Math.abs(diff) > SNAP_THRESHOLD) {
        // Ease toward target (exponential ease-out)
        this.rotationAngle += diff * EASE_SPEED * dt;
        this.isSettled = false;
      } else {
        // Snap and mark as settled
        this.rotationAngle = this.targetAngle;
        if (!this.isSettled) {
          this.isSettled = true;
          this.pauseTimer = PAUSE_DURATION;
        }

        // Count down pause, then advance to next step
        if (!this.isHovering) {
          this.pauseTimer -= dt;
          if (this.pauseTimer <= 0) {
            this.targetAngle += STEP_ANGLE;
            this.isSettled = false;
          }
        }
      }
    }

    // --- Determine bottom node ---
    const positions = CLUSTERS.map((c, i) => this.getClusterPos(i));
    let bottomIdx = 0;
    for (let i = 1; i < CLUSTERS.length; i++) {
      if (positions[i].y > positions[bottomIdx].y) bottomIdx = i;
    }
    const newBottom = CLUSTERS[bottomIdx].id;

    if (newBottom !== this.bottomCluster) {
      this.bottomCluster = newBottom;
      this.expandedCluster = newBottom;
      this.expandProgress = 0;
    }

    // Animate expand
    if (this.expandedCluster) {
      this.expandProgress = Math.min(
        1,
        this.expandProgress + dt * EXPAND_SPEED,
      );
    }

    this.draw();
    this.animId = requestAnimationFrame(() => this.tick());
  }

  /**
   * Calculate the target angle that places a given cluster index at the bottom.
   * Bottom = angle of PI/2 for that node.
   */
  getTargetAngleForBottom(index) {
    const baseAngle = (index * 2 * Math.PI) / 3 + Math.PI / 2;
    // We want baseAngle + target = PI/2 + k*2PI (bottom)
    // target = PI/2 - baseAngle
    let desired = Math.PI / 2 - baseAngle;

    // Find the nearest forward rotation from current targetAngle
    while (desired < this.targetAngle) {
      desired += 2 * Math.PI;
    }
    // Pick the closest direction (forward or just slightly back)
    const forwardDist = desired - this.targetAngle;
    const backDist = forwardDist - 2 * Math.PI;
    if (Math.abs(backDist) < forwardDist) {
      desired = this.targetAngle + backDist;
    }

    return desired;
  }

  getClusterPos(index) {
    const cx = (this.width + NAV_OFFSET) / 2;
    const cy = this.height * 0.38;
    const r = Math.min(this.width, this.height) * ORBIT_R;

    const baseAngle = (index * 2 * Math.PI) / 3 + Math.PI / 2;
    const angle = baseAngle + this.rotationAngle;

    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  }

  draw() {
    const { ctx, width, height, elapsed } = this;
    ctx.clearRect(0, 0, width, height);

    // Heading at top right
    ctx.fillStyle = this.colors.textPrimary;
    ctx.globalAlpha = 0.7;
    ctx.font = `bold 20px ${this.colors.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Let's Build.", (width + NAV_OFFSET) / 2, height * 0.38);
    ctx.globalAlpha = 1;

    const positions = CLUSTERS.map((c, i) => this.getClusterPos(i));

    // Draw connecting curves (outward-bowing arcs)
    const center = {
      x: (positions[0].x + positions[1].x + positions[2].x) / 3,
      y: (positions[0].y + positions[1].y + positions[2].y) / 3,
    };
    const bulge = 1.3;
    ctx.strokeStyle = this.colors.textSecondary;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;

    const edges = [
      [0, 1],
      [1, 2],
      [2, 0],
    ];
    for (const [a, b] of edges) {
      const A = positions[a];
      const B = positions[b];
      const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const dx = mid.x - center.x;
      const dy = mid.y - center.y;
      const cp = { x: mid.x + dx * bulge, y: mid.y + dy * bulge };
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo(cp.x, cp.y, B.x, B.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw each cluster node
    for (let i = 0; i < CLUSTERS.length; i++) {
      const cluster = CLUSTERS[i];
      const pos = positions[i];
      const isHovered = this.hoveredCluster === cluster.id;
      const isExpanded = this.expandedCluster === cluster.id;
      const isOther = this.expandedCluster && !isExpanded;

      // Breathing radius
      const breathe = this.reducedMotion
        ? 0
        : Math.sin(elapsed * 1.2 + i * 2.1) * 2;
      const baseRadius = 18;
      const radius = baseRadius + breathe + (isHovered ? 3 : 0);

      const alpha = 1;

      if (isExpanded) {
        // Red squiggly circle for active node
        this.drawSquigglyCircle(pos.x, pos.y, radius, elapsed, alpha);
      } else {
        // Outer glow ring
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.textPrimary;
        ctx.globalAlpha = alpha * (isHovered ? 0.08 : 0.03);
        ctx.fill();

        // Main circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.colors.textPrimary;
        ctx.globalAlpha = alpha * (isHovered ? 0.7 : 0.4);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Small filled center dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = isExpanded
        ? this.colors.squiggly
        : this.colors.textPrimary;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fill();

      // Cluster label — dynamic positioning based on current position
      ctx.globalAlpha = alpha * (isExpanded ? 1.0 : isHovered ? 0.9 : 0.7);
      ctx.fillStyle = this.colors.textPrimary;
      ctx.font = `bold 18px ${this.colors.font}`;

      const lines = cluster.label.split("\n");
      const lineHeight = 24;

      const align = this.getLabelAlign(pos);

      if (align === "right") {
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        for (let l = 0; l < lines.length; l++) {
          const y =
            pos.y - ((lines.length - 1) * lineHeight) / 2 + l * lineHeight;
          ctx.fillText(lines[l], pos.x + radius + 16, y);
        }
      } else if (align === "left") {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (let l = 0; l < lines.length; l++) {
          const y =
            pos.y - ((lines.length - 1) * lineHeight) / 2 + l * lineHeight;
          ctx.fillText(lines[l], pos.x - radius - 16, y);
        }
      } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let l = 0; l < lines.length; l++) {
          ctx.fillText(lines[l], pos.x, pos.y + radius + 16 + l * lineHeight);
        }
      }

      // Draw child skills if this cluster is the bottom (expanded) one
      if (isExpanded && this.expandProgress > 0) {
        this.drawSkills(cluster, pos, radius);
      }
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw a wavy/squiggly red circle — the brand's typo signature.
   */
  drawSquigglyCircle(cx, cy, radius, elapsed, alpha) {
    const { ctx } = this;
    const waveFreq = 12; // number of waves around the circle
    const amplitude = 1.2; // wave height in pixels
    const steps = 120; // smoothness

    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const angle = (s / steps) * Math.PI * 2;
      const wave = Math.sin(angle * waveFreq + elapsed * 3) * amplitude;
      const r = radius + wave;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = this.colors.squiggly;
    ctx.globalAlpha = alpha * 0.85;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  getLabelAlign(pos) {
    const cx = (this.width + NAV_OFFSET) / 2;
    const cy = this.height * 0.38;

    if (pos.y > cy + this.height * 0.12) {
      return "bottom";
    }
    return pos.x < cx ? "left" : "right";
  }

  drawSkills(cluster, pos, nodeRadius) {
    const { ctx } = this;
    const skills = this.skillsMap.get(cluster.id);
    const ep = this.expandProgress;
    const lineHeight = 24;
    const gap = 16;

    const labelLines = cluster.label.split("\n").length;
    const labelOffset = nodeRadius + 16 + labelLines * 18 + gap;

    for (let i = 0; i < skills.length; i++) {
      const stagger = i * 0.1;
      const skillAlpha = Math.max(0, Math.min(1, (ep - stagger) * 3));
      if (skillAlpha <= 0) continue;

      ctx.fillStyle = this.colors.textSecondary;
      ctx.globalAlpha = skillAlpha * 0.9;
      ctx.font = `12px ${this.colors.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const y = pos.y + labelOffset + i * lineHeight;
      ctx.fillText(skills[i], pos.x, y);
    }
  }

  hitTestCluster(px, py) {
    const hitRadius = this.isTouch ? 40 : 30;
    for (let i = 0; i < CLUSTERS.length; i++) {
      const pos = this.getClusterPos(i);
      const dx = px - pos.x;
      const dy = py - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        return { id: CLUSTERS[i].id, index: i };
      }
    }
    return null;
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  onPointerMove(e) {
    const { x, y } = this.getCanvasCoords(e);
    const hit = this.hitTestCluster(x, y);

    if (hit) {
      this.hoveredCluster = hit.id;
      this.isHovering = true;
      this.canvas.style.cursor = "pointer";

      // If hovering a node that isn't at the bottom, rotate it there
      if (hit.id !== this.bottomCluster) {
        this.targetAngle = this.getTargetAngleForBottom(hit.index);
        this.isSettled = false;
      }
    } else {
      this.hoveredCluster = null;
      this.isHovering = false;
      this.canvas.style.cursor = "default";
    }
  }

  onPointerLeave() {
    this.hoveredCluster = null;
    this.isHovering = false;
    this.canvas.style.cursor = "default";
    // Resume auto-rotation after a pause
    this.pauseTimer = PAUSE_DURATION;
  }

  activate() {
    this.readColors();
    if (this.width === 0) this.resize();
    this.start();
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this.boundResize);
    this.canvas.removeEventListener("pointermove", this.boundPointerMove);
    this.canvas.removeEventListener("pointerleave", this.boundPointerLeave);
    this.observer?.disconnect();
    this.themeObserver?.disconnect();
    this.canvas.remove();
  }
}
