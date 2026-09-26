import { LoaderCircleIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/**
 * A status indicator for work in progress. It is announced as "Loading" by
 * default; pass a more specific `aria-label` when you can ("Saving draft").
 * Inside a Button, use the Button's `loading` prop instead.
 */
function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <LoaderCircleIcon
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      className={cn(
        "size-4 animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]",
        className
      )}
      {...props}
    />
  );
}

export { Spinner };
