/**
 * TeamSection - Manages the "Who Are We" team showcase.
 * Compact 3-column grid with TileErosion effects on each photo.
 */

import { TEAM } from "../data/team.js";
import { createEffect } from "../effects/index.js";

export class TeamSection {
  constructor() {
    this.sectionEl = document.getElementById("section-about");
    this.effects = [];
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

    const grid = document.createElement("div");
    grid.className = "team-grid";

    for (const member of TEAM) {
      const item = document.createElement("div");
      item.className = "team-grid-item";
      item.dataset.memberId = member.id;

      const imgContainer = document.createElement("div");
      imgContainer.className = "team-photo-container";

      const details = document.createElement("div");
      details.className = "team-grid-details";
      details.innerHTML = `
        <span class="team-name-label">${member.name}</span>
        <span class="team-role">${member.role}</span>
      `;

      item.appendChild(imgContainer);
      item.appendChild(details);
      grid.appendChild(item);

      this._effectMap.set(member.id, {
        container: imgContainer,
        photo: member.photo,
        displayText: `${member.name}\n${member.role}`,
        effect: null,
      });
    }

    inner.appendChild(grid);

    // Init all 3 effects immediately (only 3, not heavy)
    for (const [memberId] of this._effectMap) {
      this._initEffect(memberId);
    }
  }

  async _initEffect(memberId) {
    const data = this._effectMap.get(memberId);
    if (!data || data.effect) return;

    const isDark = document.documentElement.dataset.theme !== "light";
    try {
      const effect = await createEffect(
        "tileErosion",
        data.container,
        data.photo,
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
      effect.setErosionLevel(0);
      data.effect = effect;
      this.effects.push(effect);
    } catch (err) {
      console.warn("Failed to init team effect:", err);
    }
  }

  dispose() {
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects = [];
    this._effectMap.clear();
    this.initialized = false;
  }
}
