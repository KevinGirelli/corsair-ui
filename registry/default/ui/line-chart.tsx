"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/registry/default/lib/utils";

// The drawing is laid out in a fixed box and scaled to its container.
const WIDTH = 640;
const HEIGHT = 220;
const TOP = 24;
const BOTTOM = 12;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

interface Point {
  x: number;
  y: number;
}

const n = (value: number) => Math.round(value * 100) / 100;

/** Straight segments with each join rounded off by `radius`. */
function linearPath(points: Point[], radius = 3) {
  const [first, ...rest] = points;
  if (!first) return "";
  let d = `M${n(first.x)} ${n(first.y)}`;
  rest.forEach((point, index) => {
    const next = rest[index + 1];
    const previous = points[index]!;
    if (!next) {
      d += ` L${n(point.x)} ${n(point.y)}`;
      return;
    }
    const into = Math.hypot(point.x - previous.x, point.y - previous.y) || 1;
    const out = Math.hypot(next.x - point.x, next.y - point.y) || 1;
    const r = Math.min(radius, into / 2, out / 2);
    const before = {
      x: point.x - ((point.x - previous.x) / into) * r,
      y: point.y - ((point.y - previous.y) / into) * r,
    };
    const after = {
      x: point.x + ((next.x - point.x) / out) * r,
      y: point.y + ((next.y - point.y) / out) * r,
    };
    d += ` L${n(before.x)} ${n(before.y)} Q${n(point.x)} ${n(point.y)} ${n(after.x)} ${n(after.y)}`;
  });
  return d;
}

/**
 * A smooth curve through every point that never overshoots them
 * (monotone cubic interpolation), so peaks in the drawing are peaks in the data.
 */
function smoothPath(points: Point[]) {
  if (points.length < 3) return linearPath(points, 0);
  const slopes = points
    .slice(1)
    .map((point, index) => (point.y - points[index]!.y) / (point.x - points[index]!.x || 1));
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0]!;
    if (index === points.length - 1) return slopes[slopes.length - 1]!;
    const before = slopes[index - 1]!;
    const after = slopes[index]!;
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  slopes.forEach((slope, index) => {
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      return;
    }
    const a = tangents[index]! / slope;
    const b = tangents[index + 1]! / slope;
    const size = a * a + b * b;
    if (size > 9) {
      const scale = 3 / Math.sqrt(size);
      tangents[index] = scale * a * slope;
      tangents[index + 1] = scale * b * slope;
    }
  });
  let d = `M${n(points[0]!.x)} ${n(points[0]!.y)}`;
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index]!;
    const to = points[index + 1]!;
    const third = (to.x - from.x) / 3;
    d += ` C${n(from.x + third)} ${n(from.y + tangents[index]! * third)} ${n(to.x - third)} ${n(to.y - tangents[index + 1]! * third)} ${n(to.x)} ${n(to.y)}`;
  }
  return d;
}

interface LineChartProps extends Omit<ComponentProps<"div">, "children"> {
  /** The values to plot, in order. The Y axis fits their range. */
  data: number[];
  /** A label per value, shown in the tooltip and along the X axis. */
  labels?: string[];
  /** Name of the series, shown in the tooltip and used as the accessible name. */
  name?: string;
  /** Line and dot colour; any CSS colour. Defaults to the primary colour. */
  color?: string;
  /** How the line runs between points. */
  curve?: "smooth" | "linear";
  /**
   * Locale and options for the numbers, as in `Intl.NumberFormat`. Both can
   * be passed from a server component; a fixed default keeps the server and
   * the browser in agreement.
   */
  locale?: string;
  numberFormat?: Intl.NumberFormatOptions;
  /** Formats the value in the tooltip; overrides `locale` and `numberFormat`. */
  formatValue?: (value: number, index: number) => ReactNode;
  /** What screen readers hear for a point. Defaults to its label and value. */
  formatValueText?: (value: number, index: number) => string;
  /** The point selected at first. Defaults to the last one. */
  defaultIndex?: number;
  /** Called when the selected point changes, by pointer or keyboard. */
  onIndexChange?: (index: number) => void;
  /** Show labels along the X axis. Needs `labels`. */
  showXAxis?: boolean;
  /**
   * The most X axis labels to show, evenly spaced and ending on the latest
   * point; narrow charts show fewer.
   */
  tickCount?: number;
  /** Colour the line only up to the selected point, grey after it. */
  reveal?: boolean;
  /** Shade the area under the line. */
  showFill?: boolean;
  /** Mark the selected point with a dot. */
  showDot?: boolean;
  /** Glide the cursor, dot and tooltip between points. */
  animated?: boolean;
}

