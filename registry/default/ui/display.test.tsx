import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Alert, AlertDescription, AlertTitle } from "@/registry/default/ui/alert";
import { Badge, BadgeDot } from "@/registry/default/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/registry/default/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/default/ui/input-group";
import { Separator } from "@/registry/default/ui/separator";
import { Skeleton } from "@/registry/default/ui/skeleton";
import { Spinner } from "@/registry/default/ui/spinner";
import { Textarea } from "@/registry/default/ui/textarea";

describe("Badge", () => {
  it("renders the tone and keeps the dot out of the accessible name", () => {
    render(
      <Badge variant="success">
        <BadgeDot />
        Paid
      </Badge>
    );
    const badge = screen.getByText("Paid");
    expect(badge).toHaveProperty("dataset.variant", "success");
    expect(badge.className).toContain("bg-success/15");
    expect(badge.querySelector("[data-slot=badge-dot]")?.getAttribute("aria-hidden")).toBe("true");
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
    expect(alert.className).toContain("text-destructive");
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
