import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Grain } from "@/registry/default/ui/grain";
import { HoverReveal } from "@/registry/default/ui/hover-reveal";
import { Particles } from "@/registry/default/ui/particles";
import { RollText } from "@/registry/default/ui/roll-text";
import { Topography } from "@/registry/default/ui/topography";
import { flushFrames, installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const REDUCED = "(prefers-reduced-motion: reduce)";

describe("Grain", () => {
  it("renders on the server as a decorative tile of SVG noise", () => {
    const html = renderToString(<Grain />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("feTurbulence");
    expect(html).not.toMatch(/ id="/);
  });

  it("takes its strength, fineness, blend and tile size from props", () => {
    render(<Grain opacity={0.3} frequency={0.65} blend="multiply" size={120} />);
    const root = document.querySelector<HTMLElement>("[data-slot=grain]")!;
    expect(root.className).toContain("pointer-events-none");
    expect(root.className).toContain("absolute");
    expect(root.style.opacity).toBe("0.3");
    expect(root.style.mixBlendMode).toBe("multiply");
    const noise = root.querySelector<HTMLElement>("[data-slot=grain-noise]")!;
    expect(decodeURIComponent(noise.style.backgroundImage)).toContain("baseFrequency='0.65'");
    expect(noise.style.backgroundSize).toBe("120px");
    expect(noise.className).not.toContain("animate-grain");
  });

  it("can cover the viewport and jitter, only when motion is welcome", () => {
    render(<Grain fixed animated />);
    const root = document.querySelector<HTMLElement>("[data-slot=grain]")!;
    expect(root.className).toContain("fixed");
    expect(root.dataset.animated).toBe("true");
    expect(root.querySelector("[data-slot=grain-noise]")?.className).toContain(
      "motion-safe:animate-grain"
    );
  });
});

describe("HoverReveal", () => {
  function setup(props: Partial<Parameters<typeof HoverReveal>[0]> = {}) {
    render(
      <HoverReveal reveal={<span>Hidden layer</span>} radius={100} {...props}>
        <p>Base layer</p>
      </HoverReveal>
    );
    const root = document.querySelector<HTMLElement>("[data-slot=hover-reveal]")!;
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 300, 200));
    const layer = root.querySelector<HTMLElement>("[data-slot=hover-reveal-layer]")!;
    return { root, layer };
  }

  it("keeps the revealed layer out of the accessibility tree and out of reach", () => {
    const { root, layer } = setup({ softness: 0.25 });
    expect(root.dataset.state).toBe("idle");
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.hasAttribute("inert")).toBe(true);
    expect(layer.className).toContain("pointer-events-none");
    expect(layer.getAttribute("style")).toContain("#000 75%");
    expect(screen.getByText("Base layer")).toBeTruthy();
  });

  it("opens a circle at the pointer that grows in and closes on leave", async () => {
    const { root } = setup();
    fireEvent.pointerEnter(root, { clientX: 60, clientY: 70, pointerType: "mouse" });
    expect(root.dataset.state).toBe("active");
    await act(flushFrames);
    expect(root.style.getPropertyValue("--hover-reveal-x")).toBe("50px");
    expect(root.style.getPropertyValue("--hover-reveal-y")).toBe("50px");
    const growing = parseFloat(root.style.getPropertyValue("--hover-reveal-r"));
    expect(growing).toBeGreaterThan(0);
    expect(growing).toBeLessThan(100);
    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    expect(root.dataset.state).toBe("idle");
  });

  it("opens and closes at once with reduced motion", async () => {
    installMatchMedia([REDUCED]);
    const { root } = setup();
    fireEvent.pointerEnter(root, { clientX: 60, clientY: 70, pointerType: "mouse" });
    await act(flushFrames);
    expect(root.style.getPropertyValue("--hover-reveal-r")).toBe("100px");
    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    await act(flushFrames);
    expect(root.style.getPropertyValue("--hover-reveal-r")).toBe("0px");
  });

  it("leaves touch screens with the base layer", async () => {
    const { root } = setup();
    fireEvent.pointerEnter(root, { clientX: 60, clientY: 70, pointerType: "touch" });
    fireEvent.pointerMove(root, { clientX: 60, clientY: 70, pointerType: "touch" });
    await act(flushFrames);
    expect(root.dataset.state).toBe("idle");
    expect(root.style.getPropertyValue("--hover-reveal-r")).toBe("");
  });
});

