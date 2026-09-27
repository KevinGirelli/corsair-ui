"use client";

import { useEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

const FOLLOW = "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)";
// A slight overshoot on the way back, like a spring settling.
const RELEASE = "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

interface MagneticProps extends ComponentProps<"span"> {
  /** How far the content follows the pointer, as a fraction of its distance from the center. */
  strength?: number;
}

/**
 * Pulls its content toward the mouse while hovered and springs it back on
 * leave. The outer element never moves, so the hit area stays put. Touch,
 * keyboard and `prefers-reduced-motion` get the content unchanged.
 *
 * @example
 * <Magnetic><Button>Get started</Button></Magnetic>
 */
function Magnetic({
  strength = 0.3,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: MagneticProps) {
  const content = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const moveTo = (x: number, y: number, transition: string) => {
    const node = content.current;
    if (!node) return;
    node.style.transition = transition;
    node.style.transform = x || y ? `translate3d(${x}px, ${y}px, 0)` : "";
  };

  return (
    <span
      data-slot="magnetic"
      className={cn("inline-block", className)}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (event.pointerType === "touch" || prefersReducedMotion()) return;
        const target = event.currentTarget;
        const { clientX, clientY } = event;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const bounds = target.getBoundingClientRect();
          moveTo(
            (clientX - bounds.left - bounds.width / 2) * strength,
            (clientY - bounds.top - bounds.height / 2) * strength,
            FOLLOW
          );
        });
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        cancelAnimationFrame(frame.current);
        moveTo(0, 0, RELEASE);
      }}
      {...props}
    >
      <span ref={content} data-slot="magnetic-content" className="inline-block">
        {children}
      </span>
    </span>
  );
}

export { Magnetic, type MagneticProps };
