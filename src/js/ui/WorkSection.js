/**
 * WorkSection - Manages the "Selected Work" section.
 * Vertical scroll layout: one project per ~80vh area,
 * image on LEFT with TileErosion, details on RIGHT.
 * Scroll-driven focus controls TileErosion erosion level.
 */

import { PROJECTS } from "../data/projects.js";
import { createEffect } from "../effects/index.js";
import { ScrollFocusController } from "./ScrollFocusController.js";

export class WorkSection {
  constructor() {
    this.sectionEl = document.getElementById("section-work");
    this.effects = [];
    this.scrollController = null;
    this.createObserver = null;
    this.visibilityObserver = null;
    this.initialized = false;
    this._effectMap = new Map();
  }

  async activate() {
    if (this.initialized) return;
    this.initialized = true;
    this.buildLayout();
  }

  buildLayout() {
    const inner = this.sectionEl.querySelector(".section-inner-wide");
    if (!inner) return;

    // Remove static work-grid if present
    const oldGrid = inner.querySelector(".work-grid");
    if (oldGrid) oldGrid.remove();

    const scrollLayout = document.createElement("div");
    scrollLayout.className = "work-scroll-layout";

    const focusItems = [];

    for (const project of PROJECTS) {
      if (!project.image) continue;

      const item = document.createElement("div");
      item.className = "work-scroll-item";
      item.dataset.projectId = project.id;

      // Left: image container
      const imageCol = document.createElement("div");
      imageCol.className = "work-scroll-image";

      const imgContainer = document.createElement("div");
      imgContainer.className = "work-photo-container";
      imageCol.appendChild(imgContainer);

      // Right: details
      const detailsCol = document.createElement("div");
      detailsCol.className = "work-scroll-details";
      detailsCol.innerHTML = `
        <span class="work-year">${project.year}</span>
        <h3 class="work-title">${project.title}</h3>
        <p class="work-desc">${project.description}</p>
        <div class="work-tags">${project.tags.join(" · ")}</div>
      `;

      item.appendChild(imageCol);
      item.appendChild(detailsCol);
      scrollLayout.appendChild(item);

      this._effectMap.set(project.id, {
        container: imgContainer,
        image: project.image,
        displayText: project.title.toUpperCase(),
        effect: null,
        item,
        detailsCol,
      });

      focusItems.push({
        element: item,
        onUpdate: (focusProgress) => {
          this._onFocusUpdate(project.id, focusProgress);
        },
      });
    }

    inner.appendChild(scrollLayout);

    // Set up scroll focus controller
    this.scrollController = new ScrollFocusController(focusItems);
    this.scrollController.attach();

    // Lazy-create effects on first intersection, then pause/resume for performance
    this._setupObservers();
  }

  _setupObservers() {
    // Observer 1: Create effect on first intersection (one-time)
    this.createObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const projectId = entry.target.dataset.projectId;
          if (!projectId) continue;
          this._initEffect(projectId);
          this.createObserver.unobserve(entry.target);
        }
      },
      { rootMargin: "200px" },
    );

    // Observer 2: Pause/resume effects based on viewport proximity
    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const projectId = entry.target.dataset.projectId;
          if (!projectId) continue;
          const data = this._effectMap.get(projectId);
          if (!data?.effect) continue;

          if (entry.isIntersecting) {
            data.effect.resume();
          } else {
            data.effect.pause();
          }
        }
      },
      { rootMargin: "100px" },
    );

    for (const [, data] of this._effectMap) {
      this.createObserver.observe(data.item);
      this.visibilityObserver.observe(data.item);
    }
  }

  async _initEffect(projectId) {
    const data = this._effectMap.get(projectId);
    if (!data || data.effect) return;

    const isDark = document.documentElement.dataset.theme !== "light";
    try {
      const effect = await createEffect(
        "tileErosion",
        data.container,
        data.image,
        { theme: isDark ? "dark" : "light", displayText: data.displayText },
      );
      effect.setParam("showText", true);
      effect.setParam("renderMode", "overlay");
      effect.setParam("maskMode", "text");
      effect.setParam("edgeMode", "text");
      effect.setParam("baseOpacity", 0.12);
      effect.setParam("tileShape", "hex");
      effect.setParam("tileSize", 16);
      effect.setParam("gap", 1);
      effect.setParam("erosionRadius", 180);
      effect.setParam("driftForce", 10);
      effect.setParam("gravity", 0.2);
      effect.setParam("easeSpeed", 0.12);
      effect.setParam("rotation", 0.02);
      effect.setParam("noiseAmp", 2);
      effect.setParam("noiseScale", 0.02);
      effect.setParam("noiseSpeed", 0.35);
      effect.setErosionLevel(1);
      data.effect = effect;
      this.effects.push(effect);
    } catch (err) {
      console.warn(`Failed to init work effect for ${projectId}:`, err);
    }
  }

  _onFocusUpdate(projectId, focusProgress) {
    const data = this._effectMap.get(projectId);
    if (!data) return;

    if (data.effect) {
      data.effect.setErosionLevel(1 - focusProgress);
    }

    // Base opacity 0.3 so details are always partially visible
    data.detailsCol.style.opacity = 0.3 + focusProgress * 0.7;
    data.detailsCol.style.transform = `translateX(${(1 - focusProgress) * 10}px)`;
  }

  dispose() {
    this.scrollController?.dispose();
    this.createObserver?.disconnect();
    this.visibilityObserver?.disconnect();
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects = [];
    this._effectMap.clear();
    this.initialized = false;
  }
}
