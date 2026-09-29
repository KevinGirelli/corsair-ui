import { createColumnHelper } from "@tanstack/react-table";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DataTable,
  type dataTableFeatures,
  type DataTableColumnDef,
  type DataTableRowSelection,
} from "@/registry/default/ui/data-table";
import { Dropzone, formatFileSize, matchesAccept } from "@/registry/default/ui/dropzone";

afterEach(() => {
  vi.unstubAllGlobals();
});

type Person = { id: string; name: string; age: number };

const people: Person[] = [
  { id: "p-ada", name: "Ada", age: 36 },
  { id: "p-grace", name: "Grace", age: 45 },
  { id: "p-linus", name: "Linus", age: 28 },
];

const manyPeople: Person[] = Array.from({ length: 25 }, (_, index) => ({
  id: `p-${index + 1}`,
  name: `Sailor ${String(index + 1).padStart(2, "0")}`,
  age: 20 + index,
}));

const columns: DataTableColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "age", header: "Age", cell: ({ getValue }) => `${getValue<number>()} years` },
  { id: "actions", header: () => <span>Actions</span>, cell: () => <button>Edit</button> },
];

function bodyRows() {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body!).getAllByRole("row");
}

function bodyRow(index: number) {
  return bodyRows()[index]!;
}

/** The first text cell of each body row (after the checkbox cell, if any). */
function names() {
  return bodyRows().map(
    (row) =>
      within(row)
        .getAllByRole("cell")
        .find((cell) => !within(cell).queryByRole("checkbox"))?.textContent
  );
}

