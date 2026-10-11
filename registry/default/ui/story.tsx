// Satori draws stories from inline styles; there are no Tailwind classes here to check.
// tailwind-compat-ignore-file
import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode } from "react";

import { STORY_SAFE_AREA, STORY_SIZE } from "@/registry/default/lib/story-export";

/**
 * The colours a story is drawn with. Parts read them as CSS variables
 * (`var(--story-accent)`), so your own elements inside a story can too.
 */
interface StoryTheme {
  background: string;
  /** Drawn over `background`: a gradient, for example. */
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

/** Side padding of the content: the safe area's, plus a little air. */
const SIDE = STORY_SAFE_AREA.side + 8;
/** Width of the content between the side paddings. */
const STORY_CONTENT_WIDTH = STORY_SIZE.width - SIDE * 2;

const v = {
  background: "var(--story-background)",
  foreground: "var(--story-foreground)",
  muted: "var(--story-muted)",
  accent: "var(--story-accent)",
  accentForeground: "var(--story-accent-foreground)",
  surface: "var(--story-surface)",
  border: "var(--story-border)",
  radius: "var(--story-radius)",
} as const;

const nowrap: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/** A hex colour at an opacity; other colours come back as they are. */
function alpha(color: string, amount: number) {
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color.trim())?.[1];
  if (!hex) return color;
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${amount})`;
}

function decorationStyle(decoration: StoryDecoration, theme: StoryTheme): CSSProperties | null {
  switch (decoration) {
    case "glow":
      return {
        backgroundImage: `radial-gradient(circle at 92% 6%, ${alpha(theme.accent, 0.42)} 0%, rgba(0, 0, 0, 0) 48%), radial-gradient(circle at 0% 100%, ${alpha(theme.accent, 0.18)} 0%, rgba(0, 0, 0, 0) 42%)`,
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle, ${theme.border} 3px, rgba(0, 0, 0, 0) 3.5px)`,
        backgroundSize: "54px 54px",
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${theme.border} 2px, rgba(0, 0, 0, 0) 2px), linear-gradient(90deg, ${theme.border} 2px, rgba(0, 0, 0, 0) 2px)`,
        backgroundSize: "108px 108px",
      };
    default:
      return null;
  }
}

interface StoryProps {
  /** A preset, or your own colours. Defaults to `midnight`. */
  theme?: StoryThemeName | StoryTheme;
  /** Overrides some colours of the theme: `{ accent: "#e11d48" }`. */
  colors?: Partial<StoryTheme>;
  /** A photo behind everything (a URL that allows CORS, or a data URL), darkened by `imageDim`. */
  image?: string;
  /** From 0 to 1: how much of the background colour covers the photo. */
  imageDim?: number;
  /** A pattern or light behind the content, in the theme's colours. */
  decoration?: StoryDecoration;
  /** A family from the fonts given to the renderer. Defaults to the first one. */
  fontFamily?: string;
  /** Corner radius of tiles, images and cards, in px. */
  radius?: number;
  /** How the parts spread over the safe area when there is room left. */
  justify?: "start" | "center" | "end" | "between";
  /** Space between the parts, in px. */
  gap?: number;
  style?: CSSProperties;
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
 * `StoryRow`s, `StoryHighlight`, and a `StoryFooter` with a `StoryCta`.
 * Content is laid out inside the stories' safe area, clear of the bars the
 * apps draw. Themes, colours, a photo, a pattern, the font and the radius
 * are all props; every part also takes `style`, and your own elements can
 * use the theme's CSS variables (`var(--story-accent)`).
 *
 * It is an image template: render it with `StoryFrame` or `renderStoryPng`
 * in the browser, or with `ImageResponse` from `next/og` on a server. Like
 * everything Satori draws, it takes inline styles and flexbox, not classes.
 *
 * @example
 * <Story theme="midnight" decoration="glow">
 *   <StoryHeader><StoryBrand name="North Court" /></StoryHeader>
 *   <StoryTitle>Free today</StoryTitle>
 *   <StoryBody>
 *     <StoryGrid max={9}>
 *       <StoryTile label="18h" />
 *       <StoryTile label="19h" variant="muted" strike />
 *     </StoryGrid>
 *   </StoryBody>
 *   <StoryFooter><StoryCta>Book through the link</StoryCta></StoryFooter>
 * </Story>
 */
function Story({
  theme = "midnight",
  colors,
  image,
  imageDim = 0.55,
  decoration = "none",
  fontFamily,
  radius = 36,
  justify = "start",
  gap = 48,
  style,
  children,
}: StoryProps) {
  const palette: StoryTheme = {
    ...(typeof theme === "string" ? STORY_THEMES[theme] : theme),
    ...colors,
  };
  const { width, height } = STORY_SIZE;
  const layer: CSSProperties = {
    display: "flex",
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
  };
  const pattern = decorationStyle(decoration, palette);

  return (
    <div
      style={
        {
          "--story-background": palette.background,
          "--story-foreground": palette.foreground,
          "--story-muted": palette.muted,
          "--story-accent": palette.accent,
          "--story-accent-foreground": palette.accentForeground,
          "--story-surface": palette.surface,
          "--story-border": palette.border,
          "--story-radius": `${radius}px`,
          display: "flex",
          position: "relative",
          width,
          height,
          overflow: "hidden",
          backgroundColor: palette.background,
          ...(palette.backgroundImage ? { backgroundImage: palette.backgroundImage } : {}),
          color: palette.foreground,
          // Left out when unset: the Satori in next/og fails on undefined style values.
          ...(fontFamily ? { fontFamily } : {}),
          ...style,
        } as CSSProperties
      }
    >
      {image ? (
        <>
          <img
            src={image}
            alt=""
            width={width}
            height={height}
            style={{ ...layer, objectFit: "cover" }}
          />
          <div style={{ ...layer, backgroundColor: palette.background, opacity: imageDim }} />
          {/* Fades the photo into the background towards the bottom, where the text sits. */}
          <div
            style={{
              ...layer,
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, ${palette.background} 92%)`,
            }}
          />
        </>
      ) : null}
      {pattern ? <div style={{ ...layer, ...pattern }} /> : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          // Positioned, so it paints above the photo and the pattern, which are.
          position: "relative",
          flexShrink: 0,
          width,
          height,
          boxSizing: "border-box",
          padding: `${STORY_SAFE_AREA.top}px ${SIDE}px ${STORY_SAFE_AREA.bottom}px`,
          justifyContent: JUSTIFY[justify],
          gap,
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface StoryPartProps {
  style?: CSSProperties;
  children?: ReactNode;
}

/** A row at the top: a `StoryBrand` at the start and, say, a date `StoryChip` at the end. */
function StoryHeader({ style, children }: StoryPartProps) {
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        minHeight: 96,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface StoryBrandProps {
  name: string;
  /** A URL that allows CORS, or a data URL. */
  logo?: string;
  style?: CSSProperties;
}

/** The logo and name of whoever posts the story. */
function StoryBrand({ name, logo, style }: StoryBrandProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, minWidth: 0, ...style }}>
      {logo ? (
        <img
          src={logo}
          alt=""
          width={88}
          height={88}
          style={{ width: 88, height: 88, borderRadius: 24, objectFit: "cover", flexShrink: 0 }}
        />
      ) : null}
      <div style={{ display: "flex", fontSize: 42, fontWeight: 700, maxWidth: 640, ...nowrap }}>
        {name}
      </div>
    </div>
  );
}

