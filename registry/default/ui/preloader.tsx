"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
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

const easeOut = (t: number) => 1 - (1 - t) ** 3;

// While `ready` is false the count creeps toward this and waits.
const WAITING_CEILING = 90;

type PreloaderPhase = "loading" | "done" | "gone";

interface PreloaderProps extends Omit<ComponentProps<"div">, "children"> {
  /** The shortest time it stays on screen, in ms. */
  duration?: number;
  /** Whether whatever it waits for has arrived. While false, the count stops short of 90. */
  ready?: boolean;
  /** Called once, when the overlay has faded out and unmounted. */
  onComplete?: () => void;
  /** Accessible name of the progress bar. */
  label?: string;
  /** How long the fade out takes, in ms. */
  exitDuration?: number;
  /** What it shows: anything, or a function of the progress from 0 to 100. */
  children?: ReactNode | ((progress: number) => ReactNode);
}

/**
 * A full-screen cover for the first load: it counts from 0 to 100 over at
 * least `duration`, waits at 90 while `ready` is false, then fades out and
 * unmounts itself. The count is written to `--preloader-progress` (0 to 1)
 * once per frame for bars like `PreloaderBar`, and handed to `children` as
 * a whole number when it is a function.
 *
 * It is a `progressbar` with a name and a value. Keep the page behind it
 * `inert` until `onComplete`, so keyboard and screen reader users cannot
 * wander into content they cannot see. With `prefers-reduced-motion` it
 * skips the count and the fade and leaves as soon as `ready` is true.
 * Without JavaScript it never covers the page.
 *
 * @example
 * const [loaded, setLoaded] = useState(false);
 * <Preloader onComplete={() => setLoaded(true)}>
 *   {(progress) => (
 *     <div className="grid gap-3 text-center">
 *       <span className="font-mono text-sm tabular-nums">{progress}%</span>
 *       <PreloaderBar />
 *     </div>
 *   )}
 * </Preloader>
 * <main inert={!loaded}>…</main>
 */
function Preloader({
  duration = 1500,
  ready = true,
  onComplete,
  label = "Loading",
  exitDuration = 500,
  children,
  className,
  style,
  ref,
  ...props
}: PreloaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, root), [ref]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<PreloaderPhase>("loading");
  const value = useRef(0);
  const started = useRef<number | null>(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Count once per frame, straight into a CSS variable; React only hears whole numbers.
  useEffect(() => {
    if (phase !== "loading") return;
    const node = root.current;
    let frame = 0;
    const write = (next: number) => {
      value.current = next;
      node?.style.setProperty("--preloader-progress", String(next / 100));
      setProgress(Math.round(next));
    };
    if (prefersReducedMotion()) {
      if (!ready) return;
      frame = requestAnimationFrame(() => {
        write(100);
        setPhase("done");
      });
      return () => cancelAnimationFrame(frame);
    }
    const span = Math.max(duration, 1);
    let last = 0;
    const tick = (now: number) => {
      started.current ??= now;
      const elapsed = now - started.current;
      const step = last ? now - last : 16;
      last = now;
      const t = Math.min(elapsed / span, 1);
      const goal = ready
        ? 100 * easeOut(t)
        : WAITING_CEILING * (1 - Math.exp((-3 * elapsed) / span));
      // Glide toward the goal and never back.
      const next = Math.max(
        value.current,
        value.current + (goal - value.current) * Math.min(1, step / 80)
      );
      if (ready && t >= 1 && next >= 99.5) {
        write(100);
        setPhase("done");
        return;
      }
      write(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, ready, duration]);

  // Fade out, then leave.
  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(
      () => {
        setPhase("gone");
        onCompleteRef.current?.();
      },
      prefersReducedMotion() ? 0 : Math.max(0, exitDuration)
    );
    return () => clearTimeout(timer);
  }, [phase, exitDuration]);

  if (phase === "gone") return null;

  return (
    <div
      ref={mergedRef}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      data-slot="preloader"
      data-state={phase}
      className={cn(
        "bg-background text-foreground fixed inset-0 z-50 grid place-items-center [--preloader-progress:0]",
        "ease-out data-[state=done]:pointer-events-none data-[state=done]:opacity-0 motion-safe:transition-opacity",
        // Without scripts nothing would ever remove it.
        "[@media(scripting:none)]:hidden",
        className
      )}
      style={{ transitionDuration: `${exitDuration}ms`, ...style }}
      {...props}
    >
      {typeof children === "function" ? children(progress) : children}
    </div>
  );
}

/**
 * A thin bar that fills with the preloader's progress, through a `scaleX`
 * transform of `--preloader-progress`. Colour the fill with
 * `[&>[data-slot=preloader-bar-fill]]:bg-…`.
 */
function PreloaderBar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="preloader-bar"
      className={cn("bg-muted h-0.5 w-40 overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        data-slot="preloader-bar-fill"
        className="bg-primary h-full w-full origin-left"
        style={{ transform: "scaleX(var(--preloader-progress, 0))" }}
      />
    </div>
  );
}

export { Preloader, PreloaderBar, type PreloaderProps };
