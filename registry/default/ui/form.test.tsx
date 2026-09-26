import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/registry/default/ui/checkbox";
import { FormField } from "@/registry/default/ui/form";
import { Input } from "@/registry/default/ui/input";

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
