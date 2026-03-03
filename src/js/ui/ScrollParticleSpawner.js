/**
 * ScrollParticleSpawner - Spawns word particles on scroll,
 * sampling words from visible text elements.
 * Spawn rate scales with scroll velocity for an organic feel.
 */

const FALLBACK_WORDS = ["STUDIO", "TYPO", "DESIGN", "CODE", "CRAFT"];

const VISIBLE_TEXT_SELECTORS = [
  ".content-section.revealed .section-title",
  ".content-section.revealed p",
  ".content-section.revealed h3",
  ".content-section.revealed .work-tags",
  ".content-section.revealed .contact-link",
  ".contact-reactive",
].join(", ");

export class ScrollParticleSpawner {
  constructor(particleCanvas) {
    this.particleCanvas = particleCanvas;
    this.lastScrollY = window.scrollY;
    this.lastScrollTime = performance.now();
    this.lastSpawnTime = 0;
    this.lastPoolRefresh = 0;
    this.wordPool = [];
    this.attached = false;

    this.handleScroll = this._onScroll.bind(this);
  }

  attach() {
    if (this.attached) return;
    this.attached = true;
    this.lastScrollY = window.scrollY;
    this.lastScrollTime = performance.now();
    this.refreshWordPool();
    window.addEventListener("scroll", this.handleScroll, { passive: true });
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("scroll", this.handleScroll);
  }

  _onScroll() {
    const now = performance.now();
    const scrollY = window.scrollY;
    const deltaY = Math.abs(scrollY - this.lastScrollY);
    const deltaTime = now - this.lastScrollTime;

    this.lastScrollY = scrollY;
    this.lastScrollTime = now;

    // Ignore micro-movements or too-fast calls
    if (deltaY < 3 || deltaTime < 16) return;

    // Throttle spawns to ~250ms intervals for ambient feel
    if (now - this.lastSpawnTime < 250) return;
    this.lastSpawnTime = now;

    // Refresh word pool every 500ms
    if (now - this.lastPoolRefresh > 500) {
      this.refreshWordPool();
      this.lastPoolRefresh = now;
    }

    // Spawn one word per interval (ambient, not velocity-driven)
    const pool = this.wordPool.length > 0 ? this.wordPool : FALLBACK_WORDS;
    const word = pool[Math.floor(Math.random() * pool.length)];
    this.particleCanvas.spawn(word);
  }

  refreshWordPool() {
    const elements = document.querySelectorAll(VISIBLE_TEXT_SELECTORS);
    const words = [];
    const vh = window.innerHeight;

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        const text = el.textContent || "";
        for (const w of text.split(/\s+/)) {
          const cleaned = w.replace(/[^a-zA-Z]/g, "");
          if (cleaned.length >= 2) words.push(cleaned.toUpperCase());
        }
      }
    }

    this.wordPool = words;
  }

  dispose() {
    this.detach();
    this.wordPool = [];
    this.particleCanvas = null;
  }
}
