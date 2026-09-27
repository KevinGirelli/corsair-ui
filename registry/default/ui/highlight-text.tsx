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

interface HighlightTextProps extends ComponentProps<"span"> {
  /** The side the marker slides in from. */
  from?: keyof typeof FROM;
  /**
   * Invert the text where the marker covers it, with a difference blend.
   * Turn it off for a translucent marker (`markerClassName="bg-yellow-300/50"`)
   * that leaves the text colour alone.
   */
  inverse?: boolean;
  /** Classes for the marker, e.g. its colour. Defaults to the foreground colour. */
  markerClassName?: string;
  /** "load" plays on first paint with CSS alone; "in-view" when the text scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: play the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds the marker out of sight, `true` slides it in. */
  play?: boolean;
  /** Wait before the marker moves, in ms. */
  delay?: number;
  /** How long the marker takes, in ms. */
  duration?: number;
}

/**
 * A marker stroke that slides in behind a word or phrase. By default it is
 * the foreground colour and the text inverts where it passes, so it works
 * in light and dark themes without picking colours. Use it inline; it keeps
 * the baseline of the surrounding text. With `prefers-reduced-motion` the
 * marker is simply there.
 *
 * @example
 * <p>Every item is <HighlightText>yours to edit</HighlightText>.</p>
 */
function HighlightText({
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

  return (
    <span
      ref={mergedRef}
      data-slot="highlight-text"
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
