import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContactForm } from "@/registry/default/components/blocks/contact-form";
import { Newsletter } from "@/registry/default/components/blocks/newsletter";
import { SiteFooter } from "@/registry/default/components/blocks/site-footer";

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

describe("ContactForm", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Sam Lee");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "sam@example.com");
    await user.type(screen.getByRole("textbox", { name: "Message" }), "Hello there");
  }

  it("renders a complete section with no props", () => {
    const { container } = render(<ContactForm />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root.dataset.slot).toBe("contact-form");
    expect(root.dataset.status).toBe("idle");

    expect(screen.getByRole("heading", { level: 2, name: "Get in touch" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "hello@example.com" }).getAttribute("href")).toBe(
      "mailto:hello@example.com"
    );
    const details = root.querySelector("[data-slot=contact-form-details]") as HTMLElement;
    expect(within(details).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Send message" }).getAttribute("type")).toBe(
      "submit"
    );
  });

  it("uses labelled, required fields with native validation hints", () => {
    render(<ContactForm />);
    const name = screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
    const email = screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement;
    const message = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;

    expect(name.required && email.required && message.required).toBe(true);
    expect(name.autocomplete).toBe("name");
    expect(email.type).toBe("email");
    expect(email.autocomplete).toBe("email");
    expect(message.tagName).toBe("TEXTAREA");
    expect(message.rows).toBe(5);
  });

  it("keeps the live regions mounted and empty while idle", () => {
    render(<ContactForm />);
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("goes from pending to success, then resets the form", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onSubmit = vi.fn(() => request.promise);
    const { container } = render(<ContactForm onSubmit={onSubmit} />);
    const root = container.firstElementChild as HTMLElement;

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Sam Lee",
      email: "sam@example.com",
      message: "Hello there",
    });
    expect(root.dataset.status).toBe("pending");
    const button = screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await act(async () => request.resolve());

    expect(root.dataset.status).toBe("success");
    expect(screen.getByRole("status").textContent).toBe(
      "Thanks for your message. We'll get back to you soon."
    );
    expect(screen.getByRole("alert").textContent).toBe("");
    expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("");
    expect(
      (screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it("goes from pending to error and keeps the values", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const { container } = render(<ContactForm onSubmit={() => request.promise} />);
    const root = container.firstElementChild as HTMLElement;

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(root.dataset.status).toBe("pending");

    await act(async () => request.reject(new Error("Network down")));

    expect(root.dataset.status).toBe("error");
    expect(screen.getByRole("alert").textContent).toBe("Something went wrong. Please try again.");
    expect(screen.getByRole("status").textContent).toBe("");
    expect((screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement).value).toBe(
      "sam@example.com"
    );
  });

  it("does not bypass native validation", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<ContactForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Sam");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "not-an-email");
    await user.type(screen.getByRole("textbox", { name: "Message" }), "Hi");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect((container.firstElementChild as HTMLElement).dataset.status).toBe("idle");
  });

  it("submits natively without onSubmit and passes form props through", async () => {
    const user = userEvent.setup();
    const native = watchNativeSubmits();
    const formSubmit = vi.fn();
    try {
      render(
        <ContactForm formProps={{ action: "/contact", method: "post", onSubmit: formSubmit }} />
      );
      const form = screen.getByRole("button", { name: "Send message" }).closest("form")!;
      expect(form.getAttribute("action")).toBe("/contact");
      expect(form.getAttribute("method")).toBe("post");

      await fill(user);
      await user.click(screen.getByRole("button", { name: "Send message" }));

      expect(formSubmit).toHaveBeenCalledTimes(1);
      expect(native.submits).toEqual([true]);
    } finally {
      native.stop();
    }
  });

  it("replaces content and labels through props", async () => {
    const user = userEvent.setup();
    render(
      <ContactForm
        eyebrow={null}
        title="Write to support"
        description="We read everything."
        details={<p>Call us any time</p>}
        labels={{ name: "Full name", submit: "Send", success: "Got it" }}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: "Write to support" })).toBeTruthy();
    expect(screen.queryByText("Contact")).toBeNull();
    expect(screen.getByText("We read everything.")).toBeTruthy();
    expect(screen.getByText("Call us any time")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "hello@example.com" })).toBeNull();

    await user.type(screen.getByRole("textbox", { name: "Full name" }), "Sam");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "sam@example.com");
    await user.type(screen.getByRole("textbox", { name: "Message" }), "Hi");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Got it"));
  });

  it("merges className and forwards native props and the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<ContactForm ref={ref} id="contact" className="custom" />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.id).toBe("contact");
    expect(root.className).toContain("custom");
    expect(root.className).toContain("py-16");
  });
});

