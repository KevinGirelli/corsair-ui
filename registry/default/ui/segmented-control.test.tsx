import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SegmentedControl, SegmentedControlItem } from "@/registry/default/ui/segmented-control";
import { installMatchMedia } from "@/test-utils/browser";

// jsdom does no layout: give each item a box from its position in the row,
// 100px wide for the first, 140px for the second, 4px inside the track.
const WIDTHS = [100, 140, 120];
function itemIndex(element: HTMLElement) {
  if (element.dataset.slot !== "segmented-control-item") return -1;
  return [...element.parentElement!.children]
    .filter((child) => (child as HTMLElement).dataset.slot === "segmented-control-item")
    .indexOf(element);
}
function mockLayout() {
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (
    this: HTMLElement
  ) {
    return WIDTHS[itemIndex(this)] ?? 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
    this: HTMLElement
  ) {
    return itemIndex(this) >= 0 ? 32 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (
    this: HTMLElement
  ) {
    return itemIndex(this) >= 0 ? 4 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
    this: HTMLElement
  ) {
    const index = itemIndex(this);
    if (index < 0) return 0;
    return 4 + WIDTHS.slice(0, index).reduce((sum, width) => sum + width, 0);
  });
}

function Audience(props: Partial<ComponentProps<typeof SegmentedControl>>) {
  return (
    <SegmentedControl aria-label="Audience" defaultValue="players" {...props}>
      <SegmentedControlItem value="players">For players</SegmentedControlItem>
      <SegmentedControlItem value="venues">For venues</SegmentedControlItem>
      <SegmentedControlItem value="clubs">For clubs</SegmentedControlItem>
    </SegmentedControl>
  );
}

const thumb = () => document.querySelector<HTMLElement>("[data-slot=segmented-control-thumb]")!;
const root = () => document.querySelector<HTMLElement>("[data-slot=segmented-control]")!;

beforeEach(() => {
  installMatchMedia([]);
  mockLayout();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SegmentedControl", () => {
  it("renders a named group of items with the default one active", () => {
    render(<Audience />);
    const group = screen.getByRole("radiogroup", { name: "Audience" });
    expect(group).toBe(root());
    expect(group.getAttribute("data-orientation")).toBe("horizontal");
    const items = screen.getAllByRole("radio");
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.getAttribute("data-slot"))).toEqual(
      Array(3).fill("segmented-control-item")
    );
    expect(screen.getByRole("radio", { name: "For players" }).getAttribute("data-state")).toBe(
      "on"
    );
  });

  it("stays on the active item when it is pressed again", async () => {
    const onValueChange = vi.fn();
    render(<Audience onValueChange={onValueChange} />);
    const players = screen.getByRole("radio", { name: "For players" });
    await userEvent.click(players);
    expect(players.getAttribute("data-state")).toBe("on");
    expect(players.getAttribute("aria-checked")).toBe("true");
    expect(onValueChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("radio", { name: "For venues" }));
    expect(onValueChange).toHaveBeenCalledWith("venues");
    expect(screen.getByRole("radio", { name: "For venues" }).getAttribute("data-state")).toBe("on");
  });

  it("follows a controlled value and reports the new one", async () => {
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("players");
      return (
        <Audience
          value={value}
          onValueChange={(next) => {
            onValueChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole("radio", { name: "For clubs" }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("clubs");
    expect(screen.getByRole("radio", { name: "For clubs" }).getAttribute("data-state")).toBe("on");
  });

  it("does not move when controlled and the parent ignores the change", async () => {
    render(<Audience value="players" />);
    await userEvent.click(screen.getByRole("radio", { name: "For venues" }));
    expect(screen.getByRole("radio", { name: "For players" }).getAttribute("data-state")).toBe(
      "on"
    );
  });

  it("is one Tab stop with arrow keys between items", async () => {
    render(<Audience />);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "For players" }));
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "For venues" }));
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "For clubs" }));
  });

  it("measures the thumb onto the active item and marks the control ready", () => {
    render(<Audience defaultValue="venues" />);
    expect(thumb().getAttribute("aria-hidden")).toBe("true");
    expect(thumb().style.width).toBe("140px");
    expect(thumb().style.height).toBe("32px");
    expect(thumb().style.transform).toBe("translate3d(104px, 4px, 0)");
    expect(root().hasAttribute("data-ready")).toBe(true);
  });

  it("is not ready, and leaves the pill to the item, until something is active", () => {
    render(<Audience defaultValue={undefined} />);
    expect(root().hasAttribute("data-ready")).toBe(false);
  });

  it("slides the thumb with a FLIP of the transform", async () => {
    render(<Audience />);
    const inverted: string[] = [];
    vi.spyOn(thumb(), "getBoundingClientRect").mockImplementation(() => {
      inverted.push(thumb().style.transform);
      return new DOMRect();
    });
    await userEvent.click(screen.getByRole("radio", { name: "For venues" }));
    // From the old box (x 4, 100px wide) onto the new one (x 104, 140px wide).
    expect(inverted).toEqual([`translate3d(4px, 4px, 0) scaleX(${100 / 140})`]);
    expect(thumb().style.width).toBe("140px");
    expect(thumb().style.transform).toBe("translate3d(104px, 4px, 0)");
    expect(thumb().style.transition).toBe("transform 320ms cubic-bezier(0.16, 1, 0.3, 1)");
  });

  it("takes duration and easing for the slide", async () => {
    render(<Audience duration={200} easing="ease-out" />);
    await userEvent.click(screen.getByRole("radio", { name: "For clubs" }));
    expect(thumb().style.transition).toBe("transform 200ms ease-out");
  });

  it("jumps without a transition with reduced motion", async () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    render(<Audience />);
    await userEvent.click(screen.getByRole("radio", { name: "For venues" }));
    expect(thumb().style.transform).toBe("translate3d(104px, 4px, 0)");
    expect(thumb().style.transition).not.toContain("transform");
  });

  it("passes props and refs through", () => {
    const ref = vi.fn();
    const itemRef = vi.fn();
    render(
      <SegmentedControl
        ref={ref}
        aria-label="Billing"
        id="billing"
        className="custom"
        thumbClassName="bg-primary"
        size="lg"
        defaultValue="monthly"
      >
        <SegmentedControlItem ref={itemRef} value="monthly">
          Monthly
        </SegmentedControlItem>
        <SegmentedControlItem value="yearly">Yearly</SegmentedControlItem>
      </SegmentedControl>
    );
    expect(ref).toHaveBeenCalledWith(root());
    expect(itemRef).toHaveBeenCalledWith(screen.getByRole("radio", { name: "Monthly" }));
    expect(root().id).toBe("billing");
    expect(root().getAttribute("aria-label")).toBe("Billing");
    expect(root().className).toContain("custom");
    expect(root().getAttribute("data-size")).toBe("lg");
    expect(thumb().className).toContain("bg-primary");
    expect(thumb().className).not.toContain("bg-background");
    expect(screen.getByRole("radio", { name: "Monthly" }).className).toContain("h-10");
  });
});