describe("DataTable", () => {
  it("renders headers and cells, and passes className, ref and native props to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DataTable
        ref={ref}
        id="crew"
        className="custom"
        columns={columns}
        data={people}
        caption="Crew members"
        scrollLabel="Crew table"
      />
    );
    const root = document.querySelector("[data-slot=data-table]");
    expect(ref.current).toBe(root);
    expect(root?.id).toBe("crew");
    expect(root?.className).toContain("custom");
    expect(screen.getByRole("table", { name: "Crew members" })).toBeTruthy();
    expect(screen.getByText("Crew members").className).toContain("sr-only");
    expect(screen.getByRole("region", { name: "Crew table" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map((head) => head.textContent)).toEqual([
      "Name",
      "Age",
      "Actions",
    ]);
    expect(names()).toEqual(["Ada", "Grace", "Linus"]);
    expect(within(bodyRow(0)).getByText("36 years")).toBeTruthy();
  });

  it("shows a visible caption when it is not a string", () => {
    render(<DataTable columns={columns} data={people} caption={<span>Crew list</span>} />);
    expect(screen.getByText("Crew list").parentElement?.className).not.toContain("sr-only");
  });

  it("sorts from string headers with aria-sort on the head", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={people} />);
    const ageHead = screen.getByRole("columnheader", { name: "Age" });
    expect(ageHead.getAttribute("aria-sort")).toBe("none");
    // Function headers get no sort button and no aria-sort.
    expect(screen.getByRole("columnheader", { name: "Actions" }).hasAttribute("aria-sort")).toBe(
      false
    );
    expect(screen.queryByRole("button", { name: "Actions" })).toBeNull();

    const ageButton = screen.getByRole("button", { name: "Age" });
    await user.click(ageButton);
    expect(ageHead.getAttribute("aria-sort")).toBe("ascending");
    expect(ageButton.dataset.direction).toBe("asc");
    expect(names()).toEqual(["Linus", "Ada", "Grace"]);

    // Keyboard: Enter on the focused button flips the direction.
    ageButton.focus();
    await user.keyboard("{Enter}");
    expect(ageHead.getAttribute("aria-sort")).toBe("descending");
    expect(names()).toEqual(["Grace", "Ada", "Linus"]);

    await user.click(screen.getByRole("button", { name: "Name" }));
    expect(ageHead.getAttribute("aria-sort")).toBe("none");
    expect(screen.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort")).toBe(
      "ascending"
    );
  });

  it("leaves sorting out with enableSorting={false} or a column's enableSorting: false", () => {
    const { unmount } = render(<DataTable columns={columns} data={people} enableSorting={false} />);
    expect(screen.queryByRole("button", { name: "Name" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Name" }).hasAttribute("aria-sort")).toBe(
      false
    );
    unmount();
    render(
      <DataTable
        columns={[{ accessorKey: "name", header: "Name", enableSorting: false }, columns[1]!]}
        data={people}
      />
    );
    expect(screen.queryByRole("button", { name: "Name" })).toBeNull();
    expect(screen.getByRole("button", { name: "Age" })).toBeTruthy();
  });

  it("filters rows, announces the count and shows the empty message", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={people} emptyMessage="Nobody aboard." />);
    const filter = screen.getByRole("searchbox", { name: "Filter rows" });
    expect(filter.getAttribute("placeholder")).toBe("Filter…");
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("3 rows");
    expect(status.className).toContain("sr-only");

    await user.type(filter, "gr");
    expect(names()).toEqual(["Grace"]);
    expect(status.textContent).toBe("1 row");

    await user.clear(filter);
    await user.type(filter, "zzz");
    expect(screen.getByText("Nobody aboard.").getAttribute("colspan")).toBe("3");
    expect(status.textContent).toBe("0 rows");
  });

  it("hides the filter with filterLabel={null} and renders the toolbar", () => {
    render(
      <DataTable
        columns={columns}
        data={people}
        filterLabel={null}
        toolbar={<button type="button">Columns</button>}
      />
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(
      within(document.querySelector("[data-slot=data-table-toolbar]") as HTMLElement).getByRole(
        "button",
        { name: "Columns" }
      )
    ).toBeTruthy();
  });

  it("supports a controlled filter", async () => {
    const user = userEvent.setup();
    const onGlobalFilterChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("li");
      return (
        <DataTable
          columns={columns}
          data={people}
          globalFilter={value}
          onGlobalFilterChange={(next) => {
            onGlobalFilterChange(next);
            setValue(next.toUpperCase());
          }}
        />
      );
    }
    render(<Controlled />);
    const filter = screen.getByRole("searchbox", { name: "Filter rows" }) as HTMLInputElement;
    expect(filter.value).toBe("li");
    expect(names()).toEqual(["Linus"]);
    await user.type(filter, "n");
    expect(onGlobalFilterChange).toHaveBeenLastCalledWith("lin");
    expect(filter.value).toBe("LIN");
  });

  it("paginates with buttons, the current page marked, and disabled ends kept focusable", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={manyPeople} />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(bodyRows()).toHaveLength(10);
    const previous = within(nav).getByRole("button", { name: "Go to previous page" });
    const next = within(nav).getByRole("button", { name: "Go to next page" });
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(next.hasAttribute("aria-disabled")).toBe(false);
    expect(within(nav).getByRole("button", { name: "Page 1" }).getAttribute("aria-current")).toBe(
      "page"
    );

    await user.click(next);
    expect(names()[0]).toBe("Sailor 11");
    expect(within(nav).getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBe(
      "page"
    );

    await user.click(within(nav).getByRole("button", { name: "Page 3" }));
    expect(bodyRows()).toHaveLength(5);
    expect(next.getAttribute("aria-disabled")).toBe("true");
    // Activating a disabled end does nothing, and focus stays on it.
    next.focus();
    await user.keyboard("{Enter}");
    expect(names()[0]).toBe("Sailor 21");
    expect(document.activeElement).toBe(next);

    previous.focus();
    await user.keyboard("{Enter}");
    expect(names()[0]).toBe("Sailor 11");
  });

  it("goes back to the first page when the filter changes", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={manyPeople} />);
    await user.click(screen.getByRole("button", { name: "Page 3" }));
    await user.type(screen.getByRole("searchbox"), "Sailor 0");
    expect(names()).toHaveLength(9);
    expect(names()[0]).toBe("Sailor 01");
    // One page left: no pagination.
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("shows every row without pagination when pageSize is null", () => {
    render(<DataTable columns={columns} data={manyPeople} pageSize={null} />);
    expect(bodyRows()).toHaveLength(25);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("uses custom labels", () => {
    render(
      <DataTable
        columns={columns}
        data={manyPeople}
        pageSize={5}
        enableRowSelection
        labels={{
          pagination: "Pages",
          nextPage: "Next page",
          page: (page) => `Go to page ${page}`,
          selectAll: "Everyone",
          selectRow: (_, row) => `Select ${row.name}`,
          rowCount: (count) => `${count} sailors`,
        }}
      />
    );
    const nav = screen.getByRole("navigation", { name: "Pages" });
    expect(within(nav).getByRole("button", { name: "Next page" })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: "Go to page 2" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Everyone" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Sailor 01" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("0 of 25 selected. 25 sailors");
  });

  it("selects rows with checkboxes, with a mixed header state and selected rows marked", async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={people}
        getRowId={(row) => row.id}
        enableRowSelection
        onRowSelectionChange={onRowSelectionChange}
      />
    );
    const all = screen.getByRole("checkbox", { name: "Select all rows" });
    const first = screen.getByRole("checkbox", { name: "Select row 1" });
    const status = screen.getByRole("status");
    expect(all.getAttribute("aria-checked")).toBe("false");
    expect(status.textContent).toBe("0 of 3 selected. 3 rows");

    await user.click(first);
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ "p-ada": true });
    expect(first.getAttribute("aria-checked")).toBe("true");
    expect(bodyRow(0).dataset.state).toBe("selected");
    expect(bodyRow(1).hasAttribute("data-state")).toBe(false);
    expect(all.getAttribute("aria-checked")).toBe("mixed");
    expect(status.textContent).toBe("1 of 3 selected. 3 rows");

    // Keyboard: Space on the header checkbox selects every row.
    all.focus();
    await user.keyboard(" ");
    expect(all.getAttribute("aria-checked")).toBe("true");
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({
      "p-ada": true,
      "p-grace": true,
      "p-linus": true,
    });
    expect(status.textContent).toBe("3 of 3 selected. 3 rows");

    await user.click(all);
    expect(all.getAttribute("aria-checked")).toBe("false");
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({});
  });

  it("selects only the rows that pass the filter from the header checkbox", async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={people}
        getRowId={(row) => row.id}
        enableRowSelection
        onRowSelectionChange={onRowSelectionChange}
      />
    );
    await user.type(screen.getByRole("searchbox"), "a");
    expect(names()).toEqual(["Ada", "Grace"]);
    await user.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ "p-ada": true, "p-grace": true });
    expect(screen.getByRole("status").textContent).toBe("2 of 2 selected. 2 rows");
  });

  it("supports controlled and default row selection", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [selection, setSelection] = useState<DataTableRowSelection>({ "p-grace": true });
      return (
        <>
          <DataTable
            columns={columns}
            data={people}
            getRowId={(row) => row.id}
            enableRowSelection
            rowSelection={selection}
            onRowSelectionChange={setSelection}
          />
          <button type="button" onClick={() => setSelection({ "p-linus": true, "p-ada": false })}>
            Pick Linus
          </button>
        </>
      );
    }
    const { unmount } = render(<Controlled />);
    expect(
      screen.getByRole("checkbox", { name: "Select row 2" }).getAttribute("aria-checked")
    ).toBe("true");
    await user.click(screen.getByRole("button", { name: "Pick Linus" }));
    expect(
      screen.getByRole("checkbox", { name: "Select row 3" }).getAttribute("aria-checked")
    ).toBe("true");
    expect(
      screen.getByRole("checkbox", { name: "Select row 1" }).getAttribute("aria-checked")
    ).toBe("false");
    expect(screen.getByRole("status").textContent).toBe("1 of 3 selected. 3 rows");
    unmount();

    render(
      <DataTable
        columns={columns}
        data={people}
        getRowId={(row) => row.id}
        enableRowSelection
        defaultRowSelection={{ "p-ada": true }}
      />
    );
    expect(
      screen.getByRole("checkbox", { name: "Select row 1" }).getAttribute("aria-checked")
    ).toBe("true");
  });

  it("accepts columns built with the column helper", () => {
    const helper = createColumnHelper<typeof dataTableFeatures, Person>();
    const helperColumns = helper.columns([
      helper.accessor("name", { header: "Name" }),
      helper.accessor("age", { header: "Age", cell: ({ getValue }) => getValue().toFixed(1) }),
    ]);
    render(<DataTable columns={helperColumns} data={people} />);
    expect(screen.getByText("36.0")).toBeTruthy();
  });
});

