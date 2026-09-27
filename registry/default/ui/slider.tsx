"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

interface SliderProps extends ComponentProps<typeof SliderPrimitive.Root> {
  /**
   * An accessible name for each thumb, e.g. `["Minimum price", "Maximum price"]`.
   * With one thumb, `aria-label` / `aria-labelledby` on the slider are enough.
   */
  thumbLabels?: string[];
}

/**
 * Pick a number, or a range with two values, by dragging or with the arrow
 * keys. The number of thumbs follows `value` / `defaultValue`.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: SliderProps) {
  const count = (value ?? defaultValue ?? [min]).length;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full cursor-pointer touch-none items-center select-none",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, index) => (
        <SliderPrimitive.Thumb
          // Thumbs are positional (the first is the lower value), so the index is the identity.
          key={index}
          data-slot="slider-thumb"
          aria-label={thumbLabels?.[index] ?? (count === 1 ? ariaLabel : undefined)}
          aria-labelledby={thumbLabels?.[index] ? undefined : ariaLabelledBy}
          className={cn(
            "border-primary bg-background ring-ring/50 block size-4 shrink-0 cursor-grab rounded-full border shadow active:cursor-grabbing",
            "transition-[color,box-shadow] outline-none motion-reduce:transition-none",
            "hover:ring-4 focus-visible:ring-4",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider, type SliderProps };
