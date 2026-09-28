"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type CSSProperties,
  type Ref,
} from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

interface MarqueeProps extends ComponentProps<"div"> {
  /** Which way the content travels. */
  direction?: "left" | "right" | "up" | "down";
  /** Seconds for the content to travel its own length. */
  duration?: number;
  /** Space between items, and between the end of the content and its next copy. Any CSS length. */
  gap?: string;
  /** Hold still while the pointer is over it. */
  pauseOnHover?: boolean;
  /** Fade the content out at both edges. */
  fade?: boolean;
  /** How much of each edge the fade covers, in percent. */
  fadeAmount?: number;
  /**
   * Copies of the content in the loop. Two are enough when the content is
   * at least as long as the marquee; raise it for short content in a wide one.
   */
  repeat?: number;
  /**
   * Names the marquee for screen readers when `prefers-reduced-motion` turns
   * it into a box you scroll by hand: it then becomes a focusable region, so
   * keyboard users can scroll it too.
   */
  label?: string;
}

/**
 * Content that scrolls in an endless loop: logos, quotes, ports of call.
 * It is one CSS animation of a transform. The copies that make the loop
 * seamless are hidden from screen readers and cannot take focus; the loop
 * stops while a link inside has keyboard focus, and pauses off screen.
 * With `prefers-reduced-motion` it holds still and scrolls by hand instead.
 *
 * @example
 * <Marquee pauseOnHover gap="3rem">
 *   <span>Salvador</span>
 *   <span>Cartagena</span>
 *   <span>Havana</span>
 * </Marquee>
 */
function Marquee({
  direction = "left",
  duration = 20,
  gap = "1rem",
  pauseOnHover = false,
  fade = true,
  fadeAmount = 10,
  repeat = 2,
  label = "Scrolling content",
  className,
  style,
  ref,
  children,
  ...props
}: MarqueeProps) {
  const [observe, inView] = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const root = useRef<HTMLDivElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, observe, root), [ref, observe]);
  // A scroll box has to be reachable from the keyboard. Set on the element, and
  // only while it is one, so the moving marquee stays out of the tab order.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    if (reduced) element.tabIndex = 0;
    else element.removeAttribute("tabindex");
  }, [reduced]);

  const vertical = direction === "up" || direction === "down";
  const copies = Math.max(2, Math.floor(repeat));
  const edge = Math.min(Math.max(fadeAmount, 0), 50);
  const mask = fade
    ? `linear-gradient(to ${vertical ? "bottom" : "right"}, transparent, #000 ${edge}%, #000 ${100 - edge}%, transparent)`
    : undefined;

  return (
    <div
      ref={mergedRef}
      data-slot="marquee"
      data-direction={direction}
      // Still, it scrolls by hand: a named region, focusable (set below) for the keyboard.
      role={reduced ? "region" : undefined}
      aria-label={reduced ? label : undefined}
      className={cn(
        "group/marquee flex overflow-hidden motion-reduce:overflow-auto",
        vertical && "flex-col",
        className
      )}
      style={
        {
          "--marquee-gap": gap,
          "--marquee-copies": copies,
          maskImage: mask,
          WebkitMaskImage: mask,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <div
        data-slot="marquee-track"
        className={cn(
          "flex w-max shrink-0 group-focus-within/marquee:[animation-play-state:paused]",
          vertical
            ? "motion-safe:animate-marquee-y h-max w-full flex-col"
            : "motion-safe:animate-marquee-x",
          pauseOnHover && "group-hover/marquee:[animation-play-state:paused]"
        )}
        style={{
          // Each loop moves the track by one copy of the content.
          animationDuration: `${duration}s`,
          animationDirection: direction === "right" || direction === "down" ? "reverse" : undefined,
          // Inline only when off screen, so hover and focus can still pause it.
          animationPlayState: inView ? undefined : "paused",
        }}
      >
        {Array.from({ length: copies }, (_, copy) => (
          <div
            key={copy}
            data-slot="marquee-group"
            aria-hidden={copy > 0 ? true : undefined}
            inert={copy > 0 ? true : undefined}
            className={cn(
              "flex shrink-0 gap-[var(--marquee-gap)]",
              // Trailing space the size of the gap, so every copy is the same length and the loop has no seam.
              vertical
                ? "flex-col pb-[var(--marquee-gap)]"
                : "items-center pr-[var(--marquee-gap)]",
              copy > 0 && "motion-reduce:hidden"
            )}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}

export { Marquee, type MarqueeProps };
