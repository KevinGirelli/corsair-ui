"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type MouseEvent,
  type RefObject,
} from "react";

import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";
import { Button, type ButtonProps } from "@/registry/default/ui/button";
import { Separator } from "@/registry/default/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/registry/default/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/default/ui/tooltip";

const SIDEBAR_MOBILE_QUERY = "(max-width: 767px)";
const SIDEBAR_WIDTH_ICON = "3rem";

type SidebarState = "expanded" | "collapsed";
type SidebarSide = "left" | "right";
type SidebarCollapsible = "icon" | "offcanvas" | "none";

interface SidebarContextValue {
  /** Whether the desktop sidebar is expanded. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Opens or closes the sidebar for the current viewport: the column on desktop, the sheet on mobile. */
  toggle: () => void;
  /** True below 768px, where the sidebar is a sheet. */
  isMobile: boolean;
  /** Whether the mobile sheet is open. */
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  /** `open` as a word, for `data-state`. */
  state: SidebarState;
}

interface SidebarInternals extends SidebarContextValue {
  sidebarId: string;
  width: string;
  shortcut: string | null;
  /** Where focus goes back to when the mobile sheet closes. */
  returnFocusRef: RefObject<HTMLElement | null>;
}

const SidebarContext = createContext<SidebarInternals | null>(null);

function useSidebarInternals() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used inside a SidebarProvider.");
  return context;
}

/**
 * The sidebar's state, for building your own controls: `open` / `setOpen`
 * for the desktop column, `openMobile` / `setOpenMobile` for the mobile
 * sheet, `toggle` for whichever applies, `isMobile` and `state`. Call
 * `setOpenMobile(false)` after navigating to close the sheet on phones.
 * Throws outside a `SidebarProvider`.
 *
 * @example
 * const { state, toggle } = useSidebar();
 */
function useSidebar(): SidebarContextValue {
  const { open, setOpen, toggle, isMobile, openMobile, setOpenMobile, state } =
    useSidebarInternals();
  return { open, setOpen, toggle, isMobile, openMobile, setOpenMobile, state };
}

interface SidebarProviderProps extends ComponentProps<"div"> {
  /** Controlled: whether the desktop sidebar is expanded. */
  open?: boolean;
  /** Uncontrolled: whether the desktop sidebar starts expanded. */
  defaultOpen?: boolean;
  /** Called when the desktop sidebar expands or collapses. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Key that toggles the sidebar together with ⌘ (macOS) or Ctrl. `null`
   * turns the shortcut off.
   */
  shortcut?: string | null;
  /** Width of the expanded sidebar, any CSS length. Sets `--sidebar-width`. */
  width?: string;
}

/**
 * Holds the state of an application sidebar and lays it out next to the
 * page: a flex row with `Sidebar` and `SidebarInset` inside. On desktop the
 * sidebar collapses and expands; below 768px it becomes a sheet that opens
 * over the page. ⌘B / Ctrl+B toggles it (change the key with `shortcut`,
 * turn it off with `null`). Controlled with `open` / `onOpenChange` or
 * uncontrolled with `defaultOpen`. The widths are the CSS variables
 * `--sidebar-width` and `--sidebar-width-icon` on the wrapper.
 *
 * @example
 * <SidebarProvider>
 *   <Sidebar>
 *     <SidebarContent>…</SidebarContent>
 *   </Sidebar>
 *   <SidebarInset>
 *     <SidebarTrigger />
 *     …
 *   </SidebarInset>
 * </SidebarProvider>
 */
