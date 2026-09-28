import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BarsSpinner } from "@/registry/default/ui/bars-spinner";
import { ColorSwatches } from "@/registry/default/ui/color-swatches";
import { CopyButton } from "@/registry/default/ui/copy-button";
import { DashButton } from "@/registry/default/ui/dash-button";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubClipboard(writeText: (text: string) => Promise<void>) {
  const clipboard = { writeText: vi.fn(writeText) };
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
  return clipboard;
}

describe("CopyButton", () => {
  it("copies its value, shows a check and announces it", async () => {
    const clipboard = stubClipboard(async () => {});
    const onCopied = vi.fn();
    render(
      <CopyButton value="pnpm dlx shadcn@latest add @corsair-ui/button" onCopied={onCopied} />
    );
    const button = screen.getByRole("button", { name: "Copy to clipboard" });
    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute("data-state")).toBe("copied"));
    expect(clipboard.writeText).toHaveBeenCalledWith(
      "pnpm dlx shadcn@latest add @corsair-ui/button"
    );
    expect(onCopied).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toBe("Copied");
    // Still enabled, so keyboard focus stays where it was.
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("names both icons with data-slot, so the copied one can be styled on its own", () => {
    render(<CopyButton value="hello" />);
    const button = screen.getByRole("button", { name: "Copy to clipboard" });
    expect(button.querySelector("[data-slot=copy-button-copy-icon]")).not.toBeNull();
    expect(button.querySelector("[data-slot=copy-button-check-icon]")).not.toBeNull();
  });

  it("claims nothing when the browser refuses", async () => {
    const clipboard = stubClipboard(async () => {
      throw new Error("denied");
    });
    render(<CopyButton value="secret" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    await waitFor(() => expect(clipboard.writeText).toHaveBeenCalled());
    expect(button.getAttribute("data-state")).toBe("idle");
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("DashButton", () => {
  it("draws a hidden dashed outline inside the button, also when it renders a link", () => {
    const { rerender } = render(<DashButton>Plot a course</DashButton>);
    const button = screen.getByRole("button", { name: "Plot a course" });
    const outline = button.querySelector("[data-slot=dash-button-outline]");
    expect(outline?.getAttribute("aria-hidden")).toBe("true");
    expect(outline?.querySelector("rect")?.getAttribute("stroke-dasharray")).toBe("5 3");
    rerender(
      <DashButton asChild>
        <a href="/docs">Read the docs</a>
      </DashButton>
    );
    const link = screen.getByRole("link", { name: "Read the docs" });
    expect(link.querySelector("[data-slot=dash-button-outline]")).not.toBeNull();
  });
});

describe("ColorSwatches", () => {
  const colors = [
    { value: "brass", color: "#d9b06a", label: "Brass" },
    { value: "sea", color: "#6fb3c2", label: "Sea" },
    "#e07a5f",
  ];

  it("is a radio group of named swatches that picks on click", () => {
    const onValueChange = vi.fn();
    render(
      <ColorSwatches
        aria-label="Sail colour"
        colors={colors}
        defaultValue="brass"
        onValueChange={onValueChange}
      />
    );
    expect(screen.getByRole("radiogroup", { name: "Sail colour" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Brass" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "#e07a5f" }).style.getPropertyValue("--swatch")).toBe(
      "#e07a5f"
    );
    fireEvent.click(screen.getByRole("radio", { name: "Sea" }));
    expect(onValueChange).toHaveBeenCalledWith("sea");
    expect(screen.getByRole("radio", { name: "Sea" }).getAttribute("aria-checked")).toBe("true");
  });

  it("submits its value with a native form", () => {
    render(
      <form aria-label="Sail">
        <ColorSwatches aria-label="Sail colour" name="sail" colors={colors} defaultValue="sea" />
      </form>
    );
    const form = screen.getByRole("form") as HTMLFormElement;
    expect(new FormData(form).get("sail")).toBe("sea");
  });
});

describe("BarsSpinner", () => {
  it("is a status with twelve bars that start part-way through their fade", () => {
    render(<BarsSpinner size={24} aria-label="Syncing charts" />);
    const spinner = screen.getByRole("status", { name: "Syncing charts" });
    const bars = spinner.querySelectorAll<HTMLElement>("span[aria-hidden]");
    expect(bars).toHaveLength(12);
    expect(bars[0]?.style.animationDelay).toBe("calc(var(--bars-spinner-period) * -1)");
    expect(spinner.style.width).toBe("24px");
    // No hooks and no effects: it renders on the server.
    expect(renderToString(<BarsSpinner />)).toContain('role="status"');
  });
});
