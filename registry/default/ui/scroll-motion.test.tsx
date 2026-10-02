import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PathBeam } from "@/registry/default/ui/path-beam";
import { TiltScroll } from "@/registry/default/ui/tilt-scroll";
import { installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
  installMatchMedia([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * jsdom has no AnimationEvent, so React listens for the prefixed names.
 * Send both; React picks up whichever it registered.
 */
function animationStart(element: Element) {
  fireEvent(element, new Event("animationstart", { bubbles: true }));
  fireEvent(element, new Event("webkitAnimationStart", { bubbles: true }));
}
function animationEnd(element: Element) {
  fireEvent(element, new Event("animationend", { bubbles: true }));
  fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
}

const pieces = (slot: string) => [...document.querySelectorAll<SVGElement>(`[data-slot=${slot}]`)];

const PATHS = ["M0 10 H100", "M100 10 H200", "M200 10 H300"];

describe("TiltScroll", () => {
  it("gates the tilt on scroll timelines and reduced motion, with its variables in the markup", () => {
    const html = renderToString(
      <TiltScroll angle={30} scale={0.8} perspective={900}>
        Dashboard
      </TiltScroll>
    );
    expect(html).toContain("supports-[animation-timeline:view()]:animate-tilt-scroll");
    expect(html).toContain("motion-reduce:!animate-none");
    expect(html).toContain("origin-top");
    expect(html).toContain("--tilt-scroll-angle:30deg");
    expect(html).toContain("--tilt-scroll-scale:0.8");
    expect(html).toContain("--tilt-scroll-perspective:900px");
    expect(html).toContain("animation-timeline:view()");
    expect(html).toContain("animation-range:entry 0% cover 40%");
    expect(html).toContain('data-timeline="view"');
    expect(html).not.toContain("max-md:!animate-none");
  });

  it("follows the page from the top with the root timeline, or a given range", () => {
    let html = renderToString(<TiltScroll timeline="root">Hero</TiltScroll>);
    expect(html).toContain("animation-timeline:scroll(root)");
    expect(html).toContain("animation-range:0px 60vh");
    expect(html).toContain('data-timeline="root"');
    html = renderToString(<TiltScroll range="cover 0% cover 50%">Hero</TiltScroll>);
    expect(html).toContain("animation-range:cover 0% cover 50%");
  });

  it("stays flat below a breakpoint with CSS alone", () => {
    expect(renderToString(<TiltScroll flatBelow="md">Hero</TiltScroll>)).toContain(
      "max-md:!animate-none"
    );
    expect(renderToString(<TiltScroll flatBelow="lg">Hero</TiltScroll>)).toContain(
      "max-lg:!animate-none"
    );
  });

  it("merges onto its child with asChild", () => {
    render(
      <TiltScroll asChild className="mx-auto">
        <section aria-label="Preview" className="rounded-lg" />
      </TiltScroll>
    );
    const section = screen.getByRole("region", { name: "Preview" });
    expect(section.dataset.slot).toBe("tilt-scroll");
    expect(section.className).toContain("rounded-lg");
    expect(section.className).toContain("mx-auto");
    expect(section.className).toContain("animate-tilt-scroll");
    expect(section.style.getPropertyValue("--tilt-scroll-angle")).toBe("20deg");
  });
});

describe("PathBeam", () => {
  it("draws a track and a beam per path, hidden from screen readers, idle on the server", () => {
    const html = renderToString(<PathBeam viewBox="0 0 300 20" paths={PATHS} beamLength={0.3} />);
    const container = document.createElement("div");
    container.innerHTML = html;
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.dataset.state).toBe("idle");
    expect(container.querySelectorAll("[data-slot=path-beam-path]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-slot=path-beam-track]")).toHaveLength(3);
    const beams = container.querySelectorAll("[data-slot=path-beam-beam]");
    expect(beams).toHaveLength(3);
    expect(container.querySelectorAll("[data-slot=path-beam-glow]")).toHaveLength(3);
    for (const beam of beams) {
      expect(beam.getAttribute("stroke-dasharray")).toBe("0.3 1");
      expect(beam.getAttribute("pathLength")).toBe("1");
      // Waiting before the start of its path, not animating yet.
      expect(beam.getAttribute("style")).toContain("stroke-dashoffset:0.3");
      expect(beam.getAttribute("class")).not.toContain("animate-path-beam");
    }
    expect(container.querySelector("[data-slot=path-beam-track]")!.getAttribute("class")).toBe(
      "stroke-border"
    );
  });

  it("leaves out the track and the glow on request", () => {
    render(<PathBeam viewBox="0 0 300 20" paths={PATHS} track={false} glow={false} />);
    expect(pieces("path-beam-track")).toHaveLength(0);
    expect(pieces("path-beam-glow")).toHaveLength(0);
    expect(pieces("path-beam-beam")).toHaveLength(3);
  });

  it("plays in view, one path after another with the stagger in between", () => {
    render(
      <PathBeam viewBox="0 0 300 20" paths={PATHS} duration={1000} delay={200} stagger={100} />
    );
    const svg = document.querySelector("[data-slot=path-beam]")!;
    expect(svg.getAttribute("data-state")).toBe("idle");
    act(() => io.intersect(svg, true));
    expect(svg.getAttribute("data-state")).toBe("running");
    const beams = pieces("path-beam-beam");
    expect(beams.map((beam) => beam.style.animationDelay)).toEqual(["200ms", "1300ms", "2400ms"]);
    expect(beams.map((beam) => beam.style.animationDuration)).toEqual([
      "1000ms",
      "1000ms",
      "1000ms",
    ]);
    for (const beam of [...beams, ...pieces("path-beam-glow")]) {
      expect(beam.getAttribute("class")).toContain("motion-safe:animate-path-beam");
    }
  });

  it("marks each path as the beam reaches and leaves it, then completes after the last", () => {
    const onComplete = vi.fn();
    const onPathComplete = vi.fn();
    render(
      <PathBeam
        viewBox="0 0 300 20"
        paths={PATHS}
        onComplete={onComplete}
        onPathComplete={onPathComplete}
      />
    );
    const svg = document.querySelector("[data-slot=path-beam]")!;
    act(() => io.intersect(svg, true));
    const groups = pieces("path-beam-path");
    const beams = () => pieces("path-beam-beam");
    expect(groups.map((group) => group.dataset.state)).toEqual(["idle", "idle", "idle"]);
    animationStart(beams()[0]!);
    expect(groups[0]!.dataset.state).toBe("running");
    animationEnd(beams()[0]!);
    expect(groups[0]!.dataset.state).toBe("done");
    expect(onPathComplete).toHaveBeenCalledWith(0);
    expect(onComplete).not.toHaveBeenCalled();
    animationStart(beams()[2]!);
    animationEnd(beams()[2]!);
    expect(svg.getAttribute("data-state")).toBe("done");
    expect(groups.map((group) => group.dataset.state)).toEqual(["done", "done", "done"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onPathComplete).toHaveBeenCalledWith(2);
    expect(beams()[0]!.getAttribute("class")).not.toContain("animate-path-beam");
  });

  it("ignores animation events that bubble up from the glow", () => {
    const onPathComplete = vi.fn();
    render(<PathBeam viewBox="0 0 300 20" paths={PATHS} onPathComplete={onPathComplete} />);
    act(() => io.intersect(document.querySelector("[data-slot=path-beam]")!, true));
    animationEnd(pieces("path-beam-glow")[0]!);
    expect(onPathComplete).not.toHaveBeenCalled();
  });

  it("loops by restarting the sequence, pausing off screen, without completing", () => {
    const onComplete = vi.fn();
    render(<PathBeam viewBox="0 0 300 20" paths={PATHS} loop onComplete={onComplete} />);
    const svg = document.querySelector("[data-slot=path-beam]")!;
    act(() => io.intersect(svg, true));
    const first = pieces("path-beam-beam")[2]!;
    expect(first.style.animationPlayState).toBe("");
    animationEnd(first);
    expect(onComplete).not.toHaveBeenCalled();
    expect(svg.getAttribute("data-state")).toBe("running");
    // Remounted, so the animation starts over.
    expect(pieces("path-beam-beam")[2]).not.toBe(first);
    act(() => io.intersect(svg, false));
    expect(pieces("path-beam-beam")[0]!.style.animationPlayState).toBe("paused");
  });

  it("places the beam from progress in manual mode", () => {
    render(<PathBeam trigger="manual" progress={0.5} viewBox="0 0 300 20" paths={PATHS} />);
    const svg = document.querySelector<SVGSVGElement>("[data-slot=path-beam]")!;
    expect(svg.style.getPropertyValue("--path-beam-progress")).toBe("0.5");
    expect(svg.getAttribute("data-state")).toBe("running");
    const beams = pieces("path-beam-beam");
    // Path 0 passed (-1), path 1 halfway (0.2 - 1.2 * 0.5), path 2 waiting (0.2).
    expect(beams.map((beam) => beam.style.strokeDashoffset)).toEqual(["-1", "-0.4", "0.2"]);
    expect(pieces("path-beam-path").map((group) => group.dataset.state)).toEqual([
      "done",
      "running",
      "idle",
    ]);
    expect(beams[0]!.getAttribute("class")).not.toContain("animate-path-beam");
    expect(io.observers(svg)).toBe(0);
  });

  it("is idle at 0 and done at 1 in manual mode", () => {
    const { rerender } = render(
      <PathBeam trigger="manual" progress={0} viewBox="0 0 300 20" paths={PATHS} />
    );
    const svg = document.querySelector("[data-slot=path-beam]")!;
    expect(svg.getAttribute("data-state")).toBe("idle");
    rerender(<PathBeam trigger="manual" progress={1} viewBox="0 0 300 20" paths={PATHS} />);
    expect(svg.getAttribute("data-state")).toBe("done");
  });

  it("with reduced motion is done at once, without a beam or callbacks", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    const onComplete = vi.fn();
    render(<PathBeam viewBox="0 0 300 20" paths={PATHS} onComplete={onComplete} />);
    const svg = document.querySelector("[data-slot=path-beam]")!;
    act(() => io.intersect(svg, true));
    expect(svg.getAttribute("data-state")).toBe("done");
    expect(pieces("path-beam-path").every((group) => group.dataset.state === "done")).toBe(true);
    for (const beam of pieces("path-beam-beam")) {
      expect(beam.getAttribute("class")).not.toContain("animate-path-beam");
      expect(beam.style.opacity).toBe("0");
    }
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("ties the beams to a view timeline in scroll mode, one after another", () => {
    const html = renderToString(
      <PathBeam trigger="scroll" range="cover 10% cover 90%" viewBox="0 0 300 20" paths={PATHS} />
    );
    expect(html).toContain("animation-timeline:view()");
    expect(html).toContain("animation-range:cover 10% cover 90%");
    expect(html).toContain("supports-[animation-timeline:view()]:animate-path-beam-progress");
    expect(html).toContain("motion-reduce:!animate-none");
    expect(html).toContain("var(--path-beam-progress, 0) * 3 - 2");
    expect(html).not.toContain("data-state");
  });
});
