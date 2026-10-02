"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type WipeDirection = "left" | "right" | "up" | "down";
type WipeMode = "wipe" | "fade";
type WipePhase = "covering" | "revealing";

/** Where the cover starts (before it covers) and where it leaves to, for each way it travels. */
const OFFSETS: Record<WipeDirection, readonly [enter: string, leave: string]> = {
  right: ["-100%", "100%"],
  left: ["100%", "-100%"],
  down: ["-100%", "100%"],
  up: ["100%", "-100%"],
};

const COVERED = "translate3d(0, 0, 0)";

function coverTransform(direction: WipeDirection, offset: string) {
  return direction === "left" || direction === "right"
    ? `translate3d(${offset}, 0, 0)`
    : `translate3d(0, ${offset}, 0)`;
}

/**
 * Runs one half of the transition on `element` with the Web Animations API
 * and resolves when it is done. Without `element.animate` (old browsers,
 * jsdom) or with no time to spend, it resolves on the next microtask, so the
 * swap still happens, only at once.
 */
function play(
  element: HTMLElement | null,
  keyframes: Keyframe[],
  duration: number,
  easing: string
): { finished: Promise<unknown>; cancel: () => void } {
  if (!element || duration <= 0 || typeof element.animate !== "function") {
    return { finished: Promise.resolve(), cancel: () => {} };
  }
  // Held at the end until the next phase's inline style has taken over, then cancelled.
  const animation = element.animate(keyframes, { duration, easing, fill: "forwards" });
  return { finished: animation.finished, cancel: () => animation.cancel() };
}

interface WipeRun {
  phase: WipePhase;
  mode: WipeMode;
  direction: WipeDirection;
  /** Length of each half, in ms. */
  half: number;
  easing: string;
}

interface WipeTransitionProps extends ComponentProps<"div"> {
  /**
   * Identifies what `children` show. When it changes, the cover sweeps in,
   * the content is swapped while it is covered, and the cover sweeps out.
   */
  transitionKey: string | number;
  /** What sweeps across. It fills the cover layer. Defaults to a `bg-primary` band. */
  cover?: ReactNode;
  /** Classes for the cover layer, which is positioned over the content. */
  coverClassName?: string;
  /** The way the cover travels: "right" sweeps in from the left and leaves on the right. */
  direction?: WipeDirection;
  /** Total length in ms: half to cover, half to reveal. */
  duration?: number;
  /** Timing function for each half, any CSS easing. */
  easing?: string;
  /**
   * "wipe" sweeps the cover across; "fade" fades the old content out and the
   * new one in, with no cover (pick it on phones, for example).
   */
  mode?: WipeMode;
  /** With `prefers-reduced-motion` it always fades, over this many ms in total. 0 swaps at once. */
  reducedDuration?: number;
  /**
   * Cover the viewport (`fixed`) instead of this element, for switching a
   * whole page that may be taller than the screen.
   */
  fixed?: boolean;
  /**
   * Called once the content is covered and the new children are in place,
   * before the cover leaves: a good moment to `window.scrollTo({ top: 0 })`.
   */
  onCovered?: () => void;
  /** Called when the cover has left, or the new content has faded in. */
  onComplete?: () => void;
}

/**
 * Switches content behind a band that sweeps across it: "For players" to
 * "For venues", a tab, a language, a theme. When `transitionKey` changes,
 * the cover travels in, the old children stay on screen until it covers
 * them, the new children are rendered underneath, `onCovered` is called,
 * and the cover travels out. Only `transform` (cover) and `opacity` (fade)
 * animate, through the Web Animations API.
 *
 * While it runs, the root has `aria-busy` and the content ignores the
 * pointer. If keyboard focus was inside the old content when it went away,
 * focus moves to the content wrapper instead of dropping to the page.
 * Keys that change during a transition are queued: it always ends on the
 * latest. `mode="fade"` crossfades instead; with `prefers-reduced-motion`
 * it always crossfades, over `reducedDuration`. The first render shows the
 * children as they are, so server HTML needs no JavaScript.
 *
 * @example
 * <WipeTransition
 *   transitionKey={side}
 *   fixed
 *   cover={<div className="bg-primary" />}
 *   onCovered={() => window.scrollTo({ top: 0 })}
 * >
 *   {side === "players" ? <PlayersPage /> : <VenuesPage />}
 * </WipeTransition>
 */
