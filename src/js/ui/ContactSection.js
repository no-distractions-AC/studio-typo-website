/**
 * ContactSection - Manages the contact form, typing reactions, and spell check
 * Lazy-initialized on first visit to the Contact section.
 */

import { TypingReaction } from "./TypingReaction.js";
import { SpellCheck } from "./SpellCheck.js";
import { TypingSpeed } from "./TypingSpeed.js";

export class ContactSection {
  constructor(audioManager, particleCanvas) {
    this.sectionEl = document.getElementById("section-contact");
    this.audioManager = audioManager || null;
    this.particleCanvas = particleCanvas || null;
    this.typingReaction = null;
    this.spellCheck = null;
    this.typingSpeed = null;
    this.initialized = false;
  }

  async activate() {
    if (this.initialized) return;
    this.initialized = true;

    // Ensure audio is ready before attaching typing reaction
    await this.audioManager?.init();

    // Typing reaction — triggers particles + audio on keystroke
    this.typingReaction = new TypingReaction(
      this.sectionEl,
      this.audioManager,
      this.particleCanvas,
    );
    this.typingReaction.init();
    this.typingReaction.attach();

    // Spell check — mirror overlay on the message textarea
    const textarea = document.getElementById("contact-message");
    const mirror = document.getElementById("contact-message-mirror");
    if (textarea && mirror) {
      this.spellCheck = new SpellCheck(textarea, mirror);
      this.spellCheck.attach();
    }

    // Typing speed — WPM display
    const speedEl = document.getElementById("typing-speed");
    if (speedEl) {
      this.typingSpeed = new TypingSpeed(speedEl);
      const inputs = this.sectionEl.querySelectorAll(
        ".form-input, .form-textarea",
      );
      this.typingSpeed.attach([...inputs]);
    }

    this.initFormHandling();
    this.initLabelStates();
    this.initEffectToggle();
  }

  initEffectToggle() {
    const btn = document.getElementById("effect-toggle");
    if (!btn) return;

    const modes = ["embers", "ghost", "neon", "datastream", "glitch"];
    const labels = ["Embers", "Ghost", "Neon", "Stream", "Glitch"];
    let modeIndex = 0;

    btn.textContent = labels[modeIndex];
    btn.addEventListener("click", () => {
      modeIndex = (modeIndex + 1) % modes.length;
      this.particleCanvas.setMode(modes[modeIndex]);
      btn.textContent = labels[modeIndex];
    });
  }

  initFormHandling() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSubmit(form);
    });
  }

  initLabelStates() {
    const inputs = this.sectionEl.querySelectorAll(
      ".form-input, .form-textarea",
    );
    inputs.forEach((input) => {
      const label = input.closest(".form-group")?.querySelector(".form-label");
      if (!label) return;

      input.addEventListener("focus", () => label.classList.add("active"));
      input.addEventListener("blur", () => {
        if (!input.value) label.classList.remove("active");
      });
    });
  }

  handleSubmit(form) {
    const submitBtn = form.querySelector(".form-submit");
    const data = new FormData(form);
    const name = data.get("name")?.trim();
    const email = data.get("email")?.trim();
    const message = data.get("message")?.trim();

    // Basic validation — wiggle the button if fields are empty
    if (!name || !email || !message) {
      submitBtn.style.animation = "typoWiggle 0.3s ease-in-out";
      setTimeout(() => (submitBtn.style.animation = ""), 350);
      return;
    }

    // Show sending state
    submitBtn.classList.add("sending");
    submitBtn.querySelector(".submit-text").classList.add("hidden");
    submitBtn.querySelector(".submit-sending").classList.remove("hidden");

    // Simulate send — show "Sent!" after a brief delay
    setTimeout(() => {
      submitBtn.classList.remove("sending");
      submitBtn.querySelector(".submit-sending").classList.add("hidden");
      submitBtn.querySelector(".submit-sent").classList.remove("hidden");

      // Reset back to "Send Message" after 3 seconds
      setTimeout(() => {
        submitBtn.querySelector(".submit-sent").classList.add("hidden");
        submitBtn.querySelector(".submit-text").classList.remove("hidden");
        form.reset();

        // Clear spell check mirror
        if (this.spellCheck) {
          document.getElementById("contact-message-mirror").innerHTML = "";
        }

        // Reset label states
        this.sectionEl.querySelectorAll(".form-label").forEach((label) => {
          label.classList.remove("active");
        });
      }, 3000);
    }, 1000);
  }

  dispose() {
    this.typingReaction?.dispose();
    this.spellCheck?.dispose();
    this.typingSpeed?.dispose();
    this.initialized = false;
  }
}
