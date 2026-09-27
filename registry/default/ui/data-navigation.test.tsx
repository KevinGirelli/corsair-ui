import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/default/ui/breadcrumb";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableSortButton,
  type TableSortDirection,
} from "@/registry/default/ui/table";
describe("Breadcrumb", () => {
  function Trail() {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild className="custom">
              <a href="/docs" data-router="">
                Docs
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Installation</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }
  it("is a named navigation landmark around an ordered list", () => {
    render(<Trail />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav.dataset.slot).toBe("breadcrumb");
    const list = within(nav).getByRole("list");
    expect(list.tagName).toBe("OL");
    // Separators are hidden, so only the four entries count as list items.
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });
  it("marks the current page and keeps links as links", async () => {
    render(<Trail />);
    expect(screen.getByText("Installation").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("link", { name: "Installation" })).toBeNull();
    const docs = screen.getByRole("link", { name: "Docs" });
    expect(docs.dataset.slot).toBe("breadcrumb-link");
    expect(docs.getAttribute("data-router")).toBe("");
    expect(docs.className).toContain("custom");
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Home" }));
    await userEvent.tab();
    expect(document.activeElement).toBe(docs);
  });
  it("hides separators and reads a label for the ellipsis", () => {
    const { container } = render(<Trail />);
    const separators = container.querySelectorAll("[data-slot=breadcrumb-separator]");
    expect(separators).toHaveLength(3);
    for (const separator of separators) {
      expect(separator.getAttribute("aria-hidden")).toBe("true");
      expect(separator.getAttribute("role")).toBe("presentation");
    }
    expect(separators[0]!.querySelector("svg")).not.toBeNull();
    expect(separators[1]!.textContent).toBe("/");
    const ellipsis = container.querySelector<HTMLElement>("[data-slot=breadcrumb-ellipsis]")!;
    expect(ellipsis.textContent).toBe("More");
    expect(ellipsis.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
  it("takes a custom landmark name and ellipsis label", () => {
    render(
      <Breadcrumb aria-label="You are here">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis label="Hidden levels" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
    expect(screen.getByRole("navigation", { name: "You are here" })).toBeTruthy();
    expect(screen.getByText("Hidden levels").className).toContain("sr-only");
  });
});
describe("Pagination", () => {
  it("is a named navigation landmark with the current page marked", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="?page=1" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="?page=1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="?page=2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="?page=3" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(5);
    const current = screen.getByRole("link", { name: "2" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.getAttribute("data-active")).toBe("true");
    expect(current.getAttribute("data-slot")).toBe("pagination-link");
    const other = screen.getByRole("link", { name: "1" });
    expect(other.hasAttribute("aria-current")).toBe(false);
    expect(other.getAttribute("data-active")).toBe("false");
    // Outline for the current page, ghost for the rest.
    expect(current.className).toContain("border-input");
    expect(other.className).not.toContain("border-input");
    expect(other.className).toContain("size-9");
    const previous = screen.getByRole("link", { name: "Go to previous page" });
    expect(previous.getAttribute("href")).toBe("?page=1");
    expect(previous.getAttribute("data-slot")).toBe("pagination-previous");
    expect(within(previous).getByText("Previous").className).toContain("hidden sm:block");
    expect(screen.getByRole("link", { name: "Go to next page" }).textContent).toBe("Next");
    expect(screen.getByText("More pages").className).toContain("sr-only");
  });
  it("takes custom labels and router links with asChild", () => {
    render(
      <Pagination aria-label="Results pages">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious asChild label="Zurück" aria-label="Vorherige Seite">
              <a href="/p/1" data-router="">
                {null}
              </a>
            </PaginationPrevious>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink asChild isActive>
              <a href="/p/2">2</a>
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext label="Weiter" aria-label="Nächste Seite" href="/p/3" />
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis label="Weitere Seiten" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
    expect(screen.getByRole("navigation", { name: "Results pages" })).toBeTruthy();
    const previous = screen.getByRole("link", { name: "Vorherige Seite" });
    expect(previous.getAttribute("data-router")).toBe("");
    expect(previous.getAttribute("href")).toBe("/p/1");
    expect(previous.textContent).toBe("Zurück");
    expect(previous.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("link", { name: "2" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Nächste Seite" }).textContent).toBe("Weiter");
    expect(screen.getByText("Weitere Seiten")).toBeTruthy();
  });
});
describe("getPaginationRange", () => {
  it("lists every page when they all fit", () => {
    expect(getPaginationRange({ page: 1, pageCount: 1 })).toEqual([1]);
    expect(getPaginationRange({ page: 3, pageCount: 7 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("returns nothing when there are no pages", () => {
    expect(getPaginationRange({ page: 1, pageCount: 0 })).toEqual([]);
  });
  it("puts ellipses where pages are left out", () => {
    expect(getPaginationRange({ page: 1, pageCount: 10 })).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
    expect(getPaginationRange({ page: 4, pageCount: 10 })).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
    expect(getPaginationRange({ page: 5, pageCount: 10 })).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
    expect(getPaginationRange({ page: 7, pageCount: 10 })).toEqual([1, "ellipsis", 6, 7, 8, 9, 10]);
    expect(getPaginationRange({ page: 10, pageCount: 10 })).toEqual([
      1,
      "ellipsis",
      6,
      7,
      8,
      9,
      10,
    ]);
  });
  it("keeps the same length wherever the current page is", () => {
    for (let page = 1; page <= 50; page++) {
      const result = getPaginationRange({ page, pageCount: 50, siblings: 2, boundaries: 2 });
      expect(result).toHaveLength(11);
      expect(result).toContain(page);
      // Never an ellipsis in place of a single page.
      result.forEach((entry, index) => {
        if (entry !== "ellipsis") return;
        const before = result[index - 1] as number;
        const after = result[index + 1] as number;
        expect(after - before).toBeGreaterThan(2);
      });
    }
  });
  it("honours siblings and boundaries, including zero", () => {
    expect(getPaginationRange({ page: 10, pageCount: 20, siblings: 2 })).toEqual([
      1,
      "ellipsis",
      8,
      9,
      10,
      11,
      12,
      "ellipsis",
      20,
    ]);
    expect(getPaginationRange({ page: 10, pageCount: 20, siblings: 0, boundaries: 0 })).toEqual([
      "ellipsis",
      10,
      "ellipsis",
    ]);
    expect(getPaginationRange({ page: 10, pageCount: 20, boundaries: 2 })).toEqual([
      1,
      2,
      "ellipsis",
      9,
      10,
      11,
      "ellipsis",
      19,
      20,
    ]);
  });
  it("clamps the page into range", () => {
    expect(getPaginationRange({ page: 99, pageCount: 10 })).toEqual([
      1,
      "ellipsis",
      6,
      7,
      8,
      9,
      10,
    ]);
    expect(getPaginationRange({ page: -3, pageCount: 10 })).toEqual([
      1,
      2,
      3,
      4,
      5,
      "ellipsis",
      10,
    ]);
  });
});
describe("Table", () => {
  function Invoices({ scrollLabel }: { scrollLabel?: string }) {
    return (
      <Table scrollLabel={scrollLabel} className="custom">
        <TableCaption>Recent invoices</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>INV-1</TableCell>
            <TableCell>250</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>INV-2</TableCell>
            <TableCell>150</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>400</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
  }
  it("renders a native table named by its caption", () => {
    render(<Invoices />);
    const table = screen.getByRole("table", { name: "Recent invoices" });
    expect(table.dataset.slot).toBe("table");
    expect(table.className).toContain("custom");
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Invoice",
      "Amount",
    ]);
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getAllByRole("cell")).toHaveLength(6);
    expect(screen.getAllByRole("row")[1]!.getAttribute("data-state")).toBe("selected");
    const container = table.parentElement!;
    expect(container.dataset.slot).toBe("table-container");
    expect(container.className).toContain("overflow-x-auto");
    // Not a focusable region unless asked for.
    expect(container.hasAttribute("tabindex")).toBe(false);
    expect(container.hasAttribute("role")).toBe(false);
  });
  it("makes the scroll container a named, focusable region with scrollLabel", async () => {
    render(<Invoices scrollLabel="Invoices" />);
    const region = screen.getByRole("region", { name: "Invoices" });
    expect(region.dataset.slot).toBe("table-container");
    await userEvent.tab();
    expect(document.activeElement).toBe(region);
  });
  it("passes the ref to the table element", () => {
    const ref = createRef<HTMLTableElement>();
    render(
      <Table ref={ref}>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(ref.current).toBe(screen.getByRole("table"));
  });
  it("sorts a column with a button and reports the direction through aria-sort", async () => {
    const onSort = vi.fn();
    function Sortable() {
      const [sort, setSort] = useState<TableSortDirection>(false);
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead sort={sort}>
                <TableSortButton
                  direction={sort}
                  onSort={(next) => {
                    onSort(next);
                    setSort(next);
                  }}
                >
                  Amount
                </TableSortButton>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>1</TableCell>
              <TableCell>Paid</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }
    render(<Sortable />);
    const [amount, status] = screen.getAllByRole("columnheader");
    const button = screen.getByRole("button", { name: "Amount" });
    expect(button.getAttribute("type")).toBe("button");
    expect(amount!.getAttribute("aria-sort")).toBe("none");
    expect(status!.hasAttribute("aria-sort")).toBe(false);
    expect(button.getAttribute("data-direction")).toBe("none");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    await userEvent.click(button);
    expect(onSort).toHaveBeenLastCalledWith("asc");
    expect(amount!.getAttribute("aria-sort")).toBe("ascending");
    expect(button.getAttribute("data-direction")).toBe("asc");
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSort).toHaveBeenLastCalledWith("desc");
    expect(amount!.getAttribute("aria-sort")).toBe("descending");
    await userEvent.keyboard(" ");
    expect(amount!.getAttribute("aria-sort")).toBe("ascending");
  });
  it("lets onClick cancel sorting", async () => {
    const onSort = vi.fn();
    render(
      <TableSortButton onSort={onSort} onClick={(event) => event.preventDefault()}>
        Name
      </TableSortButton>
    );
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onSort).not.toHaveBeenCalled();
  });
});