function makeFile(name: string, size: number, type = "") {
  const file = new File(["x"], name, { type, lastModified: 1 });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function dropArea() {
  return document.querySelector("[data-slot=dropzone-area]") as HTMLElement;
}

function dataTransfer(files: File[]) {
  return { dataTransfer: { files, types: ["Files"], dropEffect: "none" } };
}

describe("Dropzone", () => {
  it("is a labelled, visually hidden file input inside a label drop area", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Dropzone
        ref={ref}
        className="custom"
        name="attachments"
        accept="image/*"
        labels={{ hint: "Images up to 5 MB" }}
      />
    );
    const input = screen.getByLabelText(/Drop files here or browse/) as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.name).toBe("attachments");
    expect(input.accept).toBe("image/*");
    expect(input.multiple).toBe(false);
    expect(input.className).toContain("sr-only");
    expect(input.className).toContain("peer");
    expect(dropArea().tagName).toBe("LABEL");
    expect(dropArea().getAttribute("for")).toBe(input.id);
    expect(dropArea().className).toContain("peer-focus-visible:ring-[3px]");
    expect(dropArea().textContent).toContain("Images up to 5 MB");
    expect(ref.current?.dataset.slot).toBe("dropzone");
    expect(ref.current?.className).toContain("custom");
  });

  it("is reachable with Tab", async () => {
    const user = userEvent.setup();
    render(<Dropzone />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText(/Drop files here/));
  });

  it("lists picked files with their size and a named remove button", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    render(<Dropzone multiple onFilesChange={onFilesChange} locale="en-US" />);
    const input = screen.getByLabelText(/Drop files here/);
    const report = makeFile("report.pdf", 1_500_000, "application/pdf");
    const photo = makeFile("photo.png", 2_500, "image/png");
    await user.upload(input, [report, photo]);
    expect(onFilesChange).toHaveBeenLastCalledWith([report, photo]);
    const list = screen.getByRole("list", { name: "Chosen files" });
    expect(list.dataset.slot).toBe("dropzone-files");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain("report.pdf");
    expect(items[0]!.textContent).toContain("1.5 MB");
    expect(items[1]!.textContent).toContain("2.5 kB");

    // Removing hands focus to the next remove button, then back to the input.
    const removeReport = screen.getByRole("button", { name: "Remove report.pdf" });
    removeReport.focus();
    await user.keyboard("{Enter}");
    expect(onFilesChange).toHaveBeenLastCalledWith([photo]);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove photo.png" }));
    await user.keyboard("{Enter}");
    expect(onFilesChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole("list")).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it("replaces the file without multiple", async () => {
    const user = userEvent.setup();
    render(<Dropzone />);
    const input = screen.getByLabelText(/Drop files here/);
    await user.upload(input, makeFile("a.txt", 10));
    await user.upload(input, makeFile("b.txt", 10));
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([expect.stringContaining("b.txt")]);
  });

  it("rejects files by type, size and count on pick, in an alert", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onReject = vi.fn();
    const onFilesChange = vi.fn();
    render(
      <Dropzone
        multiple
        accept=".pdf,image/*"
        maxSize={1_000_000}
        maxFiles={2}
        locale="en-US"
        onReject={onReject}
        onFilesChange={onFilesChange}
      />
    );
    const input = screen.getByLabelText(/Drop files here/);
    const ok = makeFile("ok.PDF", 100);
    const image = makeFile("pic.jpg", 100, "image/jpeg");
    const text = makeFile("notes.txt", 100, "text/plain");
    const big = makeFile("huge.png", 2_000_000, "image/png");
    const extra = makeFile("extra.pdf", 100, "application/pdf");
    await user.upload(input, [ok, text, big, image, extra]);
    expect(onFilesChange).toHaveBeenLastCalledWith([ok, image]);
    expect(onReject).toHaveBeenLastCalledWith([
      { file: text, reason: "type" },
      { file: big, reason: "size" },
      { file: extra, reason: "count" },
    ]);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("notes.txt is not an accepted file type.");
    expect(alert.textContent).toContain("huge.png is larger than 1 MB.");
    expect(alert.textContent).toContain("extra.pdf was not added: up to 2 files are allowed.");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("accepts dropped files and marks the area while dragging", () => {
    const onFilesChange = vi.fn();
    render(<Dropzone multiple onFilesChange={onFilesChange} />);
    const root = document.querySelector("[data-slot=dropzone]") as HTMLElement;
    const file = makeFile("drop.txt", 100);
    fireEvent.dragEnter(dropArea(), dataTransfer([file]));
    expect(root.hasAttribute("data-dragging")).toBe(true);
    expect(dropArea().hasAttribute("data-dragging")).toBe(true);
    fireEvent.dragLeave(dropArea(), dataTransfer([file]));
    expect(root.hasAttribute("data-dragging")).toBe(false);

    fireEvent.dragEnter(dropArea(), dataTransfer([file]));
    const over = dataTransfer([file]);
    fireEvent.dragOver(dropArea(), over);
    expect(over.dataTransfer.dropEffect).toBe("copy");
    fireEvent.drop(dropArea(), dataTransfer([file]));
    expect(root.hasAttribute("data-dragging")).toBe(false);
    expect(onFilesChange).toHaveBeenLastCalledWith([file]);
    expect(screen.getByText("drop.txt")).toBeTruthy();
  });

  it("checks dropped files against accept and the count", () => {
    const onReject = vi.fn();
    render(<Dropzone accept="image/png" onReject={onReject} />);
    const png = makeFile("a.png", 10, "image/png");
    const second = makeFile("b.png", 10, "image/png");
    const gif = makeFile("c.gif", 10, "image/gif");
    fireEvent.drop(dropArea(), dataTransfer([png, second, gif]));
    expect(onReject).toHaveBeenLastCalledWith([
      { file: gif, reason: "type" },
      { file: second, reason: "count" },
    ]);
    expect(screen.getByRole("alert").textContent).toContain(
      "b.png was not added: only one file is allowed."
    );
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("ignores drags and drops while disabled", () => {
    const onFilesChange = vi.fn();
    render(<Dropzone disabled onFilesChange={onFilesChange} />);
    const root = document.querySelector("[data-slot=dropzone]") as HTMLElement;
    expect(root.hasAttribute("data-disabled")).toBe(true);
    expect((screen.getByLabelText(/Drop files here/) as HTMLInputElement).disabled).toBe(true);
    const file = makeFile("a.txt", 10);
    fireEvent.dragEnter(dropArea(), dataTransfer([file]));
    expect(root.hasAttribute("data-dragging")).toBe(false);
    fireEvent.drop(dropArea(), dataTransfer([file]));
    expect(onFilesChange).not.toHaveBeenCalled();
  });

  it("supports controlled files and custom labels", async () => {
    const user = userEvent.setup();
    const first = makeFile("first.txt", 10);
    function Controlled() {
      const [files, setFiles] = useState<File[]>([first]);
      return (
        <Dropzone
          multiple
          files={files}
          onFilesChange={setFiles}
          labels={{
            prompt: "Add attachments",
            files: "Attachments",
            remove: (name) => `Delete ${name}`,
          }}
        />
      );
    }
    render(<Controlled />);
    const input = screen.getByLabelText("Add attachments");
    const list = screen.getByRole("list", { name: "Attachments" });
    expect(within(list).getByText("first.txt")).toBeTruthy();
    await user.upload(input, makeFile("second.txt", 10));
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Delete first.txt" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).getByText("second.txt")).toBeTruthy();
  });

  it("starts from defaultFiles", () => {
    render(<Dropzone defaultFiles={[makeFile("kept.txt", 10)]} />);
    expect(screen.getByRole("button", { name: "Remove kept.txt" })).toBeTruthy();
  });

  it("keeps the input's files in sync through DataTransfer when available", async () => {
    class DataTransferStub {
      private list: File[] = [];
      items = { add: (file: File) => this.list.push(file) };
      get files() {
        return this.list;
      }
    }
    vi.stubGlobal("DataTransfer", DataTransferStub);
    const first = makeFile("one.txt", 10);
    render(<Dropzone multiple defaultFiles={[first]} />);
    const input = screen.getByLabelText(/Drop files here/) as HTMLInputElement;
    const assigned: unknown[] = [];
    Object.defineProperty(input, "files", {
      configurable: true,
      get: () => assigned.at(-1) ?? null,
      set: (value) => assigned.push(value),
    });
    await act(async () => {
      fireEvent.drop(dropArea(), {
        dataTransfer: { files: [makeFile("two.txt", 10)], types: ["Files"] },
      });
    });
    expect((assigned.at(-1) as File[]).map((file) => file.name)).toEqual(["one.txt", "two.txt"]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove one.txt" }));
    });
    expect((assigned.at(-1) as File[]).map((file) => file.name)).toEqual(["two.txt"]);
  });
});

describe("dropzone helpers", () => {
  it("matches accept patterns like the file input", () => {
    const pdf = makeFile("Report.PDF", 1, "application/pdf");
    expect(matchesAccept(pdf, undefined)).toBe(true);
    expect(matchesAccept(pdf, "")).toBe(true);
    expect(matchesAccept(pdf, ".pdf")).toBe(true);
    expect(matchesAccept(pdf, "application/pdf")).toBe(true);
    expect(matchesAccept(pdf, "image/*, .doc")).toBe(false);
    expect(matchesAccept(makeFile("a.webp", 1, "image/webp"), "image/*")).toBe(true);
    expect(matchesAccept(makeFile("a", 1), "image/*")).toBe(false);
  });

  it("formats sizes in kilobytes and megabytes for the locale", () => {
    expect(formatFileSize(512, "en-US")).toBe("0.5 kB");
    expect(formatFileSize(340_000, "en-US")).toBe("340 kB");
    expect(formatFileSize(1_250_000, "en-US")).toBe("1.3 MB");
    expect(formatFileSize(1_500_000, "de-DE")).toBe("1,5 MB");
  });
});
