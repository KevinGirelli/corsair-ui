"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { useEntrance } from "@/registry/default/hooks/use-entrance";
import { cn } from "@/registry/default/lib/utils";

// Size of the drawing until the browser has measured it, in px.
const SIZE = 200;
// Space between segments, in px along the ring.
const GAP = 2;
const DRAW = "cubic-bezier(0.65, 0, 0.35, 1)";

const n = (value: number) => Math.round(value * 100) / 100;

/**
 * The default colour of segment `index` out of `count`: the primary colour
 * for the first, then the primary colour mixed with the background, lighter
 * for each segment down to 30%.
 */
function defaultColor(index: number, count: number) {
  if (index === 0) return "var(--primary)";
  const share = Math.round(100 - (index / Math.max(count - 1, 1)) * 70);
  return `color-mix(in oklab, var(--primary) ${share}%, var(--background))`;
}

interface DonutChartItem {
  /** Name of the part, shown in the legend. */
  label: string;
  /** Its size. Negative values count as 0. */
  value: number;
  /** Segment colour; any CSS colour. See `DonutChart` for the defaults. */
  color?: string;
}

interface DonutChartProps extends Omit<ComponentProps<"div">, "children"> {
  /** The parts of the whole, drawn clockwise from the top. */
  data: DonutChartItem[];
  /** Name of the chart, used as the accessible name of the legend. */
  name?: string;
  /** Width of the ring, in px. */
  thickness?: number;
  /** Shown small in the hole. Defaults to the highlighted part's label, or `totalLabel`. */
  centerLabel?: ReactNode;
  /** Shown large in the hole. Defaults to the highlighted part's value, or the total. */
  centerValue?: ReactNode;
  /** Label for the total in the hole. */
  totalLabel?: string;
  /**
   * Locale and options for the numbers, as in `Intl.NumberFormat`. Both can
   * be passed from a server component; a fixed default keeps the server and
   * the browser in agreement.
   */
  locale?: string;
  numberFormat?: Intl.NumberFormatOptions;
  /** Options for the percentages in the legend, as in `Intl.NumberFormat`. */
  percentFormat?: Intl.NumberFormatOptions;
  /**
   * Formats values in the legend and the hole; overrides `locale` and
   * `numberFormat`. `index` is -1 for the total.
   */
  formatValue?: (value: number, index: number) => ReactNode;
  /** The part highlighted at first. Defaults to none. */
  defaultIndex?: number;
  /** Called when the highlighted part changes, by pointer or keyboard; `null` when none is. */
  onIndexChange?: (index: number | null) => void;
  /** Sweep the segments in the first time the chart comes into view. */
  animated?: boolean;
}

/**
 * A donut chart for the parts of a whole, with a legend listing each part's
 * value and share. The ring is decorative; the legend carries the data. Each
 * legend entry is a toggle button that highlights its segment: Tab reaches
 * the list, the arrow keys, Home and End move between entries, Enter or
 * Space pins one and Escape clears it. Hovering a segment or an entry
 * highlights it too, dims the rest and shows its value in the hole, which
 * otherwise shows the total. The segments sweep in the first time the chart
 * scrolls into view; with `prefers-reduced-motion` they are simply shown.
 *
 * Parts without a `color` get the primary colour, then lighter mixes of it
 * with the background, so the chart follows the theme; pass colours to tell
 * many parts apart.
 *
 * @example
 * <DonutChart
 *   name="Cargo by hold"
 *   data={[
 *     { label: "Fore", value: 42 },
 *     { label: "Main", value: 31 },
 *     { label: "Aft", value: 18 },
 *   ]}
 * />
 */
