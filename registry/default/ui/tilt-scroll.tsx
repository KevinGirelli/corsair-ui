import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/registry/default/lib/utils";

// Literal classes, so Tailwind finds them in the source.
const FLAT_BELOW = {
  sm: "max-sm:!animate-none",
  md: "max-md:!animate-none",
  lg: "max-lg:!animate-none",
} as const;

const DEFAULT_RANGE = {
  // From the first pixel entering until it has covered 40% of its crossing.
  view: "entry 0% cover 40%",
  // A hero is already on screen at load: straighten over the first 60vh of page scroll.
  root: "0px 60vh",
} as const;

interface TiltScrollProps extends ComponentProps<"div"> {
  /** Apply the tilt to the single child element instead of wrapping it in a div. */
  asChild?: boolean;
  /** How far it leans back at the start, in degrees around the horizontal axis. */
  angle?: number;
  /** How large it starts, as a fraction of its size. */
  scale?: number;
  /** Distance to the viewer for the 3D effect, in px. Smaller is more dramatic. */
  perspective?: number;
  /**
   * What drives it: "view" is the element crossing the viewport, "root" the
   * page's scroll from the top, for a hero that is in view at load.
   */
  timeline?: "view" | "root";
  /**
   * The CSS `animation-range` the straightening spans. Defaults to
   * "entry 0% cover 40%" for "view" and "0px 60vh" for "root".
   */
  range?: string;
  /** Below this breakpoint it stays flat, by CSS alone. */
  flatBelow?: keyof typeof FLAT_BELOW | false;
}

/**
 * Starts content tilted back in perspective, slightly smaller, and
 * straightens it as you scroll: the "container scroll" hero where a product
 * screenshot rises to face the reader. It runs on CSS scroll-driven
 * animations, so there is no JavaScript and no scroll listener, and it works
 * in server components. Browsers without scroll timelines, `prefers-reduced-motion`
 * and viewports below `flatBelow` show it flat, its finished state.
 *
 * It tilts from the top edge (`origin-top`); pass another `origin-*` class to
 * change that. It follows the nearest scroll container with
 * `timeline="view"`, and `overflow: hidden` makes one that never scrolls:
 * clip a wrapper with `overflow-clip` instead.
 *
 * @example
 * <TiltScroll timeline="root" flatBelow="md" className="mx-auto max-w-5xl">
 *   <BrowserFrame url="app.example.com">
 *     <img src="/dashboard.png" alt="The dashboard" />
 *   </BrowserFrame>
 * </TiltScroll>
 */
function TiltScroll({
  asChild = false,
  angle = 20,
  scale = 0.9,
  perspective = 1200,
  timeline = "view",
  range,
  flatBelow = false,
  className,
  style,
  ...props
}: TiltScrollProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="tilt-scroll"
      data-timeline={timeline}
      className={cn(
        "supports-[animation-timeline:view()]:animate-tilt-scroll origin-top motion-reduce:!animate-none",
        flatBelow ? FLAT_BELOW[flatBelow] : undefined,
        className
      )}
      style={
        {
          "--tilt-scroll-angle": `${angle}deg`,
          "--tilt-scroll-scale": scale,
          "--tilt-scroll-perspective": `${perspective}px`,
          // After the utility's shorthand, which would reset them.
          animationTimeline: timeline === "root" ? "scroll(root)" : "view()",
          animationRange: range ?? DEFAULT_RANGE[timeline],
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { TiltScroll, type TiltScrollProps };
