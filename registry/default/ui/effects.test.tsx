import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnimatedBorder } from "@/registry/default/ui/animated-border";
import { Aurora } from "@/registry/default/ui/aurora";
import { Signature } from "@/registry/default/ui/signature";
import { Spotlight } from "@/registry/default/ui/spotlight";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/default/ui/tooltip";
import { flushFrames, installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Spotlight", () => {
  it("tracks the pointer in CSS variables, behind the content of its child", async () => {
    render(
      <Spotlight asChild size={200}>
        <article>Card</article>
      </Spotlight>
    );
    const card = screen.getByRole("article");
    expect(card.className).toContain("isolate");
    expect(card.firstElementChild?.getAttribute("data-slot")).toBe("spotlight-light");
    expect(card.querySelector("[data-slot=spotlight-ring]")?.getAttribute("aria-hidden")).toBe(
      "true"
    );
    expect(card.textContent).toBe("Card");

    vi.spyOn(card, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 200, 100));
    fireEvent.pointerMove(card, { clientX: 60, clientY: 70, pointerType: "mouse" });
    await act(flushFrames);
    expect(card.style.getPropertyValue("--spotlight-x")).toBe("50px");
    expect(card.style.getPropertyValue("--spotlight-y")).toBe("50px");
  });

  it("leaves touch alone and can drop the ring", async () => {
    render(<Spotlight ring={false}>Surface</Spotlight>);
    const surface = screen.getByText("Surface");
    expect(surface.querySelector("[data-slot=spotlight-ring]")).toBeNull();

    fireEvent.pointerMove(surface, { clientX: 5, clientY: 5, pointerType: "touch" });
    await act(flushFrames);
    expect(surface.style.getPropertyValue("--spotlight-x")).toBe("");
  });
});

describe("AnimatedBorder", () => {
  it("wraps the content and runs the light only while on screen", () => {
    const html = renderToString(<AnimatedBorder duration={4}>Content</AnimatedBorder>);
    expect(html).toContain("animation-duration:4s");
    expect(html).toContain("animation-play-state:paused");
    expect(html).toContain("motion-reduce:animate-none");

    render(<AnimatedBorder>Content</AnimatedBorder>);
    const root = document.querySelector<HTMLElement>("[data-slot=animated-border]")!;
    expect(screen.getByText("Content").dataset.slot).toBe("animated-border-content");

    act(() => io.intersect(root, true));
    expect(root.querySelector("[data-slot=animated-border-light]")?.getAttribute("style")).toMatch(
      /running/
    );
    act(() => io.intersect(root, false));
    expect(root.querySelector("[data-slot=animated-border-light]")?.getAttribute("style")).toMatch(
      /paused/
    );
  });
});

describe("Aurora", () => {
  it("draws three decorative lights behind its content, paused off screen", () => {
    render(
      <Aurora colors={["red", "green", "blue"]}>
        <h2>Set sail</h2>
      </Aurora>
    );
    const root = document.querySelector<HTMLElement>("[data-slot=aurora]")!;
    const lights = root.querySelector("[data-slot=aurora-lights]")!;
    expect(lights.getAttribute("aria-hidden")).toBe("true");
    expect(lights.children).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Set sail" })).toBeTruthy();

    const first = lights.children[0] as HTMLElement;
    expect(first.getAttribute("style")).toContain("paused");
    expect(first.className).toContain("motion-reduce:animate-none");
    act(() => io.intersect(root, true));
    expect(first.getAttribute("style")).toContain("running");
  });
});

describe("Signature", () => {
  const paths = ["M0 0 L10 0", "M0 5 L30 5"];

  it("starts blank and draws its strokes in order once in view", () => {
    const html = renderToString(<Signature paths={paths} />);
    expect(html).toContain('pathLength="1"');
    expect(html).toContain("stroke-dashoffset:1.01");

    render(<Signature aria-label="Kevin's signature" paths={paths} duration={1000} delay={100} />);
    const svg = screen.getByRole("img", { name: "Kevin's signature" });
    expect(svg.dataset.state).toBe("blank");

    act(() => io.intersect(svg, true));
    expect(svg.dataset.state).toBe("drawn");
    const [first, second] = svg.querySelectorAll("path");
    // jsdom has no path lengths, so both strokes get the same share.
    expect(first!.getAttribute("style")).toMatch(/500ms .* 100ms/);
    expect(second!.getAttribute("style")).toMatch(/500ms .* 600ms/);
  });

  it("is hidden from screen readers without a label", () => {
    render(<Signature paths={paths} data-testid="drawing" />);
    expect(screen.getByTestId("drawing").getAttribute("aria-hidden")).toBe("true");
  });

  it("appears finished at once with reduced motion", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    render(<Signature paths={paths} data-testid="drawing" />);
    const svg = screen.getByTestId("drawing");
    act(() => io.intersect(svg, true));
    expect(svg.querySelector("path")!.getAttribute("style") ?? "").not.toContain("transition");
  });

  it("draws with the scroll position in scroll mode, finished where that is unsupported", () => {
    const html = renderToString(<Signature paths={paths} trigger="scroll" />);
    expect(html).toMatch(/view-timeline-name:--signature-/);
    expect(html).toContain("stroke-dashoffset:0");
    expect(html).toContain("supports-[animation-timeline:view()]:animate-signature-draw");
  });
});

