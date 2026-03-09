/**
 * WorkSection - Manages the "Selected Work" section.
 * Full project showcase carousel: one project at a time,
 * image left + details right, with drag/swipe and arrow navigation.
 */

import { PROJECTS, WORK_CATEGORIES } from "../data/projects.js";

const DRAG_THRESHOLD = 50;

const CHEVRON_LEFT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
const CHEVRON_RIGHT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>`;

export class WorkSection {
  constructor() {
    this.sectionEl = document.getElementById("section-work");
    this.initialized = false;
    this.activeCategory = "all";
    this.currentIndex = 0;
    this.filteredProjects = PROJECTS;

    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragDelta = 0;

    // DOM refs
    this.trackEl = null;
    this.counterEl = null;
    this.dotsEl = null;
    this.prevBtn = null;
    this.nextBtn = null;

    // Inner image state per project
    this.innerImageIndices = {};

    // Bound handlers
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  async activate() {
    if (this.initialized) return;
    this.initialized = true;
    this.buildLayout();
    document.addEventListener("keydown", this._onKeyDown);
  }

  buildLayout() {
    const inner = this.sectionEl.querySelector(".section-inner-wide");
    if (!inner) return;

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

    // Counter
    this.counterEl = document.createElement("div");
    this.counterEl.className = "work-showcase-counter";

    // Showcase container
    const showcase = document.createElement("div");
    showcase.className = "work-showcase";

    // Prev arrow
    this.prevBtn = document.createElement("button");
    this.prevBtn.className = "work-showcase-arrow prev";
    this.prevBtn.innerHTML = CHEVRON_LEFT;
    this.prevBtn.addEventListener("click", () =>
      this.goTo(this.currentIndex - 1),
    );

    // Next arrow
    this.nextBtn = document.createElement("button");
    this.nextBtn.className = "work-showcase-arrow next";
    this.nextBtn.innerHTML = CHEVRON_RIGHT;
    this.nextBtn.addEventListener("click", () =>
      this.goTo(this.currentIndex + 1),
    );

    // Viewport + track
    const viewport = document.createElement("div");
    viewport.className = "work-showcase-viewport";

    this.trackEl = document.createElement("div");
    this.trackEl.className = "work-showcase-track";

    viewport.appendChild(this.trackEl);

    // Drag events
    viewport.addEventListener("pointerdown", this._onPointerDown);
    viewport.addEventListener("pointermove", this._onPointerMove);
    viewport.addEventListener("pointerup", this._onPointerUp);
    viewport.addEventListener("pointercancel", this._onPointerUp);

    showcase.appendChild(this.prevBtn);
    showcase.appendChild(viewport);
    showcase.appendChild(this.nextBtn);

    // Dots
    this.dotsEl = document.createElement("div");
    this.dotsEl.className = "work-showcase-dots";

    inner.appendChild(tagBar);
    inner.appendChild(this.counterEl);
    inner.appendChild(showcase);
    inner.appendChild(this.dotsEl);

    this.filteredProjects = PROJECTS;
    this.renderSlides();
  }

  selectCategory(categoryId) {
    if (categoryId === this.activeCategory) return;
    this.activeCategory = categoryId;

    const tags = this.sectionEl.querySelectorAll(".work-tag");
    tags.forEach((t) =>
      t.classList.toggle("active", t.dataset.category === categoryId),
    );

    this.trackEl.classList.add("transitioning");

    setTimeout(() => {
      this.filteredProjects = this.getFilteredProjects(categoryId);
      this.currentIndex = 0;
      this.renderSlides();
      void this.trackEl.offsetWidth;
      this.trackEl.classList.remove("transitioning");
    }, 250);
  }

  getFilteredProjects(categoryId) {
    if (categoryId === "all") return PROJECTS;
    const cat = WORK_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat || !cat.matchTags) return PROJECTS;
    return PROJECTS.filter((p) =>
      p.tags.some((tag) => cat.matchTags.includes(tag)),
    );
  }

  renderSlides() {
    this.trackEl.innerHTML = "";

    for (const project of this.filteredProjects) {
      this.trackEl.appendChild(this.createSlide(project));
    }

    this.updatePosition();
    this.renderDots();
    this.updateCounter();
  }

  createSlide(project) {
    const slide = document.createElement("div");
    slide.className = "work-slide";

    const images = project.images || [project.image];
    const hasMultipleImages = images.length > 1;

    // Left side — images
    const imagesEl = document.createElement("div");
    imagesEl.className = "work-slide-images";

    const imgViewport = document.createElement("div");
    imgViewport.className = "work-slide-img-viewport";

    const imgTrack = document.createElement("div");
    imgTrack.className = "work-slide-img-track";

    for (const src of images) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = project.title;
      imgTrack.appendChild(img);
    }

    imgViewport.appendChild(imgTrack);
    imagesEl.appendChild(imgViewport);

    // Inner image nav (only if multiple images)
    if (hasMultipleImages) {
      const prevImg = document.createElement("button");
      prevImg.className = "work-slide-img-nav prev";
      prevImg.innerHTML = CHEVRON_LEFT;
      prevImg.addEventListener("click", (e) => {
        e.stopPropagation();
        this.navigateInnerImage(project.id, -1, imagesEl);
      });

      const nextImg = document.createElement("button");
      nextImg.className = "work-slide-img-nav next";
      nextImg.innerHTML = CHEVRON_RIGHT;
      nextImg.addEventListener("click", (e) => {
        e.stopPropagation();
        this.navigateInnerImage(project.id, 1, imagesEl);
      });

      imagesEl.appendChild(prevImg);
      imagesEl.appendChild(nextImg);

      // Inner dots
      const dotsEl = document.createElement("div");
      dotsEl.className = "work-slide-img-dots";
      for (let i = 0; i < images.length; i++) {
        const dot = document.createElement("button");
        dot.className = "work-slide-img-dot" + (i === 0 ? " active" : "");
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          this.goToInnerImage(project.id, i, imagesEl);
        });
        dotsEl.appendChild(dot);
      }
      imagesEl.appendChild(dotsEl);
    }

    // Right side — details
    const details = document.createElement("div");
    details.className = "work-slide-details";

    const title = document.createElement("h3");
    title.className = "work-slide-title";
    title.textContent = project.title;

    const year = document.createElement("span");
    year.className = "work-slide-year";
    year.textContent = project.year;

    const desc = document.createElement("p");
    desc.className = "work-slide-description";
    desc.textContent = project.description;

    const tagsEl = document.createElement("div");
    tagsEl.className = "work-slide-tags";
    for (const tag of project.tags) {
      const tagSpan = document.createElement("span");
      tagSpan.className = "work-slide-tag";
      tagSpan.textContent = tag;
      tagsEl.appendChild(tagSpan);
    }

    details.appendChild(title);
    details.appendChild(year);
    details.appendChild(desc);
    details.appendChild(tagsEl);

    // Links (if available)
    if (project.links && project.links.length > 0) {
      const linksEl = document.createElement("div");
      linksEl.className = "work-slide-links";
      for (const link of project.links) {
        const a = document.createElement("a");
        a.className = "work-slide-link";
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = link.label;
        linksEl.appendChild(a);
      }
      details.appendChild(linksEl);
    }

    slide.appendChild(imagesEl);
    slide.appendChild(details);
    return slide;
  }

  // --- Outer carousel navigation ---

  goTo(index) {
    const max = this.filteredProjects.length - 1;
    this.currentIndex = Math.max(0, Math.min(index, max));
    this.updatePosition();
    this.updateDots();
    this.updateCounter();
  }

  updatePosition() {
    const offset = -(this.currentIndex * 100);
    this.trackEl.style.transform = `translateX(${offset}%)`;
    this.prevBtn.disabled = this.currentIndex === 0;
    this.nextBtn.disabled =
      this.currentIndex >= this.filteredProjects.length - 1;
  }

  updateCounter() {
    const current = String(this.currentIndex + 1).padStart(2, "0");
    const total = String(this.filteredProjects.length).padStart(2, "0");
    this.counterEl.textContent = `${current} / ${total}`;
  }

  renderDots() {
    this.dotsEl.innerHTML = "";
    for (let i = 0; i < this.filteredProjects.length; i++) {
      const dot = document.createElement("button");
      dot.className =
        "work-showcase-dot" + (i === this.currentIndex ? " active" : "");
      dot.addEventListener("click", () => this.goTo(i));
      this.dotsEl.appendChild(dot);
    }
  }

  updateDots() {
    const dots = this.dotsEl.querySelectorAll(".work-showcase-dot");
    dots.forEach((d, i) =>
      d.classList.toggle("active", i === this.currentIndex),
    );
  }

  // --- Inner image carousel ---

  navigateInnerImage(projectId, direction, containerEl) {
    const current = this.innerImageIndices[projectId] || 0;
    const project = PROJECTS.find((p) => p.id === projectId);
    const images = project?.images || [project?.image];
    const next = Math.max(0, Math.min(current + direction, images.length - 1));
    this.goToInnerImage(projectId, next, containerEl);
  }

  goToInnerImage(projectId, index, containerEl) {
    this.innerImageIndices[projectId] = index;
    const track = containerEl.querySelector(".work-slide-img-track");
    if (track) {
      track.style.transform = `translateX(-${index * 100}%)`;
    }
    const dots = containerEl.querySelectorAll(".work-slide-img-dot");
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  }

  // --- Drag/swipe ---

  _onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragDelta = 0;
    this.trackEl.classList.add("dragging");
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    this.dragDelta = e.clientX - this.dragStartX;
    const viewportWidth = this.trackEl.parentElement.offsetWidth;
    const pct = (this.dragDelta / viewportWidth) * 100;
    const base = -(this.currentIndex * 100);
    this.trackEl.style.transform = `translateX(${base + pct}%)`;
  }

  _onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.trackEl.classList.remove("dragging");

    if (Math.abs(this.dragDelta) > DRAG_THRESHOLD) {
      if (this.dragDelta > 0) {
        this.goTo(this.currentIndex - 1);
      } else {
        this.goTo(this.currentIndex + 1);
      }
    } else {
      this.updatePosition();
    }
    this.dragDelta = 0;
  }

  // --- Keyboard ---

  _onKeyDown(e) {
    // Only respond when work section is visible
    if (!this.sectionEl.classList.contains("revealed")) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.goTo(this.currentIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.goTo(this.currentIndex + 1);
    }
  }

  dispose() {
    this.initialized = false;
    document.removeEventListener("keydown", this._onKeyDown);
  }
}