/** A short label above the title, in the accent: "Free slots", "New", "This Friday". */
function StoryEyebrow({ style, children }: StoryPartProps) {
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        alignItems: "center",
        gap: 18,
        color: v.accent,
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: 5,
        textTransform: "uppercase",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: v.accent,
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", maxWidth: STORY_CONTENT_WIDTH - 40, ...nowrap }}>
        {children}
      </div>
    </div>
  );
}

function textLength(node: ReactNode): number {
  if (typeof node === "string" || typeof node === "number") return String(node).length;
  if (Array.isArray(node)) return node.reduce((sum: number, child) => sum + textLength(child), 0);
  if (isValidElement<{ children?: ReactNode }>(node)) return textLength(node.props.children);
  return 0;
}

interface StoryTitleProps extends StoryPartProps {
  /** Font size in px. By default it gets smaller as the title gets longer, to stay within `lines`. */
  size?: number;
  /** Lines before it is cut with an ellipsis. */
  lines?: number;
}

/** The headline, large and tight. */
function StoryTitle({ size, lines = 3, style, children }: StoryTitleProps) {
  const length = textLength(children);
  const fontSize =
    size ?? (length <= 12 ? 150 : length <= 20 ? 124 : length <= 32 ? 104 : length <= 48 ? 88 : 76);
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        fontSize,
        fontWeight: 700,
        lineHeight: 0.98,
        letterSpacing: -Math.round(fontSize * 0.03),
        lineClamp: lines,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface StoryTextProps extends StoryPartProps {
  size?: number;
  lines?: number;
}

/** A line or two in the muted colour: the day, the place, the details. */
function StoryText({ size = 46, lines = 3, style, children }: StoryTextProps) {
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        fontSize: size,
        lineHeight: 1.3,
        color: v.muted,
        lineClamp: lines,
        ...style,
      }}
    >
      {children}
    </div>
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
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        minHeight: 0,
        overflow: "hidden",
        justifyContent: JUSTIFY[justify],
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type StoryVariant = "solid" | "soft" | "outline" | "muted";

