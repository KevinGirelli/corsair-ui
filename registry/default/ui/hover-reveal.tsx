"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
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

// How quickly the circle grows and shrinks: the time constant of an ease-out, in ms.
const EASE_MS = 90;

interface HoverRevealProps extends ComponentProps<"div"> {
  /** The layer shown through the circle. Decorative: it is hidden from screen readers. */
  reveal: ReactNode;
  /** Radius of the circle, in px. */
  radius?: number;
  /** From 0 to 1: 0 gives a crisp edge, 1 fades from the centre out. */
  softness?: number;
  /** Classes for the revealed layer. */
  revealClassName?: string;
}

/**
 * A second layer seen through a soft circle that follows the pointer: a
 * photo under a sketch, colour under greyscale, the answer under the
 * question. The circle opens when the pointer comes in and closes when it
 * leaves; it moves by writing CSS variables once per frame, so nothing
 * re-renders. Touch screens only see the base layer. The revealed layer is
 * hidden from screen readers and cannot take focus or clicks, so the base
 * (`children`) has to carry the meaning. With `prefers-reduced-motion` the
 * circle opens and closes at once.
 *
 * @example
 * <HoverReveal
 *   className="aspect-video rounded-xl"
 *   reveal={<img src="/chart-colour.jpg" alt="" className="size-full object-cover" />}
 * >
 *   <img src="/chart-sketch.jpg" alt="A sea chart of the bay" className="size-full object-cover" />
 * </HoverReveal>
 */
function HoverReveal({
  reveal,
  radius = 120,
  softness = 0.4,
  revealClassName,
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ref,
  ...props
}: HoverRevealProps) {
  const [active, setActive] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, root), [ref]);
  const frame = useRef(0);
  const motion = useRef({ x: 0, y: 0, r: 0, target: 0, last: 0 });

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Grows or shrinks the circle toward its target, and writes the position.
  const tick = (now: number) => {
    frame.current = 0;
    const node = root.current;
    if (!node) return;
    const state = motion.current;
    const elapsed = state.last ? now - state.last : 16;
    state.last = now;
    state.r += (state.target - state.r) * (1 - Math.exp(-elapsed / EASE_MS));
    if (Math.abs(state.target - state.r) < 0.5) state.r = state.target;
    node.style.setProperty("--hover-reveal-x", `${state.x}px`);
    node.style.setProperty("--hover-reveal-y", `${state.y}px`);
    node.style.setProperty("--hover-reveal-r", `${state.r}px`);
    if (state.r !== state.target) frame.current = requestAnimationFrame(tick);
    else state.last = 0;
  };

  const schedule = () => {
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  };

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    motion.current.x = event.clientX - bounds.left;
    motion.current.y = event.clientY - bounds.top;
  };

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    onPointerEnter?.(event);
    if (event.pointerType === "touch") return;
    track(event);
    motion.current.target = radius;
    if (prefersReducedMotion()) motion.current.r = radius;
    setActive(true);
    schedule();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (event.pointerType === "touch") return;
    track(event);
    // A pointer that was already inside when the page loaded never "entered".
    if (!active) {
      motion.current.target = radius;
      if (prefersReducedMotion()) motion.current.r = radius;
      setActive(true);
    }
    schedule();
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    if (event.pointerType === "touch") return;
    motion.current.target = 0;
    if (prefersReducedMotion()) motion.current.r = 0;
    setActive(false);
    schedule();
  };

  const edge = Math.round((1 - Math.min(Math.max(softness, 0), 1)) * 100);
  const mask = `radial-gradient(circle var(--hover-reveal-r, 0px) at var(--hover-reveal-x, 50%) var(--hover-reveal-y, 50%), #000 ${edge}%, transparent 100%)`;

  return (
    <div
      ref={mergedRef}
      data-slot="hover-reveal"
      data-state={active ? "active" : "idle"}
      className={cn("relative isolate overflow-hidden", className)}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {children}
      <div
        aria-hidden="true"
        inert
        data-slot="hover-reveal-layer"
        className={cn("pointer-events-none absolute inset-0", revealClassName)}
        style={{ maskImage: mask, WebkitMaskImage: mask } as CSSProperties}
      >
        {reveal}
      </div>
    </div>
  );
}

export { HoverReveal, type HoverRevealProps };
