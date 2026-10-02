import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Stamp } from "@/registry/default/ui/stamp";
import { installIntersectionObserver } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * jsdom has no AnimationEvent, so React listens for the prefixed name.
 * Send both; React picks up whichever it registered.
 */
function animationEnd(element: Element) {
  fireEvent(element, new Event("animationend", { bubbles: true }));
  fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
}

const stamp = () => document.querySelector<HTMLElement>("[data-slot=stamp]")!;

describe("Stamp", () => {
  it("renders the content, rotated and at rest, in the server HTML", () => {
    const html = renderToString(<Stamp>Sold out</Stamp>);
    expect(html).toContain("Sold out");
    expect(html).toContain("--stamp-rotate:-8deg");
    expect(html).toContain("[transform:rotate(var(--stamp-rotate))]");
    expect(html).toContain('data-state="static"');
    expect(html).not.toContain("animate-stamp");
  });

  it("holds the stamp up, paused, with play={false}", () => {
    render(<Stamp play={false}>Paid</Stamp>);
    expect(stamp().getAttribute("data-state")).toBe("armed");
    expect(stamp().className).toContain("motion-safe:animate-stamp");
    expect(stamp().style.animationPlayState).toBe("paused");
    expect(screen.getByText("Paid").getAttribute("aria-hidden")).toBeNull();
  });

  it("slams down with play", () => {
    const { rerender } = render(<Stamp play={false}>Paid</Stamp>);
    rerender(<Stamp play>Paid</Stamp>);
    expect(stamp().getAttribute("data-state")).toBe("play");
    expect(stamp().className).toContain("motion-safe:animate-stamp");
    expect(stamp().style.animationPlayState).toBe("");
  });

  it("plays once it scrolls into view", () => {
    render(<Stamp>Approved</Stamp>);
    expect(stamp().getAttribute("data-state")).toBe("armed");
    act(() => io.intersect(stamp(), true));
    expect(stamp().getAttribute("data-state")).toBe("play");
  });

  it("calls onAnimationComplete when it lands", () => {
    const onAnimationComplete = vi.fn();
    render(
      <Stamp play onAnimationComplete={onAnimationComplete}>
        Paid
      </Stamp>
    );
    animationEnd(stamp());
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it("puts custom rotate, from, delay and duration inline, merged with style", () => {
    render(
      <Stamp as="div" play rotate={12} from={2} delay={100} duration={500} style={{ zIndex: 3 }}>
        Void
      </Stamp>
    );
    const root = stamp();
    expect(root.tagName).toBe("DIV");
    expect(root.style.getPropertyValue("--stamp-rotate")).toBe("12deg");
    expect(root.style.getPropertyValue("--stamp-from")).toBe("2");
    expect(root.style.animationDuration).toBe("500ms");
    expect(root.style.animationDelay).toBe("100ms");
    expect(root.style.zIndex).toBe("3");
  });
});
