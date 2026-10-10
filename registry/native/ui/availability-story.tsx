import { useId, useState, type ReactNode } from "react";
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
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { STORY_SAFE_AREA, STORY_SIZE, useStoryUnit } from "@/registry/native/lib/story";
import { useTheme } from "@/registry/native/lib/theme";

type AvailabilityStatus = "open" | "few" | "taken";

interface AvailabilitySlot {
  /** What is free, as it should read: "18h", "6:30 pm", "Court 2 · 20h". */
  label: string;
  /** `open` by default; `few` for the last places, `taken` to show what is gone. */
  status?: AvailabilityStatus;
  /** A short line under the label: a price, "2 left". */
  note?: string;
}

interface AvailabilityDay {
  /** "Mon", "Tue 14". */
  label: string;
  slots: AvailabilitySlot[];
}

interface AvailabilityStoryColors {
  background?: string;
  foreground?: string;
  muted?: string;
  /** Fill of open slots and the call to action. */
  accent?: string;
  /** Text on the accent. */
  accentForeground?: string;
  /** Fill of taken slots and quiet surfaces. */
  surface?: string;
}

/** A URL, or what `Image` takes, such as `require("./logo.png")`. */
type StoryImage = string | ImageSourcePropType;

interface AvailabilityStoryBaseProps {
  title: string;
  /** The day, the week, the place. */
  subtitle?: string;
  /** Shown at the top: a name and an optional logo. */
  brand?: { name: string; logo?: StoryImage };
  /** The call to action at the bottom, e.g. "Book through the link". */
  cta?: string;
  /** Next to an arrow under the call to action, pointing where the link sticker goes: "Tap the link". */
  linkHint?: string;
  /** A photo behind everything, darkened so the text stays readable. */
  backgroundImage?: StoryImage;
  colors?: AvailabilityStoryColors;
  /** Names of the statuses, for the legend and the text alternative. */
  statusLabels?: Partial<Record<AvailabilityStatus, string>>;
  /** Label of the tile that stands for the slots that did not fit. */
  moreLabel?: (hidden: number) => string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface AvailabilityStoryDayProps extends AvailabilityStoryBaseProps {
  /** A grid of slots for one day. */
  layout?: "day";
  slots: AvailabilitySlot[];
}

interface AvailabilityStoryWeekProps extends AvailabilityStoryBaseProps {
  /** One row per day. */
  layout: "week";
  days: AvailabilityDay[];
  /** Shown for a day without slots, e.g. "Full". */
  emptyLabel?: string;
}

interface AvailabilityStorySpotlightProps extends AvailabilityStoryBaseProps {
  /** One slot, large: a last place, a deal. */
  layout: "spotlight";
  slot: AvailabilitySlot;
  /** A line under it: "Only one left today". */
  caption?: string;
}

type AvailabilityStoryProps =
  AvailabilityStoryDayProps | AvailabilityStoryWeekProps | AvailabilityStorySpotlightProps;

type StoryColors = Required<AvailabilityStoryColors>;
type Px = (value: number) => number;

const DEFAULT_COLORS: StoryColors = {
  background: "#0a0a0a",
  foreground: "#fafafa",
  muted: "rgba(250, 250, 250, 0.62)",
  accent: "#fafafa",
  accentForeground: "#0a0a0a",
  surface: "rgba(250, 250, 250, 0.1)",
};

const DEFAULT_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  open: "available",
  few: "few left",
  taken: "taken",
};

const defaultMoreLabel = (hidden: number) => `+${hidden}`;

/** Inner margin at the sides, on top of the safe area's. */
const INSET = 8;
/** Title line height per font size. Tighter clips accents on iOS. */
const TITLE_LEADING = 1.1;
/** Gap between the slots and the call to action. */
const FOOTER_GAP = 40;
const LEGEND_GAP = 36;
const LEGEND_ROW = 40;
const CTA_HEIGHT = 100;
const HINT_HEIGHT = 48;

