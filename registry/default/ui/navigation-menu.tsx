"use client";

import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import { createContext, useContext, type ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/** Whether the panels render in the shared viewport or under their own trigger. */
const NavigationMenuViewportContext = createContext(true);

interface NavigationMenuProps extends ComponentProps<typeof NavigationMenuPrimitive.Root> {
  /**
   * Renders every panel in one shared viewport under the list, which resizes
   * and slides between panels. With `false` each panel opens under its own
   * trigger instead.
   */
  viewport?: boolean;
}

/**
 * Site navigation with links and triggers that open panels of more links.
 * It renders a `<nav>` landmark named "Main" by default; pass `aria-label`
 * to name it differently, for example when it sits inside another `<nav>`
 * such as `SiteHeaderNav`. Tab and the arrow keys move between the top-level
 * items; Enter or Space opens a panel, ArrowDown moves into it, and Escape
 * closes it and returns focus to its trigger. Panels also open on hover,
 * after `delayDuration` (200ms). Mark the link to the current page with
 * `active`, which screen readers announce as "current page". With reduced
 * motion panels appear without sliding or zooming.
 *
 * @example
 * <NavigationMenu>
 *   <NavigationMenuList>
 *     <NavigationMenuItem>
 *       <NavigationMenuTrigger>Products</NavigationMenuTrigger>
 *       <NavigationMenuContent>
 *         <NavigationMenuLink href="/analytics">Analytics</NavigationMenuLink>
 *         <NavigationMenuLink href="/billing">Billing</NavigationMenuLink>
 *       </NavigationMenuContent>
 *     </NavigationMenuItem>
 *     <NavigationMenuItem>
 *       <NavigationMenuLink asChild active className={navigationMenuTriggerStyle()}>
 *         <Link href="/docs">Docs</Link>
 *       </NavigationMenuLink>
 *     </NavigationMenuItem>
 *   </NavigationMenuList>
 * </NavigationMenu>
 */
function NavigationMenu({ className, children, viewport = true, ...props }: NavigationMenuProps) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      <NavigationMenuViewportContext.Provider value={viewport}>
        {children}
      </NavigationMenuViewportContext.Provider>
      {viewport ? <NavigationMenuViewport /> : null}
    </NavigationMenuPrimitive.Root>
  );
}

/** The row of top-level items. */
function NavigationMenuList({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

/** One top-level entry: a link, or a trigger with its panel. */
function NavigationMenuItem({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

/** Trigger styles, for top-level links that should look like the triggers next to them. */
const navigationMenuTriggerStyle = cva([
  "group bg-background inline-flex h-9 w-max cursor-pointer items-center justify-center gap-1 rounded-md px-4 py-2 text-sm font-medium",
  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
  "data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent",
  "data-[active]:bg-accent/50 data-[active]:text-accent-foreground",
  "transition-[color,background-color,box-shadow] outline-none motion-reduce:transition-none",
  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  "disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
]);

/**
 * Opens and closes the item's panel. It is a button announced as expanded or
 * collapsed; the chevron turns over while the panel is open.
 */
function NavigationMenuTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        aria-hidden="true"
        data-slot="navigation-menu-trigger-icon"
        className="relative top-px size-3 group-data-[state=open]:rotate-180 motion-safe:transition-transform"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

/**
 * The panel of a trigger. In the shared viewport it slides in from the side
 * of the trigger you came from (`data-motion`); without a viewport it fades
 * and zooms in under its own trigger.
 */
function NavigationMenuContent({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  const viewport = useContext(NavigationMenuViewportContext);
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "top-0 left-0 w-full p-2 md:w-auto",
        viewport
          ? [
              "md:absolute",
              // animate-in/out sit behind motion-safe: so reduced motion really turns them off.
              "motion-safe:data-[motion^=from-]:animate-in motion-safe:data-[motion^=from-]:fade-in",
              "motion-safe:data-[motion^=to-]:animate-out motion-safe:data-[motion^=to-]:fade-out",
              "motion-safe:data-[motion=from-end]:slide-in-from-right-52 motion-safe:data-[motion=from-start]:slide-in-from-left-52",
              "motion-safe:data-[motion=to-end]:slide-out-to-right-52 motion-safe:data-[motion=to-start]:slide-out-to-left-52",
            ]
          : [
              "bg-popover text-popover-foreground absolute top-full z-50 mt-1.5 overflow-hidden rounded-md border shadow-md",
              "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            ],
        className
      )}
      {...props}
    />
  );
}

/**
 * A link in the menu. `active` marks the current page: Radix sets
 * `aria-current="page"` and `data-active`. Selecting a link closes the open
 * panel. Use `asChild` to render your router's link component.
 */
function NavigationMenuLink({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-1 rounded-md p-2 text-sm",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        "data-[active]:bg-accent/50 data-[active]:text-accent-foreground data-[active]:hover:bg-accent data-[active]:focus:bg-accent",
        "transition-[color,background-color,box-shadow] outline-none motion-reduce:transition-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

/** A small arrow under the list that follows the open trigger. Put it right after NavigationMenuList. */
function NavigationMenuIndicator({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        "motion-safe:data-[state=visible]:animate-in data-[state=visible]:fade-in",
        "motion-safe:data-[state=hidden]:animate-out data-[state=hidden]:fade-out",
        className
      )}
      {...props}
    >
      <div className="bg-border relative top-[60%] size-2 rotate-45 rounded-tl-[2px] shadow-md" />
    </NavigationMenuPrimitive.Indicator>
  );
}

/**
 * The shared surface the panels render in. NavigationMenu adds it for you
 * unless `viewport={false}`; it takes the size of the open panel from
 * `--radix-navigation-menu-viewport-width` / `-height`.
 */
function NavigationMenuViewport({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div
      data-slot="navigation-menu-viewport-position"
      className="absolute top-full left-0 isolate z-50 flex justify-center"
    >
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "bg-popover text-popover-foreground relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-top overflow-hidden rounded-md border shadow-md md:w-[var(--radix-navigation-menu-viewport-width)]",
          "transition-[width,height] motion-reduce:transition-none",
          "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90",
          "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      />
    </div>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
  type NavigationMenuProps,
};
