import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { STORY_SAFE_AREA, STORY_SIZE, useStoryUnit } from "@/registry/native/lib/story-export";
import { useTheme, withAlpha } from "@/registry/native/lib/theme";

/**
 * The colours a story is drawn with: the same shape and presets as the web
 * `story` item. `backgroundImage` takes a CSS `linear-gradient(…)`, drawn
 * with react-native-svg.
 */
interface StoryTheme {
  background: string;
  /** Drawn over `background`: `linear-gradient(165deg, #0c2a6b 0%, #041029 70%)`. */
  backgroundImage?: string;
  foreground: string;
  muted: string;
  /** Solid tiles and chips, the call to action, eyebrows and glows. */
  accent: string;
  /** Text on the accent. */
  accentForeground: string;
  /** Soft tiles and chips. */
  surface: string;
  /** Outlines and dividers. */
  border: string;
}

const STORY_THEMES = {
  midnight: {
    background: "#09090b",
    foreground: "#fafafa",
    muted: "rgba(250, 250, 250, 0.6)",
    accent: "#c6f432",
    accentForeground: "#09090b",
    surface: "rgba(250, 250, 250, 0.08)",
    border: "rgba(250, 250, 250, 0.16)",
  },
  paper: {
    background: "#f3efe6",
    foreground: "#141414",
    muted: "rgba(20, 20, 20, 0.58)",
    accent: "#ff5a1f",
    accentForeground: "#ffffff",
    surface: "rgba(20, 20, 20, 0.06)",
    border: "rgba(20, 20, 20, 0.14)",
  },
  ocean: {
    background: "#041029",
    backgroundImage: "linear-gradient(165deg, #0c2a6b 0%, #041029 70%)",
    foreground: "#eef5ff",
    muted: "rgba(238, 245, 255, 0.64)",
    accent: "#5ee7ff",
    accentForeground: "#041029",
    surface: "rgba(238, 245, 255, 0.1)",
    border: "rgba(238, 245, 255, 0.2)",
  },
  sunset: {
    background: "#ff3d77",
    backgroundImage: "linear-gradient(165deg, #ff8a3d 0%, #ff3d77 50%, #7b2cff 100%)",
    foreground: "#ffffff",
    muted: "rgba(255, 255, 255, 0.8)",
    accent: "#ffffff",
    accentForeground: "#2b0b3f",
    surface: "rgba(255, 255, 255, 0.18)",
    border: "rgba(255, 255, 255, 0.4)",
  },
  mono: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    muted: "rgba(10, 10, 10, 0.55)",
    accent: "#0a0a0a",
    accentForeground: "#ffffff",
    surface: "rgba(10, 10, 10, 0.06)",
    border: "rgba(10, 10, 10, 0.16)",
  },
} satisfies Record<string, StoryTheme>;

type StoryThemeName = keyof typeof STORY_THEMES;

type StoryDecoration = "none" | "glow" | "dots" | "grid";

/** A URL, or what `Image` takes, such as `require("./logo.png")`. */
type StoryImageSource = string | ImageSourcePropType;

/** Side padding of the content: the safe area's, plus a little air. */
const SIDE = STORY_SAFE_AREA.side + 8;
/** Width of the content between the side paddings, in story px. */
const STORY_CONTENT_WIDTH = STORY_SIZE.width - SIDE * 2;

type Px = (value: number) => number;

interface StoryContextValue {
  colors: StoryTheme;
  /** Corner radius of tiles, images and cards, in story px. */
  radius: number;
  /** Story px (of the 1080 × 1920 image) to dp. */
  px: Px;
  /** Text styles for the two weights the parts use. */
  font: (weight: "regular" | "bold") => TextStyle;
}

const StoryContext = createContext<StoryContextValue | null>(null);

/**
 * The story's colours, `px()` and fonts, for your own views inside a
 * `Story`: React Native does not pass text colour down, so read it here.
 */
function useStory(): StoryContextValue {
  const story = useContext(StoryContext);
  const px = useStoryUnit();
  const { font } = useTheme();
  return (
    story ?? {
      colors: STORY_THEMES.midnight,
      radius: 36,
      px,
      font: (weight) => font(weight),
    }
  );
}

function imageSource(image: StoryImageSource): ImageSourcePropType {
  return typeof image === "string" ? { uri: image } : image;
}

