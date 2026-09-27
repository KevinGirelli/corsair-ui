import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/registry/default/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/default/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/registry/default/ui/hover-card";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/registry/default/ui/navigation-menu";

describe("DropdownMenu", () => {
  function Menu({ onSelect = vi.fn() }: { onSelect?: (event: Event) => void }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>Options</DropdownMenuTrigger>
        <DropdownMenuContent className="custom-content">
          <DropdownMenuLabel inset>My account</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onSelect}>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  it("opens from the keyboard, moves with the arrows past disabled items and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const trigger = screen.getByRole("button", { name: "Options" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.focus();
    await user.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(menu.dataset.slot).toBe("dropdown-menu-content");
    expect(menu.dataset.state).toBe("open");
    expect(menu.className).toContain("custom-content");
    expect(menu.className).toContain("motion-safe:data-[state=open]:animate-in");
    expect(menu.className).toContain("max-h-[var(--radix-dropdown-menu-content-available-height)]");

    const profile = within(menu).getByRole("menuitem", { name: /Profile/ });
    await waitFor(() => expect(document.activeElement).toBe(profile));
    await user.keyboard("{ArrowDown}");
    // Billing is disabled, so focus skips to Settings.
    expect(document.activeElement).toBe(within(menu).getByRole("menuitem", { name: "Settings" }));
    expect(
      within(menu).getByRole("menuitem", { name: "Billing" }).getAttribute("aria-disabled")
    ).toBe("true");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("runs onSelect on Enter and closes, and exposes slots, inset and variant", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Menu onSelect={onSelect} />);
    screen.getByRole("button", { name: "Options" }).focus();
    await user.keyboard("{ArrowDown}");
    const menu = await screen.findByRole("menu");

    const label = within(menu).getByText("My account");
    expect(label.dataset.slot).toBe("dropdown-menu-label");
    expect(label.hasAttribute("data-inset")).toBe(true);
    const logout = within(menu).getByRole("menuitem", { name: "Log out" });
    expect(logout.dataset.variant).toBe("destructive");
    expect(logout.className).toContain("data-[variant=destructive]:text-destructive");
    expect(within(menu).getByRole("menuitem", { name: "Settings" }).dataset.variant).toBe(
      "default"
    );
    expect(
      within(menu).getByRole("menuitem", { name: "Settings" }).hasAttribute("data-inset")
    ).toBe(false);
    expect(within(menu).getByText("⇧⌘P").dataset.slot).toBe("dropdown-menu-shortcut");
    expect(menu.querySelector("[data-slot=dropdown-menu-separator]")?.getAttribute("role")).toBe(
      "separator"
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(within(menu).getByRole("menuitem", { name: /Profile/ }))
    );
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("toggles checkbox items and picks one radio item, keeping the menu state in aria-checked", async () => {
    const user = userEvent.setup();
    function Checks() {
      const [bar, setBar] = useState(true);
      const [position, setPosition] = useState("top");
      return (
        <DropdownMenu>
          <DropdownMenuTrigger>View</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={bar} onCheckedChange={setBar}>
              Status bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
              <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    render(<Checks />);
    await user.click(screen.getByRole("button", { name: "View" }));
    const bar = await screen.findByRole("menuitemcheckbox", { name: "Status bar" });
    expect(bar.getAttribute("aria-checked")).toBe("true");
    expect(bar.dataset.slot).toBe("dropdown-menu-checkbox-item");
    expect(bar.querySelector("svg")).not.toBeNull();
    await user.click(bar);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    await user.click(screen.getByRole("button", { name: "View" }));
    expect(
      (await screen.findByRole("menuitemcheckbox", { name: "Status bar" })).getAttribute(
        "aria-checked"
      )
    ).toBe("false");
    const top = screen.getByRole("menuitemradio", { name: "Top" });
    const bottom = screen.getByRole("menuitemradio", { name: "Bottom" });
    expect(top.getAttribute("aria-checked")).toBe("true");
    expect(bottom.getAttribute("aria-checked")).toBe("false");
    expect(bottom.dataset.slot).toBe("dropdown-menu-radio-item");
    await user.click(bottom);

    await user.click(screen.getByRole("button", { name: "View" }));
    expect(
      (await screen.findByRole("menuitemradio", { name: "Bottom" })).getAttribute("aria-checked")
    ).toBe("true");
    expect(screen.getByRole("menuitemradio", { name: "Top" }).getAttribute("aria-checked")).toBe(
      "false"
    );
  });

  it("opens a submenu with ArrowRight and closes it with ArrowLeft", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>More</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
              <DropdownMenuItem>Link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const trigger = screen.getByRole("button", { name: "More" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const share = await screen.findByRole("menuitem", { name: "Share" });
    await waitFor(() => expect(document.activeElement).toBe(share));
    expect(share.getAttribute("aria-haspopup")).toBe("menu");
    expect(share.dataset.slot).toBe("dropdown-menu-sub-trigger");
    expect(share.hasAttribute("data-inset")).toBe(true);

    await user.keyboard("{ArrowRight}");
    const email = await screen.findByRole("menuitem", { name: "Email" });
    expect(share.getAttribute("aria-expanded")).toBe("true");
    expect(share.dataset.state).toBe("open");
    expect(email.closest("[data-slot=dropdown-menu-sub-content]")).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(email));

    await user.keyboard("{ArrowLeft}");
    await waitFor(() => expect(screen.queryByRole("menuitem", { name: "Email" })).toBeNull());
    expect(document.activeElement).toBe(share);
  });

  it("forwards ref, works controlled and passes native props through", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <DropdownMenu
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
        >
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
          <DropdownMenuContent ref={ref} data-testid="actions">
            <DropdownMenuItem>One</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    render(<Controlled />);
    // The menu is named by its trigger.
    const menu = screen.getByRole("menu", { name: "Menu" });
    expect(ref.current).toBe(menu);
    expect(menu.dataset.testid).toBe("actions");
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});

describe("ContextMenu", () => {
  it("opens at a right click, runs items and closes on Escape", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger className="area">Canvas</ContextMenuTrigger>
        <ContextMenuContent className="custom-content">
          <ContextMenuLabel>Edit</ContextMenuLabel>
          <ContextMenuItem onSelect={onCopy}>
            Copy
            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
    const area = screen.getByText("Canvas");
    expect(area.dataset.slot).toBe("context-menu-trigger");
    expect(area.className).toContain("area");

    fireEvent.contextMenu(area, { clientX: 10, clientY: 10 });
    const menu = await screen.findByRole("menu");
    expect(menu.dataset.slot).toBe("context-menu-content");
    expect(menu.dataset.state).toBe("open");
    expect(menu.className).toContain("custom-content");
    expect(menu.className).toContain("motion-safe:data-[state=open]:animate-in");
    expect(menu.className).toContain("max-h-[var(--radix-context-menu-content-available-height)]");
    expect(area.dataset.state).toBe("open");

    const remove = within(menu).getByRole("menuitem", { name: "Delete" });
    expect(remove.dataset.variant).toBe("destructive");
    expect(within(menu).getByText("⌘C").dataset.slot).toBe("context-menu-shortcut");

    await user.click(within(menu).getByRole("menuitem", { name: /Copy/ }));
    expect(onCopy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    fireEvent.contextMenu(area, { clientX: 10, clientY: 10 });
    await screen.findByRole("menu");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("has checkbox, radio and submenu parts with their states", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuCheckboxItem checked onCheckedChange={onCheckedChange}>
            Show grid
          </ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value="fit">
            <ContextMenuRadioItem value="fit">Fit</ContextMenuRadioItem>
            <ContextMenuRadioItem value="fill">Fill</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Arrange</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Bring to front</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    );
    fireEvent.contextMenu(screen.getByText("Area"), { clientX: 10, clientY: 10 });
    const grid = await screen.findByRole("menuitemcheckbox", { name: "Show grid" });
    expect(grid.getAttribute("aria-checked")).toBe("true");
    expect(grid.dataset.slot).toBe("context-menu-checkbox-item");
    expect(screen.getByRole("menuitemradio", { name: "Fit" }).getAttribute("aria-checked")).toBe(
      "true"
    );
    expect(screen.getByRole("menuitemradio", { name: "Fill" }).getAttribute("aria-checked")).toBe(
      "false"
    );

    const arrange = screen.getByRole("menuitem", { name: "Arrange" });
    expect(arrange.dataset.slot).toBe("context-menu-sub-trigger");
    act(() => arrange.focus());
    await user.keyboard("{ArrowRight}");
    const front = await screen.findByRole("menuitem", { name: "Bring to front" });
    expect(front.closest("[data-slot=context-menu-sub-content]")).not.toBeNull();
    expect(arrange.getAttribute("aria-expanded")).toBe("true");

    await user.keyboard("{ArrowLeft}");
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: "Bring to front" })).toBeNull()
    );
    act(() => grid.focus());
    await user.keyboard("{Enter}");
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});

describe("NavigationMenu", () => {
  function Nav({ viewport }: { viewport?: boolean }) {
    return (
      <NavigationMenu viewport={viewport}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="custom-trigger">Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/analytics">Analytics</NavigationMenuLink>
              <NavigationMenuLink href="/billing">Billing</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild active className={navigationMenuTriggerStyle()}>
              <a href="/docs" data-router="">
                Docs
              </a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/blog">Blog</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator />
      </NavigationMenu>
    );
  }

  it("is a navigation landmark whose links can mark the current page", () => {
    render(<Nav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav.dataset.slot).toBe("navigation-menu");
    expect(nav.dataset.viewport).toBe("true");

    const docs = screen.getByRole("link", { name: "Docs" });
    expect(docs.getAttribute("aria-current")).toBe("page");
    expect(docs.hasAttribute("data-active")).toBe(true);
    expect(docs.dataset.slot).toBe("navigation-menu-link");
    expect(docs.getAttribute("data-router")).toBe("");
    expect(docs.className).toContain("h-9");
    const blog = screen.getByRole("link", { name: "Blog" });
    expect(blog.hasAttribute("aria-current")).toBe(false);
    expect(blog.hasAttribute("data-active")).toBe(false);
  });

  it("opens a panel from the trigger with the keyboard and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<Nav />);
    const trigger = screen.getByRole("button", { name: "Products" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.dataset.slot).toBe("navigation-menu-trigger");
    expect(trigger.className).toContain("custom-trigger");
    expect(trigger.className).toContain("focus-visible:ring-[3px]");
    const icon = trigger.querySelector("[data-slot=navigation-menu-trigger-icon]")!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.getAttribute("class")).toContain("group-data-[state=open]:rotate-180");
    expect(icon.getAttribute("class")).toContain("motion-safe:transition-transform");
    expect(screen.queryByRole("link", { name: "Analytics" })).toBeNull();

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.dataset.state).toBe("open");
    const analytics = await screen.findByRole("link", { name: "Analytics" });
    const content = analytics.closest<HTMLElement>("[data-slot=navigation-menu-content]")!;
    expect(content.className).toContain("motion-safe:data-[motion^=from-]:animate-in");
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    // The panel renders inside the shared viewport, which carries the open state.
    const viewport = content.closest<HTMLElement>("[data-slot=navigation-menu-viewport]")!;
    expect(viewport.dataset.state).toBe("open");
    expect(viewport.className).toContain("h-[var(--radix-navigation-menu-viewport-height)]");

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(analytics);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expect(document.activeElement).toBe(trigger);
  });

  it("moves between top-level items with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Nav />);
    const trigger = screen.getByRole("button", { name: "Products" });
    trigger.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Docs" }));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Blog" }));
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(trigger);
  });

  it("renders panels under their own trigger without a viewport", async () => {
    const user = userEvent.setup();
    render(<Nav viewport={false} />);
    expect(screen.getByRole("navigation").dataset.viewport).toBe("false");
    expect(document.querySelector("[data-slot=navigation-menu-viewport]")).toBeNull();
    const trigger = screen.getByRole("button", { name: "Products" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const content = (await screen.findByRole("link", { name: "Analytics" })).closest<HTMLElement>(
      "[data-slot=navigation-menu-content]"
    )!;
    expect(content.closest("[data-slot=navigation-menu-item]")).toBe(
      trigger.closest("[data-slot=navigation-menu-item]")
    );
    expect(content.dataset.state).toBe("open");
    expect(content.className).toContain("bg-popover");
    expect(content.className).toContain("motion-safe:data-[state=open]:animate-in");
  });

  it("accepts a custom label for the landmark", () => {
    render(
      <NavigationMenu aria-label="Products">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/a">A</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
    expect(screen.getByRole("navigation", { name: "Products" })).not.toBeNull();
  });
});

describe("HoverCard", () => {
  it("opens after the default delay on keyboard focus and closes on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <HoverCard>
          <HoverCardTrigger href="/users/ada">@ada</HoverCardTrigger>
          <HoverCardContent className="custom-card">Ada Lovelace</HoverCardContent>
        </HoverCard>
        <button type="button">Elsewhere</button>
      </>
    );
    const trigger = screen.getByRole("link", { name: "@ada" });
    expect(trigger.dataset.slot).toBe("hover-card-trigger");
    expect(trigger.getAttribute("href")).toBe("/users/ada");

    await user.tab();
    expect(document.activeElement).toBe(trigger);
    // Not yet: the card waits for openDelay.
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    const card = (
      await screen.findByText("Ada Lovelace", {}, { timeout: 2000 })
    ).closest<HTMLElement>("[data-slot=hover-card-content]")!;
    expect(card.dataset.state).toBe("open");
    expect(card.className).toContain("custom-card");
    expect(card.className).toContain("w-64");
    expect(card.className).toContain("motion-safe:data-[state=open]:animate-in");
    expect(trigger.dataset.state).toBe("open");

    await user.tab();
    await waitFor(() => expect(screen.queryByText("Ada Lovelace")).toBeNull());
  });

  it("uses a 400ms open delay by default and lets it be changed", async () => {
    vi.useFakeTimers();
    try {
      render(
        <>
          <HoverCard>
            <HoverCardTrigger href="/a">Default</HoverCardTrigger>
            <HoverCardContent>Default card</HoverCardContent>
          </HoverCard>
          <HoverCard openDelay={0}>
            <HoverCardTrigger href="/b">Instant</HoverCardTrigger>
            <HoverCardContent>Instant card</HoverCardContent>
          </HoverCard>
        </>
      );
      fireEvent.focus(screen.getByRole("link", { name: "Default" }));
      act(() => vi.advanceTimersByTime(399));
      expect(screen.queryByText("Default card")).toBeNull();
      act(() => vi.advanceTimersByTime(1));
      expect(screen.getByText("Default card")).not.toBeNull();

      fireEvent.focus(screen.getByRole("link", { name: "Instant" }));
      act(() => vi.advanceTimersByTime(0));
      expect(screen.getByText("Instant card")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("works controlled and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <HoverCard open>
        <HoverCardTrigger href="/c">Trigger</HoverCardTrigger>
        <HoverCardContent ref={ref}>Always open</HoverCardContent>
      </HoverCard>
    );
    expect(ref.current).toBe(screen.getByText("Always open"));
    expect(ref.current?.dataset.slot).toBe("hover-card-content");
  });
});
