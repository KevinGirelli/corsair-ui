"use client";

import { useMemo, type ComponentProps, type CSSProperties, type Ref } from "react";

import { useEntrance, type EntranceTrigger } from "@/registry/default/hooks/use-entrance";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const FROM = {
  left: "translate3d(-101%, 0, 0)",
  right: "translate3d(101%, 0, 0)",
  top: "translate3d(0, -101%, 0)",
  bottom: "translate3d(0, 101%, 0)",
};

// Hand-drawn strokes in a box 100 wide and `height` tall; the svg stretches
// them across the phrase. The inset keeps round caps inside the box.
function scribblePaths(shape: "underline" | "double", height: number, inset: number) {
  const y = (fraction: number) => Math.round((inset + fraction * (height - inset * 2)) * 100) / 100;
  if (shape === "double") {
    return [
      `M1 ${y(0.3)} C 22 ${y(0)}, 48 ${y(0.45)}, 70 ${y(0.2)} S 94 ${y(0.1)}, 99 ${y(0.25)}`,
      `M4 ${y(0.9)} C 28 ${y(0.65)}, 55 ${y(1)}, 78 ${y(0.75)} S 96 ${y(0.7)}, 98 ${y(0.8)}`,
    ];
  }
  return [`M1 ${y(0.7)} C 18 ${y(0.1)}, 32 ${y(1)}, 50 ${y(0.5)} S 82 ${y(0)}, 99 ${y(0.45)}`];
}

interface HighlightTextProps extends ComponentProps<"span"> {
  /**
   * "marker" slides a block of colour in behind the text; "scribble" draws a
   * hand-drawn line under it and leaves the text as it is.
   */
  variant?: "marker" | "scribble";
  /** Scribble: one wavy underline, or two strokes. */
  scribble?: "underline" | "double";
  /** Scribble: width of the line, in px. */
  strokeWidth?: number;
  /** Marker: the side the marker slides in from. */
  from?: keyof typeof FROM;
  /**
   * Invert the text where the marker covers it, with a difference blend.
   * Turn it off for a translucent marker (`markerClassName="bg-yellow-300/50"`)
   * that leaves the text colour alone.
   */
  inverse?: boolean;
  /**
   * Classes for the marker or the scribble, e.g. its colour. The marker
   * defaults to the foreground colour; the scribble to
   * `--highlight-text-color`, else the text colour (`text-primary` changes it).
   */
  markerClassName?: string;
  /** "load" plays on first paint with CSS alone; "in-view" when the text scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: play the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds the marker out of sight, `true` plays it. */
  play?: boolean;
  /** Wait before the marker moves or the line starts, in ms. */
  delay?: number;
  /** How long the marker or the line takes, in ms. */
  duration?: number;
}

/**
 * A marker stroke that slides in behind a word or phrase. By default it is
 * the foreground colour and the text inverts where it passes, so it works
 * in light and dark themes without picking colours. Use it inline; it keeps
 * the baseline of the surrounding text. With `variant="scribble"` a
 * hand-drawn line is drawn under the phrase instead, and the text keeps its
 * colour. Both are decorative; the text reads the same to screen readers.
 * With `prefers-reduced-motion` the marker or line is simply there.
 *
 * @example
 * <p>Every item is <HighlightText>yours to edit</HighlightText>.</p>
 *
 * @example
 * <h2>
 *   Built to <HighlightText variant="scribble" markerClassName="text-primary">last</HighlightText>
 * </h2>
 */
function HighlightText({
  variant = "marker",
  scribble = "underline",
  strokeWidth = 3,
  from = "bottom",
  inverse = true,
  markerClassName,
  trigger = "load",
  once = true,
  play,
  delay = 0,
  duration = 600,
  className,
  style,
  ref,
  children,
  ...props
}: HighlightTextProps) {
  const [observe, phase] = useEntrance<HTMLSpanElement>({ trigger, once, play });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  if (variant === "scribble") {
    const width = Math.max(strokeWidth, 0);
    // The box is sized in px, so the line keeps its width however the phrase stretches it.
    const height = Math.round((scribble === "double" ? 12 : 8) + width * 2);
    const strokes = scribblePaths(scribble, height, width / 2 + 0.5);
    // Two strokes share the time: the second starts as the first ends.
    const share = strokes.length > 1 ? 0.55 : 1;
    return (
      <span
        ref={mergedRef}
        data-slot="highlight-text"
        data-variant="scribble"
        data-state={phase}
        className={cn("relative inline-flex px-[0.15em] align-baseline", className)}
        style={style}
        {...props}
      >
        <svg
          aria-hidden="true"
          data-slot="highlight-text-scribble"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          fill="none"
          stroke="currentColor"
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-[calc(100%-0.2em)] w-full overflow-visible text-[color:var(--highlight-text-color,currentColor)]",
            markerClassName
          )}
          style={{ height: `${height}px` }}
        >
          {strokes.map((d, index) => (
            <path
              key={index}
              d={d}
              pathLength={1}
              className={cn(phase !== "static" && "motion-safe:animate-highlight-text-draw")}
              style={{
                strokeDasharray: "1 2",
                strokeDashoffset: 0,
                ...(phase === "static"
                  ? null
                  : {
                      animationDelay: `${Math.round(delay + index * (1 - share) * duration)}ms`,
                      animationDuration: `${Math.round(share * duration)}ms`,
                      animationPlayState: phase === "armed" ? "paused" : undefined,
                    }),
              }}
            />
          ))}
        </svg>
        <span className="relative">{children}</span>
      </span>
    );
  }

  return (
    <span
      ref={mergedRef}
      data-slot="highlight-text"
      data-variant="marker"
      data-state={phase}
      // inline-flex keeps the text baseline, which an inline-block with clipping would lose.
      className={cn("relative inline-flex overflow-clip px-[0.15em] align-baseline", className)}
      style={style}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="highlight-text-marker"
        className={cn(
          "bg-foreground absolute inset-0",
          phase !== "static" && "motion-safe:animate-highlight-text",
          markerClassName
        )}
        style={
          phase === "static"
            ? undefined
            : ({
                "--highlight-text-from": FROM[from],
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}ms`,
                animationPlayState: phase === "armed" ? "paused" : undefined,
              } as CSSProperties)
        }
      />
      <span className={cn("relative", inverse && "text-white mix-blend-difference")}>
        {children}
      </span>
    </span>
  );
}

export { HighlightText, type HighlightTextProps };
