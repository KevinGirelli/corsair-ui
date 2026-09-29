"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { useEntrance } from "@/registry/default/hooks/use-entrance";
import { cn } from "@/registry/default/lib/utils";

// Size of the drawing until the browser has measured the plot, in px.
const WIDTH = 600;
const HEIGHT = 200;
// Height of one bar's row in the horizontal layout, in px.
const ROW = 32;
// Room kept at the end of the bars for `showValues`, in px.
const VALUE_ROOM = { vertical: 20, horizontal: 56 };
const EASE = "cubic-bezier(0.22, 0.9, 0.3, 1)";
const GROW = "cubic-bezier(0.22, 1, 0.36, 1)";

type BarEnd = "top" | "bottom" | "left" | "right";

const n = (value: number) => Math.round(value * 100) / 100;

/** A rectangle with its two corners at `end` rounded by `radius`. */
function barPath(x: number, y: number, width: number, height: number, radius: number, end: BarEnd) {
  if (width <= 0 || height <= 0) return "";
  const along = end === "top" || end === "bottom";
  const r = Math.max(0, Math.min(radius, along ? width / 2 : height / 2, along ? height : width));
  const [x0, y0, x1, y1] = [n(x), n(y), n(x + width), n(y + height)];
  const arc = (toX: number, toY: number) => `A${n(r)} ${n(r)} 0 0 1 ${n(toX)} ${n(toY)}`;
  switch (end) {
    case "top":
      return `M${x0} ${y1} L${x0} ${n(y + r)} ${arc(x + r, y)} L${n(x + width - r)} ${y0} ${arc(x + width, y + r)} L${x1} ${y1} Z`;
    case "bottom":
      return `M${x1} ${y0} L${x1} ${n(y + height - r)} ${arc(x + width - r, y + height)} L${n(x + r)} ${y1} ${arc(x, y + height - r)} L${x0} ${y0} Z`;
    case "right":
      return `M${x0} ${y0} L${n(x + width - r)} ${y0} ${arc(x + width, y + r)} L${x1} ${n(y + height - r)} ${arc(x + width - r, y + height)} L${x0} ${y1} Z`;
    case "left":
      return `M${x1} ${y1} L${n(x + r)} ${y1} ${arc(x, y + height - r)} L${x0} ${n(y + r)} ${arc(x + r, y)} L${x1} ${y0} Z`;
  }
}

interface BarChartProps extends Omit<ComponentProps<"div">, "children"> {
  /** The values to plot, in order. Negative values go below (or left of) a zero line. */
  data: number[];
  /** A label per value, shown in the tooltip and along the category axis. */
  labels?: string[];
  /** Name of the series, shown in the tooltip and used as the accessible name. */
  name?: string;
  /** Bar colour; any CSS colour. Defaults to the primary colour. */
  color?: string;
  /** "vertical" bars rise from the bottom; "horizontal" bars run from the left, one per row. */
  orientation?: "vertical" | "horizontal";
  /** Radius of the corners at the end of each bar, in px. */
  radius?: number;
  /** Write each value at the end of its bar. */
  showValues?: boolean;
  /**
   * Locale and options for the numbers, as in `Intl.NumberFormat`. Both can
   * be passed from a server component; a fixed default keeps the server and
   * the browser in agreement.
   */
  locale?: string;
  numberFormat?: Intl.NumberFormatOptions;
  /** Formats the value in the tooltip and on the bars; overrides `locale` and `numberFormat`. */
  formatValue?: (value: number, index: number) => ReactNode;
  /** What screen readers hear for a bar. Defaults to its label and value. */
  formatValueText?: (value: number, index: number) => string;
  /** The bar selected at first. Defaults to the last one. */
  defaultIndex?: number;
  /** Called when the selected bar changes, by pointer or keyboard. */
  onIndexChange?: (index: number) => void;
  /** Show the labels along the category axis: under the bars, or beside them when horizontal. Needs `labels`. */
  showXAxis?: boolean;
  /**
   * Vertical only: the most axis labels to show, evenly spaced and ending on
   * the latest bar; narrow charts show fewer. Horizontal charts label every row.
   */
  tickCount?: number;
  /** Grow the bars from the zero line the first time they come into view, and glide the tooltip. */
  animated?: boolean;
}

