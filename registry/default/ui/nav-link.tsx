import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

interface NavLinkProps extends ComponentProps<"a"> {
  /** Marks the link as the current page: sets `aria-current="page"` and `data-active`. */
  active?: boolean;
  /** Render the single child (next/link, a router Link, a plain `<a>`) with the link styles instead. */
  asChild?: boolean;
}

/**
 * A navigation link that knows whether it points at the current page. The
 * active link gets `aria-current="page"`, which screen readers announce as
 * "current page", and `data-active="true"` for styling. It stays a real link,
 * so it is reached with Tab and followed with Enter, and shows a focus ring.
 * Pass `asChild` to use your framework's link component.
 *
 * @example
 * <NavLink asChild active={pathname === "/docs"}>
 *   <Link href="/docs">Docs</Link>
 * </NavLink>
 */
function NavLink({ active = false, asChild = false, className, ...props }: NavLinkProps) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="nav-link"
      data-active={active}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-muted-foreground hover:text-foreground data-[active=true]:text-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm data-[active=true]:font-medium",
        "transition-colors outline-none motion-reduce:transition-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

export { NavLink, type NavLinkProps };
