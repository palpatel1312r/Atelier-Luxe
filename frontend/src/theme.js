export const THEME_STORAGE = "b2b-wholesale-ui-theme";
export const MOTION_STORAGE = "b2b-wholesale-motion-level";

export const TRADE_THEMES = [
  { id: "cobalt", label: "Ocean Blue", description: "Fresh blue & aqua", mode: "light", colors: ["#EFF6FF", "#2563EB", "#06B6D4"] },
  { id: "sapphire", label: "Indigo", description: "Rich indigo & periwinkle", mode: "light", colors: ["#EEF2FF", "#4F46E5", "#818CF8"] },
  { id: "emerald", label: "Emerald", description: "Leaf green & mint", mode: "light", colors: ["#ECFDF5", "#047857", "#14B8A6"] },
  { id: "teal", label: "Lagoon", description: "Calm teal & turquoise", mode: "light", colors: ["#F0FDFA", "#0F766E", "#22D3EE"] },
  { id: "sunset", label: "Sunset", description: "Warm orange & gold", mode: "light", colors: ["#FFF7ED", "#C2410C", "#F59E0B"] },
  { id: "daylight", label: "Daylight / White", description: "Clean catalog, max readability", mode: "light", colors: ["#FFFFFF", "#2563EB", "#38BDF8"] },
  { id: "graphite", label: "Graphite", description: "Neutral gray + blue accent", mode: "light", colors: ["#F1F5F9", "#334155", "#3B82F6"] },
  { id: "violet", label: "Lavender", description: "Violet & soft lavender", mode: "light", colors: ["#F5F3FF", "#7C3AED", "#C084FC"] },
];

const LEGACY_THEMES = {
  light: "cobalt",
  dark: "sapphire",
  obsidian: "sapphire",
  orchid: "violet",
  amber: "sunset",
  rose: "daylight",
  midnight: "sapphire",
  forest: "emerald",
  "amber-trade": "sunset",
};

export function getTradeTheme(value) {
  const id = LEGACY_THEMES[value] || value;
  return TRADE_THEMES.find((theme) => theme.id === id) || TRADE_THEMES[0];
}

export function readTradeTheme() {
  try {
    return getTradeTheme(localStorage.getItem(THEME_STORAGE)).id;
  } catch {
    return TRADE_THEMES[0].id;
  }
}

export function applyTradeTheme(value) {
  const theme = getTradeTheme(value);
  document.documentElement.dataset.tradeTheme = theme.id;
  document.documentElement.dataset.colorMode = theme.mode;
  document.documentElement.style.colorScheme = theme.mode;
  try {
    localStorage.setItem(THEME_STORAGE, theme.id);
  } catch {
    // The selected palette still works when browser storage is restricted.
  }
  return theme.id;
}

export function readMotionLevel() {
  try {
    return localStorage.getItem(MOTION_STORAGE) === "calm" ? "calm" : "vivid";
  } catch {
    return "vivid";
  }
}

export function applyMotionLevel(value) {
  const level = value === "calm" ? "calm" : "vivid";
  document.documentElement.dataset.motionLevel = level;
  try {
    localStorage.setItem(MOTION_STORAGE, level);
  } catch {
    // Animation preferences can also be applied without browser storage.
  }
  return level;
}
