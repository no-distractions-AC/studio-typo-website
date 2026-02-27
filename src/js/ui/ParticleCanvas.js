/**
 * ParticleCanvas - Full-screen canvas overlay for typing particle effects
 * 5 ember variations: embers, ghost, neon, datastream, glitch
 */

const MODES = ["embers", "ghost", "neon", "datastream", "glitch"];

const NEON_COLORS = ["#ff00aa", "#00ddff", "#ffcc00"];

const TECH_CHARS = ["{", "}", "<", ">", "/", "\\", "|", "_", "=", ";", ":", "~"];
const DATA_CHARS = ["0", "1", "0", "1", "0", "1", "#", "$", "%", "&", "0x"];
const GLITCH_CHARS = ["█", "▓", "░", "▒", "╳", "∎", "⌀", "¶", "§"];

export class ParticleCanvas {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:fixed;inset:0;z-index:5;pointer-events:none;";
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.mode = "embers";
    this.neonIndex = 0;
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
    this.accentColor = style.getPropertyValue("--typo-highlight-border").trim();
    this.textColor = style.getPropertyValue("--text-primary").trim();
    this.dimColor = style.getPropertyValue("--text-tertiary").trim();
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

  setMode(mode) {
    if (MODES.includes(mode)) {
      this.mode = mode;
      this.particles = [];
    }
  }

  getMode() {
    return this.mode;
  }

  spawn(key) {
    this.readColors();
    switch (this.mode) {
      case "embers":
        this.spawnEmbers(key);
        break;
      case "ghost":
        this.spawnGhost(key);
        break;
      case "neon":
        this.spawnNeon(key);
        break;
      case "datastream":
        this.spawnDataStream(key);
        break;
      case "glitch":
        this.spawnGlitch(key);
        break;
    }
  }

  // ── Embers ──────────────────────────────────────────────

  spawnEmbers(key) {
    const x = Math.random() * this.width;
    const y = this.height * (0.5 + Math.random() * 0.4);

    this.particles.push({
      mode: "embers",
      char: key.toUpperCase(),
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -(60 + Math.random() * 80),
      alpha: 1,
      size: 12 + Math.random() * 16,
      scale: 0.8 + Math.random() * 0.6,
      life: 0,
      maxLife: 2 + Math.random(),
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 1.5 + Math.random(),
      color: this.accentColor,
    });

    // 30% chance: spawn a trailing tech echo
    if (Math.random() < 0.3) {
      this.particles.push({
        mode: "embers",
        char: TECH_CHARS[Math.floor(Math.random() * TECH_CHARS.length)],
        x: x + (Math.random() - 0.5) * 30,
        y: y + 10 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 15,
        vy: -(40 + Math.random() * 50),
        alpha: 0.6,
        size: 8 + Math.random() * 8,
        scale: 0.6 + Math.random() * 0.4,
        life: 0,
        maxLife: 1.5 + Math.random(),
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: 2 + Math.random(),
        color: this.dimColor,
      });
    }
  }

  updateEmbers(p, dt) {
    p.life += dt;
    p.y += p.vy * dt;
    p.x += Math.sin(p.life * p.wobbleSpeed + p.wobbleOffset) * 30 * dt;
    p.alpha = 1 - p.life / p.maxLife;
    p.scale *= 1 - dt * 0.3;
    return p.life < p.maxLife;
  }

