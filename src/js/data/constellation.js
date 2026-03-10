/**
 * Constellation data model — clusters and their child skills.
 */

export const CLUSTERS = [
  {
    id: "creative",
    label: "Creative Depth",
    cx: 0.3,
    cy: 0.38,
    labelAlign: "left", // label goes outward (left of node)
  },
  {
    id: "engineering",
    label: "Engineering Strength",
    cx: 0.7,
    cy: 0.38,
    labelAlign: "right", // label goes outward (right of node)
  },
  {
    id: "business",
    label: "Building Around\nYour Business",
    cx: 0.5,
    cy: 0.75,
    labelAlign: "center", // label goes below
  },
];

export const NODES = [
  // Creative-only
  { id: "gen-art", label: "Generative Art", clusters: ["creative"] },
  {
    id: "installations",
    label: "Interactive Installations",
    clusters: ["creative"],
  },

  // Engineering-only
  { id: "api-dev", label: "API Development", clusters: ["engineering"] },
  { id: "cloud-devops", label: "Cloud / DevOps", clusters: ["engineering"] },
  { id: "data-eng", label: "Data Engineering", clusters: ["engineering"] },

  // Business-only
  { id: "strategy", label: "Strategy & Consulting", clusters: ["business"] },
  { id: "growth", label: "Growth & Analytics", clusters: ["business"] },

  // Creative + Engineering
  {
    id: "ai-ml",
    label: "AI / Machine Learning",
    clusters: ["creative", "engineering"],
  },
  {
    id: "game-dev",
    label: "Game Development",
    clusters: ["creative", "engineering"],
  },
  { id: "vr-ar", label: "VR / AR", clusters: ["creative", "engineering"] },

  // Creative + Business
  {
    id: "ux-research",
    label: "UX Research",
    clusters: ["creative", "business"],
  },
  {
    id: "design-systems",
    label: "Design Systems",
    clusters: ["creative", "business"],
  },

  // Engineering + Business
  {
    id: "web-platforms",
    label: "Web Platforms",
    clusters: ["engineering", "business"],
  },
  {
    id: "mobile-apps",
    label: "Mobile Apps",
    clusters: ["engineering", "business"],
  },

  // All three
  {
    id: "software-eng",
    label: "Software Engineering",
    clusters: ["creative", "engineering", "business"],
  },
  {
    id: "product",
    label: "Product Thinking",
    clusters: ["creative", "engineering", "business"],
  },
  {
    id: "cv",
    label: "Computer Vision",
    clusters: ["creative", "engineering", "business"],
  },
];

/**
 * Get all skills belonging to a cluster (including shared ones).
 */
export function getSkillsForCluster(clusterId) {
  return NODES.filter((n) => n.clusters.includes(clusterId));
}
