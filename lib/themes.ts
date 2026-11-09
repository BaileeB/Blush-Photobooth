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
  /** Small line printed at the bottom of the strip. */
  stripLabel: string;
  /** Colours for the whole booth screen. */
  ui: {
    page: string;
    panel: string;
    ink: string;
    accent: string;
    accentDark: string;
  };
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
    stripLabel: "Bubblegum edition · pop!",
    ui: {
      page: "linear-gradient(160deg, #ffe6f2 0%, #ffc4e1 55%, #ff9fcf 100%)",
      panel: "rgba(255,255,255,0.8)",
      ink: "#4a0a2c",
      accent: "#ff4fa3",
      accentDark: "#b8146a",
    },
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
    stripLabel: "Y2K Glitter edition · totally iconic",
    ui: {
      page: "linear-gradient(135deg, #fbe3ff 0%, #d9c6ff 45%, #9fd8ff 100%)",
      panel: "rgba(255,255,255,0.72)",
      ink: "#36125f",
      accent: "#b05cff",
      accentDark: "#5b1fa8",
    },
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
    stripLabel: "Cherry Blossom edition · spring forever",
    ui: {
      page: "linear-gradient(170deg, #fff6f9 0%, #ffe0ea 50%, #ffc9da 100%)",
      panel: "rgba(255,255,255,0.85)",
      ink: "#6b1d3a",
      accent: "#e86a92",
      accentDark: "#a8345a",
    },
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
    stripLabel: "Retro Arcade edition · GAME ON",
    ui: {
      page: "radial-gradient(circle at 50% 0%, #5a1470 0%, #240833 55%, #12031c 100%)",
      panel: "rgba(40, 8, 56, 0.85)",
      ink: "#ffe600",
      accent: "#ff2e88",
      accentDark: "#00c8d6",
    },
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
    stripLabel: "Strawberry Milk edition · extra sweet",
    ui: {
      page: "linear-gradient(180deg, #fffafc 0%, #ffe3ec 50%, #ffc7d6 100%)",
      panel: "rgba(255,255,255,0.85)",
      ink: "#7a1734",
      accent: "#ff6f91",
      accentDark: "#c43a5e",
    },
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
    stripLabel: "Midnight Kiss edition · after hours",
    ui: {
      page: "radial-gradient(circle at 30% 20%, #4a1340 0%, #1f0a24 50%, #0d0410 100%)",
      panel: "rgba(36, 12, 40, 0.82)",
      ink: "#ffd1ec",
      accent: "#ff7ac4",
      accentDark: "#c86bff",
    },
  },
];

export const getTheme = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
