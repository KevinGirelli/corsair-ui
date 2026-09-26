import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/registry/default/ui/button";

describe("Button", () => {
  it("renders a native button with the default variant and size", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveProperty("dataset.variant", "default");
    expect(button).toHaveProperty("dataset.size", "default");
    expect(button.className).toContain("bg-primary");
  });

  it("applies the requested variant and lets className win conflicts", () => {
    render(
      <Button variant="outline" size="sm" className="px-8">
        Cancel
      </Button>
    );
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.className).toContain("border-input");
    expect(button.className).toContain("px-8");
    expect(button.className).not.toMatch(/(^|\s)px-3(\s|$)/);
  });

  it("renders its child with the button styles when asChild is set", () => {
    render(
      <Button asChild variant="link">
        <a href="/docs">Docs</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link.getAttribute("href")).toBe("/docs");
    expect(link.className).toContain("underline-offset-4");
  });

  it("blocks clicks and shows a spinner while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>
    );
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector("[data-slot=button-spinner]")).not.toBeNull();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("marks a disabled asChild link with aria-disabled instead of the disabled attribute", () => {
    render(
      <Button asChild disabled>
        <a href="/next">Next</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Next" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.hasAttribute("disabled")).toBe(false);
  });
});
