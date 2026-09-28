import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CallToAction } from "@/registry/default/components/blocks/cta";
import { FeatureGrid } from "@/registry/default/components/blocks/feature-grid";
import { Hero } from "@/registry/default/components/blocks/hero";
import { LogoCloud } from "@/registry/default/components/blocks/logo-cloud";
import { Stats } from "@/registry/default/components/blocks/stats";
import { installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

// NumberTicker and Marquee watch the viewport.
let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  installMatchMedia([]);
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const root = (slot: string) => document.querySelector<HTMLElement>(`[data-slot=${slot}]`)!;

describe("Hero", () => {
  it("renders a complete example with no props", () => {
    render(<Hero />);
    const section = root("hero");
    expect(section.tagName).toBe("SECTION");
    expect(section.dataset.align).toBe("center");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/\w/);
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getByRole("link", { name: "New · Version 2 is here" }).getAttribute("href")).toBe(
      "#changelog"
    );
    expect(screen.getByRole("link", { name: "Get started" }).getAttribute("href")).toBe(
      "#get-started"
    );
    expect(screen.getByRole("link", { name: "Learn more" }).getAttribute("href")).toBe("#features");
    expect(document.querySelector("[data-slot=hero-media]")).toBeNull();
    // The arrow in the eyebrow is decorative.
    expect(root("hero-eyebrow").querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("replaces every piece of content through props", () => {
    render(
      <Hero
        eyebrow={null}
        title={
          <>
            Ship <em>faster</em>
          </>
        }
        description="A custom description."
        actions={<a href="#signup">Sign up</a>}
      />
    );
    expect(screen.getByRole("heading", { level: 1, name: "Ship faster" })).toBeTruthy();
    expect(screen.getByText("A custom description.")).toBeTruthy();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Sign up"]);
    expect(document.querySelector("[data-slot=hero-eyebrow]")).toBeNull();
  });

  it("hides the actions with null", () => {
    render(<Hero actions={null} />);
    expect(document.querySelector("[data-slot=hero-actions]")).toBeNull();
  });

  it("puts media beside the text when aligned to the start", () => {
    render(<Hero align="start" media={<img src="/shot.png" alt="Dashboard" />} />);
    expect(root("hero").dataset.align).toBe("start");
    expect(root("hero-container").className).toContain("lg:grid-cols-2");
    expect(root("hero-content").className).not.toContain("text-center");
    expect(within(root("hero-media")).getByRole("img", { name: "Dashboard" })).toBeTruthy();
  });

  it("puts media under centred text in a bordered frame", () => {
    render(<Hero media={<img src="/shot.png" alt="Dashboard" />} />);
    expect(root("hero-container").className).not.toContain("lg:grid-cols-2");
    expect(root("hero-content").className).toContain("text-center");
    expect(root("hero-media").className).toContain("mt-16");
    expect(root("hero-media").className).toContain("border");
  });

  it("merges className and passes native props and the ref to the section", () => {
    const ref = createRef<HTMLElement>();
    render(<Hero ref={ref} id="top" className="custom py-8" aria-label="Intro" />);
    const section = screen.getByRole("region", { name: "Intro" });
    expect(section).toBe(ref.current);
    expect(section.id).toBe("top");
    expect(section.className).toContain("custom");
    expect(section.className).toContain("py-8");
    expect(section.className).not.toContain("py-16");
  });

  it("renders on the server", () => {
    expect(renderToString(<Hero />)).toContain("<h1");
  });
});

describe("FeatureGrid", () => {
  it("renders six features in a list under an h2 with no props", () => {
    render(<FeatureGrid />);
    expect(root("feature-grid").tagName).toBe("SECTION");
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(within(list).getAllByRole("heading", { level: 3 })).toHaveLength(6);
    expect(list.className).toContain("lg:grid-cols-3");
    for (const icon of document.querySelectorAll("[data-slot=feature-grid-icon]")) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("replaces the header and features, and maps the column count", () => {
    render(
      <FeatureGrid
        eyebrow={null}
        title="Why Acme"
        description={null}
        columns={4}
        features={[
          { id: "a", title: "Alpha", description: "First" },
          { id: "b", title: "Beta" },
        ]}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: "Why Acme" })).toBeTruthy();
    expect(document.querySelector("[data-slot=feature-grid-eyebrow]")).toBeNull();
    expect(document.querySelector("[data-slot=feature-grid-description]")).toBeNull();
    const list = screen.getByRole("list");
    expect(list.className).toContain("lg:grid-cols-4");
    expect(
      within(list)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(["Alpha", "Beta"]);
    expect(document.querySelector("[data-slot=feature-grid-icon]")).toBeNull();
  });

  it("drops the header and its gap when every header prop is null", () => {
    render(<FeatureGrid eyebrow={null} title={null} description={null} />);
    expect(document.querySelector("[data-slot=feature-grid-header]")).toBeNull();
    expect(screen.getByRole("list").className).not.toContain("mt-12");
  });

  it("turns titles with href into links stretched over the card, reachable by keyboard", async () => {
    const user = userEvent.setup();
    render(
      <FeatureGrid
        features={[
          { title: "Speed", description: "Fast", href: "#speed" },
          { title: "Plain" },
          { title: "Privacy", href: "#privacy" },
        ]}
      />
    );
    const speed = screen.getByRole("link", { name: "Speed" });
    expect(speed.getAttribute("href")).toBe("#speed");
    expect(speed.closest("h3")).toBeTruthy();
    expect(speed.className).toContain("after:inset-0");
    const card = speed.closest<HTMLElement>("[data-slot=card]")!;
    expect(card.className).toContain("relative");
    expect(card.dataset.linked).toBe("true");
    expect(
      screen.getByText("Plain").closest<HTMLElement>("[data-slot=card]")!.dataset.linked
    ).toBeUndefined();

    await user.tab();
    expect(document.activeElement).toBe(speed);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Privacy" }));
  });

  it("merges className on the section", () => {
    render(<FeatureGrid className="custom" data-testid="features" />);
    const section = screen.getByTestId("features");
    expect(section.dataset.slot).toBe("feature-grid");
    expect(section.className).toContain("custom");
  });
});

describe("Stats", () => {
  it("renders four figures as a description list with no props", () => {
    render(<Stats />);
    const section = root("stats");
    expect(section.tagName).toBe("SECTION");
    expect(section.dataset.variant).toBe("plain");
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    const group = root("stat-group");
    expect(group.tagName).toBe("DL");
    expect(group.className).toContain("grid-cols-2");
    expect(group.className).toContain("lg:grid-cols-4");
    expect(group.querySelectorAll("dt")).toHaveLength(4);
    expect(group.querySelectorAll("[data-slot=number-ticker]")).toHaveLength(4);
    // Screen readers hear the final number and the trend in words.
    expect(group.querySelector("[data-slot=number-ticker] .sr-only")?.textContent).toBe("12,000");
    expect(screen.getByText("Increase:", { exact: false })).toBeTruthy();
  });

  it("keeps prefix and suffix outside the counting number and counts up in view", async () => {
    render(
      <Stats stats={[{ id: "revenue", label: "Revenue", value: 1250, prefix: "$", suffix: "+" }]} />
    );
    const value = root("stat-value");
    const ticker = within(value).getByText("1,250", { selector: ".sr-only" }).parentElement!;
    expect(ticker.dataset.slot).toBe("number-ticker");
    expect(value.firstElementChild?.textContent).toBe("$");
    expect(value.lastElementChild?.textContent).toBe("+");
    expect(ticker.dataset.state).toBe("armed");
    act(() => io.intersect(ticker, true));
    expect(ticker.dataset.state).toBe("play");
    // NumberTicker's default count takes 1.6 s.
    await waitFor(
      () =>
        expect(ticker.querySelector("[data-slot=number-ticker-value]")?.textContent).toBe("1,250"),
      { timeout: 3000 }
    );
  });

  it("renders non-numeric values as they are", () => {
    render(<Stats stats={[{ label: "Rating", value: <strong>4.9 / 5</strong> }]} />);
    expect(root("stat-value").querySelector("strong")?.textContent).toBe("4.9 / 5");
    expect(document.querySelector("[data-slot=number-ticker]")).toBeNull();
  });

  it("passes format and locale to the number, and custom trend labels", () => {
    render(
      <Stats
        title="Custom"
        eyebrow={null}
        description={null}
        locale="de-DE"
        trendLabels={{ down: "Rückgang" }}
        stats={[
          {
            label: "Umsatz",
            value: 1234.5,
            format: { minimumFractionDigits: 2 },
            caption: "seit März",
            trend: "down",
          },
        ]}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: "Custom" })).toBeTruthy();
    expect(document.querySelector("[data-slot=number-ticker] .sr-only")?.textContent).toBe(
      "1.234,50"
    );
    const caption = root("stat-caption");
    expect(caption.dataset.trend).toBe("down");
    expect(caption.textContent).toBe("Rückgang: seit März");
  });

  it("puts each figure in a bordered box with the cards variant", () => {
    render(<Stats variant="cards" className="custom" />);
    const section = root("stats");
    expect(section.dataset.variant).toBe("cards");
    expect(section.className).toContain("custom");
    for (const stat of document.querySelectorAll("[data-slot=stat]")) {
      expect(stat.className).toContain("border");
    }
  });
});

describe("LogoCloud", () => {
  it("renders six text wordmarks in a grid list under an h2 with no props", () => {
    render(<LogoCloud />);
    const section = root("logo-cloud");
    expect(section.tagName).toBe("SECTION");
    expect(section.dataset.variant).toBe("grid");
    expect(screen.getByRole("heading", { level: 2, name: "Trusted by teams at" })).toBeTruthy();
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(list.className).toContain("lg:grid-cols-6");
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(document.querySelectorAll("[data-slot=logo-cloud-wordmark]")).toHaveLength(6);
    expect(document.querySelector("[data-slot=marquee]")).toBeNull();
  });

  it("names every logo, with or without a link", async () => {
    const user = userEvent.setup();
    render(
      <LogoCloud
        title={null}
        logos={[
          { id: "a", name: "Northwind", logo: <svg data-testid="mark" /> },
          { id: "b", name: "Quanta", logo: <svg />, href: "#quanta" },
          { id: "c", name: "Polaris", href: "#polaris" },
        ]}
      />
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(
      screen.getByRole("img", { name: "Northwind" }).contains(screen.getByTestId("mark"))
    ).toBe(true);
    const quanta = screen.getByRole("link", { name: "Quanta" });
    expect(quanta.getAttribute("href")).toBe("#quanta");
    // Inside a link the link carries the name, not an extra img role.
    expect(within(quanta).queryByRole("img")).toBeNull();
    const polaris = screen.getByRole("link", { name: "Polaris" });
    expect(polaris.getAttribute("aria-label")).toBeNull();

    await user.tab();
    expect(document.activeElement).toBe(quanta);
    await user.tab();
    expect(document.activeElement).toBe(polaris);
  });

  it("scrolls in a marquee with a single list exposed to assistive technology", () => {
    render(<LogoCloud variant="marquee" logos={[{ name: "Lumen", href: "#lumen" }]} />);
    expect(root("logo-cloud").dataset.variant).toBe("marquee");
    const marquee = root("marquee");
    expect(marquee.className).toBeTruthy();
    expect(marquee.style.getPropertyValue("--marquee-gap")).toBe("3rem");
    expect(document.querySelectorAll("[data-slot=logo-cloud-list]").length).toBeGreaterThan(1);
    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Lumen" })).toHaveLength(1);
  });

  it("merges className and passes the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<LogoCloud ref={ref} className="custom" />);
    expect(ref.current).toBe(root("logo-cloud"));
    expect(ref.current?.className).toContain("custom");
  });
});

describe("CallToAction", () => {
  it("renders a muted, centred band with two links with no props", () => {
    render(<CallToAction />);
    const section = root("cta");
    expect(section.tagName).toBe("SECTION");
    expect(section.dataset.variant).toBe("muted");
    expect(section.dataset.align).toBe("center");
    expect(root("cta-band").className).toContain("bg-muted");
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    const start = screen.getByRole("link", { name: "Start for free" });
    expect(start.getAttribute("href")).toBe("#get-started");
    expect(start.dataset.variant).toBe("default");
    const sales = screen.getByRole("link", { name: "Talk to sales" });
    expect(sales.getAttribute("href")).toBe("#contact");
    expect(sales.dataset.variant).toBe("outline");
  });

  it("keeps the default buttons readable on the primary band", () => {
    render(<CallToAction variant="primary" />);
    expect(root("cta").dataset.variant).toBe("primary");
    expect(root("cta-band").className).toContain("bg-primary");
    expect(root("cta-band").className).toContain("text-primary-foreground");
    expect(screen.getByRole("link", { name: "Start for free" }).dataset.variant).toBe("secondary");
    const sales = screen.getByRole("link", { name: "Talk to sales" });
    expect(sales.dataset.variant).toBe("ghost");
    expect(sales.className).toContain("text-primary-foreground");
  });

  it("uses a border for the outline variant and a split layout when aligned to the start", () => {
    render(<CallToAction variant="outline" align="start" />);
    expect(root("cta").dataset.align).toBe("start");
    const band = root("cta-band");
    expect(band.className).toContain("border");
    expect(band.className).toContain("md:flex-row");
    expect(band.className).not.toContain("text-center");
  });

  it("replaces the content through props", () => {
    render(
      <CallToAction
        title="Join the beta"
        description={null}
        actions={<a href="#beta">Request access</a>}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: "Join the beta" })).toBeTruthy();
    expect(document.querySelector("[data-slot=cta-description]")).toBeNull();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Request access"]);
  });

  it("hides the actions with null and merges className", () => {
    render(<CallToAction actions={null} className="custom" />);
    expect(document.querySelector("[data-slot=cta-actions]")).toBeNull();
    expect(root("cta").className).toContain("custom");
  });
});
