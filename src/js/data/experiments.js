/**
 * Experiment data - curated collection of playable projects and demos.
 */

const base = import.meta.env.BASE_URL;

export const EXPERIMENTS = [
  {
    id: "metrics",
    title: "Metrics",
    description:
      "A platform to measure things in your life and visualize them via a Telegram bot and web app",
    tags: ["Product", "Web Dev", "Data Viz"],
    image: `${base}work/metrics.webp`,
    link: null,
  },
  {
    id: "explore",
    title: "Explore",
    description:
      "An AI-powered node graph that helps you find gaps in your knowledge and go deep into any topic",
    tags: ["AI", "Web Dev", "Product"],
    image: `${base}work/learn.webp`,
    link: null,
  },
  {
    id: "effects-lab",
    title: "Image Effects Lab",
    description:
      "22 interactive WebGL experiments exploring typography, tile physics, masking, and fusion",
    tags: ["WebGL", "Creative Coding"],
    image: null,
    link: "effects-trial.html",
  },
  {
    id: "ascii-studio",
    title: "ASCII Art Studio",
    description:
      "Real-time ASCII art generator with 6 styles, custom character ramps, and animated reveals",
    tags: ["Canvas", "Creative Coding"],
    image: null,
    link: "trial.html",
  },
];
