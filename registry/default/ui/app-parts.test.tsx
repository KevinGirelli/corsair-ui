import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxIcon } from "lucide-react";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMatchMedia } from "@/test-utils/browser";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/registry/default/ui/empty-state";
import { Kbd, KbdGroup } from "@/registry/default/ui/kbd";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/registry/default/ui/resizable";
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
  type StepperProps,
} from "@/registry/default/ui/stepper";
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineDot,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from "@/registry/default/ui/timeline";

describe("Kbd", () => {
  it("renders a native kbd with its size, merged classes and ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <KbdGroup data-testid="group">
        <Kbd ref={ref} className="custom">
          Ctrl
        </Kbd>
        <Kbd size="sm">K</Kbd>
      </KbdGroup>
    );
    const ctrl = screen.getByText("Ctrl");
    expect(ctrl.tagName).toBe("KBD");
    expect(ref.current).toBe(ctrl);
    expect(ctrl.dataset.slot).toBe("kbd");
    expect(ctrl.dataset.size).toBe("default");
    expect(ctrl.className).toContain("custom");
    expect(ctrl.className).toContain("font-mono");
    expect(screen.getByText("K").dataset.size).toBe("sm");
    const group = screen.getByTestId("group");
    expect(group.tagName).toBe("SPAN");
    expect(group.dataset.slot).toBe("kbd-group");
  });
});

describe("EmptyState", () => {
  it("is a plain block with an h2 title, a hidden icon and actions", () => {
    render(
      <EmptyState data-testid="empty">
        <EmptyStateIcon>
          <InboxIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>No messages</EmptyStateTitle>
        <EmptyStateDescription>New messages show up here.</EmptyStateDescription>
        <EmptyStateActions>
          <button type="button">Write a message</button>
        </EmptyStateActions>
      </EmptyState>
    );
    const root = screen.getByTestId("empty");
    expect(root.dataset.slot).toBe("empty-state");
    expect(root.dataset.variant).toBe("dashed");
    expect(root.className).toContain("border-dashed");
    expect(root.getAttribute("role")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "No messages" })).toBeTruthy();
    const icon = root.querySelector('[data-slot="empty-state-icon"]');
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("New messages show up here.").tagName).toBe("P");
    expect(screen.getByRole("button", { name: "Write a message" })).toBeTruthy();
  });

  it("takes another heading level and the plain variant", () => {
    render(
      <EmptyState variant="plain" data-testid="empty">
        <EmptyStateTitle as="h3">Nothing here</EmptyStateTitle>
      </EmptyState>
    );
    const root = screen.getByTestId("empty");
    expect(root.dataset.variant).toBe("plain");
    expect(root.className).not.toContain("border-dashed");
    expect(screen.getByRole("heading", { level: 3, name: "Nothing here" })).toBeTruthy();
  });
});

function Steps(props: Partial<StepperProps>) {
  return (
    <Stepper {...props}>
      {["Crew", "Route", "Review"].map((title, step) => (
        <StepperItem key={title} step={step}>
          <StepperTrigger>
            <StepperIndicator />
            <StepperTitle>{title}</StepperTitle>
          </StepperTrigger>
          <StepperSeparator />
        </StepperItem>
      ))}
    </Stepper>
  );
}

