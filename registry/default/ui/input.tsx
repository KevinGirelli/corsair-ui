import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/**
 * Text control. It reads `aria-invalid` for its error state, so any form
 * library (or none) can drive it.
 */
function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-field h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base md:text-sm",
        "transition-[color,border-color,box-shadow] outline-none motion-reduce:transition-none",
        "selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
