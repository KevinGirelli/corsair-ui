import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LightRays } from "@/registry/default/ui/light-rays";
import { Marquee } from "@/registry/default/ui/marquee";
import { WarpGradient } from "@/registry/default/ui/warp-gradient";
import { installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

// Items that keep moving: each one has to rest while it is off screen.

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
  installMatchMedia([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Marquee", () => {
  it("repeats its content with copies screen readers and the keyboard skip", () => {
    render(
      <Marquee repeat={3}>
        <a href="#salvador">Salvador</a>
      </Marquee>
    );
    const groups = document.querySelectorAll("[data-slot=marquee-group]");
    expect(groups).toHaveLength(3);
    expect(groups[0]?.getAttribute("aria-hidden")).toBeNull();
    expect(groups[1]?.getAttribute("aria-hidden")).toBe("true");
    expect(groups[1]?.hasAttribute("inert")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Salvador" })).toHaveLength(1);
  });

  it("travels right in reverse and pauses while off screen", () => {
    render(<Marquee direction="right">Ports</Marquee>);
    const root = document.querySelector("[data-slot=marquee]")!;
    const track = document.querySelector<HTMLElement>("[data-slot=marquee-track]")!;
    expect(track.style.animationDirection).toBe("reverse");
    expect(track.style.animationPlayState).toBe("paused");
    act(() => io.intersect(root, true));
    expect(track.style.animationPlayState).toBe("");
  });
  it("is a plain moving strip, or a named region you can tab to with reduced motion", () => {
    const { unmount } = render(<Marquee>Ports</Marquee>);
    let root = document.querySelector<HTMLElement>("[data-slot=marquee]")!;
    expect(root.hasAttribute("tabindex")).toBe(false);
    expect(root.getAttribute("role")).toBeNull();
    unmount();
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    render(<Marquee label="Partner logos">Ports</Marquee>);
    root = document.querySelector<HTMLElement>("[data-slot=marquee]")!;
    expect(screen.getByRole("region", { name: "Partner logos" })).toBe(root);
    expect(root.tabIndex).toBe(0);
  });
});

describe("Marquee paused", () => {
  it("holds still while paused from outside, even on screen", () => {
    const { rerender } = render(<Marquee paused>Ports</Marquee>);
    const root = document.querySelector("[data-slot=marquee]")!;
    const track = document.querySelector<HTMLElement>("[data-slot=marquee-track]")!;
    act(() => io.intersect(root, true));
    expect(track.style.animationPlayState).toBe("paused");
    expect(root.hasAttribute("data-paused")).toBe(true);
    rerender(<Marquee>Ports</Marquee>);
    expect(track.style.animationPlayState).toBe("");
    expect(root.hasAttribute("data-paused")).toBe(false);
  });
});

describe("Marquee draggable", () => {
  // jsdom runs no CSS animations: stand in for the loop's, 20 s long, on a
  // track of two 400 px copies.
  function withLoop(currentTime = 1000) {
    const animation = {
      animationName: "marquee-x",
      currentTime,
      effect: { getComputedTiming: () => ({ duration: 20000 }) },
    };
    const track = document.querySelector<HTMLElement>("[data-slot=marquee-track]")!;
    Object.assign(track, { getAnimations: () => [animation] });
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({ width: 800, height: 40 } as DOMRect);
    return animation;
  }

  function root() {
    return document.querySelector<HTMLElement>("[data-slot=marquee]")!;
  }

  it("seeks the loop with the pointer and holds it while dragged", () => {
    render(<Marquee draggable>Ports</Marquee>);
    const loop = withLoop();
    expect(root().className).toContain("motion-safe:touch-pan-y");
    fireEvent.pointerDown(root(), { pointerId: 1, button: 0, clientX: 200 });
    fireEvent.pointerMove(root(), { pointerId: 1, clientX: 197 });
    // Under the threshold: still a click, nothing moved.
    expect(loop.currentTime).toBe(1000);
    expect(root().hasAttribute("data-dragging")).toBe(false);
    fireEvent.pointerMove(root(), { pointerId: 1, clientX: 100 });
    // 100 px of a 400 px copy is a quarter of the loop; dragging left runs it forwards.
    expect(loop.currentTime).toBe(6000);
    expect(root().getAttribute("data-dragging")).toBe("true");
    fireEvent.pointerMove(root(), { pointerId: 1, clientX: 400 });
    // Back past the start wraps around to the end of the loop.
    expect(loop.currentTime).toBe(11000);
    fireEvent.pointerUp(root(), { pointerId: 1, clientX: 400 });
    expect(root().hasAttribute("data-dragging")).toBe(false);
  });

  it("runs the other way for a reversed marquee", () => {
    render(
      <Marquee draggable direction="right">
        Ports
      </Marquee>
    );
    const loop = withLoop();
    fireEvent.pointerDown(root(), { pointerId: 1, button: 0, clientX: 200 });
    fireEvent.pointerMove(root(), { pointerId: 1, clientX: 100 });
    expect(loop.currentTime).toBe(16000);
  });

  it("keeps clicks on links, and swallows the one that ends a drag", () => {
    const visit = vi.fn((event: React.MouseEvent) => event.preventDefault());
    render(
      <Marquee draggable>
        <a href="#havana" onClick={visit}>
          Havana
        </a>
      </Marquee>
    );
    withLoop();
    const link = screen.getByRole("link", { name: "Havana" });
    fireEvent.pointerDown(link, { pointerId: 1, button: 0, clientX: 50 });
    fireEvent.pointerUp(link, { pointerId: 1, clientX: 52 });
    fireEvent.click(link);
    expect(visit).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(link, { pointerId: 1, button: 0, clientX: 50 });
    fireEvent.pointerMove(link, { pointerId: 1, clientX: 150 });
    fireEvent.pointerUp(link, { pointerId: 1, clientX: 150 });
    fireEvent.click(link);
    expect(visit).toHaveBeenCalledTimes(1);
  });

  it("leaves the pointer alone when not draggable", () => {
    const onPointerDown = vi.fn();
    render(<Marquee onPointerDown={onPointerDown}>Ports</Marquee>);
    const loop = withLoop();
    fireEvent.pointerDown(root(), { pointerId: 1, button: 0, clientX: 200 });
    fireEvent.pointerMove(root(), { pointerId: 1, clientX: 100 });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(loop.currentTime).toBe(1000);
    expect(root().className).not.toContain("cursor-grab");
  });
});

describe("backgrounds without WebGL2", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("LightRays keeps its CSS glow and stays out of the accessibility tree", () => {
    const { container } = render(<LightRays colors="#6fb3c2" />);
    const root = container.querySelector("[data-slot=light-rays]")!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector<HTMLElement>("[data-slot=light-rays-fallback]")?.hidden).toBe(
      false
    );
  });

  it("WarpGradient falls back to a CSS gradient of its colours and can add grain", () => {
    const { container } = render(<WarpGradient colors={["#000000", "#ffffff"]} grain={0.3} />);
    const flat = container.querySelector<HTMLElement>("[data-slot=warp-gradient-fallback]")!;
    expect(flat.hidden).toBe(false);
    expect(flat.style.background).toContain("linear-gradient");
    expect(
      container.querySelector<HTMLElement>("[data-slot=warp-gradient-grain]")?.style.opacity
    ).toBe("0.3");
  });
});
