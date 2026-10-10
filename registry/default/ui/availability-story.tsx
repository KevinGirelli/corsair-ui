import type { CSSProperties, ReactNode } from "react";

import { STORY_SAFE_AREA, STORY_SIZE } from "@/registry/default/lib/story";

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

interface AvailabilityStoryBaseProps {
  title: string;
  /** The day, the week, the place. */
  subtitle?: string;
  /** Shown at the top: a name and an optional logo (a URL that allows CORS, or a data URL). */
  brand?: { name: string; logo?: string };
  /** The call to action at the bottom, e.g. "Book through the link". */
  cta?: string;
  /** Next to an arrow under the call to action, pointing where the link sticker goes: "Tap the link". */
  linkHint?: string;
  /** A photo behind everything, darkened so the text stays readable. */
  backgroundImage?: string;
  colors?: AvailabilityStoryColors;
  /** A family from the fonts given to the renderer. Defaults to the first one. */
  fontFamily?: string;
  /** Names of the statuses, for the legend and the text alternative. */
  statusLabels?: Partial<Record<AvailabilityStatus, string>>;
  /** Label of the tile that stands for the slots that did not fit. */
  moreLabel?: (hidden: number) => string;
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

const DEFAULT_COLORS: Required<AvailabilityStoryColors> = {
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

/** Smaller type for longer titles, so two lines hold them. */
function titleSize(title: string) {
  if (title.length <= 14) return 120;
  if (title.length <= 24) return 96;
  return 80;
}

/** Lines a title takes at a size, from an average glyph width of half an em. */
function titleLines(title: string, size: number, width: number) {
  return Math.min(2, Math.max(1, Math.ceil((title.length * size * 0.5) / width)));
}

/** Gap between the slots and the call to action. */
const FOOTER_GAP = 40;
const LEGEND_HEIGHT = 36 + 40;

/**
 * Height left for the slots once the header, title, subtitle, legend and
 * call to action have theirs, so lists can be cut to what fits instead of
 * pushing the call to action out of the safe area.
 */
function bodyHeight(props: AvailabilityStoryBaseProps, contentWidth: number, legend: boolean) {
  const size = titleSize(props.title);
  let height = STORY_SIZE.height - STORY_SAFE_AREA.top - STORY_SAFE_AREA.bottom;
  if (props.brand) height -= 96 + 64;
  height -= titleLines(props.title, size, contentWidth) * size * 1.02;
  if (props.subtitle) height -= 20 + 58;
  height -= 72;
  if (legend) height -= LEGEND_HEIGHT;
  if (props.cta || props.linkHint) height -= FOOTER_GAP;
  if (props.cta) height -= 100;
  if (props.linkHint) height -= 44 + (props.cta ? 24 : 0);
  return Math.max(0, Math.floor(height));
}

const nowrap: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function slotLook(status: AvailabilityStatus, colors: Required<AvailabilityStoryColors>) {
  switch (status) {
    case "taken":
      return {
        background: colors.surface,
        border: colors.surface,
        color: colors.muted,
        textDecoration: "line-through" as const,
      };
    case "few":
      return {
        background: "transparent",
        border: colors.accent,
        color: colors.foreground,
        textDecoration: "none" as const,
      };
    default:
      return {
        background: colors.accent,
        border: colors.accent,
        color: colors.accentForeground,
        textDecoration: "none" as const,
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

function DayGrid({
  slots,
  colors,
  width,
  height,
  moreLabel,
}: {
  slots: AvailabilitySlot[];
  colors: Required<AvailabilityStoryColors>;
  width: number;
  height: number;
  moreLabel: (hidden: number) => string;
}) {
  const columns = 3;
  const gap = 28;
  const tileWidth = Math.floor((width - gap * (columns - 1)) / columns);
  const withNotes = slots.some((slot) => slot.note);
  const tileHeight = withNotes ? 156 : 124;
  const rows = Math.min(6, Math.max(1, Math.floor((height + gap) / (tileHeight + gap))));
  const { shown, hidden } = fit(slots, columns * rows);
  const more = hidden > 0 ? moreLabel(hidden) : "";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap, width }}>
      {shown.map((slot, index) => {
        const look = slotLook(slot.status ?? "open", colors);
        return (
          <div
            key={`${slot.label}-${index}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: tileWidth,
              height: tileHeight,
              borderRadius: 32,
              boxSizing: "border-box",
              border: `4px solid ${look.border}`,
              backgroundColor: look.background,
              color: look.color,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 60,
                fontWeight: 700,
                lineHeight: 1,
                textDecoration: look.textDecoration,
                maxWidth: tileWidth - 32,
                ...nowrap,
              }}
            >
              {slot.label}
            </div>
            {slot.note ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 12,
                  fontSize: 30,
                  lineHeight: 1,
                  opacity: 0.8,
                  maxWidth: tileWidth - 32,
                  ...nowrap,
                }}
              >
                {slot.note}
              </div>
            ) : null}
          </div>
        );
      })}
      {hidden > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: tileWidth,
            height: tileHeight,
            borderRadius: 32,
            boxSizing: "border-box",
            border: `4px dashed ${colors.muted}`,
            color: colors.foreground,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: moreSize(more),
              fontWeight: 700,
              maxWidth: tileWidth - 32,
              ...nowrap,
            }}
          >
            {more}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WeekRows({
  days,
  colors,
  width,
  height,
  emptyLabel,
  moreLabel,
}: {
  days: AvailabilityDay[];
  colors: Required<AvailabilityStoryColors>;
  width: number;
  height: number;
  emptyLabel?: string;
  moreLabel: (hidden: number) => string;
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
  const perRow = Math.max(1, Math.floor((width - labelWidth + gap) / (pillWidth + gap)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: rowGap, width }}>
      {shownDays.map((day, index) => {
        const { shown, hidden } = fit(day.slots, perRow);
        return (
          <div
            key={`${day.label}-${index}`}
            style={{ display: "flex", alignItems: "center", height: rowHeight, width }}
          >
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                width: labelWidth,
                fontSize: labelFont,
                fontWeight: 700,
                color: colors.foreground,
                ...nowrap,
              }}
            >
              {day.label}
            </div>
            <div style={{ display: "flex", gap }}>
              {shown.length === 0 ? (
                <div style={{ display: "flex", fontSize: Math.round(36 * k), color: colors.muted }}>
                  {emptyLabel ?? "—"}
                </div>
              ) : null}
              {shown.map((slot, slotIndex) => {
                const look = slotLook(slot.status ?? "open", colors);
                return (
                  <div
                    key={`${slot.label}-${slotIndex}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: pillWidth,
                      height: pillHeight,
                      borderRadius: pillHeight / 2,
                      boxSizing: "border-box",
                      border: `3px solid ${look.border}`,
                      backgroundColor: look.background,
                      color: look.color,
                      fontSize: Math.round(34 * k),
                      fontWeight: 700,
                      textDecoration: look.textDecoration,
                      ...nowrap,
                    }}
                  >
                    {slot.label}
                  </div>
                );
              })}
              {hidden > 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: pillWidth,
                    height: pillHeight,
                    borderRadius: pillHeight / 2,
                    boxSizing: "border-box",
                    border: `3px dashed ${colors.muted}`,
                    color: colors.foreground,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: Math.round(34 * k),
                      fontWeight: 700,
                      maxWidth: pillWidth - 16,
                      ...nowrap,
                    }}
                  >
                    {moreLabel(hidden)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Spotlight({
  slot,
  caption,
  colors,
  width,
}: {
  slot: AvailabilitySlot;
  caption?: string;
  colors: Required<AvailabilityStoryColors>;
  width: number;
}) {
  const taken = slot.status === "taken";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width }}>
      <div
        style={{
          display: "flex",
          fontSize: slot.label.length > 6 ? 180 : 260,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: -6,
          color: taken ? colors.muted : colors.foreground,
          textDecoration: taken ? "line-through" : "none",
          maxWidth: width,
          ...nowrap,
        }}
      >
        {slot.label}
      </div>
      {slot.note ? (
        <div
          style={{
            display: "flex",
            marginTop: 40,
            padding: "18px 36px",
            borderRadius: 999,
            backgroundColor: colors.accent,
            color: colors.accentForeground,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1,
            maxWidth: width,
            ...nowrap,
          }}
        >
          {slot.note}
        </div>
      ) : null}
      {caption ? (
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 52,
            lineHeight: 1.2,
            color: colors.muted,
            maxWidth: width,
            lineClamp: 2,
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
}

function Legend({
  statuses,
  labels,
  colors,
}: {
  statuses: AvailabilityStatus[];
  labels: Record<AvailabilityStatus, string>;
  colors: Required<AvailabilityStoryColors>;
}) {
  if (statuses.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: 36, marginTop: 36 }}>
      {statuses.map((status) => {
        const look = slotLook(status, colors);
        return (
          <div
            key={status}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 34,
              color: colors.muted,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 28,
                height: 28,
                borderRadius: 14,
                boxSizing: "border-box",
                border: `4px solid ${look.border}`,
                backgroundColor: look.background,
              }}
            />
            <div style={{ display: "flex" }}>{labels[status]}</div>
          </div>
        );
      })}
    </div>
  );
}