/** Smaller type for longer titles, so two lines hold them. */
function titleSize(title: string) {
  if (title.length <= 14) return 120;
  if (title.length <= 24) return 96;
  return 80;
}

/** Lines a title takes at a size, from an average glyph width of 0.55 em. */
function titleLines(title: string, size: number, width: number) {
  return Math.min(2, Math.max(1, Math.ceil((title.length * size * 0.55) / width)));
}

/**
 * Height for the slots and legend before layout has measured it, once the
 * header, title, subtitle and call to action have theirs. After layout the
 * real height is used, so a title that wraps differently never pushes the
 * call to action out of the safe area.
 */
function estimatedBodyHeight(props: AvailabilityStoryBaseProps, contentWidth: number) {
  const size = titleSize(props.title);
  let height = STORY_SIZE.height - STORY_SAFE_AREA.top - STORY_SAFE_AREA.bottom;
  if (props.brand) height -= 96 + 64;
  height -= titleLines(props.title, size, contentWidth) * size * TITLE_LEADING;
  if (props.subtitle) height -= 20 + 58;
  height -= 72;
  if (props.cta || props.linkHint) height -= FOOTER_GAP;
  if (props.cta) height -= CTA_HEIGHT;
  if (props.linkHint) height -= HINT_HEIGHT + (props.cta ? 24 : 0);
  return Math.max(0, Math.floor(height));
}

function slotLook(status: AvailabilityStatus, colors: StoryColors) {
  switch (status) {
    case "taken":
      return {
        background: colors.surface,
        border: colors.surface,
        color: colors.muted,
        decoration: "line-through" as const,
      };
    case "few":
      return {
        background: "transparent",
        border: colors.accent,
        color: colors.foreground,
        decoration: "none" as const,
      };
    default:
      return {
        background: colors.accent,
        border: colors.accent,
        color: colors.accentForeground,
        decoration: "none" as const,
      };
  }
}

/** The "+N" tile's type: smaller for a longer `moreLabel`, such as "+19 more". */
function moreSize(label: string) {
  if (label.length <= 5) return 52;
  if (label.length <= 9) return 44;
  return 36;
}

/** Keeps the first `max` items and says how many were left out. */
function fit<T>(items: T[], max: number) {
  if (items.length <= max) return { shown: items, hidden: 0 };
  return { shown: items.slice(0, max - 1), hidden: items.length - (max - 1) };
}

function statusesIn(slots: AvailabilitySlot[]) {
  const present = new Set(slots.map((slot) => slot.status ?? "open"));
  return (["open", "few", "taken"] as const).filter((status) => present.has(status));
}

function imageSource(image: StoryImage): ImageSourcePropType {
  return typeof image === "string" ? { uri: image } : image;
}

/** One line of story text in px: never scaled by the font size setting, cut with an ellipsis. */
function Line({
  px,
  size,
  leading = 1.2,
  style,
  lines = 1,
  children,
}: {
  px: Px;
  size: number;
  leading?: number;
  style?: StyleProp<TextStyle>;
  lines?: number;
  children: ReactNode;
}) {
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={lines}
      ellipsizeMode="tail"
      style={[{ fontSize: px(size), lineHeight: px(Math.round(size * leading)) }, style]}
    >
      {children}
    </Text>
  );
}

