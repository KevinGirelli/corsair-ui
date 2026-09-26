import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Alert, AlertDescription, AlertTitle } from "@/registry/default/ui/alert";
import { Badge } from "@/registry/default/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/registry/default/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/default/ui/input-group";
import { Separator } from "@/registry/default/ui/separator";
import { Skeleton } from "@/registry/default/ui/skeleton";
import { Spinner } from "@/registry/default/ui/spinner";
import { Textarea } from "@/registry/default/ui/textarea";

describe("Badge", () => {
  it("draws status tones as a dot and keeps the text neutral", () => {
    render(<Badge variant="success">Paid</Badge>);
    const badge = screen.getByText("Paid");
    expect(badge).toHaveProperty("dataset.variant", "success");
    expect(badge.className).toContain("before:bg-success");
    expect(badge.className).toContain("text-foreground");
    // The dot is a pseudo-element, so nothing extra reaches the accessible name.
    expect(badge.childElementCount).toBe(0);
  });

  it("moves the tone to the icon when there is one", () => {
    render(
      <Badge variant="warning">
        <svg aria-hidden="true" />
        Pending
      </Badge>
    );
    const { className } = screen.getByText("Pending");
    expect(className).toContain("has-[>svg]:before:hidden");
    expect(className).toContain("[&>svg]:text-warning");
  });

  it("can render as a link", () => {
    render(
      <Badge asChild variant="outline">
        <a href="/changelog">New</a>
      </Badge>
    );
    expect(screen.getByRole("link", { name: "New" }).dataset.slot).toBe("badge");
  });
});

describe("Alert", () => {
  it("is announced and lays out title and description", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>Try another card.</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Payment failed" + "Try another card.");
  });

  it("keeps a neutral surface and colours only the icon", () => {
    render(<Alert variant="destructive">Payment failed</Alert>);
    const { className } = screen.getByRole("alert");
    expect(className).toContain("bg-card");
    expect(className).toContain("[&>svg]:text-destructive");
    expect(className).not.toMatch(/(^|\s)(text|bg|border)-destructive/);
  });

  it("can be a polite status instead", () => {
    render(<Alert role="status">Saved</Alert>);
    expect(screen.getByRole("status").textContent).toBe("Saved");
  });
});

describe("Card", () => {
  it("renders its parts", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardAction>
            <button type="button">Edit</button>
          </CardAction>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText("Notifications").dataset.slot).toBe("card-title");
    expect(screen.getByRole("button", { name: "Edit" }).parentElement?.dataset.slot).toBe(
      "card-action"
    );
  });
});

describe("InputGroup", () => {
  it("keeps the input usable next to its addon", async () => {
    render(
      <InputGroup>
        <InputGroupAddon>https://</InputGroupAddon>
        <InputGroupInput aria-label="Website" />
      </InputGroup>
    );
    const input = screen.getByRole("textbox", { name: "Website" });
    expect(input.dataset.slot).toBe("input-group-control");
    await userEvent.type(input, "corsairui.dev");
    expect((input as HTMLInputElement).value).toBe("corsairui.dev");
  });
});

describe("small pieces", () => {
  it("Spinner is a status with a default label", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeDefined();
  });

  it("Skeleton and a decorative Separator are hidden from assistive tech", () => {
    const { container } = render(
      <>
        <Skeleton />
        <Separator />
      </>
    );
    expect(container.querySelector("[data-slot=skeleton]")?.getAttribute("aria-hidden")).toBe(
      "true"
    );
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("a semantic Separator is exposed with its orientation", () => {
    render(<Separator decorative={false} orientation="vertical" />);
    expect(screen.getByRole("separator").getAttribute("aria-orientation")).toBe("vertical");
  });

  it("Textarea passes native props through", () => {
    render(<Textarea aria-label="Message" rows={6} />);
    expect(screen.getByRole("textbox", { name: "Message" }).getAttribute("rows")).toBe("6");
  });
});
