import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrowserFrame } from "@/registry/default/ui/browser-frame";
import { PhoneFrame } from "@/registry/default/ui/phone-frame";

function phone() {
  return document.querySelector<HTMLElement>("[data-slot=phone-frame]")!;
}

function browser() {
  return document.querySelector<HTMLElement>("[data-slot=browser-frame]")!;
}

describe("PhoneFrame", () => {
  it("renders on the server with the default aspect ratio and island", () => {
    const html = renderToString(
      <PhoneFrame>
        <img src="/screen.png" alt="Home screen" />
      </PhoneFrame>
    );
    expect(html).toContain('data-slot="phone-frame"');
    expect(html).toContain("aspect-ratio:9 / 19.5");
    expect(html).toContain("--phone-frame-bezel:3.5cqw");
    expect(html).toContain("--phone-frame-radius:14cqw");
    expect(html).toContain('data-notch="island"');
    expect(html).toContain('alt="Home screen"');
  });

  it("takes a custom aspect, as a number or a ratio", () => {
    expect(renderToString(<PhoneFrame aspect={0.5} />)).toContain("aspect-ratio:0.5");
    expect(renderToString(<PhoneFrame aspect="9 / 16" />)).toContain("aspect-ratio:9 / 16");
  });

  it("puts the children in the screen and keeps them accessible", () => {
    render(
      <PhoneFrame>
        <img src="/screen.png" alt="Home screen" />
      </PhoneFrame>
    );
    const img = screen.getByRole("img", { name: "Home screen" });
    expect(img.closest("[data-slot=phone-frame-screen]")).not.toBeNull();
    expect(phone().hasAttribute("aria-hidden")).toBe(false);
    expect(img.closest("[aria-hidden]")).toBeNull();
  });

  it("hides every decorative part from screen readers", () => {
    render(<PhoneFrame>Content</PhoneFrame>);
    const parts = phone().querySelectorAll(
      "[data-slot=phone-frame-body], [data-slot=phone-frame-notch], [data-slot=phone-frame-button]"
    );
    expect(parts.length).toBeGreaterThan(2);
    for (const part of parts) expect(part.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws the island, the notch or nothing", () => {
    const { rerender } = render(<PhoneFrame>Content</PhoneFrame>);
    let notch = phone().querySelector<HTMLElement>("[data-slot=phone-frame-notch]")!;
    expect(notch.className).toContain("rounded-full");
    expect(notch.className).toContain("z-10");

    rerender(<PhoneFrame notch="notch">Content</PhoneFrame>);
    expect(phone().getAttribute("data-notch")).toBe("notch");
    notch = phone().querySelector<HTMLElement>("[data-slot=phone-frame-notch]")!;
    expect(notch.className).toContain("top-0");
    expect(notch.className).not.toContain("rounded-full");

    rerender(<PhoneFrame notch="none">Content</PhoneFrame>);
    expect(phone().getAttribute("data-notch")).toBe("none");
    expect(phone().querySelector("[data-slot=phone-frame-notch]")).toBeNull();
  });

  it("drops the side buttons on request", () => {
    render(<PhoneFrame buttons={false}>Content</PhoneFrame>);
    expect(phone().querySelector("[data-slot=phone-frame-button]")).toBeNull();
  });

  it("merges classes, sets bezel and radius, and passes native props and ref", () => {
    let node: HTMLDivElement | null = null;
    render(
      <PhoneFrame
        ref={(el) => {
          node = el;
        }}
        id="hero-phone"
        bezel="10px"
        radius="40px"
        className="w-72"
        screenClassName="bg-muted"
      >
        Content
      </PhoneFrame>
    );
    const root = phone();
    expect(node).toBe(root);
    expect(root.id).toBe("hero-phone");
    expect(root.className).toContain("w-72");
    expect(root.className).not.toContain("w-64");
    expect(root.style.getPropertyValue("--phone-frame-bezel")).toBe("10px");
    expect(root.style.getPropertyValue("--phone-frame-radius")).toBe("40px");
    const screenEl = root.querySelector<HTMLElement>("[data-slot=phone-frame-screen]")!;
    expect(screenEl.className).toContain("bg-muted");
    expect(screenEl.className).not.toContain("bg-background");
    expect(screenEl.className).toContain("overflow-hidden");
  });
});

describe("BrowserFrame", () => {
  it("shows the url as text, not a link, and hides the bar by default", () => {
    render(<BrowserFrame url="app.example.com/dashboard">Page</BrowserFrame>);
    const root = browser();
    expect(root.textContent).toContain("app.example.com/dashboard");
    expect(root.querySelector("a")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    const bar = root.querySelector("[data-slot=browser-frame-bar]")!;
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    expect(root.hasAttribute("aria-hidden")).toBe(false);
  });

  it("always hides the window dots", () => {
    render(<BrowserFrame announceUrl url="example.com" />);
    const dots = browser().querySelector("[data-slot=browser-frame-dots]")!;
    expect(dots.getAttribute("aria-hidden")).toBe("true");
    expect(dots.querySelectorAll("[data-slot=browser-frame-dot]")).toHaveLength(3);
  });

  it("lets screen readers read the address with announceUrl", () => {
    render(<BrowserFrame announceUrl url="example.com" />);
    const bar = browser().querySelector("[data-slot=browser-frame-bar]")!;
    const address = browser().querySelector("[data-slot=browser-frame-address]")!;
    expect(bar.hasAttribute("aria-hidden")).toBe(false);
    expect(address.hasAttribute("aria-hidden")).toBe(false);
    expect(screen.getByText("example.com")).toBeTruthy();
  });

  it("keeps actions accessible and hides only the decoration around them", () => {
    render(<BrowserFrame url="example.com" actions={<button type="button">Share</button>} />);
    const bar = browser().querySelector("[data-slot=browser-frame-bar]")!;
    expect(bar.hasAttribute("aria-hidden")).toBe(false);
    expect(screen.getByRole("button", { name: "Share" }).closest("[aria-hidden]")).toBeNull();
    const address = browser().querySelector("[data-slot=browser-frame-address]")!;
    expect(address.getAttribute("aria-hidden")).toBe("true");
  });

  it("puts the children in the viewport", () => {
    render(
      <BrowserFrame viewportClassName="p-4" barClassName="bg-muted">
        <h2>Dashboard</h2>
      </BrowserFrame>
    );
    const heading = screen.getByRole("heading", { name: "Dashboard" });
    const viewport = heading.closest<HTMLElement>("[data-slot=browser-frame-viewport]")!;
    expect(viewport).not.toBeNull();
    expect(viewport.className).toContain("p-4");
    expect(viewport.className).toContain("overflow-hidden");
    expect(viewport.className).not.toContain("flex-1");
    const bar = browser().querySelector<HTMLElement>("[data-slot=browser-frame-bar]")!;
    expect(bar.className).toContain("bg-muted");
  });

  it("reserves the aspect ratio when given and lets the viewport fill it", () => {
    const html = renderToString(<BrowserFrame aspect="16 / 10">Page</BrowserFrame>);
    expect(html).toContain("aspect-ratio:16 / 10");
    expect(renderToString(<BrowserFrame>Page</BrowserFrame>)).not.toContain("aspect-ratio");
    render(<BrowserFrame aspect={1.6}>Page</BrowserFrame>);
    const viewport = browser().querySelector<HTMLElement>("[data-slot=browser-frame-viewport]")!;
    expect(viewport.className).toContain("flex-1");
    expect(viewport.className).toContain("min-h-0");
  });

  it("passes native props and ref to the root", () => {
    let node: HTMLDivElement | null = null;
    render(
      <BrowserFrame
        ref={(el) => {
          node = el;
        }}
        id="hero-browser"
        className="max-w-4xl"
      >
        Page
      </BrowserFrame>
    );
    expect(node).toBe(browser());
    expect(browser().id).toBe("hero-browser");
    expect(browser().className).toContain("max-w-4xl");
  });
});
