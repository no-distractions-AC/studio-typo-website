# Cherry MX Blue Keyboard Sound - Modal Synthesis Settings

## Overview

This document contains the exact settings used to synthesize a mechanical keyboard sound using **Modal Synthesis** with the Web Audio API. Unlike oscillator-based synthesis, this approach uses noise excitation through resonant filters to model physical object vibrations.

---

## Architecture

```
[Brown Noise Burst] --> [Parallel Bandpass Filters] --> [Output]
      (2-4ms)              (Modal Filter Bank)
                                   |
                           Each filter = one resonant mode
                           Q value = decay time
                           Non-harmonic ratios = plastic character
```

---

## Noise Exciter Settings

**Type:** Brown noise (integrated white noise)

**Generation Algorithm:**

```javascript
let lastOut = 0;
for (let i = 0; i < length; i++) {
  const white = Math.random() * 2 - 1;
  lastOut = (lastOut + 0.02 * white) / 1.02;
  data[i] = lastOut * 3.5;
}
```

**Why Brown Noise:**

- More low-frequency energy than white or pink noise
- Better simulates the energy distribution of physical impacts
- Creates warmer, fuller transients

---

## Event Timeline

| Event             | Timing    | Duration | Master Gain | Character                 |
| ----------------- | --------- | -------- | ----------- | ------------------------- |
| Click mechanism   | t + 0ms   | 2ms      | 0.4         | Sharp, high-frequency     |
| Bottom-out impact | t + 1.5ms | 4ms      | 0.8         | Deep "thock" (main sound) |
| Upstroke return   | t + 55ms  | 1.5ms    | 0.25        | Light click               |

---

## Modal Frequencies

### Event 1: Click Mechanism (t + 0ms)

Models the click jacket releasing - sharp, percussive.

| Mode | Frequency | Q Factor | Gain | Notes         |
| ---- | --------- | -------- | ---- | ------------- |
| 1    | 1100 Hz   | 8        | 0.50 | Primary click |
| 2    | 2200 Hz   | 5        | 0.25 | Brightness    |
| 3    | 3800 Hz   | 3        | 0.10 | Air/transient |

**Exciter Duration:** 2ms
**Master Gain:** 0.4

---

### Event 2: Bottom-Out Impact (t + 1.5ms)

The main "thock" - keycap hitting the housing. This is the satisfying part.

| Mode | Frequency | Q Factor | Gain | Category             |
| ---- | --------- | -------- | ---- | -------------------- |
| 1    | 160 Hz    | 28       | 0.70 | Case resonance (low) |
| 2    | 280 Hz    | 22       | 0.50 | Case resonance (mid) |
| 3    | 520 Hz    | 18       | 1.00 | Keycap fundamental   |
| 4    | 780 Hz    | 14       | 0.60 | Keycap mode (~1.5x)  |
| 5    | 1150 Hz   | 10       | 0.35 | Keycap mode (~2.2x)  |
| 6    | 1800 Hz   | 6        | 0.20 | Upper harmonic       |
| 7    | 2900 Hz   | 4        | 0.10 | Brightness/air       |

**Exciter Duration:** 4ms
**Master Gain:** 0.8

**Key Design Principles:**

- Non-harmonic frequency ratios (1x, 1.5x, 2.2x) = plastic sound
- Higher Q for low frequencies = longer decay (physics-accurate)
- Lower Q for high frequencies = faster decay

---

### Event 3: Upstroke Return (t + 55ms)

Key returning to rest position - lighter than downstroke.

| Mode | Frequency | Q Factor | Gain | Notes      |
| ---- | --------- | -------- | ---- | ---------- |
| 1    | 1250 Hz   | 7        | 0.30 | Click      |
| 2    | 2000 Hz   | 5        | 0.15 | Brightness |
| 3    | 200 Hz    | 15       | 0.20 | Case thump |

**Exciter Duration:** 1.5ms
**Master Gain:** 0.25

---

## Randomization for Natural Variation

Each keypress should sound slightly different. Apply these random variations:

| Parameter        | Variation Range                    |
| ---------------- | ---------------------------------- |
| Mode frequencies | +/- 3% (multiply by 0.97 to 1.03)  |
| Mode gains       | +/- 15% (multiply by 0.85 to 1.15) |
| Case frequencies | +/- 5% (multiply by 0.95 to 1.05)  |

---

## Q Factor to Decay Time Relationship

The Q factor of a bandpass filter determines how long the resonance rings:

| Q Value | Approximate Decay | Use For         |
| ------- | ----------------- | --------------- |
| 3-5     | Very short (~5ms) | Transients, air |
| 6-10    | Short (~10-20ms)  | Upper harmonics |
| 14-18   | Medium (~30-50ms) | Keycap body     |
| 22-28   | Long (~60-100ms)  | Case resonance  |

