"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { createContext, useContext, type ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

const tabsListVariants = cva(
  "text-muted-foreground inline-flex w-fit items-center data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
  {
    variants: {
      variant: {
        default: "bg-muted h-9 justify-center rounded-lg p-[3px]",
        line: "gap-4 border-b data-[orientation=vertical]:gap-1 data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-l",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const tabsTriggerVariants = cva(
  [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap",
    "hover:text-foreground data-[state=active]:text-foreground",
    "transition-[color,background-color,border-color,box-shadow] outline-none motion-reduce:transition-none",
    "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: [
          "h-full flex-1 rounded-md border border-transparent px-2 py-1",
          "data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]",
          "data-[orientation=vertical]:justify-start",
        ],
        line: [
          "-mb-px rounded-t-md border-b-2 border-transparent px-1 pt-1.5 pb-2",
          "data-[state=active]:border-primary",
          "data-[orientation=vertical]:mb-0 data-[orientation=vertical]:-ml-px data-[orientation=vertical]:justify-start data-[orientation=vertical]:rounded-t-none data-[orientation=vertical]:rounded-r-md data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-l-2 data-[orientation=vertical]:px-3 data-[orientation=vertical]:py-1.5",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type TabsVariant = NonNullable<VariantProps<typeof tabsListVariants>["variant"]>;

const TabsVariantContext = createContext<TabsVariant>("default");

/**
 * Sections of content shown one at a time. The tab list is a single Tab
 * stop: arrow keys move between tabs (Up and Down with
 * `orientation="vertical"`), Home and End jump to the ends, and the panel
 * that goes with a tab is linked to it for screen readers. Controlled with
 * `value` / `onValueChange` or uncontrolled with `defaultValue`.
 *
 * @example
 * <Tabs defaultValue="account">
 *   <TabsList aria-label="Settings">
 *     <TabsTrigger value="account">Account</TabsTrigger>
 *     <TabsTrigger value="billing">Billing</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="account">…</TabsContent>
 *   <TabsContent value="billing">…</TabsContent>
 * </Tabs>
 */
function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  );
}

interface TabsListProps
  extends ComponentProps<typeof TabsPrimitive.List>, VariantProps<typeof tabsListVariants> {}

/**
 * The row of tabs. `variant="default"` is a segmented control on a muted
 * background; `variant="line"` underlines the active tab. The triggers
 * inside pick the variant up, and expose it as `data-variant`.
 */
function TabsList({ className, variant, children, ...props }: TabsListProps) {
  const resolved = variant ?? "default";

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={resolved}
      className={cn(tabsListVariants({ variant: resolved }), className)}
      {...props}
    >
      <TabsVariantContext.Provider value={resolved}>{children}</TabsVariantContext.Provider>
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = useContext(TabsVariantContext);

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-variant={variant}
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

/** The panel of one tab. It takes focus with Tab from the active tab, so its content is reachable. */
function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "focus-visible:ring-ring/50 flex-1 rounded-md text-sm outline-none focus-visible:ring-[3px]",
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants, type TabsListProps };
