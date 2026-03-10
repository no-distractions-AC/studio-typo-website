/**
 * ConstellationCanvas - Three cluster nodes in a triangle with click-to-reveal skills.
 * Simple, readable, no physics. Just clean positioning and smooth animation.
 */

import { CLUSTERS, getSkillsForCluster } from "../data/constellation.js";
import { isTouchDevice, prefersReducedMotion } from "../utils/device.js";

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

    // Interaction state
    this.hoveredCluster = null;
    this.expandedCluster = null;
    this.expandProgress = 0; // 0 = collapsed, 1 = expanded

    // Pre-compute skill lists per cluster
    this.skillsMap = new Map();
    for (const c of CLUSTERS) {
      this.skillsMap.set(c.id, getSkillsForCluster(c.id));
    }

    // Colors
    this.colors = {};
    this.readColors();

    // Setup
    this.resize();

    // Events
    this.boundResize = () => this.resize();
    this.boundPointerMove = (e) => this.onPointerMove(e);
    this.boundPointerDown = (e) => this.onPointerDown(e);

    window.addEventListener("resize", this.boundResize);
    this.canvas.addEventListener("pointermove", this.boundPointerMove);
    this.canvas.addEventListener("pointerdown", this.boundPointerDown);

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

    // Animate expand/collapse
    if (this.expandedCluster) {
      this.expandProgress = Math.min(1, this.expandProgress + dt * 3);
    } else {
      this.expandProgress = Math.max(0, this.expandProgress - dt * 4);
    }

    this.draw();
    this.animId = requestAnimationFrame(() => this.tick());
  }

  getClusterPos(cluster) {
    return {
      x: cluster.cx * this.width,
      y: cluster.cy * this.height,
    };
  }

  draw() {
    const { ctx, width, height, elapsed } = this;
    ctx.clearRect(0, 0, width, height);

    const positions = CLUSTERS.map((c) => this.getClusterPos(c));

    // Draw connecting lines (triangle)
    ctx.beginPath();
    ctx.moveTo(positions[0].x, positions[0].y);
    ctx.lineTo(positions[1].x, positions[1].y);
    ctx.lineTo(positions[2].x, positions[2].y);
    ctx.closePath();
    ctx.strokeStyle = this.colors.border;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 1;
    ctx.stroke();
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

      // Dim non-expanded clusters when one is expanded
      const alpha = isOther ? 1 - this.expandProgress * 0.5 : 1;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = this.colors.textPrimary;
      ctx.globalAlpha = alpha * (isHovered || isExpanded ? 0.08 : 0.03);
      ctx.fill();

      // Main circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.colors.textPrimary;
      ctx.globalAlpha = alpha * (isHovered || isExpanded ? 0.7 : 0.4);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Small filled center dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = this.colors.textPrimary;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fill();

      // Cluster label
      ctx.globalAlpha = alpha * (isHovered || isExpanded ? 0.9 : 0.6);
      ctx.fillStyle = this.colors.textPrimary;
      ctx.font = `bold 13px ${this.colors.font}`;

      const lines = cluster.label.split("\n");
      const lineHeight = 18;

      if (cluster.labelAlign === "right") {
        // Label to the right
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        for (let l = 0; l < lines.length; l++) {
          const y =
            pos.y - ((lines.length - 1) * lineHeight) / 2 + l * lineHeight;
          ctx.fillText(lines[l], pos.x + radius + 16, y);
        }
      } else if (cluster.labelAlign === "left") {
        // Label to the left
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (let l = 0; l < lines.length; l++) {
          const y =
            pos.y - ((lines.length - 1) * lineHeight) / 2 + l * lineHeight;
          ctx.fillText(lines[l], pos.x - radius - 16, y);
        }
      } else {
        // Label below (center-aligned)
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let l = 0; l < lines.length; l++) {
          ctx.fillText(lines[l], pos.x, pos.y + radius + 16 + l * lineHeight);
        }
      }

      // Draw child skills if this cluster is expanded
      if (isExpanded && this.expandProgress > 0) {
        this.drawSkills(cluster, pos, radius);
      }
    }

    ctx.globalAlpha = 1;
  }

  drawSkills(cluster, pos, nodeRadius) {
    const { ctx } = this;
    const skills = this.skillsMap.get(cluster.id);
    const ep = this.expandProgress;
    const lineHeight = 20;
    const gap = 12;

    ctx.font = `11px ${this.colors.font}`;

    for (let i = 0; i < skills.length; i++) {
      // Stagger fade-in: each skill fades in slightly after the previous
      const stagger = i * 0.08;
      const skillAlpha = Math.max(0, Math.min(1, (ep - stagger) * 3));
      if (skillAlpha <= 0) continue;

      const skill = skills[i];
      // Mark shared skills with a different color
      const isShared = skill.clusters.length > 1;

      ctx.fillStyle = isShared
        ? this.colors.textTertiary
        : this.colors.textSecondary;
      ctx.globalAlpha = skillAlpha * 0.85;

      if (cluster.labelAlign === "right") {
        // Skills listed to the right, below the label
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const x = pos.x + nodeRadius + 16;
        const y = pos.y + 30 + i * lineHeight;
        ctx.fillText(skill.label, x, y);
      } else if (cluster.labelAlign === "left") {
        // Skills listed to the left, below the label
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const x = pos.x - nodeRadius - 16;
        const y = pos.y + 30 + i * lineHeight;
        ctx.fillText(skill.label, x, y);
      } else {
        // Skills listed below the label
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelLines = cluster.label.split("\n").length;
        const labelOffset = nodeRadius + 16 + labelLines * 18 + gap;
        const y = pos.y + labelOffset + i * lineHeight;
        ctx.fillText(skill.label, pos.x, y);
      }
    }
  }

  hitTestCluster(px, py) {
    const hitRadius = this.isTouch ? 40 : 30;
    for (const cluster of CLUSTERS) {
      const pos = this.getClusterPos(cluster);
      const dx = px - pos.x;
      const dy = py - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        return cluster.id;
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
    this.hoveredCluster = hit;
    this.canvas.style.cursor = hit ? "pointer" : "default";
  }

  onPointerDown(e) {
    const { x, y } = this.getCanvasCoords(e);
    const hit = this.hitTestCluster(x, y);

    if (hit) {
      // Toggle: click same cluster to collapse, different to switch
      this.expandedCluster = this.expandedCluster === hit ? null : hit;
    } else {
      // Click background to collapse
      this.expandedCluster = null;
    }
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
    this.canvas.removeEventListener("pointerdown", this.boundPointerDown);
    this.observer?.disconnect();
    this.themeObserver?.disconnect();
    this.canvas.remove();
  }
}
