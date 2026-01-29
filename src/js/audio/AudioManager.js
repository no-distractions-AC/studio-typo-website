/**
 * AudioManager - Web Audio API sound system with Cherry MX Blue modal synthesis
 */

import { CONFIG } from "../../config.js";

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.typingLoopSource = null;
    this.typingLoopBuffer = null;
    this.keyPressBuffer = null;
    this.brownNoiseBuffer = null;
    this.enabled = true;
    this.initialized = false;
    this.typingLoopTimeout = null;
  }

  /**
   * Initialize the audio context
   */
  async init() {
    if (this.initialized) return;

    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.masterGain.gain.value = CONFIG.audio.masterVolume;

      // Resume context (required after user interaction)
      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      // Generate brown noise buffer for modal synthesis
      this.brownNoiseBuffer = this.createBrownNoiseBuffer();

      this.initialized = true;

      // Try to load audio files (will fall back to synthetic if not found)
      await this.loadSounds();
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      this.enabled = false;
    }
  }

  /**
   * Create brown noise buffer for modal synthesis
   */
  createBrownNoiseBuffer() {
    const sampleRate = this.context.sampleRate;
    const length = Math.floor(sampleRate * 0.05);
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    return buffer;
  }

  /**
   * Load audio files (optional, falls back to synthetic)
   */
  async loadSounds() {
    try {
      const [loopBuffer, pressBuffer] = await Promise.all([
        this.loadSound("/assets/audio/typing-loop.mp3"),
        this.loadSound("/assets/audio/key-press.mp3"),
      ]);

      this.typingLoopBuffer = loopBuffer;
      this.keyPressBuffer = pressBuffer;
    } catch (error) {
      // Using synthetic sounds as fallback - this is expected
      console.info("Using synthetic audio sounds");
    }
  }

  /**
   * Load a single sound file
   */
  async loadSound(url) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return await this.context.decodeAudioData(arrayBuffer);
    } catch (error) {
      // Silent fail - will use synthetic sounds
      return null;
    }
  }

  /**
   * Start background typing loop
   */
  startTypingLoop() {
    if (!this.enabled || !this.initialized) return;

    if (this.typingLoopBuffer) {
      // Use loaded audio file
      this.typingLoopSource = this.context.createBufferSource();
      this.typingLoopSource.buffer = this.typingLoopBuffer;
      this.typingLoopSource.loop = true;

      const loopGain = this.context.createGain();
      loopGain.gain.setValueAtTime(0, this.context.currentTime);
      loopGain.gain.linearRampToValueAtTime(
        CONFIG.audio.loopVolume,
        this.context.currentTime + CONFIG.audio.fadeInDuration / 1000,
      );

      this.typingLoopSource.connect(loopGain);
      loopGain.connect(this.masterGain);
      this.typingLoopSource.start();
    } else {
      // Use synthetic typing loop
      this.startSyntheticTypingLoop();
    }
  }

  /**
   * Stop typing loop
   */
  stopTypingLoop() {
    if (this.typingLoopSource) {
      try {
        this.typingLoopSource.stop();
        this.typingLoopSource.disconnect();
      } catch (e) {
        // Source may already be stopped
      }
      this.typingLoopSource = null;
    }

    if (this.typingLoopTimeout) {
      clearTimeout(this.typingLoopTimeout);
      this.typingLoopTimeout = null;
    }
  }

  /**
   * Play key press sound
   */
  playKeyPress() {
    if (!this.enabled || !this.initialized) return;

    if (this.keyPressBuffer) {
      this.playBuffer(this.keyPressBuffer);
    } else {
      this.playModalKeypress();
    }
  }

  /**
   * Play audio buffer with slight variation
   */
  playBuffer(buffer) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Slight pitch variation for realism
    source.playbackRate.value = 0.95 + Math.random() * 0.1;

    const pressGain = this.context.createGain();
    pressGain.gain.value = CONFIG.audio.keyPressVolume;

    source.connect(pressGain);
    pressGain.connect(this.masterGain);
    source.start();

    // Auto cleanup
    source.onended = () => {
      source.disconnect();
      pressGain.disconnect();
    };
  }

  /**
   * Play Cherry MX Blue modal synthesis keypress
   * 3 events: click mechanism, bottom-out impact, upstroke return
   */
  playModalKeypress() {
    if (!this.context || !this.brownNoiseBuffer) return;

    const t = this.context.currentTime;

    // Event 1: Click mechanism (t + 0ms)
    this.triggerModalImpact(t, {
      duration: 0.002,
      modes: [
        { freq: 1100 * this.rand(0.97, 1.03), Q: 8, gain: 0.5 },
        { freq: 2200 * this.rand(0.97, 1.03), Q: 5, gain: 0.25 },
        { freq: 3800 * this.rand(0.97, 1.03), Q: 3, gain: 0.1 },
      ],
      masterGain: 0.4,
    });

    // Event 2: Bottom-out impact (t + 1.5ms) - the main "thock"
    this.triggerModalImpact(t + 0.0015, {
      duration: 0.004,
      modes: [
        { freq: 160 * this.rand(0.95, 1.05), Q: 28, gain: 0.7 },
        { freq: 280 * this.rand(0.95, 1.05), Q: 22, gain: 0.5 },
        { freq: 520 * this.rand(0.97, 1.03), Q: 18, gain: 1.0 },
        { freq: 780 * this.rand(0.97, 1.03), Q: 14, gain: 0.6 },
        { freq: 1150 * this.rand(0.97, 1.03), Q: 10, gain: 0.35 },
        { freq: 1800 * this.rand(0.97, 1.03), Q: 6, gain: 0.2 },
        { freq: 2900 * this.rand(0.97, 1.03), Q: 4, gain: 0.1 },
      ],
      masterGain: 0.8,
    });

    // Event 3: Upstroke return (t + 55ms)
    this.triggerModalImpact(t + 0.055, {
      duration: 0.0015,
      modes: [
        { freq: 1250 * this.rand(0.97, 1.03), Q: 7, gain: 0.3 },
        { freq: 2000 * this.rand(0.97, 1.03), Q: 5, gain: 0.15 },
        { freq: 200 * this.rand(0.95, 1.05), Q: 15, gain: 0.2 },
      ],
      masterGain: 0.25,
    });
  }

  /**
   * Trigger a modal impact with bandpass filter bank
   */
  triggerModalImpact(startTime, config) {
    const ctx = this.context;

    // Create noise exciter
    const exciter = ctx.createBufferSource();
    exciter.buffer = this.brownNoiseBuffer;

    // Exciter envelope
    const exciterGain = ctx.createGain();
    exciterGain.gain.setValueAtTime(0.001, startTime);
    exciterGain.gain.linearRampToValueAtTime(1.0, startTime + 0.0001);
    exciterGain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + config.duration,
    );

    exciter.connect(exciterGain);

    // Master gain for this impact
    const impactGain = ctx.createGain();
    impactGain.gain.value = config.masterGain * CONFIG.audio.keyPressVolume;
    impactGain.connect(this.masterGain);

    // Create bandpass filter for each mode
    config.modes.forEach((mode) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = mode.freq;
      filter.Q.value = mode.Q;

      const modeGain = ctx.createGain();
      modeGain.gain.value = mode.gain * this.rand(0.85, 1.15);

      exciterGain.connect(filter);
      filter.connect(modeGain);
      modeGain.connect(impactGain);
    });

    exciter.start(startTime);
    exciter.stop(startTime + config.duration + 0.15);
  }

  /**
   * Random value in range for natural variation
   */
  rand(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Start synthetic typing loop
   */
  startSyntheticTypingLoop() {
    const scheduleNextKey = () => {
      if (!this.enabled) {
        this.typingLoopTimeout = null;
        return;
      }

      this.playModalKeypress();

      // Random interval for natural typing rhythm
      const nextDelay = 100 + Math.random() * 150;
      this.typingLoopTimeout = setTimeout(scheduleNextKey, nextDelay);
    };

    // Start with slight delay
    this.typingLoopTimeout = setTimeout(scheduleNextKey, 500);
  }

  /**
   * Enable or disable sound
   */
  setEnabled(enabled) {
    this.enabled = enabled;

    // Fade instead of abrupt cut
    if (this.masterGain && this.context) {
      this.masterGain.gain.linearRampToValueAtTime(
        enabled ? CONFIG.audio.masterVolume : 0,
        this.context.currentTime + CONFIG.audio.fadeOutDuration / 1000,
      );
    }

    // Stop typing loop when disabled
    if (!enabled) {
      this.stopTypingLoop();
    }

    // Persist preference
    localStorage.setItem(CONFIG.sound.storageKey, String(enabled));
  }

  /**
   * Toggle sound on/off
   */
  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stopTypingLoop();
    if (this.context) {
      this.context.close();
    }
  }
}
