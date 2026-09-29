"use client";

import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  functionalUpdate,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Checkbox } from "@/registry/default/ui/checkbox";
import { Input } from "@/registry/default/ui/input";
import {
  getPaginationRange,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/registry/default/ui/pagination";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSortButton,
} from "@/registry/default/ui/table";

/**
 * The TanStack Table features the data table registers: sorting, a global
 * filter, pagination and row selection. Use its type to build typed columns:
 * `createColumnHelper<typeof dataTableFeatures, Payment>()`.
 */
const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

type DataTableFeatures = typeof dataTableFeatures;

/** Which rows are selected, by row id. `false` and missing ids both mean "not selected". */
type DataTableRowSelection = Record<string, boolean>;

/**
 * A column of the data table: a TanStack Table v9 `ColumnDef` from
 * `@tanstack/react-table`, bound to the data table's features. Read a typed
 * value in a cell with `getValue<number>()`, or build the columns with
 * `createColumnHelper<typeof dataTableFeatures, TData>().columns([...])`.
 */
type DataTableColumnDef<TData extends RowData> = ColumnDef<DataTableFeatures, TData, unknown>;

interface DataTableLabels<TData> {
  /** Accessible name of the header checkbox. */
  selectAll: string;
  /** Accessible name of a row checkbox. Gets the row's 1-based position in the current order and its data. */
  selectRow: (position: number, row: TData) => string;
  /** Announced when the selection changes. Counts only rows that pass the filter. */
  selectedCount: (selected: number, total: number) => string;
  /** Announced when the filter changes the number of rows. */
  rowCount: (count: number) => string;
  /** Name of the pagination landmark. */
  pagination: string;
  /** Visible text of the previous-page button, shown from `sm` up. */
  previous: string;
  /** Accessible name of the previous-page button. */
  previousPage: string;
  /** Visible text of the next-page button, shown from `sm` up. */
  next: string;
  /** Accessible name of the next-page button. */
  nextPage: string;
  /** Accessible name of a page number button. */
  page: (page: number) => string;
  /** Read in place of the dots that stand for skipped pages. */
  morePages: string;
}

const DEFAULT_LABELS: DataTableLabels<unknown> = {
  selectAll: "Select all rows",
  selectRow: (position) => `Select row ${position}`,
  selectedCount: (selected, total) => `${selected} of ${total} selected`,
  rowCount: (count) => (count === 1 ? "1 row" : `${count} rows`),
  pagination: "Pagination",
  previous: "Previous",
  previousPage: "Go to previous page",
  next: "Next",
  nextPage: "Go to next page",
  page: (page) => `Page ${page}`,
  morePages: "More pages",
};

interface DataTableProps<TData extends RowData> extends Omit<ComponentProps<"div">, "children"> {
  /** Column definitions (TanStack Table v9 `ColumnDef`s from `@tanstack/react-table`). */
  columns: ReadonlyArray<DataTableColumnDef<TData>>;
  /** The rows. Keep the array stable between renders (state, memo or module scope). */
  data: ReadonlyArray<TData>;
  /** A stable id per row, used as the key of `rowSelection`. Defaults to the row's index in `data`. */
  getRowId?: (row: TData, index: number) => string;
  /** Sort by clicking the header of any column whose `header` is a string (unless the column sets `enableSorting: false`). */
  enableSorting?: boolean;
  /** Adds a column of checkboxes to select rows, with a select-all checkbox in the header. */
  enableRowSelection?: boolean;
  /** Selected rows by id (controlled). */
  rowSelection?: DataTableRowSelection;
  /** Selected rows at first (uncontrolled). */
  defaultRowSelection?: DataTableRowSelection;
  /** Called with the new selection whenever it changes. */
  onRowSelectionChange?: (rowSelection: DataTableRowSelection) => void;
  /** Text of the filter input (controlled). Rows match when any column's value contains it. */
  globalFilter?: string;
  /** Text of the filter input at first (uncontrolled). */
  defaultGlobalFilter?: string;
  /** Called with the new filter text on every change. */
  onGlobalFilterChange?: (globalFilter: string) => void;
  /** Placeholder of the filter input. */
  filterPlaceholder?: string;
  /** Accessible name of the filter input. `null` hides the input. */
  filterLabel?: string | null;
  /** Rows per page. `null` shows every row without pagination. */
  pageSize?: number | null;
  /** Shown in a single cell when no row matches. */
  emptyMessage?: ReactNode;
  /** Names the table. A string is read by screen readers only; any other node is shown below the table. */
  caption?: ReactNode;
  /** Text for screen readers and the accessible names of controls. */
  labels?: Partial<DataTableLabels<TData>>;
  /** Extra controls rendered beside the filter input: column toggles, buttons, menus. */
  toolbar?: ReactNode;
  /** Names the scroll container of the table, making it a focusable region (see `Table`). */
  scrollLabel?: string;
}

