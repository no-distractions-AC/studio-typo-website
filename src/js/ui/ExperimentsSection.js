/**
 * ExperimentsSection - Two visual modes for experiment showcase.
 * Mode A: "scatter" — word cloud with names at varied sizes/angles
 * Mode B: "terminal" — CLI-styled list
 *
 * Toggle between them via data attribute. Default: terminal.
 */

import { EXPERIMENTS } from "../data/experiments.js";

// Deterministic pseudo-random from index
function seeded(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class ExperimentsSection {
  constructor() {
    this.sectionEl = document.getElementById("section-experiments");
    this.initialized = false;
    this.mode = "terminal"; // "terminal" | "scatter"
    this.containerEl = null;
  }

  async activate() {
    if (this.initialized) return;
    this.initialized = true;
    this.buildLayout();
  }

  buildLayout() {
    const inner = this.sectionEl.querySelector(".section-inner-wide");
    if (!inner) return;

    this.containerEl = document.createElement("div");
    this.containerEl.className = "experiments-container";

    this.render();
    inner.appendChild(this.containerEl);
  }

  render() {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = "";
    this.containerEl.dataset.mode = this.mode;

    if (this.mode === "terminal") {
      this.renderTerminal();
    } else {
      this.renderScatter();
    }
  }

  // ── Terminal mode ──────────────────────────────────

  renderTerminal() {
    const terminal = document.createElement("div");
    terminal.className = "exp-terminal";

    // Header
    const header = document.createElement("div");
    header.className = "exp-terminal-header";
    header.textContent = "$ ls -la ~/experiments/";
    terminal.appendChild(header);

    // Rows
    const list = document.createElement("div");
    list.className = "exp-terminal-list";

    for (let i = 0; i < EXPERIMENTS.length; i++) {
      const exp = EXPERIMENTS[i];
      const row = document.createElement(exp.link ? "a" : "div");
      row.className = "exp-terminal-row";
      if (exp.link) {
        row.href = exp.link;
      }

      const idx = String(i + 1).padStart(2, "0");
      const dots = "\u00b7".repeat(Math.max(2, 20 - exp.title.length));
      const tags = exp.tags.join(", ");

      row.innerHTML =
        `<span class="exp-t-idx">${idx}</span>` +
        `<span class="exp-t-name">${exp.title}</span>` +
        `<span class="exp-t-dots">${dots}</span>` +
        `<span class="exp-t-tags">${tags}</span>`;

      list.appendChild(row);
    }

    terminal.appendChild(list);

    // Footer
    const allTags = new Set(EXPERIMENTS.flatMap((e) => e.tags));
    const footer = document.createElement("div");
    footer.className = "exp-terminal-footer";
    footer.textContent = `${EXPERIMENTS.length} experiments \u00b7 ${allTags.size} tags`;
    terminal.appendChild(footer);

    this.containerEl.appendChild(terminal);
  }

  // ── Scatter mode ───────────────────────────────────

  renderScatter() {
    const scatter = document.createElement("div");
    scatter.className = "exp-scatter";

    const sizes = ["exp-s-xs", "exp-s-sm", "exp-s-md", "exp-s-lg", "exp-s-xl"];

    for (let i = 0; i < EXPERIMENTS.length; i++) {
      const exp = EXPERIMENTS[i];

      const item = document.createElement(exp.link ? "a" : "span");
      item.className = "exp-scatter-word";
      if (exp.link) {
        item.href = exp.link;
      }

      // Deterministic size, position, rotation
      const s = seeded(i);
      const sizeClass = sizes[Math.floor(s * sizes.length)];
      item.classList.add(sizeClass);

      const x = 5 + seeded(i + 0.3) * 70; // 5-75% left
      const y = 5 + seeded(i + 0.7) * 75; // 5-80% top
      const rot = (seeded(i + 0.5) - 0.5) * 10; // -5 to 5 deg

      item.style.left = x + "%";
      item.style.top = y + "%";
      item.style.transform = `rotate(${rot.toFixed(1)}deg)`;

      item.textContent = exp.title;
      item.dataset.description = exp.description;
      item.dataset.tags = exp.tags.join(" \u00b7 ");

      // Tooltip on hover
      item.addEventListener("mouseenter", () => {
        scatter
          .querySelectorAll(".exp-scatter-word")
          .forEach((w) => w.classList.add("dimmed"));
        item.classList.remove("dimmed");
        item.classList.add("active");
      });
      item.addEventListener("mouseleave", () => {
        scatter
          .querySelectorAll(".exp-scatter-word")
          .forEach((w) => w.classList.remove("dimmed", "active"));
      });

      scatter.appendChild(item);
    }

    this.containerEl.appendChild(scatter);
  }

  setMode(mode) {
    this.mode = mode;
    this.render();
  }

  dispose() {
    this.initialized = false;
  }
}
