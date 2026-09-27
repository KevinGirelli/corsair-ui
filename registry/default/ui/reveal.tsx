"use client";

import { Slot } from "@radix-ui/react-slot";
import {
  Children,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type Ref,
} from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";

type RevealDirection = "up" | "down" | "left" | "right" | "none";

/**
 * "idle" until the browser answers, "hidden" while waiting below the fold,
 * "shown" once scrolled in. Elements already on screen stay "idle" and are
 * shown as rendered, so nothing blinks on load.
 */
type RevealPhase = "idle" | "hidden" | "shown";

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

function hiddenTransform(direction: RevealDirection, distance: number) {
  switch (direction) {
    case "up":
      return `translate3d(0, ${distance}px, 0)`;
    case "down":
      return `translate3d(0, ${-distance}px, 0)`;
    case "left":
      return `translate3d(${distance}px, 0, 0)`;
    case "right":
      return `translate3d(${-distance}px, 0, 0)`;
    default:
      return undefined;
  }
}

function useRevealPhase<T extends Element>(once: boolean, amount: number, observe: boolean) {
  const [phase, setPhase] = useState<RevealPhase>("idle");
  const answered = useRef(false);
  const [ref] = useInView<T>({
    once,
    amount,
    onChange: (inView) => {
      const first = !answered.current;
      answered.current = true;
      if (prefersReducedMotion()) return;
      if (first) {
        if (!inView) setPhase("hidden");
      } else if (inView) {
        setPhase((current) => (current === "hidden" ? "shown" : current));
      } else if (!once) {
        setPhase("hidden");
      }
    },
  });
  return [observe ? ref : undefined, phase] as const;
}

const RevealGroupContext = createContext<{ phase: RevealPhase; stagger: number } | null>(null);
const RevealIndexContext = createContext(0);

interface RevealOptions {
  /** Where the element comes from: "up" rises into place. */
  direction?: RevealDirection;
  /** How far it travels, in px. */
  distance?: number;
  /** In ms. */
  duration?: number;
  /** In ms, added to the group's stagger. */
  delay?: number;
  /** Reveal only the first time; with `false` it hides again when scrolled out. */
  once?: boolean;
  /** Fraction of the element that has to be visible to start, from 0 to 1. */
  amount?: number;
}

interface RevealProps extends ComponentProps<"div">, RevealOptions {
  /** Reveal the single child element instead of wrapping it in a div. */
  asChild?: boolean;
}

/**
 * Fades and moves content into place when it scrolls into view. Server
 * rendered content stays visible until the browser confirms it is below the
 * fold, so it works without JavaScript and never blinks on load. With
 * `prefers-reduced-motion` it is simply shown.
 */
function Reveal({
  asChild = false,
  direction = "up",
  distance = 16,
  duration = 600,
  delay = 0,
  once = true,
  amount = 0.2,
  style,
  ref,
  ...props
}: RevealProps) {
  const group = useContext(RevealGroupContext);
  const index = useContext(RevealIndexContext);
  const [observe, ownPhase] = useRevealPhase<HTMLDivElement>(once, amount, !group);
  const phase = group ? group.phase : ownPhase;
  const wait = delay + (group ? index * group.stagger : 0);
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);
  const Comp = asChild ? Slot : "div";

  const motion: CSSProperties =
    phase === "hidden"
      ? { opacity: 0, transform: hiddenTransform(direction, distance) }
      : phase === "shown"
        ? {
            transition: `opacity ${duration}ms ${EASE_OUT} ${wait}ms, transform ${duration}ms ${EASE_OUT} ${wait}ms`,
          }
        : {};

  return (
    <Comp
      ref={mergedRef}
      data-slot="reveal"
      data-state={phase === "hidden" ? "hidden" : "visible"}
      style={{ ...motion, ...style }}
      {...props}
    />
  );
}

interface RevealGroupProps extends ComponentProps<"div">, Pick<RevealOptions, "once" | "amount"> {
  /** Delay between one child and the next, in ms. */
  stagger?: number;
}

/**
 * Reveals its children one after another when the group scrolls into view.
 * Put a Reveal in each child; they take the group's timing instead of
 * watching the viewport themselves.
 *
 * @example
 * <RevealGroup className="grid grid-cols-3 gap-4" stagger={80}>
 *   {cards.map((card) => <Reveal key={card.id}><Card>…</Card></Reveal>)}
 * </RevealGroup>
 */
function RevealGroup({
  stagger = 80,
  once = true,
  amount = 0.2,
  children,
  ref,
  ...props
}: RevealGroupProps) {
  const [observe, phase] = useRevealPhase<HTMLDivElement>(once, amount, true);
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);
  const context = useMemo(() => ({ phase, stagger }), [phase, stagger]);

  return (
    <RevealGroupContext.Provider value={context}>
      <div
        ref={mergedRef}
        data-slot="reveal-group"
        data-state={phase === "hidden" ? "hidden" : "visible"}
        {...props}
      >
        {Children.map(children, (child, index) => (
          <RevealIndexContext.Provider value={index}>{child}</RevealIndexContext.Provider>
        ))}
      </div>
    </RevealGroupContext.Provider>
  );
}

export { Reveal, RevealGroup, type RevealDirection, type RevealGroupProps, type RevealProps };
