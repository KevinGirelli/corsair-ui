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

/** Splits into user-perceived characters, so emoji and accents stay whole. */
function graphemes(text: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
}

type BlurTextTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";

interface BlurTextProps extends Omit<ComponentProps<"p">, "children" | "onAnimationEnd"> {
  /** Plain text; every character comes in on its own. */
  children: string;
  as?: BlurTextTag;
  /** "load" plays on first paint with CSS alone; "in-view" when the text scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: play the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds the text hidden, `true` plays it. */
  play?: boolean;
  /** `false` blurs the text back out, last character first. */
  show?: boolean;
  /** Wait before the first character, in ms. */
  delay?: number;
  /** Time between characters, in ms. */
  stagger?: number;
  /** How long each character takes, in ms. */
  duration?: number;
  /** Called when the last character has come in, or gone out. */
  onAnimationComplete?: () => void;
}

/**
 * Text that comes into focus one character at a time: each one rises a
 * little out of a blur. Screen readers get the sentence in one piece, and
 * with `prefers-reduced-motion` it is shown as is. Words never break
 * between characters.
 *
 * @example
 * <BlurText as="h1" className="text-5xl">Land ho.</BlurText>
 */
function BlurText({
  children,
  as: Tag = "p",
  trigger = "load",
  once = true,
  play,
  show = true,
  delay = 0,
  stagger = 20,
  duration = 600,
  onAnimationComplete,
  className,
  ref,
  ...props
}: BlurTextProps) {
  const [observe, phase] = useEntrance<HTMLElement>({ trigger, once, play });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  const words = useMemo(() => {
    let next = 0;
    return children
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => graphemes(word).map((character) => ({ character, index: next++ })));
  }, [children]);
  const count = words.reduce((sum, word) => sum + word.length, 0);

  const piece = ({ character, index }: { character: string; index: number }) => {
    // Out goes in reverse, so the text folds away from where it ended.
    const order = show ? index : count - 1 - index;
    const style: CSSProperties =
      phase === "static" && show
        ? {}
        : {
            animationDelay: `${(show ? delay : 0) + order * stagger}ms`,
            animationDuration: `${show ? duration : duration * 0.7}ms`,
            animationPlayState: phase === "armed" && show ? "paused" : undefined,
          };
    return (
      <span
        key={index}
        data-slot="blur-text-character"
        // The character that finishes last: the end coming in, the start going out.
        data-last={index === (show ? count - 1 : 0) ? "" : undefined}
        className={cn(
          "inline-block",
          !show && "motion-safe:animate-blur-text-out motion-reduce:opacity-0",
          show && phase !== "static" && "motion-safe:animate-blur-text"
        )}
        style={style}
      >
        {character}
      </span>
    );
  };

  const handleAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset.last !== undefined) onAnimationComplete?.();
  };

  return (
    <Tag
      ref={mergedRef as Ref<never>}
      data-slot="blur-text"
      data-state={show ? phase : "hidden"}
      aria-hidden={show ? undefined : true}
      className={className}
      onAnimationEnd={handleAnimationEnd}
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {words.map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 ? " " : null}
            <span className="inline-block whitespace-nowrap">{word.map(piece)}</span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}

export { BlurText, type BlurTextProps };
