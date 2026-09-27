"use client";

import {
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
   * without them show it finished.
   */
  trigger?: "in-view" | "scroll";
  /** In-view: total drawing time in ms; longer strokes get a bigger share. */
  duration?: number;
  /** In-view: wait before the first stroke, in ms. */
  delay?: number;
  /** Scroll: the CSS `animation-range` the drawing spans. */
  scrollRange?: string;
  strokeWidth?: number;
}

/**
 * Draws SVG strokes as if by hand: a signature, a route on a map, an
 * underline. Strokes use the current text colour. Give it an `aria-label`
 * when it carries meaning; without one it is hidden from screen readers.
 * With `prefers-reduced-motion` it appears finished.
 *
 * In-view drawings start blank, so they need JavaScript to show up.
 */
function Signature({
  paths,
  trigger = "in-view",
  duration = 2400,
  delay = 0,
  scrollRange = "entry 25% cover 50%",
  strokeWidth = 2,
  className,
  style,
  ref,
  "aria-label": label,
  ...props
}: SignatureProps) {
  const timeline = `--signature-${useId().replace(/[^\w-]/g, "")}`;
  const strokes = useRef<(SVGPathElement | null)[]>([]);
  const [drawing, setDrawing] = useState<{ lengths: number[]; instant: boolean } | null>(null);
  const [observe] = useInView<SVGSVGElement>({
    once: true,
    amount: 0.4,
    onChange: (inView) => {
      if (!inView) return;
      setDrawing({
        lengths: strokes.current.map((path) =>
          typeof path?.getTotalLength === "function" ? path.getTotalLength() : 1
        ),
        instant: prefersReducedMotion(),
      });
    },
  });
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

  const strokeStyle = (index: number): CSSProperties => {
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
      data-state={trigger === "in-view" ? (drawing ? "drawn" : "blank") : undefined}
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
      {paths.map((d, index) => (
        <path
          key={index}
          ref={(node) => {
            strokes.current[index] = node;
          }}
          d={d}
          pathLength={1}
          className={
            trigger === "scroll"
              ? "supports-[animation-timeline:view()]:animate-signature-draw motion-reduce:!animate-none"
              : undefined
          }
          style={strokeStyle(index)}
        />
      ))}
    </svg>
  );
}

export { Signature, type SignatureProps };