/** Splits on commas outside parentheses, so `rgba(…)` stays whole. */
function splitTopLevel(value: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

interface ParsedGradient {
  angle: number;
  stops: { color: string; offset: number }[];
}

/** Reads a CSS `linear-gradient(<angle>deg, <color> <n>%, …)`. Anything else is ignored. */
function parseLinearGradient(css: string | undefined): ParsedGradient | null {
  const inner = css && /^\s*linear-gradient\((.*)\)\s*$/i.exec(css)?.[1];
  if (!inner) return null;
  const parts = splitTopLevel(inner);
  let angle = 180;
  const first = parts[0] ? /^(-?\d*\.?\d+)deg$/.exec(parts[0]) : null;
  if (first?.[1]) {
    angle = Number(first[1]);
    parts.shift();
  }
  const stops = parts.map((part, index) => {
    const match = /^(.*?)\s+(-?\d*\.?\d+)%$/.exec(part);
    const offset = match?.[2]
      ? Number(match[2]) / 100
      : parts.length > 1
        ? index / (parts.length - 1)
        : 0;
    return { color: (match?.[1] ?? part).trim(), offset };
  });
  return stops.length > 0 ? { angle, stops } : null;
}

/** Where CSS puts a gradient line of `angle` across a box, as SVG coordinates. */
function gradientLine(angle: number, width: number, height: number) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  return {
    x1: width / 2 - (dx * length) / 2,
    y1: height / 2 - (dy * length) / 2,
    x2: width / 2 + (dx * length) / 2,
    y2: height / 2 + (dy * length) / 2,
  };
}

/** Distance from a point to the farthest corner: CSS's default radial size. */
function farthestCorner(x: number, y: number, width: number, height: number) {
  return Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y)
  );
}

