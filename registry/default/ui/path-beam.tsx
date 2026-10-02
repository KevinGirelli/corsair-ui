"use client";

import {
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type ComponentProps,
  type CSSProperties,
  type Ref,
} from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";

// Scroll mode animates the overall progress on the svg and every beam reads
// it. Registered as an inherited number so CSS interpolates it smoothly; an
// unregistered custom property would jump from start to end instead.
if (typeof CSS !== "undefined" && "registerProperty" in CSS) {
  try {
    CSS.registerProperty({
      name: "--path-beam-progress",
      syntax: "<number>",
      inherits: true,
      initialValue: "0",
    });
  } catch {
    // Already registered by another copy of the component.
  }
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const clamp01 = (value: number) => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
const round = (value: number) => Math.round(value * 1e4) / 1e4;

type PathBeamState = "idle" | "running" | "done";

interface PathBeamProps extends Omit<ComponentProps<"svg">, "children"> {
  /** SVG path data, travelled in this order. Use the same coordinates as `viewBox`. */
  paths: string[];
  /** Draw each path in full underneath, as a faint track. */
  track?: boolean;
  /** Classes for the track strokes. */
  trackClassName?: string;
  /** Classes for the beam and its glow, usually a stroke colour. */
  beamClassName?: string;
  /** A wider, fainter copy of the beam underneath it. */
  glow?: boolean;
  /** Length of the beam, as a fraction of each path, from 0 to 1. */
  beamLength?: number;
  /** Width of the track and the beam; the glow is four times as wide. */
  strokeWidth?: number;
  /**
   * "in-view" sends the beam when the diagram scrolls into view. "scroll"
   * moves it with the scroll position, on CSS scroll-driven animations;
   * browsers without them show the track alone. "manual" follows `progress`
   * and nothing else, for diagrams driven by your own timeline.
   */
  trigger?: "in-view" | "scroll" | "manual";
  /** In-view: play the first time only. Otherwise it plays again each time it comes back. */
  once?: boolean;
  /**
   * Manual: where the beam is, from 0 to 1 over the whole sequence. With n
   * paths, path i covers [i / n, (i + 1) / n].
   */
  progress?: number;
  /** In-view: time for the beam to cross one path, in ms. */
  duration?: number;
  /** In-view: wait before the first path, in ms. With `loop`, before every cycle. */
  delay?: number;
  /**
   * In-view: wait between the end of one path and the start of the next, in
   * ms. Path i starts at `delay + i * (duration + stagger)`; negative values overlap them.
   */
  stagger?: number;
  /** In-view: run the sequence again and again. It pauses while off screen. */
  loop?: boolean;
  /** Scroll: the CSS `animation-range` the whole sequence spans. */
  range?: string;
  /** In-view: called once the last path has been crossed. Never called with `loop`. */
  onComplete?: () => void;
  /** In-view: called each time the beam leaves a path, with its index. */
  onPathComplete?: (index: number) => void;
}

/**
 * A beam of light that travels along the lines of a flow diagram, one path
 * after another, so each step lights up as it arrives. Draw the lines as SVG
 * paths over your nodes; the beam is a bright dash with a cheap glow (a
 * wider, fainter copy of the same dash, no filters) moving by
 * `stroke-dashoffset` alone.
 *
 * State for lighting the nodes: the svg has `data-state` ("idle",
 * "running", "done") and each path's group (`data-slot="path-beam-path"`,
 * with `data-index`) its own, "running" while the beam is on it and "done"
 * once it has passed. Style a node from it, or listen to `onPathComplete`.
 * In manual mode the svg also sets `--path-beam-progress` (0 to 1).
 *
 * The svg is decorative and hidden from screen readers: label the diagram
 * itself. With `prefers-reduced-motion` the track shows, the beam does not,
 * and in-view diagrams are "done" straight away without calling
 * `onComplete`. Without JavaScript the track shows and the beam does not run.
 * Scroll mode is CSS alone, with no state on the paths: use "manual" with
 * your own scroll hook when nodes have to follow it. Manual mode is not
 * changed by reduced motion, as the parent is in charge.
 *
 * Looping restarts the sequence when the last path ends, so every cycle
 * waits `delay` again, and pauses while off screen.
 *
 * @example
 * <div className="relative" aria-label="From player to venue account" role="img">
 *   <PathBeam
 *     viewBox="0 0 300 40"
 *     paths={["M10 20 H140", "M160 20 H290"]}
 *     onPathComplete={(index) => setReached(index + 1)}
 *     className="absolute inset-0 size-full"
 *   />
 * </div>
 *
 * @example
 * // Driven by your own progress, from 0 to 1.
 * <PathBeam trigger="manual" progress={value} paths={paths} viewBox="0 0 300 40" />
 */
function PathBeam({
  paths,
  track = true,
  trackClassName = "stroke-border",
  beamClassName = "stroke-primary",
  glow = true,
  beamLength = 0.2,
  strokeWidth = 2,
  trigger = "in-view",
  once = true,
  progress = 0,
  duration = 1200,
  delay = 0,
  stagger = 0,
  loop = false,
  range = "entry 25% cover 60%",
  onComplete,
  onPathComplete,
  className,
  style,
  ref,
  ...props
}: PathBeamProps) {
  const count = paths.length;
  const length = round(clamp01(beamLength));
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const timed = trigger === "in-view";

  // In-view: the sequence's phase, which paths the beam has reached and left,
  // and a cycle number that remounts the beams to restart their animations.
  const [phase, setPhase] = useState<PathBeamState>("idle");
  const [cycle, setCycle] = useState(0);
  const [started, setStarted] = useState<ReadonlySet<number>>(() => new Set());
  const [ended, setEnded] = useState<ReadonlySet<number>>(() => new Set());
  const endedRef = useRef(new Set<number>());

  const reset = () => {
    endedRef.current = new Set();
    setStarted(new Set());
    setEnded(new Set());
  };

  const [observe, inView] = useInView<SVGSVGElement>({
    // A loop keeps watching to pause off screen.
    once: once && !loop,
    amount: 0.3,
    onChange: (visible) => {
      if (!timed) return;
      if (visible) {
        setPhase((current) => (current === "idle" ? "running" : current));
      } else if (!once && !loop) {
        // Rearm, and remount the beams so a late animationend cannot count.
        setPhase("idle");
        setCycle((current) => current + 1);
        reset();
      }
    },
  });
  const mergedRef = useMemo(
    () => mergeRefs(ref, timed ? observe : undefined),
    [ref, observe, timed]
  );

  // Path i starts at delay + i * (duration + stagger).
  const starts = paths.map((_, index) => Math.max(0, delay + index * (duration + stagger)));
  // The path whose beam ends last; with equal durations, the last to start.
  const lastIndex = starts.reduce(
    (last, start, index) => (start >= starts[last]! ? index : last),
    0
  );

  const handleEnd = (index: number) => (event: AnimationEvent<SVGPathElement>) => {
    if (event.target !== event.currentTarget || endedRef.current.has(index)) return;
    endedRef.current.add(index);
    setEnded(new Set(endedRef.current));
    onPathComplete?.(index);
    if (index !== lastIndex) return;
    if (loop) {
      setCycle((current) => current + 1);
      reset();
      return;
    }
    setPhase("done");
    onComplete?.();
  };
  const handleStart = (index: number) => (event: AnimationEvent<SVGPathElement>) => {
    if (event.target !== event.currentTarget) return;
    setStarted((current) => (current.has(index) ? current : new Set(current).add(index)));
  };

  const drawn = clamp01(progress);
  // Manual: how far along its own path the beam is, from 0 to 1.
  const local = (index: number) => clamp01(drawn * count - index);

  const rootState: PathBeamState | undefined =
    trigger === "manual"
      ? drawn >= 1
        ? "done"
        : drawn <= 0
          ? "idle"
          : "running"
      : trigger === "scroll"
        ? undefined
        : reduced
          ? "done"
          : phase;

  const pathState = (index: number): PathBeamState | undefined => {
    if (trigger === "manual") {
      const at = local(index);
      return at >= 1 ? "done" : at <= 0 ? "idle" : "running";
    }
    if (trigger === "scroll") return undefined;
    if (rootState === "done" || ended.has(index)) return "done";
    if (rootState === "running" && started.has(index)) return "running";
    return "idle";
  };

  // The dash is `length` long with a gap of one path: at an offset of
  // `length` it sits just before the start, at -1 just past the end.
  const beamStyle = (index: number): CSSProperties => {
    if (trigger === "manual") {
      return { strokeDashoffset: round(length - (length + 1) * local(index)) };
    }
    if (trigger === "scroll") {
      // Each beam takes its share of the overall progress the svg animates.
      const share = `clamp(0, var(--path-beam-progress, 0) * ${count} - ${index}, 1)`;
      return {
        strokeDashoffset: `calc((${length} - ${round(length + 1)} * ${share}) * 1px)`,
        opacity: reduced ? 0 : undefined,
      };
    }
    if (reduced) return { strokeDashoffset: -1, opacity: 0 };
    if (phase === "done") return { strokeDashoffset: -1 };
    if (phase === "idle") return { strokeDashoffset: length };
    return {
      strokeDashoffset: length,
      animationDuration: `${duration}ms`,
      animationDelay: `${starts[index]}ms`,
      animationIterationCount: 1,
      animationPlayState: loop && !inView ? "paused" : undefined,
    };
  };

  const animated = timed && !reduced && phase === "running";
  const beamClass = animated ? "motion-safe:animate-path-beam" : undefined;

  return (
    <svg
      ref={mergedRef}
      data-slot="path-beam"
      data-trigger={trigger}
      data-state={rootState}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "overflow-visible",
        trigger === "scroll" &&
          "supports-[animation-timeline:view()]:animate-path-beam-progress motion-reduce:!animate-none",
        className
      )}
      style={
        {
          "--path-beam-length": length,
          ...(trigger === "manual" ? { "--path-beam-progress": round(drawn) } : null),
          // After the utility's shorthand, which would reset them.
          ...(trigger === "scroll" ? { animationTimeline: "view()", animationRange: range } : null),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {paths.map((d, index) => {
        const state = pathState(index);
        const beam = beamStyle(index);
        // Butt caps: a round cap would leave a dot at either end while the dash waits there.
        const dash = {
          d,
          pathLength: 1,
          strokeDasharray: `${length} 1`,
          strokeLinecap: "butt",
        } as const;
        return (
          <g key={index} data-slot="path-beam-path" data-index={index} data-state={state}>
            {track ? <path data-slot="path-beam-track" d={d} className={trackClassName} /> : null}
            {glow ? (
              <path
                key={`glow-${cycle}`}
                data-slot="path-beam-glow"
                {...dash}
                strokeWidth={strokeWidth * 4}
                className={cn("opacity-25", beamClassName, beamClass)}
                style={beam}
              />
            ) : null}
            <path
              key={`beam-${cycle}`}
              data-slot="path-beam-beam"
              {...dash}
              className={cn(beamClassName, beamClass)}
              style={beam}
              onAnimationStart={timed ? handleStart(index) : undefined}
              onAnimationEnd={timed ? handleEnd(index) : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}

export { PathBeam, type PathBeamProps };
