/**
 * TimingPanel - Debug panel for tuning typewriter animation timings.
 * Toggle with Shift+T. Sliders update in real-time, with Save/Reset/Replay.
 */

import {
  getTimings,
  getDefaults,
  setTimings,
  saveTimings,
  resetTimings,
} from "./TypoRotator.js";

const TIMING_FIELDS = [
  { key: "typeSpeed", label: "Type Speed", min: 20, max: 400, step: 10 },
  {
    key: "backspaceSpeed",
    label: "Backspace Speed",
    min: 20,
    max: 300,
    step: 10,
  },
  { key: "typoPause", label: "Typo Pause", min: 100, max: 3000, step: 50 },
  { key: "finalPause", label: "Final Pause", min: 100, max: 3000, step: 50 },
  {
    key: "cursorSettle",
    label: "Cursor Settle",
    min: 100,
    max: 3000,
    step: 50,
  },
  {
    key: "autoScrollDelay",
    label: "Auto-scroll Delay",
    min: 0,
    max: 3000,
    step: 50,
  },
  {
    key: "cursorBlinkRate",
    label: "Cursor Blink Rate",
    min: 100,
    max: 1500,
    step: 10,
  },
];

export class TimingPanel {
  constructor({ onReplay }) {
    this.onReplay = onReplay;
    this.visible = false;
    this.panel = null;
    this.inputs = {};

    this._buildPanel();
    this._attachShortcut();
  }

  _buildPanel() {
    const panel = document.createElement("div");
    panel.className = "timing-panel";
    panel.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 99999;
      background: rgba(15, 17, 20, 0.95);
      color: #e0e0e0;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      padding: 16px;
      border-radius: 8px;
      display: none;
      flex-direction: column;
      gap: 10px;
      min-width: 300px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    `;

    // Title
    const title = document.createElement("div");
    title.style.cssText =
      "font-size: 12px; font-weight: 700; letter-spacing: 0.05em; color: #fff; margin-bottom: 4px;";
    title.textContent = "Typewriter Timing";
    panel.appendChild(title);

    // Hint
    const hint = document.createElement("div");
    hint.style.cssText = "font-size: 10px; color: #888; margin-bottom: 4px;";
    hint.textContent = "Shift+T to toggle";
    panel.appendChild(hint);

    const current = getTimings();

    // Sliders
    for (const field of TIMING_FIELDS) {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; gap: 8px;";

      const label = document.createElement("label");
      label.style.cssText = "flex: 0 0 120px; color: #aaa; font-size: 10px;";
      label.textContent = field.label;

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = field.min;
      slider.max = field.max;
      slider.step = field.step;
      slider.value = current[field.key];
      slider.style.cssText =
        "flex: 1; accent-color: #ff3b30; height: 4px; cursor: pointer;";

      const numInput = document.createElement("input");
      numInput.type = "number";
      numInput.min = field.min;
      numInput.max = field.max;
      numInput.step = field.step;
      numInput.value = current[field.key];
      numInput.style.cssText = `
        width: 60px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        color: #fff;
        font-family: 'Space Mono', monospace;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 3px;
        text-align: right;
      `;

      const unit = document.createElement("span");
      unit.style.cssText = "color: #666; font-size: 10px;";
      unit.textContent = "ms";

      // Sync slider ↔ number input
      slider.addEventListener("input", () => {
        numInput.value = slider.value;
        setTimings({ [field.key]: Number(slider.value) });
      });

      numInput.addEventListener("input", () => {
        slider.value = numInput.value;
        setTimings({ [field.key]: Number(numInput.value) });
      });

      // Prevent keyboard events from propagating to the app
      numInput.addEventListener("keydown", (e) => e.stopPropagation());
      numInput.addEventListener("keyup", (e) => e.stopPropagation());

      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(numInput);
      row.appendChild(unit);
      panel.appendChild(row);

      this.inputs[field.key] = { slider, numInput };
    }

    // Buttons
    const buttons = document.createElement("div");
    buttons.style.cssText = "display: flex; gap: 8px; margin-top: 6px;";

    const btnStyle = `
      flex: 1;
      padding: 6px 0;
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.03em;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    `;

    const replayBtn = document.createElement("button");
    replayBtn.textContent = "Replay";
    replayBtn.style.cssText =
      btnStyle + "background: rgba(255,59,48,0.2); color: #ff3b30;";
    replayBtn.addEventListener("click", () => this.onReplay?.());
    replayBtn.addEventListener("mouseenter", () => {
      replayBtn.style.background = "rgba(255,59,48,0.35)";
    });
    replayBtn.addEventListener("mouseleave", () => {
      replayBtn.style.background = "rgba(255,59,48,0.2)";
    });

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.style.cssText =
      btnStyle + "background: rgba(255,255,255,0.06); color: #fff;";
    saveBtn.addEventListener("click", () => {
      saveTimings();
      saveBtn.textContent = "Saved!";
      setTimeout(() => {
        saveBtn.textContent = "Save";
      }, 1200);
    });
    saveBtn.addEventListener("mouseenter", () => {
      saveBtn.style.background = "rgba(255,255,255,0.12)";
    });
    saveBtn.addEventListener("mouseleave", () => {
      saveBtn.style.background = "rgba(255,255,255,0.06)";
    });

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText =
      btnStyle + "background: rgba(255,255,255,0.06); color: #888;";
    resetBtn.addEventListener("click", () => {
      resetTimings();
      this._syncInputs();
    });
    resetBtn.addEventListener("mouseenter", () => {
      resetBtn.style.background = "rgba(255,255,255,0.12)";
    });
    resetBtn.addEventListener("mouseleave", () => {
      resetBtn.style.background = "rgba(255,255,255,0.06)";
    });

    buttons.appendChild(replayBtn);
    buttons.appendChild(saveBtn);
    buttons.appendChild(resetBtn);
    panel.appendChild(buttons);

    document.body.appendChild(panel);
    this.panel = panel;
  }

  _syncInputs() {
    const current = getTimings();
    for (const field of TIMING_FIELDS) {
      const { slider, numInput } = this.inputs[field.key];
      slider.value = current[field.key];
      numInput.value = current[field.key];
    }
  }

  _attachShortcut() {
    window.addEventListener("keydown", (e) => {
      if (e.shiftKey && e.key === "T" && !e.ctrlKey && !e.metaKey) {
        // Don't trigger when typing in form inputs
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    this.visible = !this.visible;
    this.panel.style.display = this.visible ? "flex" : "none";
    if (this.visible) this._syncInputs();
  }

  dispose() {
    this.panel?.remove();
  }
}
