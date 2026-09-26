"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type { VariantProps } from "class-variance-authority";
import { createContext, useContext, type ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";
import { toggleVariants } from "@/registry/default/ui/toggle";

type ToggleGroupStyle = VariantProps<typeof toggleVariants> & {
  /** 0 joins the items into one bar; 1 and 2 space them apart. */
  spacing?: 0 | 1 | 2;
};

const ToggleGroupContext = createContext<ToggleGroupStyle>({
  variant: "default",
  size: "default",
  spacing: 0,
});

/**
 * A set of toggles: `type="single"` works like a radio group that can be
 * cleared, `type="multiple"` like checkboxes. Give it an `aria-label`.
 */
function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  children,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root> & ToggleGroupStyle) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      data-spacing={spacing}
      className={cn(
        "flex w-fit items-center rounded-md data-[spacing=1]:gap-1 data-[spacing=2]:gap-2",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = useContext(ToggleGroupContext);
  const itemVariant = context.variant ?? variant;
  const itemSize = context.size ?? size;

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={itemVariant ?? "default"}
      data-size={itemSize ?? "default"}
      data-spacing={context.spacing}
      className={cn(
        toggleVariants({ variant: itemVariant, size: itemSize }),
        "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
        // Joined: only the outer corners are rounded and borders do not double up.
        "data-[spacing=0]:rounded-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md",
        "data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
