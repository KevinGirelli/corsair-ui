"use client";

import {
  Fragment,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type Ref,
} from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { cn } from "@/registry/default/lib/utils";

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

type TextRevealTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";

interface TextRevealProps extends Omit<ComponentProps<"p">, "children"> {
  /** Plain text; it is split into words. */
  children: string;
  as?: TextRevealTag;
  /**
   * "in-view" brings the words in one after another once the text scrolls
   * into view. "scroll" ties each word to the scroll position instead, with
   * CSS scroll-driven animations and no JavaScript; browsers without them
   * show the text as is. Scroll follows the nearest scroll container: clip
   * ancestors with `overflow-clip`, as `overflow-hidden` makes one that never
   * scrolls.
   */
  trigger?: "in-view" | "scroll";
  /** In-view: delay between words, in ms. */
  stagger?: number;
  /** In-view: how long each word takes, in ms. */
  duration?: number;
  /** Scroll: opacity of the words not reached yet, from 0 to 1. */
  dim?: number;
  /**
   * Scroll: where the reveal starts and ends, as percentages of the text
   * crossing the viewport (0 is entering at the bottom, 100 is leaving at the top).
   */
  range?: [start: number, end: number];
}

/**
 * Reveals a line of text word by word. Screen readers get the sentence in
 * one piece: the animated words are hidden from them. With
 * `prefers-reduced-motion` the text is shown as is.
 */
function TextReveal({
  children,
  as: Tag = "p",
  trigger = "in-view",
  stagger = 40,
  duration = 500,
  dim = 0.15,
  range = [10, 55],
  className,
  style,
  ref,
  ...props
}: TextRevealProps) {
  const words = children.trim().split(/\s+/).filter(Boolean);
  const timeline = `--text-reveal-${useId().replace(/[^\w-]/g, "")}`;
  const [phase, setPhase] = useState<"idle" | "hidden" | "shown">("idle");
  const answered = useRef(false);
  const [observe] = useInView<HTMLElement>({
    once: true,
    amount: 0.4,
    onChange: (inView) => {
      const first = !answered.current;
      answered.current = true;
      if (prefersReducedMotion()) return;
      if (first && !inView) setPhase("hidden");
      else if (!first && inView) setPhase("shown");
    },
  });
  const mergedRef = useMemo(
    () => mergeRefs(ref, trigger === "in-view" ? observe : undefined),
    [ref, observe, trigger]
  );

  const [start, end] = range;
  const wordStyle = (index: number): CSSProperties => {
    if (trigger === "scroll") {
      const from = start + ((end - start) * index) / words.length;
      const to = start + ((end - start) * (index + 1)) / words.length;
      return { animationTimeline: timeline, animationRange: `cover ${from}% cover ${to}%` };
    }
    if (phase === "hidden") return { opacity: 0, transform: "translate3d(0, 0.35em, 0)" };
    if (phase === "shown") {
      const wait = index * stagger;
      return {
        transition: `opacity ${duration}ms ${EASE_OUT} ${wait}ms, transform ${duration}ms ${EASE_OUT} ${wait}ms`,
      };
    }
    return {};
  };

  return (
    <Tag
      ref={mergedRef as Ref<never>}
      data-slot="text-reveal"
      data-trigger={trigger}
      data-state={phase === "hidden" ? "hidden" : "visible"}
      className={className}
      style={
        {
          ...(trigger === "scroll"
            ? { viewTimelineName: timeline, "--text-reveal-dim": String(dim) }
            : null),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <Fragment key={index}>
            {index > 0 ? " " : null}
            <span
              data-slot="text-reveal-word"
              className={cn(
                "inline-block",
                trigger === "scroll" &&
                  "supports-[animation-timeline:view()]:animate-text-reveal motion-reduce:!animate-none"
              )}
              style={wordStyle(index)}
            >
              {word}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}

export { TextReveal, type TextRevealProps };
