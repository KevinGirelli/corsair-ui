import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dock, DockItem, DockSeparator } from "@/registry/default/ui/dock";
import { NavLink } from "@/registry/default/ui/nav-link";
import {
  SiteHeader,
  SiteHeaderActions,
  SiteHeaderBrand,
  SiteHeaderContent,
  SiteHeaderMenu,
  SiteHeaderMenuClose,
  SiteHeaderNav,
} from "@/registry/default/ui/site-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/default/ui/tabs";
import { installIntersectionObserver } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NavLink", () => {
  it("marks the current page for screen readers and styling", () => {
    render(
      <nav aria-label="Main">
        <NavLink href="/docs" active>
          Docs
        </NavLink>
        <NavLink href="/blog">Blog</NavLink>
      </nav>
    );
    const docs = screen.getByRole("link", { name: "Docs" });
    const blog = screen.getByRole("link", { name: "Blog" });
    expect(docs.getAttribute("aria-current")).toBe("page");
    expect(docs.getAttribute("data-active")).toBe("true");
    expect(blog.hasAttribute("aria-current")).toBe(false);
    expect(blog.getAttribute("data-active")).toBe("false");
  });

  it("styles a router link passed with asChild and keeps its own props", () => {
    render(
      <NavLink asChild active className="custom">
        <a href="/pricing" data-router="">
          Pricing
        </a>
      </NavLink>
    );
    const link = screen.getByRole("link", { name: "Pricing" });
    expect(link.getAttribute("data-slot")).toBe("nav-link");
    expect(link.getAttribute("data-router")).toBe("");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.className).toContain("custom");
  });
});