function look(variant: StoryVariant | "dashed") {
  switch (variant) {
    case "soft":
      return { backgroundColor: v.surface, borderColor: "rgba(0, 0, 0, 0)", color: v.foreground };
    case "outline":
      return { backgroundColor: "rgba(0, 0, 0, 0)", borderColor: v.accent, color: v.foreground };
    case "muted":
      return { backgroundColor: v.surface, borderColor: "rgba(0, 0, 0, 0)", color: v.muted };
    case "dashed":
      return { backgroundColor: "rgba(0, 0, 0, 0)", borderColor: v.border, color: v.foreground };
    default:
      return { backgroundColor: v.accent, borderColor: v.accent, color: v.accentForeground };
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
  style?: CSSProperties;
}

function labelSize(length: number) {
  if (length <= 4) return 64;
  if (length <= 6) return 56;
  if (length <= 9) return 46;
  return 38;
}

/** One cell of a `StoryGrid`: a time, a size, a seat. */
function StoryTile({ label, note, variant = "solid", strike, style }: StoryTileProps) {
  return (
    <StoryTileBox variant={variant} style={style}>
      <div
        style={{
          display: "flex",
          fontSize: labelSize(textLength(label)),
          fontWeight: 700,
          lineHeight: 1,
          textDecoration: strike ? "line-through" : "none",
          maxWidth: "100%",
          ...nowrap,
        }}
      >
        {label}
      </div>
      {note ? (
        <div
          style={{
            display: "flex",
            marginTop: 12,
            fontSize: 30,
            lineHeight: 1,
            opacity: 0.75,
            maxWidth: "100%",
            ...nowrap,
          }}
        >
          {note}
        </div>
      ) : null}
    </StoryTileBox>
  );
}

function StoryTileBox({
  variant,
  style,
  children,
}: {
  variant: StoryVariant | "dashed";
  style?: CSSProperties;
  children: ReactNode;
}) {
  const colors = look(variant);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        minHeight: 140,
        padding: "28px 20px",
        boxSizing: "border-box",
        borderRadius: v.radius,
        borderWidth: 4,
        borderStyle: variant === "dashed" ? "dashed" : "solid",
        ...colors,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface StoryGridProps extends StoryPartProps {
  columns?: number;
  gap?: number;
  /** The most cells shown; the last one becomes `more` for the rest. */
  max?: number;
  /** Label of the cell that stands for what did not fit. */
  more?: (hidden: number) => string;
  /** Width the grid fills, in px. The content width by default. */
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
  const { items, hidden } = limit(children, max);
  const cell = Math.floor((width - gap * (columns - 1)) / columns);
  const moreLabel = hidden > 0 ? more(hidden) : "";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap, width, flexShrink: 0, ...style }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: "flex", width: cell }}>
          {item}
        </div>
      ))}
      {hidden > 0 ? (
        <div style={{ display: "flex", width: cell }}>
          <StoryTileBox variant="dashed">
            <div
              style={{
                display: "flex",
                fontSize: labelSize(moreLabel.length) - 8,
                fontWeight: 700,
                maxWidth: "100%",
                ...nowrap,
              }}
            >
              {moreLabel}
            </div>
          </StoryTileBox>
        </div>
      ) : null}
    </div>
  );
}

