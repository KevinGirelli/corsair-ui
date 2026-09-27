"use client";

import { useMemo, type ComponentProps, type CSSProperties, type Ref } from "react";
import { useInView } from "@/registry/default/hooks/use-in-view";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const MAX_COUNT = 200;

/** A small seeded generator (mulberry32): the same seed gives the same dots on server and client. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value: number) => Math.round(value * 100) / 100;

interface ParticlesProps extends Omit<ComponentProps<"div">, "children"> {
  /** How many dots, up to 200. */
  count?: number;
  /** Which way the dots drift. */
  direction?: "up" | "down";
  /** Average time for one dot to cross, in seconds. */
  duration?: number;
  /** Smallest and largest dot, in px. */
  size?: [number, number];
  /** Picks where the dots are and how they move; change it for a different scatter. */
  seed?: number;
}

/**
 * Dots drifting slowly across a surface, like dust in a light beam or
 * bubbles in water. Each dot is one CSS animation of a transform, laid out
 * from a seed so the server and the browser draw the same scatter. Put it
 * inside a positioned element; colour it with a `text-*` class. It is
 * decorative and hidden from screen readers, pauses off screen, and is not
 * shown at all with `prefers-reduced-motion`.
 *
 * @example
 * <section className="relative overflow-hidden rounded-xl p-12">
 *   <Particles count={40} className="text-primary/60" />
 *   <h2>Below deck</h2>
 * </section>
 */
function Particles({
  count = 30,
  direction = "up",
  duration = 14,
  size = [1, 3],
  seed = 1,
  className,
  ref,
  ...props
}: ParticlesProps) {
  const [observe, inView] = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);
  const [smallest, largest] = size;

  const dots = useMemo(() => {
    const next = random(seed);
    const total = Math.min(Math.max(Math.floor(count), 0), MAX_COUNT);
    const low = Math.max(Math.min(smallest, largest), 0);
    const high = Math.max(smallest, largest, low);
    return Array.from({ length: total }, () => {
      const trip = Math.max(duration, 0.1) * (0.6 + next() * 0.8);
      return {
        left: round(next() * 100),
        size: round(low + next() * (high - low)),
        duration: round(trip),
        // Negative, so every dot is already partway across on the first frame.
        delay: round(-next() * trip),
        drift: round((next() - 0.5) * 60),
        opacity: round(0.3 + next() * 0.7),
      };
    });
  }, [count, duration, smallest, largest, seed]);

  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-slot="particles"
      data-direction={direction}
      className={cn(
        "text-muted-foreground pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden",
        className
      )}
      {...props}
    >
      {dots.map((dot, index) => (
        // Each track is as tall as the surface, so moving it by its own
        // height carries the dot from one edge to the other.
        <span
          key={index}
          data-slot="particles-dot"
          className={cn(
            "absolute inset-y-0",
            direction === "up"
              ? "motion-safe:animate-particles-up"
              : "motion-safe:animate-particles-down"
          )}
          style={
            {
              left: `${dot.left}%`,
              width: `${dot.size}px`,
              "--particles-drift": `${dot.drift}px`,
              "--particles-opacity": dot.opacity,
              animationDuration: `${dot.duration}s`,
              animationDelay: `${dot.delay}s`,
              animationPlayState: inView ? undefined : "paused",
            } as CSSProperties
          }
        >
          <span
            className={cn(
              "absolute left-0 rounded-full bg-current",
              direction === "up" ? "bottom-0" : "top-0"
            )}
            style={{ width: `${dot.size}px`, height: `${dot.size}px` }}
          />
        </span>
      ))}
    </div>
  );
}

export { Particles, type ParticlesProps };