describe("Particles", () => {
  const styles = (html: string) => html.match(/style="[^"]*"/g) ?? [];

  it("lays out the same scatter on the server and the client for a seed", () => {
    const first = renderToString(<Particles count={12} seed={7} />);
    expect(styles(renderToString(<Particles count={12} seed={7} />))).toEqual(styles(first));
    expect(styles(renderToString(<Particles count={12} seed={8} />))).not.toEqual(styles(first));
    const { container } = render(<Particles count={12} seed={7} />);
    const dots = container.querySelectorAll<HTMLElement>("[data-slot=particles-dot]");
    expect(dots).toHaveLength(12);
    expect(first).toContain(`left:${dots[0]!.style.left}`);
  });

  it("is decorative, hidden with reduced motion, and caps the count", () => {
    const { container } = render(<Particles count={500} size={[2, 4]} />);
    const root = container.querySelector<HTMLElement>("[data-slot=particles]")!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("motion-reduce:hidden");
    expect(root.className).toContain("pointer-events-none");
    const dots = [...root.querySelectorAll<HTMLElement>("[data-slot=particles-dot]")];
    expect(dots).toHaveLength(200);
    for (const dot of dots) {
      const width = parseFloat(dot.style.width);
      expect(width).toBeGreaterThanOrEqual(2);
      expect(width).toBeLessThanOrEqual(4);
      expect(parseFloat(dot.style.animationDelay)).toBeLessThanOrEqual(0);
    }
  });

  it("drifts in the chosen direction and pauses off screen", () => {
    const { container } = render(<Particles count={3} direction="down" />);
    const root = container.querySelector<HTMLElement>("[data-slot=particles]")!;
    const dot = root.querySelector<HTMLElement>("[data-slot=particles-dot]")!;
    expect(root.dataset.direction).toBe("down");
    expect(dot.className).toContain("motion-safe:animate-particles-down");
    expect(dot.style.animationPlayState).toBe("paused");
    act(() => io.intersect(root, true));
    expect(dot.style.animationPlayState).toBe("");
    act(() => io.intersect(root, false));
    expect(dot.style.animationPlayState).toBe("paused");
  });
});

