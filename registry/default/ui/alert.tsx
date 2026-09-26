import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

const alertVariants = cva(
  [
    "bg-card text-card-foreground relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border px-4 py-3 text-sm",
    "has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  ],
  {
    variants: {
      // Every tone shares the neutral surface; only the icon takes the colour.
      variant: {
        default: "[&>svg]:text-foreground",
        destructive: "[&>svg]:text-destructive",
        success: "[&>svg]:text-success",
        warning: "[&>svg]:text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * A message that draws attention. The tone shows on the icon, so put one
 * first; the title should still say what happened on its own.
 *
 * It uses `role="alert"`, which interrupts screen readers: pass
 * `role="status"` for messages that are not urgent.
 */
function Alert({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      data-slot="alert"
      data-variant={variant ?? "default"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 min-h-4 leading-5 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle, alertVariants };
