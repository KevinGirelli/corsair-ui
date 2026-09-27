import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/registry/default/lib/utils";

interface ParallaxProps extends ComponentProps<"div"> {
  /** Move the single child element instead of wrapping it in a div. */
  asChild?: boolean;
  /**
   * How far, in px, the element drifts each way while it crosses the
   * viewport. Positive values lag behind the scroll, negative values run ahead.
   */
  offset?: number;
}

/**
 * Drifts content at a different speed from the page while it scrolls past.
 * It runs on CSS scroll-driven animations, so there is no JavaScript and no
 * scroll listener; browsers without them, and `prefers-reduced-motion`, keep
 * the content still. Works in server components.
 *
 * It follows the nearest scroll container, and `overflow: hidden` makes one
 * that never scrolls, so the content stays put. Clip a wrapper with
 * `overflow: clip` (`overflow-clip`) instead.
 */
function Parallax({ asChild = false, offset = 40, className, style, ...props }: ParallaxProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="parallax"
      className={cn(
        "supports-[animation-timeline:view()]:animate-parallax motion-reduce:!animate-none",
        className
      )}
      style={
        {
          "--parallax-offset": `${offset}px`,
          animationTimeline: "view()",
          animationRange: "cover 0% cover 100%",
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Parallax, type ParallaxProps };