describe("SiteHeader", () => {
  function Header() {
    return (
      <SiteHeader>
        <SiteHeaderContent>
          <SiteHeaderBrand>
            <a href="/">Brand</a>
          </SiteHeaderBrand>
          <SiteHeaderNav>
            <NavLink href="/docs">Docs</NavLink>
          </SiteHeaderNav>
          <SiteHeaderActions>
            <SiteHeaderMenu titleClassName="sr-only">
              <SiteHeaderMenuClose asChild>
                <NavLink href="#pricing">Pricing</NavLink>
              </SiteHeaderMenuClose>
            </SiteHeaderMenu>
          </SiteHeaderActions>
        </SiteHeaderContent>
      </SiteHeader>
    );
  }

  it("is a sticky banner with a named main navigation", () => {
    render(<Header />);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("sticky");
    expect(header.getAttribute("data-scrolled")).toBe("false");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
  });

  it("can scroll away with the page", () => {
    render(<SiteHeader sticky={false}>Top</SiteHeader>);
    expect(screen.getByRole("banner").className).not.toContain("sticky");
  });

  it("flags data-scrolled once the marker at the top leaves the viewport", () => {
    render(<Header />);
    const header = screen.getByRole("banner");
    const sentinel = document.body.querySelector("[data-slot=site-header-sentinel]")!;
    expect(sentinel.parentElement).toBe(document.body);
    expect(io.observers(sentinel)).toBe(1);
    act(() => io.intersect(sentinel, false));
    expect(header.getAttribute("data-scrolled")).toBe("true");
    act(() => io.intersect(sentinel, true));
    expect(header.getAttribute("data-scrolled")).toBe("false");
  });

  it("opens the mobile menu in a sheet and closes it when a link is followed", async () => {
    const user = userEvent.setup();
    render(<Header />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger.className).toContain("md:hidden");

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    await user.click(within(dialog).getByRole("link", { name: "Pricing" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the menu with Escape and returns focus to the button", async () => {
    const user = userEvent.setup();
    render(<Header />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("Dock", () => {
  it("is a named navigation landmark shown by default", () => {
    render(
      <Dock>
        <DockItem label="Home" asChild>
          <a href="/">H</a>
        </DockItem>
        <DockSeparator />
        <DockItem label="Search">S</DockItem>
      </Dock>
    );
    const dock = screen.getByRole("navigation", { name: "Quick links" });
    expect(dock.getAttribute("data-state")).toBe("visible");
    expect(dock.hasAttribute("inert")).toBe(false);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    const search = screen.getByRole("button", { name: "Search" });
    expect(search.getAttribute("type")).toBe("button");
    expect(screen.getByRole("separator").getAttribute("aria-orientation")).toBe("vertical");
    expect(document.querySelector("[data-slot=dock-sentinel]")).toBeNull();
  });

  it("shows an item's label as a tooltip on keyboard focus", async () => {
    render(
      <Dock>
        <DockItem label="Search">S</DockItem>
      </Dock>
    );
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Search" }));
    expect((await screen.findByRole("tooltip")).textContent).toBe("Search");
  });

  it("stays hidden and inert until the page scrolls past showAfter", () => {
    render(
      <Dock showAfter="80vh" aria-label="Shortcuts">
        <DockItem label="Top">T</DockItem>
      </Dock>
    );
    const dock = screen.getByRole("navigation", { hidden: true, name: "Shortcuts" });
    const sentinel = document.body.querySelector<HTMLElement>("[data-slot=dock-sentinel]")!;
    expect(sentinel.parentElement).toBe(document.body);
    expect(sentinel.style.height).toBe("80vh");
    expect(dock.getAttribute("data-state")).toBe("hidden");
    expect(dock.hasAttribute("inert")).toBe(true);

    act(() => io.intersect(sentinel, false));
    expect(dock.getAttribute("data-state")).toBe("visible");
    expect(dock.hasAttribute("inert")).toBe(false);

    act(() => io.intersect(sentinel, true));
    expect(dock.getAttribute("data-state")).toBe("hidden");
  });

  it("takes pixel values for showAfter and can sit at the top", () => {
    render(
      <Dock showAfter={400} position="top">
        <DockItem label="Top">T</DockItem>
      </Dock>
    );
    const sentinel = document.body.querySelector<HTMLElement>("[data-slot=dock-sentinel]")!;
    expect(sentinel.style.height).toBe("400px");
    const wrapper = document.querySelector("[data-slot=dock-wrapper]")!;
    expect(wrapper.className).toContain("top-6");
  });

  it("follows the open prop when controlled", () => {
    const { rerender } = render(
      <Dock open={false}>
        <DockItem label="Top">T</DockItem>
      </Dock>
    );
    const dock = document.querySelector("[data-slot=dock]")!;
    expect(dock.getAttribute("data-state")).toBe("hidden");
    rerender(
      <Dock open>
        <DockItem label="Top">T</DockItem>
      </Dock>
    );
    expect(dock.getAttribute("data-state")).toBe("visible");
  });
});

describe("Tabs", () => {
  function Example({ orientation }: { orientation?: "horizontal" | "vertical" }) {
    return (
      <Tabs defaultValue="one" orientation={orientation}>
        <TabsList aria-label="Sections" variant="line">
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
          <TabsTrigger value="three">Three</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two">Second panel</TabsContent>
        <TabsContent value="three">Third panel</TabsContent>
      </Tabs>
    );
  }

  it("links each tab to its panel and passes the list variant to the triggers", () => {
    render(<Example />);
    const list = screen.getByRole("tablist", { name: "Sections" });
    expect(list.getAttribute("data-variant")).toBe("line");
    const one = screen.getByRole("tab", { name: "One" });
    expect(one.getAttribute("aria-selected")).toBe("true");
    expect(one.getAttribute("data-variant")).toBe("line");
    const panel = screen.getByRole("tabpanel", { name: "One" });
    expect(one.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.textContent).toBe("First panel");
  });

  it("moves between tabs with the arrow keys and Home / End", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "One" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Second panel");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Three" }).getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "One" }).getAttribute("aria-selected")).toBe("true");
  });

  it("uses the up and down arrows when vertical", async () => {
    const user = userEvent.setup();
    render(<Example orientation="vertical" />);
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: "Two" }).getAttribute("aria-selected")).toBe("true");
  });

  it("defaults to the segmented variant and selects on click", () => {
    const onValueChange = vi.fn();
    render(
      <Tabs defaultValue="a" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const b = screen.getByRole("tab", { name: "B" });
    expect(b.getAttribute("data-variant")).toBe("default");
    fireEvent.mouseDown(b, { button: 0 });
    expect(onValueChange).toHaveBeenCalledWith("b");
  });
});
