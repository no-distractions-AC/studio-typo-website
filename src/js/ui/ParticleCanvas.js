/**
 * ParticleCanvas - Full-screen canvas overlay for ambient word particles.
 * Single subtle mode: words float slowly with very low opacity and gentle drift.
 */

const MAX_PARTICLES = 40;

const PASTEL_COLORS = [
  "#c4b5fd", // lavender
  "#fca5a5", // rose
  "#93c5fd", // sky
  "#86efac", // mint
  "#fcd34d", // amber
  "#f9a8d4", // pink
  "#a5b4fc", // indigo
];

export class ParticleCanvas {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:fixed;inset:0;z-index:15;pointer-events:none;";
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.animId = null;
    this.lastTime = 0;
    this.active = false;

    this.resize();
    this.boundResize = () => this.resize();
    window.addEventListener("resize", this.boundResize);

    this.readColors();
    this.start();
  }

  readColors() {
    const style = getComputedStyle(document.documentElement);
    this.dimColor = style.getPropertyValue("--text-primary").trim();
    this.font = style.getPropertyValue("--font-mono").trim();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop() {
    this.active = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  tick() {
    if (!this.active) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.animId = requestAnimationFrame(() => this.tick());
  }

  spawn(word) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.readColors();

    const sizeFactor = Math.max(0.4, 1 - (word.length - 1) * 0.06);
    const baseSize = 150 + Math.random() * 150; // 150-300px — large watermarks
    const size = baseSize * sizeFactor;

    this.particles.push({
      char: word.toUpperCase(),
      x: Math.random() * this.width,
      y: this.height * (0.1 + Math.random() * 1.0),
      size,
      life: 0,
      maxLife: 20 + Math.random() * 15, // 20-35 seconds — linger
      alpha: 0,
      maxAlpha: 0.03 + Math.random() * 0.03, // 0.03-0.06 — barely visible
      // Very gentle sinusoidal drift
      wobbleFreqA: 0.1 + Math.random() * 0.15,
      wobbleFreqB: 0.15 + Math.random() * 0.2,
      wobbleAmpA: 3 + Math.random() * 5,
      wobbleAmpB: 2 + Math.random() * 3,
      wobbleOffsetA: Math.random() * Math.PI * 2,
      wobbleOffsetB: Math.random() * Math.PI * 2,
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      // Barely drifting upward (~4 px/s)
      p.y -= 4 * dt;

      // Dual sinusoidal horizontal wobble
      p.x +=
        Math.sin(p.life * p.wobbleFreqA + p.wobbleOffsetA) * p.wobbleAmpA * dt +
        Math.sin(p.life * p.wobbleFreqB + p.wobbleOffsetB) * p.wobbleAmpB * dt;

      // Fade envelope: slow fade in 2s, hold, fade out
      const progress = p.life / p.maxLife;
      if (p.life < 2.0) {
        p.alpha = (p.life / 2.0) * p.maxAlpha;
      } else if (progress > 0.75) {
        const fadeProgress = (progress - 0.75) / 0.25;
        p.alpha = p.maxAlpha * (1 - fadeProgress);
      } else {
        p.alpha = p.maxAlpha;
      }

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.particles) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.font = `${p.size}px ${this.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = p.color;
      ctx.fillText(p.char, p.x, p.y);
      ctx.restore();
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this.boundResize);
    this.canvas.remove();
    this.particles = [];
  }
}
