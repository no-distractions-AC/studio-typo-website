/**
 * AudioManager - Web Audio API sound system with Holy Panda switch samples
 * Inspired by kbsim: separate press/release sounds, row-based variants,
 * per-keypress instances for polyphony, and held-key tracking.
 */

import { CONFIG } from "../../config.js";

const PRESS_NAMES = [
  "GENERIC_R0",
  "GENERIC_R1",
  "GENERIC_R2",
  "GENERIC_R3",
  "GENERIC_R4",
  "SPACE",
  "ENTER",
  "BACKSPACE",
];

const RELEASE_NAMES = ["GENERIC", "SPACE", "ENTER", "BACKSPACE"];

const SPECIAL_KEY_MAP = {
  " ": "SPACE",
  Enter: "ENTER",
  Backspace: "BACKSPACE",
};

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.pressBuffers = {};
    this.releaseBuffers = {};
    this.pressedKeys = new Set();
    this.typingLoopSource = null;
    this.typingLoopBuffer = null;
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

      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      this.initialized = true;

      await this.loadSounds();
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      this.enabled = false;
    }
  }

  /**
   * Load all Holy Panda sound files
   */
  async loadSounds() {
    const base = "/assets/audio/holypanda";

    try {
      // Load typing loop (if available)
      this.typingLoopBuffer = await this.loadSound(
        "/assets/audio/typing-loop.ogg",
      );
    } catch (e) {
      // No typing loop file — will use synthetic loop
    }

    // Load all press and release sounds in parallel
    const pressPromises = PRESS_NAMES.map(async (name) => {
      const buffer = await this.loadSound(`${base}/press/${name}.mp3`);
      if (buffer) this.pressBuffers[name] = buffer;
    });

    const releasePromises = RELEASE_NAMES.map(async (name) => {
      const buffer = await this.loadSound(`${base}/release/${name}.mp3`);
      if (buffer) this.releaseBuffers[name] = buffer;
    });

    await Promise.all([...pressPromises, ...releasePromises]);
  }

  /**
   * Load a single sound file
   */
  async loadSound(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return await this.context.decodeAudioData(arrayBuffer);
    } catch (error) {
      return null;
    }
  }

  /**
   * Play key press sound
   */
  playKeyPress(key) {
    if (!this.enabled || !this.initialized) return;

    // Prevent repeat fire when key is held down
    if (key && this.pressedKeys.has(key)) return;
    if (key) this.pressedKeys.add(key);

    const bufferName = this.getPressBufferName(key);
    const buffer = this.pressBuffers[bufferName];
    if (buffer) {
      this.playBuffer(buffer);
    }
  }

  /**
   * Play key release sound
   */
  playKeyRelease(key) {
    if (!this.enabled || !this.initialized) return;

    if (key) this.pressedKeys.delete(key);

    const special = key ? SPECIAL_KEY_MAP[key] : null;
    const bufferName = special || "GENERIC";
    const buffer = this.releaseBuffers[bufferName];
    if (buffer) {
      this.playBuffer(buffer);
    }
  }

  /**
   * Get the press buffer name for a given key
   */
  getPressBufferName(key) {
    if (!key) {
      // No key specified (e.g. typing loop) — random generic
      return `GENERIC_R${Math.floor(Math.random() * 5)}`;
    }

    const special = SPECIAL_KEY_MAP[key];
    if (special) return special;

    // Random row variant for regular keys
    return `GENERIC_R${Math.floor(Math.random() * 5)}`;
  }

  /**
   * Play audio buffer with slight pitch variation
   */
  playBuffer(buffer) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 0.95 + Math.random() * 0.1;

    const gain = this.context.createGain();
    gain.gain.value = CONFIG.audio.keyPressVolume;

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Start background typing loop
   */
  startTypingLoop() {
    if (!this.enabled || !this.initialized) return;

    if (this.typingLoopBuffer) {
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
   * Start synthetic typing loop using press samples
   */
  startSyntheticTypingLoop() {
    const scheduleNextKey = () => {
      if (!this.enabled) {
        this.typingLoopTimeout = null;
        return;
      }

      this.playKeyPress();

      const nextDelay = 800 + Math.random() * 2000;
      this.typingLoopTimeout = setTimeout(scheduleNextKey, nextDelay);
    };

    this.typingLoopTimeout = setTimeout(scheduleNextKey, 500);
  }

  /**
   * Enable or disable sound
   */
  setEnabled(enabled) {
    this.enabled = enabled;

    if (this.masterGain && this.context) {
      this.masterGain.gain.linearRampToValueAtTime(
        enabled ? CONFIG.audio.masterVolume : 0,
        this.context.currentTime + CONFIG.audio.fadeOutDuration / 1000,
      );
    }

    if (!enabled) {
      this.stopTypingLoop();
    }

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
