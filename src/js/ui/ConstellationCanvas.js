/**
 * ConstellationCanvas — Vertical services list with line-draw SVG icons.
 *
 * Each pillar (Creativity, Engineering, Product) is a section with:
 * - SVG icon that continuously traces/redraws itself
 * - Skills always visible, staggered entrance on scroll
 * - Cycling tagline suffix ("products", "worlds", "systems")
 *
 * Keeps the same constructor/activate/dispose interface for App.js compatibility.
 */

import { CLUSTERS } from "../data/constellation.js";
import { prefersReducedMotion, isMobile } from "../utils/device.js";
import { getTimings } from "./TypoRotator.js";

// SVG path data for each icon. Multiple paths per icon for staggered draw.
const ICON_PATHS = {
  creative: [
    // 4-point star
    "M 14 1 L 17 11 L 27 14 L 17 17 L 14 27 L 11 17 L 1 14 L 11 11 Z",
    // Inner diamond
    "M 14 8 L 18 14 L 14 20 L 10 14 Z",
  ],
  engineering: [
    // Left bracket
    "M 9 5 L 3 14 L 9 23",
    // Right bracket
    "M 19 5 L 25 14 L 19 23",
    // Slash
    "M 13 22 L 15 6",
  ],
  product: [
    // Trend line
    "M 2 22 L 9 15 L 15 18 L 26 5",
    // Arrow head
    "M 21 5 L 26 5 L 26 10",
  ],
};

const CYCLING_WORDS = ["products", "experiences", "tools"];
// Each word's color matches its pillar: product, creative, engineering
const CYCLING_COLORS = ["#2dd4bf", "#a78bfa", "#34d399"];
const PAUSE_FULL_MS = 2500;
const PAUSE_EMPTY_MS = 150;

export class ConstellationCanvas {
  constructor(containerEl) {
    this.container = containerEl;
    this.container.classList.add("services-grid");
    this.reducedMotion = prefersReducedMotion();
    this.mobile = isMobile();
    this.cycleIndex = 0;
    this.cycleTimer = null;
    this.hasEntered = false;

    this.buildDOM();

    // Entrance observer
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!this.hasEntered) {
            this.container.classList.add("visible");
            this.hasEntered = true;
          }
          this.startCycling();
        } else {
          this.stopCycling();
        }
      },
      { threshold: 0.15 },
    );
    this.observer.observe(this.container);
  }

  buildDOM() {
    // Tagline
    const tagline = document.createElement("h2");
    tagline.className = "services-tagline";
    tagline.textContent = "We help you build ";

    this.suffixEl = document.createElement("span");
    this.suffixEl.className = "services-tagline-suffix";
    this.suffixEl.textContent = CYCLING_WORDS[0];
    this.suffixEl.style.color = CYCLING_COLORS[0];
    tagline.appendChild(this.suffixEl);

    this.container.appendChild(tagline);

    // Pillars list
    const list = document.createElement("div");
    list.className = "services-list";

    for (let i = 0; i < CLUSTERS.length; i++) {
      const cluster = CLUSTERS[i];
      const pillar = this.buildPillar(cluster, i);
      list.appendChild(pillar);
    }

    this.container.appendChild(list);
  }

  buildPillar(cluster, index) {
    const pillar = document.createElement("div");
    pillar.className = "service-pillar";
    pillar.style.setProperty("--pillar-accent", cluster.accent);

    // Header: icon + label (vertical stack)
    const header = document.createElement("div");
    header.className = "service-pillar-header";

    // SVG line-draw icon
    const paths = ICON_PATHS[cluster.id] || [];
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 28 28");
    svg.setAttribute("fill", "none");
    svg.classList.add("service-pillar-icon");
    svg.style.setProperty("--pillar-index", index);

    paths.forEach((d, i) => {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      // Set dasharray/offset after mount so we can measure length
      path.style.setProperty("--path-index", i);
      svg.appendChild(path);
    });

    header.appendChild(svg);

    // After mount: measure path lengths and kick off draw animation
    requestAnimationFrame(() => {
      svg.querySelectorAll("path").forEach((path, i) => {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.setProperty("--dash-len", len);
        path.style.setProperty("--path-index", i);
        path.classList.add("draw-active");
      });
    });

    const label = document.createElement("div");
    label.className = "service-pillar-label";
    label.textContent = cluster.label;
    header.appendChild(label);

    pillar.appendChild(header);

    // Divider
    const divider = document.createElement("div");
    divider.className = "service-pillar-divider";
    pillar.appendChild(divider);

    // Skills
    const skills = document.createElement("div");
    skills.className = "service-pillar-skills";

    for (const skill of cluster.skills) {
      const skillEl = document.createElement("span");
      skillEl.className = "service-skill";
      skillEl.textContent = skill;
      skills.appendChild(skillEl);
    }

    pillar.appendChild(skills);

    return pillar;
  }

  startCycling() {
    if (this._cycling || this.reducedMotion) return;
    this._cycling = true;

    // Add blinking cursor after suffix
    this._cursor = document.createElement("span");
    this._cursor.className = "typing-cursor";
    this.suffixEl.after(this._cursor);

    this._runCycle();
  }

  async _runCycle() {
    while (this._cycling) {
      const t = getTimings();

      // Pause with completed word visible
      await this._wait(PAUSE_FULL_MS);
      if (!this._cycling) return;

      // Backspace current word letter by letter
      const current = CYCLING_WORDS[this.cycleIndex];
      for (let i = current.length; i > 0; i--) {
        if (!this._cycling) return;
        this.suffixEl.textContent = current.slice(0, i - 1);
        await this._wait(t.backspaceSpeed);
      }

      // Brief pause when empty
      await this._wait(PAUSE_EMPTY_MS);
      if (!this._cycling) return;

      // Advance to next word
      this.cycleIndex = (this.cycleIndex + 1) % CYCLING_WORDS.length;
      const next = CYCLING_WORDS[this.cycleIndex];
      this.suffixEl.style.color = CYCLING_COLORS[this.cycleIndex];

      // Type next word letter by letter
      for (let j = 1; j <= next.length; j++) {
        if (!this._cycling) return;
        this.suffixEl.textContent = next.slice(0, j);
        await this._wait(t.typeSpeed);
      }

      // Word complete — re-insert as element for TypoHover
      if (!this._cycling) return;
      this.suffixEl.innerHTML = "";
      delete this.suffixEl.dataset.typoProcessed;
      const span = document.createElement("span");
      span.textContent = next;
      this.suffixEl.appendChild(span);
    }
  }

  _wait(ms) {
    return new Promise((resolve) => {
      this._waitTimer = setTimeout(resolve, ms);
    });
  }

  stopCycling() {
    this._cycling = false;
    clearTimeout(this._waitTimer);
    this._waitTimer = null;
    if (this._cursor) {
      this._cursor.remove();
      this._cursor = null;
    }
  }

  activate() {
    this.container.classList.add("visible");
    this.hasEntered = true;
    this.startCycling();
  }

  dispose() {
    this.stopCycling();
    this.observer?.disconnect();
    this.container.innerHTML = "";
    this.container.classList.remove("services-grid", "visible");
  }
}
