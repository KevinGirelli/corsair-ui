import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushFrames, installMatchMedia } from "@/test-utils/browser";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/default/ui/drawer";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
  type SidebarProps,
  type SidebarProviderProps,
} from "@/registry/default/ui/sidebar";

const MOBILE = "(max-width: 767px)";

function Shell({
  sidebar,
  ...provider
}: Omit<SidebarProviderProps, "children"> & { sidebar?: SidebarProps }) {
  return (
    <SidebarProvider {...provider}>
      <Sidebar {...sidebar}>
        <SidebarHeader>Acme</SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive tooltip="Inbox">
                  <a href="/inbox">
                    <svg aria-hidden="true" />
                    <span>Inbox</span>
                  </a>
                </SidebarMenuButton>
                <SidebarMenuBadge>12</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" size="lg">
                  <svg aria-hidden="true" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>Footer</SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <p>Page</p>
      </SidebarInset>
    </SidebarProvider>
  );
}

function aside() {
  return document.querySelector<HTMLElement>("aside[data-slot=sidebar]")!;
}

describe("Sidebar", () => {
  beforeEach(() => {
    installMatchMedia([]);
  });

  it("renders a named aside beside a main, with the width variables on the wrapper", () => {
    render(<Shell width="18rem" />);
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    expect(sidebar).toBe(aside());
    expect(sidebar.dataset.state).toBe("expanded");
    expect(sidebar.dataset.collapsible).toBe("icon");
    expect(sidebar.dataset.side).toBe("left");
    expect(sidebar.className).toContain("hidden");
    expect(sidebar.className).toContain("md:flex");
    expect(sidebar.className).toContain("motion-reduce:transition-none");
    const inner = sidebar.querySelector<HTMLElement>("[data-slot=sidebar-inner]")!;
    expect(inner.className).toContain("bg-card");
    expect(inner.className).toContain("border-r");

    const wrapper = document.querySelector<HTMLElement>("[data-slot=sidebar-wrapper]")!;
    expect(wrapper.className).toContain("min-h-svh");
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("18rem");
    expect(wrapper.style.getPropertyValue("--sidebar-width-icon")).toBe("3rem");

    const main = screen.getByRole("main");
    expect(main.dataset.slot).toBe("sidebar-inset");
    expect(main.className).toContain("min-w-0");

    const list = within(sidebar).getByRole("list");
    expect(list.dataset.slot).toBe("sidebar-menu");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(sidebar.querySelector("[data-slot=sidebar-content]")!.className).toContain(
      "overflow-auto"
    );
    expect(sidebar.querySelector("[data-slot=sidebar-separator]")).not.toBeNull();
  });

  it("marks the active link as the current page", () => {
    render(<Shell />);
    const link = screen.getByRole("link", { name: "Inbox" });
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.dataset.active).toBe("true");
    expect(link.dataset.slot).toBe("sidebar-menu-button");
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.hasAttribute("aria-current")).toBe(false);
    expect(button.dataset.size).toBe("lg");
    expect(button.className).toContain("h-12");
  });

  it("collapses to icons from the trigger, keeping names and showing tooltips", async () => {
    const user = userEvent.setup();
    render(<Shell />);
    const trigger = screen.getByRole("button", { name: "Toggle sidebar" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(aside().id);
    expect(trigger.getAttribute("aria-keyshortcuts")).toBe("Meta+B Control+B");

    // Expanded: no tooltip on focus.
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Inbox" }));
    expect(screen.queryByRole("tooltip")).toBeNull();

    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(aside().dataset.state).toBe("collapsed");
    expect(aside().className).toContain("w-[var(--sidebar-width-icon)]");
    expect(screen.getByText("Workspace").className).toContain("sr-only");
    expect(screen.getByText("12").className).toContain("hidden");

    const link = screen.getByRole("link", { name: "Inbox" });
    expect(link.className).toContain("size-8");
    expect(link.className).toContain("[&>:not(svg)]:sr-only");

    act(() => link.focus());
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe("Inbox");
  });

  it("toggles with ⌘/Ctrl + the shortcut key, or not at all with null", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Shell />);
    await user.keyboard("{Control>}b{/Control}");
    expect(aside().dataset.state).toBe("collapsed");
    await user.keyboard("{Meta>}b{/Meta}");
    expect(aside().dataset.state).toBe("expanded");
    await user.keyboard("b");
    expect(aside().dataset.state).toBe("expanded");
    unmount();

    const { unmount: unmountCustom } = render(<Shell shortcut="j" />);
    await user.keyboard("{Control>}b{/Control}");
    expect(aside().dataset.state).toBe("expanded");
    await user.keyboard("{Control>}j{/Control}");
    expect(aside().dataset.state).toBe("collapsed");
    unmountCustom();

    render(<Shell shortcut={null} />);
    await user.keyboard("{Control>}b{/Control}");
    expect(aside().dataset.state).toBe("expanded");
    expect(
      screen.getByRole("button", { name: "Toggle sidebar" }).hasAttribute("aria-keyshortcuts")
    ).toBe(false);
  });

  it("works controlled and starts collapsed with defaultOpen={false}", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { unmount } = render(<Shell open onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // The parent did not update `open`, so it stays expanded.
    expect(aside().dataset.state).toBe("expanded");
    unmount();

    function Controlled() {
      const [open, setOpen] = useState(false);
      return <Shell open={open} onOpenChange={setOpen} />;
    }
    const { unmount: unmountControlled } = render(<Controlled />);
    expect(aside().dataset.state).toBe("collapsed");
    await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    expect(aside().dataset.state).toBe("expanded");
    unmountControlled();

    render(<Shell defaultOpen={false} />);
    expect(aside().dataset.state).toBe("collapsed");
  });

  it("slides off-canvas on the right and becomes inert", async () => {
    const user = userEvent.setup();
    render(<Shell sidebar={{ side: "right", collapsible: "offcanvas", "aria-label": "Main" }} />);
    const sidebar = screen.getByRole("complementary", { name: "Main" });
    expect(sidebar.dataset.side).toBe("right");
    expect(sidebar.querySelector("[data-slot=sidebar-inner]")!.className).toContain("border-l");
    expect(sidebar.hasAttribute("inert")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    expect(sidebar.dataset.state).toBe("collapsed");
    expect(sidebar.dataset.collapsible).toBe("offcanvas");
    expect(sidebar.className).toContain("w-0");
    expect(sidebar.querySelector("[data-slot=sidebar-inner]")!.className).toContain(
      "translate-x-full"
    );
    expect(sidebar.hasAttribute("inert")).toBe(true);
  });

  it("stays expanded with collapsible none", async () => {
    const user = userEvent.setup();
    render(<Shell sidebar={{ collapsible: "none" }} />);
    await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    expect(aside().dataset.state).toBe("expanded");
    expect(aside().className.split(" ")).not.toContain("hidden");
    expect(aside().className).not.toContain("md:flex");
  });

  it("merges className, forwards native props and exposes its state through useSidebar", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLElement>();
    function State() {
      const { state, isMobile, open } = useSidebar();
      return <output>{`${state} ${isMobile ? "mobile" : "desktop"} ${open}`}</output>;
    }
    render(
      <SidebarProvider className="custom-wrapper">
        <Sidebar ref={ref} className="custom-sidebar" data-testid="sidebar">
          <SidebarContent />
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger label="Menu" className="custom-trigger" />
          <State />
        </SidebarInset>
      </SidebarProvider>
    );
    expect(ref.current).toBe(aside());
    expect(aside().className).toContain("custom-sidebar");
    expect(screen.getByTestId("sidebar")).toBe(aside());
    expect(document.querySelector("[data-slot=sidebar-wrapper]")!.className).toContain(
      "custom-wrapper"
    );
    const trigger = screen.getByRole("button", { name: "Menu" });
    expect(trigger.className).toContain("custom-trigger");
    expect(screen.getByRole("status").textContent).toBe("expanded desktop true");
    await user.click(trigger);
    expect(screen.getByRole("status").textContent).toBe("collapsed desktop false");
  });

  it("throws when useSidebar is used outside the provider", () => {
    function Orphan() {
      useSidebar();
      return null;
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow("SidebarProvider");
  });

  it("opens in a named sheet on mobile and returns focus to the trigger", async () => {
    installMatchMedia([MOBILE]);
    const user = userEvent.setup();
    render(<Shell sidebar={{ mobileLabel: "Main menu" }} />);
    expect(aside()).toBeNull();
    const trigger = screen.getByRole("button", { name: "Toggle sidebar" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.hasAttribute("aria-controls")).toBe(false);

    await user.click(trigger);
    const sheet = await screen.findByRole("dialog", { name: "Main menu" });
    expect(sheet.dataset.slot).toBe("sidebar");
    expect(sheet.dataset.mobile).toBe("true");
    expect(sheet.className).toContain("bg-card");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(sheet.id);
    // Not collapsed to icons inside the sheet.
    expect(within(sheet).getByText("Workspace").className).not.toContain("sr-only");
    expect(within(sheet).getByRole("link", { name: "Inbox" })).toBeTruthy();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the mobile sheet with the shortcut", async () => {
    installMatchMedia([MOBILE]);
    const user = userEvent.setup();
    render(<Shell />);
    await user.keyboard("{Control>}b{/Control}");
    expect(await screen.findByRole("dialog", { name: "Navigation" })).toBeTruthy();
  });
});

