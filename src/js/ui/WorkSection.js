/**
 * WorkSection - Manages the "Selected Work" section.
 * Tag-filtered compact grid: curated category tags at top,
 * thumbnail grid below filtered by selected category.
 */

import { PROJECTS, WORK_CATEGORIES } from "../data/projects.js";

export class WorkSection {
  constructor() {
    this.sectionEl = document.getElementById("section-work");
    this.initialized = false;
    this.activeCategory = "all";
    this.gridEl = null;
  }

  async activate() {
    if (this.initialized) return;
    this.initialized = true;
    this.buildLayout();
  }

  buildLayout() {
    const inner = this.sectionEl.querySelector(".section-inner-wide");
    if (!inner) return;

    // Remove old grid/layout if present
    const old = inner.querySelector(".work-scroll-layout");
    if (old) old.remove();

    // Tag bar
    const tagBar = document.createElement("div");
    tagBar.className = "work-tag-bar";

    for (const cat of WORK_CATEGORIES) {
      const btn = document.createElement("button");
      btn.className = "work-tag" + (cat.id === "all" ? " active" : "");
      btn.dataset.category = cat.id;
      btn.textContent = cat.label;
      btn.addEventListener("click", () => this.selectCategory(cat.id));
      tagBar.appendChild(btn);
    }

    // Grid container
    this.gridEl = document.createElement("div");
    this.gridEl.className = "work-grid";

    inner.appendChild(tagBar);
    inner.appendChild(this.gridEl);

    this.renderGrid(PROJECTS);
  }

  selectCategory(categoryId) {
    if (categoryId === this.activeCategory) return;
    this.activeCategory = categoryId;

    // Update active tag
    const tags = this.sectionEl.querySelectorAll(".work-tag");
    tags.forEach((t) => t.classList.toggle("active", t.dataset.category === categoryId));

    // Filter projects
    const filtered = this.getFilteredProjects(categoryId);
    this.renderGrid(filtered);
  }

  getFilteredProjects(categoryId) {
    if (categoryId === "all") return PROJECTS;
    const cat = WORK_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat || !cat.matchTags) return PROJECTS;
    return PROJECTS.filter((p) =>
      p.tags.some((tag) => cat.matchTags.includes(tag)),
    );
  }

  renderGrid(projects) {
    this.gridEl.innerHTML = "";

    projects.forEach((project, i) => {
      if (!project.image) return;

      const item = document.createElement("div");
      item.className = "work-grid-item";
      item.dataset.projectId = project.id;
      item.style.animationDelay = `${i * 0.04}s`;

      item.innerHTML = `
        <div class="work-grid-thumb">
          <img src="${project.image}" alt="${project.title}" loading="lazy" />
        </div>
        <span class="work-grid-title">${project.title}</span>
        <span class="work-grid-year">${project.year}</span>
      `;

      this.gridEl.appendChild(item);
    });
  }

  dispose() {
    this.initialized = false;
  }
}