/**
 * A line chart for one series, with a cursor that snaps to the nearest
 * point and a tooltip beside it. It is a slider over the points for
 * keyboards and screen readers: arrow keys, Home and End move the cursor
 * and each point is announced with its label and value. On touch it follows
 * a horizontal drag and leaves vertical scrolling to the page. No chart
 * library: one SVG, scaled to its container.
 *
 * @example
 * <LineChart
 *   name="Knots"
 *   data={[12, 18, 15, 24, 22, 30]}
 *   labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
 * />
 */
function LineChart({
  data,
  labels,
  name,
  color = "var(--primary)",
  curve = "smooth",
  locale = "en-US",
  numberFormat,
  formatValue,
  formatValueText,
  defaultIndex,
  onIndexChange,
  showXAxis = true,
  tickCount = 6,
  reveal = false,
  showFill = true,
  showDot = true,
  animated = true,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: LineChartProps) {
  const id = useId().replace(/[^\w-]/g, "");
  const plot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(WIDTH);
  const [active, setActive] = useState(() => defaultIndex ?? Math.max(0, data.length - 1));

  useEffect(() => {
    const node = plot.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => {
    if (data.length === 0) return [];
    const min = Math.min(...data);
    const range = Math.max(...data) - min || 1;
    return data.map((value, index) => ({
      value,
      x: data.length === 1 ? WIDTH / 2 : (index / (data.length - 1)) * WIDTH,
      y: TOP + (1 - (value - min) / range) * (HEIGHT - TOP - BOTTOM),
    }));
  }, [data]);

  const numbers = useMemo(
    () => new Intl.NumberFormat(locale, numberFormat),
    [locale, numberFormat]
  );

  const { line, area } = useMemo(() => {
    if (points.length === 0) return { line: "", area: "" };
    const d = curve === "smooth" ? smoothPath(points) : linearPath(points);
    const floor = HEIGHT - BOTTOM;
    const last = points[points.length - 1]!;
    return { line: d, area: `${d} L${n(last.x)} ${floor} L${n(points[0]!.x)} ${floor} Z` };
  }, [points, curve]);

  const ticks = useMemo(() => {
    if (!showXAxis || !labels?.length || points.length === 0) return [];
    // At most one label per 80px, so they never run into each other.
    const most = Math.min(tickCount, Math.max(2, Math.floor(width / 80)), points.length);
    if (most < 1) return [];
    // Every step-th point, counted back from the latest so it always has a
    // label, and the smallest step that keeps within `most` labels.
    const last = points.length - 1;
    const step = Math.floor(last / most) + 1;
    return Array.from(
      { length: Math.floor(last / step) + 1 },
      (_, tick) => (last % step) + tick * step
    );
  }, [showXAxis, labels, points.length, tickCount, width]);

  if (points.length === 0) return null;

  const index = Math.min(Math.max(active, 0), points.length - 1);
  const point = points[index]!;
  const select = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), points.length - 1);
    if (clamped === index) return;
    setActive(clamped);
    onIndexChange?.(clamped);
  };

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const at = (event.clientX - box.left) / box.width;
    select(Math.round(at * (points.length - 1)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const page = Math.max(1, Math.round(points.length / 10));
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      PageDown: index - page,
      PageUp: index + page,
      Home: 0,
      End: points.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  const label = labels?.[index];
  const formatted = numbers.format(point.value);
  const valueText =
    formatValueText?.(point.value, index) ?? `${label ? `${label}: ` : ""}${formatted}`;

  // Positions in px, for transforms: they move on the compositor.
  const scale = width / WIDTH;
  const cursorX = point.x * scale;
  const cursorY = point.y * scale;
  const flip = point.x > WIDTH / 2;
  const transition = animated ? `transform 220ms ${EASE}` : undefined;

  return (
    <div
      data-slot="line-chart"
      className={cn("w-full select-none", className)}
      style={{ "--line-chart-color": color, ...style } as CSSProperties}
      {...props}
    >
      <div
        ref={plot}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel ?? name ?? "Chart"}
        aria-valuemin={1}
        aria-valuemax={points.length}
        aria-valuenow={index + 1}
        aria-valuetext={valueText}
        aria-orientation="horizontal"
        data-slot="line-chart-plot"
        className="focus-visible:ring-ring/50 relative aspect-[640/220] w-full touch-pan-y rounded-md outline-none focus-visible:ring-[3px]"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onKeyDown={onKeyDown}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          fill="none"
        >
          <defs>
            <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--line-chart-color)" stopOpacity="0.22" />
              <stop offset="1" stopColor="var(--line-chart-color)" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${id}-reveal`} clipPathUnits="userSpaceOnUse">
              <rect
                width={WIDTH}
                height={HEIGHT}
                style={{
                  transform: `scaleX(${point.x / WIDTH})`,
                  transformOrigin: "left center",
                  transition,
                }}
                className="motion-reduce:!transition-none"
              />
            </clipPath>
          </defs>
          {showFill ? (
            <path
              d={area}
              fill={`url(#${id}-area)`}
              clipPath={reveal ? `url(#${id}-reveal)` : undefined}
            />
          ) : null}
          {reveal ? (
            <path
              d={line}
              stroke="var(--border)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          <path
            d={line}
            stroke="var(--line-chart-color)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={reveal ? `url(#${id}-reveal)` : undefined}
          />
        </svg>

        <div
          aria-hidden="true"
          data-slot="line-chart-cursor"
          className="bg-border pointer-events-none absolute top-[11%] left-0 h-[86%] w-px motion-reduce:!transition-none"
          style={{ transform: `translate3d(${cursorX}px, 0, 0)`, transition }}
        />
        {showDot ? (
          <div
            aria-hidden="true"
            data-slot="line-chart-dot"
            className="pointer-events-none absolute top-0 left-0 -mt-1.5 -ml-1.5 size-3 rounded-full bg-[color:var(--line-chart-color)] shadow-[0_0_0_2px_var(--background)] motion-reduce:!transition-none"
            style={{ transform: `translate3d(${cursorX}px, ${cursorY}px, 0)`, transition }}
          />
        ) : null}
        <div
          aria-hidden="true"
          data-slot="line-chart-tooltip"
          className="bg-popover text-popover-foreground pointer-events-none absolute top-0 left-0 z-10 grid min-w-32 gap-1.5 rounded-md border px-2.5 py-1.5 text-xs shadow-md motion-reduce:!transition-none"
          style={{
            transform: flip
              ? `translate3d(calc(${cursorX}px - 100% - 12px), calc(${cursorY}px - 50%), 0)`
              : `translate3d(${cursorX + 12}px, calc(${cursorY}px - 50%), 0)`,
            transition,
          }}
        >
          {label ? <div className="font-medium">{label}</div> : null}
          <div className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[3px] bg-[color:var(--line-chart-color)]" />
            {name ? <span className="text-muted-foreground">{name}</span> : null}
            <span className="ml-auto font-mono font-medium tabular-nums">
              {formatValue ? formatValue(point.value, index) : formatted}
            </span>
          </div>
        </div>
      </div>

      {ticks.length > 0 ? (
        <div aria-hidden="true" data-slot="line-chart-axis" className="relative mt-2 h-5">
          {ticks.map((tick) => {
            const at = points[tick]!.x / WIDTH;
            return (
              <span
                key={tick}
                className={cn(
                  "text-muted-foreground absolute top-0 text-[11px] leading-none whitespace-nowrap tabular-nums",
                  // Labels near an edge line up with it instead of spilling past.
                  at < 0.1 ? "translate-x-0" : at > 0.9 ? "-translate-x-full" : "-translate-x-1/2"
                )}
                style={{ left: `${at * 100}%` }}
              >
                {labels?.[tick]}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export { LineChart, type LineChartProps };