const EMPTY_SELECTION: RowSelectionState = {};

/** TanStack's selection keeps only `true` entries. */
function toTableSelection(selection: DataTableRowSelection | undefined): RowSelectionState {
  if (!selection) return EMPTY_SELECTION;
  const next: RowSelectionState = {};
  for (const [id, selected] of Object.entries(selection)) if (selected) next[id] = true;
  return next;
}

/**
 * A table with sorting, a text filter, pagination and row selection, built
 * on TanStack Table v9 and rendered with `Table`, `Pagination`, `Checkbox`
 * and `Input`. Pass `columns` (`ColumnDef`s from `@tanstack/react-table`;
 * `DataTableColumnDef` is the matching type) and `data`.
 *
 * Columns whose `header` is a string get a sort button: Tab reaches it,
 * Enter or Space sorts ascending, then descending, and the header's
 * `aria-sort` tells screen readers the direction. The filter is a search
 * input named by `filterLabel`. With `enableRowSelection`, each row has a
 * named checkbox, the header checkbox selects every row that passes the
 * filter (and shows a dash when only some are), and selected rows get
 * `data-state="selected"`. A visually hidden status region announces the
 * selected count and the number of matching rows. The page buttons are
 * native buttons in a `Pagination` landmark; Previous and Next stay
 * focusable at the ends and are marked `aria-disabled`. Nothing animates
 * beyond colour transitions, which reduced motion turns off.
 *
 * @example
 * const columns: DataTableColumnDef<Payment>[] = [
 *   { accessorKey: "email", header: "Email" },
 *   { accessorKey: "amount", header: "Amount", cell: ({ getValue }) => format(getValue()) },
 * ];
 *
 * <DataTable columns={columns} data={payments} getRowId={(row) => row.id} enableRowSelection />
 */
