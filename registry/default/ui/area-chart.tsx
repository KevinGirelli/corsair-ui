"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { useEntrance } from "@/registry/default/hooks/use-entrance";
import { cn } from "@/registry/default/lib/utils";

// The drawing is laid out in a fixed box and scaled to its container.
const WIDTH = 600;
const HEIGHT = 200;
const TOP = 22;
const BOTTOM = 10;
const EASE = "cubic-bezier(0.22, 0.9, 0.3, 1)";
const DRAW = "cubic-bezier(0.65, 0, 0.35, 1)";

interface Point {
  x: number;
  y: number;
}

const n = (value: number) => Math.round(value * 100) / 100;
/** A length in the drawing's units as a share of the plot's width. */
const cqw = (value: number) => `${n((value / WIDTH) * 100)}cqw`;

/** Straight segments; the stroke's round joins soften the corners. */
function linearPath(points: Point[]) {
  return points.map((point, index) => `${index ? "L" : "M"}${n(point.x)} ${n(point.y)}`).join(" ");
}

/**
 * A smooth curve through every point that never overshoots them
 * (monotone cubic interpolation), so peaks in the drawing are peaks in the data.
 */
function smoothPath(points: Point[]) {
  if (points.length < 3) return linearPath(points);
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

/**
 * The default colour of series `index` out of `count`: the primary colour
 * for the first, then the primary colour mixed with the background, lighter
 * for each series down to 40%.
 */
function defaultColor(index: number, count: number) {
  if (index === 0) return "var(--primary)";
  const share = Math.round(100 - (index / Math.max(count - 1, 1)) * 60);
  return `color-mix(in oklab, var(--primary) ${share}%, var(--background))`;
}

interface AreaChartSeries {
  /** Shown in the legend and the tooltip, and read out by screen readers. */
  name: string;
  /** One value per label. Missing values count as 0. */
  data: number[];
  /** Line and fill colour; any CSS colour. See `AreaChart` for the defaults. */
  color?: string;
}

interface AreaChartProps extends Omit<ComponentProps<"div">, "children"> {
  /** The series to plot, drawn in order: later series sit on top (or, stacked, above). */
  series: AreaChartSeries[];
  /** A label per position, shown in the tooltip and along the X axis. */
  labels?: string[];
  /** Accessible name of the chart. Defaults to the series names. */
  name?: string;
  /** Stack the series on top of each other instead of overlapping them. */
  stacked?: boolean;
  /** How the lines run between points. */
  curve?: "smooth" | "linear";
  /**
   * Locale and options for the numbers, as in `Intl.NumberFormat`. Both can
   * be passed from a server component; a fixed default keeps the server and
   * the browser in agreement.
   */
  locale?: string;
  numberFormat?: Intl.NumberFormatOptions;
  /** Formats a value in the tooltip; overrides `locale` and `numberFormat`. */
  formatValue?: (value: number, index: number, series: number) => ReactNode;
  /**
   * What screen readers hear for a position, given every series' value
   * there. Defaults to the label, then each series' name and value.
   */
  formatValueText?: (values: number[], index: number) => string;
  /** The position selected at first. Defaults to the last one. */
  defaultIndex?: number;
  /** Called when the selected position changes, by pointer or keyboard. */
  onIndexChange?: (index: number) => void;
  /** Show labels along the X axis. Needs `labels`. */
  showXAxis?: boolean;
  /**
   * The most X axis labels to show, evenly spaced and ending on the latest
   * point; narrow charts show fewer.
   */
  tickCount?: number;
  /** Show a legend under the chart. Defaults to true when there is more than one series. */
  showLegend?: boolean;
  /** Mark each series at the selected position with a dot. */
  showDot?: boolean;
  /** Draw the areas in from the left the first time they come into view, and glide the cursor. */
  animated?: boolean;
}

/**
 * An area chart for one or more series, overlapping or stacked, each filled
 * with a gradient from its colour to transparent. A cursor snaps to the
 * nearest position and a tooltip lists every series there. It is a slider
 * over the positions for keyboards and screen readers: arrow keys, Page Up /
 * Page Down, Home and End move the cursor and each position is announced
 * with its label and every series' value; the drawing itself is hidden from
 * assistive technology and the legend is a plain list. The areas draw in
 * from the left the first time they scroll into view; with
 * `prefers-reduced-motion` they are simply shown.
 *
 * Series without a `color` get the primary colour, then lighter mixes of
 * it with the background, so the chart follows the theme; pass colours to
 * tell many series apart.
 *
 * @example
 * <AreaChart
 *   labels={["Jan", "Feb", "Mar", "Apr"]}
 *   series={[
 *     { name: "Cargo", data: [40, 52, 48, 61] },
 *     { name: "Crew", data: [20, 24, 22, 30] },
 *   ]}
 *   stacked
 * />
 */
function AreaChart({
  series,
  labels,
  name,
  stacked = false,
  curve = "smooth",
  locale = "en-US",
  numberFormat,
  formatValue,
  formatValueText,
  defaultIndex,
  onIndexChange,
  showXAxis = true,
  tickCount = 6,
  showLegend = series.length > 1,
  showDot = true,
  animated = true,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: AreaChartProps) {
  const id = useId().replace(/[^\w-]/g, "");
  const count = Math.max(0, ...series.map((item) => item.data.length));
  const [plot, setPlot] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(WIDTH);
  const [active, setActive] = useState(() => defaultIndex ?? Math.max(0, count - 1));
  const [observe, phase] = useEntrance<HTMLDivElement>({ play: animated ? undefined : true });
  const entrance = animated ? phase : "static";

  const plotRef = useCallback(
    (node: HTMLDivElement | null) => {
      setPlot(node);
      observe(node);
    },
    [observe]
  );

  useEffect(() => {
    if (!plot || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) setWidth(entry.contentRect.width);
    });
    observer.observe(plot);
    return () => observer.disconnect();
  }, [plot]);

  const layers = useMemo(() => {
    if (count === 0) return [];
    const xs = Array.from({ length: count }, (_, index) =>
      count === 1 ? WIDTH / 2 : (index / (count - 1)) * WIDTH
    );
    const values = series.map((item) => xs.map((_, index) => item.data[index] ?? 0));
    // Stacked series sit on the running total of the ones before them.
    const tops = stacked
      ? values.map((_, layer) =>
          xs.map((_, index) =>
            values.slice(0, layer + 1).reduce((sum, row) => sum + row[index]!, 0)
          )
        )
      : values;
    const all = tops.flat();
    const min = Math.min(0, ...all);
    const range = Math.max(0, ...all) - min || 1;
    const y = (value: number) => TOP + (1 - (value - min) / range) * (HEIGHT - TOP - BOTTOM);
    const path = curve === "smooth" ? smoothPath : linearPath;
    const zero = y(0);
    return series.map((item, layer) => {
      const points = xs.map((x, index) => ({ x, y: y(tops[layer]![index]!) }));
      const line = path(points);
      const below =
        stacked && layer > 0
          ? path(xs.map((x, index) => ({ x, y: y(tops[layer - 1]![index]!) })).reverse()).replace(
              /^M/,
              "L"
            )
          : `L${n(points[points.length - 1]!.x)} ${n(zero)} L${n(points[0]!.x)} ${n(zero)}`;
      return {
        name: item.name,
        color: item.color ?? defaultColor(layer, series.length),
        values: values[layer]!,
        points,
        line,
        area: `${line} ${below} Z`,
      };
    });
  }, [series, count, stacked, curve]);

  const numbers = useMemo(
    () => new Intl.NumberFormat(locale, numberFormat),
    [locale, numberFormat]
  );

  const ticks = useMemo(() => {
    if (!showXAxis || !labels?.length || count === 0) return [];
    // At most one label per 80px, so they never run into each other.
    const most = Math.min(tickCount, Math.max(2, Math.floor(width / 80)), count);
    if (most < 1) return [];
    const last = count - 1;
    const step = Math.floor(last / most) + 1;
    return Array.from(
      { length: Math.floor(last / step) + 1 },
      (_, tick) => (last % step) + tick * step
    );
  }, [showXAxis, labels, count, tickCount, width]);

  if (layers.length === 0) return null;

  const index = Math.min(Math.max(active, 0), count - 1);
  const select = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), count - 1);
    if (clamped === index) return;
    setActive(clamped);
    onIndexChange?.(clamped);
  };

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const at = (event.clientX - box.left) / box.width;
    select(Math.round(at * (count - 1)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const page = Math.max(1, Math.round(count / 10));
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      PageDown: index - page,
      PageUp: index + page,
      Home: 0,
      End: count - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  const label = labels?.[index];
  const current = layers.map((layer) => layer.values[index]!);
  const valueText =
    formatValueText?.(current, index) ??
    `${label ? `${label}: ` : ""}${layers
      .map((layer, at) => `${layer.name} ${numbers.format(current[at]!)}`)
      .join(", ")}`;

  // Positions for transforms, so they move on the compositor. In container
  // units of the plot (its width is 100cqw, its height a third of that), so
  // they are right before the plot is measured too: the server render and the
  // first paint place nothing past the plot's edge, which on a phone would
  // widen the page.
  const x = layers[0]!.points[index]!.x;
  const cursorX = cqw(x);
  const highest = Math.min(...layers.map((layer) => layer.points[index]!.y));
  const flip = x > WIDTH / 2;
  const transition = animated ? `transform 220ms ${EASE}` : undefined;
  const hidden = entrance === "armed" && "opacity-0";

  return (
    <div
      data-slot="area-chart"
      data-stacked={stacked ? "" : undefined}
      className={cn("w-full select-none", className)}
      style={style}
      {...props}
    >
      <div
        ref={plotRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel ?? name ?? layers.map((layer) => layer.name).join(", ")}
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={index + 1}
        aria-valuetext={valueText}
        aria-orientation="horizontal"
        data-slot="area-chart-plot"
        data-state={entrance}
        // A size container: the cursor, dots and tooltip are placed in its cqw.
        className="focus-visible:ring-ring/50 [container-type:inline-size] relative aspect-[3/1] w-full touch-pan-y rounded-md outline-none focus-visible:ring-[3px]"
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
            {layers.map((layer, at) => (
              <linearGradient key={at} id={`${id}-fill-${at}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={layer.color} stopOpacity="0.3" />
                <stop offset="1" stopColor={layer.color} stopOpacity="0" />
              </linearGradient>
            ))}
            <clipPath id={`${id}-draw`} clipPathUnits="userSpaceOnUse">
              {/* Wider than the box so round line caps at the edges are not cut. */}
              <rect
                x={-8}
                y={-8}
                width={WIDTH + 16}
                height={HEIGHT + 16}
                className="motion-reduce:![transform:none] motion-reduce:!transition-none"
                style={{
                  transformBox: "view-box",
                  transformOrigin: "0 0",
                  transform: entrance === "armed" ? "scaleX(0)" : undefined,
                  transition: entrance === "play" ? `transform 900ms ${DRAW}` : undefined,
                }}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-draw)`}>
            {layers.map((layer, at) => (
              <path
                key={`area-${at}`}
                data-slot="area-chart-area"
                d={layer.area}
                fill={`url(#${id}-fill-${at})`}
              />
            ))}
            {layers.map((layer, at) => (
              <path
                key={`line-${at}`}
                data-slot="area-chart-line"
                d={layer.line}
                stroke={layer.color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        </svg>

        <div
          aria-hidden="true"
          data-slot="area-chart-cursor"
          className={cn(
            "bg-border pointer-events-none absolute top-[11%] left-0 h-[86%] w-px motion-reduce:!transition-none",
            hidden
          )}
          style={{ transform: `translate3d(${cursorX}, 0, 0)`, transition }}
        />
        {showDot
          ? layers.map((layer, at) => (
              <div
                key={at}
                aria-hidden="true"
                data-slot="area-chart-dot"
                className={cn(
                  "pointer-events-none absolute top-0 left-0 -mt-1.5 -ml-1.5 size-3 rounded-full shadow-[0_0_0_2px_var(--background)] motion-reduce:!transition-none",
                  hidden
                )}
                style={{
                  backgroundColor: layer.color,
                  transform: `translate3d(${cursorX}, ${cqw(layer.points[index]!.y)}, 0)`,
                  transition,
                }}
              />
            ))
          : null}
        {/* A zero-size anchor rides on the highest point; the card hangs off its side. */}
        <div
          aria-hidden="true"
          data-slot="area-chart-tooltip-anchor"
          className={cn(
            "pointer-events-none absolute top-0 left-0 z-10 size-0 motion-reduce:!transition-none",
            hidden
          )}
          style={{
            transform: `translate3d(${cursorX}, ${cqw(highest)}, 0)`,
            transition,
          }}
        >
          <div
            data-slot="area-chart-tooltip"
            className={cn(
              "bg-popover text-popover-foreground absolute top-0 grid w-max min-w-32 -translate-y-1/2 gap-1.5 rounded-md border px-2.5 py-1.5 text-xs shadow-md",
              flip ? "right-3" : "left-3"
            )}
          >
            {label ? <div className="font-medium">{label}</div> : null}
            {layers.map((layer, at) => (
              <div key={at} className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-muted-foreground">{layer.name}</span>
                <span className="ml-auto pl-2 font-mono font-medium tabular-nums">
                  {formatValue
                    ? formatValue(current[at]!, index, at)
                    : numbers.format(current[at]!)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ticks.length > 0 ? (
        <div aria-hidden="true" data-slot="area-chart-axis" className="relative mt-2 h-5">
          {ticks.map((tick) => {
            const at = layers[0]!.points[tick]!.x / WIDTH;
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

      {showLegend ? (
        <ul
          data-slot="area-chart-legend"
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
        >
          {layers.map((layer, at) => (
            <li key={at} data-slot="area-chart-legend-item" className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: layer.color }}
              />
              <span className="text-muted-foreground">{layer.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export { AreaChart, type AreaChartProps, type AreaChartSeries };
