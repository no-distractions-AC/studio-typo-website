/**
 * Project data for the Work section.
 * Sourced from adventuretown portfolio.
 */

const base = import.meta.env.BASE_URL;

export const PROJECTS = [
  {
    id: "metrics",
    title: "Metrics",
    year: "2023",
    description:
      "A platform to measure things in your life and visualize them via a Telegram bot and web app",
    tags: ["Product", "Web Dev", "Design", "Data Visualization"],
    image: `${base}work/metrics.webp`,
  },
  {
    id: "learn",
    title: "Explore",
    year: "2023",
    description:
      "An AI-powered node graph that helps you find gaps in your knowledge and go deep into any topic",
    tags: ["Solo Product", "Web Dev", "Product", "AI"],
    image: `${base}work/learn.webp`,
  },
  {
    id: "finland-museum",
    title: "Museum Installations",
    year: "2022-2023",
    description:
      "Web-based interactive museum installations developed for museums in and around Finland",
    tags: ["Web Development", "Museum Installation"],
    image: `${base}work/finland-museum.webp`,
  },
  {
    id: "blood-speaks",
    title: "Maya: The Birth of a Superhero",
    year: "2022-2023",
    description:
      "An immersive VR experience following Maya, who becomes a superhero with powers rooted in menstruation",
    tags: ["Development", "Game Design", "Unreal", "VR"],
    image: `${base}work/blood-speaks.webp`,
  },
  {
    id: "chronoline",
    title: "Chronoline",
    year: "2023",
    description:
      "A trivia game that tests your knowledge of the timeline of events",
    tags: ["Solo Creator", "Game", "Unity"],
    image: `${base}work/chronoline.webp`,
  },
  {
    id: "gamed",
    title: "Game'D",
    year: "2020",
    description: "6 games in 6 months, created with my sister Divya Tak",
    tags: ["Development", "Game Design", "Unity", "WebGL"],
    image: `${base}work/gamed.webp`,
  },
  {
    id: "ladyland",
    title: "Ladyland",
    year: "2021",
    description:
      "A narrative-driven game based on Rokeya Hussain's iconic 1907 story, Sultana's Dream",
    tags: ["Development", "Game Design", "Environment", "Unreal"],
    image: `${base}work/ladyland.webp`,
  },
  {
    id: "antariksha",
    title: "Antariksha Sanchar",
    year: "2021-2022",
    description:
      "A single-player action-adventure game set in a fantasy world inspired by Indian mythology and culture",
    tags: ["Development", "Game Design", "Unreal"],
    image: `${base}work/antariksha.webp`,
  },
  {
    id: "honeytwigs",
    title: "Honey Twigs",
    year: "2020",
    description:
      "A cute and cozy visual novel where you play as an employee at a tiny magical cafe conjoined with a nursery",
    tags: ["Development", "Game Design", "Unity"],
    image: `${base}work/honeytwigs.webp`,
  },
  {
    id: "mindless-runner",
    title: "Mindless Runner",
    year: "2019",
    description:
      "An intense endless runner-puzzle hybrid using the stroop effect to mess with the player's mind",
    tags: ["Development", "Game Design", "Game Jam", "Unity"],
    image: `${base}work/mindless-runner.webp`,
  },
  {
    id: "hackathon-room",
    title: "Room Configurator",
    year: "2023",
    description:
      "A tool to automatically generate a room in Blender from a natural language description",
    tags: ["Tool", "3D", "AI", "Development", "Blender", "Hackathon"],
    image: `${base}work/hackathon-room.webp`,
  },
  {
    id: "synesthesia",
    title: "Synesthesia",
    year: "2022",
    description:
      "A short musical experience where environment and music are in sync, created for the Unreal WCP fellowship",
    tags: ["Video Production", "Solo Project", "Unreal"],
    image: `${base}work/synesthesia.webp`,
  },
  {
    id: "bubble-blitz",
    title: "Bubble Blitz",
    year: "2019",
    description:
      "Gulp bubbles tinier than you — made for Ludum Dare 44 in 48 hours",
    tags: ["Solo Creator", "Game", "Unity", "Game Jam"],
    image: `${base}work/bubble-blitz.webp`,
  },
  {
    id: "econagri",
    title: "Econagri",
    year: "2023",
    description:
      "A tile-based city building game where you balance economic and ecological sustainability",
    tags: ["Development", "Game", "Unity"],
    image: `${base}work/econagri.webp`,
  },
  {
    id: "tarq",
    title: "Tarq",
    year: "2020-2021",
    description:
      "A web-based AR experience to explore the gallery space of TARQ, a contemporary art gallery in Mumbai",
    tags: ["Web Dev", "AR", "Museum Installation"],
    image: `${base}work/tarq.webp`,
  },
  {
    id: "futurecapture",
    title: "Futurecapture",
    year: "2022",
    description:
      "A participatory installation that captures your face and creates a new identity in a collective virtual world",
    tags: ["Development", "Museum Installation", "Unity"],
    image: `${base}work/futurecapture.webp`,
  },
  {
    id: "incommon",
    title: "Incommon",
    year: "2023",
    description:
      "A VR experience where the environment becomes part of the stories people share from separate physical locations",
    tags: ["Development", "VR", "Unreal"],
    image: `${base}work/incommon.webp`,
  },
  {
    id: "qslayers",
    title: "QSlayers",
    year: "2022",
    description:
      "A 2D turn-based strategy game where you defeat monsters by answering questions",
    tags: ["Development", "Game Design"],
    image: `${base}work/qslayers.webp`,
  },
  {
    id: "the-poll",
    title: "The Poll",
    year: "2022",
    description:
      "Digitization of the board game 'The Poll' — a multiplayer game simulating Indian General Elections",
    tags: ["Development", "Multiplayer", "Game", "Unity"],
    image: `${base}work/the-poll.webp`,
  },
  {
    id: "civic-game-lab",
    title: "Civic Game Lab",
    year: "2020",
    description:
      "Games for social change that promote civic values by telling South Asia's story through play",
    tags: ["Development", "Game", "Unity"],
    image: `${base}work/civic-game-lab.webp`,
  },
];

export const WORK_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "games", label: "Games", matchTags: ["Game", "Game Design", "Game Jam"] },
  { id: "web", label: "Web", matchTags: ["Web Dev", "Web Development", "Product", "Solo Product"] },
  { id: "xr", label: "XR", matchTags: ["VR", "AR"] },
  { id: "installations", label: "Installations", matchTags: ["Museum Installation"] },
  { id: "ai-tools", label: "AI & Tools", matchTags: ["AI", "Tool"] },
];
