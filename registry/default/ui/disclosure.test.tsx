import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/default/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/default/ui/collapsible";
import { Progress } from "@/registry/default/ui/progress";
import { ScrollArea, ScrollBar } from "@/registry/default/ui/scroll-area";
function Faq(props: Partial<Parameters<typeof Accordion>[0]>) {
  const rootProps = { type: "single", collapsible: true, ...props } as Parameters<
    typeof Accordion
  >[0];
  return (
    <Accordion {...rootProps}>
      <AccordionItem value="shipping">
        <AccordionTrigger>Shipping</AccordionTrigger>
        <AccordionContent className="custom-content">Three to five days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="returns">
        <AccordionTrigger>Returns</AccordionTrigger>
        <AccordionContent>Within 30 days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="warranty" disabled>
        <AccordionTrigger>Warranty</AccordionTrigger>
        <AccordionContent>Two years.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
describe("Accordion", () => {
  it("puts each trigger in a heading and opens a region named by it", async () => {
    render(<Faq />);
    const trigger = screen.getByRole("button", { name: "Shipping" });
    expect(screen.getByRole("heading", { name: "Shipping" }).contains(trigger)).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.dataset.slot).toBe("accordion-trigger");
    expect(screen.queryByRole("region")).toBeNull();
    await userEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const region = screen.getByRole("region", { name: "Shipping" });
    expect(region.dataset.slot).toBe("accordion-content");
    expect(region.getAttribute("data-state")).toBe("open");
    expect(region.textContent).toBe("Three to five days.");
    // className lands on the inner padding box.
    expect(screen.getByText("Three to five days.").className).toContain("custom-content");
    // The chevron is decoration only.
    expect(trigger.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
  it("keeps one section open in single mode and closes it again when collapsible", async () => {
    render(<Faq />);
    const shipping = screen.getByRole("button", { name: "Shipping" });
    const returns = screen.getByRole("button", { name: "Returns" });
    await userEvent.click(shipping);
    await userEvent.click(returns);
    expect(shipping.getAttribute("aria-expanded")).toBe("false");
    expect(returns.getAttribute("aria-expanded")).toBe("true");
    await userEvent.click(returns);
    expect(returns.getAttribute("aria-expanded")).toBe("false");
  });
  it("lets several sections stay open in multiple mode", async () => {
    render(<Faq type="multiple" />);
    await userEvent.click(screen.getByRole("button", { name: "Shipping" }));
    await userEvent.click(screen.getByRole("button", { name: "Returns" }));
    expect(screen.getAllByRole("region")).toHaveLength(2);
  });
  it("moves between triggers with the arrow keys, Home and End, and toggles with Enter", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const shipping = screen.getByRole("button", { name: "Shipping" });
    const returns = screen.getByRole("button", { name: "Returns" });
    await user.tab();
    expect(document.activeElement).toBe(shipping);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(returns);
    // The disabled item is skipped, so Down wraps back to the first trigger.
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(shipping);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(returns);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(shipping);
    await user.keyboard("{Enter}");
    expect(shipping.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard(" ");
    expect(shipping.getAttribute("aria-expanded")).toBe("false");
  });
  it("disables an item", () => {
    render(<Faq />);
    const warranty = screen.getByRole("button", { name: "Warranty" });
    expect((warranty as HTMLButtonElement).disabled).toBe(true);
    expect(warranty.hasAttribute("data-disabled")).toBe(true);
  });
  it("works controlled", async () => {
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("returns");
      return (
        <Faq
          type="single"
          value={value}
          onValueChange={(next: string) => {
            onValueChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("region", { name: "Returns" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Shipping" }));
    expect(onValueChange).toHaveBeenCalledWith("shipping");
    expect(screen.getByRole("region", { name: "Shipping" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Returns" })).toBeNull();
  });
  it("puts the height animation behind motion-safe", async () => {
    render(<Faq defaultValue="shipping" />);
    const region = screen.getByRole("region", { name: "Shipping" });
    expect(region.className).toContain("motion-safe:data-[state=open]:animate-accordion-open");
    expect(region.className).toContain("motion-safe:data-[state=closed]:animate-accordion-close");
    expect(region.className).not.toMatch(/duration-/);
  });
});
describe("Collapsible", () => {
  it("toggles a region from its trigger and links the two", async () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Advanced options</CollapsibleTrigger>
        <CollapsibleContent className="custom">Proxy settings</CollapsibleContent>
      </Collapsible>
    );
    const trigger = screen.getByRole("button", { name: "Advanced options" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.dataset.slot).toBe("collapsible-trigger");
    expect(screen.queryByText("Proxy settings")).toBeNull();
    await userEvent.click(trigger);
    const content = screen.getByText("Proxy settings");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    expect(content.dataset.slot).toBe("collapsible-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.className).toContain("custom");
    expect(content.className).toContain("motion-safe:data-[state=open]:animate-collapsible-open");
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Proxy settings")).toBeNull();
  });
  it("works controlled and passes asChild through to the trigger", async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <Collapsible
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
        >
          <CollapsibleTrigger asChild>
            <button type="button" className="mine">
              Details
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>Body</CollapsibleContent>
        </Collapsible>
      );
    }
    render(<Controlled />);
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger.className).toBe("mine");
    expect(screen.getByText("Body")).toBeTruthy();
    await userEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText("Body")).toBeNull();
  });
});
describe("Progress", () => {
  it("is a named progressbar with its value and a percentage for screen readers", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={30} aria-label="Uploading" className="custom" />);
    const bar = screen.getByRole("progressbar", { name: "Uploading" });
    expect(ref.current).toBe(bar);
    expect(bar.dataset.slot).toBe("progress");
    expect(bar.className).toContain("custom");
    expect(bar.getAttribute("aria-valuenow")).toBe("30");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe("30%");
    expect(bar.getAttribute("data-state")).toBe("loading");
    const indicator = bar.querySelector<HTMLElement>("[data-slot=progress-indicator]")!;
    expect(indicator.style.transform).toBe("translateX(-70%)");
  });
  it("uses max and getValueLabel, and reports completion", () => {
    render(
      <Progress
        value={4}
        max={4}
        aria-label="Steps"
        getValueLabel={(value, max) => `Step ${value} of ${max}`}
      />
    );
    const bar = screen.getByRole("progressbar", { name: "Steps" });
    expect(bar.getAttribute("aria-valuemax")).toBe("4");
    expect(bar.getAttribute("aria-valuetext")).toBe("Step 4 of 4");
    expect(bar.getAttribute("data-state")).toBe("complete");
    expect(bar.querySelector<HTMLElement>("[data-slot=progress-indicator]")!.style.transform).toBe(
      "translateX(-0%)"
    );
  });
  it("clamps values outside the range", () => {
    render(
      <>
        <Progress value={150} aria-label="Over" />
        <Progress value={-10} aria-label="Under" />
      </>
    );
    expect(screen.getByRole("progressbar", { name: "Over" }).getAttribute("aria-valuenow")).toBe(
      "100"
    );
    expect(screen.getByRole("progressbar", { name: "Under" }).getAttribute("aria-valuenow")).toBe(
      "0"
    );
  });
  it("is indeterminate without a value and animates only when motion is fine", () => {
    render(<Progress value={null} aria-label="Loading" />);
    const bar = screen.getByRole("progressbar", { name: "Loading" });
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.hasAttribute("aria-valuetext")).toBe(false);
    expect(bar.getAttribute("data-state")).toBe("indeterminate");
    const indicator = bar.querySelector<HTMLElement>("[data-slot=progress-indicator]")!;
    expect(indicator.getAttribute("data-state")).toBe("indeterminate");
    expect(indicator.style.transform).toBe("");
    expect(indicator.className).toContain(
      "motion-safe:data-[state=indeterminate]:animate-progress-indeterminate"
    );
    expect(indicator.className).toContain("motion-reduce:data-[state=indeterminate]:opacity-50");
  });
});
describe("ScrollArea", () => {
  it("renders its content in a viewport and passes props to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ScrollArea ref={ref} className="h-40" data-testid="area">
        <p>Tag list</p>
      </ScrollArea>
    );
    const root = screen.getByTestId("area");
    expect(ref.current).toBe(root);
    expect(root.dataset.slot).toBe("scroll-area");
    expect(root.className).toContain("h-40");
    const viewport = root.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]")!;
    expect(viewport.contains(screen.getByText("Tag list"))).toBe(true);
    expect(viewport.className).toContain("focus-visible:ring-[3px]");
    // Scrollable from the keyboard even with nothing focusable inside.
    expect(viewport.tabIndex).toBe(0);
  });
  it("shows vertical and horizontal scrollbars with type always", () => {
    render(
      <ScrollArea type="always" data-testid="area">
        <p>Wide content</p>
        <ScrollBar orientation="horizontal" className="custom" />
      </ScrollArea>
    );
    const bars = screen
      .getByTestId("area")
      .querySelectorAll<HTMLElement>("[data-slot=scroll-area-scrollbar]");
    expect([...bars].map((bar) => bar.getAttribute("data-orientation")).sort()).toEqual([
      "horizontal",
      "vertical",
    ]);
    const horizontal = [...bars].find((bar) => bar.dataset.orientation === "horizontal")!;
    expect(horizontal.className).toContain("custom");
  });
});
