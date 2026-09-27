import { Slot, Slottable } from "@radix-ui/react-slot";
import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/registry/default/lib/utils";
import { buttonVariants } from "@/registry/default/ui/button";

interface DashButtonProps extends ComponentProps<"button"> {
  size?: "sm" | "default" | "lg";
  /** Render the single child element (a link, for example) with these styles instead. */
  asChild?: boolean;
  /** Colour of the dashed outline. Defaults to the muted foreground. */
  dashColor?: string;
}

/**
 * A pill button that trades its fill for a dashed outline on hover and
 * keyboard focus, with the dashes marching around it. The outline is one
 * SVG rectangle whose corners SVG rounds to the pill for any width, so
 * nothing is measured. The dashes hold still with `prefers-reduced-motion`
 * and stay paused while the button is at rest.
 *
 * @example
 * <DashButton>Plot a course</DashButton>
 */
function DashButton({
  size = "default",
  asChild = false,
  dashColor,
  className,
  children,
  style,
  ...props
}: DashButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="dash-button"
      className={cn(
        buttonVariants({ variant: "secondary", size }),
        "group/dash relative isolate rounded-full hover:bg-transparent focus-visible:bg-transparent",
        className
      )}
      style={{ ...(dashColor ? ({ "--dash-color": dashColor } as CSSProperties) : null), ...style }}
      {...props}
    >
      <svg
        aria-hidden="true"
        data-slot="dash-button-outline"
        className="pointer-events-none absolute inset-0 -z-10 size-full overflow-visible text-[color:var(--dash-color,var(--muted-foreground))] opacity-0 transition-opacity duration-200 group-hover/dash:opacity-100 group-focus-visible/dash:opacity-100 motion-reduce:transition-none"
      >
        {/* SVG clamps rx to half the height, so a large one always draws a pill. */}
        <rect
          width="100%"
          height="100%"
          rx="9999"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="5 3"
          className="motion-safe:animate-dash-march [animation-play-state:paused] group-hover/dash:[animation-play-state:running] group-focus-visible/dash:[animation-play-state:running]"
        />
      </svg>
      <Slottable>{children}</Slottable>
    </Comp>
  );
}

export { DashButton, type DashButtonProps };