**Formula (approximate):**

```
Decay time (seconds) ≈ Q / (π × frequency)
```

---

## Exciter Envelope Settings

```javascript
// Attack: 0.1ms (essentially instant)
gain.setValueAtTime(0.001, startTime);
gain.linearRampToValueAtTime(1.0, startTime + 0.0001);

// Decay: matches exciter duration
gain.exponentialRampToValueAtTime(0.001, startTime + duration);
```

---

## Material Tuning Guide

To adjust for different keycap materials:

| Material      | Adjustment                            |
| ------------- | ------------------------------------- |
| PBT (thocky)  | Emphasize 400-600 Hz, reduce 1500+ Hz |
| ABS (clacky)  | Emphasize 800-1200 Hz                 |
| Thick keycaps | Lower all frequencies by 10-20%       |
| Thin keycaps  | Raise all frequencies by 10-20%       |
| Aluminum case | Add mode at 3000-4000 Hz with Q=10    |
| Plastic case  | Current settings are tuned for this   |

---

## Complete JavaScript Implementation

```javascript
const ModalKeypress = {
  ctx: null,
  noiseBuffer: null,

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Generate brown noise buffer
    const sr = this.ctx.sampleRate;
    const length = Math.floor(sr * 0.05);
    const buffer = this.ctx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    this.noiseBuffer = buffer;
  },

  play() {
    if (!this.ctx) this.init();
    if (this.ctx.state === "suspended") this.ctx.resume();

    const t = this.ctx.currentTime;

    // Event 1: Click mechanism
    this.triggerModalImpact(t, {
      duration: 0.002,
      modes: [
        { freq: 1100 * this.rand(0.97, 1.03), Q: 8, gain: 0.5 },
        { freq: 2200 * this.rand(0.97, 1.03), Q: 5, gain: 0.25 },
        { freq: 3800 * this.rand(0.97, 1.03), Q: 3, gain: 0.1 },
      ],
      masterGain: 0.4,
    });

    // Event 2: Bottom-out impact
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

    // Event 3: Upstroke return
    this.triggerModalImpact(t + 0.055, {
      duration: 0.0015,
      modes: [
        { freq: 1250 * this.rand(0.97, 1.03), Q: 7, gain: 0.3 },
        { freq: 2000 * this.rand(0.97, 1.03), Q: 5, gain: 0.15 },
        { freq: 200 * this.rand(0.95, 1.05), Q: 15, gain: 0.2 },
      ],
      masterGain: 0.25,
    });
  },

  triggerModalImpact(startTime, config) {
    const ctx = this.ctx;

    const exciter = ctx.createBufferSource();
    exciter.buffer = this.noiseBuffer;

    const exciterGain = ctx.createGain();
    exciterGain.gain.setValueAtTime(0.001, startTime);
    exciterGain.gain.linearRampToValueAtTime(1.0, startTime + 0.0001);
    exciterGain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + config.duration,
    );

    exciter.connect(exciterGain);

    const masterGain = ctx.createGain();
    masterGain.gain.value = config.masterGain;
    masterGain.connect(ctx.destination);

    config.modes.forEach((mode) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = mode.freq;
      filter.Q.value = mode.Q;

      const modeGain = ctx.createGain();
      modeGain.gain.value = mode.gain * this.rand(0.85, 1.15);

      exciterGain.connect(filter);
      filter.connect(modeGain);
      modeGain.connect(masterGain);
    });

    exciter.start(startTime);
    exciter.stop(startTime + config.duration + 0.15);
  },

  rand(min, max) {
    return min + Math.random() * (max - min);
  },
};
```

---

## Why Modal Synthesis Works Better Than Oscillators

| Aspect    | Oscillators           | Modal Synthesis          |
| --------- | --------------------- | ------------------------ |
| Waveform  | Periodic, predictable | Chaotic, natural         |
| Attack    | Smooth ramp           | Sharp transient          |
| Decay     | Artificial envelope   | Physics-based (Q factor) |
| Variation | Identical each time   | Natural randomness       |
| Character | "Electronic"          | "Physical material"      |

---

## Limitations

This is the most physically-accurate approach possible with Web Audio API synthesis. However, it cannot perfectly replicate a real keyboard because:

1. Real impacts have infinitely complex micro-structure
2. Room acoustics and microphone characteristics add coloration
3. Physical materials have thousands of resonant modes, not just 7-10

For perfect realism, use a **recorded audio sample** of an actual Cherry MX Blue keypress.

---

## Version History

- **v1.0** - Initial modal synthesis implementation
- Based on research from CCRMA Stanford modal synthesis, keycap acoustics studies, and ASMR audio analysis
