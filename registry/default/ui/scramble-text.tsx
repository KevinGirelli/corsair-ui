"use client";

import { useEffect, useMemo, useRef, type ComponentProps, type Ref } from "react";

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

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

const NBSP = "\u00a0";

/** A random character from the set, never the same as the one before it. */
function pick(characters: string, previous?: string) {
  let next = previous;
  for (let tries = 0; tries < 4 && next === previous; tries++) {
    next = characters[Math.floor(Math.random() * characters.length)];
  }
  return next ?? "";
}

/**
 * One frame of the effect. First the line fills up with noise from the
 * left; then the real text takes over one character every two steps, with
 * a cursor at the edge. Spaces stay spaces, so the words keep their shape.
 */
function frame(text: string, step: number, characters: string) {
  const length = text.length;
  const out: string[] = [];
  if (step < length * 2) {
    const filled = Math.min(step + 1, length);
    for (let index = 0; index < length; index++) {
      if (text[index] === " ") out.push(" ");
      else if (index < filled) out.push(pick(characters, out[index - 1]));
      else out.push(NBSP);
    }
    return out.join("");
  }
  const revealStep = step - length * 2;
  const revealed = Math.floor(revealStep / 2);
  for (let index = 0; index < length; index++) {
    if (index < revealed || text[index] === " ") out.push(text[index] ?? "");
    else if (index === revealed) out.push(revealStep % 2 === 0 ? "_" : pick(characters));
    else out.push(pick(characters, out[index - 1]));
  }
  return out.join("");
}

interface ScrambleTextProps extends Omit<ComponentProps<"span">, "children"> {
  /** Plain text. */
  children: string;
  /** Milliseconds per step. Each character takes four steps in all. */
  speed?: number;
  /** Wait before it starts, in ms. */
  delay?: number;
  /** The noise it cycles through before the text settles. */
  characters?: string;
  /** "load" starts as soon as the page runs; "in-view" when the text scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: play the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds it blank, `true` runs it. */
  play?: boolean;
}

/**
 * Text that decodes itself: noise sweeps across, then the real characters
 * lock in one by one behind a cursor. It writes straight to the DOM once
 * per frame instead of re-rendering React. The text is in the server HTML
 * for search engines and for browsers without JavaScript, screen readers
 * get it in one piece, and with `prefers-reduced-motion` it just appears.
 * A monospace font (the default) keeps the width steady while it runs.
 *
 * @example
 * <ScrambleText className="text-sm">Signal acquired</ScrambleText>
 */
function ScrambleText({
  children: text,
  speed = 20,
  delay = 0,
  characters = "_!X$0-+*#/<>",
  trigger = "load",
  once = true,
  play,
  className,
  ref,
  ...props
}: ScrambleTextProps) {
  const [observe, phase] = useEntrance<HTMLSpanElement>({ trigger, once, play });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);
  const output = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = output.current;
    if (!node) return;
    // Change the value of React's own text node rather than replacing it,
    // so React's later updates still land on the node that is on screen.
    const write = (value: string) => {
      const child = node.firstChild;
      if (child?.nodeType === Node.TEXT_NODE) child.nodeValue = value;
      else node.textContent = value;
      node.style.visibility = "visible";
    };
    const settle = () => write(text);
    if (phase === "static" || prefersReducedMotion()) return settle();
    if (phase === "armed") return write(NBSP.repeat(Math.max(text.length, 1)));

    const steps = text.length * 4;
    const start = performance.now() + delay;
    let shown = -1;
    let id = 0;
    const tick = (now: number) => {
      const step = Math.floor((now - start) / Math.max(speed, 1));
      if (step >= steps) return settle();
      if (step >= 0 && step !== shown) {
        shown = step;
        write(frame(text, step, characters || "#"));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase, text, speed, delay, characters]);

  return (
    <span
      ref={mergedRef}
      data-slot="scramble-text"
      data-state={phase}
      className={cn("inline-block font-mono whitespace-pre-wrap", className)}
      {...props}
    >
      <span className="sr-only">{text}</span>
      {/* Hidden until the script takes over when it is about to play, so the text does not flash; shown as is without JavaScript. */}
      <span
        ref={output}
        aria-hidden="true"
        data-slot="scramble-text-output"
        className={cn(phase === "play" && "[@media(scripting:enabled)]:invisible")}
      >
        {text}
      </span>
    </span>
  );
}

export { ScrambleText, type ScrambleTextProps };
