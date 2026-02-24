/**
 * TeamSection - Manages the "Who Are We" team showcase
 * Split layout: compact team grid on left, shared detail panel on right.
 * Hovering a person reveals their portrait, greys out others,
 * and shows their details in the right panel.
 */

import { TEAM } from "../data/team.js";
import {
  generateWeaveAscii,
  generatePlaceholderImage,
  generateSilhouetteMask,
} from "../ascii/utils/weave.js";
import { TeamPortrait } from "../ascii/TeamPortrait.js";

const ASCII_COLS = 120;
const ASCII_GAMMA = 1.8;

export class TeamSection {
  constructor() {
    this.sectionEl = document.getElementById("section-about");
    this.portraits = [];
    this.memberCards = [];
    this.detailPanel = null;
    this.initialized = false;
    this.activeMemberId = null;
  }

  async activate() {
    if (this.initialized) return;
    this.initialized = true;

    this.buildLayout();
    await this.waitForVisible();
    await Promise.all(TEAM.map((member) => this.initPortrait(member)));
  }

  waitForVisible() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.sectionEl.classList.contains("active")) {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }

  buildLayout() {
    const inner = this.sectionEl.querySelector(".section-inner-wide");
    if (!inner) return;

    // Flex container: grid (left) + detail panel (right)
    const layout = document.createElement("div");
    layout.className = "team-layout";

    // Team grid (left side)
    const grid = document.createElement("div");
    grid.className = "team-grid";

    for (const member of TEAM) {
      const card = document.createElement("div");
      card.className = "team-member";
      card.dataset.memberId = member.id;

      const asciiContainer = document.createElement("div");
      asciiContainer.className = "team-ascii-container";
      asciiContainer.id = `team-ascii-${member.id}`;

      const info = document.createElement("div");
      info.className = "team-info";
      info.innerHTML = `
        <span class="team-name-label">${member.name}</span>
        <span class="team-role">${member.role}</span>
      `;

      card.appendChild(asciiContainer);
      card.appendChild(info);
      grid.appendChild(card);
      this.memberCards.push(card);
    }

    // Shared detail panel (right side)
    const panel = document.createElement("div");
    panel.className = "team-detail-panel";
    panel.innerHTML = `
      <div class="detail-bio"></div>
    `;
    this.detailPanel = panel;

    layout.appendChild(grid);
    layout.appendChild(panel);
    inner.appendChild(layout);
  }

  /**
   * Show the detail panel for a specific member and grey out others
   */
  showMemberDetail(member) {
    if (!this.detailPanel) return;
    this.activeMemberId = member.id;

    // Populate panel with bio only (name/role already visible under portrait)
    this.detailPanel.querySelector(".detail-bio").textContent = member.detail;
    this.detailPanel.classList.add("visible");

    // Grey out other members
    for (const card of this.memberCards) {
      if (card.dataset.memberId !== member.id) {
        card.classList.add("greyed");
      }
    }
  }

  /**
   * Hide the detail panel and un-grey all members
   */
  hideMemberDetail() {
    this.activeMemberId = null;

    if (this.detailPanel) {
      this.detailPanel.classList.remove("visible");
    }

    for (const card of this.memberCards) {
      card.classList.remove("greyed");
    }
  }

  async initPortrait(member) {
    const container = document.getElementById(`team-ascii-${member.id}`);
    if (!container) return;

    try {
      // Use real photo if available, otherwise fall back to placeholder + mask
      const hasPhoto = !!member.photo;
      const asciiSource = hasPhoto
        ? member.photo
        : generateSilhouetteMask(member.name);
      const { ascii, colors } = await generateWeaveAscii(
        asciiSource,
        ASCII_COLS,
        member.name,
        ASCII_GAMMA,
      );

      const portrait = new TeamPortrait(container, ascii, {
        colors: hasPhoto ? colors : null,
        onFormComplete: () => {
          this.showMemberDetail(member);
        },
        onScatter: () => {
          this.hideMemberDetail();
        },
      });

      this.portraits.push(portrait);
    } catch (err) {
      console.error(`Failed to load portrait for ${member.name}:`, err);
      container.innerHTML = `<span class="team-fallback">${member.name}</span>`;
    }
  }

  dispose() {
    for (const portrait of this.portraits) {
      portrait.dispose();
    }
    this.portraits = [];
    this.memberCards = [];
    this.initialized = false;
  }
}
