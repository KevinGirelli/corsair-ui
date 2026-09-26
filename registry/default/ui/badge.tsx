import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
    "transition-[color,background-color,border-color,box-shadow] outline-none motion-reduce:transition-none",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80 border-transparent",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Status tones keep the neutral outline and put the colour on a dot,
        // or on the icon when there is one.
        destructive:
          "border-border text-foreground before:bg-destructive [&>svg]:text-destructive [a&]:hover:bg-accent before:size-1.5 before:shrink-0 before:rounded-full has-[>svg]:before:hidden",
        success:
          "border-border text-foreground before:bg-success [&>svg]:text-success [a&]:hover:bg-accent before:size-1.5 before:shrink-0 before:rounded-full has-[>svg]:before:hidden",
        warning:
          "border-border text-foreground before:bg-warning [&>svg]:text-warning [a&]:hover:bg-accent before:size-1.5 before:shrink-0 before:rounded-full has-[>svg]:before:hidden",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  /** Render the single child element (a link, for example) with the badge styles instead. */
  asChild?: boolean;
}

/**
 * Short status or metadata label. The status tones (success, warning,
 * destructive) show a coloured dot, or colour the icon if you put one first;
 * the text stays neutral, so it has to say what the status is.
 */
function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? "default"}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type BadgeProps };
