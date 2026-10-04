import { createContext, createElement, useContext, type ReactNode } from "react";
import { useColorScheme, type TextStyle } from "react-native";

type ColorScheme = "light" | "dark";

interface Colors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  border: string;
  input: string;
  field: string;
  ring: string;
  /** Behind sheets and dialogs. Not in the web theme, where it is `bg-black/50`. */
  overlay: string;
}

/**
 * The colours of every Corsair Native component, with the names and values of
 * the web theme (`@corsair-ui/theme`), so an app and its site match. Change
 * them here to brand the app: `primary`, `primaryForeground` and `ring` first.
 * Use hex or rgb()/rgba(); React Native does not read oklch().
 */
const palette: Record<ColorScheme, Colors> = {
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    card: "#ffffff",
    cardForeground: "#0a0a0a",
    popover: "#ffffff",
    popoverForeground: "#0a0a0a",
    primary: "#171717",
    primaryForeground: "#fafafa",
    secondary: "#f5f5f5",
    secondaryForeground: "#171717",
    muted: "#f5f5f5",
    mutedForeground: "#6f6f6f",
    accent: "#f5f5f5",
    accentForeground: "#171717",
    destructive: "#dc2626",
    destructiveForeground: "#ffffff",
    success: "#16a34a",
    warning: "#d97706",
    border: "#e5e5e5",
    input: "#e5e5e5",
    field: "#ffffff",
    ring: "#737373",
    overlay: "rgba(0, 0, 0, 0.5)",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    card: "#171717",
    cardForeground: "#fafafa",
    popover: "#171717",
    popoverForeground: "#fafafa",
    primary: "#fafafa",
    primaryForeground: "#171717",
    secondary: "#262626",
    secondaryForeground: "#fafafa",
    muted: "#262626",
    mutedForeground: "#a3a3a3",
    accent: "#262626",
    accentForeground: "#fafafa",
    destructive: "#ef4444",
    destructiveForeground: "#0a0a0a",
    success: "#4ade80",
    warning: "#fbbf24",
    border: "rgba(255, 255, 255, 0.1)",
    input: "rgba(255, 255, 255, 0.15)",
    field: "rgba(255, 255, 255, 0.05)",
    ring: "#737373",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
};

/** The web theme's `--radius` (0.625rem) in px. 0 gives square corners everywhere. */
const RADIUS = 10;

/** Corner radii in px, derived from `RADIUS` like the web's rounded-sm to rounded-xl. */
const radius = {
  sm: Math.max(0, RADIUS - 4),
  md: Math.max(0, RADIUS - 2),
  lg: RADIUS,
  xl: RADIUS + 4,
  full: 9999,
} as const;

/** Font sizes and line heights in px, Tailwind's text-xs to text-4xl. */
const text = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 30, lineHeight: 36 },
  "4xl": { fontSize: 36, lineHeight: 40 },
} as const;

type FontWeightName = "regular" | "medium" | "semibold" | "bold";

/**
 * Font families per weight. A custom font in React Native ignores
 * `fontWeight`: every weight is its own family, so when you load one (with
 * expo-font) name all four here. Left undefined, the system font is used.
 */
const fonts: Record<FontWeightName, string | undefined> = {
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
};

const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const satisfies Record<FontWeightName, TextStyle["fontWeight"]>;

/** The style for a weight: the family from `fonts` when there is one, else the system font's weight. */
function font(weight: FontWeightName = "regular"): TextStyle {
  const family = fonts[weight];
  return family ? { fontFamily: family } : { fontWeight: fontWeights[weight] };
}

/**
 * Shadows as `boxShadow` strings (React Native 0.76+ with the New
 * Architecture, and the web). Tailwind's shadow-sm, shadow-md and shadow-lg.
 */
const shadow = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
} as const;

/**
 * Durations in ms and springs shared by every animated item. The springs use
 * stiffness, damping and mass, which both React Native's `Animated.spring`
 * and Reanimated's `withSpring` accept.
 */
const motion = {
  duration: { fast: 120, base: 200, slow: 360 },
  spring: {
    /** Settles fast with barely any overshoot: thumbs, toggles, sheets. */
    snappy: { stiffness: 380, damping: 32, mass: 1 },
    /** A visible bounce: pops, stamps, stars. */
    bouncy: { stiffness: 260, damping: 14, mass: 1 },
    /** Slow and soft: things entering the screen. */
    gentle: { stiffness: 140, damping: 18, mass: 1 },
  },
} as const;

interface Theme {
  scheme: ColorScheme;
  colors: Colors;
  radius: typeof radius;
  text: typeof text;
  shadow: typeof shadow;
  motion: typeof motion;
  font: typeof font;
}

/** Both themes, built once so `useTheme()` returns the same object between renders. */
const themes: Record<ColorScheme, Theme> = {
  light: { scheme: "light", colors: palette.light, radius, text, shadow, motion, font },
  dark: { scheme: "dark", colors: palette.dark, radius, text, shadow, motion, font },
};

const ThemeContext = createContext<ColorScheme | null>(null);

interface ThemeProviderProps {
  /** Forces light or dark below it. Left out, it follows the parent provider or the device. */
  scheme?: ColorScheme;
  children?: ReactNode;
}

/**
 * Optional: without it, components follow the device's light or dark mode.
 * Wrap the app (or one screen) to force a scheme, e.g. from a setting.
 */
function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  const parent = useContext(ThemeContext);
  return createElement(ThemeContext.Provider, { value: scheme ?? parent }, children);
}

/** The current theme: colours for the active scheme, plus radii, type, shadows and motion. */
function useTheme(): Theme {
  const forced = useContext(ThemeContext);
  const device = useColorScheme();
  return themes[forced ?? (device === "dark" ? "dark" : "light")];
}

/**
 * A colour at a fraction of its opacity, like `bg-primary/20` on the web.
 * Takes #rgb, #rgba, #rrggbb, #rrggbbaa, rgb() and rgba(), and multiplies an
 * existing alpha. Anything else (a named colour) is returned unchanged.
 */
function withAlpha(color: string, alpha: number): string {
  const amount = Math.min(Math.max(alpha, 0), 1);
  let channels: [number, number, number, number] | null = null;

  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(color.trim());
  if (hex?.[1]) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((digit) => digit + digit).join("") : hex[1];
    const byte = (index: number) => parseInt(digits.slice(index * 2, index * 2 + 2), 16);
    channels = [byte(0), byte(1), byte(2), digits.length === 8 ? byte(3) / 255 : 1];
  }

  const rgb =
    /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d*\.?\d+)(%?))?\s*\)$/i.exec(
      color.trim()
    );
  if (rgb?.[1] && rgb[2] && rgb[3]) {
    const base = rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1);
    channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), base];
  }

  if (!channels) return color;
  const [red, green, blue, base] = channels;
  const opacity = Math.round(base * amount * 1000) / 1000;
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export {
  font,
  ThemeProvider,
  themes,
  useTheme,
  withAlpha,
  type Colors,
  type ColorScheme,
  type FontWeightName,
  type Theme,
  type ThemeProviderProps,
};