  drawEmbers(p) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.font = `${p.size * p.scale}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12 * p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillText(p.char, p.x, p.y);
    ctx.restore();
  }

  // ── Ghost Terminal ──────────────────────────────────────

  spawnGhost(key) {
    // Main char
    const char = Math.random() < 0.2
      ? TECH_CHARS[Math.floor(Math.random() * TECH_CHARS.length)]
      : key.toUpperCase();

    this.particles.push({
      mode: "ghost",
      char,
      x: Math.random() * this.width,
      y: this.height * (0.6 + Math.random() * 0.35),
      vy: -(150 + Math.random() * 70),
      alpha: 0.6,
      size: 8 + Math.random() * 10,
      life: 0,
      maxLife: 1.5 + Math.random() * 0.5,
    });

    // 40% chance: spawn a command-prefix fragment (>, $, _)
    if (Math.random() < 0.4) {
      const prefixes = [">", "$", "_", "~", ">>"];
      this.particles.push({
        mode: "ghost",
        char: prefixes[Math.floor(Math.random() * prefixes.length)],
        x: Math.random() * this.width,
        y: this.height * (0.6 + Math.random() * 0.35),
        vy: -(120 + Math.random() * 60),
        alpha: 0.35,
        size: 7 + Math.random() * 5,
        life: 0,
        maxLife: 1 + Math.random() * 0.5,
      });
    }
  }

  updateGhost(p, dt) {
    p.life += dt;
    p.y += p.vy * dt;
    const progress = p.life / p.maxLife;
    // CRT flicker — random alpha jitter
    p.alpha = Math.max(0, (0.6 - progress * 0.5) + (Math.random() - 0.5) * 0.15);
    return p.life < p.maxLife;
  }

  drawGhost(p) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.font = `${p.size}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#40ff80";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#40ff80";
    ctx.fillText(p.char, p.x, p.y);

    // Faint scanline through the char
    if (Math.random() < 0.3) {
      ctx.globalAlpha = 0.08;
      ctx.fillRect(0, p.y + (Math.random() - 0.5) * p.size, this.width, 1);
    }

