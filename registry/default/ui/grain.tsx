import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/registry/default/lib/utils";

/**
 * One tile of noise as an SVG data URI. The filter id lives inside the
 * image's own document, so it never clashes with ids on the page.
 */
function noiseTile(frequency: number, size: number) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

interface GrainProps extends Omit<ComponentProps<"div">, "children"> {
  /** Strength of the grain, from 0 to 1. */
  opacity?: number;
  /** Fineness of the noise (the filter's `baseFrequency`); higher is finer. */
  frequency?: number;
  /** How the grain mixes with what is under it: any CSS `mix-blend-mode`. */
  blend?: CSSProperties["mixBlendMode"];
  /** Cover the whole viewport instead of the nearest positioned parent. */
  fixed?: boolean;
  /** Width and height of one noise tile, in px. */
  size?: number;
  /** Jitter the grain in small steps, like film running through a projector. */
  animated?: boolean;
}

/**
 * Film grain laid over a surface: a tile of SVG noise repeated as a
 * background image, so there is nothing to download and no script to run.
 * It works as a server component and any number can share a page. It is
 * decorative, hidden from screen readers and lets every click through.
 * With `animated`, the grain jitters in steps; `prefers-reduced-motion`
 * keeps it still. Put it inside a positioned element, after the content it
 * covers, or pass `fixed` for the whole page.
 *
 * @example
 * <section className="relative overflow-hidden rounded-xl bg-muted p-10">
 *   <h2>Old harbour</h2>
 *   <Grain opacity={0.2} animated />
 * </section>
 */
function Grain({
  opacity = 0.12,
  frequency = 0.8,
  blend = "overlay",
  fixed = false,
  size = 180,
  animated = false,
  className,
  style,
  ref,
  ...props
}: GrainProps) {
  const tile = Math.max(1, Math.round(size));
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-slot="grain"
      data-animated={animated || undefined}
      className={cn(
        "pointer-events-none overflow-hidden",
        fixed ? "fixed inset-0 z-50" : "absolute inset-0",
        className
      )}
      style={{ opacity: Math.min(Math.max(opacity, 0), 1), mixBlendMode: blend, ...style }}
      {...props}
    >
      <div
        data-slot="grain-noise"
        // Twice the size of the surface, so the jitter never shows an edge.
        className={cn("absolute", animated ? "motion-safe:animate-grain inset-[-50%]" : "inset-0")}
        style={{ backgroundImage: noiseTile(frequency, tile), backgroundSize: `${tile}px` }}
      />
    </div>
  );
}

export { Grain, type GrainProps };
