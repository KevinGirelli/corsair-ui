import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { Magnetic } from "@/registry/default/ui/magnetic";
import { Parallax } from "@/registry/default/ui/parallax";
import { Reveal, RevealGroup } from "@/registry/default/ui/reveal";
import { TextReveal } from "@/registry/default/ui/text-reveal";
import { flushFrames, installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useInView", () => {
  function Probe({ once }: { once?: boolean }) {
    const [ref, inView] = useInView<HTMLDivElement>({ once });
    return (
      <div ref={ref} data-testid="probe">
        {inView ? "in" : "out"}
      </div>
    );
  }

  it("reports the element entering and leaving the viewport", () => {
    render(<Probe />);
    const probe = screen.getByTestId("probe");
    expect(probe.textContent).toBe("out");

    act(() => io.intersect(probe, true));
    expect(probe.textContent).toBe("in");
    act(() => io.intersect(probe, false));
    expect(probe.textContent).toBe("out");
  });

  it("stops watching after the first entry with once", () => {
    render(<Probe once />);
    const probe = screen.getByTestId("probe");
    expect(io.observers(probe)).toBe(1);

    act(() => io.intersect(probe, true));
    expect(io.observers(probe)).toBe(0);
    expect(probe.textContent).toBe("in");
  });
});

describe("Reveal", () => {
  it("renders visible on the server and stays put when it starts on screen", () => {
    expect(renderToString(<Reveal>Hello</Reveal>)).not.toContain("opacity");

    render(<Reveal>Hello</Reveal>);
    const element = screen.getByText("Hello");
    act(() => io.intersect(element, true));
    expect(element.dataset.state).toBe("visible");
    expect(element.style.opacity).toBe("");
    expect(element.getAttribute("style") ?? "").not.toContain("transition");
  });

  it("waits below the fold and moves into place when scrolled to", () => {
    render(
      <Reveal direction="up" distance={20} duration={500}>
        Below
      </Reveal>
    );
    const element = screen.getByText("Below");

    act(() => io.intersect(element, false));
    expect(element.dataset.state).toBe("hidden");
    expect(element.style.opacity).toBe("0");
    expect(element.style.transform).toContain("20px");

    act(() => io.intersect(element, true));
    expect(element.dataset.state).toBe("visible");
    expect(element.style.opacity).toBe("");
    expect(element.getAttribute("style")).toContain("500ms");
  });

  it("staggers the children of a group, which do not watch the viewport themselves", () => {
    render(
      <RevealGroup stagger={100} data-testid="group">
        <Reveal>One</Reveal>
        <Reveal>Two</Reveal>
        <Reveal delay={50}>Three</Reveal>
      </RevealGroup>
    );
    const group = screen.getByTestId("group");
    expect(io.observers(screen.getByText("One"))).toBe(0);

    act(() => io.intersect(group, false));
    expect(screen.getByText("Two").dataset.state).toBe("hidden");

    act(() => io.intersect(group, true));
    expect(screen.getByText("One").getAttribute("style")).toContain(" 0ms");
    expect(screen.getByText("Two").getAttribute("style")).toContain(" 100ms");
    expect(screen.getByText("Three").getAttribute("style")).toContain(" 250ms");
  });

  it("shows the content right away with reduced motion", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    render(<Reveal>Calm</Reveal>);
    const element = screen.getByText("Calm");

    act(() => io.intersect(element, false));
    expect(element.dataset.state).toBe("visible");
    expect(element.style.opacity).toBe("");
  });
});

describe("TextReveal", () => {
  it("keeps the sentence whole for screen readers", () => {
    render(<TextReveal as="h2">Forge your interface.</TextReveal>);
    const heading = screen.getByRole("heading", { name: "Forge your interface." });
    expect(heading.querySelectorAll("[data-slot=text-reveal-word]")).toHaveLength(3);
    expect(heading.querySelector("[aria-hidden=true]")?.textContent).toBe("Forge your interface.");
  });

  it("brings the words in one after another once in view", () => {
    render(
      <TextReveal stagger={50} duration={400}>
        One two three
      </TextReveal>
    );
    const root = document.querySelector("[data-slot=text-reveal]")!;
    const words = [...root.querySelectorAll<HTMLElement>("[data-slot=text-reveal-word]")];

    act(() => io.intersect(root, false));
    expect(words.map((word) => word.style.opacity)).toEqual(["0", "0", "0"]);

    act(() => io.intersect(root, true));
    expect(words[0]!.style.opacity).toBe("");
    expect(words[2]!.getAttribute("style")).toContain("400ms");
    expect(words[2]!.getAttribute("style")).toContain(" 100ms");
  });

  it("ties each word to its slice of a scroll timeline in scroll mode", () => {
    const html = renderToString(
      <TextReveal trigger="scroll" range={[0, 60]}>
        alpha beta gamma
      </TextReveal>
    );
    expect(html).toMatch(/view-timeline-name:--text-reveal-/);
    expect(html).toContain("animation-range:cover 20% cover 40%");
    expect(html).toContain("supports-[animation-timeline:view()]:animate-text-reveal");
    expect(html).toContain("motion-reduce:!animate-none");

    render(<TextReveal trigger="scroll">alpha beta</TextReveal>);
    expect(io.observers(document.querySelector("[data-slot=text-reveal]")!)).toBe(0);
  });
});

describe("Magnetic", () => {
  function setup() {
    render(
      <Magnetic strength={0.5}>
        <button type="button">Go</button>
      </Magnetic>
    );
    const outer = document.querySelector<HTMLElement>("[data-slot=magnetic]")!;
    const content = outer.querySelector<HTMLElement>("[data-slot=magnetic-content]")!;
    vi.spyOn(outer, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 40));
    return { outer, content };
  }

  it("pulls the content toward the mouse and springs back on leave", async () => {
    const { outer, content } = setup();

    fireEvent.pointerMove(outer, { clientX: 90, clientY: 30, pointerType: "mouse" });
    await act(flushFrames);
    // (90 - 50) * 0.5 and (30 - 20) * 0.5 from the center of a 100 × 40 box.
    expect(content.style.transform).toContain("20px");
    expect(content.style.transform).toContain("5px");

    fireEvent.pointerLeave(outer, { pointerType: "mouse" });
    expect(content.style.transform).toBe("");
  });

  it("stays still for touch and with reduced motion", async () => {
    const { outer, content } = setup();
    fireEvent.pointerMove(outer, { clientX: 90, clientY: 30, pointerType: "touch" });
    await act(flushFrames);
    expect(content.style.transform).toBe("");

    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    fireEvent.pointerMove(outer, { clientX: 90, clientY: 30, pointerType: "mouse" });
    await act(flushFrames);
    expect(content.style.transform).toBe("");
  });
});

describe("Parallax", () => {
  it("sets its offset and scroll timeline in the markup, with no JavaScript needed", () => {
    const html = renderToString(<Parallax offset={60}>Layer</Parallax>);
    expect(html).toContain("--parallax-offset:60px");
    expect(html).toContain("animation-timeline:view()");
    expect(html).toContain("supports-[animation-timeline:view()]:animate-parallax");
    expect(html).toContain("motion-reduce:!animate-none");
  });

  it("can move its child instead of a wrapper", () => {
    render(
      <Parallax asChild offset={-20}>
        <section aria-label="Layer" />
      </Parallax>
    );
    expect(screen.getByRole("region", { name: "Layer" }).dataset.slot).toBe("parallax");
  });
});
