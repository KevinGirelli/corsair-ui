"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/registry/default/lib/utils";

interface ColorSwatch {
  /** What the group reports and submits. */
  value: string;
  /** Any CSS colour; defaults to `value`. Theme variables work. */
  color?: string;
  /** Accessible name; defaults to `value`. */
  label?: string;
  disabled?: boolean;
}

const SIZES = { sm: "size-5", default: "size-6", lg: "size-8" };

interface ColorSwatchesProps extends Omit<
  ComponentProps<typeof RadioGroupPrimitive.Root>,
  "children"
> {
  /** CSS colours, or swatches with their own value, label and colour. */
  colors: (string | ColorSwatch)[];
  size?: keyof typeof SIZES;
}

/**
 * Picks one colour from a row of swatches. It is a radio group underneath:
 * arrow keys move between swatches, `name` submits the value with a native
 * form, and `value` / `onValueChange` work inside FormField. Give the group
 * an accessible name with `aria-label` or a FieldLegend.
 *
 * @example
 * <ColorSwatches
 *   aria-label="Sail colour"
 *   defaultValue="brass"
 *   colors={[
 *     { value: "brass", color: "#d9b06a" },
 *     { value: "sea", color: "#6fb3c2" },
 *   ]}
 * />
 */
function ColorSwatches({ colors, size = "default", className, ...props }: ColorSwatchesProps) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="color-swatches"
      orientation="horizontal"
      className={cn("flex flex-wrap items-center gap-2.5", className)}
      {...props}
    >
      {colors.map((entry) => {
        const swatch = typeof entry === "string" ? { value: entry } : entry;
        const color = swatch.color ?? swatch.value;
        return (
          <RadioGroupPrimitive.Item
            key={swatch.value}
            value={swatch.value}
            disabled={swatch.disabled}
            aria-label={swatch.label ?? swatch.value}
            data-slot="color-swatch"
            className={cn(
              "relative shrink-0 cursor-pointer rounded-full bg-[color:var(--swatch)] outline-none",
              // A hairline inside the edge keeps pale swatches visible on pale backgrounds.
              "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]",
              "transition-[transform,box-shadow] duration-200 ease-out active:scale-90 motion-reduce:transition-none",
              // The picked swatch gets a ring in its own colour, with a gap of page colour.
              "data-[state=checked]:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--swatch)]",
              // Focus sits outside that ring rather than on top of it.
              "focus-visible:[outline:2px_solid_var(--ring)] focus-visible:[outline-offset:6px]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              SIZES[size]
            )}
            style={{ "--swatch": color } as CSSProperties}
          />
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}

export { ColorSwatches, type ColorSwatch, type ColorSwatchesProps };