describe("Topography", () => {
  class NoopResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  /** A WebGL2 context that accepts every call and counts the frames drawn. */
  function fakeWebGL() {
    const frames = { count: 0 };
    const calls: Record<string, unknown> = {};
    const gl = new Proxy(calls, {
      get(target, key: string) {
        if (key === "drawArrays") return () => frames.count++;
        if (key === "getProgramParameter") return () => true;
        if (/^[A-Z0-9_]+$/.test(key)) return 1;
        target[key] ??= vi.fn(() => ({}));
        return target[key];
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) =>
      type === "webgl2" ? gl : null) as unknown as HTMLCanvasElement["getContext"]);
    return frames;
  }

  async function frames(count: number) {
    for (let index = 0; index < count; index++) await act(flushFrames);
  }

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  });

  it("falls back to CSS rings of its colour without WebGL2", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<Topography color="rgb(1, 2, 3)" opacity={0.4} />);
    const root = container.querySelector<HTMLElement>("[data-slot=topography]")!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("pointer-events-none");
    const flat = root.querySelector<HTMLElement>("[data-slot=topography-fallback]")!;
    expect(flat.hidden).toBe(false);
    expect(flat.style.backgroundImage).toContain("repeating-radial-gradient");
    expect(flat.style.backgroundImage).toContain("rgb(1, 2, 3)");
    expect(flat.style.opacity).toBe("0.4");
  });

  it("draws with the shader, runs while on screen and pauses off it", async () => {
    const drawn = fakeWebGL();
    const { container } = render(<Topography />);
    const root = container.querySelector<HTMLElement>("[data-slot=topography]")!;
    expect(root.querySelector<HTMLElement>("[data-slot=topography-fallback]")?.hidden).toBe(true);
    await frames(2);
    const idle = drawn.count;
    expect(idle).toBeGreaterThan(0);
    await frames(2);
    expect(drawn.count).toBe(idle);

    act(() => io.intersect(root, true));
    await frames(4);
    expect(drawn.count).toBeGreaterThanOrEqual(idle + 3);

    act(() => io.intersect(root, false));
    await frames(2);
    const paused = drawn.count;
    await frames(3);
    expect(drawn.count).toBe(paused);
  });

  it("draws one still frame with reduced motion", async () => {
    installMatchMedia([REDUCED]);
    const drawn = fakeWebGL();
    const { container } = render(<Topography />);
    act(() => io.intersect(container.querySelector("[data-slot=topography]")!, true));
    await frames(2);
    const still = drawn.count;
    await frames(4);
    expect(drawn.count).toBe(still);
  });

  it("rises under a fine pointer inside its parent, not under touch", async () => {
    installMatchMedia(["(pointer: fine)"]);
    const drawn = fakeWebGL();
    const { container } = render(
      <section>
        <Topography pointer speed={0} />
      </section>
    );
    const host = container.querySelector("section")!;
    const root = host.querySelector<HTMLElement>("[data-slot=topography]")!;
    vi.spyOn(root.querySelector("canvas")!, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 200, 100)
    );
    act(() => io.intersect(root, true));
    await frames(2);
    const resting = drawn.count;

    fireEvent.pointerMove(host, { clientX: 50, clientY: 50, pointerType: "touch" });
    await frames(3);
    expect(drawn.count).toBe(resting);

    fireEvent.pointerMove(host, { clientX: 50, clientY: 50, pointerType: "mouse" });
    await frames(3);
    expect(drawn.count).toBeGreaterThanOrEqual(resting + 3);
  });
});

describe("RollText", () => {
  it("names its parent link once, with the rolling copies hidden", () => {
    render(
      <a href="#about" className="group">
        <RollText>About us</RollText>
      </a>
    );
    expect(screen.getByRole("link", { name: "About us" })).toBeTruthy();
    const root = document.querySelector<HTMLElement>("[data-slot=roll-text]")!;
    expect(root.querySelector(".sr-only")?.textContent).toBe("About us");
    const visual = root.querySelector("[data-slot=roll-text-visual]")!;
    expect(visual.getAttribute("aria-hidden")).toBe("true");
    const characters = visual.querySelectorAll("[data-slot=roll-text-character]");
    // Seven letters, each with a copy waiting below; the space stays a space.
    expect(characters).toHaveLength(7);
    expect(characters[0]!.textContent).toBe("AA");
    expect(visual.textContent).toBe("AAbboouutt uuss");
  });

  it("staggers the characters and rolls only when motion is welcome", () => {
    render(
      <RollText stagger={30} duration={500}>
        Go on
      </RollText>
    );
    const rollers = [
      ...document.querySelectorAll<HTMLElement>("[data-slot=roll-text-character] > span"),
    ];
    expect(rollers.map((roller) => roller.style.transitionDelay)).toEqual([
      "0ms",
      "30ms",
      "60ms",
      "90ms",
    ]);
    expect(rollers[0]!.style.transitionDuration).toBe("500ms");
    expect(rollers[0]!.className).toContain("motion-safe:group-hover:-translate-y-full");
    expect(rollers[0]!.className).toContain("motion-safe:group-focus-visible:-translate-y-full");
    expect(rollers[0]!.className).toContain("motion-reduce:transition-none");
    expect(document.querySelector("[data-slot=roll-text]")?.className).toContain("group");
  });

  it("renders on the server as the element asked for, spaces kept", () => {
    const html = renderToString(<RollText as="h2">{"Set  sail"}</RollText>);
    expect(html).toMatch(/^<h2[^>]*data-slot="roll-text"/);
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain("Set  sail");
  });
});