function DonutChart({
  data,
  name,
  thickness = 24,
  centerLabel,
  centerValue,
  totalLabel = "Total",
  locale = "en-US",
  numberFormat,
  percentFormat,
  formatValue,
  defaultIndex,
  onIndexChange,
  animated = true,
  className,
  "aria-label": ariaLabel,
  ...props
}: DonutChartProps) {
  const id = useId().replace(/[^\w-]/g, "");
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState(SIZE);
  const [pinned, setPinned] = useState<number | null>(defaultIndex ?? null);
  const [hovered, setHovered] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [observe, phase] = useEntrance<HTMLDivElement>({ play: animated ? undefined : true });
  const entrance = animated ? phase : "static";

  const boxRef = useCallback(
    (node: HTMLDivElement | null) => {
      setBox(node);
      observe(node);
    },
    [observe]
  );

  useEffect(() => {
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) setSize(entry.contentRect.width);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [box]);

  const ring = Math.max(1, Math.min(thickness, size / 2 - 1));
  const radius = (size - ring) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    const values = data.map((item) => Math.max(0, item.value));
    const total = values.reduce((sum, value) => sum + value, 0);
    const shown = values.filter((value) => value > 0).length;
    const shares = values.map((value) => (total ? value / total : 0));
    // Where each segment ends, as a fraction of the ring.
    const ends = shares.map((_, index) =>
      shares.slice(0, index + 1).reduce((sum, share) => sum + share, 0)
    );
    return {
      total,
      items: data.map((item, index) => {
        const share = shares[index]!;
        const from = ends[index]! - share;
        return {
          label: item.label,
          value: values[index]!,
          color: item.color ?? defaultColor(index, data.length),
          share,
          from,
          to: ends[index]!,
          // Leave a gap between segments, never more than the segment itself.
          length: Math.max(0, share * circumference - (shown > 1 ? GAP : 0)),
          offset: from * circumference,
        };
      }),
    };
  }, [data, circumference]);

  const numbers = useMemo(
    () => new Intl.NumberFormat(locale, numberFormat),
    [locale, numberFormat]
  );
  const percents = useMemo(
    () =>
      new Intl.NumberFormat(
        locale,
        percentFormat ?? { style: "percent", maximumFractionDigits: 1 }
      ),
    [locale, percentFormat]
  );

  if (data.length === 0) return null;

  const clamp = (index: number | null) =>
    index === null ? null : Math.min(Math.max(index, 0), data.length - 1);
  const active = clamp(hovered ?? pinned);
  const update = (nextPinned: number | null, nextHovered: number | null) => {
    const next = clamp(nextHovered ?? nextPinned);
    setPinned(nextPinned);
    setHovered(nextHovered);
    if (next !== active) onIndexChange?.(next);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || segments.total === 0) return;
    const scale = rect.width / size;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy) / scale;
    if (distance < radius - ring / 2 || distance > radius + ring / 2) {
      if (hovered !== null) update(pinned, null);
      return;
    }
    // Clockwise from the top, from 0 to 1.
    const turn = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
    const index = segments.items.findIndex((item) => item.share > 0 && turn < item.to);
    const next = index === -1 ? null : index;
    if (next !== hovered) update(pinned, next);
  };

  const format = (value: number, index: number) =>
    formatValue ? formatValue(value, index) : numbers.format(value);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Escape") {
      if (pinned === null) return;
      event.preventDefault();
      update(null, hovered);
      return;
    }
    const moves: Record<string, number> = {
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      Home: 0,
      End: data.length - 1,
    };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = clamp(move)!;
    buttons.current[next]?.focus();
    update(next, hovered);
  };

  const focusable = clamp(pinned) ?? 0;
  const highlighted = active === null ? null : segments.items[active]!;
  const center = size / 2;

  return (
    <div
      data-slot="donut-chart"
      className={cn("grid w-full items-center gap-6 sm:grid-cols-[minmax(0,14rem)_1fr]", className)}
      {...props}
    >
      <div
        ref={boxRef}
        data-slot="donut-chart-ring"
        data-state={entrance}
        className="relative mx-auto aspect-square w-full max-w-56"
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          if (hovered !== null) update(pinned, null);
        }}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${n(size)} ${n(size)}`}
          className="absolute inset-0 size-full"
          fill="none"
        >
          <defs>
            <mask
              id={`${id}-draw`}
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={n(size)}
              height={n(size)}
            >
              <circle
                cx={n(center)}
                cy={n(center)}
                r={n(radius)}
                stroke="white"
                strokeWidth={n(ring + 4)}
                strokeDasharray={`${n(circumference)} ${n(circumference)}`}
                className="motion-reduce:!transition-none motion-reduce:![stroke-dashoffset:0]"
                style={{
                  strokeDashoffset: entrance === "armed" ? n(circumference) : 0,
                  transition: entrance === "play" ? `stroke-dashoffset 900ms ${DRAW}` : undefined,
                }}
              />
            </mask>
          </defs>
          <g transform={`rotate(-90 ${n(center)} ${n(center)})`} mask={`url(#${id}-draw)`}>
            {segments.total === 0 ? (
              <circle
                data-slot="donut-chart-track"
                cx={n(center)}
                cy={n(center)}
                r={n(radius)}
                stroke="var(--muted)"
                strokeWidth={n(ring)}
              />
            ) : null}
            {segments.items.map((item, at) =>
              item.length > 0 ? (
                <circle
                  key={at}
                  data-slot="donut-chart-segment"
                  data-active={active === at ? "" : undefined}
                  data-dimmed={active !== null && active !== at ? "" : undefined}
                  cx={n(center)}
                  cy={n(center)}
                  r={n(radius)}
                  stroke={item.color}
                  strokeWidth={n(ring)}
                  strokeDasharray={`${n(item.length)} ${n(circumference - item.length)}`}
                  strokeDashoffset={n(-item.offset)}
                  className="transition-opacity data-[dimmed]:opacity-40 motion-reduce:transition-none"
                />
              ) : null
            )}
          </g>
        </svg>

        <div
          data-slot="donut-chart-center"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ padding: ring + 8 }}
        >
          <span className="text-muted-foreground max-w-full truncate text-xs">
            {centerLabel ?? highlighted?.label ?? totalLabel}
          </span>{" "}
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {centerValue ??
              (highlighted
                ? format(highlighted.value, active!)
                : formatValue
                  ? formatValue(segments.total, -1)
                  : numbers.format(segments.total))}
          </span>
        </div>
      </div>

      <ul
        aria-label={ariaLabel ?? name}
        data-slot="donut-chart-legend"
        className="grid min-w-0 gap-0.5"
      >
        {segments.items.map((item, at) => (
          <li key={at} data-slot="donut-chart-legend-item">
            <button
              ref={(node) => {
                buttons.current[at] = node;
              }}
              type="button"
              tabIndex={at === focusable ? 0 : -1}
              aria-pressed={pinned === at}
              data-active={active === at ? "" : undefined}
              data-slot="donut-chart-legend-button"
              className="hover:bg-accent data-[active]:bg-accent focus-visible:ring-ring/50 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-[3px]"
              onClick={() => update(pinned === at ? null : at, hovered)}
              onKeyDown={(event) => onKeyDown(event, at)}
              onPointerEnter={() => update(pinned, at)}
              onPointerLeave={() => update(pinned, null)}
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: item.color }}
              />
              {/* The spaces keep the accessible name apart: "Fore 50 50%". Flex layout drops them. */}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>{" "}
              <span className="font-mono font-medium tabular-nums">{format(item.value, at)}</span>{" "}
              <span className="text-muted-foreground w-12 text-right font-mono text-xs tabular-nums">
                {percents.format(item.share)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { DonutChart, type DonutChartItem, type DonutChartProps };
