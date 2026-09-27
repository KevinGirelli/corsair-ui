import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LightRays } from "@/registry/default/ui/light-rays";
import { Marquee } from "@/registry/default/ui/marquee";
import { WarpGradient } from "@/registry/default/ui/warp-gradient";
import { installIntersectionObserver } from "@/test-utils/browser";

// Items that keep moving: each one has to rest while it is off screen.

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
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
