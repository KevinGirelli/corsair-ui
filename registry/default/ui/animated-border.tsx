"use client";

import { useMemo, type ComponentProps, type Ref } from "react";

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

interface AnimatedBorderProps extends ComponentProps<"div"> {
  /** Seconds for the light to go around once. */
  duration?: number;
  /** Colour of the light: any CSS colour, including theme variables. */
  color?: string;
  /** Border width, in px. */
  width?: number;
  /** Classes for the surface inside the border, where the content sits. */
  contentClassName?: string;
}

/**
 * A border with a light travelling around it. The light is one rotating
 * layer (transform only, so the compositor does the work), it pauses while
 * off screen, and it holds still with `prefers-reduced-motion`. Set the
 * radius on the component; the surface inside follows it.
 *
 * The layer is sized from the width, which covers anything up to about
 * 1.7 times taller than it is wide.
 */
function AnimatedBorder({
  duration = 6,
  color = "var(--primary)",
  width = 1,
  className,
  contentClassName,
  style,
  children,
  ref,
  ...props
}: AnimatedBorderProps) {
  const [observe, inView] = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  return (
    <div
      ref={mergedRef}
      data-slot="animated-border"
      className={cn("bg-border relative isolate overflow-hidden rounded-xl", className)}
      style={{ padding: width, ...style }}
      {...props}
    >
      {/* Centered with margins rather than a transform, which the spin would overwrite. */}
      <span
        aria-hidden="true"
        data-slot="animated-border-light"
        className="pointer-events-none absolute top-1/2 left-1/2 -mt-[100%] -ml-[100%] aspect-square w-[200%] animate-spin motion-reduce:animate-none"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 62%, ${color} 82%, transparent 96%)`,
          animationDuration: `${duration}s`,
          animationPlayState: inView ? "running" : "paused",
        }}
      />
      <div
        data-slot="animated-border-content"
        className={cn(
          "bg-card text-card-foreground relative h-full rounded-[inherit]",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { AnimatedBorder, type AnimatedBorderProps };