interface StoryChipProps {
  children: ReactNode;
  variant?: StoryVariant;
  strike?: boolean;
  alt?: string;
  style?: CSSProperties;
}

/** A pill: a time in a row, a date in the header, a price, "New". */
function StoryChip({ variant = "soft", strike, style, children }: StoryChipProps) {
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        alignItems: "center",
        height: 76,
        padding: "0 30px",
        boxSizing: "border-box",
        borderRadius: 999,
        borderWidth: 3,
        borderStyle: "solid",
        fontSize: 36,
        fontWeight: 700,
        textDecoration: strike ? "line-through" : "none",
        ...look(variant),
        ...nowrap,
        ...style,
      }}
    >
      {children}
    </div>
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
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, ...style }}>
      {rows.map((row, index) =>
        isValidElement<StoryRowProps>(row)
          ? cloneElement(row, { divider: divider && index < rows.length - 1 })
          : row
      )}
    </div>
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
  /** Width of the label column, in px, to line rows up. */
  labelWidth?: number;
  /** Set by StoryList. */
  divider?: boolean;
  style?: CSSProperties;
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
  const { items, hidden } = limit(children, max);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "22px 0",
        borderBottom: divider ? `2px solid ${v.border}` : "2px solid rgba(0, 0, 0, 0)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          ...(labelWidth ? { width: labelWidth } : { maxWidth: 520 }),
        }}
      >
        <div style={{ display: "flex", fontSize: 46, fontWeight: 700, lineHeight: 1.1, ...nowrap }}>
          {label}
        </div>
        {detail ? (
          <div
            style={{
              display: "flex",
              marginTop: 6,
              fontSize: 32,
              color: v.muted,
              ...nowrap,
            }}
          >
            {detail}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          flexGrow: 1,
          minWidth: 0,
          gap: 14,
          overflow: "hidden",
          justifyContent: value ? "flex-start" : "flex-end",
        }}
      >
        {items}
        {hidden > 0 ? (
          <StoryChip variant="outline" style={{ borderStyle: "dashed", borderColor: v.border }}>
            {more(hidden)}
          </StoryChip>
        ) : null}
      </div>
      {value ? (
        <div style={{ display: "flex", flexShrink: 0, fontSize: 46, fontWeight: 700 }}>{value}</div>
      ) : null}
    </div>
  );
}

