import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/registry/default/lib/utils";

const BARS = Array.from({ length: 12 }, (_, index) => index);

interface BarsSpinnerProps extends ComponentProps<"span"> {
  /** Width and height, as a CSS length or a number of px. Or size it with a `size-*` class. */
  size?: number | string;
}

/**
 * Twelve bars around a hub, fading one after another. It takes the current
 * text colour and is announced as "Loading"; pass a more specific
 * `aria-label` when you can ("Syncing charts"). With `prefers-reduced-motion`
 * it turns at half speed rather than stopping, since it reports progress.
 * No JavaScript: it works in server components.
 */
function BarsSpinner({ size, className, style, ...props }: BarsSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      data-slot="bars-spinner"
      className={cn(
        "relative inline-block size-4 shrink-0 [--bars-spinner-period:1s] motion-reduce:[--bars-spinner-period:2s]",
        className
      )}
      style={{ ...(size === undefined ? null : { width: size, height: size }), ...style }}
      {...props}
    >
      {BARS.map((index) => (
        <span
          key={index}
          aria-hidden="true"
          className="animate-bars-spinner absolute top-[45.5%] left-[37%] h-[9%] w-[26%] rounded-full bg-current"
          style={
            {
              transform: `rotate(${index * 30}deg) translate(140%)`,
              animationDuration: "var(--bars-spinner-period)",
              // Negative delays start every bar part-way through, so the wheel turns from the first frame.
              animationDelay: `calc(var(--bars-spinner-period) * ${(index - 12) / 12})`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

export { BarsSpinner, type BarsSpinnerProps };
