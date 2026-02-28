/**
 * ImageEffectsTrial - Page controller for the Image Effects Lab.
 *
 * Manages image selection, effect grid creation with categories,
 * lazy-loading + viewport disposal via IntersectionObserver,
 * theme observation, keyboard interaction, and cleanup.
 */

import { EFFECTS_MAP, CATEGORIES, createEffect } from "./effects/index.js";
import { prefersReducedMotion } from "./utils/device.js";
import { normalizeKey } from "./utils/keyboard.js";

const base = import.meta.env.BASE_URL;

const TEAM_IMAGES = [
  { src: `${base}team/charu.webp`, label: "Charu" },
  { src: `${base}team/arpit.webp`, label: "Arpit" },
  { src: `${base}team/raji.webp`, label: "Raji" },
];

export class ImageEffectsTrial {
  constructor() {
    this.effects = [];
    this.observers = [];
    this.currentImageSrc = null;
    this.themeObserver = null;
    this._onKeyDown = null;
    // Map card elements to their effect keys for re-creation on scroll-back
    this._cardMap = new Map();

    this._init();
  }

  _init() {
    this._setupImageSelector();
    this._setupUpload();
    this._setupThemeObserver();
    this._setupKeyboard();

    // Load default image
    this._selectImage(TEAM_IMAGES[0].src);
  }

  _setupImageSelector() {
    const container = document.getElementById("image-thumbnails");
    if (!container) return;

    for (const img of TEAM_IMAGES) {
      const thumb = document.createElement("div");
      thumb.className = "image-thumb";
      thumb.innerHTML = `<img src="${img.src}" alt="${img.label}" />`;
      thumb.addEventListener("click", () => this._selectImage(img.src));
      container.appendChild(thumb);
    }
  }

