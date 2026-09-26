import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Input } from "@/registry/default/ui/input";

/**
 * An input with icons, text or buttons attached. The group draws the border
 * and the focus ring; the input inside is borderless.
 *
 * @example
 * <InputGroup>
 *   <InputGroupAddon><SearchIcon /></InputGroupAddon>
 *   <InputGroupInput placeholder="Search" aria-label="Search" />
 * </InputGroup>
 */
function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="input-group"
      className={cn(
        "border-input bg-field relative flex h-9 w-full min-w-0 items-center rounded-md border",
        "transition-[color,border-color,box-shadow] outline-none motion-reduce:transition-none",
        "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]",
        "has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive/20",
        "has-[[data-slot=input-group-control]:disabled]:opacity-50",
        className
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "text-muted-foreground flex h-full shrink-0 items-center gap-2 text-sm select-none [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3",
        "inline-end": "order-last pr-3",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
);

/** Icons, text or a small button on either side of the input. Order in the markup does not matter. */
function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="input-group-text"
      className={cn("text-muted-foreground flex items-center gap-2 text-sm", className)}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "h-full flex-1 rounded-none border-0 bg-transparent",
        "focus-visible:ring-0 disabled:opacity-100 aria-[invalid=true]:ring-0",
        className
      )}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText };
