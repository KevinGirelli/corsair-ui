import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Faq } from "@/registry/default/components/blocks/faq";
import { Pricing, type PricingBilling } from "@/registry/default/components/blocks/pricing";
import { Testimonials } from "@/registry/default/components/blocks/testimonials";

/** Class list of an element as an array, for `toContain` / `toEqual(expect.arrayContaining())`. */
function classesOf(element: Element | null) {
  return [...(element?.classList ?? [])];
}

function root(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

describe("Pricing", () => {
  it("renders the default plans with headings, features and links", () => {
    const { container } = render(<Pricing />);
    const section = root(container);
    expect(section.tagName).toBe("SECTION");
    expect(section.dataset.slot).toBe("pricing");
    expect(section.dataset.billing).toBe("monthly");
    expect(container.querySelector("[data-slot=pricing-container]")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Plans that grow with you");
    const planNames = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(planNames).toEqual(["Starter", "Pro", "Enterprise"]);

    const plans = container.querySelector("[data-slot=pricing-plans]")!;
    expect(plans.tagName).toBe("UL");
    expect(plans.querySelectorAll(":scope > li")).toHaveLength(3);
    expect(classesOf(plans)).toContain("lg:grid-cols-3");

    const featured = container.querySelectorAll<HTMLElement>("[data-featured]");
    expect(featured).toHaveLength(1);
    expect(featured[0]!.textContent).toContain("Pro");
    expect(featured[0]!.textContent).toContain("Most popular");
    expect(within(featured[0]!).getByRole("link").dataset.variant).toBe("default");
    expect(screen.getByRole("link", { name: "Get started" }).dataset.variant).toBe("outline");
    expect(screen.getByRole("link", { name: "Contact sales" }).getAttribute("href")).toBe(
      "#contact"
    );
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^#.+/);
    }
    expect(screen.getByText("$12")).toBeTruthy();
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.getByText("Single sign-on").closest("li")?.dataset.slot).toBe("pricing-feature");
    for (const icon of container.querySelectorAll("[data-slot=pricing-feature] svg")) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("switches billing with the pointer and the keyboard, and never deselects", async () => {
    const user = userEvent.setup();
    const onBillingChange = vi.fn();
    const { container } = render(<Pricing onBillingChange={onBillingChange} />);
    const group = screen.getByRole("radiogroup", { name: "Billing period" });
    const monthly = within(group).getByRole("radio", { name: "Monthly" });
    const yearly = within(group).getByRole("radio", { name: /Yearly/ });
    expect(yearly.textContent).toContain("2 months free");
    expect(monthly.getAttribute("data-state")).toBe("on");

    await user.click(yearly);
    expect(root(container).dataset.billing).toBe("yearly");
    expect(onBillingChange).toHaveBeenLastCalledWith("yearly");
    expect(screen.getByText("$120")).toBeTruthy();
    expect(screen.queryByText("$12")).toBeNull();
    expect(screen.getAllByText("/year").length).toBeGreaterThan(0);

    // Pressing the active item again must not clear the selection.
    await user.click(yearly);
    expect(root(container).dataset.billing).toBe("yearly");
    expect(yearly.getAttribute("data-state")).toBe("on");
    expect(onBillingChange).toHaveBeenCalledTimes(1);

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(monthly);
    await user.keyboard(" ");
    expect(root(container).dataset.billing).toBe("monthly");
    expect(screen.getByText("$12")).toBeTruthy();
  });

  it("supports controlled billing", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [billing, setBilling] = useState<PricingBilling>("yearly");
      return (
        <>
          <Pricing billing={billing} onBillingChange={setBilling} />
          <output data-testid="billing">{billing}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByText("$120")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "Monthly" }));
    expect(screen.getByTestId("billing").textContent).toBe("monthly");
    expect(screen.getByText("$12")).toBeTruthy();
  });

  it("stays on the controlled value when the parent does not update it", async () => {
    const user = userEvent.setup();
    const onBillingChange = vi.fn();
    render(<Pricing billing="monthly" onBillingChange={onBillingChange} />);
    await user.click(screen.getByRole("radio", { name: /Yearly/ }));
    expect(onBillingChange).toHaveBeenCalledWith("yearly");
    expect(screen.getByText("$12")).toBeTruthy();
  });

  it("starts on defaultBilling", () => {
    const { container } = render(<Pricing defaultBilling="yearly" />);
    expect(root(container).dataset.billing).toBe("yearly");
    expect(screen.getByRole("radio", { name: /Yearly/ }).getAttribute("data-state")).toBe("on");
  });

  it("replaces content through props and hides the switch for single prices", () => {
    const { container } = render(
      <Pricing
        eyebrow={null}
        title="Choose a plan"
        description="Simple prices."
        plans={[
          {
            id: "free",
            name: "Free",
            price: "$0",
            features: ["One seat"],
            action: { label: "Try it", href: "#try" },
          },
          {
            id: "team",
            name: "Team",
            price: "$30",
            period: "per seat",
            features: [<strong key="a">Ten seats</strong>],
            featured: true,
            badge: "Best value",
          },
        ]}
      />
    );
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Choose a plan");
    expect(screen.getByText("Simple prices.")).toBeTruthy();
    expect(screen.queryByText("Pricing")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Free",
      "Team",
    ]);
    expect(screen.getByText("per seat")).toBeTruthy();
    expect(screen.getByText("Ten seats").tagName).toBe("STRONG");
    expect(screen.getByText("Best value")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Try it" }).getAttribute("href")).toBe("#try");
    expect(classesOf(container.querySelector("[data-slot=pricing-plans]"))).toContain(
      "md:grid-cols-2"
    );
  });

  it("uses custom labels for the billing switch", () => {
    render(
      <Pricing
        billingLabel="Payment cycle"
        monthlyLabel="Per month"
        yearlyLabel="Per year"
        yearlyNote={null}
      />
    );
    const group = screen.getByRole("radiogroup", { name: "Payment cycle" });
    expect(within(group).getByRole("radio", { name: "Per month" })).toBeTruthy();
    expect(within(group).getByRole("radio", { name: "Per year" })).toBeTruthy();
    expect(screen.queryByText("2 months free")).toBeNull();
  });

  it("merges className and forwards native props and ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Pricing ref={ref} id="pricing" className="custom" aria-label="Plans" />);
    const section = screen.getByRole("region", { name: "Plans" });
    expect(section).toBe(ref.current);
    expect(section.id).toBe("pricing");
    expect(classesOf(section)).toEqual(expect.arrayContaining(["custom", "py-16"]));
  });
});

describe("Faq", () => {
  it("renders the default questions in a split layout", () => {
    const { container } = render(<Faq />);
    const section = root(container);
    expect(section.tagName).toBe("SECTION");
    expect(section.dataset.slot).toBe("faq");
    expect(section.dataset.layout).toBe("split");
    expect(classesOf(container.querySelector("[data-slot=faq-container]"))).toContain(
      "lg:grid-cols-[1fr_2fr]"
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Frequently asked questions"
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
    const triggers = screen.getAllByRole("button");
    expect(triggers).toHaveLength(6);
    for (const trigger of triggers) expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("link", { name: "Contact us" }).getAttribute("href")).toBe("#contact");
  });

  it("opens one answer at a time and lets it close again", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const first = screen.getByRole("button", { name: "Is there a free trial?" });
    const second = screen.getByRole("button", { name: "Can I change plans later?" });

    await user.click(first);
    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("region", { name: "Is there a free trial?" }).textContent).toMatch(
      /14-day trial/
    );

    await user.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("true");
    expect(first.getAttribute("aria-expanded")).toBe("false");

    await user.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("false");
  });

  it("moves between questions with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const triggers = screen.getAllByRole("button");
    await user.tab();
    await user.tab();
    // The footer link comes first in the tab order, then the first question.
    expect(document.activeElement).toBe(triggers[0]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(triggers[1]);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(triggers[5]);
    await user.keyboard("{Enter}");
    expect(triggers[5]!.getAttribute("aria-expanded")).toBe("true");
  });

  it("supports multiple open items, defaultValue and index-based values", async () => {
    const user = userEvent.setup();
    render(
      <Faq
        type="multiple"
        defaultValue="item-1"
        items={[
          { question: "First?", answer: "One." },
          { question: "Second?", answer: "Two." },
        ]}
      />
    );
    const first = screen.getByRole("button", { name: "First?" });
    const second = screen.getByRole("button", { name: "Second?" });
    expect(second.getAttribute("aria-expanded")).toBe("true");
    await user.click(first);
    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(second.getAttribute("aria-expanded")).toBe("true");
  });

  it("opens an item by id and replaces the header and footer", () => {
    const { container } = render(
      <Faq
        layout="stacked"
        eyebrow={null}
        title="Help"
        description="Common answers."
        footer={<a href="#support">Visit support</a>}
        defaultValue="b"
        items={[
          { id: "a", question: "A?", answer: "Answer A." },
          { id: "b", question: "B?", answer: "Answer B." },
        ]}
      />
    );
    expect(root(container).dataset.layout).toBe("stacked");
    expect(classesOf(container.querySelector("[data-slot=faq-header]"))).toEqual(
      expect.arrayContaining(["mx-auto", "text-center"])
    );
    expect(classesOf(container.querySelector("[data-slot=faq-list]"))).toEqual(
      expect.arrayContaining(["max-w-3xl", "mx-auto"])
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Help");
    expect(screen.getByText("Common answers.")).toBeTruthy();
    expect(screen.queryByText("FAQ")).toBeNull();
    expect(screen.getByRole("button", { name: "B?" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "A?" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("link", { name: "Visit support" }).getAttribute("href")).toBe(
      "#support"
    );
    expect(screen.queryByRole("link", { name: "Contact us" })).toBeNull();
  });

  it("hides the footer with null", () => {
    const { container } = render(<Faq footer={null} />);
    expect(container.querySelector("[data-slot=faq-footer]")).toBeNull();
  });

  it("merges className and forwards native props and ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Faq ref={ref} id="faq" className="custom" aria-label="Questions" />);
    const section = screen.getByRole("region", { name: "Questions" });
    expect(section).toBe(ref.current);
    expect(section.id).toBe("faq");
    expect(classesOf(section)).toEqual(expect.arrayContaining(["custom", "py-16"]));
  });
});

