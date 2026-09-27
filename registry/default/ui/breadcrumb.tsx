import { Slot } from "@radix-ui/react-slot";
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";
/**
 * The trail of pages from the top of a site down to the current one. It is
 * a `<nav>` landmark named "Breadcrumb" (change it with `aria-label`) around
 * an ordered list, so screen readers announce how many levels there are.
 * The links are real links, reached with Tab and followed with Enter; the
 * last entry, `BreadcrumbPage`, is announced as the current page. The
 * separators are hidden from assistive tech. Nothing animates.
 *
 * @example
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/">Home</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbLink asChild>
 *         <Link href="/docs">Docs</Link>
 *       </BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbPage>Installation</BreadcrumbPage>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 */
function Breadcrumb({ "aria-label": label = "Breadcrumb", ...props }: ComponentProps<"nav">) {
  return <nav data-slot="breadcrumb" aria-label={label} {...props} />;
}
function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className
      )}
      {...props}
    />
  );
}
function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}
interface BreadcrumbLinkProps extends ComponentProps<"a"> {
  /** Render the single child (next/link, a router Link) with the link styles instead. */
  asChild?: boolean;
}
/** A link to a level above the current page. Pass `asChild` to use your framework's link component. */
function BreadcrumbLink({ asChild = false, className, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        "hover:text-foreground rounded-md transition-colors outline-none motion-reduce:transition-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        className
      )}
      {...props}
    />
  );
}
/** The current page: plain text, announced with `aria-current="page"`. */
function BreadcrumbPage({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}
/** The mark between two items, hidden from assistive tech. A chevron unless you pass children. */
function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRightIcon />}
    </li>
  );
}
interface BreadcrumbEllipsisProps extends ComponentProps<"span"> {
  /** Text for screen readers in place of the dots. */
  label?: string;
}
/**
 * Stands in for levels left out of a long trail. The dots are hidden from
 * assistive tech and `label` is read instead, so it can also name a menu
 * trigger wrapped around it that lists the hidden levels.
 */
function BreadcrumbEllipsis({ label = "More", className, ...props }: BreadcrumbEllipsisProps) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon aria-hidden="true" className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  type BreadcrumbEllipsisProps,
  type BreadcrumbLinkProps,
};
