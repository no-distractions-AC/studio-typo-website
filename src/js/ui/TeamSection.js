/**
 * TeamSection - Manages the "Who Are We" team showcase
 * Shows team photos with TileErosion effect and detail panel on hover.
 */

import { TEAM } from "../data/team.js";
import { createEffect } from "../effects/index.js";

export class TeamSection {
  constructor() {
    this.sectionEl = document.getElementById("section-about");
    this.memberCards = [];
    this.effects = [];
    this.detailPanel = null;
    this.initialized = false;
    this.activeMemberId = null;
  }

  async activate() {
    if (this.initialized) return;
    this.initialized = true;
    await this.buildLayout();
  }

  async buildLayout() {
    const inner = this.sectionEl.querySelector(".section-inner-wide");
    if (!inner) return;

    const layout = document.createElement("div");
    layout.className = "team-layout";

    const grid = document.createElement("div");
    grid.className = "team-grid";

    const pendingEffects = [];

    for (const member of TEAM) {
      const card = document.createElement("div");
      card.className = "team-member";
      card.dataset.memberId = member.id;

      const imgContainer = document.createElement("div");
      imgContainer.className = "team-photo-container";

      const info = document.createElement("div");
      info.className = "team-info";
      info.innerHTML = `
        <span class="team-name-label">${member.name}</span>
        <span class="team-role">${member.role}</span>
      `;

      card.appendChild(imgContainer);
      card.appendChild(info);
      grid.appendChild(card);
      this.memberCards.push(card);

      const displayText = `${member.name}\n${member.role}`;
      pendingEffects.push({
        container: imgContainer,
        photo: member.photo,
        displayText,
      });

      card.addEventListener("mouseenter", () => {
        this.showMemberDetail(member);
      });
      card.addEventListener("mouseleave", () => {
        this.hideMemberDetail();
      });
    }

    const panel = document.createElement("div");
    panel.className = "team-detail-panel";
    panel.innerHTML = `<div class="detail-bio"></div>`;
    this.detailPanel = panel;

    layout.appendChild(grid);
    layout.appendChild(panel);
    inner.appendChild(layout);

    // Init TileErosion effects after DOM is attached (needs dimensions)
    const isDark = document.documentElement.dataset.theme !== "light";
    for (const { container, photo, displayText } of pendingEffects) {
      try {
        const effect = await createEffect("tileErosion", container, photo, {
          theme: isDark ? "dark" : "light",
        });
        effect.setDisplayText(displayText);
        this.effects.push(effect);
      } catch (err) {
        console.warn("Failed to init team effect:", err);
      }
    }
  }

  showMemberDetail(member) {
    if (!this.detailPanel) return;
    this.activeMemberId = member.id;

    this.detailPanel.querySelector(".detail-bio").textContent = member.detail;
    this.detailPanel.classList.add("visible");

    for (const card of this.memberCards) {
      if (card.dataset.memberId !== member.id) {
        card.classList.add("greyed");
      }
    }
  }

  hideMemberDetail() {
    this.activeMemberId = null;

    if (this.detailPanel) {
      this.detailPanel.classList.remove("visible");
    }

    for (const card of this.memberCards) {
      card.classList.remove("greyed");
    }
  }

  dispose() {
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects = [];
    this.memberCards = [];
    this.initialized = false;
  }
}
