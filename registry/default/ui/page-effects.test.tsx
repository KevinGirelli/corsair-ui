import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomCursor } from "@/registry/default/ui/custom-cursor";
import { Preloader, PreloaderBar } from "@/registry/default/ui/preloader";
import { ScrollProgress } from "@/registry/default/ui/scroll-progress";
import { SmoothScroll, useSmoothScroll } from "@/registry/default/ui/smooth-scroll";
import { flushFrames, installMatchMedia } from "@/test-utils/browser";

const lenis = vi.hoisted(() => {
  const instances: FakeLenis[] = [];
  class FakeLenis {
    options: unknown;
    scrollTo = vi.fn();
    destroy = vi.fn();
    constructor(options: unknown) {
      this.options = options;
      instances.push(this);
    }
  }
  return { instances, FakeLenis };
});

vi.mock("lenis", () => ({ default: lenis.FakeLenis }));

const REDUCED = "(prefers-reduced-motion: reduce)";
const FINE = "(hover: hover) and (pointer: fine)";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Preloader", () => {
  const progressbar = () => screen.queryByRole("progressbar", { name: "Loading" });

  it("counts up over its duration, in a CSS variable and in the render prop, then fades and leaves", () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
    });
    const onComplete = vi.fn();
    render(
      <Preloader duration={1000} exitDuration={300} onComplete={onComplete}>
        {(progress) => (
          <>
            <span data-testid="count">{progress}%</span>
            <PreloaderBar />
          </>
        )}
      </Preloader>
    );
    const bar = progressbar()!;
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.dataset.state).toBe("loading");
    expect(
      document.querySelector<HTMLElement>("[data-slot=preloader-bar-fill]")?.style.transform
    ).toBe("scaleX(var(--preloader-progress, 0))");

    act(() => vi.advanceTimersByTime(500));
    const midway = Number(bar.getAttribute("aria-valuenow"));
    expect(midway).toBeGreaterThan(20);
    expect(midway).toBeLessThan(100);
    expect(screen.getByTestId("count").textContent).toBe(`${midway}%`);
    const variable = Number(bar.style.getPropertyValue("--preloader-progress"));
    expect(variable).toBeGreaterThan(0.2);
    expect(variable).toBeLessThan(1);

    act(() => vi.advanceTimersByTime(1500));
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(bar.dataset.state).toBe("done");
    expect(onComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(progressbar()).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("waits short of 90 until it is ready", () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
    });
    const onComplete = vi.fn();
    const { rerender } = render(
      <Preloader ready={false} duration={500} exitDuration={0} onComplete={onComplete} />
    );
    act(() => vi.advanceTimersByTime(10_000));
    const bar = progressbar()!;
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeLessThanOrEqual(90);
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(80);
    expect(bar.dataset.state).toBe("loading");

    rerender(<Preloader ready duration={500} exitDuration={0} onComplete={onComplete} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(progressbar()?.dataset.state).toBe("done");
    act(() => vi.advanceTimersByTime(0));
    expect(progressbar()).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("skips the count with reduced motion and leaves as soon as it is ready", async () => {
    installMatchMedia([REDUCED]);
    const onComplete = vi.fn();
    const { rerender } = render(<Preloader ready={false} onComplete={onComplete} />);
    await act(flushFrames);
    expect(progressbar()?.dataset.state).toBe("loading");

    rerender(<Preloader ready onComplete={onComplete} />);
    await act(flushFrames);
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(progressbar()).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("stays out of the way of pages without JavaScript", () => {
    const html = renderToString(<Preloader label="Opening" />);
    expect(html).toContain('aria-label="Opening"');
    expect(html).toContain("[@media(scripting:none)]:hidden");
  });
});

describe("CustomCursor", () => {
  it("renders nothing and keeps the system cursor on touch screens", () => {
    installMatchMedia([]);
    render(<CustomCursor />);
    expect(document.querySelector("[data-slot=custom-cursor]")).toBeNull();
    expect(document.documentElement.hasAttribute("data-custom-cursor")).toBe(false);
  });

  it("renders nothing with reduced motion", () => {
    installMatchMedia([FINE, REDUCED]);
    render(<CustomCursor />);
    expect(document.querySelector("[data-slot=custom-cursor]")).toBeNull();
    expect(document.documentElement.hasAttribute("data-custom-cursor")).toBe(false);
  });

  it("follows a fine pointer from a hidden portal, hiding the system cursor while mounted", async () => {
    installMatchMedia([FINE]);
    const { unmount } = render(<CustomCursor smoothing={1} />);
    const cursor = document.body.querySelector<HTMLElement>(":scope > [data-slot=custom-cursor]")!;
    expect(cursor.getAttribute("aria-hidden")).toBe("true");
    expect(cursor.className).toContain("pointer-events-none");
    expect(cursor.dataset.state).toBe("hidden");
    expect(document.documentElement.hasAttribute("data-custom-cursor")).toBe(true);
    expect(cursor.querySelector("style")?.textContent).toContain("cursor: none");

    fireEvent.pointerMove(window, { clientX: 120, clientY: 80, pointerType: "mouse" });
    await act(flushFrames);
    expect(cursor.dataset.state).toBe("default");
    const dot = cursor.querySelector<HTMLElement>("[data-slot=custom-cursor-dot]")!;
    const ring = cursor.querySelector<HTMLElement>("[data-slot=custom-cursor-ring]")!;
    expect(dot.style.transform).toContain("translate3d(120px, 80px, 0)");
    expect(ring.style.transform).toContain("translate3d(120px, 80px, 0)");

    unmount();
    expect(document.documentElement.hasAttribute("data-custom-cursor")).toBe(false);
  });

  it("grows over interactive elements, shows labels, reacts to presses and hides outside the window", () => {
    installMatchMedia([FINE]);
    render(
      <>
        <button type="button">Plain</button>
        <a href="#work" data-cursor="view">
          Work
        </a>
        <CustomCursor labels={{ view: "View" }} />
      </>
    );
    const cursor = document.querySelector<HTMLElement>("[data-slot=custom-cursor]")!;
    fireEvent.pointerMove(window, { clientX: 10, clientY: 10, pointerType: "mouse" });
    fireEvent.pointerOver(screen.getByRole("button", { name: "Plain" }));
    expect(cursor.dataset.state).toBe("hover");
    expect(cursor.querySelector("[data-slot=custom-cursor-label]")).toBeNull();

    fireEvent.pointerOver(screen.getByRole("link", { name: "Work" }));
    expect(cursor.dataset.label).toBe("view");
    expect(cursor.querySelector("[data-slot=custom-cursor-label]")?.textContent).toBe("View");

    fireEvent.pointerDown(window);
    expect(cursor.dataset.state).toBe("pressed");
    fireEvent.pointerUp(window);
    expect(cursor.dataset.state).toBe("hover");

    fireEvent.pointerOver(document.body);
    expect(cursor.dataset.state).toBe("default");
    fireEvent.pointerOut(document.body, { relatedTarget: null });
    expect(cursor.dataset.state).toBe("hidden");
  });

  it("a page-wide data-cursor on <body> shows its label without making the page interactive", () => {
    installMatchMedia([FINE]);
    document.body.setAttribute("data-cursor", "go");
    try {
      render(
        <>
          <p>Text</p>
          <button type="button">Plain</button>
          <CustomCursor labels={{ go: "Go" }} />
        </>
      );
      const cursor = document.querySelector<HTMLElement>("[data-slot=custom-cursor]")!;
      fireEvent.pointerMove(window, { clientX: 10, clientY: 10, pointerType: "mouse" });
      fireEvent.pointerOver(screen.getByText("Text"));
      expect(cursor.dataset.state).toBe("default");
      expect(cursor.dataset.label).toBe("go");
      fireEvent.pointerOver(screen.getByRole("button", { name: "Plain" }));
      expect(cursor.dataset.state).toBe("hover");
      fireEvent.pointerOver(screen.getByText("Text"));
      expect(cursor.dataset.state).toBe("default");
    } finally {
      document.body.removeAttribute("data-cursor");
    }
  });
  it("can leave the system cursor alone", () => {
    installMatchMedia([FINE]);
    render(<CustomCursor hideNativeCursor={false} blend={false} />);
    const cursor = document.querySelector<HTMLElement>("[data-slot=custom-cursor]")!;
    expect(document.documentElement.hasAttribute("data-custom-cursor")).toBe(false);
    expect(cursor.querySelector("style")).toBeNull();
    expect(cursor.className).not.toContain("mix-blend-difference");
  });
});

describe("ScrollProgress", () => {
  it("is a decorative bar on the page's scroll timeline, only where scroll timelines exist", () => {
    const html = renderToString(<ScrollProgress />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("animation-timeline:scroll(root)");
    expect(html).toContain("supports-[animation-timeline:scroll()]:animate-scroll-progress");
    expect(html).toContain("hidden supports-[animation-timeline:scroll()]:block");
    expect(html).toContain("top-0");
  });

  it("can sit at the bottom and follow the nearest scroller", () => {
    const html = renderToString(
      <ScrollProgress position="bottom" timeline="nearest" className="h-1" />
    );
    expect(html).toContain("animation-timeline:scroll(nearest)");
    expect(html).toContain("bottom-0");
    expect(html).toContain("h-1");
    expect(html).not.toContain("h-[3px]");
  });
});

describe("SmoothScroll", () => {
  let windowScroll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    lenis.instances.length = 0;
    windowScroll = vi.fn();
    vi.stubGlobal("scrollTo", windowScroll);
  });

  function Probe({ target, offset }: { target: number | string; offset?: number }) {
    const { lenis: instance, scrollTo } = useSmoothScroll();
    return (
      <button type="button" onClick={() => scrollTo(target, { offset })}>
        {instance ? "smooth" : "native"}
      </button>
    );
  }

  it("starts Lenis with its defaults and hands it out, and stops it on unmount", () => {
    installMatchMedia([]);
    const { unmount } = render(
      <SmoothScroll options={{ lerp: 0.2 }}>
        <Probe target="#pricing" offset={-64} />
      </SmoothScroll>
    );
    expect(lenis.instances).toHaveLength(1);
    const instance = lenis.instances[0]!;
    expect(instance.options).toEqual({ autoRaf: true, anchors: true, lerp: 0.2 });
    fireEvent.click(screen.getByRole("button", { name: "smooth" }));
    expect(instance.scrollTo).toHaveBeenCalledWith("#pricing", { offset: -64 });
    unmount();
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it("scrolls natively and without animation under reduced motion", () => {
    installMatchMedia([REDUCED]);
    render(
      <SmoothScroll>
        <Probe target={400} offset={-20} />
      </SmoothScroll>
    );
    expect(lenis.instances).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "native" }));
    expect(windowScroll).toHaveBeenCalledWith({ top: 380, behavior: "auto" });
  });

  it("scrolls to elements smoothly without a provider, honouring the offset", () => {
    installMatchMedia([]);
    render(
      <>
        <section id="pricing" aria-label="Pricing" />
        <Probe target="#pricing" offset={-64} />
      </>
    );
    const section = screen.getByRole("region", { name: "Pricing" });
    vi.spyOn(section, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 500, 100, 100));
    fireEvent.click(screen.getByRole("button", { name: "native" }));
    expect(windowScroll).toHaveBeenCalledWith({ top: 436, behavior: "smooth" });
  });

  it("uses scrollIntoView when there is no offset", () => {
    installMatchMedia([]);
    render(
      <>
        <section id="crew" aria-label="Crew" />
        <Probe target="#crew" />
      </>
    );
    const section = screen.getByRole("region", { name: "Crew" });
    const intoView = vi.spyOn(section, "scrollIntoView");
    fireEvent.click(screen.getByRole("button", { name: "native" }));
    expect(intoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