    ctx.restore();
  }

  // ── Neon Pulse ──────────────────────────────────────────

  spawnNeon(key) {
    const color = NEON_COLORS[this.neonIndex % NEON_COLORS.length];
    this.neonIndex++;

    this.particles.push({
      mode: "neon",
      char: key.toUpperCase(),
      x: Math.random() * this.width,
      y: this.height * (0.4 + Math.random() * 0.4),
      vy: -(40 + Math.random() * 20),
      alpha: 1,
      baseSize: 18 + Math.random() * 24,
      scale: 1.4, // Start big, will pulse down
      life: 0,
      maxLife: 2.5 + Math.random(),
      color,
      wobbleOffset: Math.random() * Math.PI * 2,
    });
  }

  updateNeon(p, dt) {
    p.life += dt;
    p.y += p.vy * dt;
    p.x += Math.sin(p.life * 0.8 + p.wobbleOffset) * 8 * dt;
    const progress = p.life / p.maxLife;

    // Scale pulse: 1.4 → bounce to 1.0 in first 0.3s, then hold
    if (p.life < 0.3) {
      const t = p.life / 0.3;
      // Overshoot ease: goes to 0.9 then settles at 1.0
      p.scale = 1.4 - 0.4 * t + Math.sin(t * Math.PI) * -0.1;
    } else {
      p.scale = 1.0;
    }

    p.alpha = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1;
    return p.life < p.maxLife;
  }

  drawNeon(p) {
    const ctx = this.ctx;
    const size = p.baseSize * p.scale;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.font = `bold ${size}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Multi-layer glow
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 60 * p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillText(p.char, p.x, p.y);

    // Brighter inner layer
    ctx.shadowBlur = 20 * p.alpha;
    ctx.fillText(p.char, p.x, p.y);

    // White core
    ctx.shadowBlur = 0;
    ctx.globalAlpha = p.alpha * 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(p.char, p.x, p.y);

    ctx.restore();
  }

  // ── Data Stream ─────────────────────────────────────────

  spawnDataStream(key) {
    const baseX = Math.random() * this.width;
    const baseY = this.height * (0.6 + Math.random() * 0.3);
    const count = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      // First and last are bright, middle ones are dim
      const isKey = i === 0 || i === count - 1;
      const char = key.toUpperCase();

      this.particles.push({
        mode: "datastream",
        char,
        x: baseX + (Math.random() - 0.5) * 8,
        y: baseY + i * (10 + Math.random() * 6),
        vy: -(200 + Math.random() * 100),
        alpha: 1,
        size: isKey ? 16 + Math.random() * 8 : 10 + Math.random() * 8,
        isKey,
        life: 0,
        maxLife: 1 + Math.random() * 0.5,
      });
    }
  }

  updateDataStream(p, dt) {
    p.life += dt;
    p.y += p.vy * dt;
    const progress = p.life / p.maxLife;
    // Sharp fade at end
    p.alpha = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 0.9;
    return p.life < p.maxLife;
  }

  drawDataStream(p) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.font = `${p.size}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (p.isKey) {
      // Brighter, slightly glowing
      ctx.shadowColor = "#aaccff";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#ddeeff";
    } else {
      // Dimmer data fragments
      ctx.shadowColor = "#667799";
      ctx.shadowBlur = 2;
      ctx.fillStyle = "#8899bb";
    }

    ctx.fillText(p.char, p.x, p.y);
    ctx.restore();
  }

  // ── Glitch Drift ────────────────────────────────────────

  spawnGlitch(key) {
    const x = Math.random() * this.width;
    const y = this.height * (0.4 + Math.random() * 0.4);
    const size = 12 + Math.random() * 14;
    const base = {
      realChar: key.toUpperCase(),
      char: key.toUpperCase(),
      x,
      y,
      baseX: x,
      baseY: y,
      vy: -(50 + Math.random() * 60),
      alpha: 1,
      size,
      life: 0,
      maxLife: 2 + Math.random(),
      settled: false,
    };

    // Main letter (white)
    this.particles.push({
      ...base,
      mode: "glitch",
      glitchRole: "main",
      color: "#ffffff",
    });

    // Red ghost (offset left — wider for bigger chars)
    const offset = 3 + size * 0.15;
    this.particles.push({
      ...base,
      mode: "glitch",
      glitchRole: "red",
      color: "#ff0040",
      offsetX: -offset,
    });

    // Cyan ghost (offset right)
    this.particles.push({
      ...base,
      mode: "glitch",
      glitchRole: "cyan",
      color: "#00ffcc",
      offsetX: offset,
    });
  }

  updateGlitch(p, dt) {
    p.life += dt;
    const progress = p.life / p.maxLife;

    // First 250ms: jitter phase with corruption chars
    if (p.life < 0.25) {
      p.x = p.baseX + (Math.random() - 0.5) * 12;
      p.y = p.baseY + (Math.random() - 0.5) * 6;
      p.alpha = 0.5 + Math.random() * 0.5; // Flicker

      // Show corruption chars during jitter (main only, 40% of frames)
      if (p.glitchRole === "main" && Math.random() < 0.4) {
        p.char = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      } else {
        p.char = p.realChar;
      }
    } else {
      p.char = p.realChar;

      // Settled: drift upward
      if (!p.settled) {
        p.settled = true;
        p.baseX = p.x;
        p.baseY = p.y;
      }
      p.y += p.vy * dt;

      if (p.glitchRole === "main") {
        p.alpha = 1 - progress;
      } else {
        // Ghosts fade faster
        p.alpha = Math.max(0, (1 - progress) * 0.5);
      }
    }

    return p.life < p.maxLife;
  }

  drawGlitch(p) {
    const ctx = this.ctx;
    const ox = p.offsetX || 0;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.font = `${p.size}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (p.glitchRole === "main") {
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 8 * p.alpha;
    }

    ctx.fillStyle = p.color;
    ctx.fillText(p.char, p.x + ox, p.y);

    // Occasional horizontal tear line during early life
    if (p.glitchRole === "main" && p.life < 0.5 && Math.random() < 0.15) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#ff0040";
      ctx.fillRect(p.x - 40, p.y + (Math.random() - 0.5) * p.size, 80, 1);
    }

    ctx.restore();
  }

  // ── Core update/draw ───────────────────────────────────

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      let alive = true;

      switch (p.mode) {
        case "embers":
          alive = this.updateEmbers(p, dt);
          break;
        case "ghost":
          alive = this.updateGhost(p, dt);
          break;
        case "neon":
          alive = this.updateNeon(p, dt);
          break;
        case "datastream":
          alive = this.updateDataStream(p, dt);
          break;
        case "glitch":
          alive = this.updateGlitch(p, dt);
          break;
      }

      if (!alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.particles) {
      switch (p.mode) {
        case "embers":
          this.drawEmbers(p);
          break;
        case "ghost":
          this.drawGhost(p);
          break;
        case "neon":
          this.drawNeon(p);
          break;
        case "datastream":
          this.drawDataStream(p);
          break;
        case "glitch":
          this.drawGlitch(p);
          break;
      }
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this.boundResize);
    this.canvas.remove();
    this.particles = [];
  }
}
