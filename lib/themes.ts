export type Deco = "hearts" | "stars" | "petals" | "pixels" | "bubbles" | "sparkles";

export type Theme = {
  id: string;
  name: string;
  tagline: string;
  /** CSS filter used on the live preview and on captured frames. */
  filter: string;
  /** Strip background gradient, top to bottom. */
  bg: [string, string];
  /** Border colour around each photo. */
  frame: string;
  /** Footer text colour. */
  text: string;
  /** Colours used for the decorations. */
  decoColors: string[];
  deco: Deco;
};

export const THEMES: Theme[] = [
  {
    id: "bubblegum",
    name: "Bubblegum",
    tagline: "classic pink, extra sweet",
    filter: "saturate(1.15) contrast(1.05) brightness(1.05)",
    bg: ["#ffd1e8", "#ff8cc6"],
    frame: "#ffffff",
    text: "#b0005a",
    decoColors: ["#ff4fa3", "#ffffff", "#ff9bd0"],
    deco: "hearts",
  },
  {
    id: "y2k",
    name: "Y2K Glitter",
    tagline: "chrome dreams and sparkle",
    filter: "saturate(1.4) contrast(1.15) hue-rotate(-10deg)",
    bg: ["#f9c6ff", "#9b7bff"],
    frame: "#fff4ff",
    text: "#4b1a8c",
    decoColors: ["#ffffff", "#ffe36e", "#ff7ad9"],
    deco: "sparkles",
  },
  {
    id: "sakura",
    name: "Cherry Blossom",
    tagline: "soft petals, soft focus",
    filter: "brightness(1.08) saturate(0.9) sepia(0.12)",
    bg: ["#fff0f5", "#ffc2d6"],
    frame: "#ffffff",
    text: "#c2416b",
    decoColors: ["#ffb3c9", "#ff8fb1", "#ffe0ea"],
    deco: "petals",
  },
  {
    id: "arcade",
    name: "Retro Arcade",
    tagline: "insert coin to smile",
    filter: "contrast(1.25) saturate(1.3)",
    bg: ["#2b0a3d", "#ff2e88"],
    frame: "#ffe600",
    text: "#ffe600",
    decoColors: ["#00f0ff", "#ffe600", "#ff2e88"],
    deco: "pixels",
  },
  {
    id: "strawberry",
    name: "Strawberry Milk",
    tagline: "creamy, dreamy, a little fizzy",
    filter: "brightness(1.1) contrast(0.95) saturate(1.05)",
    bg: ["#fff7fa", "#ffb6c8"],
    frame: "#fff",
    text: "#e0436f",
    decoColors: ["#ff6f91", "#ffffff", "#ffc4d3"],
    deco: "bubbles",
  },
  {
    id: "midnight",
    name: "Midnight Kiss",
    tagline: "moody pink after dark",
    filter: "grayscale(0.35) contrast(1.2) brightness(0.95)",
    bg: ["#1a0b1f", "#5c1a4a"],
    frame: "#ff7ac4",
    text: "#ffb3dd",
    decoColors: ["#ff7ac4", "#ffffff", "#c86bff"],
    deco: "stars",
  },
];

export const getTheme = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