function ArrowDown({ color }: { color: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4v16m0 0-6-6m6 6 6-6"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function statusesIn(slots: AvailabilitySlot[]) {
  const present = new Set(slots.map((slot) => slot.status ?? "open"));
  return (["open", "few", "taken"] as const).filter((status) => present.has(status));
}

/**
 * A story of free slots for Instagram, WhatsApp or TikTok: a grid for one day,
 * a row per day for the week, or one slot in the spotlight. Every word comes
 * from props, so it fits any language, currency and business, from a court to
 * a barbershop. Content stays inside the stories' safe area, and long lists
 * end in a "+N" tile.
 *
 * It is an image template, not a page component: render it with
 * `renderStoryPng` or `StoryFrame` in the browser, or with `ImageResponse`
 * from `next/og` on the server. Pass `availabilityStoryAlt(props)` as the
 * image's text alternative.
 *
 * @example
 * <AvailabilityStory
 *   title="Free today"
 *   subtitle="Friday, October 10"
 *   brand={{ name: "North Court" }}
 *   slots={[{ label: "18h" }, { label: "19h", status: "taken" }, { label: "21h", status: "few" }]}
 *   cta="Book through the link"
 * />
 */
function AvailabilityStory(props: AvailabilityStoryProps) {
  const {
    title,
    subtitle,
    brand,
    cta,
    linkHint,
    backgroundImage,
    fontFamily,
    moreLabel = defaultMoreLabel,
  } = props;
  // Always laid out at the story size; renderers scale the image, not the layout.
  const { width, height } = STORY_SIZE;
  const colors = { ...DEFAULT_COLORS, ...props.colors };
  const labels = { ...DEFAULT_STATUS_LABELS, ...props.statusLabels };
  const side = STORY_SAFE_AREA.side + INSET;
  const contentWidth = STORY_SIZE.width - side * 2;

  let body: ReactNode;
  let legend: AvailabilityStatus[] = [];
  if (props.layout === "week") {
    legend = statusesIn(props.days.flatMap((day) => day.slots));
    body = (
      <WeekRows
        days={props.days}
        colors={colors}
        width={contentWidth}
        height={bodyHeight(props, contentWidth, legend.length > 1)}
        emptyLabel={props.emptyLabel}
        moreLabel={moreLabel}
      />
    );
  } else if (props.layout === "spotlight") {
    body = (
      <Spotlight slot={props.slot} caption={props.caption} colors={colors} width={contentWidth} />
    );
  } else {
    legend = statusesIn(props.slots);
    body = (
      <DayGrid
        slots={props.slots}
        colors={colors}
        width={contentWidth}
        height={bodyHeight(props, contentWidth, legend.length > 1)}
        moreLabel={moreLabel}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        backgroundColor: colors.background,
        color: colors.foreground,
        // Left out when unset: the Satori in next/og fails on undefined style values.
        ...(fontFamily ? { fontFamily } : {}),
        overflow: "hidden",
      }}
    >
      {backgroundImage ? (
        <>
          <img
            src={backgroundImage}
            alt=""
            width={width}
            height={height}
            style={{ position: "absolute", top: 0, left: 0, width, height, objectFit: "cover" }}
          />
          {/* Dims the photo, then fades it into the background colour towards the bottom. */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height,
              backgroundColor: colors.background,
              opacity: 0.55,
            }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height,
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0) 35%, ${colors.background} 100%)`,
            }}
          />
        </>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          // Positioned, so it paints above the photo and its overlays, which are.
          position: "relative",
          flexShrink: 0,
          width: STORY_SIZE.width,
          height: STORY_SIZE.height,
          boxSizing: "border-box",
          padding: `${STORY_SAFE_AREA.top}px ${side}px ${STORY_SAFE_AREA.bottom}px`,
        }}
      >
        {brand ? (
          <div
            style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 24, height: 96 }}
          >
            {brand.logo ? (
              <img
                src={brand.logo}
                alt=""
                width={96}
                height={96}
                style={{ width: 96, height: 96, borderRadius: 24, objectFit: "cover" }}
              />
            ) : null}
            <div
              style={{
                display: "flex",
                fontSize: 44,
                fontWeight: 700,
                maxWidth: contentWidth - 120,
                ...nowrap,
              }}
            >
              {brand.name}
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexShrink: 0,
            marginTop: brand ? 64 : 0,
            fontSize: titleSize(title),
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: -2,
            maxWidth: contentWidth,
            lineClamp: 2,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              marginTop: 20,
              fontSize: 48,
              color: colors.muted,
              maxWidth: contentWidth,
              ...nowrap,
            }}
          >
            {subtitle}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 72,
            flexGrow: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {body}
          <Legend statuses={legend} labels={labels} colors={colors} />
        </div>

        {cta || linkHint ? (
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 24,
              marginTop: FOOTER_GAP,
            }}
          >
            {cta ? (
              <div
                style={{
                  display: "flex",
                  padding: "26px 44px",
                  borderRadius: 999,
                  backgroundColor: colors.accent,
                  color: colors.accentForeground,
                  fontSize: 48,
                  fontWeight: 700,
                  lineHeight: 1,
                  maxWidth: contentWidth,
                  ...nowrap,
                }}
              >
                {cta}
              </div>
            ) : null}
            {linkHint ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 40,
                  color: colors.muted,
                }}
              >
                <ArrowDown color={colors.muted} />
                {linkHint}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
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
 * The story in words, for the image's `alt`: title, subtitle and every slot
 * by status, with the same `statusLabels`.
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

export {
  AvailabilityStory,
  availabilityStoryAlt,
  type AvailabilityDay,
  type AvailabilitySlot,
  type AvailabilityStatus,
  type AvailabilityStoryColors,
  type AvailabilityStoryProps,
};
