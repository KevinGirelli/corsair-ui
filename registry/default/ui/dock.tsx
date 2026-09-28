"use client";

import { Slot } from "@radix-ui/react-slot";
import { createContext, useContext, useSyncExternalStore, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { useInView } from "@/registry/default/hooks/use-in-view";
import { cn } from "@/registry/default/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/default/ui/tooltip";

type DockPosition = "bottom" | "top";

const DockContext = createContext<DockPosition>("bottom");

const subscribe = () => () => {};

/** False while hydrating server HTML, true once running in the browser. */
function useBrowser() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

function toLength(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}

interface DockProps extends ComponentProps<"nav"> {
  /** Shows (`true`) or hides (`false`) the dock, taking over from `showAfter`. */
  open?: boolean;
  /**
   * How far the page has to scroll before the dock shows: px, or any CSS
   * length such as "80vh". 0 shows it all the time.
   */
  showAfter?: number | string;
  /** Which edge of the viewport it floats on. */
  position?: DockPosition;
  /** Classes for the fixed wrapper that centres the dock. */
  wrapperClassName?: string;
}

/**
 * A floating bar of icon links pinned to the bottom (or top) centre of
 * the viewport. It is a `<nav>` landmark named "Quick links". With
 * `showAfter` it stays out of the way until the page has scrolled that far,
 * found with an IntersectionObserver on an invisible marker at the top of
 * the page, never a scroll listener. While hidden it is `inert`, so it
 * cannot be tabbed into or read, and exposes `data-state="hidden"`; it
 * slides in with a transition that `prefers-reduced-motion` turns off.
 *
 * @example
 * <Dock showAfter="80vh">
 *   <DockItem label="Home" asChild>
 *     <a href="/"><HouseIcon /></a>
 *   </DockItem>
 *   <DockSeparator />
 *   <DockItem label="Search" onClick={openSearch}><SearchIcon /></DockItem>
 * </Dock>
 */
function Dock({
  open,
  showAfter = 0,
  position = "bottom",
  "aria-label": label = "Quick links",
  className,
  wrapperClassName,
  children,
  ...props
}: DockProps) {
  const browser = useBrowser();
  const watching = open === undefined && showAfter !== 0 && showAfter !== "0";
  // Until the observer answers, assume the page is still at the top.
  const [observe, markerInView] = useInView<HTMLDivElement>({ initial: true });
  const supported = browser && typeof IntersectionObserver !== "undefined";
  const visible = open ?? (!watching || !supported || !markerInView);
  const top = position === "top";

  return (
    <>
      {watching && supported
        ? createPortal(
            <div
              ref={observe}
              aria-hidden="true"
              data-slot="dock-sentinel"
              className="pointer-events-none absolute top-0 left-0 w-px"
              style={{ height: toLength(showAfter) }}
            />,
            document.body
          )
        : null}
      <div
        data-slot="dock-wrapper"
        className={cn(
          "pointer-events-none fixed inset-x-0 z-40 flex justify-center",
          top ? "top-6" : "bottom-6",
          wrapperClassName
        )}
      >
        <nav
          aria-label={label}
          data-slot="dock"
          data-state={visible ? "visible" : "hidden"}
          data-position={position}
          inert={!visible ? true : undefined}
          className={cn(
            "bg-background/80 pointer-events-auto flex items-center gap-1 rounded-full border px-2 py-2 shadow-lg backdrop-blur-[8px]",
            "transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
            "data-[state=hidden]:pointer-events-none data-[state=hidden]:opacity-0",
            top
              ? "data-[state=hidden]:-translate-y-[calc(100%_+_1.5rem)]"
              : "data-[state=hidden]:translate-y-[calc(100%_+_1.5rem)]",
            className
          )}
          {...props}
        >
          <DockContext.Provider value={position}>{children}</DockContext.Provider>
        </nav>
      </div>
    </>
  );
}

interface DockItemProps extends ComponentProps<"button"> {
  /** Accessible name of the item, also shown as its tooltip. */
  label: string;
  /** Render the single child element (a link, for example) as the item instead. */
  asChild?: boolean;
}

/**
 * One icon button or link in a Dock. `label` names it for screen readers
 * and shows as a tooltip on hover and on keyboard focus. Icons without a
 * `size-*` class are set to `size-5`; give one its own `size-*` to change it.
 */
function DockItem({ label, asChild = false, className, type, ...props }: DockItemProps) {
  const position = useContext(DockContext);
  const Comp = asChild ? Slot : "button";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Comp
          data-slot="dock-item"
          type={asChild ? type : (type ?? "button")}
          aria-label={label}
          className={cn(
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full",
            "transition-[color,background-color,box-shadow,transform] outline-none active:scale-95 motion-reduce:transition-none",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-[current=page]:text-foreground aria-[current=page]:bg-accent",
            "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
            className
          )}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent side={position === "top" ? "bottom" : "top"} sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** A thin vertical line between groups of items. */
function DockSeparator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      data-slot="dock-separator"
      className={cn("bg-border mx-1 h-6 w-px shrink-0", className)}
      {...props}
    />
  );
}

export { Dock, DockItem, DockSeparator, type DockItemProps, type DockPosition, type DockProps };
