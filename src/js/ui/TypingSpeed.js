/**
 * TypingSpeed - Live WPM (words per minute) display
 * Uses a rolling window of keystroke timestamps to calculate speed
 */

export class TypingSpeed {
  constructor(displayEl) {
    this.display = displayEl;
    this.keyTimes = [];
    this.windowMs = 10000; // 10-second rolling window
    this.updateInterval = null;
    this.fadeTimeout = null;
    this.attached = false;
    this.handleKey = this.handleKey.bind(this);
  }

  attach(inputs) {
    if (this.attached) return;
    this.attached = true;

    this.inputs = inputs;
    inputs.forEach((input) => {
      input.addEventListener("keydown", this.handleKey);
    });
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;

    this.inputs?.forEach((input) => {
      input.removeEventListener("keydown", this.handleKey);
    });

    this.stopUpdating();
    this.display.classList.remove("visible");
    this.display.textContent = "";
    this.keyTimes = [];
  }

  handleKey(event) {
    // Only count character keys
    if (event.key.length > 1) return;

    this.keyTimes.push(performance.now());

    // Show the display
    this.display.classList.add("visible");

    // Start updating if not already
    if (!this.updateInterval) {
      this.updateDisplay();
      this.updateInterval = setInterval(() => this.updateDisplay(), 500);
    }

    // Reset fade-out timer
    clearTimeout(this.fadeTimeout);
    this.fadeTimeout = setTimeout(() => {
      this.display.classList.remove("visible");
      this.stopUpdating();
    }, 2000);
  }

  updateDisplay() {
    const now = performance.now();

    // Prune old entries outside the window
    this.keyTimes = this.keyTimes.filter(
      (t) => now - t < this.windowMs,
    );

    if (this.keyTimes.length < 2) {
      this.display.textContent = "0 wpm";
      return;
    }

    // Time span of keystrokes in the window
    const oldest = this.keyTimes[0];
    const spanMinutes = (now - oldest) / 60000;

    // WPM: 1 word = 5 characters
    const wpm = Math.round(this.keyTimes.length / 5 / spanMinutes);
    this.display.textContent = `${wpm} wpm`;
  }

  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  dispose() {
    this.detach();
    clearTimeout(this.fadeTimeout);
  }
}
