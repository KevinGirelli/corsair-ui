"use client";

import { MenuIcon } from "lucide-react";
import { useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useInView } from "@/registry/default/hooks/use-in-view";
import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from "@/registry/default/ui/sheet";

const subscribe = () => () => {};

/** False while hydrating server HTML, true once running in the browser. */
function useBrowser() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

interface SiteHeaderProps extends ComponentProps<"header"> {
  /** Keeps the header at the top of the viewport while the page scrolls. */
  sticky?: boolean;
}

/**
 * The bar across the top of a site: brand, main navigation, actions and a
 * menu button for small screens. It is a `<header>` (the banner landmark
 * when it is not inside another section). Sticky by default, on a
 * translucent background. Once the page has scrolled it sets
 * `data-scrolled="true"`, so you can add a shadow or change the background
 * with `data-[scrolled=true]:…`; that comes from an IntersectionObserver
 * watching a 1px marker at the top of the page, not from a scroll listener.
 *
 * @example
 * <SiteHeader>
 *   <SiteHeaderContent>
 *     <SiteHeaderBrand>
 *       <a href="/">Acme</a>
 *     </SiteHeaderBrand>
 *     <SiteHeaderNav>
 *       <NavLink href="/docs" active>Docs</NavLink>
 *       <NavLink href="/blog">Blog</NavLink>
 *     </SiteHeaderNav>
 *     <SiteHeaderActions>
 *       <Button size="sm">Sign in</Button>
 *       <SiteHeaderMenu>
 *         <SiteHeaderMenuClose asChild>
 *           <NavLink href="/docs">Docs</NavLink>
 *         </SiteHeaderMenuClose>
 *       </SiteHeaderMenu>
 *     </SiteHeaderActions>
 *   </SiteHeaderContent>
 * </SiteHeader>
 */
function SiteHeader({ sticky = true, className, ...props }: SiteHeaderProps) {
  const browser = useBrowser();
  // Until the observer answers, assume the page is at the top.
  const [observe, atTop] = useInView<HTMLDivElement>({ initial: true });
  const supported = browser && typeof IntersectionObserver !== "undefined";

  return (
    <>
      {supported
        ? createPortal(
            <div
              ref={observe}
              aria-hidden="true"
              data-slot="site-header-sentinel"
              className="pointer-events-none absolute top-0 left-0 h-px w-px"
            />,
            document.body
          )
        : null}
      <header
        data-slot="site-header"
        data-sticky={sticky}
        data-scrolled={supported && !atTop}
        className={cn(
          "bg-background/80 w-full border-b backdrop-blur-[8px]",
          "transition-[box-shadow,background-color] motion-reduce:transition-none",
          sticky && "sticky top-0 z-40",
          className
        )}
        {...props}
      />
    </>
  );
}

/** The centred row inside the header that lines the parts up. */
function SiteHeaderContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="site-header-content"
      className={cn(
        "mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6",
        className
      )}
      {...props}
    />
  );
}

/** Holds the logo link. Give the link a name: text, or an `aria-label` on an image logo. */
function SiteHeaderBrand({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="site-header-brand"
      className={cn("flex shrink-0 items-center gap-2 font-semibold", className)}
      {...props}
    />
  );
}

/** The main navigation, a `<nav>` landmark named "Main". Hidden below `md`, where SiteHeaderMenu takes over. */
function SiteHeaderNav({
  className,
  "aria-label": label = "Main",
  ...props
}: ComponentProps<"nav">) {
  return (
    <nav
      data-slot="site-header-nav"
      aria-label={label}
      className={cn("hidden items-center gap-1 md:flex", className)}
      {...props}
    />
  );
}

/** Buttons at the end of the header: sign in, theme toggle, the mobile menu. */
function SiteHeaderActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="site-header-actions"
      className={cn("ml-auto flex items-center gap-2", className)}
      {...props}
    />
  );
}

interface SiteHeaderMenuProps extends Omit<ComponentProps<typeof SheetContent>, "title"> {
  /** Accessible name of the menu button. */
  label?: string;
  /** Title of the panel, which names it for screen readers. */
  title?: ReactNode;
  /** Classes for the title: `sr-only` hides it while keeping the name. */
  titleClassName?: string;
  /** Read out after the title when the panel opens. */
  description?: ReactNode;
  /** The edge the panel slides in from. */
  side?: SheetSide;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Classes for the menu button. */
  triggerClassName?: string;
}

/**
 * The navigation for small screens: a menu button (hidden from `md` up)
 * that opens a Sheet with the children in it. The Sheet traps focus,
 * closes on Escape and returns focus to the button. Wrap each link in
 * SiteHeaderMenuClose with `asChild` so following it closes the panel.
 */
function SiteHeaderMenu({
  label = "Open menu",
  title = "Menu",
  titleClassName,
  description,
  side = "right",
  open,
  defaultOpen,
  onOpenChange,
  triggerClassName,
  className,
  children,
  ...props
}: SiteHeaderMenuProps) {
  return (
    <Sheet open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          data-slot="site-header-menu-trigger"
          className={cn("md:hidden", triggerClassName)}
        >
          <MenuIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side={side}
        data-slot="site-header-menu"
        className={className}
        // Radix warns about a missing description unless it is opted out of.
        {...(description ? null : { "aria-describedby": undefined })}
        {...props}
      >
        <SheetHeader>
          <SheetTitle className={titleClassName}>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div
          data-slot="site-header-menu-body"
          className="flex flex-col gap-1 overflow-y-auto px-4 pb-4"
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Closes the mobile menu. Use `asChild` around a link so following it closes the panel. */
const SiteHeaderMenuClose = SheetClose;

export {
  SiteHeader,
  SiteHeaderActions,
  SiteHeaderBrand,
  SiteHeaderContent,
  SiteHeaderMenu,
  SiteHeaderMenuClose,
  SiteHeaderNav,
  type SiteHeaderMenuProps,
  type SiteHeaderProps,
};
