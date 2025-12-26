import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#3D3D3D",
    textSecondary: "#6B6B6B",
    textMuted: "#9A9A9A",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9A9A9A",
    tabIconSelected: "#5C7C5C",
    link: "#5C7C5C",
    backgroundRoot: "#FAFAF8",
    backgroundDefault: "#F5F5F3",
    backgroundSecondary: "#EEEEEC",
    backgroundTertiary: "#E5E5E3",
    accent: "#5C7C5C",
    accentLight: "#E8F0E8",
    border: "#E0E0DE",
    spendDot: "#A8A8A8",
    noSpendDot: "#C8D8C8",
    notLoggedDot: "#E8E8E6",
    success: "#6B8E6B",
    warning: "#C9A86C",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#B0B0B0",
    textMuted: "#808080",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#8BAF8B",
    link: "#8BAF8B",
    backgroundRoot: "#1A1A18",
    backgroundDefault: "#242422",
    backgroundSecondary: "#2E2E2C",
    backgroundTertiary: "#383836",
    accent: "#8BAF8B",
    accentLight: "#2A3A2A",
    border: "#3A3A38",
    spendDot: "#707070",
    noSpendDot: "#5A7A5A",
    notLoggedDot: "#3A3A38",
    success: "#6B8E6B",
    warning: "#C9A86C",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  inputHeight: 52,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "600" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "500" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 17,
    fontWeight: "400" as const,
  },
  bodyLarge: {
    fontSize: 19,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 15,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 17,
    fontWeight: "500" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