interface StoryHighlightProps extends StoryPartProps {
  /** Above, muted: "Tonight at". */
  label?: ReactNode;
  /** Below, muted: "Only one left". */
  caption?: ReactNode;
  /** `accent` draws the big text in the accent colour. */
  tone?: "default" | "accent";
  /** Font size in px; by default it fits the length. */
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
  const length = textLength(children);
  const fontSize = size ?? (length <= 3 ? 320 : length <= 5 ? 260 : length <= 8 ? 190 : 140);
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, ...style }}>
      {label ? (
        <div style={{ display: "flex", fontSize: 44, color: v.muted, marginBottom: 8 }}>
          {label}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          fontSize,
          fontWeight: 700,
          lineHeight: 0.9,
          letterSpacing: -Math.round(fontSize * 0.045),
          color: tone === "accent" ? v.accent : v.foreground,
          maxWidth: STORY_CONTENT_WIDTH,
          ...nowrap,
        }}
      >
        {children}
      </div>
      {caption ? (
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 48,
            lineHeight: 1.25,
            color: v.muted,
            lineClamp: 2,
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
}

interface StoryImageProps {
  /** A URL that allows CORS, or a data URL. */
  src: string;
  height?: number;
  width?: number;
  style?: CSSProperties;
}

/** A photo inside the content, with the theme's corners. */
function StoryImage({ src, height = 560, width = STORY_CONTENT_WIDTH, style }: StoryImageProps) {
  return (
    <img
      src={src}
      alt=""
      width={width}
      height={height}
      style={{ width, height, flexShrink: 0, objectFit: "cover", borderRadius: v.radius, ...style }}
    />
  );
}

/** The bottom of the story: a `StoryCta` and a `StoryLinkHint`. */
function StoryFooter({ style, children }: StoryPartProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexShrink: 0,
        gap: 24,
        marginTop: "auto",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface StoryCtaProps extends StoryPartProps {
  variant?: "solid" | "outline";
  /** An arrow after the text. */
  arrow?: boolean;
}

/** The call to action: "Book through the link". */
function StoryCta({ variant = "solid", arrow = true, style, children }: StoryCtaProps) {
  const solid = variant === "solid";
  const color = solid ? v.accentForeground : v.foreground;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        height: 112,
        padding: "0 52px",
        boxSizing: "border-box",
        borderRadius: 999,
        borderWidth: 4,
        borderStyle: "solid",
        borderColor: solid ? v.accent : v.foreground,
        backgroundColor: solid ? v.accent : "rgba(0, 0, 0, 0)",
        color,
        fontSize: 46,
        fontWeight: 700,
        maxWidth: STORY_CONTENT_WIDTH,
        ...style,
      }}
    >
      <div style={{ display: "flex", ...nowrap }}>{children}</div>
      {arrow ? <Arrow color={solid ? "currentColor" : "currentColor"} /> : null}
    </div>
  );
}

function Arrow({ color }: { color: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M5 12h14m0 0-6-6m6 6-6 6"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A small line pointing at where the link sticker goes: "Tap the link". */
function StoryLinkHint({ style, children }: StoryPartProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 36,
        color: v.muted,
        ...style,
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ display: "flex", ...nowrap }}>{children}</div>
    </div>
  );
}

/** A line across the content, in the border colour. */
function StoryDivider({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{ display: "flex", flexShrink: 0, height: 2, backgroundColor: v.border, ...style }}
    />
  );
}

type AnyProps = Record<string, unknown> & { children?: ReactNode; alt?: unknown };

/**
 * The text of a story, in reading order, for the image's `alt`. Parts with
 * an `alt` prop (tiles, chips) are read by it instead of their text, so a
 * struck-through "19h" can say "19h, taken".
 *
 * @example
 * <StoryFrame story={story} alt={storyAlt(story)} … />
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
    if (typeof props.alt === "string" && type !== "img") {
      if (props.alt.trim()) runs.push(props.alt.trim());
      return;
    }
    // Parts are plain functions without hooks, so they can be expanded here as Satori does.
    if (typeof type === "function") {
      walk((type as (props: AnyProps) => ReactNode)(props));
      return;
    }
    walk(props.children);
  };
  walk(story);
  return runs.map((run) => (/[.!?…:]$/.test(run) ? run : `${run}.`)).join(" ");
}

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
  type StoryDecoration,
  type StoryProps,
  type StoryTheme,
  type StoryThemeName,
  type StoryVariant,
};
