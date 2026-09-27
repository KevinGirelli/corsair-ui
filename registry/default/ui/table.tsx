import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";
type TableSortDirection = "asc" | "desc" | false;
interface TableProps extends ComponentProps<"table"> {
  /**
   * Names the scroll container and makes it a focusable region, so keyboard
   * users can scroll a table that is wider than its box. Set it whenever the
   * content can overflow.
   */
  scrollLabel?: string;
}
/**
 * A data table built on the native table elements, so screen readers get
 * rows, columns and headers for free. It sits in a container that scrolls
 * sideways when the table is too wide. When that can happen, pass
 * `scrollLabel`: the container becomes a named region with `tabIndex={0}`,
 * so it can be reached with Tab and scrolled with the arrow keys. Rows show
 * `data-state="selected"` in a muted colour. For sortable columns, put a
 * `TableSortButton` in the `TableHead` and pass the same direction to the
 * head's `sort` prop, which sets `aria-sort`. Nothing animates beyond a
 * colour change on hover.
 *
 * @example
 * <Table scrollLabel="Invoices">
 *   <TableCaption>Invoices from the last 30 days.</TableCaption>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead sort={sort}>
 *         <TableSortButton direction={sort} onSort={setSort}>Amount</TableSortButton>
 *       </TableHead>
 *       <TableHead>Status</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>{amount}</TableCell>
 *       <TableCell>Paid</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */
function Table({ className, scrollLabel, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      role={scrollLabel ? "region" : undefined}
      aria-label={scrollLabel}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region has to be reachable from the keyboard (WCAG 2.1.1)
      tabIndex={scrollLabel ? 0 : undefined}
      className={cn(
        "relative w-full overflow-x-auto rounded-md outline-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}
function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}
function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}
function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-muted/50 border-t font-medium", className)}
      {...props}
    />
  );
}
/** A row. Set `data-state="selected"` on selected rows (and say so in a cell, a checkbox for example). */
function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}
const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;
interface TableHeadProps extends ComponentProps<"th"> {
  /** The column's sort direction. Sets `aria-sort` ("ascending", "descending" or "none"); leave it out on columns that do not sort. */
  sort?: TableSortDirection;
}
/** A column header cell. */
function TableHead({ className, sort, ...props }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      aria-sort={sort === undefined ? undefined : sort ? ARIA_SORT[sort] : "none"}
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap",
        "[&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
}
function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}
/** Describes the table; screen readers read it as the table's name. */
function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}
interface TableSortButtonProps extends ComponentProps<"button"> {
  /** The column's current sort direction, or `false` when it is not sorted. */
  direction?: TableSortDirection;
  /** Called on click with the direction that would come next: "asc" unless it already is, then "desc". */
  onSort?: (next: "asc" | "desc") => void;
}
/**
 * The button in a sortable column header. It shows an up or down arrow for
 * the current direction, or a neutral mark when the column is not sorted,
 * and exposes the direction as `data-direction`. The arrows are hidden from
 * screen readers: they hear the column's `aria-sort`, so pass the same
 * direction to the surrounding `TableHead`'s `sort` prop.
 */
function TableSortButton({
  direction = false,
  onSort,
  onClick,
  className,
  children,
  ...props
}: TableSortButtonProps) {
  const Icon =
    direction === "asc" ? ArrowUpIcon : direction === "desc" ? ArrowDownIcon : ChevronsUpDownIcon;
  return (
    <button
      type="button"
      data-slot="table-sort-button"
      data-direction={direction || "none"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSort?.(direction === "asc" ? "desc" : "asc");
      }}
      className={cn(
        "-ml-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium",
        "hover:bg-accent hover:text-accent-foreground",
        "transition-[color,background-color,box-shadow] outline-none motion-reduce:transition-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <Icon
        aria-hidden="true"
        data-slot="table-sort-icon"
        className={cn(!direction && "text-muted-foreground")}
      />
    </button>
  );
}
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableSortButton,
  type TableHeadProps,
  type TableProps,
  type TableSortButtonProps,
  type TableSortDirection,
};