describe("Newsletter", () => {
  it("renders a complete band with no props", () => {
    const { container } = render(<Newsletter />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root.dataset.slot).toBe("newsletter");
    expect(root.dataset.variant).toBe("card");
    expect(root.dataset.status).toBe("idle");

    expect(screen.getByRole("heading", { level: 2, name: "Stay in the loop" })).toBeTruthy();
    const email = screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement;
    expect(email.type).toBe("email");
    expect(email.required).toBe(true);
    expect(email.autocomplete).toBe("email");
    expect(email.placeholder).toBe("you@example.com");
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeTruthy();
    expect(screen.getByText("No spam. Unsubscribe at any time.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("subscribes from the keyboard: pending, then success", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onSubscribe = vi.fn(() => request.promise);
    const { container } = render(<Newsletter onSubscribe={onSubscribe} />);
    const root = container.firstElementChild as HTMLElement;
    const email = screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement;

    await user.type(email, "sam@example.com{Enter}");

    expect(onSubscribe).toHaveBeenCalledWith("sam@example.com");
    expect(root.dataset.status).toBe("pending");
    expect(
      (screen.getByRole("button", { name: "Subscribing…" }) as HTMLButtonElement).disabled
    ).toBe(true);

    await act(async () => request.resolve());

    expect(root.dataset.status).toBe("success");
    expect(screen.getByRole("status").textContent).toBe(
      "You're subscribed. Check your inbox to confirm."
    );
    expect(email.value).toBe("");
  });

  it("shows the error in an alert and keeps the email", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const { container } = render(<Newsletter onSubscribe={() => request.promise} />);
    const email = screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement;

    await user.type(email, "sam@example.com");
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await act(async () => request.reject(new Error("Nope")));

    expect((container.firstElementChild as HTMLElement).dataset.status).toBe("error");
    expect(screen.getByRole("alert").textContent).toBe("Could not subscribe. Please try again.");
    expect(email.value).toBe("sam@example.com");
  });

  it("does not bypass native validation", async () => {
    const user = userEvent.setup();
    const onSubscribe = vi.fn();
    render(<Newsletter onSubscribe={onSubscribe} />);

    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await user.type(screen.getByRole("textbox", { name: "Email address" }), "not-an-email{Enter}");

    expect(onSubscribe).not.toHaveBeenCalled();
  });

  it("submits natively without onSubscribe and passes form props through", async () => {
    const user = userEvent.setup();
    const native = watchNativeSubmits();
    try {
      render(<Newsletter formProps={{ action: "/subscribe", method: "post" }} />);
      const email = screen.getByRole("textbox", { name: "Email address" });
      expect(email.closest("form")!.getAttribute("action")).toBe("/subscribe");

      await user.type(email, "sam@example.com");
      await user.click(screen.getByRole("button", { name: "Subscribe" }));
      expect(native.submits).toEqual([true]);
    } finally {
      native.stop();
    }
  });

  it("replaces content through props and supports the plain variant", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <Newsletter
        ref={ref}
        className="custom"
        variant="plain"
        title="Release notes"
        description="One email per release."
        note={null}
        placeholder="name@company.test"
        labels={{ email: "Work email", submit: "Join" }}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.className).toContain("custom");
    expect(root.dataset.variant).toBe("plain");
    expect(root.querySelector("[data-slot=newsletter-content]")!.className).not.toContain("border");
    expect(screen.getByRole("heading", { level: 2, name: "Release notes" })).toBeTruthy();
    expect(screen.getByText("One email per release.")).toBeTruthy();
    expect(screen.queryByText("No spam. Unsubscribe at any time.")).toBeNull();
    const email = screen.getByRole("textbox", { name: "Work email" }) as HTMLInputElement;
    expect(email.placeholder).toBe("name@company.test");
    expect(screen.getByRole("button", { name: "Join" })).toBeTruthy();
  });
});

describe("SiteFooter", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "error");
  });
  afterEach(() => {
    // Rendering the footer should not trigger React warnings (keys, props).
    expect(warn).not.toHaveBeenCalled();
  });

  it("renders a complete footer with no props", () => {
    const { container } = render(<SiteFooter />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("FOOTER");
    expect(root.dataset.slot).toBe("site-footer");
    expect(screen.getByRole("contentinfo")).toBe(root);

    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.getByText("© Acme Inc. All rights reserved.")).toBeTruthy();

    const nav = screen.getByRole("navigation", { name: "Footer" });
    const headings = within(nav).getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Product",
      "Company",
      "Resources",
    ]);
    expect(within(nav).getAllByRole("list")).toHaveLength(3);
    for (const link of within(nav).getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^#[a-z]+/);
    }
    expect(screen.getByRole("link", { name: "Pricing" }).getAttribute("href")).toBe("#pricing");
    // No social links by default.
    expect(root.querySelector("[data-slot=site-footer-social]")).toBeNull();
  });

  it("replaces content through props", () => {
    render(
      <SiteFooter
        brand={<a href="#top">Brightpath</a>}
        description={null}
        navLabel="Site"
        bottom="© 2030 Brightpath"
        columns={[
          {
            id: "docs",
            title: "Docs",
            links: [
              { id: "start", label: "Start", href: "#start" },
              { label: "API", href: "#api" },
            ],
          },
        ]}
      />
    );
    expect(screen.getByRole("link", { name: "Brightpath" })).toBeTruthy();
    expect(screen.queryByText(/Plan, build and ship/)).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("heading", { level: 2, name: "Docs" })).toBeTruthy();
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "Product" })).toBeNull();
    expect(screen.getByText("© 2030 Brightpath")).toBeTruthy();
  });

  it("names social icon links and hides their icons", async () => {
    const user = userEvent.setup();
    render(
      <SiteFooter
        social={[
          { label: "RSS feed", href: "#rss", icon: <svg data-testid="rss" /> },
          { label: "Newsletter", href: "#newsletter", icon: <svg data-testid="mail" /> },
        ]}
      />
    );
    const rss = screen.getByRole("link", { name: "RSS feed" });
    expect(rss.getAttribute("href")).toBe("#rss");
    expect(rss.dataset.slot).toBe("site-footer-social-link");
    expect(screen.getByTestId("rss").closest("[aria-hidden=true]")).toBeTruthy();
    const list = rss.closest("ul")!;
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);

    // Social links come after the footer navigation in tab order.
    const navLinks = within(screen.getByRole("navigation")).getAllByRole("link");
    for (let i = 0; i < navLinks.length; i++) await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(rss);
  });

  it("merges className and forwards native props and the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<SiteFooter ref={ref} id="footer" className="custom" />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.id).toBe("footer");
    expect(root.className).toContain("custom");
    expect(root.className).toContain("border-t");
  });
});
