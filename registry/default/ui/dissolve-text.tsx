"use client";

import { Fragment, useMemo, type ComponentProps, type CSSProperties, type Ref } from "react";

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

/** Splits into user-perceived characters, so emoji and accents stay whole. */
function graphemes(text: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
}

/**
 * A small seeded generator (mulberry32). The same text always gets the same
 * timings, so the server and the browser agree and hydration stays clean.
 */
function seededRandom(text: string) {
  let seed = 2166136261;
  for (let index = 0; index < text.length; index++) {
    seed = Math.imul(seed ^ text.charCodeAt(index), 16777619);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

type DissolveTextTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";

interface DissolveTextProps extends Omit<ComponentProps<"p">, "children"> {
  /** Plain text. */
  children: string;
  as?: DissolveTextTag;
  /** Whether words or single characters fade in on their own. */
  split?: "words" | "characters";
  /** "load" plays on first paint with CSS alone; "in-view" when the text scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: play the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds the text hidden, `true` plays it. */
  play?: boolean;
  /** Wait before anything appears, in ms. */
  delay?: number;
  /** The window, in ms, over which pieces pick their random start. */
  spread?: number;
  /** How long each piece takes to appear, in ms. */
  duration?: number;
}

/**
 * Text that dissolves in: words (or characters) surface at scattered
 * moments inside a short window, like a chart coming out of the fog. The
 * scatter is seeded by the text, so it is the same on every render and the
 * server agrees with the browser. Screen readers get the text in one
 * piece, and with `prefers-reduced-motion` it is shown as is.
 *
 * @example
 * <DissolveText as="p" split="characters">Fog lifting over the harbour.</DissolveText>
 */
function DissolveText({
  children,
  as: Tag = "p",
  split = "words",
  trigger = "load",
  once = true,
  play,
  delay = 200,
  spread = 230,
  duration = 1200,
  className,
  ref,
  ...props
}: DissolveTextProps) {
  const [observe, phase] = useEntrance<HTMLElement>({ trigger, once, play });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  const words = useMemo(() => {
    const random = seededRandom(`${split}:${children}`);
    return children
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        (split === "characters" ? graphemes(word) : [word]).map((text) => ({
          text,
          // Two draws, so most pieces bunch in the middle of the window.
          wait: (random() * 0.87 + random() * 0.13) * spread,
        }))
      );
  }, [children, split, spread]);

  const pieceStyle = (wait: number): CSSProperties =>
    phase === "static"
      ? {}
      : {
          animationDelay: `${Math.round(delay + wait)}ms`,
          animationDuration: `${duration}ms`,
          animationPlayState: phase === "armed" ? "paused" : undefined,
        };

  return (
    <Tag
      ref={mergedRef as Ref<never>}
      data-slot="dissolve-text"
      data-state={phase}
      className={className}
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {words.map((pieces, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 ? " " : null}
            <span className="inline-block whitespace-nowrap">
              {pieces.map(({ text, wait }, index) => (
                <span
                  key={index}
                  data-slot="dissolve-text-piece"
                  className={cn(
                    "inline-block",
                    phase !== "static" && "motion-safe:animate-dissolve-text"
                  )}
                  style={pieceStyle(wait)}
                >
                  {text}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}

export { DissolveText, type DissolveTextProps };
