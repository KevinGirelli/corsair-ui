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
}

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
 * @example
 * <ScrollBackground colors={["#0b1d2a", "#12344d", "#1f5f7a"]} className="text-white">
 *   <section className="min-h-svh">…</section>
 * </ScrollBackground>
 */
function ScrollBackground({
  colors = DEFAULT_COLORS,
  timeline = "view",
  range = "cover",
  className,
  style,
  children,
  ...props
}: ScrollBackgroundProps) {
  const [base, ...rest] = colors;
  const segments = rest.length;
  const animationTimeline =
    timeline === "view" ? "view()" : timeline === "nearest" ? "scroll(nearest)" : "scroll(root)";
  // Layer i fades in over the i-th equal stretch of the timeline.
  const stretch = (index: number) => {
    const start = `${Math.round((index / segments) * 10000) / 100}%`;
    const end = `${Math.round(((index + 1) / segments) * 10000) / 100}%`;
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