function ShareDrawer({
  onOpenChange,
  closeThreshold,
}: {
  onOpenChange?: (open: boolean) => void;
  closeThreshold?: number;
}) {
  return (
    <Drawer onOpenChange={onOpenChange}>
      <DrawerTrigger>Share</DrawerTrigger>
      <DrawerContent closeThreshold={closeThreshold}>
        <DrawerHeader>
          <DrawerTitle>Share this page</DrawerTitle>
          <DrawerDescription>Anyone with the link can view it.</DrawerDescription>
          <button type="button">Copy link</button>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose>Done</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function content() {
  return document.querySelector<HTMLElement>("[data-slot=drawer-content]")!;
}

function handle() {
  return document.querySelector<HTMLElement>("[data-slot=drawer-handle]")!;
}

function dragBy(element: HTMLElement, distance: number) {
  fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientY: 100 });
  fireEvent.pointerMove(element, { pointerId: 1, clientY: 100 + distance });
}

describe("Drawer", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 400,
      width: 400,
      height: 400,
      toJSON: () => ({}),
    });
  });

  it("opens from its trigger as a named dialog at the bottom, and Escape returns focus", async () => {
    const user = userEvent.setup();
    render(<ShareDrawer />);
    const trigger = screen.getByRole("button", { name: "Share" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Share this page" });
    expect(dialog).toBe(content());
    expect(dialog.getAttribute("aria-describedby")).toBe(
      screen.getByText("Anyone with the link can view it.").id
    );
    expect(dialog.className).toContain("bottom-0");
    expect(dialog.className).toContain("rounded-t-xl");
    expect(dialog.className).toContain("max-h-[85svh]");
    expect(dialog.className).toContain("motion-safe:data-[state=open]:animate-in");
    expect(dialog.className).toContain("data-[state=open]:slide-in-from-bottom");
    expect(dialog.className).toContain("motion-reduce:transition-none");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(handle().getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector("[data-slot=drawer-overlay]")).not.toBeNull();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes from DrawerClose", async () => {
    const user = userEvent.setup();
    render(<ShareDrawer />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(await screen.findByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("follows the pointer while dragged and closes past the threshold", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ShareDrawer onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    await screen.findByRole("dialog");

    dragBy(handle(), 60);
    expect(content().dataset.dragging).toBe("true");
    await act(flushFrames);
    expect(content().style.getPropertyValue("--drawer-drag")).toBe("60px");

    fireEvent.pointerMove(handle(), { pointerId: 1, clientY: 220 });
    fireEvent.pointerUp(handle(), { pointerId: 1, clientY: 220 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("springs back when released short of the threshold, or when cancelled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ShareDrawer onOpenChange={onOpenChange} closeThreshold={0.5} />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    await screen.findByRole("dialog");

    // 150px of a 400px drawer is below half.
    dragBy(handle(), 150);
    await act(flushFrames);
    fireEvent.pointerUp(handle(), { pointerId: 1, clientY: 250 });
    expect(content().hasAttribute("data-dragging")).toBe(false);
    expect(content().style.getPropertyValue("--drawer-drag")).toBe("0px");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    dragBy(handle(), 300);
    fireEvent.pointerCancel(handle(), { pointerId: 1 });
    expect(content().style.getPropertyValue("--drawer-drag")).toBe("0px");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("drags from the header too, but not from a button inside it", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ShareDrawer onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    await screen.findByRole("dialog");

    const copy = screen.getByRole("button", { name: "Copy link" });
    const header = document.querySelector<HTMLElement>("[data-slot=drawer-header]")!;
    fireEvent.pointerDown(copy, { pointerId: 1, button: 0, clientY: 100 });
    expect(content().hasAttribute("data-dragging")).toBe(false);
    fireEvent.pointerUp(copy, { pointerId: 1, clientY: 100 });

    fireEvent.pointerDown(screen.getByText("Share this page"), {
      pointerId: 2,
      button: 0,
      clientY: 100,
    });
    expect(content().dataset.dragging).toBe("true");
    fireEvent.pointerMove(header, { pointerId: 2, clientY: 300 });
    fireEvent.pointerUp(header, { pointerId: 2, clientY: 300 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("works controlled, can hide the handle, merges classes and forwards ref", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <output>{open ? "open" : "closed"}</output>
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent
              ref={ref}
              showHandle={false}
              className="custom-class"
              overlayClassName="bg-black/80"
            >
              <DrawerTitle>Controlled</DrawerTitle>
              <DrawerDescription>Body</DrawerDescription>
            </DrawerContent>
          </Drawer>
        </>
      );
    }
    render(<Controlled />);
    const dialog = screen.getByRole("dialog", { name: "Controlled" });
    expect(ref.current).toBe(dialog);
    expect(dialog.className).toContain("custom-class");
    expect(dialog.className).toContain("bg-background");
    expect(handle()).toBeNull();
    const overlay = document.querySelector<HTMLElement>("[data-slot=drawer-overlay]")!;
    expect(overlay.className).toContain("bg-black/80");
    expect(overlay.className).not.toContain("bg-black/50");
    expect(dialog.hasAttribute("overlayclassname")).toBe(false);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("closed")).toBeTruthy();
  });
});
