"use client";

import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/**
 * Decorative by default (hidden from assistive tech); pass `decorative={false}`
 * when it separates content semantically. Its size comes from plain classes, so
 * `className="w-8"` (or `h-4` on a vertical one) replaces the default length.
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0",
        orientation === "vertical" ? "h-full w-px" : "h-px w-full",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