/**
 * A bar chart for one series, vertical or horizontal. Hovering highlights
 * the nearest bar, dims the others and shows its value in a tooltip. It is a
 * slider over the bars for keyboards and screen readers: arrow keys, Page
 * Up / Page Down, Home and End move between bars and each one is announced
 * with its label and value, while the drawing itself is hidden from
 * assistive technology. Bars grow from the zero line the first time they
 * scroll into view; with `prefers-reduced-motion` they are simply shown. No
 * chart library: one SVG, sized to its container.
 *
 * @example
 * <BarChart
 *   name="Visitors"
 *   data={[120, 180, 150, 240, 220, 300]}
 *   labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
 * />
 */
function BarChart({
  data,
  labels,
  name,
  color = "var(--primary)",
  orientation = "vertical",
  radius = 4,
  showValues = false,
  locale = "en-US",
  numberFormat,
  formatValue,
  formatValueText,
  defaultIndex,
  onIndexChange,
  showXAxis = true,
  tickCount = 12,
  animated = true,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: BarChartProps) {
  const vertical = orientation === "vertical";
  const [plot, setPlot] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [active, setActive] = useState(() => defaultIndex ?? Math.max(0, data.length - 1));
  const [engaged, setEngaged] = useState(false);
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
      const box = entry?.contentRect;
      if (box?.width && box.height) setSize({ width: box.width, height: box.height });
    });
    observer.observe(plot);
    return () => observer.disconnect();
  }, [plot]);

  const width = size?.width ?? WIDTH;
  const height = size?.height ?? (vertical ? HEIGHT : ROW * Math.max(1, data.length));

  const bars = useMemo(() => {
    if (data.length === 0) return [];
    const min = Math.min(0, ...data);
    const max = Math.max(0, ...data);
    const range = max - min || 1;
    const room = showValues ? VALUE_ROOM[orientation] : vertical ? 4 : 0;
    const length = vertical ? height : width;
    const high = max > 0 || min === 0 ? room : 0;
    const low = min < 0 ? room : 0;
    // Distance from the low end of the value axis.
    const at = (value: number) => low + ((value - min) / range) * (length - low - high);
    const band = (vertical ? width : height) / data.length;
    const thickness = band * (vertical ? 0.7 : 0.66);
    const zero = vertical ? height - at(0) : at(0);
    return data.map((value, index) => {
      const start = index * band + (band - thickness) / 2;
      const end = vertical ? height - at(value) : at(value);
      const negative = value < 0;
      const from = Math.min(zero, end);
      const span = Math.abs(end - zero);
      return {
        value,
        negative,
        zero,
        // The centre of the bar across, and its tip along the value axis.
        center: start + thickness / 2,
        tip: end,
        thickness,
        d: vertical
          ? barPath(start, from, thickness, span, radius, negative ? "bottom" : "top")
          : barPath(from, start, span, thickness, radius, negative ? "left" : "right"),
      };
    });
  }, [data, orientation, vertical, width, height, radius, showValues]);

  const numbers = useMemo(
    () => new Intl.NumberFormat(locale, numberFormat),
    [locale, numberFormat]
  );

  const ticks = useMemo(() => {
    if (!showXAxis || !labels?.length || bars.length === 0) return [];
    if (!vertical) return Array.from({ length: bars.length }, (_, index) => index);
    // At most one label per 56px, so they never run into each other.
    const most = Math.min(tickCount, Math.max(2, Math.floor(width / 56)), bars.length);
    if (most < 1) return [];
    const last = bars.length - 1;
    const step = Math.floor(last / most) + 1;
    return Array.from(
      { length: Math.floor(last / step) + 1 },
      (_, tick) => (last % step) + tick * step
    );
  }, [showXAxis, labels, bars.length, vertical, tickCount, width]);

  if (bars.length === 0) return null;

  const index = Math.min(Math.max(active, 0), bars.length - 1);
  const bar = bars[index]!;
  const select = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), bars.length - 1);
    if (clamped === index) return;
    setActive(clamped);
    onIndexChange?.(clamped);
  };

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const across = vertical ? box.width : box.height;
    if (across === 0) return;
    const offset = vertical ? event.clientX - box.left : event.clientY - box.top;
    setEngaged(true);
    select(Math.floor((offset / across) * bars.length));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const page = Math.max(1, Math.round(bars.length / 10));
    // Horizontal charts list their bars top to bottom, so Down moves on.
    const back = vertical ? ["ArrowLeft", "ArrowDown"] : ["ArrowLeft", "ArrowUp"];
    const forward = vertical ? ["ArrowRight", "ArrowUp"] : ["ArrowRight", "ArrowDown"];
    const moves: Record<string, number> = {
      [back[0]!]: index - 1,
      [back[1]!]: index - 1,
      [forward[0]!]: index + 1,
      [forward[1]!]: index + 1,
      PageDown: index - page,
      PageUp: index + page,
      Home: 0,
      End: bars.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setEngaged(true);
    select(next);
  };

  const format = (value: number, at: number) =>
    formatValue ? formatValue(value, at) : numbers.format(value);
  const label = labels?.[index];
  const valueText =
    formatValueText?.(bar.value, index) ??
    `${label ? `${label}: ` : ""}${numbers.format(bar.value)}`;

  // The tooltip hangs off the side of the active bar's tip, flipping past halfway.
  const tipX = vertical ? bar.center : bar.tip;
  const tipY = vertical ? bar.tip : bar.center;
  const flip = tipX > width / 2;
  const anchorX = vertical ? tipX + (flip ? -1 : 1) * (bar.thickness / 2) : tipX;
  const glide = animated ? `transform 220ms ${EASE}` : undefined;
  const stagger = Math.min(60, 480 / bars.length);

  return (
    <div
      data-slot="bar-chart"
      data-orientation={orientation}
      className={cn(
        "w-full select-none",
        !vertical && showXAxis && ticks.length > 0 && "grid grid-cols-[auto_1fr] gap-x-3",
        className
      )}
      style={{ "--bar-chart-color": color, ...style } as CSSProperties}
      {...props}
    >
      {!vertical && ticks.length > 0 ? (
        <div aria-hidden="true" data-slot="bar-chart-axis" className="flex flex-col">
          {bars.map((_, at) => (
            <span
              key={at}
              className="text-muted-foreground flex flex-1 items-center justify-end text-xs whitespace-nowrap"
            >
              {labels?.[at]}
            </span>
          ))}
        </div>
      ) : null}

      <div
        ref={plotRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel ?? name ?? "Chart"}
        aria-valuemin={1}
        aria-valuemax={bars.length}
        aria-valuenow={index + 1}
        aria-valuetext={valueText}
        aria-orientation={vertical ? "horizontal" : "vertical"}
        data-slot="bar-chart-plot"
        data-state={entrance}
        data-engaged={engaged ? "" : undefined}
        className={cn(
          "focus-visible:ring-ring/50 relative w-full rounded-md outline-none focus-visible:ring-[3px]",
          vertical ? "aspect-[3/1] touch-pan-y" : "touch-pan-x"
        )}
        style={vertical ? undefined : { height: ROW * bars.length }}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setEngaged(false)}
        onFocus={() => setEngaged(true)}
        onBlur={() => setEngaged(false)}
        onKeyDown={onKeyDown}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${n(width)} ${n(height)}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {bars.map((item, at) => (
            <path
              key={at}
              data-slot="bar-chart-bar"
              data-active={at === index ? "" : undefined}
              data-dimmed={engaged && at !== index ? "" : undefined}
              data-negative={item.negative ? "" : undefined}
              d={item.d}
              fill="var(--bar-chart-color)"
              className="transition-opacity data-[dimmed]:opacity-40 motion-reduce:![transform:none] motion-reduce:!transition-none"
              style={{
                transformBox: "view-box",
                transformOrigin: vertical ? `0 ${n(item.zero)}px` : `${n(item.zero)}px 0`,
                transform:
                  entrance === "armed" ? (vertical ? "scale(1, 0)" : "scale(0, 1)") : undefined,
                transition:
                  entrance === "play"
                    ? `transform 600ms ${GROW} ${n(at * stagger)}ms, opacity 150ms ease`
                    : undefined,
              }}
            />
          ))}
          <line
            data-slot="bar-chart-zero"
            x1={vertical ? 0 : n(bar.zero)}
            x2={vertical ? n(width) : n(bar.zero)}
            y1={vertical ? n(bar.zero) : 0}
            y2={vertical ? n(bar.zero) : n(height)}
            stroke="var(--border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {showValues
          ? bars.map((item, at) => (
              <span
                key={at}
                aria-hidden="true"
                data-slot="bar-chart-value"
                className={cn(
                  "text-muted-foreground pointer-events-none absolute font-mono text-[11px] leading-none whitespace-nowrap tabular-nums transition-opacity motion-reduce:!opacity-100 motion-reduce:!transition-none",
                  entrance === "armed" && "opacity-0"
                )}
                style={{
                  left: `${((vertical ? item.center : item.tip) / width) * 100}%`,
                  top: `${((vertical ? item.tip : item.center) / height) * 100}%`,
                  transform: vertical
                    ? `translate(-50%, ${item.negative ? "4px" : "calc(-100% - 4px)"})`
                    : `translate(${item.negative ? "calc(-100% - 4px)" : "4px"}, -50%)`,
                  transitionDuration: entrance === "play" ? "300ms" : undefined,
                  transitionDelay: entrance === "play" ? `${n(400 + at * stagger)}ms` : undefined,
                }}
              >
                {format(item.value, at)}
              </span>
            ))
          : null}

        {/* A zero-size anchor rides on the bar's tip; the card hangs off its side. */}
        <div
          aria-hidden="true"
          data-slot="bar-chart-tooltip-anchor"
          className="pointer-events-none absolute top-0 left-0 z-10 size-0 motion-reduce:!transition-none"
          style={{ transform: `translate3d(${n(anchorX)}px, ${n(tipY)}px, 0)`, transition: glide }}
        >
          <div
            data-slot="bar-chart-tooltip"
            data-state={engaged ? "open" : "closed"}
            className={cn(
              "bg-popover text-popover-foreground absolute top-0 grid w-max min-w-32 -translate-y-1/2 gap-1.5 rounded-md border px-2.5 py-1.5 text-xs shadow-md transition-opacity data-[state=closed]:opacity-0 motion-reduce:transition-none",
              flip ? "right-2" : "left-2"
            )}
          >
            {label ? <div className="font-medium">{label}</div> : null}
            <div className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[3px] bg-[color:var(--bar-chart-color)]" />
              {name ? <span className="text-muted-foreground">{name}</span> : null}
              <span className="ml-auto font-mono font-medium tabular-nums">
                {format(bar.value, index)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {vertical && ticks.length > 0 ? (
        <div aria-hidden="true" data-slot="bar-chart-axis" className="relative mt-2 h-5">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="text-muted-foreground absolute top-0 -translate-x-1/2 text-[11px] leading-none whitespace-nowrap tabular-nums"
              style={{ left: `${(bars[tick]!.center / width) * 100}%` }}
            >
              {labels?.[tick]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { BarChart, type BarChartProps };
