"use client";

import { useMemo, type ComponentProps, type CSSProperties, type Ref } from "react";

import { useEntrance, type EntranceTrigger } from "@/registry/default/hooks/use-entrance";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

interface StampProps extends Omit<ComponentProps<"span">, "onAnimationEnd"> {
  as?: "span" | "div";
  /** Angle the stamp lands at, in degrees. */
  rotate?: number;
  /** Scale the stamp starts from before it slams down. */
  from?: number;
  /** "load" plays on first paint with CSS alone; "in-view" when the stamp scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: play the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds the stamp up, `true` slams it down. */
  play?: boolean;
  /** Wait before the stamp falls, in ms. */
  delay?: number;
  /** How long the slam takes, in ms. */
  duration?: number;
  /** Called once the stamp has landed. */
  onAnimationComplete?: () => void;
}

/**
 * A rubber stamp that slams onto the page: it starts large and transparent,
 * then lands rotated with a small overshoot. The content stays readable for
 * screen readers, and the server HTML and `prefers-reduced-motion` show the
 * stamp already in place.
 *
 * @example
 * <Stamp className="border-primary text-primary rounded-md border-2 px-3 py-1 font-bold tracking-widest uppercase">Sold out</Stamp>
 */
function Stamp({
  as: Tag = "span",
  rotate = -8,
  from = 1.6,
  trigger = "in-view",
  once = true,
  play,
  delay = 0,
  duration = 320,
  onAnimationComplete,
  className,
  style,
  ref,
  ...props
}: StampProps) {
  const [observe, phase] = useEntrance<HTMLElement>({ trigger, once, play });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  const stampStyle = {
    "--stamp-rotate": `${rotate}deg`,
    "--stamp-from": `${from}`,
    ...(phase === "static"
      ? {}
      : {
          animationDuration: `${duration}ms`,
          animationDelay: `${delay}ms`,
          animationPlayState: phase === "armed" ? "paused" : undefined,
        }),
    ...style,
  } as CSSProperties;

  return (
    <Tag
      ref={mergedRef as Ref<never>}
      data-slot="stamp"
      data-state={phase}
      className={cn(
        "inline-block [transform:rotate(var(--stamp-rotate))]",
        phase !== "static" && "motion-safe:animate-stamp",
        className
      )}
      style={stampStyle}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onAnimationComplete?.();
      }}
      {...props}
    />
  );
}

export { Stamp, type StampProps };
