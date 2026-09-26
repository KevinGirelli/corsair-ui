import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Calendar } from "@/registry/default/ui/calendar";
import { DatePicker, DateRangePicker, type DateRange } from "@/registry/default/ui/date-picker";

const may2026 = new Date(2026, 4, 1);
// DayPicker also puts data-day on the cell, so ask for the button.
const day = (iso: string) =>
  document.querySelector<HTMLButtonElement>(`button[data-day="${iso}"]`)!;
const isoDay = (date: Date | undefined) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : undefined;
const format = (date: Date) => isoDay(date)!;

describe("Calendar", () => {
  it("renders a month grid and selects a single day", async () => {
    const onSelect = vi.fn();
    function Controlled() {
      const [selected, setSelected] = useState<Date | undefined>();
      return (
        <Calendar
          mode="single"
          defaultMonth={may2026}
          selected={selected}
          onSelect={(date) => {
            setSelected(date);
            onSelect(date);
          }}
        />
      );
    }
    render(<Controlled />);

    expect(screen.getByRole("grid")).toBeTruthy();
    expect(document.querySelector("[data-slot=calendar]")).not.toBeNull();

    await userEvent.click(day("2026-05-14"));
    expect(isoDay(onSelect.mock.calls[0]?.[0])).toBe("2026-05-14");
    expect(day("2026-05-14").dataset.selectedSingle).toBe("true");
  });

  it("marks the ends and the middle of a range", () => {
    render(
      <Calendar
        mode="range"
        defaultMonth={may2026}
        selected={{ from: new Date(2026, 4, 4), to: new Date(2026, 4, 8) }}
      />
    );
    expect(day("2026-05-04").dataset.rangeStart).toBe("true");
    expect(day("2026-05-06").dataset.rangeMiddle).toBe("true");
    expect(day("2026-05-08").dataset.rangeEnd).toBe("true");
  });

  it("moves between months with the navigation buttons", async () => {
    render(<Calendar mode="single" defaultMonth={may2026} />);
    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(day("2026-06-10")).not.toBeNull();
  });
});

describe("DatePicker", () => {
  it("opens a calendar, shows the picked date, closes and submits it", async () => {
    const onValueChange = vi.fn();
    render(
      <form aria-label="Booking">
        <DatePicker
          aria-label="Check-in"
          name="checkIn"
          formatValue={format}
          calendarProps={{ defaultMonth: may2026 }}
          onValueChange={onValueChange}
        />
      </form>
    );
    const trigger = screen.getByRole("button", { name: "Check-in" });
    expect(trigger.textContent).toContain("Pick a date");
    expect(trigger.dataset.empty).toBe("true");

    await userEvent.click(trigger);
    await userEvent.click(day("2026-05-20"));

    expect(isoDay(onValueChange.mock.calls[0]?.[0])).toBe("2026-05-20");
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(trigger.textContent).toContain("2026-05-20");
    const form = screen.getByRole("form", { name: "Booking" }) as HTMLFormElement;
    expect(new FormData(form).get("checkIn")).toBe("2026-05-20");
  });

  it("clears when the chosen day is picked again", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        aria-label="Check-in"
        defaultValue={new Date(2026, 4, 20)}
        formatValue={format}
        onValueChange={onValueChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Check-in" }));
    await userEvent.click(day("2026-05-20"));
    expect(onValueChange).toHaveBeenCalledWith(undefined);
    expect(screen.getByRole("button", { name: "Check-in" }).textContent).toContain("Pick a date");
  });

  it("keeps disabled days from being picked", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        aria-label="Check-in"
        calendarProps={{ defaultMonth: may2026, disabled: { before: new Date(2026, 4, 10) } }}
        onValueChange={onValueChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Check-in" }));
    expect(day("2026-05-05").disabled).toBe(true);
  });
});

describe("DateRangePicker", () => {
  it("closes after the second pick and submits both ends", async () => {
    const changes: (DateRange | undefined)[] = [];
    render(
      <form aria-label="Stay">
        <DateRangePicker
          aria-label="Dates"
          names={{ from: "from", to: "to" }}
          numberOfMonths={1}
          formatValue={({ from, to }) => `${format(from!)} → ${to ? format(to) : ""}`}
          calendarProps={{ defaultMonth: may2026 }}
          onValueChange={(range) => changes.push(range)}
        />
      </form>
    );
    const trigger = screen.getByRole("button", { name: "Dates" });

    await userEvent.click(trigger);
    await userEvent.click(day("2026-05-04"));
    // Still open after the first pick, which DayPicker records as a one-day range.
    expect(screen.getByRole("grid")).toBeTruthy();
    await userEvent.click(day("2026-05-08"));

    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(isoDay(changes.at(-1)?.from)).toBe("2026-05-04");
    expect(isoDay(changes.at(-1)?.to)).toBe("2026-05-08");
    expect(trigger.textContent).toContain("2026-05-04 → 2026-05-08");
    const data = new FormData(screen.getByRole("form", { name: "Stay" }) as HTMLFormElement);
    expect([data.get("from"), data.get("to")]).toEqual(["2026-05-04", "2026-05-08"]);
  });
});
