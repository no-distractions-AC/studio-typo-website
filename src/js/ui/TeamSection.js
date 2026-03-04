/**
 * TeamSection - Manages the "Who Are We" team showcase.
 * Compact 3-column grid with plain photos.
 */

import { TEAM } from "../data/team.js";

export class TeamSection {
  constructor() {
    this.sectionEl = document.getElementById("section-about");
    this.initialized = false;
  }

  async activate() {
    if (this.initialized) return;
    this.initialized = true;
    this.buildLayout();
  }

  buildLayout() {
    const inner = this.sectionEl.querySelector(".section-inner-wide");
    if (!inner) return;

    const grid = document.createElement("div");
    grid.className = "team-grid";

    for (const member of TEAM) {
      const item = document.createElement("div");
      item.className = "team-grid-item";

      const imgContainer = document.createElement("div");
      imgContainer.className = "team-photo-container";

      const img = document.createElement("img");
      img.src = member.photo;
      img.alt = member.name;
      img.loading = "lazy";
      imgContainer.appendChild(img);

      const details = document.createElement("div");
      details.className = "team-grid-details";
      details.innerHTML = `
        <span class="team-name-label">${member.name}</span>
        <span class="team-role">${member.role}</span>
      `;

      item.appendChild(imgContainer);
      item.appendChild(details);
      grid.appendChild(item);
    }

    inner.appendChild(grid);
  }

  dispose() {
    this.initialized = false;
  }
}