  _setupUpload() {
    const btn = document.getElementById("upload-btn");
    const input = document.getElementById("effects-file-input");
    if (!btn || !input) return;

    btn.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      this._selectImage(url);
    });
  }

  _setupThemeObserver() {
    this.themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "data-theme") {
          const isDark = document.documentElement.dataset.theme !== "light";
          this.effects.forEach((e) => e.setTheme(isDark));
        }
      }
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
    });
  }

  _setupKeyboard() {
    this._onKeyDown = (e) => {
      const key = normalizeKey(e);
      if (!key) return;

      for (const effect of this.effects) {
        const w = effect.container.clientWidth;
        const h = effect.container.clientHeight;
        const x = Math.random() * w;
        const y = Math.random() * h;

        if (typeof effect.triggerShockwave === "function") {
          effect.triggerShockwave(x, y);
        }

        this._spawnCharOverlay(effect.container, x, y, key);
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  _spawnCharOverlay(container, x, y, char) {
    const span = document.createElement("span");
    span.className = "keystroke-char";
    span.textContent = char;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    container.appendChild(span);
    span.addEventListener("animationend", () => span.remove(), { once: true });
  }

  _selectImage(src) {
    this.currentImageSrc = src;

    const thumbs = document.querySelectorAll(".image-thumb");
    thumbs.forEach((t) => {
      const img = t.querySelector("img");
      t.classList.toggle("active", img?.src === src || img?.src.endsWith(src));
    });

    this._rebuildGrid();
  }

  _rebuildGrid() {
    this._disposeAll();

    const container = document.getElementById("effects-grid");
    if (!container) return;
    container.innerHTML = "";

    const isDark = document.documentElement.dataset.theme !== "light";
    const reduced = prefersReducedMotion();
    const options = {
      theme: isDark ? "dark" : "light",
      reducedMotion: reduced,
    };

    for (const cat of CATEGORIES) {
      const categoryEffects = Object.entries(EFFECTS_MAP).filter(
        ([, entry]) => entry.category === cat.key,
      );
      if (categoryEffects.length === 0) continue;

      const section = document.createElement("section");
      section.className = "effect-category";

      const title = document.createElement("h2");
      title.className = "category-title";
      title.textContent = cat.label;

      const desc = document.createElement("p");
      desc.className = "category-desc";
      desc.textContent = cat.desc;

      const grid = document.createElement("div");
      grid.className = "category-grid";

      section.appendChild(title);
      section.appendChild(desc);
      section.appendChild(grid);
      container.appendChild(section);

      for (const [key, entry] of categoryEffects) {
        const card = this._createCard(key, entry);
        grid.appendChild(card);
        this._observeCard(card, key, options);
      }
    }
  }

  _createCard(key, entry) {
    const card = document.createElement("div");
    card.className = "effect-card";
    card.dataset.effect = key;

    const canvasContainer = document.createElement("div");
    canvasContainer.className = "effect-canvas-container";

    const loading = document.createElement("div");
    loading.className = "effect-loading";
    loading.textContent = "Loading...";
    canvasContainer.appendChild(loading);

    const label = document.createElement("div");
    label.className = "effect-label";
    label.innerHTML = `
      <span class="effect-name">${entry.label}</span>
      <span class="effect-badge">${entry.shape}</span>
    `;

    card.appendChild(canvasContainer);
    card.appendChild(label);

    // Text input for text-aware effects
    if (entry.textAware) {
      const inputRow = document.createElement("div");
      inputRow.className = "effect-text-input-row";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "effect-text-input";
      input.value = "TYPO";
      input.maxLength = 8;
      input.placeholder = "Text...";
      input.spellcheck = false;
      input.autocomplete = "off";

      inputRow.appendChild(input);
      card.appendChild(inputRow);
      card._textInput = input;
    }

    // Sliders for parameterized effects
    if (entry.hasSliders && entry.class.SLIDER_DEFS) {
      const slidersEl = document.createElement("div");
      slidersEl.className = "effect-sliders";
      card._sliderInputs = [];

      for (const def of entry.class.SLIDER_DEFS) {
        const row = document.createElement("div");
        row.className = "slider-row";

        const lbl = document.createElement("span");
        lbl.className = "slider-label";
        lbl.textContent = def.label;

        if (def.type === "select") {
          const select = document.createElement("select");
          select.className = "slider-select";
          select.dataset.paramKey = def.key;
          for (const opt of def.options) {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
          }
          row.appendChild(lbl);
          row.appendChild(select);
          slidersEl.appendChild(row);
          card._sliderInputs.push({ select, key: def.key, isSelect: true });
        } else {
          const range = document.createElement("input");
          range.type = "range";
          range.className = "slider-range";
          range.min = def.min;
          range.max = def.max;
          range.step = def.step;
          range.value = def.min + (def.max - def.min) * 0.5;
          range.dataset.paramKey = def.key;

          const val = document.createElement("span");
          val.className = "slider-value";
          val.textContent = range.value;

          row.appendChild(lbl);
          row.appendChild(range);
          row.appendChild(val);
          slidersEl.appendChild(row);
          card._sliderInputs.push({ range, val, key: def.key });
        }
      }

      card.appendChild(slidersEl);
    }

    return card;
  }

  _observeCard(card, key, options) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this._initEffect(card, key, options);
          } else {
            this._disposeEffect(card);
          }
        }
      },
      { threshold: 0.05, rootMargin: "100px" },
    );

    observer.observe(card);
    this.observers.push(observer);
  }

  async _initEffect(card, key, options) {
    // Already initialized
    if (this._cardMap.has(card)) return;

    const container = card.querySelector(".effect-canvas-container");
    // Mark as pending to avoid double init
    this._cardMap.set(card, null);

    try {
      const effect = await createEffect(
        key,
        container,
        this.currentImageSrc,
        options,
      );
      const loading = container.querySelector(".effect-loading");
      if (loading) loading.remove();

      // Wire text input if present
      if (card._textInput && typeof effect.setDisplayText === "function") {
        const input = card._textInput;
        input.addEventListener("input", () => {
          const text = input.value.trim() || "TYPO";
          effect.setDisplayText(text);
        });
      }

      // Wire sliders if present
      if (card._sliderInputs && typeof effect.setParam === "function") {
        for (const entry of card._sliderInputs) {
          const { key } = entry;
          if (entry.isSelect) {
            const { select } = entry;
            if (effect._params && effect._params[key] !== undefined) {
              select.value = effect._params[key];
            }
            select.addEventListener("change", () => {
              effect.setParam(key, select.value);
            });
          } else {
            const { range, val } = entry;
            if (effect._params && effect._params[key] !== undefined) {
              range.value = effect._params[key];
              val.textContent = effect._params[key];
            }
            range.addEventListener("input", () => {
              const v = parseFloat(range.value);
              effect.setParam(key, v);
              val.textContent = Number.isInteger(v) ? v : v.toFixed(2);
            });
          }
        }
      }

      this._cardMap.set(card, effect);
      this.effects.push(effect);
    } catch (err) {
      console.warn(`Failed to init effect "${key}":`, err);
      this._cardMap.delete(card);
      container.innerHTML = `<span class="effect-error">Effect unavailable</span>`;
    }
  }

  _disposeEffect(card) {
    const effect = this._cardMap.get(card);
    if (!effect) {
      this._cardMap.delete(card);
      return;
    }

    effect.dispose();
    this.effects = this.effects.filter((e) => e !== effect);
    this._cardMap.delete(card);

    // Reset container for potential re-init
    const container = card.querySelector(".effect-canvas-container");
    if (container) {
      container.innerHTML = "";
      const loading = document.createElement("div");
      loading.className = "effect-loading";
      loading.textContent = "Loading...";
      container.appendChild(loading);
    }
  }

  _disposeAll() {
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects = [];
    this._cardMap.clear();

    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
  }

  dispose() {
    this._disposeAll();
    this.themeObserver?.disconnect();
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
    }
  }
}