function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  enableSorting = true,
  enableRowSelection = false,
  rowSelection,
  defaultRowSelection,
  onRowSelectionChange,
  globalFilter,
  defaultGlobalFilter = "",
  onGlobalFilterChange,
  filterPlaceholder = "Filter…",
  filterLabel = "Filter rows",
  pageSize = 10,
  emptyMessage = "No results.",
  caption,
  labels: labelsProp,
  toolbar,
  scrollLabel,
  className,
  ...props
}: DataTableProps<TData>) {
  const labels = { ...(DEFAULT_LABELS as DataTableLabels<TData>), ...labelsProp };

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [internalFilter, setInternalFilter] = useState(defaultGlobalFilter);
  const [internalSelection, setInternalSelection] = useState<DataTableRowSelection>(
    defaultRowSelection ?? {}
  );

  const filter = globalFilter !== undefined ? globalFilter : internalFilter;
  const plainSelection = rowSelection !== undefined ? rowSelection : internalSelection;
  const selection = useMemo(() => toTableSelection(plainSelection), [plainSelection]);
  const size = pageSize ?? 10;
  const pagination: PaginationState = { pageIndex, pageSize: size };

  const setFilter = (next: string) => {
    if (globalFilter === undefined) setInternalFilter(next);
    onGlobalFilterChange?.(next);
  };

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    enableSorting,
    enableRowSelection,
    enableRowRangeSelection: false,
    state: { sorting, globalFilter: filter, rowSelection: selection, pagination },
    onSortingChange: (updater: Updater<SortingState>) =>
      setSorting((previous) => functionalUpdate(updater, previous)),
    onGlobalFilterChange: (updater: Updater<string>) =>
      setFilter(functionalUpdate(updater, filter)),
    onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
      const next: DataTableRowSelection = { ...functionalUpdate(updater, selection) };
      if (rowSelection === undefined) setInternalSelection(next);
      onRowSelectionChange?.(next);
    },
    onPaginationChange: (updater: Updater<PaginationState>) =>
      setPageIndex(
        (previous) => functionalUpdate(updater, { pageIndex: previous, pageSize: size }).pageIndex
      ),
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const rows = pageSize === null ? table.getPrePaginatedRowModel().rows : table.getRowModel().rows;
  const pageCount = pageSize === null ? 1 : table.getPageCount();
  const currentPage = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const firstPosition = pageSize === null ? 1 : currentPage * size + 1;
  const columnCount = table.getAllLeafColumns().length + (enableRowSelection ? 1 : 0);
  const headerGroups = table.getHeaderGroups();

  const selectable = enableRowSelection ? filteredRows.filter((row) => row.getCanSelect()) : [];
  const selectedCount = selectable.filter((row) => row.getIsSelected()).length;
  const allSelected = selectable.length > 0 && selectedCount === selectable.length;
  const toggleAll = () =>
    table.setRowSelection((previous) => {
      const next: RowSelectionState = { ...previous };
      for (const row of selectable) {
        if (allSelected) delete next[row.id];
        else next[row.id] = true;
      }
      return next;
    });

  const status = [
    enableRowSelection ? labels.selectedCount(selectedCount, filteredRows.length) : null,
    labels.rowCount(filteredRows.length),
  ]
    .filter(Boolean)
    .join(". ");

  const showToolbar = filterLabel !== null || toolbar !== undefined;
  const canPrevious = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div data-slot="data-table" className={cn("flex flex-col gap-4", className)} {...props}>
      {showToolbar ? (
        <div data-slot="data-table-toolbar" className="flex flex-wrap items-center gap-2">
          {filterLabel !== null ? (
            <Input
              type="search"
              data-slot="data-table-filter"
              aria-label={filterLabel}
              placeholder={filterPlaceholder}
              value={filter}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              className="max-w-xs"
            />
          ) : null}
          {toolbar}
        </div>
      ) : null}
      <div data-slot="data-table-body" className="rounded-md border">
        <Table scrollLabel={scrollLabel}>
          {caption === undefined || caption === null ? null : (
            <TableCaption className={cn(typeof caption === "string" && "sr-only")}>
              {caption}
            </TableCaption>
          )}
          <TableHeader>
            {headerGroups.map((group, groupIndex) => (
              <TableRow key={group.id}>
                {enableRowSelection && groupIndex === 0 ? (
                  <TableHead rowSpan={headerGroups.length} className="w-10 pl-3">
                    <Checkbox
                      data-slot="data-table-select-all"
                      aria-label={labels.selectAll}
                      checked={allSelected ? true : selectedCount > 0 ? "indeterminate" : false}
                      disabled={selectable.length === 0}
                      onCheckedChange={toggleAll}
                      className="align-middle"
                    />
                  </TableHead>
                ) : null}
                {group.headers.map((header) => {
                  const { column } = header;
                  const title = column.columnDef.header;
                  const sortable =
                    !header.isPlaceholder &&
                    header.subHeaders.length === 0 &&
                    typeof title === "string" &&
                    column.getCanSort();
                  const direction = column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      sort={sortable ? direction : undefined}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <TableSortButton
                          direction={direction}
                          onSort={(next) => column.toggleSorting(next === "desc")}
                        >
                          {title}
                        </TableSortButton>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row, index) => {
                const selected = row.getIsSelected();
                return (
                  <TableRow
                    key={row.id}
                    data-state={enableRowSelection && selected ? "selected" : undefined}
                  >
                    {enableRowSelection ? (
                      <TableCell className="w-10 pl-3">
                        <Checkbox
                          data-slot="data-table-select-row"
                          aria-label={labels.selectRow(firstPosition + index, row.original)}
                          checked={selected}
                          disabled={!row.getCanSelect()}
                          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
                          className="align-middle"
                        />
                      </TableCell>
                    ) : null}
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow data-slot="data-table-empty">
                <TableCell colSpan={columnCount} className="text-muted-foreground h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div role="status" data-slot="data-table-status" className="sr-only">
        {status}
      </div>
      {pageSize !== null && pageCount > 1 ? (
        <Pagination
          aria-label={labels.pagination}
          data-slot="data-table-pagination"
          className="justify-end"
        >
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious asChild label={labels.previous} aria-label={labels.previousPage}>
                <button
                  type="button"
                  aria-disabled={!canPrevious || undefined}
                  onClick={() => {
                    if (canPrevious) table.previousPage();
                  }}
                />
              </PaginationPrevious>
            </PaginationItem>
            {getPaginationRange({ page: currentPage + 1, pageCount }).map((entry, index) => (
              <PaginationItem key={entry === "ellipsis" ? `ellipsis-${index}` : entry}>
                {entry === "ellipsis" ? (
                  <PaginationEllipsis label={labels.morePages} />
                ) : (
                  <PaginationLink
                    asChild
                    isActive={entry === currentPage + 1}
                    aria-label={labels.page(entry)}
                  >
                    <button type="button" onClick={() => table.setPageIndex(entry - 1)}>
                      {entry}
                    </button>
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext asChild label={labels.next} aria-label={labels.nextPage}>
                <button
                  type="button"
                  aria-disabled={!canNext || undefined}
                  onClick={() => {
                    if (canNext) table.nextPage();
                  }}
                />
              </PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}

export {
  DataTable,
  dataTableFeatures,
  type DataTableColumnDef,
  type DataTableFeatures,
  type DataTableLabels,
  type DataTableProps,
  type DataTableRowSelection,
};