describe("Stepper", () => {
  it("is a named nav around an ordered list with the state of each step", () => {
    render(<Steps defaultValue={1} />);
    const nav = screen.getByRole("navigation", { name: "Progress" });
    const list = within(nav).getByRole("list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.dataset.state)).toEqual(["complete", "current", "upcoming"]);

    const current = screen.getByRole("button", { name: /Route/ });
    expect(current.getAttribute("aria-current")).toBe("step");
    expect(current.textContent).toContain("Current");
    const done = screen.getByRole("button", { name: /Crew/ });
    expect(done.getAttribute("aria-current")).toBeNull();
    expect(done.textContent).toContain("Completed");
    expect(done.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    // The indicator does not repeat aria-current when a trigger carries it.
    expect(nav.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    for (const separator of nav.querySelectorAll('[data-slot="stepper-separator"]')) {
      expect(separator.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("disables steps not reached yet while linear, and moves back on click (uncontrolled)", async () => {
    const onValueChange = vi.fn();
    render(<Steps defaultValue={1} onValueChange={onValueChange} />);
    const review = screen.getByRole("button", { name: /Review/ });
    expect((review as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: /Crew/ }));
    expect(onValueChange).toHaveBeenCalledWith(0);
    expect(screen.getByRole("button", { name: /Crew/ }).getAttribute("aria-current")).toBe("step");
    expect(screen.getAllByRole("listitem").map((item) => item.dataset.state)).toEqual([
      "current",
      "upcoming",
      "upcoming",
    ]);
  });

  it("lets any step be picked with the keyboard when not linear", async () => {
    render(<Steps linear={false} />);
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Crew/ }));
    await user.tab();
    await user.tab();
    const review = screen.getByRole("button", { name: /Review/ });
    expect(document.activeElement).toBe(review);
    await user.keyboard("{Enter}");
    expect(review.getAttribute("aria-current")).toBe("step");
  });

  it("follows value when controlled", async () => {
    function Controlled() {
      const [value, setValue] = useState(2);
      return (
        <>
          <Steps value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("button", { name: /Review/ }).getAttribute("aria-current")).toBe(
      "step"
    );
    await userEvent.click(screen.getByRole("button", { name: /Route/ }));
    expect(screen.getByRole("status").textContent).toBe("1");
    expect(screen.getByRole("button", { name: /Route/ }).getAttribute("aria-current")).toBe("step");

    // A controlled stepper that ignores the request stays where it is.
    const onValueChange = vi.fn();
    render(<Steps value={2} onValueChange={onValueChange} label="Fixed" />);
    const fixed = screen.getByRole("navigation", { name: "Fixed" });
    await userEvent.click(within(fixed).getByRole("button", { name: /Crew/ }));
    expect(onValueChange).toHaveBeenCalledWith(0);
    expect(
      within(fixed)
        .getByRole("button", { name: /Review/ })
        .getAttribute("aria-current")
    ).toBe("step");
  });

  it("puts aria-current on the indicator without triggers and uses custom labels", () => {
    render(
      <Stepper
        defaultValue={1}
        orientation="vertical"
        label="Checkout"
        labels={{ complete: "Done", current: "Now" }}
      >
        <StepperItem step={0}>
          <StepperIndicator />
          <StepperTitle>Cart</StepperTitle>
          <StepperDescription>Two items</StepperDescription>
        </StepperItem>
        <StepperItem step={1}>
          <StepperIndicator />
          <StepperTitle>Pay</StepperTitle>
        </StepperItem>
      </Stepper>
    );
    const nav = screen.getByRole("navigation", { name: "Checkout" });
    expect(nav.dataset.orientation).toBe("vertical");
    expect(screen.queryByRole("button")).toBeNull();
    const [cart, pay] = [
      ...nav.querySelectorAll<HTMLElement>('[data-slot="stepper-indicator"]'),
    ] as [HTMLElement, HTMLElement];
    expect(cart.getAttribute("aria-current")).toBeNull();
    expect(cart.textContent).toContain("Done");
    expect(pay.getAttribute("aria-current")).toBe("step");
    expect(pay.textContent).toContain("Now");
    expect(pay.textContent).toContain("2");
  });
});

describe("Timeline", () => {
  it("is an ordered list of events with statuses, times and decorative marks", () => {
    render(
      <Timeline aria-label="Log">
        <TimelineItem status="success">
          <TimelineDot />
          <TimelineConnector />
          <TimelineContent>
            <TimelineTitle>Left port</TimelineTitle>
            <TimelineTime dateTime="2025-03-02T08:00">2 March</TimelineTime>
            <TimelineDescription>Fair wind.</TimelineDescription>
          </TimelineContent>
        </TimelineItem>
        <TimelineItem>
          <TimelineDot />
          <TimelineConnector />
          <TimelineContent>
            <TimelineTitle>At sea</TimelineTitle>
          </TimelineContent>
        </TimelineItem>
      </Timeline>
    );
    const list = screen.getByRole("list", { name: "Log" });
    expect(list.tagName).toBe("OL");
    expect(list.dataset.slot).toBe("timeline");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.dataset.status)).toEqual(["success", "default"]);
    const time = screen.getByText("2 March");
    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("datetime")).toBe("2025-03-02T08:00");
    for (const part of list.querySelectorAll(
      '[data-slot="timeline-dot"], [data-slot="timeline-connector"]'
    )) {
      expect(part.getAttribute("aria-hidden")).toBe("true");
    }
    expect(list.querySelector('[data-slot="timeline-dot"]')?.className).toContain(
      "group-data-[status=success]/timeline-item:bg-success"
    );
  });
});

describe("Resizable", () => {
  beforeEach(() => {
    installMatchMedia();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders panels with a focusable, named separator", async () => {
    const groupRef = createRef<HTMLDivElement>();
    const handleRef = createRef<HTMLDivElement>();
    render(
      <ResizablePanelGroup ref={groupRef} className="custom">
        <ResizablePanel defaultSize="40">One</ResizablePanel>
        <ResizableHandle ref={handleRef} withHandle />
        <ResizablePanel>Two</ResizablePanel>
      </ResizablePanelGroup>
    );
    const group = groupRef.current!;
    expect(group.dataset.slot).toBe("resizable-panel-group");
    expect(group.dataset.orientation).toBe("horizontal");
    expect(group.className).toContain("custom");
    expect(group.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(2);

    const separator = screen.getByRole("separator", { name: "Resize" });
    expect(handleRef.current).toBe(separator);
    expect(separator.dataset.slot).toBe("resizable-handle");
    expect(separator.getAttribute("aria-orientation")).toBe("vertical");
    expect(separator.tabIndex).toBe(0);
    const grip = separator.querySelector('[data-slot="resizable-handle-grip"]');
    expect(grip?.getAttribute("aria-hidden")).toBe("true");

    await userEvent.tab();
    expect(document.activeElement).toBe(separator);
    expect(separator.dataset.separator).toBe("focus");
  });

  it("stacks vertically and takes a custom label, without a grip by default", () => {
    const groupRef = createRef<HTMLDivElement>();
    render(
      <ResizablePanelGroup ref={groupRef} orientation="vertical">
        <ResizablePanel>Top</ResizablePanel>
        <ResizableHandle aria-label="Resize preview" />
        <ResizablePanel>Bottom</ResizablePanel>
      </ResizablePanelGroup>
    );
    expect(groupRef.current?.dataset.orientation).toBe("vertical");
    expect(groupRef.current?.style.flexDirection).toBe("column");
    const separator = screen.getByRole("separator", { name: "Resize preview" });
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    expect(separator.querySelector('[data-slot="resizable-handle-grip"]')).toBeNull();
  });
  it("takes its size from className, not an inline 100%", () => {
    const groupRef = createRef<HTMLDivElement>();
    render(
      <ResizablePanelGroup ref={groupRef} className="h-64">
        <ResizablePanel>One</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Two</ResizablePanel>
      </ResizablePanelGroup>
    );
    const group = groupRef.current!;
    expect(group.style.height).toBe("");
    expect(group.style.width).toBe("");
    expect(group.className).toContain("h-64");
  });
});
