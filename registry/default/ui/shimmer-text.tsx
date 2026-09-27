"use client";

import { useMemo, type ComponentProps, type CSSProperties, type Ref } from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

// The band is 40% of the text wide, so a background position of -70% hides
// it past the left edge and 170% past the right.
const BAND = "40% 100%";
const SWEEP_FROM = -70;
const SWEEP_LENGTH = 240;

interface ShimmerTextProps extends ComponentProps<"span"> {
  /** Seconds the light takes to cross the text. */
  duration?: number;
  /** Seconds of rest between passes. */
  pause?: number;
  /** Seconds before the first pass. */
  delay?: number;
  /** Colour of the light. Defaults to the page colour mixed into the text colour. */
  highlight?: string;
}

/**
 * A band of light that sweeps across text now and then, like sun on a
 * brass plate. The text keeps its own colour (set it with a `text-*` class);
 * the light is the page colour by default, so it reads in light and dark
 * themes alike. It is one CSS animation of the background, paused while off
 * screen, and plain text with `prefers-reduced-motion`.
 *
 * @example
 * <ShimmerText className="text-muted-foreground">Charting a course…</ShimmerText>
 */
function ShimmerText({
  duration = 1.8,
  pause = 2,
  delay = 0.8,
  highlight,
  className,
  style,
  ref,
  children,
  ...props
}: ShimmerTextProps) {
  const [observe, inView] = useInView<HTMLSpanElement>({ rootMargin: "100px" });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  // The rest between passes is the band travelling on past the end of the
  // text, so one animation covers both and the timing stays in CSS.
  const cycle = Math.max(duration, 0.01) + Math.max(pause, 0);
  const end = SWEEP_FROM + SWEEP_LENGTH * (cycle / Math.max(duration, 0.01));

  return (
    <span
      ref={mergedRef}
      data-slot="shimmer-text"
      className={cn(
        "motion-safe:animate-shimmer-text inline-block bg-clip-text bg-no-repeat [-webkit-text-fill-color:transparent]",
        "motion-reduce:[-webkit-text-fill-color:currentColor]",
        className
      )}
      style={
        {
          "--shimmer-text-light":
            highlight ?? "color-mix(in oklab, currentColor 25%, var(--background))",
          "--shimmer-text-from": `${SWEEP_FROM}%`,
          "--shimmer-text-to": `${end}%`,
          backgroundColor: "currentColor",
          // A soft, slanted peak of light over the text colour.
          backgroundImage:
            "linear-gradient(105deg, transparent 20%, var(--shimmer-text-light) 50%, transparent 80%)",
          backgroundSize: BAND,
          backgroundPositionX: `${SWEEP_FROM}%`,
          animationDuration: `${cycle}s`,
          animationDelay: `${delay}s`,
          animationPlayState: inView ? undefined : "paused",
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </span>
  );
}

export { ShimmerText, type ShimmerTextProps };
