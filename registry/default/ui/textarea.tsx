import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/** Multi-line text control with the same states as Input. */
function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-field flex min-h-16 w-full resize-y rounded-md border px-3 py-2 text-base md:text-sm",
        "transition-[color,box-shadow] outline-none motion-reduce:transition-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
