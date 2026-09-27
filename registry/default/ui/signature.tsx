"use client";

import {
  useEffect,
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

// Strokes speed up and slow down like a pen.
const PEN = "cubic-bezier(0.65, 0, 0.35, 1)";
// A hair past a full length, so round caps leave no dot before drawing starts.
const UNDRAWN = 1.01;

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

interface SignatureProps extends Omit<ComponentProps<"svg">, "children"> {
  /** SVG path data, drawn in this order. Use the same coordinates as `viewBox`. */
  paths: string[];
  /**
   * "in-view" draws once when the drawing scrolls into view. "scroll" draws
   * with the scroll position, on CSS scroll-driven animations; browsers
   * without them show it finished. Scroll follows the nearest scroll
   * container: clip ancestors with `overflow-clip`, as `overflow-hidden` makes
   * one that never scrolls. "manual" follows `progress` and nothing else,
   * for drawings driven by your own timeline, a slider or a scroll hook.
   */
  trigger?: "in-view" | "scroll" | "manual";
  /**
   * Manual: how much is drawn, from 0 to 1. Strokes are drawn in order, each
   * taking a share of the progress proportional to its length.
   */
  progress?: number;
  /** In-view: total drawing time in ms; longer strokes get a bigger share. */
  duration?: number;
  /** In-view: wait before the first stroke, in ms. */
  delay?: number;
  /** Scroll: the CSS `animation-range` the drawing spans. */
  scrollRange?: string;
  /**
   * Width of the pen. With `ink`, 0 draws the fill alone, without the
   * outline strokes.
   */
  strokeWidth?: number;
  /**
   * Fill the shapes as the pen passes, like ink soaking into letters. For
   * closed outlines such as glyphs; leave it off for open lines and routes.
   */
  ink?: boolean;
  /** Ink: how wide it spreads behind the pen, in viewBox units. */
  inkWidth?: number;
}

/**
 * Draws SVG strokes as if by hand: a signature, a route on a map, an
 * underline. Strokes use the current text colour; with `ink`, closed
 * shapes fill in behind the pen. Give it an `aria-label` when it carries
 * meaning; without one it is hidden from screen readers. With
 * `prefers-reduced-motion` it appears finished. To write any text in a
 * font of your choice, see TextSignature.
 *
 * In-view drawings start blank, so they need JavaScript to show up.
 *
 * With `trigger="manual"` the drawing follows `progress` and nothing else:
 * no observer and no transition, and `prefers-reduced-motion` does not
 * finish it for you, as the parent is in charge. Pass 1 when it should
 * appear finished, e.g. when your own timeline is off for reduced motion.
 *
 * Outlines with holes (the counters of "o" or "B") fill correctly with
 * `fillRule="evenodd"` on the component: the ink inherits it from the svg.
 *
 * @example
 * <Signature
 *   aria-label="Signed, the captain"
 *   viewBox="0 0 200 60"
 *   paths={["M10 40 C 40 10, 60 60, 90 30", "M100 35 L 190 35"]}
 *   className="text-foreground w-48"
 * />
 *
 * @example
 * // Driven by your own progress, from 0 to 1.
 * <Signature trigger="manual" progress={value} paths={paths} viewBox="0 0 200 60" />
 */
function Signature({
  paths,
  trigger = "in-view",
  duration = 2400,
  delay = 0,
  progress = 0,
  scrollRange = "entry 25% cover 50%",
  strokeWidth = 2,
  ink = false,
  inkWidth = 14,
  className,
  style,
  ref,
  "aria-label": label,
  ...props
}: SignatureProps) {
  const id = useId().replace(/[^\w-]/g, "");
  const timeline = `--signature-${id}`;
  const maskId = `signature-ink-${id}`;
  // With ink and no pen, only the fill shows: the outline strokes are left out.
  const showStrokes = !(ink && strokeWidth === 0);
  // The paths measured for timing: the strokes, or the ink mask without them.
  const measured = useRef<(SVGPathElement | null)[]>([]);
  const measure = () =>
    paths.map((_, index) => {
      const path = measured.current[index];
      return typeof path?.getTotalLength === "function" ? path.getTotalLength() : 1;
    });
  const [drawing, setDrawing] = useState<{ lengths: number[]; instant: boolean } | null>(null);
  const [observe] = useInView<SVGSVGElement>({
    once: true,
    amount: 0.4,
    onChange: (inView) => {
      if (!inView) return;
      setDrawing({ lengths: measure(), instant: prefersReducedMotion() });
    },
  });
  // Manual: lengths are measured once mounted; until then every stroke gets an equal share.
  const pathsKey = paths.join("\n");
  const [manualLengths, setManualLengths] = useState<{ key: string; lengths: number[] } | null>(
    null
  );
  useEffect(() => {
    if (trigger !== "manual") return;
    // Measured before the next paint, once layout has the paths.
    const frame = requestAnimationFrame(() =>
      setManualLengths({ key: pathsKey, lengths: measure() })
    );
    return () => cancelAnimationFrame(frame);
    // `measure` reads the current paths, which `pathsKey` stands for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, pathsKey, showStrokes]);
  const mergedRef = useMemo(
    () => mergeRefs(ref, trigger === "in-view" ? observe : undefined),
    [ref, observe, trigger]
  );

  // Each stroke gets a share of `duration` proportional to its length, and
  // starts when the previous one ends.
  const total = drawing?.lengths.reduce((sum, length) => sum + length, 0) || 1;
  const timings = (drawing?.lengths ?? []).map((length) => (length / total) * duration);
  const waits = timings.map(
    (_, index) => delay + timings.slice(0, index).reduce((sum, share) => sum + share, 0)
  );

  // Manual: where each stroke starts and ends along the whole drawing, from 0 to 1.
  const manualShares = (() => {
    if (trigger !== "manual") return [];
    const lengths =
      manualLengths?.key === pathsKey && manualLengths.lengths.length === paths.length
        ? manualLengths.lengths
        : paths.map(() => 1);
    const sum = lengths.reduce((a, b) => a + b, 0) || 1;
    let start = 0;
    return lengths.map((length) => {
      const share = { start: start / sum, size: length / sum };
      start += length;
      return share;
    });
  })();
  const drawn = Math.min(Math.max(Number.isFinite(progress) ? progress : 0, 0), 1);

  const drawClass =
    trigger === "scroll"
      ? "supports-[animation-timeline:view()]:animate-signature-draw motion-reduce:!animate-none"
      : undefined;

  const strokeStyle = (index: number): CSSProperties => {
    if (trigger === "manual") {
      const share = manualShares[index];
      const local = share
        ? share.size > 0
          ? Math.min(Math.max((drawn - share.start) / share.size, 0), 1)
          : drawn >= share.start
            ? 1
            : 0
        : 0;
      return { strokeDasharray: "1 2", strokeDashoffset: local <= 0 ? UNDRAWN : 1 - local };
    }
    if (trigger === "scroll") {
      return {
        strokeDasharray: "1 2",
        strokeDashoffset: 0,
        animationTimeline: timeline,
        animationRange: scrollRange,
      };
    }
    if (!drawing) return { strokeDasharray: "1 2", strokeDashoffset: UNDRAWN };
    return {
      strokeDasharray: "1 2",
      strokeDashoffset: 0,
      transition: drawing.instant
        ? undefined
        : `stroke-dashoffset ${timings[index] ?? 0}ms ${PEN} ${waits[index] ?? 0}ms`,
    };
  };

  return (
    <svg
      ref={mergedRef}
      data-slot="signature"
      data-trigger={trigger}
      data-state={
        trigger === "in-view"
          ? drawing
            ? "drawn"
            : "blank"
          : trigger === "manual"
            ? drawn >= 1
              ? "drawn"
              : drawn <= 0
                ? "blank"
                : "drawing"
            : undefined
      }
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("overflow-visible", className)}
      style={{ ...(trigger === "scroll" ? { viewTimelineName: timeline } : null), ...style }}
      {...props}
    >
      {ink ? (
        <>
          {/*
            Wide strokes drawn in step with the pen reveal the filled shapes
            behind it. The mask region stays the default, around the shapes'
            own box, so it covers them whatever the viewBox.
          */}
          <mask id={maskId}>
            <g stroke="white" strokeWidth={inkWidth}>
              {paths.map((d, index) => (
                <path
                  key={index}
                  ref={
                    showStrokes
                      ? undefined
                      : (node) => {
                          measured.current[index] = node;
                        }
                  }
                  d={d}
                  pathLength={1}
                  className={drawClass}
                  style={strokeStyle(index)}
                />
              ))}
            </g>
          </mask>
          <g mask={`url(#${maskId})`} fill="currentColor" stroke="none">
            {paths.map((d, index) => (
              <path key={index} d={d} />
            ))}
          </g>
        </>
      ) : null}
      {showStrokes
        ? paths.map((d, index) => (
            <path
              key={index}
              ref={(node) => {
                measured.current[index] = node;
              }}
              d={d}
              pathLength={1}
              className={drawClass}
              style={strokeStyle(index)}
            />
          ))
        : null}
    </svg>
  );
}

export { Signature, type SignatureProps };
