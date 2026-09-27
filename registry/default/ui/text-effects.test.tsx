import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BlurText } from "@/registry/default/ui/blur-text";
import { DissolveText } from "@/registry/default/ui/dissolve-text";
import { HighlightText } from "@/registry/default/ui/highlight-text";
import { ScrambleText } from "@/registry/default/ui/scramble-text";
import { ShimmerText } from "@/registry/default/ui/shimmer-text";
import { Signature } from "@/registry/default/ui/signature";
import { SlideText } from "@/registry/default/ui/slide-text";
import { TextSignature } from "@/registry/default/ui/text-signature";
import { WaveText } from "@/registry/default/ui/wave-text";
import { installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

// Each glyph is a closed triangle 8 wide and 40 tall, 10 apart; spaces are
// empty. Scaling by fontSize / unitsPerEm leaves float dust such as
// 72.00000000000001, which the outlines must not trip over.
vi.mock("opentype.js", () => ({
  parse: () => ({
    unitsPerEm: 1000,
    ascender: 800,
    getPaths: (text: string) =>
      Array.from(text).map((character, index) => {
        const x = index * 10;
        return {
          commands:
            character === " "
              ? []
              : [
                  { type: "M", x: x + 1e-14, y: 0 },
                  { type: "Q", x1: x + 4, y1: 20.004999, x: x + 8, y: 40 },
                  { type: "C", x1: x + 6, y1: 40, x2: x + 2, y2: 40, x, y: 40 - 1e-12 },
                  { type: "L", x, y: 0 },
                  { type: "Z" },
                ],
          getBoundingBox: () => ({ x1: x, y1: 0, x2: x + 8, y2: 40 }),
        };
      }),
  }),
}));

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const pieces = (root: Element, slot: string) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot=${slot}]`),
];

/**
 * jsdom has no AnimationEvent, so React listens for the prefixed name.
 * Send both; React picks up whichever it registered.
 */
function animationEnd(element: Element) {
  fireEvent(element, new Event("animationend", { bubbles: true }));
  fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
}

describe("entrances (useEntrance)", () => {
  it("play on first paint with trigger load, straight from the server HTML", () => {
    const html = renderToString(<BlurText>Land ho</BlurText>);
    expect(html).toContain("motion-safe:animate-blur-text");
    expect(html).not.toContain("paused");
    expect(html).toContain('data-state="play"');
  });

  it("leave in-view text as it is on the server, so nothing hides before the browser checks", () => {
    const html = renderToString(<BlurText trigger="in-view">Land ho</BlurText>);
    expect(html).not.toContain("animate-blur-text");
    expect(html).toContain('data-state="static"');
  });

  it("hide server HTML found below the fold, then play it when it scrolls in", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<SlideText trigger="in-view">Weigh anchor</SlideText>);
    document.body.append(container);
    await act(async () => {
      hydrateRoot(container, <SlideText trigger="in-view">Weigh anchor</SlideText>);
    });
    const root = container.querySelector("[data-slot=slide-text]")!;
    expect(root.getAttribute("data-state")).toBe("static");

    act(() => io.intersect(root, false));
    expect(root.getAttribute("data-state")).toBe("armed");
    expect(pieces(root, "slide-text-piece")[0]?.style.animationPlayState).toBe("paused");

    act(() => io.intersect(root, true));
    expect(root.getAttribute("data-state")).toBe("play");
    expect(pieces(root, "slide-text-piece")[0]?.style.animationPlayState).toBe("");
    container.remove();
  });

  it("keep server HTML that starts on screen still, instead of blinking it", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<DissolveText trigger="in-view">On deck</DissolveText>);
    document.body.append(container);
    await act(async () => {
      hydrateRoot(container, <DissolveText trigger="in-view">On deck</DissolveText>);
    });
    const root = container.querySelector("[data-slot=dissolve-text]")!;
    act(() => io.intersect(root, true));
    expect(root.getAttribute("data-state")).toBe("static");
    container.remove();
  });

  it("arm elements first rendered in the browser and play them once seen", () => {
    render(<BlurText trigger="in-view">Dialog title</BlurText>);
    const root = document.querySelector("[data-slot=blur-text]")!;
    expect(root.getAttribute("data-state")).toBe("armed");
    act(() => io.intersect(root, true));
    expect(root.getAttribute("data-state")).toBe("play");
  });

  it("follow `play` when given, ignoring the trigger", () => {
    const { rerender } = render(<SlideText play={false}>Cast off</SlideText>);
    const root = document.querySelector("[data-slot=slide-text]")!;
    expect(root.getAttribute("data-state")).toBe("armed");
    rerender(<SlideText play>Cast off</SlideText>);
    expect(root.getAttribute("data-state")).toBe("play");
  });
});

describe("BlurText", () => {
  it("keeps the sentence whole for screen readers and each word unbroken on screen", () => {
    render(<BlurText as="h1">Fair winds</BlurText>);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.querySelector(".sr-only")?.textContent).toBe("Fair winds");
    expect(heading.querySelector("[aria-hidden=true]")?.textContent).toBe("Fair winds");
    expect(pieces(heading, "blur-text-character")).toHaveLength(9);
    expect(heading.querySelector(".whitespace-nowrap")?.textContent).toBe("Fair");
  });

  it("staggers characters after the delay", () => {
    render(
      <BlurText delay={100} stagger={30}>
        Ahoy
      </BlurText>
    );
    const delays = pieces(document.body, "blur-text-character").map(
      (piece) => piece.style.animationDelay
    );
    expect(delays).toEqual(["100ms", "130ms", "160ms", "190ms"]);
  });

  it("blurs out last character first and hides from screen readers with show={false}", () => {
    const onDone = vi.fn();
    const { rerender } = render(<BlurText onAnimationComplete={onDone}>Ahoy</BlurText>);
    rerender(
      <BlurText show={false} stagger={10} onAnimationComplete={onDone}>
        Ahoy
      </BlurText>
    );
    const root = document.querySelector("[data-slot=blur-text]")!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    const characters = pieces(root, "blur-text-character");
    expect(characters[0]?.className).toContain("animate-blur-text-out");
    expect(characters.map((piece) => piece.style.animationDelay)).toEqual([
      "30ms",
      "20ms",
      "10ms",
      "0ms",
    ]);
    // Going out, the first character is the last to finish.
    animationEnd(characters[3]!);
    expect(onDone).not.toHaveBeenCalled();
    animationEnd(characters[0]!);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("SlideText", () => {
  it("rises by characters from the centre out", () => {
    render(
      <SlideText split="characters" from="center" stagger={10}>
        abcde
      </SlideText>
    );
    const delays = pieces(document.body, "slide-text-piece").map(
      (piece) => piece.style.animationDelay
    );
    expect(delays).toEqual(["20ms", "10ms", "0ms", "10ms", "20ms"]);
  });

  it("splits lines on new lines, one mask per line", () => {
    render(<SlideText split="lines">{"First line\nSecond line"}</SlideText>);
    const lines = pieces(document.body, "slide-text-piece");
    expect(lines.map((line) => line.textContent)).toEqual(["First line", "Second line"]);
    expect(document.querySelector("[data-slot=slide-text]")?.className).toContain("flex-col");
  });
});

describe("DissolveText", () => {
  it("scatters its timings the same way on every render, so hydration agrees", () => {
    const first = renderToString(<DissolveText>Fog lifting over the harbour</DissolveText>);
    const second = renderToString(<DissolveText>Fog lifting over the harbour</DissolveText>);
    expect(first).toBe(second);
    const waits = [...first.matchAll(/animation-delay:(\d+)ms/g)].map((match) => Number(match[1]));
    expect(waits).toHaveLength(5);
    expect(new Set(waits).size).toBeGreaterThan(1);
    for (const wait of waits) {
      expect(wait).toBeGreaterThanOrEqual(200);
      expect(wait).toBeLessThanOrEqual(430);
    }
  });
});

describe("HighlightText", () => {
  it("slides its marker in from the chosen side and inverts the text", () => {
    render(<HighlightText from="left">yours to edit</HighlightText>);
    const root = document.querySelector("[data-slot=highlight-text]")!;
    const marker = root.querySelector<HTMLElement>("[data-slot=highlight-text-marker]")!;
    expect(marker.getAttribute("aria-hidden")).toBe("true");
    expect(marker.style.getPropertyValue("--highlight-text-from")).toContain("-101%");
    expect(root.textContent).toBe("yours to edit");
    expect(root.querySelector(".mix-blend-difference")).not.toBeNull();
  });

  it("leaves the text colour alone when not inverting", () => {
    render(
      <HighlightText inverse={false} markerClassName="bg-yellow-300/50">
        noted
      </HighlightText>
    );
    const root = document.querySelector("[data-slot=highlight-text]")!;
    expect(root.querySelector(".mix-blend-difference")).toBeNull();
    expect(root.querySelector("[data-slot=highlight-text-marker]")?.className).toContain(
      "bg-yellow-300/50"
    );
  });
});

describe("ScrambleText", () => {
  it("ships the real text in the server HTML", () => {
    const html = renderToString(<ScrambleText>Signal acquired</ScrambleText>);
    expect(html).toContain("Signal acquired");
  });

  it("scrambles and settles on the text", async () => {
    render(<ScrambleText speed={1}>Ahoy</ScrambleText>);
    const output = document.querySelector("[data-slot=scramble-text-output]")!;
    await waitFor(() => expect(output.textContent).toBe("Ahoy"));
    expect(screen.getByText("Ahoy", { selector: ".sr-only" })).toBeTruthy();
  });

  it("shows the text at once with reduced motion", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    render(<ScrambleText speed={500}>Ahoy</ScrambleText>);
    expect(document.querySelector("[data-slot=scramble-text-output]")?.textContent).toBe("Ahoy");
  });
});

describe("WaveText", () => {
  it("builds its bands from the colours, and repeats when asked", () => {
    render(
      <WaveText colors={["red", "blue"]} bands={4} repeat>
        High tide
      </WaveText>
    );
    const root = document.querySelector<HTMLElement>("[data-slot=wave-text]")!;
    const image = root.style.backgroundImage;
    expect(image).toContain("radial-gradient");
    expect(image.match(/red/g)).toHaveLength(2);
    expect(image.match(/blue/g)).toHaveLength(2);
    expect(root.style.animationIterationCount).toBe("infinite");
    // A repeating wave waits until it is on screen.
    expect(root.style.animationPlayState).toBe("paused");
    act(() => io.intersect(root, true));
    expect(root.style.animationPlayState).toBe("");
  });
});

describe("ShimmerText", () => {
  it("fits the rest between passes into one animation and pauses off screen", () => {
    render(
      <ShimmerText duration={2} pause={1}>
        Charting…
      </ShimmerText>
    );
    const root = document.querySelector<HTMLElement>("[data-slot=shimmer-text]")!;
    expect(root.style.animationDuration).toBe("3s");
    expect(root.style.getPropertyValue("--shimmer-text-to")).toBe("290%");
    expect(root.style.animationPlayState).toBe("paused");
    act(() => io.intersect(root, true));
    expect(root.style.animationPlayState).toBe("");
  });
});

describe("Signature ink", () => {
  it("fills the shapes through a mask drawn with the pen", () => {
    const { container, rerender } = render(
      <Signature paths={["M0 0L10 10"]} viewBox="0 0 10 10" />
    );
    expect(container.querySelector("mask")).toBeNull();
    rerender(<Signature paths={["M0 0L10 10"]} viewBox="0 0 10 10" ink inkWidth={6} />);
    const mask = container.querySelector("mask")!;
    expect(mask.querySelector("g")?.getAttribute("stroke-width")).toBe("6");
    expect(container.querySelector(`g[mask="url(#${mask.id})"]`)?.getAttribute("fill")).toBe(
      "currentColor"
    );
  });
});

describe("TextSignature", () => {
  it("writes the text from the font's glyph outlines and names the drawing after it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) }))
    );
    render(<TextSignature text="Ann B" font="/fonts/hand.ttf" />);
    // Named from the start, while the font is still on its way.
    expect(screen.getByRole("img", { name: "Ann B" })).toBeTruthy();
    // One inked outline per glyph; the space has none.
    await waitFor(() => expect(document.querySelectorAll("g[mask] path")).toHaveLength(4));
    const svg = screen.getByRole("img", { name: "Ann B" });
    // The glyphs span 0–48 × 0–40, plus a margin of 8% of the font size on every side.
    expect(svg.getAttribute("viewBox")).toBe("-5.76 -5.76 59.52 51.52");
    expect(fetch).toHaveBeenCalledWith("/fonts/hand.ttf");
  });

  it("writes every coordinate as a plain number, rounded to hundredths", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) }))
    );
    render(<TextSignature text="nb" font="/fonts/hand.ttf" />);
    await waitFor(() => expect(document.querySelectorAll("g[mask] path")).toHaveLength(2));
    const outlines = [...document.querySelectorAll("g[mask] path")].map((path) =>
      path.getAttribute("d")
    );
    expect(outlines).toEqual([
      "M0 0Q4 20 8 40C6 40 2 40 0 40L0 0Z",
      "M10 0Q14 20 18 40C16 40 12 40 10 40L10 0Z",
    ]);
  });
});

describe("HighlightText scribble", () => {
  it("draws a hand-drawn line under the phrase and leaves the text alone", () => {
    render(
      <HighlightText variant="scribble" markerClassName="text-primary" strokeWidth={4}>
        last
      </HighlightText>
    );
    const root = document.querySelector<HTMLElement>("[data-slot=highlight-text]")!;
    expect(root.dataset.variant).toBe("scribble");
    expect(root.textContent).toBe("last");
    expect(root.querySelector("[data-slot=highlight-text-marker]")).toBeNull();
    expect(root.querySelector(".mix-blend-difference")).toBeNull();
    const svg = root.querySelector("[data-slot=highlight-text-scribble]")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("preserveAspectRatio")).toBe("none");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(svg.getAttribute("stroke-width")).toBe("4");
    expect(svg.getAttribute("class")).toContain("text-primary");
    const strokes = svg.querySelectorAll<SVGPathElement>("path");
    expect(strokes).toHaveLength(1);
    expect(strokes[0]!.getAttribute("pathLength")).toBe("1");
    expect(strokes[0]!.getAttribute("class")).toContain("motion-safe:animate-highlight-text-draw");
    // The finished line is the resting state, so reduced motion shows it drawn.
    expect(strokes[0]!.style.strokeDashoffset).toBe("0");
  });

  it("draws two strokes one after the other for the double scribble", () => {
    render(
      <HighlightText variant="scribble" scribble="double" duration={1000} delay={100}>
        twice
      </HighlightText>
    );
    const [first, second] = document.querySelectorAll<SVGPathElement>(
      "[data-slot=highlight-text-scribble] path"
    );
    expect(first!.style.animationDelay).toBe("100ms");
    expect(first!.style.animationDuration).toBe("550ms");
    expect(second!.style.animationDelay).toBe("550ms");
    expect(second!.style.animationDuration).toBe("550ms");
  });

  it("uses the same entrance as the marker", () => {
    const { container } = render(
      <HighlightText variant="scribble" trigger="in-view">
        later
      </HighlightText>
    );
    const root = container.querySelector<HTMLElement>("[data-slot=highlight-text]")!;
    const stroke = root.querySelector<SVGPathElement>("path")!;
    expect(root.dataset.state).toBe("armed");
    expect(stroke.style.animationPlayState).toBe("paused");
    act(() => io.intersect(root, true));
    expect(root.dataset.state).toBe("play");
    expect(stroke.style.animationPlayState).toBe("");

    const html = renderToString(
      <HighlightText variant="scribble" trigger="in-view">
        later
      </HighlightText>
    );
    // Server HTML stays static: the line is simply there.
    expect(html).not.toContain("animate-highlight-text-draw");
    expect(html).toContain("stroke-dashoffset:0");
  });
});
