import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/registry/default/ui/checkbox";
import { Combobox } from "@/registry/default/ui/combobox";
import { DatePicker } from "@/registry/default/ui/date-picker";
import { FormField } from "@/registry/default/ui/form";
import { Input } from "@/registry/default/ui/input";
import { NumberInput } from "@/registry/default/ui/number-input";

function SignupForm({
  onSubmit,
}: {
  onSubmit: (values: { email: string; terms: boolean }) => void;
}) {
  const form = useForm({ defaultValues: { email: "", terms: false } });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="email"
        label="Email"
        description="We only use it to reply to you."
        rules={{ required: "Enter your email." }}
        render={({ field }) => <Input type="email" {...field} />}
      />
      <FormField
        control={form.control}
        name="terms"
        label="I accept the terms"
        orientation="horizontal"
        render={({ field: { value, onChange, ...field } }) => (
          <Checkbox {...field} checked={value} onCheckedChange={onChange} />
        )}
      />
      <button type="submit">Sign up</button>
    </form>
  );
}

describe("FormField", () => {
  it("connects the label and description to the control", () => {
    render(<SignupForm onSubmit={vi.fn()} />);
    const input = screen.getByLabelText("Email");
    const description = screen.getByText("We only use it to reply to you.");
    expect(input.getAttribute("aria-describedby")).toBe(description.id);
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("shows the error, marks the control invalid and describes it with the error", async () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));

    const input = screen.getByLabelText("Email");
    const error = await screen.findByRole("alert");
    expect(error.textContent).toBe("Enter your email.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(error.id);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("works with controls that are not inputs", async () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Email"), "kevin@example.com");
    await userEvent.click(screen.getByRole("checkbox", { name: "I accept the terms" }));
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(onSubmit).toHaveBeenCalledWith(
      { email: "kevin@example.com", terms: true },
      expect.anything()
    );
  });
});

interface BookingValues {
  city: string | null;
  guests: number | null;
  checkIn: Date | undefined;
}

function BookingForm({ onSubmit }: { onSubmit: (values: BookingValues) => void }) {
  const form = useForm<BookingValues>({
    defaultValues: { city: null, guests: 2, checkIn: undefined },
  });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="city"
        label="City"
        rules={{ required: "Choose a city." }}
        render={({ field: { value, onChange, ...field } }) => (
          <Combobox
            {...field}
            options={[
              { value: "sp", label: "São Paulo" },
              { value: "rj", label: "Rio de Janeiro" },
            ]}
            value={value}
            onValueChange={onChange}
          />
        )}
      />
      <FormField
        control={form.control}
        name="guests"
        label="Guests"
        render={({ field: { value, onChange, ...field } }) => (
          <NumberInput {...field} min={1} max={8} value={value} onValueChange={onChange} />
        )}
      />
      <FormField
        control={form.control}
        name="checkIn"
        label="Check-in"
        render={({ field: { value, onChange, ...field } }) => (
          <DatePicker
            {...field}
            value={value}
            onValueChange={onChange}
            calendarProps={{ defaultMonth: new Date(2026, 4, 1) }}
          />
        )}
      />
      <button type="submit">Book</button>
    </form>
  );
}

describe("FormField with the richer inputs", () => {
  it("labels the combobox, number input and date picker and submits their values", async () => {
    const onSubmit = vi.fn();
    render(<BookingForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Book" }));
    const city = screen.getByRole("combobox", { name: "City" });
    expect(city.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Choose a city.");

    await userEvent.click(city);
    await userEvent.click(screen.getByRole("option", { name: "Rio de Janeiro" }));
    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    await userEvent.click(screen.getByRole("button", { name: "Check-in" }));
    await userEvent.click(document.querySelector<HTMLElement>('button[data-day="2026-05-20"]')!);
    await userEvent.click(screen.getByRole("button", { name: "Book" }));

    expect(screen.getByRole("spinbutton", { name: "Guests" }).getAttribute("aria-valuenow")).toBe(
      "3"
    );
    const values = onSubmit.mock.calls[0]?.[0] as BookingValues;
    expect(values.city).toBe("rj");
    expect(values.guests).toBe(3);
    expect(values.checkIn?.getDate()).toBe(20);
  });
});
