/**
 * ScrollParticleSpawner - Spawns letter particles on scroll,
 * sampling characters from visible text elements.
 * Spawn rate scales with scroll velocity for an organic feel.
 */

const FALLBACK_CHARS = "STUDIOTYPO".split("");

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
    this.charPool = [];
    this.attached = false;

    this.handleScroll = this._onScroll.bind(this);
  }

  attach() {
    if (this.attached) return;
    this.attached = true;
    this.lastScrollY = window.scrollY;
    this.lastScrollTime = performance.now();
    this.refreshCharPool();
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

    // Throttle spawns to ~60ms intervals
    if (now - this.lastSpawnTime < 60) return;
    this.lastSpawnTime = now;

    // Refresh character pool every 500ms
    if (now - this.lastPoolRefresh > 500) {
      this.refreshCharPool();
      this.lastPoolRefresh = now;
    }

    // Calculate velocity and spawn count
    const velocity = deltaY / deltaTime; // px/ms
    const spawnCount =
      velocity < 0.5
        ? 0
        : velocity < 2.0
          ? 1
          : velocity < 5.0
            ? Math.ceil(Math.random() + 1)
            : Math.min(3, Math.ceil(Math.random() * 2 + 1));

    const pool = this.charPool.length > 0 ? this.charPool : FALLBACK_CHARS;

    for (let i = 0; i < spawnCount; i++) {
      const char = pool[Math.floor(Math.random() * pool.length)];
      this.particleCanvas.spawn(char);
    }
  }

  refreshCharPool() {
    const elements = document.querySelectorAll(VISIBLE_TEXT_SELECTORS);
    const chars = [];
    const vh = window.innerHeight;

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        for (const ch of el.textContent) {
          if (/[a-zA-Z]/.test(ch)) chars.push(ch);
        }
      }
    }

    this.charPool = chars;
  }

  dispose() {
    this.detach();
    this.charPool = [];
    this.particleCanvas = null;
  }
}
