import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/registry/default/components/blocks/dashboard";
import { Settings } from "@/registry/default/components/blocks/settings";
import type { DataTableColumnDef } from "@/registry/default/ui/data-table";
import { installMatchMedia } from "@/test-utils/browser";

const MOBILE = "(max-width: 767px)";
const DESKTOP = "(min-width: 768px)";

/** A promise the test settles by hand, to observe the pending state. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Records whether a submit reached the document un-cancelled (a native
 * submit), then cancels it so jsdom does not try to navigate.
 */
function watchNativeSubmits() {
  const submits: boolean[] = [];
  const listener = (event: Event) => {
    submits.push(!event.defaultPrevented);
    event.preventDefault();
  };
  document.addEventListener("submit", listener);
  return { submits, stop: () => document.removeEventListener("submit", listener) };
}

describe("Dashboard", () => {
  beforeEach(() => {
    installMatchMedia([]);
  });

  it("renders a complete application page with no props", () => {
    const { container } = render(<Dashboard />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.slot).toBe("dashboard");
    expect(root.className).toContain("min-h-svh");

    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    expect(within(sidebar).getByText("Acme Inc")).toBeTruthy();
    expect(within(sidebar).getAllByRole("list")).toHaveLength(2);
    expect(within(sidebar).getByText("Workspace")).toBeTruthy();
    expect(within(sidebar).getByText("Alex Morgan")).toBeTruthy();
    expect(within(sidebar).getByText("alex@example.com")).toBeTruthy();

    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { level: 1, name: "Dashboard" })).toBeTruthy();
    expect(within(main).getByRole("button", { name: "Toggle sidebar" })).toBeTruthy();
    expect(within(main).getByRole("button", { name: "New report" })).toBeTruthy();
    expect(within(main).getByRole("heading", { level: 2, name: "Revenue" })).toBeTruthy();
    expect(within(main).getByRole("heading", { level: 2, name: "Recent activity" })).toBeTruthy();
    expect(within(main).getByRole("slider", { name: "Revenue" })).toBeTruthy();
    const table = within(main).getByRole("table");
    // One header row and five activity rows.
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(within(table).getByText("Jordan Lee")).toBeTruthy();
  });

  it("marks the active link as the current page and shows badges", () => {
    render(<Dashboard />);
    const overview = screen.getByRole("link", { name: "Overview" });
    expect(overview.getAttribute("aria-current")).toBe("page");
    expect(overview.getAttribute("href")).toBe("#overview");
    expect(screen.getByRole("link", { name: "Inbox" }).getAttribute("aria-current")).toBeNull();
    const badge = screen
      .getByRole("link", { name: "Inbox" })
      .closest("li")!
      .querySelector("[data-slot=sidebar-menu-badge]");
    expect(badge?.textContent).toBe("4");
  });

  it("renders stats as a description list with trend labels for screen readers", () => {
    render(
      <Dashboard
        stats={[
          { id: "a", label: "Signups", value: "320", caption: "vs last week", trend: "down" },
          { id: "b", label: "Churn", value: "2%" },
        ]}
        trendLabels={{ down: "Fell" }}
      />
    );
    const group = document.querySelector("[data-slot=dashboard-stats]")!;
    expect(group.tagName).toBe("DL");
    expect(within(group as HTMLElement).getAllByRole("term")).toHaveLength(2);
    expect(screen.getByText("Signups").tagName).toBe("DT");
    const caption = group.querySelector("[data-slot=stat-caption]")!;
    expect(caption.getAttribute("data-trend")).toBe("down");
    expect(caption.textContent).toBe("Fell: vs last week");
    expect(group.querySelectorAll("[data-slot=stat-caption]")).toHaveLength(1);
  });

  it("replaces every piece through props and hides the ones set to null", () => {
    render(
      <Dashboard
        brand={<span>Northwind</span>}
        nav={[
          {
            label: "Main",
            items: [{ id: "home", label: "Home", href: "/home", active: true }],
          },
        ]}
        user={null}
        title="Overview"
        actions={null}
        stats={[]}
        chart={null}
        table={null}
      >
        <p>Extra content</p>
      </Dashboard>
    );
    expect(screen.getByText("Northwind")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/home");
    expect(screen.queryByRole("link", { name: "Overview" })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeTruthy();
    expect(screen.queryByText("Alex Morgan")).toBeNull();
    expect(screen.queryByRole("button", { name: "New report" })).toBeNull();
    expect(document.querySelector("[data-slot=dashboard-stats]")).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Extra content")).toBeTruthy();
  });

  it("shows the user's initials when there is no avatar image, hidden from screen readers", () => {
    render(<Dashboard user={{ name: "Sam Lee" }} />);
    const user = document.querySelector("[data-slot=dashboard-user]")!;
    const avatar = user.querySelector("[data-slot=avatar]")!;
    expect(avatar.getAttribute("aria-hidden")).toBe("true");
    expect(avatar.textContent).toBe("SL");
    expect(user.querySelector("[data-slot=dashboard-user-email]")).toBeNull();
  });

  it("drives the chart from the chart prop with the keyboard", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <Dashboard
        chart={{
          title: "Visitors",
          data: [4, 6, 5, 9],
          labels: ["Q1", "Q2", "Q3", "Q4"],
          onIndexChange,
        }}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: "Visitors" })).toBeTruthy();
    const slider = screen.getByRole("slider", { name: "Visitors" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Q4: 9");
    slider.focus();
    await user.keyboard("{ArrowLeft}");
    expect(slider.getAttribute("aria-valuetext")).toBe("Q3: 5");
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it("renders a custom table with DataTable features", async () => {
    const user = userEvent.setup();
    interface Row {
      id: string;
      city: string;
    }
    const columns: DataTableColumnDef<Row>[] = [{ accessorKey: "city", header: "City" }];
    render(
      <Dashboard<Row>
        table={{
          title: "Cities",
          columns,
          data: [
            { id: "1", city: "Oslo" },
            { id: "2", city: "Lima" },
          ],
          filterLabel: "Filter cities",
        }}
      />
    );
    const table = screen.getByRole("table", { name: "Cities" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    await user.type(screen.getByRole("searchbox", { name: "Filter cities" }), "Lim");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("Lima")).toBeTruthy();
  });

  it("passes providerProps and sidebarProps through", () => {
    const onOpenChange = vi.fn();
    render(
      <Dashboard
        providerProps={{ defaultOpen: false, onOpenChange, shortcut: "k" }}
        sidebarProps={{ "aria-label": "Main navigation", collapsible: "icon" }}
      />
    );
    const sidebar = screen.getByRole("complementary", { name: "Main navigation" });
    expect(sidebar.dataset.state).toBe("collapsed");
    const trigger = screen.getByRole("button", { name: "Toggle sidebar" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-keyshortcuts")).toBe("Meta+K Control+K");

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(sidebar.dataset.state).toBe("expanded");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    // Collapsed to icons, the links keep their names.
    expect(screen.getByRole("link", { name: "Overview" })).toBeTruthy();
  });

  it("toggles the sidebar with the header trigger", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    const trigger = screen.getByRole("button", { name: "Toggle sidebar" });
    expect(trigger.getAttribute("aria-controls")).toBe(sidebar.id);
    await user.click(trigger);
    expect(sidebar.dataset.state).toBe("collapsed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the mobile sheet after a link is followed", async () => {
    installMatchMedia([MOBILE]);
    const user = userEvent.setup();
    render(<Dashboard />);
    expect(screen.queryByRole("complementary")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    const sheet = await screen.findByRole("dialog", { name: "Navigation" });
    const link = within(sheet).getByRole("link", { name: "Reports" });
    link.addEventListener("click", (event) => event.preventDefault());
    await user.click(link);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("merges className and forwards native props, the ref and insetProps", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Dashboard
        ref={ref}
        id="app"
        className="h-[640px] min-h-0"
        providerProps={{ className: "overflow-hidden" }}
        insetProps={{ className: "overflow-auto", id: "content" }}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.id).toBe("app");
    expect(root.className).toContain("h-[640px]");
    expect(root.className).toContain("overflow-hidden");
    const main = screen.getByRole("main");
    expect(main.id).toBe("content");
    expect(main.className).toContain("overflow-auto");
  });
});

describe("Settings", () => {
  beforeEach(() => {
    installMatchMedia([DESKTOP]);
  });

  function tab(name: string) {
    return screen.getByRole("tab", { name });
  }

  it("renders a complete page with no props", () => {
    const { container } = render(<Settings />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root.dataset.slot).toBe("settings");
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeTruthy();
    expect(
      screen.getByText("Manage your profile, account and notification preferences.")
    ).toBeTruthy();
    const list = screen.getByRole("tablist", { name: "Settings sections" });
    expect(
      within(list)
        .getAllByRole("tab")
        .map((node) => node.textContent)
    ).toEqual(["Profile", "Account", "Notifications"]);
    expect(tab("Profile").getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel", { name: "Profile" });
    expect(within(panel).getByRole("heading", { level: 2, name: "Profile" })).toBeTruthy();
    expect((within(panel).getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe(
      "Alex Morgan"
    );
  });

  it("stacks the tabs vertically on wide screens and moves with Up and Down", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    tab("Profile").focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(tab("Account"));
    expect(tab("Account").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel", { name: "Account" })).toBeTruthy();
    await user.keyboard("{End}");
    expect(tab("Notifications").getAttribute("aria-selected")).toBe("true");
  });

  it("lays the tabs out in a row on small screens and moves with Left and Right", async () => {
    installMatchMedia([]);
    const user = userEvent.setup();
    render(<Settings />);
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("horizontal");
    tab("Profile").focus();
    await user.keyboard("{ArrowRight}");
    expect(tab("Account").getAttribute("aria-selected")).toBe("true");
  });

  it("keeps each form's live regions mounted and empty while idle", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const profile = document.querySelector("[data-slot=settings-profile-form]")!;
    expect(profile.getAttribute("data-status")).toBe("idle");
    expect(within(profile as HTMLElement).getByRole("status").textContent).toBe("");
    expect(within(profile as HTMLElement).getByRole("alert").textContent).toBe("");
    await user.click(tab("Account"));
    const panel = screen.getByRole("tabpanel", { name: "Account" });
    // Password form and danger zone, each with its own pair.
    expect(within(panel).getAllByRole("status")).toHaveLength(2);
    expect(within(panel).getAllByRole("alert")).toHaveLength(2);
  });

  it("saves the profile from pending to success and keeps the values", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onSaveProfile = vi.fn(() => request.promise);
    render(<Settings onSaveProfile={onSaveProfile} />);
    const form = document.querySelector<HTMLElement>("[data-slot=settings-profile-form]")!;
    const bio = within(form).getByRole("textbox", { name: "Bio" }) as HTMLTextAreaElement;
    expect(bio.tagName).toBe("TEXTAREA");
    expect(bio.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.getElementById(bio.getAttribute("aria-describedby")!)?.textContent).toBe(
      "A few words about yourself."
    );
    await user.clear(bio);
    await user.type(bio, "Hello");
    await user.click(within(form).getByRole("button", { name: "Save profile" }));
    expect(onSaveProfile).toHaveBeenCalledWith({
      name: "Alex Morgan",
      email: "alex@example.com",
      bio: "Hello",
    });
    expect(form.dataset.status).toBe("pending");
    expect(
      (within(form).getByRole("button", { name: "Saving…" }) as HTMLButtonElement).disabled
    ).toBe(true);
    await act(async () => request.resolve());
    expect(form.dataset.status).toBe("success");
    expect(within(form).getByRole("status").textContent).toBe("Your profile has been saved.");
    expect(bio.value).toBe("Hello");
  });

  it("reports a failed profile save in the alert region", async () => {
    const user = userEvent.setup();
    render(<Settings onSaveProfile={() => Promise.reject(new Error("offline"))} />);
    const form = document.querySelector<HTMLElement>("[data-slot=settings-profile-form]")!;
    await user.click(within(form).getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(form.dataset.status).toBe("error"));
    expect(within(form).getByRole("alert").textContent).toBe(
      "Something went wrong. Please try again."
    );
    expect(within(form).getByRole("status").textContent).toBe("");
  });

  it("does not bypass native validation of the profile form", async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn();
    render(<Settings onSaveProfile={onSaveProfile} />);
    const email = screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement;
    expect(email.type).toBe("email");
    expect(email.required).toBe(true);
    expect(email.autocomplete).toBe("email");
    await user.clear(email);
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(onSaveProfile).not.toHaveBeenCalled();
  });

  it("submits natively without a handler and passes form props through", async () => {
    const user = userEvent.setup();
    const native = watchNativeSubmits();
    const formSubmit = vi.fn();
    try {
      render(
        <Settings profileFormProps={{ action: "/profile", method: "post", onSubmit: formSubmit }} />
      );
      const form = document.querySelector("[data-slot=settings-profile-form]")!;
      expect(form.getAttribute("action")).toBe("/profile");
      await user.click(screen.getByRole("button", { name: "Save profile" }));
      expect(formSubmit).toHaveBeenCalledTimes(1);
      expect(native.submits).toEqual([true]);
    } finally {
      native.stop();
    }
  });

  it("changes the password, then clears the form", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onChangePassword = vi.fn(() => request.promise);
    render(<Settings onChangePassword={onChangePassword} minPasswordLength={10} />);
    await user.click(tab("Account"));
    const form = document.querySelector<HTMLElement>("[data-slot=settings-password-form]")!;
    const current = within(form).getByLabelText("Current password") as HTMLInputElement;
    const next = within(form).getByLabelText("New password") as HTMLInputElement;
    expect(current.type).toBe("password");
    expect(current.autocomplete).toBe("current-password");
    expect(next.autocomplete).toBe("new-password");
    expect(next.minLength).toBe(10);
    expect(document.getElementById(next.getAttribute("aria-describedby")!)?.textContent).toBe(
      "At least 8 characters."
    );
    expect(within(form).getAllByRole("button", { name: "Show password" })).toHaveLength(2);

    await user.type(current, "old-secret");
    await user.type(next, "new-secret-123");
    await user.click(within(form).getByRole("button", { name: "Update password" }));
    expect(onChangePassword).toHaveBeenCalledWith({
      currentPassword: "old-secret",
      newPassword: "new-secret-123",
    });
    expect(form.dataset.status).toBe("pending");
    await act(async () => request.resolve());
    expect(form.dataset.status).toBe("success");
    expect(within(form).getByRole("status").textContent).toBe("Your password has been updated.");
    expect(current.value).toBe("");
    expect(next.value).toBe("");
  });

  it("confirms account deletion in an alert dialog that waits for onDelete", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onDelete = vi.fn(() => request.promise);
    render(<Settings onDelete={onDelete} />);
    await user.click(tab("Account"));
    const danger = document.querySelector<HTMLElement>("[data-slot=settings-danger]")!;
    expect(within(danger).getByRole("heading", { level: 2, name: "Danger zone" })).toBeTruthy();
    const trigger = within(danger).getByRole("button", { name: "Delete account" });
    await user.click(trigger);

    const dialog = await screen.findByRole("alertdialog", { name: "Delete your account?" });
    expect(dialog.textContent).toContain("This cannot be undone.");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }));
    await user.click(within(dialog).getByRole("button", { name: "Delete account" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(danger.dataset.status).toBe("pending");
    // Still open while the handler runs.
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(
      (within(dialog).getByRole("button", { name: "Deleting…" }) as HTMLButtonElement).disabled
    ).toBe(true);

    await act(async () => request.resolve());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(danger.dataset.status).toBe("success");
    expect(within(danger).getByRole("status").textContent).toBe("Your account has been deleted.");
  });

  it("keeps the dialog open and reports an error when onDelete throws", async () => {
    const user = userEvent.setup();
    render(<Settings onDelete={() => Promise.reject(new Error("nope"))} />);
    await user.click(tab("Account"));
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete account" }));
    const danger = document.querySelector<HTMLElement>("[data-slot=settings-danger]")!;
    await waitFor(() => expect(danger.dataset.status).toBe("error"));
    // The page behind the modal is hidden, so the dialog announces the error itself.
    expect(within(dialog).getByRole("alert").textContent).toBe(
      "Something went wrong. Please try again."
    );
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(within(danger).getByRole("alert").textContent).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("renders notification switches named and described by their field", async () => {
    const user = userEvent.setup();
    const onNotificationsChange = vi.fn();
    render(
      <Settings
        notifications={[
          { id: "digest", label: "Weekly digest", description: "A summary every Monday." },
          { id: "mentions", label: "Mentions", defaultChecked: true },
        ]}
        onNotificationsChange={onNotificationsChange}
      />
    );
    await user.click(tab("Notifications"));
    const digest = screen.getByRole("switch", { name: "Weekly digest" });
    const mentions = screen.getByRole("switch", { name: "Mentions" });
    expect(digest.getAttribute("aria-checked")).toBe("false");
    expect(mentions.getAttribute("aria-checked")).toBe("true");
    expect(document.getElementById(digest.getAttribute("aria-describedby")!)?.textContent).toBe(
      "A summary every Monday."
    );
    expect(mentions.getAttribute("aria-describedby")).toBeNull();
    expect(digest.closest("[data-slot=field]")?.getAttribute("data-orientation")).toBe(
      "horizontal"
    );

    await user.click(digest);
    expect(digest.getAttribute("aria-checked")).toBe("true");
    expect(onNotificationsChange).toHaveBeenLastCalledWith({ digest: true, mentions: true });
    mentions.focus();
    await user.keyboard(" ");
    expect(onNotificationsChange).toHaveBeenLastCalledWith({ digest: true, mentions: false });
  });

  it("accepts custom sections, labels and tab props", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Settings
        labels={{ title: "Preferences", sections: "Preference sections", profileTab: "You" }}
        sections={[
          { value: "profile", label: "You" },
          { value: "billing", label: "Billing", content: <p>Billing details</p> },
        ]}
        tabsProps={{ defaultValue: "billing", onValueChange }}
      />
    );
    expect(screen.getByRole("heading", { level: 1, name: "Preferences" })).toBeTruthy();
    expect(screen.getByRole("tablist", { name: "Preference sections" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByRole("tabpanel", { name: "Billing" }).textContent).toBe("Billing details");
    await user.click(tab("You"));
    expect(onValueChange).toHaveBeenCalledWith("profile");
    expect(screen.getByRole("tabpanel", { name: "You" })).toBeTruthy();
  });

  it("merges className and forwards native props and the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Settings ref={ref} id="settings" className="custom" />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.id).toBe("settings");
    expect(root.className).toContain("custom");
    expect(root.className).toContain("py-10");
  });
});