describe("Testimonials", () => {
  it("renders the default quotes as a list of figures", () => {
    const { container } = render(<Testimonials />);
    const section = root(container);
    expect(section.tagName).toBe("SECTION");
    expect(section.dataset.slot).toBe("testimonials");
    expect(section.dataset.variant).toBe("masonry");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Loved by teams who ship");
    const list = screen.getByRole("list");
    expect(classesOf(list)).toEqual(
      expect.arrayContaining(["columns-1", "sm:columns-2", "lg:columns-3"])
    );
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(classesOf(items[0]!)).toEqual(expect.arrayContaining(["break-inside-avoid", "mb-6"]));
    for (const item of items) {
      const figure = within(item).getByRole("figure");
      expect(figure.querySelector("blockquote")).not.toBeNull();
      expect(figure.querySelector("figcaption")).not.toBeNull();
    }
    const first = items[0]!;
    expect(within(first).getByText("Nadia Brooks").className).toContain("font-medium");
    expect(within(first).getByText("Engineering manager")).toBeTruthy();
    expect(within(first).getByText("NB")).toBeTruthy();
    expect(screen.getByText("TR")).toBeTruthy();
  });

  it("derives initials from the first and last word and hides the decorative avatar", () => {
    const { container } = render(
      <Testimonials
        testimonials={[
          { id: "a", quote: "Great.", name: "ada king lovelace" },
          { id: "b", quote: "Solid.", name: "Plato" },
          { id: "c", quote: "Nice.", name: "Grace Hopper", avatar: "/grace.png", role: "Admiral" },
        ]}
      />
    );
    expect(screen.getByText("AL")).toBeTruthy();
    expect(screen.getByText("P")).toBeTruthy();
    // jsdom never loads images, so the fallback stays visible.
    expect(screen.getByText("GH").closest("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelectorAll("[data-slot=testimonial]")).toHaveLength(3);
  });

  it("replaces content through props and supports the grid variant", () => {
    const { container } = render(
      <Testimonials
        variant="grid"
        eyebrow={null}
        title="What customers say"
        description={null}
        testimonials={[
          { quote: <em>Fast and simple.</em>, name: "Sam Carter", role: <span>Team lead</span> },
        ]}
      />
    );
    expect(root(container).dataset.variant).toBe("grid");
    expect(classesOf(screen.getByRole("list"))).toEqual(
      expect.arrayContaining(["grid", "sm:grid-cols-2", "lg:grid-cols-3"])
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("What customers say");
    expect(screen.queryByText("Testimonials")).toBeNull();
    expect(screen.getByText("Fast and simple.").tagName).toBe("EM");
    expect(screen.getByText("Team lead")).toBeTruthy();
    expect(screen.getByText("SC")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("merges className and forwards native props and ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Testimonials ref={ref} id="reviews" className="custom" aria-label="Reviews" />);
    const section = screen.getByRole("region", { name: "Reviews" });
    expect(section).toBe(ref.current);
    expect(section.id).toBe("reviews");
    expect(classesOf(section)).toEqual(expect.arrayContaining(["custom", "py-16"]));
  });
});
