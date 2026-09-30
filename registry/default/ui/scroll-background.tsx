import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/registry/default/lib/utils";

interface ScrollBackgroundProps extends ComponentProps<"div"> {
  /**
   * The colours it moves through, in order, as any CSS colours. The first
   * is the background before any scrolling, and where scroll timelines are
   * not supported. Every one of them has to contrast with the text on it.
   */
  colors?: string[];
  /**
   * What drives it: "view" is the element crossing the viewport, "root" the
   * page's scroll, "nearest" the closest scrolling ancestor.
   */
  timeline?: "view" | "root" | "nearest";
  /**
   * With `timeline="view"`, which part of the crossing the colours spread
   * over: "cover" from the first pixel entering to the last leaving,
   * "contain" while the element fills the viewport (or fits inside it).
   */
  range?: "cover" | "contain";
  /**
   * Where each colour is reached, in percent of the timeline, one per
   * colour and in increasing order: `[0, 5, 14, 65, 100]`. The blend into a
   * colour runs from the stop before it to its own. Without it the colours
   * are spread evenly.
   */
  stops?: number[];
}

/** Evenly spread stops from 0 to 100, or the given ones clamped and kept in order. */
function resolveStops(count: number, stops?: number[]) {
  if (!stops || stops.length !== count) {
    return Array.from({ length: count }, (_, index) =>
      count > 1 ? (index / (count - 1)) * 100 : 0
    );
  }
  let floor = 0;
  return stops.map((stop) => {
    floor = Math.min(Math.max(stop, floor), 100);
    return floor;
  });
}

const percent = (value: number) => `${Math.round(value * 100) / 100}%`;

const DEFAULT_COLORS = [
  "var(--background)",
  "var(--muted)",
  "color-mix(in srgb, var(--primary) 12%, var(--background))",
];

/**
 * A background that shifts from one colour to the next as you scroll. It is
 * CSS scroll-driven animation: each colour is a layer that fades in over its
 * own stretch of the scroll, so neighbouring colours blend evenly, with no
 * JavaScript and no scroll listener. Works in server components. Browsers
 * without scroll timelines keep the first colour. The layers are decorative
 * and hidden from screen readers. Like `scroll-progress`, it keeps following
 * the scroll with `prefers-reduced-motion`, since nothing moves.
 *
 * It follows the nearest scroll container, and `overflow: hidden` makes one
 * that never scrolls. Clip with `overflow: clip` (`overflow-clip`) instead.
 *
 * For a background behind the whole page, give it no children and fix it in
 * place: `<ScrollBackground timeline="root" className="fixed inset-0 -z-10" />`.
 * A colour can come back later in the list: each layer covers the ones before.
 *
 * @example
 * <ScrollBackground colors={["#0b1d2a", "#12344d", "#1f5f7a"]} className="text-white">
 *   <section className="min-h-svh">…</section>
 * </ScrollBackground>
 */
function ScrollBackground({
  colors = DEFAULT_COLORS,
  timeline = "view",
  range = "cover",
  stops,
  className,
  style,
  children,
  ...props
}: ScrollBackgroundProps) {
  const [base, ...rest] = colors;
  const reached = resolveStops(colors.length, stops);
  const animationTimeline =
    timeline === "view" ? "view()" : timeline === "nearest" ? "scroll(nearest)" : "scroll(root)";
  // Layer i (colour i + 1) fades in between the stop before its colour and its own.
  const stretch = (index: number) => {
    const start = percent(reached[index]!);
    const end = percent(reached[index + 1]!);
    return timeline === "view" ? `${range} ${start} ${range} ${end}` : `${start} ${end}`;
  };

  return (
    <div
      data-slot="scroll-background"
      data-timeline={timeline}
      className={cn("relative isolate", className)}
      style={{ backgroundColor: base, ...style }}
      {...props}
    >
      <div
        aria-hidden="true"
        data-slot="scroll-background-layers"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        {rest.map((color, index) => (
          <div
            key={index}
            data-slot="scroll-background-layer"
            className="supports-[animation-timeline:scroll()]:animate-scroll-background absolute inset-0 opacity-0"
            style={
              {
                backgroundColor: color,
                // After the utility's shorthand, which would reset them.
                animationTimeline,
                animationRange: stretch(index),
              } as CSSProperties
            }
          />
        ))}
      </div>
      {children}
    </div>
  );
}

export { ScrollBackground, type ScrollBackgroundProps };
