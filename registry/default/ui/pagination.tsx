import { Slot, Slottable } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";
import { buttonVariants } from "@/registry/default/ui/button";
/**
 * Links to the pages of a long list: search results, a blog archive, a
 * table. It is a `<nav>` landmark named "Pagination" (change it with
 * `aria-label`) around a list of links, so Tab moves through them and Enter
 * follows one. The current page is announced with `aria-current="page"`.
 * Use `getPaginationRange` to work out which numbers to show. On the first
 * or last page, leave `href` off Previous / Next and pass `aria-disabled`,
 * which dims them and takes them out of the Tab order. Nothing animates.
 *
 * @example
 * <Pagination>
 *   <PaginationContent>
 *     <PaginationItem>
 *       <PaginationPrevious href={`?page=${page - 1}`} />
 *     </PaginationItem>
 *     {getPaginationRange({ page, pageCount }).map((entry, index) => (
 *       <PaginationItem key={entry === "ellipsis" ? `ellipsis-${index}` : entry}>
 *         {entry === "ellipsis" ? (
 *           <PaginationEllipsis />
 *         ) : (
 *           <PaginationLink href={`?page=${entry}`} isActive={entry === page}>
 *             {entry}
 *           </PaginationLink>
 *         )}
 *       </PaginationItem>
 *     ))}
 *     <PaginationItem>
 *       <PaginationNext href={`?page=${page + 1}`} />
 *     </PaginationItem>
 *   </PaginationContent>
 * </Pagination>
 */
function Pagination({
  className,
  "aria-label": label = "Pagination",
  ...props
}: ComponentProps<"nav">) {
  return (
    <nav
      data-slot="pagination"
      aria-label={label}
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}
function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row flex-wrap items-center justify-center gap-1", className)}
      {...props}
    />
  );
}
function PaginationItem(props: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}
interface PaginationLinkProps
  extends ComponentProps<"a">, Pick<VariantProps<typeof buttonVariants>, "size"> {
  /** Marks the link as the current page: `aria-current="page"`, `data-active` and the outline style. */
  isActive?: boolean;
  /** Render the single child (next/link, a router Link) with the link styles instead. */
  asChild?: boolean;
}
/** A link to one page, styled as a square button. Pass `asChild` to use your framework's link component. */
function PaginationLink({
  className,
  isActive = false,
  size = "icon",
  asChild = false,
  ...props
}: PaginationLinkProps) {
  const Comp = asChild ? Slot : "a";
  // "outline" is the button variant name, not the Tailwind utility.
  // tailwind-compat-ignore-next-line
  const variant = isActive ? "outline" : "ghost";
  return (
    <Comp
      data-slot="pagination-link"
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
interface PaginationStepProps extends Omit<PaginationLinkProps, "isActive"> {
  /** Visible text next to the arrow, hidden below the `sm` breakpoint. */
  label?: string;
}
/**
 * Link to the previous page. Its accessible name is "Go to previous page"
 * (change it with `aria-label`); `label` is the visible text, shown from
 * `sm` up. With `asChild`, the arrow and text go inside your link component.
 */
function PaginationPrevious({
  label = "Previous",
  "aria-label": ariaLabel = "Go to previous page",
  className,
  children,
  ...props
}: PaginationStepProps) {
  return (
    <PaginationLink
      data-slot="pagination-previous"
      aria-label={ariaLabel}
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon aria-hidden="true" />
      <Slottable>{children}</Slottable>
      <span className="hidden sm:block">{label}</span>
    </PaginationLink>
  );
}
/**
 * Link to the next page. Its accessible name is "Go to next page" (change
 * it with `aria-label`); `label` is the visible text, shown from `sm` up.
 * With `asChild`, the text and arrow go inside your link component.
 */
function PaginationNext({
  label = "Next",
  "aria-label": ariaLabel = "Go to next page",
  className,
  children,
  ...props
}: PaginationStepProps) {
  return (
    <PaginationLink
      data-slot="pagination-next"
      aria-label={ariaLabel}
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">{label}</span>
      <Slottable>{children}</Slottable>
      <ChevronRightIcon aria-hidden="true" />
    </PaginationLink>
  );
}
interface PaginationEllipsisProps extends ComponentProps<"span"> {
  /** Text for screen readers in place of the dots. */
  label?: string;
}
/** Stands in for the page numbers that are left out. The dots are hidden; `label` is read instead. */
function PaginationEllipsis({
  label = "More pages",
  className,
  ...props
}: PaginationEllipsisProps) {
  return (
    <span
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon aria-hidden="true" className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
interface PaginationRangeOptions {
  /** The current page, starting at 1. Clamped to 1 … `pageCount`. */
  page: number;
  /** How many pages there are. */
  pageCount: number;
  /** Pages shown on each side of the current one. */
  siblings?: number;
  /** Pages always shown at the start and at the end. */
  boundaries?: number;
}
function range(start: number, end: number) {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}
/**
 * Works out which page numbers to render: the first and last `boundaries`
 * pages, `siblings` pages either side of the current one, and "ellipsis"
 * where pages are left out. An ellipsis only replaces two or more pages, and
 * the result has the same length wherever the current page is, so the
 * links do not shift as you move through them.
 *
 * @example
 * getPaginationRange({ page: 5, pageCount: 10 });
 * // [1, "ellipsis", 4, 5, 6, "ellipsis", 10]
 */
function getPaginationRange({
  page,
  pageCount,
  siblings = 1,
  boundaries = 1,
}: PaginationRangeOptions): (number | "ellipsis")[] {
  const total = Math.max(0, Math.floor(pageCount));
  if (total === 0) return [];
  const around = Math.max(0, Math.floor(siblings));
  const edges = Math.max(0, Math.floor(boundaries));
  const current = Math.min(total, Math.max(1, Math.floor(page)));
  // Edges, siblings, the current page and room for two ellipses.
  const slots = around * 2 + 3 + edges * 2;
  if (slots >= total) return range(1, total);
  const left = Math.max(current - around, edges);
  const right = Math.min(current + around, total - edges);
  const leftGap = left > edges + 2;
  const rightGap = right < total - (edges + 1);
  if (!leftGap && rightGap) {
    return [...range(1, around * 2 + edges + 2), "ellipsis", ...range(total - edges + 1, total)];
  }
  if (leftGap && !rightGap) {
    return [...range(1, edges), "ellipsis", ...range(total - (edges + 1 + around * 2), total)];
  }
  return [
    ...range(1, edges),
    "ellipsis",
    ...range(left, right),
    "ellipsis",
    ...range(total - edges + 1, total),
  ];
}
export {
  getPaginationRange,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  type PaginationEllipsisProps,
  type PaginationLinkProps,
  type PaginationRangeOptions,
  type PaginationStepProps,
};
