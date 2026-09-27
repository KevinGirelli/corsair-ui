"use client";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";
interface ProgressProps extends ComponentProps<typeof ProgressPrimitive.Root> {
  /** How far along the task is, from 0 to `max`. `null` (the default) means the amount is unknown. */
  value?: number | null;
  /** The value that means done. */
  max?: number;
}
/**
 * A bar that shows how far a task has got: uploads, installs, multi-step
 * forms. It is a `progressbar` with `aria-valuenow` / `aria-valuemax`, and
 * `getValueLabel` sets the text screen readers read out (a percentage by
 * default). Give it a name with `aria-label` or `aria-labelledby` pointing
 * at a visible label. Pass `value={null}` when the amount is unknown: the
 * bar becomes indeterminate (`data-state="indeterminate"`) and a short
 * segment slides across it; with reduced motion it shows a still,
 * half-opacity bar instead. Values outside 0 to `max` are clamped.
 *
 * @example
 * <Progress value={uploaded} max={total} aria-label="Uploading photos" />
 * <Progress value={null} aria-label="Loading results" />
 */
function Progress({ className, value = null, max = 100, ...props }: ProgressProps) {
  const limit = max > 0 ? max : 100;
  const clamped = value === null ? null : Math.min(limit, Math.max(0, value));
  const percent = clamped === null ? 0 : (clamped / limit) * 100;
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={clamped}
      max={limit}
      className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "bg-primary h-full w-full flex-1 transition-transform motion-reduce:transition-none",
          // Unknown amount: a 40% segment slides across. With reduced motion the
          // whole bar stays put at half opacity instead.
          "motion-safe:data-[state=indeterminate]:animate-progress-indeterminate motion-safe:data-[state=indeterminate]:w-2/5",
          "motion-reduce:data-[state=indeterminate]:opacity-50"
        )}
        style={clamped === null ? undefined : { transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
export { Progress, type ProgressProps };
