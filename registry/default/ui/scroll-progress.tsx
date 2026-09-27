import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/registry/default/lib/utils";

interface ScrollProgressProps extends Omit<ComponentProps<"div">, "children"> {
  /** Which edge of the viewport the bar sits on. */
  position?: "top" | "bottom";
  /**
   * What it measures: "root" is the page, "nearest" the closest scrolling
   * ancestor (give the bar `sticky` or `absolute` positioning inside it).
   */
  timeline?: "root" | "nearest";
}

/**
 * A reading progress bar that fills as the page scrolls. It is a CSS
 * scroll-driven animation of `scaleX`, so there is no JavaScript and no
 * scroll listener, and it works in server components. Browsers without
 * scroll timelines show nothing rather than a bar stuck at zero. It is
 * decorative and hidden from screen readers. It keeps running with
 * `prefers-reduced-motion`, since it follows the scroll position rather
 * than adding motion of its own.
 *
 * @example
 * <ScrollProgress className="bg-foreground h-1" />
 */
function ScrollProgress({
  position = "top",
  timeline = "root",
  className,
  style,
  ...props
}: ScrollProgressProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="scroll-progress"
      data-position={position}
      className={cn(
        "bg-primary pointer-events-none fixed inset-x-0 z-50 h-[3px] origin-left",
        position === "bottom" ? "bottom-0" : "top-0",
        "supports-[animation-timeline:scroll()]:animate-scroll-progress hidden supports-[animation-timeline:scroll()]:block",
        className
      )}
      style={
        {
          // After the utility's shorthand, which would reset the timeline.
          animationTimeline: timeline === "nearest" ? "scroll(nearest)" : "scroll(root)",
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { ScrollProgress, type ScrollProgressProps };