function DayGrid({
  slots,
  colors,
  width,
  height,
  moreLabel,
  px,
  bold,
}: {
  slots: AvailabilitySlot[];
  colors: StoryColors;
  width: number;
  height: number;
  moreLabel: (hidden: number) => string;
  px: Px;
  bold: TextStyle;
}) {
  const columns = 3;
  const gap = 28;
  const tileWidth = Math.floor((width - gap * (columns - 1)) / columns);
  const withNotes = slots.some((slot) => slot.note);
  const tileHeight = withNotes ? 156 : 124;
  const rows = Math.min(6, Math.max(1, Math.floor((height + gap) / (tileHeight + gap))));
  const { shown, hidden } = fit(slots, columns * rows);
  const tile = {
    width: px(tileWidth),
    height: px(tileHeight),
    borderRadius: px(32),
    borderWidth: px(4),
    paddingHorizontal: px(16),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return (
    <View style={[styles.wrap, { gap: px(gap), width: px(width) }]}>
      {shown.map((slot, index) => {
        const look = slotLook(slot.status ?? "open", colors);
        return (
          <View
            key={`${slot.label}-${index}`}
            style={[tile, { borderColor: look.border, backgroundColor: look.background }]}
          >
            <Line
              px={px}
              size={60}
              style={[
                bold,
                { color: look.color, textDecorationLine: look.decoration, textAlign: "center" },
              ]}
            >
              {slot.label}
            </Line>
            {slot.note ? (
              <Line
                px={px}
                size={30}
                style={{ color: look.color, opacity: 0.8, marginTop: px(12), textAlign: "center" }}
              >
                {slot.note}
              </Line>
            ) : null}
          </View>
        );
      })}
      {hidden > 0 ? (
        <View style={[tile, { borderColor: colors.muted, borderStyle: "dashed" }]}>
          <Line
            px={px}
            size={moreSize(moreLabel(hidden))}
            style={[bold, { color: colors.foreground }]}
          >
            {moreLabel(hidden)}
          </Line>
        </View>
      ) : null}
    </View>
  );
}

function WeekRows({
  days,
  colors,
  width,
  height,
  emptyLabel,
  moreLabel,
  px,
  bold,
  regular,
}: {
  days: AvailabilityDay[];
  colors: StoryColors;
  width: number;
  height: number;
  emptyLabel?: string;
  moreLabel: (hidden: number) => string;
  px: Px;
  bold: TextStyle;
  regular: TextStyle;
}) {
  const rowGap = 14;
  const shownDays = days.slice(0, 7);
  const count = Math.max(1, shownDays.length);
  // Rows shrink, down to a size still read at a glance, to fit seven days.
  const rowHeight = Math.min(84, Math.max(56, Math.floor((height - rowGap * (count - 1)) / count)));
  const k = rowHeight / 84;
  const labelFont = Math.round(42 * k);
  // As wide as the longest day label, from an average glyph width, within limits.
  const longest = Math.max(1, ...shownDays.map((day) => day.label.length));
  const labelWidth = Math.min(320, Math.max(110, Math.round(longest * labelFont * 0.56) + 20));
  const gap = 14;
  const pillWidth = Math.round(132 * k);
  const pillHeight = rowHeight - 8;
  const pillFont = Math.round(34 * k);
  const perRow = Math.max(1, Math.floor((width - labelWidth + gap) / (pillWidth + gap)));
  const pill = {
    width: px(pillWidth),
    height: px(pillHeight),
    borderRadius: px(pillHeight / 2),
    borderWidth: px(3),
    paddingHorizontal: px(8),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return (
    <View style={{ gap: px(rowGap), width: px(width) }}>
      {shownDays.map((day, index) => {
        const { shown, hidden } = fit(day.slots, perRow);
        return (
          <View
            key={`${day.label}-${index}`}
            style={[styles.row, { height: px(rowHeight), width: px(width) }]}
          >
            <View style={{ width: px(labelWidth) }}>
              <Line px={px} size={labelFont} style={[bold, { color: colors.foreground }]}>
                {day.label}
              </Line>
            </View>
            <View style={[styles.row, { gap: px(gap) }]}>
              {shown.length === 0 ? (
                <Line px={px} size={Math.round(36 * k)} style={[regular, { color: colors.muted }]}>
                  {emptyLabel ?? "—"}
                </Line>
              ) : null}
              {shown.map((slot, slotIndex) => {
                const look = slotLook(slot.status ?? "open", colors);
                return (
                  <View
                    key={`${slot.label}-${slotIndex}`}
                    style={[pill, { borderColor: look.border, backgroundColor: look.background }]}
                  >
                    <Line
                      px={px}
                      size={pillFont}
                      style={[bold, { color: look.color, textDecorationLine: look.decoration }]}
                    >
                      {slot.label}
                    </Line>
                  </View>
                );
              })}
              {hidden > 0 ? (
                <View style={[pill, { borderColor: colors.muted, borderStyle: "dashed" }]}>
                  <Line px={px} size={pillFont} style={[bold, { color: colors.foreground }]}>
                    {moreLabel(hidden)}
                  </Line>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Spotlight({
  slot,
  caption,
  colors,
  width,
  px,
  bold,
  regular,
}: {
  slot: AvailabilitySlot;
  caption?: string;
  colors: StoryColors;
  width: number;
  px: Px;
  bold: TextStyle;
  regular: TextStyle;
}) {
  const taken = slot.status === "taken";
  const size = slot.label.length > 6 ? 180 : 260;
  return (
    <View style={{ alignItems: "flex-start", width: px(width) }}>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        // Shrinks a label too long for the width instead of cutting it (iOS and Android).
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={[
          bold,
          {
            maxWidth: px(width),
            fontSize: px(size),
            lineHeight: px(Math.round(size * 1.1)),
            letterSpacing: px(-6),
            color: taken ? colors.muted : colors.foreground,
            textDecorationLine: taken ? "line-through" : "none",
          },
        ]}
      >
        {slot.label}
      </Text>
      {slot.note ? (
        <View
          style={{
            maxWidth: px(width),
            marginTop: px(40),
            paddingVertical: px(18),
            paddingHorizontal: px(36),
            borderRadius: px(999),
            backgroundColor: colors.accent,
          }}
        >
          <Line px={px} size={64} style={[bold, { color: colors.accentForeground }]}>
            {slot.note}
          </Line>
        </View>
      ) : null}
      {caption ? (
        <Line
          px={px}
          size={52}
          lines={2}
          style={[regular, { maxWidth: px(width), marginTop: px(40), color: colors.muted }]}
        >
          {caption}
        </Line>
      ) : null}
    </View>
  );
}

function Legend({
  statuses,
  labels,
  colors,
  px,
  regular,
}: {
  statuses: AvailabilityStatus[];
  labels: Record<AvailabilityStatus, string>;
  colors: StoryColors;
  px: Px;
  regular: TextStyle;
}) {
  return (
    <View style={[styles.row, { gap: px(36), marginTop: px(LEGEND_GAP), height: px(LEGEND_ROW) }]}>
      {statuses.map((status) => {
        const look = slotLook(status, colors);
        return (
          <View key={status} style={[styles.row, { gap: px(14) }]}>
            <View
              style={{
                width: px(28),
                height: px(28),
                borderRadius: px(14),
                borderWidth: px(4),
                borderColor: look.border,
                backgroundColor: look.background,
              }}
            />
            <Line
              px={px}
              size={34}
              leading={LEGEND_ROW / 34}
              style={[regular, { color: colors.muted }]}
            >
              {labels[status]}
            </Line>
          </View>
        );
      })}
    </View>
  );
}

function ArrowDown({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v16m0 0-6-6m6 6 6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * A story of free slots for Instagram, WhatsApp or TikTok: a grid for one day,
 * a row per day for the week, or one slot in the spotlight. Every word comes
 * from props, so it fits any language, currency and business, from a court to
 * a barbershop. Content stays inside the stories' safe area, and long lists
 * end in a "+N" tile.
 *
 * Put it in a `StoryFrame` to preview and share it as a 1080 × 1920 PNG. It
 * takes the same props as the web item, except `fontFamily`: the text uses
 * the theme's `fonts`. Images can be URLs or `require()`d files; load remote
 * ones before sharing. Text ignores the font size setting, since the story
 * is an image.
 *
 * @example
 * <StoryFrame alt={availabilityStoryAlt(story)} link="https://example.com/book">
 *   <AvailabilityStory {...story} />
 * </StoryFrame>
 */
function AvailabilityStory(props: AvailabilityStoryProps) {
  const {
    title,
    subtitle,
    brand,
    cta,
    linkHint,
    backgroundImage,
    colors: colorsProp,
    statusLabels,
    moreLabel = defaultMoreLabel,
    style,
    testID,
  } = props;
  const px = useStoryUnit();
  const { font } = useTheme();
  const bold = font("bold");
  const regular = font("regular");
  const colors = { ...DEFAULT_COLORS, ...colorsProp };
  const labels = { ...DEFAULT_STATUS_LABELS, ...statusLabels };
  const side = STORY_SAFE_AREA.side + INSET;
  const contentWidth = STORY_SIZE.width - side * 2;
  // The body's height in story px once laid out; an estimate before that.
  const [measured, setMeasured] = useState<number | null>(null);
  // Unique per story, so two on one web page do not share a gradient.
  const fadeId = `story-fade-${useId().replace(/[^\w-]/g, "")}`;
  const size = titleSize(title);

  let body: ReactNode;
  let legend: AvailabilityStatus[] = [];
  // Room for the slots: the body minus the legend under them.
  const room = (withLegend: boolean) =>
    Math.max(
      0,
      (measured ?? estimatedBodyHeight(props, contentWidth)) -
        (withLegend ? LEGEND_GAP + LEGEND_ROW : 0)
    );

  if (props.layout === "week") {
    legend = statusesIn(props.days.flatMap((day) => day.slots));
    body = (
      <WeekRows
        days={props.days}
        colors={colors}
        width={contentWidth}
        height={room(legend.length > 1)}
        emptyLabel={props.emptyLabel}
        moreLabel={moreLabel}
        px={px}
        bold={bold}
        regular={regular}
      />
    );
  } else if (props.layout === "spotlight") {
    body = (
      <Spotlight
        slot={props.slot}
        caption={props.caption}
        colors={colors}
        width={contentWidth}
        px={px}
        bold={bold}
        regular={regular}
      />
    );
  } else {
    legend = statusesIn(props.slots);
    body = (
      <DayGrid
        slots={props.slots}
        colors={colors}
        width={contentWidth}
        height={room(legend.length > 1)}
        moreLabel={moreLabel}
        px={px}
        bold={bold}
      />
    );
  }

  return (
    <View
      role="img"
      accessible
      accessibilityLabel={availabilityStoryAlt(props)}
      testID={testID}
      style={[
        styles.root,
        { width: px(STORY_SIZE.width), height: px(STORY_SIZE.height) },
        { backgroundColor: colors.background },
        style,
      ]}
    >
      {backgroundImage ? (
        <>
          <Image source={imageSource(backgroundImage)} resizeMode="cover" style={styles.fill} />
          {/* Dims the photo, then fades it into the background colour towards the bottom. */}
          <View style={[styles.fill, { backgroundColor: colors.background, opacity: 0.55 }]} />
          <Svg style={styles.fill} width="100%" height="100%">
            <Defs>
              <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.35" stopColor={colors.background} stopOpacity={0} />
                <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${fadeId})`} />
          </Svg>
        </>
      ) : null}

      <View
        style={[
          styles.content,
          {
            paddingTop: px(STORY_SAFE_AREA.top),
            paddingBottom: px(STORY_SAFE_AREA.bottom),
            paddingHorizontal: px(side),
          },
        ]}
      >
        {brand ? (
          <View style={[styles.row, { gap: px(24), height: px(96) }]}>
            {brand.logo ? (
              <Image
                source={imageSource(brand.logo)}
                resizeMode="cover"
                style={{ width: px(96), height: px(96), borderRadius: px(24) }}
              />
            ) : null}
            <Line
              px={px}
              size={44}
              style={[bold, { color: colors.foreground, maxWidth: px(contentWidth - 120) }]}
            >
              {brand.name}
            </Line>
          </View>
        ) : null}

        <Line
          px={px}
          size={size}
          leading={TITLE_LEADING}
          lines={2}
          style={[
            bold,
            {
              marginTop: px(brand ? 64 : 0),
              letterSpacing: px(-2),
              color: colors.foreground,
              maxWidth: px(contentWidth),
            },
          ]}
        >
          {title}
        </Line>
        {subtitle ? (
          <Line
            px={px}
            size={48}
            style={[
              regular,
              { marginTop: px(20), color: colors.muted, maxWidth: px(contentWidth) },
            ]}
          >
            {subtitle}
          </Line>
        ) : null}

        <View
          style={[styles.body, { marginTop: px(72) }]}
          onLayout={(event) => {
            const height = Math.floor(event.nativeEvent.layout.height / px(1));
            if (height > 0 && height !== measured) setMeasured(height);
          }}
        >
          {body}
          {legend.length > 1 ? (
            <Legend statuses={legend} labels={labels} colors={colors} px={px} regular={regular} />
          ) : null}
        </View>

        {cta || linkHint ? (
          <View style={{ alignItems: "flex-start", gap: px(24), marginTop: px(FOOTER_GAP) }}>
            {cta ? (
              <View
                style={{
                  maxWidth: px(contentWidth),
                  height: px(CTA_HEIGHT),
                  paddingHorizontal: px(44),
                  borderRadius: px(CTA_HEIGHT / 2),
                  justifyContent: "center",
                  backgroundColor: colors.accent,
                }}
              >
                <Line px={px} size={48} style={[bold, { color: colors.accentForeground }]}>
                  {cta}
                </Line>
              </View>
            ) : null}
            {linkHint ? (
              <View
                style={[
                  styles.row,
                  { gap: px(12), height: px(HINT_HEIGHT), maxWidth: px(contentWidth) },
                ]}
              >
                <ArrowDown color={colors.muted} size={px(44)} />
                <Line px={px} size={40} style={[regular, { color: colors.muted, flexShrink: 1 }]}>
                  {linkHint}
                </Line>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function list(slots: AvailabilitySlot[], labels: Record<AvailabilityStatus, string>) {
  return statusesIn(slots)
    .map((status) => {
      const items = slots
        .filter((slot) => (slot.status ?? "open") === status)
        .map((slot) => (slot.note ? `${slot.label} (${slot.note})` : slot.label));
      return `${labels[status]}: ${items.join(", ")}`;
    })
    .join("; ");
}

/**
 * The story in words, for `StoryFrame`'s `alt`: title, subtitle and every
 * slot by status, with the same `statusLabels`.
 */
function availabilityStoryAlt(props: AvailabilityStoryProps) {
  const labels = { ...DEFAULT_STATUS_LABELS, ...props.statusLabels };
  const head = [props.brand?.name, props.title, props.subtitle].filter(Boolean).join(". ");
  let detail: string;
  if (props.layout === "week") {
    detail = props.days
      .map((day) =>
        day.slots.length
          ? `${day.label}: ${list(day.slots, labels)}`
          : `${day.label}: ${props.emptyLabel ?? "—"}`
      )
      .join(". ");
  } else if (props.layout === "spotlight") {
    detail = [list([props.slot], labels), props.caption].filter(Boolean).join(". ");
  } else {
    detail = list(props.slots, labels);
  }
  return [head, detail, props.cta].filter(Boolean).join(". ") + ".";
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
  content: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
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
  AvailabilityStory,
  availabilityStoryAlt,
  type AvailabilityDay,
  type AvailabilitySlot,
  type AvailabilityStatus,
  type AvailabilityStoryColors,
  type AvailabilityStoryProps,
  type StoryImage,
};