/** The gradient and pattern layers, drawn in story px over the background colour. */
function Backdrop({
  colors,
  decoration,
  px,
}: {
  colors: StoryTheme;
  decoration: StoryDecoration;
  px: Px;
}) {
  // Unique per story, so two on one web page do not share a gradient.
  const id = `story-${useId().replace(/[^\w-]/g, "")}`;
  const { width, height } = STORY_SIZE;
  const gradient = parseLinearGradient(colors.backgroundImage);
  if (!gradient && decoration === "none") return null;
  const glowA = { x: width * 0.92, y: height * 0.06 };
  const glowB = { x: 0, y: height };

  return (
    <Svg
      style={styles.fill}
      width={px(width)}
      height={px(height)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <Defs>
        {gradient ? (
          <LinearGradient
            id={`${id}-bg`}
            gradientUnits="userSpaceOnUse"
            {...gradientLine(gradient.angle, width, height)}
          >
            {gradient.stops.map((stop, index) => (
              <Stop key={index} offset={stop.offset} stopColor={stop.color} />
            ))}
          </LinearGradient>
        ) : null}
        {decoration === "glow" ? (
          <>
            <RadialGradient
              id={`${id}-glow-a`}
              gradientUnits="userSpaceOnUse"
              cx={glowA.x}
              cy={glowA.y}
              r={farthestCorner(glowA.x, glowA.y, width, height)}
            >
              <Stop offset={0} stopColor={withAlpha(colors.accent, 0.42)} />
              <Stop offset={0.48} stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id={`${id}-glow-b`}
              gradientUnits="userSpaceOnUse"
              cx={glowB.x}
              cy={glowB.y}
              r={farthestCorner(glowB.x, glowB.y, width, height)}
            >
              <Stop offset={0} stopColor={withAlpha(colors.accent, 0.18)} />
              <Stop offset={0.42} stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </>
        ) : null}
        {decoration === "dots" ? (
          <Pattern id={`${id}-dots`} patternUnits="userSpaceOnUse" width={54} height={54}>
            <Circle cx={27} cy={27} r={3.25} fill={colors.border} />
          </Pattern>
        ) : null}
        {decoration === "grid" ? (
          <Pattern id={`${id}-grid`} patternUnits="userSpaceOnUse" width={108} height={108}>
            <Rect x={0} y={0} width={108} height={2} fill={colors.border} />
            <Rect x={0} y={0} width={2} height={108} fill={colors.border} />
          </Pattern>
        ) : null}
      </Defs>
      {gradient ? <Rect width={width} height={height} fill={`url(#${id}-bg)`} /> : null}
      {decoration === "glow" ? (
        <>
          <Rect width={width} height={height} fill={`url(#${id}-glow-a)`} />
          <Rect width={width} height={height} fill={`url(#${id}-glow-b)`} />
        </>
      ) : null}
      {decoration === "dots" || decoration === "grid" ? (
        <Rect width={width} height={height} fill={`url(#${id}-${decoration})`} />
      ) : null}
    </Svg>
  );
}

/** Story text in px: never scaled by the font size setting, cut with an ellipsis. */
function Line({
  size,
  leading = 1.2,
  lines = 1,
  weight = "regular",
  color,
  style,
  children,
  ...props
}: {
  size: number;
  leading?: number;
  lines?: number;
  weight?: "regular" | "bold";
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}) {
  const { px, font, colors } = useStory();
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={lines}
      ellipsizeMode="tail"
      style={[
        font(weight),
        {
          color: color ?? colors.foreground,
          fontSize: px(size),
          lineHeight: px(Math.round(size * leading)),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

interface StoryProps {
  /** A preset, or your own colours. Defaults to `midnight`. */
  theme?: StoryThemeName | StoryTheme;
  /** Overrides some colours of the theme: `{ accent: "#e11d48" }`. */
  colors?: Partial<StoryTheme>;
  /** A photo behind everything (a URL or a `require()`d file), darkened by `imageDim`. Load remote ones before sharing. */
  image?: StoryImageSource;
  /** From 0 to 1: how much of the background colour covers the photo. */
  imageDim?: number;
  /** A pattern or light behind the content, in the theme's colours. */
  decoration?: StoryDecoration;
  /**
   * Font families for the two weights the parts use. Custom fonts in React
   * Native ignore `fontWeight`, so each weight is its own family. Defaults to
   * the theme's `fonts`.
   */
  fonts?: { regular?: string; bold?: string };
  /** Corner radius of tiles, images and cards, in story px. */
  radius?: number;
  /** How the parts spread over the safe area when there is room left. */
  justify?: "start" | "center" | "end" | "between";
  /** Space between the parts, in story px. */
  gap?: number;
  /** What screen readers hear. Defaults to `storyAlt()` of the children. */
  alt?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

const JUSTIFY = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
} as const;

/**
 * A 1080 × 1920 story, for Instagram, WhatsApp or TikTok, put together from
 * parts: `StoryHeader`, `StoryEyebrow`, `StoryTitle`, `StoryText`,
 * `StoryBody` with a `StoryGrid` of `StoryTile`s or a `StoryList` of
 * `StoryRow`s, `StoryHighlight`, and a `StoryFooter` with a `StoryCta`. The
 * same parts, props and themes as the web `story` item; content sits inside
 * the safe area, clear of the bars the apps draw.
 *
 * Put it in a `StoryFrame` to preview and share it as a 1080 × 1920 PNG.
 * Everything is sized in story px through `useStoryUnit()`, and text ignores
 * the font size setting, since the story is an image. Your own views can read
 * the colours and `px()` with `useStory()`.
 *
 * @example
 * <StoryFrame alt={storyAlt(story)} link="https://example.com/book">
 *   <Story theme="midnight" decoration="glow">
 *     <StoryHeader><StoryBrand name="North Court" /></StoryHeader>
 *     <StoryTitle>Free today</StoryTitle>
 *     <StoryBody>
 *       <StoryGrid max={9}>
 *         <StoryTile label="18h" />
 *         <StoryTile label="19h" variant="muted" strike alt="19h, taken" />
 *       </StoryGrid>
 *     </StoryBody>
 *     <StoryFooter><StoryCta>Book through the link</StoryCta></StoryFooter>
 *   </Story>
 * </StoryFrame>
 */
function Story({
  theme = "midnight",
  colors: colorsProp,
  image,
  imageDim = 0.55,
  decoration = "none",
  fonts,
  radius = 36,
  justify = "start",
  gap = 48,
  alt,
  style,
  testID,
  children,
}: StoryProps) {
  const px = useStoryUnit();
  const { font } = useTheme();
  const colors: StoryTheme = {
    ...(typeof theme === "string" ? STORY_THEMES[theme] : theme),
    ...colorsProp,
  };
  const value: StoryContextValue = {
    colors,
    radius,
    px,
    font: (weight) => {
      const family = fonts?.[weight];
      return family ? { fontFamily: family } : font(weight);
    },
  };
  const fadeId = `story-fade-${useId().replace(/[^\w-]/g, "")}`;

  return (
    <StoryContext.Provider value={value}>
      <View
        role="img"
        accessible
        accessibilityLabel={alt ?? storyAlt(<>{children}</>)}
        testID={testID}
        style={[
          styles.root,
          {
            width: px(STORY_SIZE.width),
            height: px(STORY_SIZE.height),
            backgroundColor: colors.background,
          },
          style,
        ]}
      >
        {image ? (
          <>
            <Image source={imageSource(image)} resizeMode="cover" style={styles.fill} />
            <View
              style={[styles.fill, { backgroundColor: colors.background, opacity: imageDim }]}
            />
            {/* Fades the photo into the background towards the bottom, where the text sits. */}
            <Svg style={styles.fill} width="100%" height="100%">
              <Defs>
                <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0.3" stopColor={colors.background} stopOpacity={0} />
                  <Stop offset="0.92" stopColor={colors.background} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${fadeId})`} />
            </Svg>
          </>
        ) : null}
        <Backdrop colors={colors} decoration={decoration} px={px} />
        <View
          style={{
            flex: 1,
            paddingTop: px(STORY_SAFE_AREA.top),
            paddingBottom: px(STORY_SAFE_AREA.bottom),
            paddingHorizontal: px(SIDE),
            justifyContent: JUSTIFY[justify],
            gap: px(gap),
          }}
        >
          {children}
        </View>
      </View>
    </StoryContext.Provider>
  );
}

interface StoryPartProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** A row at the top: a `StoryBrand` at the start and, say, a date `StoryChip` at the end. */
function StoryHeader({ style, children }: StoryPartProps) {
  const { px } = useStory();
  return (
    <View
      style={[
        styles.row,
        { flexShrink: 0, justifyContent: "space-between", gap: px(24), minHeight: px(96) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface StoryBrandProps {
  name: string;
  /**
   * An image (a URL or a `require()`d file), or any element such as an
   * `Svg`: React Native's `Image` does not draw SVG files.
   */
  logo?: StoryImageSource | ReactElement;
  style?: StyleProp<ViewStyle>;
}

/** The logo and name of whoever posts the story. */
function StoryBrand({ name, logo, style }: StoryBrandProps) {
  const { px } = useStory();
  const box = { width: px(88), height: px(88), borderRadius: px(24), overflow: "hidden" as const };
  return (
    <View style={[styles.row, { gap: px(22), minWidth: 0, flexShrink: 1 }, style]}>
      {logo === undefined ? null : isValidElement(logo) ? (
        <View style={box}>{logo}</View>
      ) : (
        <Image source={imageSource(logo)} resizeMode="cover" style={box} />
      )}
      <Line size={42} weight="bold" style={{ maxWidth: px(640), flexShrink: 1 }}>
        {name}
      </Line>
    </View>
  );
}

/** A short label above the title, in the accent: "Free slots", "New", "This Friday". */
function StoryEyebrow({ style, children }: StoryPartProps) {
  const { px, colors } = useStory();
  return (
    <View style={[styles.row, { flexShrink: 0, gap: px(18) }, style]}>
      <View
        style={{
          width: px(18),
          height: px(18),
          borderRadius: px(9),
          backgroundColor: colors.accent,
        }}
      />
      <Line
        size={34}
        weight="bold"
        color={colors.accent}
        style={{
          maxWidth: px(STORY_CONTENT_WIDTH - 40),
          letterSpacing: px(5),
          textTransform: "uppercase",
        }}
      >
        {children}
      </Line>
    </View>
  );
}

function textLength(node: ReactNode): number {
  if (typeof node === "string" || typeof node === "number") return String(node).length;
  if (Array.isArray(node)) return node.reduce((sum: number, child) => sum + textLength(child), 0);
  if (isValidElement<{ children?: ReactNode }>(node)) return textLength(node.props.children);
  return 0;
}

interface StoryTextPartProps {
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}

interface StoryTitleProps extends StoryTextPartProps {
  /** Font size in story px. By default it gets smaller as the title gets longer, to stay within `lines`. */
  size?: number;
  /** Lines before it is cut with an ellipsis. */
  lines?: number;
}

/** The headline, large and tight. */
function StoryTitle({ size, lines = 3, style, children }: StoryTitleProps) {
  const { px } = useStory();
  const length = textLength(children);
  const fontSize =
    size ?? (length <= 12 ? 150 : length <= 20 ? 124 : length <= 32 ? 104 : length <= 48 ? 88 : 76);
  return (
    <Line
      size={fontSize}
      // A little looser than the web's 0.98: tighter clips accents on iOS.
      leading={1.04}
      lines={lines}
      weight="bold"
      style={[{ letterSpacing: -px(Math.round(fontSize * 0.03)) }, style]}
    >
      {children}
    </Line>
  );
}

interface StoryTextProps extends StoryTextPartProps {
  size?: number;
  lines?: number;
}

/** A line or two in the muted colour: the day, the place, the details. */
function StoryText({ size = 46, lines = 3, style, children }: StoryTextProps) {
  const { colors } = useStory();
  return (
    <Line size={size} leading={1.3} lines={lines} color={colors.muted} style={style}>
      {children}
    </Line>
  );
}

interface StoryBodyProps extends StoryPartProps {
  justify?: "start" | "center" | "end";
  gap?: number;
}

/**
 * Takes the height the other parts leave, so the footer stays at the
 * bottom of the safe area. What does not fit is clipped: give grids and
 * lists a `max`.
 */
function StoryBody({ justify = "start", gap = 28, style, children }: StoryBodyProps) {
  const { px } = useStory();
  return (
    <View
      style={[
        {
          flexGrow: 1,
          flexShrink: 1,
          minHeight: 0,
          overflow: "hidden",
          justifyContent: JUSTIFY[justify],
          gap: px(gap),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type StoryVariant = "solid" | "soft" | "outline" | "muted";

function look(variant: StoryVariant | "dashed", colors: StoryTheme) {
  switch (variant) {
    case "soft":
      return { background: colors.surface, border: "transparent", color: colors.foreground };
    case "outline":
      return { background: "transparent", border: colors.accent, color: colors.foreground };
    case "muted":
      return { background: colors.surface, border: "transparent", color: colors.muted };
    case "dashed":
      return { background: "transparent", border: colors.border, color: colors.foreground };
    default:
      return { background: colors.accent, border: colors.accent, color: colors.accentForeground };
  }
}

/** Keeps the first `max` items; the last place goes to a "+N" for the rest. */
function limit(children: ReactNode, max: number | undefined) {
  const items = Children.toArray(children);
  if (!max || items.length <= max) return { items, hidden: 0 };
  const shown = items.slice(0, Math.max(0, max - 1));
  return { items: shown, hidden: items.length - shown.length };
}

interface StoryTileProps {
  label: ReactNode;
  /** A smaller line under the label: a price, "2 left". */
  note?: ReactNode;
  /** `solid` in the accent, `soft` on the surface, `outline`, or `muted` for what is gone. */
  variant?: StoryVariant;
  /** Strikes the label through, for what is taken or sold out. */
  strike?: boolean;
  /** What screen readers hear instead of the text, e.g. "19h, taken". Used by `storyAlt`. */
  alt?: string;
  style?: StyleProp<ViewStyle>;
}

function labelSize(length: number) {
  if (length <= 4) return 64;
  if (length <= 6) return 56;
  if (length <= 9) return 46;
  return 38;
}

function TileBox({
  variant,
  style,
  children,
}: {
  variant: StoryVariant | "dashed";
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { px, colors, radius } = useStory();
  const colours = look(variant, colors);
  return (
    <View
      style={[
        {
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          minHeight: px(140),
          paddingVertical: px(28),
          paddingHorizontal: px(20),
          borderRadius: px(radius),
          borderWidth: px(4),
          borderStyle: variant === "dashed" ? "dashed" : "solid",
          borderColor: colours.border,
          backgroundColor: colours.background,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** One cell of a `StoryGrid`: a time, a size, a seat. */
function StoryTile({ label, note, variant = "solid", strike, style }: StoryTileProps) {
  const { px, colors } = useStory();
  const { color } = look(variant, colors);
  return (
    <TileBox variant={variant} style={style}>
      <Line
        size={labelSize(textLength(label))}
        leading={1.1}
        weight="bold"
        color={color}
        style={{ textAlign: "center", textDecorationLine: strike ? "line-through" : "none" }}
      >
        {label}
      </Line>
      {note ? (
        <Line
          size={30}
          leading={1.1}
          color={color}
          style={{ marginTop: px(12), opacity: 0.75, textAlign: "center" }}
        >
          {note}
        </Line>
      ) : null}
    </TileBox>
  );
}

interface StoryGridProps extends StoryPartProps {
  columns?: number;
  gap?: number;
  /** The most cells shown; the last one becomes `more` for the rest. */
  max?: number;
  /** Label of the cell that stands for what did not fit. */
  more?: (hidden: number) => string;
  /** Width the grid fills, in story px. The content width by default. */
  width?: number;
}

/** Tiles in rows of `columns`, ending in "+N" when there are more than `max`. */
function StoryGrid({
  columns = 3,
  gap = 24,
  max,
  more = (hidden) => `+${hidden}`,
  width = STORY_CONTENT_WIDTH,
  style,
  children,
}: StoryGridProps) {
  const { px } = useStory();
  const { items, hidden } = limit(children, max);
  const cell = Math.floor((width - gap * (columns - 1)) / columns);
  const moreLabel = hidden > 0 ? more(hidden) : "";
  return (
    <View style={[styles.wrap, { gap: px(gap), width: px(width), flexShrink: 0 }, style]}>
      {items.map((item, index) => (
        <View key={index} style={{ width: px(cell) }}>
          {item}
        </View>
      ))}
      {hidden > 0 ? (
        <View style={{ width: px(cell) }}>
          <TileBox variant="dashed">
            {/* Two lines and a smaller size when needed: system fonts run wider than the web's. */}
            <Line
              size={labelSize(moreLabel.length) - 8}
              leading={1.1}
              lines={2}
              weight="bold"
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={{ textAlign: "center" }}
            >
              {moreLabel}
            </Line>
          </TileBox>
        </View>
      ) : null}
    </View>
  );
}

interface StoryChipProps {
  children: ReactNode;
  variant?: StoryVariant;
  strike?: boolean;
  alt?: string;
  style?: StyleProp<ViewStyle>;
}

/** A pill: a time in a row, a date in the header, a price, "New". */
function StoryChip({ variant = "soft", strike, style, children }: StoryChipProps) {
  const { px, colors } = useStory();
  const colours = look(variant, colors);
  return (
    <View
      style={[
        styles.row,
        {
          flexShrink: 0,
          height: px(76),
          paddingHorizontal: px(30),
          borderRadius: px(999),
          borderWidth: px(3),
          borderColor: colours.border,
          backgroundColor: colours.background,
        },
        style,
      ]}
    >
      <Line
        size={36}
        weight="bold"
        color={colours.color}
        style={{ textDecorationLine: strike ? "line-through" : "none" }}
      >
        {children}
      </Line>
    </View>
  );
}

interface StoryListProps extends StoryPartProps {
  /** Lines between rows. */
  divider?: boolean;
}

/** Rows one under the other: a day per row, a menu, a line-up. */
function StoryList({ divider = true, style, children }: StoryListProps) {
  const rows = Children.toArray(children);
  return (
    <View style={[{ flexShrink: 0 }, style]}>
      {rows.map((row, index) =>
        isValidElement<StoryRowProps>(row)
          ? cloneElement(row, { divider: divider && index < rows.length - 1 })
          : row
      )}
    </View>
  );
}

interface StoryRowProps {
  /** At the start, in bold: "Mon", "Haircut". */
  label: ReactNode;
  /** Under the label, muted: "30 min". */
  detail?: ReactNode;
  /** At the end: a price, a time. */
  value?: ReactNode;
  /** Chips between the label and the value. */
  children?: ReactNode;
  /** The most chips shown; the last place says how many more. */
  max?: number;
  more?: (hidden: number) => string;
  /** Width of the label column, in story px, to line rows up. */
  labelWidth?: number;
  /** Set by StoryList. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** One row of a `StoryList`. */
function StoryRow({
  label,
  detail,
  value,
  children,
  max,
  more = (hidden) => `+${hidden}`,
  labelWidth,
  divider,
  style,
}: StoryRowProps) {
  const { px, colors } = useStory();
  const { items, hidden } = limit(children, max);
  return (
    <View
      style={[
        styles.row,
        {
          gap: px(24),
          paddingVertical: px(22),
          borderBottomWidth: px(2),
          borderBottomColor: divider ? colors.border : "transparent",
        },
        style,
      ]}
    >
      <View
        style={[{ flexShrink: 0 }, labelWidth ? { width: px(labelWidth) } : { maxWidth: px(520) }]}
      >
        <Line size={46} leading={1.1} weight="bold">
          {label}
        </Line>
        {detail ? (
          <Line size={32} color={colors.muted} style={{ marginTop: px(6) }}>
            {detail}
          </Line>
        ) : null}
      </View>
      <View
        style={[
          styles.row,
          {
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            gap: px(14),
            overflow: "hidden",
            justifyContent: value ? "flex-start" : "flex-end",
          },
        ]}
      >
        {items}
        {hidden > 0 ? (
          <StoryChip
            variant="outline"
            style={{ borderStyle: "dashed", borderColor: colors.border }}
          >
            {more(hidden)}
          </StoryChip>
        ) : null}
      </View>
      {value ? (
        <Line size={46} weight="bold" style={{ flexShrink: 0 }}>
          {value}
        </Line>
      ) : null}
    </View>
  );
}

interface StoryHighlightProps extends StoryPartProps {
  /** Above, muted: "Tonight at". */
  label?: ReactNode;
  /** Below, muted: "Only one left". */
  caption?: ReactNode;
  /** `accent` draws the big text in the accent colour. */
  tone?: "default" | "accent";
  /** Font size in story px; by default it fits the length. */
  size?: number;
}

/** One thing in very large type: a time, a date, a price, a score. */
function StoryHighlight({
  label,
  caption,
  tone = "default",
  size,
  style,
  children,
}: StoryHighlightProps) {
  const { px, colors } = useStory();
  const length = textLength(children);
  const fontSize = size ?? (length <= 3 ? 320 : length <= 5 ? 260 : length <= 8 ? 190 : 140);
  return (
    <View style={[{ flexShrink: 0 }, style]}>
      {label ? (
        <Line size={44} color={colors.muted} style={{ marginBottom: px(8) }}>
          {label}
        </Line>
      ) : null}
      <Line
        size={fontSize}
        leading={1}
        weight="bold"
        color={tone === "accent" ? colors.accent : colors.foreground}
        // Shrinks a label too long for the width instead of cutting it (iOS and Android).
        adjustsFontSizeToFit
        minimumFontScale={0.4}
        style={{
          maxWidth: px(STORY_CONTENT_WIDTH),
          letterSpacing: -px(Math.round(fontSize * 0.045)),
        }}
      >
        {children}
      </Line>
      {caption ? (
        <Line size={48} leading={1.25} lines={2} color={colors.muted} style={{ marginTop: px(28) }}>
          {caption}
        </Line>
      ) : null}
    </View>
  );
}

interface StoryImageProps {
  /** A URL or a `require()`d file. Load remote ones before sharing. */
  src: StoryImageSource;
  /** In story px. */
  height?: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/** A photo inside the content, with the theme's corners. */
function StoryImage({ src, height = 560, width = STORY_CONTENT_WIDTH, style }: StoryImageProps) {
  const { px, radius } = useStory();
  return (
    <View
      style={[
        { width: px(width), height: px(height), borderRadius: px(radius), overflow: "hidden" },
        style,
      ]}
    >
      <Image source={imageSource(src)} resizeMode="cover" style={styles.fill} />
    </View>
  );
}

/** The bottom of the story: a `StoryCta` and a `StoryLinkHint`. */
function StoryFooter({ style, children }: StoryPartProps) {
  const { px } = useStory();
  return (
    <View
      style={[{ alignItems: "flex-start", flexShrink: 0, gap: px(24), marginTop: "auto" }, style]}
    >
      {children}
    </View>
  );
}

interface StoryCtaProps extends StoryPartProps {
  variant?: "solid" | "outline";
  /** An arrow after the text. */
  arrow?: boolean;
}

/** The call to action: "Book through the link". */
function StoryCta({ variant = "solid", arrow = true, style, children }: StoryCtaProps) {
  const { px, colors } = useStory();
  const solid = variant === "solid";
  const color = solid ? colors.accentForeground : colors.foreground;
  return (
    <View
      style={[
        styles.row,
        {
          gap: px(20),
          height: px(112),
          paddingHorizontal: px(52),
          borderRadius: px(999),
          borderWidth: px(4),
          borderColor: solid ? colors.accent : colors.foreground,
          backgroundColor: solid ? colors.accent : "transparent",
          maxWidth: px(STORY_CONTENT_WIDTH),
        },
        style,
      ]}
    >
      <Line size={46} weight="bold" color={color} style={{ flexShrink: 1 }}>
        {children}
      </Line>
      {arrow ? (
        <Svg width={px(44)} height={px(44)} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 12h14m0 0-6-6m6 6-6 6"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

/** A small line pointing at where the link sticker goes: "Tap the link". */
function StoryLinkHint({ style, children }: StoryPartProps) {
  const { px, colors } = useStory();
  return (
    <View style={[styles.row, { gap: px(14), maxWidth: px(STORY_CONTENT_WIDTH) }, style]}>
      <Svg width={px(40)} height={px(40)} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
          stroke={colors.muted}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Line size={36} color={colors.muted} style={{ flexShrink: 1 }}>
        {children}
      </Line>
    </View>
  );
}

/** A line across the content, in the border colour. */
function StoryDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { px, colors } = useStory();
  return <View style={[{ flexShrink: 0, height: px(2), backgroundColor: colors.border }, style]} />;
}

type AnyProps = Record<string, unknown> & { children?: ReactNode; alt?: unknown };

/** The props that hold a part's words, in the order the part shows them. */
const TEXT_PROPS = ["name", "label", "detail", "note", "children", "value", "caption"] as const;

/**
 * The text of a story, in reading order, for `StoryFrame`'s `alt`. Parts
 * with an `alt` prop (tiles, chips) are read by it instead of their text,
 * so a struck-through "19h" can say "19h, taken". Grids and rows with a
 * `max` read the "+N" in place of what they leave out, as they show it.
 * The same output as the web item's `storyAlt`.
 *
 * Pass the `Story` element itself: components of your own around it are
 * not rendered here, so their words are not found.
 */
function storyAlt(story: ReactNode): string {
  const runs: string[] = [];
  const walk = (node: ReactNode) => {
    if (node === null || node === undefined || typeof node === "boolean") return;
    if (typeof node === "string" || typeof node === "number") {
      const text = String(node).trim();
      if (text) runs.push(text);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isValidElement<AnyProps>(node)) return;
    const { props, type } = node;
    if (typeof props.alt === "string" && type !== Image) {
      if (props.alt.trim()) runs.push(props.alt.trim());
      return;
    }
    if (type === StoryGrid || type === StoryRow) {
      const { max, more } = props as { max?: number; more?: (hidden: number) => string };
      const { items, hidden } = limit(props.children, max);
      if (type === StoryRow) {
        walk(props.label as ReactNode);
        walk(props.detail as ReactNode);
      }
      items.forEach(walk);
      if (hidden > 0) runs.push((more ?? ((count: number) => `+${count}`))(hidden));
      if (type === StoryRow) walk(props.value as ReactNode);
      return;
    }
    for (const key of TEXT_PROPS) walk(props[key] as ReactNode);
  };
  walk(story);
  return runs.map((run) => (/[.!?…:]$/.test(run) ? run : `${run}.`)).join(" ");
}

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});

export {
  Story,
  STORY_CONTENT_WIDTH,
  STORY_THEMES,
  storyAlt,
  StoryBody,
  StoryBrand,
  StoryChip,
  StoryCta,
  StoryDivider,
  StoryEyebrow,
  StoryFooter,
  StoryGrid,
  StoryHeader,
  StoryHighlight,
  StoryImage,
  StoryLinkHint,
  StoryList,
  StoryRow,
  StoryText,
  StoryTile,
  StoryTitle,
  useStory,
  type StoryBrandProps,
  type StoryChipProps,
  type StoryDecoration,
  type StoryGridProps,
  type StoryHighlightProps,
  type StoryImageSource,
  type StoryProps,
  type StoryRowProps,
  type StoryTileProps,
  type StoryTheme,
  type StoryThemeName,
  type StoryVariant,
};