function SidebarProvider({
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  shortcut = "b",
  width = "16rem",
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const isMobile = useMediaQuery(SIDEBAR_MOBILE_QUERY);
  const sidebarId = useId();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [openState, setOpenState] = useState(defaultOpen);
  const [openMobile, setOpenMobileState] = useState(false);
  const open = openProp ?? openState;

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange]
  );

  const setOpenMobile = useCallback((next: boolean) => {
    // Remember what had focus, so closing the sheet can hand it back.
    if (next && document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = document.activeElement;
    }
    setOpenMobileState(next);
  }, []);

  const toggle = useCallback(() => {
    if (isMobile) setOpenMobile(!openMobile);
    else setOpen(!open);
  }, [isMobile, open, openMobile, setOpen, setOpenMobile]);

  useEffect(() => {
    if (!shortcut) return;
    const key = shortcut.toLowerCase();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, toggle]);

  const state: SidebarState = open ? "expanded" : "collapsed";
  const value = useMemo<SidebarInternals>(
    () => ({
      open,
      setOpen,
      toggle,
      isMobile,
      openMobile,
      setOpenMobile,
      state,
      sidebarId,
      width,
      shortcut,
      returnFocusRef,
    }),
    [open, setOpen, toggle, isMobile, openMobile, setOpenMobile, state, sidebarId, width, shortcut]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        data-state={state}
        className={cn("flex min-h-svh w-full", className)}
        style={
          {
            "--sidebar-width": width,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

interface SidebarPanelContextValue {
  /** Collapsed to a strip of icons: text is visually hidden and tooltips take over. */
  iconCollapsed: boolean;
  side: SidebarSide;
}

const SidebarPanelContext = createContext<SidebarPanelContextValue>({
  iconCollapsed: false,
  side: "left",
});

interface SidebarProps extends Omit<ComponentProps<"aside">, "id"> {
  /** The edge of the page the sidebar sits on. */
  side?: SidebarSide;
  /**
   * What collapsing does: `icon` shrinks it to a strip of icons, `offcanvas`
   * slides it out of view, `none` keeps it expanded.
   */
  collapsible?: SidebarCollapsible;
  /** Title of the mobile sheet, which names it for screen readers (visually hidden). */
  mobileLabel?: string;
}

/**
 * The sidebar itself. On desktop it is an `<aside>` column (a complementary
 * landmark named by `aria-label`, "Sidebar" by default) with `data-state`,
 * `data-collapsible` and `data-side` for styling; its width animates when it
 * collapses, except with reduced motion. Collapsed to icons, every menu
 * button keeps its accessible name (the text is visually hidden, not
 * removed) and shows a tooltip on hover and focus. Collapsed off-canvas, it
 * is inert, so its links leave the Tab order. Below 768px it renders in a
 * Sheet instead: a dialog that traps focus, closes on Escape and gives
 * focus back to what opened it. Its id comes from the provider and is the
 * target of `SidebarTrigger`'s `aria-controls`.
 *
 * @example
 * <Sidebar collapsible="icon" aria-label="Main">
 *   <SidebarHeader>Acme</SidebarHeader>
 *   <SidebarContent>
 *     <SidebarGroup>
 *       <SidebarGroupLabel>Workspace</SidebarGroupLabel>
 *       <SidebarMenu>
 *         <SidebarMenuItem>
 *           <SidebarMenuButton asChild isActive tooltip="Inbox">
 *             <a href="/inbox">
 *               <InboxIcon aria-hidden="true" />
 *               <span>Inbox</span>
 *             </a>
 *           </SidebarMenuButton>
 *         </SidebarMenuItem>
 *       </SidebarMenu>
 *     </SidebarGroup>
 *   </SidebarContent>
 * </Sidebar>
 */
function Sidebar({
  side = "left",
  collapsible = "icon",
  mobileLabel = "Navigation",
  "aria-label": label = "Sidebar",
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, openMobile, setOpenMobile, state, sidebarId, width, returnFocusRef } =
    useSidebarInternals();

  if (isMobile && collapsible !== "none") {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          id={sidebarId}
          side={side}
          showCloseButton={false}
          data-slot="sidebar"
          data-mobile="true"
          data-side={side}
          aria-describedby={undefined}
          className="bg-card text-card-foreground w-[var(--sidebar-width)] gap-0 p-0"
          style={{ "--sidebar-width": width } as CSSProperties}
          onCloseAutoFocus={(event) => {
            // No SheetTrigger to return to: hand focus back to what opened it.
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <SheetTitle className="sr-only">{mobileLabel}</SheetTitle>
          <SidebarPanelContext.Provider value={{ iconCollapsed: false, side }}>
            <div data-slot="sidebar-inner" className="flex h-full w-full flex-col">
              {children}
            </div>
          </SidebarPanelContext.Provider>
        </SheetContent>
      </Sheet>
    );
  }

  const resolvedState: SidebarState = collapsible === "none" ? "expanded" : state;
  const collapsed = resolvedState === "collapsed";
  const iconCollapsed = collapsed && collapsible === "icon";
  const offcanvasCollapsed = collapsed && collapsible === "offcanvas";

  return (
    <aside
      id={sidebarId}
      data-slot="sidebar"
      data-state={resolvedState}
      data-collapsible={collapsible}
      data-side={side}
      aria-label={label}
      inert={offcanvasCollapsed ? true : undefined}
      className={cn(
        "group/sidebar text-card-foreground sticky top-0 h-svh w-[var(--sidebar-width)] shrink-0 overflow-hidden",
        collapsible === "none" ? "flex" : "hidden md:flex",
        "transition-[width] ease-linear motion-reduce:transition-none",
        side === "right" && "justify-end",
        iconCollapsed && "w-[var(--sidebar-width-icon)]",
        offcanvasCollapsed && "w-0",
        className
      )}
      {...props}
    >
      <div
        data-slot="sidebar-inner"
        className={cn(
          "bg-card flex h-full w-[var(--sidebar-width)] shrink-0 flex-col",
          "transition-transform ease-linear motion-reduce:transition-none",
          side === "left" ? "border-r" : "border-l",
          collapsible === "icon" && "w-full",
          offcanvasCollapsed && (side === "left" ? "-translate-x-full" : "translate-x-full")
        )}
      >
        <SidebarPanelContext.Provider value={{ iconCollapsed, side }}>
          {children}
        </SidebarPanelContext.Provider>
      </div>
    </aside>
  );
}

interface SidebarTriggerProps extends ButtonProps {
  /** Accessible name of the button. */
  label?: string;
}

/**
 * The button that expands and collapses the sidebar (or opens the sheet on
 * mobile). It reports `aria-expanded`, points `aria-controls` at the sidebar
 * and announces the keyboard shortcut through `aria-keyshortcuts`.
 *
 * @example
 * <SidebarTrigger label="Toggle navigation" />
 */
function SidebarTrigger({
  label = "Toggle sidebar",
  className,
  onClick,
  children,
  ...props
}: SidebarTriggerProps) {
  const { toggle, isMobile, open, openMobile, sidebarId, shortcut, returnFocusRef } =
    useSidebarInternals();
  const expanded = isMobile ? openMobile : open;
  const key = shortcut ? shortcut.toUpperCase() : null;

  return (
    <Button
      data-slot="sidebar-trigger"
      data-state={expanded ? "expanded" : "collapsed"}
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-expanded={expanded}
      // The mobile sheet only exists while open.
      aria-controls={!isMobile || openMobile ? sidebarId : undefined}
      aria-keyshortcuts={key ? `Meta+${key} Control+${key}` : undefined}
      className={cn("size-7", className)}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        toggle();
        // Safari does not focus buttons on click: remember the trigger itself.
        returnFocusRef.current = event.currentTarget;
      }}
      {...props}
    >
      {children ?? <PanelLeftIcon aria-hidden="true" />}
    </Button>
  );
}

/** The top of the sidebar: brand, workspace switcher. */
function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

/** The scrolling middle of the sidebar, between header and footer. */
function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  const { iconCollapsed } = useContext(SidebarPanelContext);
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto",
        iconCollapsed && "overflow-x-hidden",
        className
      )}
      {...props}
    />
  );
}

