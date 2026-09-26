import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/**
 * Placeholder shape while content loads. It is hidden from assistive tech;
 * mark the loading region with `aria-busy` so the wait is announced there.
 */
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
