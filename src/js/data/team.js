/**
 * Team member data - single source of truth
 * Replace placeholder photos with real headshots when available
 */

const base = import.meta.env.BASE_URL;

export const TEAM = [
  {
    id: "charu",
    name: "CHARU TAK",
    role: "Co-Founder",
    photo: `${base}team/charu.webp`,
    bio: "Turning caffeine into code and pixels into experiences.",
    detail:
      "Charu started Studio Typo with a simple conviction — technology should feel like magic, not machinery. A full-stack engineer who's equally at home wrangling WebGL shaders and architecting backend systems, he brings a rare blend of technical depth and design sensibility to every project. Before Studio Typo, he spent years building products at scale, but always felt the craft was missing. Now he obsesses over the details that most people never notice but everyone feels — the weight of a button press, the timing of a transition, the rhythm of an interface. He leads the technical vision and makes sure every line of code earns its place.",
  },
  {
    id: "arpit",
    name: "ARPIT AGARWAL",
    role: "Co-Founder",
    photo: `${base}team/arpit.webp`,
    bio: "Designing at the intersection of beauty and function.",
    detail:
      "Arpit believes that great design is invisible — you don't see it, you feel it. As Creative Director, he shapes the visual language and brand identity of every project that passes through Studio Typo. His process is equal parts intuition and rigour: mood boards give way to pixel-perfect compositions, and every colour choice comes with a rationale. He has an almost unsettling ability to spot a misaligned element from across the room. Before joining the studio, he led design at several startups where he learned that constraints breed creativity. He champions restraint over excess, believing that what you leave out matters as much as what you put in.",
  },
  {
    id: "raji",
    name: "RAJI",
    role: "Lead Developer",
    photo: `${base}team/raji.webp`,
    bio: "Building systems that are elegant under the hood.",
    detail:
      "Raji is the engineer other engineers want to pair with. She brings a calm, methodical approach to even the most chaotic codebases, turning tangled spaghetti into clean, maintainable architecture. As Lead Developer, she's the bridge between ambitious design and bulletproof implementation — if Charu dreams it and Arpit designs it, Raji figures out how to make it real without cutting corners. She's deeply passionate about performance, accessibility, and writing code that future developers will actually enjoy reading. Outside of work, she contributes to open-source projects and mentors junior developers, because she remembers what it felt like to stare at a blank terminal for the first time.",
  },
];