/** The bottom of the sidebar: account menu, settings. */
function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

/** A section of the sidebar, usually a label and a menu. */
function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
}

/**
 * The heading of a group. Collapsed to icons it is visually hidden but
 * still read by screen readers.
 */
function SidebarGroupLabel({ className, ...props }: ComponentProps<"div">) {
  const { iconCollapsed } = useContext(SidebarPanelContext);
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "text-muted-foreground flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium",
        iconCollapsed && "sr-only",
        className
      )}
      {...props}
    />
  );
}

/** A list of menu items (`<ul>`), so screen readers announce how many there are. */
function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

/** One entry of a SidebarMenu (`<li>`): a button or link, and optionally a badge. */
function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  [
    "flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm",
    "transition-[width,height,padding,color,background-color,box-shadow] outline-none motion-reduce:transition-none",
    "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-medium",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "group-has-[[data-slot=sidebar-menu-badge]]/menu-item:pr-8",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>span:last-child]:truncate",
  ],
  {
    variants: {
      size: {
        default: "h-8",
        sm: "h-7 text-xs",
        lg: "h-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

interface SidebarMenuButtonProps
  extends ComponentProps<"button">, VariantProps<typeof sidebarMenuButtonVariants> {
  /** Render the single child (a link, a router Link) with the button styles instead. */
  asChild?: boolean;
  /**
   * Marks the entry as the current one: `data-active`, and with `asChild`
   * (a link) `aria-current="page"`.
   */
  isActive?: boolean;
  /** Shown in a tooltip while the sidebar is collapsed to icons. */
  tooltip?: string;
}

/**
 * A button or, with `asChild`, a link in the sidebar menu. Put the icon
 * first and the text in a `<span>`: collapsed to icons, the text is visually
 * hidden and stays the accessible name, and `tooltip` appears on hover and
 * keyboard focus. The active link is announced as the current page.
 *
 * @example
 * <SidebarMenuButton asChild isActive={pathname === "/inbox"} tooltip="Inbox">
 *   <a href="/inbox">
 *     <InboxIcon aria-hidden="true" />
 *     <span>Inbox</span>
 *   </a>
 * </SidebarMenuButton>
 */
function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  size,
  className,
  type,
  ...props
}: SidebarMenuButtonProps) {
  const { iconCollapsed, side } = useContext(SidebarPanelContext);
  const Comp = asChild ? Slot : "button";

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-size={size ?? "default"}
      data-active={isActive}
      aria-current={isActive && asChild ? "page" : undefined}
      type={asChild ? type : (type ?? "button")}
      className={cn(
        sidebarMenuButtonVariants({ size }),
        iconCollapsed && "size-8 justify-center p-2 [&>:not(svg)]:sr-only",
        className
      )}
      {...props}
    />
  );

  if (!tooltip) return button;

  // The tooltip stays mounted so collapsing does not remount (and blur) the button.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      {iconCollapsed ? (
        <TooltipContent side={side === "left" ? "right" : "left"} align="center">
          {tooltip}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

/**
 * A count or status next to a menu button. It sits outside the button, so
 * it is read after the button's name; hidden while collapsed to icons.
 */
function SidebarMenuBadge({ className, ...props }: ComponentProps<"span">) {
  const { iconCollapsed } = useContext(SidebarPanelContext);
  return (
    <span
      data-slot="sidebar-menu-badge"
      className={cn(
        "text-muted-foreground pointer-events-none absolute top-1.5 right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
        iconCollapsed && "hidden",
        className
      )}
      {...props}
    />
  );
}

/** A line between sections of the sidebar. Decorative unless `decorative={false}`. */
function SidebarSeparator({ className, ...props }: ComponentProps<typeof Separator>) {
  return (
    <Separator data-slot="sidebar-separator" className={cn("mx-2 w-auto", className)} {...props} />
  );
}

/** The page next to the sidebar: a `<main>` landmark that takes the remaining width. */
function SidebarInset({ className, ...props }: ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("bg-background relative flex min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  sidebarMenuButtonVariants,
  useSidebar,
  type SidebarCollapsible,
  type SidebarContextValue,
  type SidebarMenuButtonProps,
  type SidebarProps,
  type SidebarProviderProps,
  type SidebarSide,
  type SidebarState,
  type SidebarTriggerProps,
};
