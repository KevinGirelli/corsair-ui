import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";

describe("FieldError", () => {
  it("renders nothing without a message", () => {
    const { container } = render(<FieldError errors={[undefined, { message: "" }]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a single message as text", () => {
    render(<FieldError errors={[{ message: "Required" }]} />);
    expect(screen.getByRole("alert").textContent).toBe("Required");
  });

  it("lists several messages once each", () => {
    render(
      <FieldError
        errors={[{ message: "Too short" }, { message: "Needs a digit" }, { message: "Too short" }]}
      />
    );
    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["Too short", "Needs a digit"]);
  });

  it("prefers its children over errors", () => {
    render(<FieldError errors={[{ message: "From the library" }]}>Custom message</FieldError>);
    expect(screen.getByRole("alert").textContent).toBe("Custom message");
  });
});

describe("Field", () => {
  it("labels the control and exposes the orientation", () => {
    render(
      <Field orientation="horizontal" data-invalid="true">
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" aria-invalid="true" aria-describedby="email-help" />
        <FieldDescription id="email-help">We reply within two days.</FieldDescription>
      </Field>
    );
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-describedby")).toBe("email-help");
    expect(screen.getByRole("group")).toHaveProperty("dataset.orientation", "horizontal");
  });

  it("names a fieldset with its legend", () => {
    render(
      <FieldSet>
        <FieldLegend>Notifications</FieldLegend>
      </FieldSet>
    );
    expect(screen.getByRole("group", { name: "Notifications" }).tagName).toBe("FIELDSET");
  });
});
