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

type FlipTextTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";

interface FlipTextProps extends Omit<ComponentProps<"p">, "children" | "onAnimationEnd"> {
  /** Plain text. */
  children: string;
  as?: FlipTextTag;
  /** What turns on its own: each character or each word. */
  split?: "characters" | "words";
  /** Where the wave starts. */
  from?: "first" | "last" | "center";
  /**
   * Where each piece starts, in degrees around its horizontal axis.
   * Negative values tip the top away from the reader, positive towards them.
   */
  angle?: number;
  /** Distance to the viewer, in px: lower values give a deeper 3D turn. */
  perspective?: number;
  /**
   * The axis each piece turns around. "center" rolls it like a drum,
   * "bottom" stands it up from its baseline, "top" lets it drop down.
   */
  origin?: "center" | "bottom" | "top";
  /** "load" plays on first paint with CSS alone; "in-view" when the text scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: play the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds the text turned away, `true` plays it. */
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

// Behind the face for "center", so the piece rolls like a drum instead of spinning on the spot.
const ORIGINS = {
  center: "50% 50% -0.5em",
  bottom: "50% 100%",
  top: "50% 0%",
} as const;

/**
 * Kinetic type in 3D: characters (or words) turn into place around their
 * horizontal axis, one after another, with their own perspective. It is one
 * CSS animation of `rotateX` per piece, so it plays on first paint without
 * JavaScript. Screen readers get the text in one piece, and with
 * `prefers-reduced-motion` it is shown as is.
 *
 * @example
 * <FlipText as="h2" from="center">Hoist the colours</FlipText>
 */
function FlipText({
  children,
  as: Tag = "p",
  split = "characters",
  from = "first",
  angle = -90,
  perspective = 600,
  origin = "center",
  trigger = "load",
  once = true,
  play,
  delay = 0,
  stagger = 40,
  duration = 800,
  onAnimationComplete,
  className,
  style,
  ref,
  ...props
}: FlipTextProps) {
  const [observe, phase] = useEntrance<HTMLElement>({ trigger, once, play });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  // Words keep their characters on one line; each holds the pieces that turn.
  const words = useMemo(() => {
    let next = 0;
    return children
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        (split === "characters" ? graphemes(word) : [word]).map((text) => ({
          text,
          index: next++,
        }))
      );
  }, [children, split]);
  const count = words.reduce((sum, word) => sum + word.length, 0);

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
      data-slot="flip-text"
      data-state={phase}
      className={className}
      style={
        {
          "--flip-text-angle": `${angle}deg`,
          "--flip-text-perspective": `${perspective}px`,
          ...style,
        } as CSSProperties
      }
      onAnimationEnd={handleAnimationEnd}
      {...props}
    >
      <span className="sr-only">{children}</span>
      {words.map((word, wordIndex) => (
        <Fragment key={wordIndex}>
          {wordIndex > 0 ? " " : null}
          <span aria-hidden="true" className="inline-block whitespace-nowrap">
            {word.map(({ text, index }) => (
              <span
                key={index}
                data-slot="flip-text-piece"
                data-last={index === last ? "" : undefined}
                className={cn(
                  "inline-block [backface-visibility:hidden]",
                  phase !== "static" && "motion-safe:animate-flip-text"
                )}
                style={{ transformOrigin: ORIGINS[origin], ...pieceStyle(index) }}
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

export { FlipText, type FlipTextProps };
