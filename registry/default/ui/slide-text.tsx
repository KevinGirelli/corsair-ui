"use client";

import {
  Fragment,
  useMemo,
  type AnimationEvent,
  type ComponentProps,
  type CSSProperties,
  type Ref,
} from "react";

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

// One splitter for the module: user-perceived characters, so emoji and
// accents stay whole wherever the runtime can tell them apart.
const characterSplitter =
  typeof Intl === "object" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function graphemes(text: string) {
  if (!characterSplitter) return [...text];
  const pieces: string[] = [];
  for (const { segment } of characterSplitter.segment(text)) pieces.push(segment);
  return pieces;
}

type SlideTextTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";

interface SlideTextProps extends Omit<ComponentProps<"p">, "children" | "onAnimationEnd"> {
  /** Plain text. With `split="lines"`, lines are separated by "\n". */
  children: string;
  as?: SlideTextTag;
  /** What rises on its own: each word, each character or each line. */
  split?: "words" | "characters" | "lines";
  /** Where the wave starts. */
  from?: "first" | "last" | "center";
  /** "load" plays on first paint with CSS alone; "in-view" when the text scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: play the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds the text below its line, `true` plays it. */
  play?: boolean;
  /** Wait before the first piece, in ms. */
  delay?: number;
  /** Time between pieces, in ms. */
  stagger?: number;
  /** How long each piece takes, in ms. */
  duration?: number;
  /** Called once the last piece is in place. */
  onAnimationComplete?: () => void;
}

/**
 * Text that rises into place from just below its own line, piece by piece,
 * each one masked so it seems to surface through the baseline. The mask
 * leaves room for descenders. Screen readers get the text in one piece, and
 * with `prefers-reduced-motion` it is shown as is.
 *
 * @example
 * <SlideText as="h2" split="characters" from="center">All hands on deck</SlideText>
 */
function SlideText({
  children,
  as: Tag = "p",
  split = "words",
  from = "first",
  trigger = "load",
  once = true,
  play,
  delay = 0,
  stagger = 80,
  duration = 650,
  onAnimationComplete,
  className,
  ref,
  ...props
}: SlideTextProps) {
  const [observe, phase] = useEntrance<HTMLElement>({ trigger, once, play });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  // Masks hold words or lines; each holds the pieces that rise inside it.
  const masks = useMemo(() => {
    let next = 0;
    const units =
      split === "lines"
        ? children.split("\n").map((line) => line.trim())
        : children.trim().split(/\s+/);
    return units.filter(Boolean).map((unit) =>
      (split === "characters" ? graphemes(unit) : [unit]).map((text) => ({
        text,
        index: next++,
      }))
    );
  }, [children, split]);
  const count = masks.reduce((sum, mask) => sum + mask.length, 0);

  const order = (index: number) => {
    if (from === "last") return count - 1 - index;
    if (from === "center") return Math.abs(Math.floor((count - 1) / 2) - index);
    return index;
  };

  const pieceStyle = (index: number): CSSProperties =>
    phase === "static"
      ? {}
      : {
          animationDelay: `${delay + order(index) * stagger}ms`,
          animationDuration: `${duration}ms`,
          animationPlayState: phase === "armed" ? "paused" : undefined,
        };

  // The piece that moves last: the far end of the wave.
  const last = from === "last" ? 0 : Math.max(count - 1, 0);
  const handleAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).dataset.last !== undefined) onAnimationComplete?.();
  };

  return (
    <Tag
      ref={mergedRef as Ref<never>}
      data-slot="slide-text"
      data-state={phase}
      className={cn(split === "lines" && "flex flex-col", className)}
      onAnimationEnd={handleAnimationEnd}
      {...props}
    >
      <span className="sr-only">{children}</span>
      {masks.map((mask, maskIndex) => (
        <Fragment key={maskIndex}>
          {maskIndex > 0 && split !== "lines" ? " " : null}
          {/* Padding lets descenders show; the negative margin keeps the line height. */}
          <span
            aria-hidden="true"
            className={cn(
              "-mb-[0.15em] inline-block overflow-clip pb-[0.15em] align-top",
              split !== "lines" && "whitespace-nowrap"
            )}
          >
            {mask.map(({ text, index }) => (
              <span
                key={index}
                data-slot="slide-text-piece"
                data-last={index === last ? "" : undefined}
                className={cn(
                  "inline-block",
                  phase !== "static" && "motion-safe:animate-slide-text"
                )}
                style={pieceStyle(index)}
              >
                {text}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}

export { SlideText, type SlideTextProps };