describe("Tooltip", () => {
  it("shows its label on keyboard focus", async () => {
    render(
      <Tooltip>
        <TooltipTrigger>Save</TooltipTrigger>
        <TooltipContent>Saves the draft</TooltipContent>
      </Tooltip>
    );
    await userEvent.tab();
    expect((await screen.findByRole("tooltip")).textContent).toBe("Saves the draft");
  });
});

describe("Signature manual progress", () => {
  const paths = ["M0 0 L10 0", "M0 5 L30 5"];
  const offsets = (root: Element, selector = "svg > path") =>
    [...root.querySelectorAll<SVGPathElement>(selector)].map((path) =>
      parseFloat(path.style.strokeDashoffset)
    );

  /** Gives paths real lengths: 10 for the first, 30 for the second. */
  function withLengths() {
    Object.defineProperty(SVGElement.prototype, "getTotalLength", {
      configurable: true,
      value(this: SVGElement) {
        return this.getAttribute("d") === paths[0] ? 10 : 30;
      },
    });
  }

  afterEach(() => {
    delete (SVGElement.prototype as { getTotalLength?: unknown }).getTotalLength;
  });

  it("follows progress without an observer or a transition", () => {
    const { rerender } = render(
      <Signature trigger="manual" progress={0} paths={paths} data-testid="drawing" />
    );
    const svg = screen.getByTestId("drawing");
    expect(io.observers(svg)).toBe(0);
    expect(svg.dataset.trigger).toBe("manual");
    expect(svg.dataset.state).toBe("blank");
    expect(offsets(svg)).toEqual([1.01, 1.01]);

    // Before the lengths are known, each stroke gets an equal share.
    rerender(<Signature trigger="manual" progress={0.75} paths={paths} data-testid="drawing" />);
    expect(svg.dataset.state).toBe("drawing");
    expect(offsets(svg)).toEqual([0, 0.5]);
    expect(svg.querySelector("path")!.getAttribute("style")).not.toContain("transition");

    rerender(<Signature trigger="manual" progress={1} paths={paths} data-testid="drawing" />);
    expect(svg.dataset.state).toBe("drawn");
    expect(offsets(svg)).toEqual([0, 0]);
  });

  it("splits progress across strokes by their measured length", async () => {
    withLengths();
    render(<Signature trigger="manual" progress={0.5} paths={paths} data-testid="drawing" />);
    const svg = screen.getByTestId("drawing");
    await act(flushFrames);
    // Half of 40 units: the 10-long stroke is done and a third of the 30-long one.
    const [first, second] = offsets(svg);
    expect(first).toBe(0);
    expect(second).toBeCloseTo(2 / 3, 5);
  });

  it("still follows progress with reduced motion, since the parent drives it", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    render(<Signature trigger="manual" progress={0.25} paths={paths} data-testid="drawing" />);
    expect(offsets(screen.getByTestId("drawing"))).toEqual([0.5, 1.01]);
  });

  it("draws the ink mask in step, and leaves out the pen with strokeWidth 0", async () => {
    withLengths();
    const { container, rerender } = render(
      <Signature trigger="manual" progress={0.5} paths={paths} ink />
    );
    expect(container.querySelectorAll("svg > path")).toHaveLength(2);

    rerender(<Signature trigger="manual" progress={0.5} paths={paths} ink strokeWidth={0} />);
    await act(flushFrames);
    // Only the fill and its mask are left, measured from the mask.
    expect(container.querySelectorAll("svg > path")).toHaveLength(0);
    expect(container.querySelectorAll("g[mask] path")).toHaveLength(2);
    const [first, second] = offsets(container, "mask path");
    expect(first).toBe(0);
    expect(second).toBeCloseTo(2 / 3, 5);
  });

  it("lets outlines with holes fill by the even-odd rule", () => {
    const { container } = render(<Signature paths={paths} ink fillRule="evenodd" />);
    expect(container.querySelector("svg")?.getAttribute("fill-rule")).toBe("evenodd");
    expect(container.querySelector("g[mask]")?.hasAttribute("fill-rule")).toBe(false);
  });
});