function WipeTransition({
  transitionKey,
  cover,
  coverClassName,
  direction = "right",
  duration = 600,
  easing = "cubic-bezier(0.65, 0, 0.35, 1)",
  mode = "wipe",
  reducedDuration = 150,
  fixed = false,
  onCovered,
  onComplete,
  className,
  children,
  ref,
  ...props
}: WipeTransitionProps) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  // What is on screen: the children of the last key shown. While the key
  // differs (a transition is under way), these stay as they were.
  const [shown, setShown] = useState<{ key: string | number; children: ReactNode }>({
    key: transitionKey,
    children,
  });
  const [run, setRun] = useState<WipeRun | null>(null);

  const current = transitionKey === shown.key;
  // Same key: keep the snapshot fresh, so a later switch starts from what is on screen now.
  if (current && children !== shown.children) setShown({ key: transitionKey, children });
  // A new key and nothing running: start covering. A key that changes
  // mid-run is picked up at the swap, or by the next run once this one ends.
  if (!current && !run) {
    setRun({
      phase: "covering",
      mode: reduced ? "fade" : mode,
      direction,
      half: Math.max(0, reduced ? reducedDuration : duration) / 2,
      easing,
    });
  }

  const content = useRef<HTMLDivElement>(null);
  const coverLayer = useRef<HTMLDivElement>(null);
  const latest = useRef({ key: transitionKey, children, onCovered, onComplete });
  const focusWasInside = useRef(false);
  const finished = useRef(false);

  useIsomorphicLayoutEffect(() => {
    latest.current = { key: transitionKey, children, onCovered, onComplete };
  });

  // Called after the run has ended and the next state is committed (idle, or the queued key's run).
  useIsomorphicLayoutEffect(() => {
    if (!finished.current) return;
    finished.current = false;
    latest.current.onComplete?.();
  }, [run]);

  // First half: the cover comes in, or the old content fades out. Then swap.
  useIsomorphicLayoutEffect(() => {
    if (run?.phase !== "covering") return;
    const { mode, direction, half, easing } = run;
    const animation =
      mode === "fade"
        ? play(content.current, [{ opacity: 1 }, { opacity: 0 }], half, easing)
        : play(
            coverLayer.current,
            [
              { transform: coverTransform(direction, OFFSETS[direction][0]) },
              { transform: COVERED },
            ],
            half,
            easing
          );
    let cancelled = false;
    animation.finished.then(
      () => {
        if (cancelled) return;
        const active = document.activeElement;
        focusWasInside.current = !!active && !!content.current?.contains(active);
        // The latest key and its children, even if the key changed while covering.
        setShown({ key: latest.current.key, children: latest.current.children });
        setRun({ ...run, phase: "revealing" });
      },
      () => {}
    );
    return () => {
      cancelled = true;
      animation.cancel();
    };
  }, [run]);

  // Second half: the new children are committed. Restore focus, report, and reveal.
  useIsomorphicLayoutEffect(() => {
    if (run?.phase !== "revealing") return;
    const wrapper = content.current;
    const active = document.activeElement;
    if (focusWasInside.current && wrapper && (!active || active === document.body)) {
      // Focusable only for as long as it holds focus, so it never joins the tab order.
      wrapper.tabIndex = -1;
      wrapper.addEventListener("blur", () => wrapper.removeAttribute("tabindex"), { once: true });
      wrapper.focus({ preventScroll: true });
    }
    focusWasInside.current = false;
    latest.current.onCovered?.();

    const { mode, direction, half, easing } = run;
    const animation =
      mode === "fade"
        ? play(wrapper, [{ opacity: 0 }, { opacity: 1 }], half, easing)
        : play(
            coverLayer.current,
            [
              { transform: COVERED },
              { transform: coverTransform(direction, OFFSETS[direction][1]) },
            ],
            half,
            easing
          );
    let cancelled = false;
    animation.finished.then(
      () => {
        if (cancelled) return;
        finished.current = true;
        setRun(null);
      },
      () => {}
    );
    return () => {
      cancelled = true;
      animation.cancel();
    };
  }, [run]);

  // Inline resting styles for each phase, so nothing flashes before or between the animations.
  const coverStyle: CSSProperties | undefined = run
    ? {
        transform:
          run.phase === "covering"
            ? coverTransform(run.direction, OFFSETS[run.direction][0])
            : COVERED,
      }
    : undefined;
  const contentStyle: CSSProperties | undefined =
    run?.mode === "fade" && run.phase === "revealing" ? { opacity: 0 } : undefined;

  return (
    <div
      ref={ref}
      data-slot="wipe-transition"
      data-state={run?.phase ?? "idle"}
      data-mode={run?.mode ?? (reduced ? "fade" : mode)}
      data-direction={direction}
      aria-busy={run ? true : undefined}
      className={cn(
        "relative",
        // Contained: the cover stacks and clips within this element. Fixed: it covers the viewport.
        !fixed && "isolate",
        // `clip`, not `hidden`: no scroll container, so sticky descendants keep sticking.
        !fixed && run && "overflow-clip",
        className
      )}
      {...props}
    >
      <div
        ref={content}
        data-slot="wipe-transition-content"
        className={cn("outline-none", run && "pointer-events-none select-none")}
        style={contentStyle}
      >
        {current ? children : shown.children}
      </div>
      {run?.mode === "wipe" ? (
        <div
          ref={coverLayer}
          data-slot="wipe-transition-cover"
          aria-hidden="true"
          className={cn(
            "pointer-events-none inset-0 z-50 grid will-change-transform",
            fixed ? "fixed" : "absolute",
            coverClassName
          )}
          style={coverStyle}
        >
          {cover ?? <div className="bg-primary" />}
        </div>
      ) : null}
    </div>
  );
}

export { WipeTransition, type WipeTransitionProps };
