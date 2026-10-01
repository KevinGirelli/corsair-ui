import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SplitFlap } from "@/registry/default/ui/split-flap";
import { installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
  installMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const board = () => document.querySelector<HTMLElement>("[data-slot=split-flap]")!;
const cells = () => [...board().querySelectorAll<HTMLElement>("[data-slot=split-flap-cell]")];
const flipping = () => cells().map((cell) => cell.dataset.flipping !== undefined);
const characters = () =>
  cells().map((cell) => cell.querySelector("[data-slot=split-flap-character]")!.textContent);
const flaps = (half: "top" | "bottom") => [
  ...board().querySelectorAll<HTMLElement>(`[data-slot=split-flap-flap][data-half=${half}]`),
];

/**
 * jsdom has no AnimationEvent, so React listens for the prefixed name.
 * Send both; React picks up whichever it registered.
 */
function animationEnd(element: Element) {
  fireEvent(element, new Event("animationend", { bubbles: true }));
  fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
}

function showBoard() {
  act(() => io.intersect(board(), true));
}

describe("SplitFlap", () => {
  it("ships the value in the server HTML, one cell per character, without flaps", () => {
    const html = renderToString(<SplitFlap value="45'" />);
    expect(html).toContain('<span class="sr-only">45&#x27;</span>');
    expect(html.match(/data-slot="split-flap-cell"/g)).toHaveLength(3);
    expect(html).toContain('data-state="idle"');
    expect(html).not.toContain("split-flap-flap");
  });

  it("reads as one piece and hides the cells from screen readers", () => {
    render(<SplitFlap value="INT" />);
    expect(board().querySelector(".sr-only")?.textContent).toBe("INT");
    expect(board().querySelector(".sr-only")?.hasAttribute("aria-live")).toBe(false);
    expect(cells().every((cell) => cell.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(characters()).toEqual(["I", "N", "T"]);
  });

  it("never flips on the first render, even in view", () => {
    render(<SplitFlap value="05'" />);
    showBoard();
    expect(flipping()).toEqual([false, false, false]);
    expect(board().dataset.state).toBe("idle");
  });

  it("flips only the cells whose character changed", () => {
    const { rerender } = render(<SplitFlap value="05'" />);
    showBoard();
    rerender(<SplitFlap value="15'" />);
    expect(flipping()).toEqual([true, false, false]);
    expect(board().dataset.state).toBe("flipping");
    expect(characters()).toEqual(["1", "5", "'"]);
    expect(flaps("top").map((flap) => flap.textContent)).toEqual(["0"]);
    expect(flaps("bottom").map((flap) => flap.textContent)).toEqual(["1"]);
    expect(flaps("top")[0]?.className).toContain("motion-safe:animate-split-flap-top");
    expect(flaps("bottom")[0]?.className).toContain("motion-safe:animate-split-flap-bottom");
  });

  it("staggers the changed cells from the first, and from the last when asked", () => {
    const { rerender } = render(<SplitFlap value="000" stagger={60} duration={300} />);
    showBoard();
    rerender(<SplitFlap value="111" stagger={60} duration={300} />);
    expect(flaps("top").map((flap) => flap.style.animationDelay)).toEqual(["0ms", "60ms", "120ms"]);
    expect(flaps("bottom").map((flap) => flap.style.animationDelay)).toEqual([
      "150ms",
      "210ms",
      "270ms",
    ]);
    expect(flaps("top")[0]?.style.animationDuration).toBe("150ms");

    rerender(<SplitFlap value="222" from="last" stagger={60} duration={300} />);
    expect(flaps("top").map((flap) => flap.style.animationDelay)).toEqual(["120ms", "60ms", "0ms"]);
  });

  it("pads to a fixed number of cells, so the layout holds", () => {
    const { rerender } = render(<SplitFlap value="9:00" length={5} />);
    expect(cells()).toHaveLength(5);
    expect(characters()[0]).toBe("\u00a0");
    showBoard();
    rerender(<SplitFlap value="19:00" length={5} />);
    expect(cells()).toHaveLength(5);
    expect(flipping()).toEqual([true, false, false, false, false]);
    rerender(<SplitFlap value="123:45" length={5} />);
    expect(cells()).toHaveLength(6);
  });

  it("swaps without flaps when motion is reduced", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    const { rerender } = render(<SplitFlap value="05'" />);
    showBoard();
    rerender(<SplitFlap value="15'" />);
    expect(flipping()).toEqual([false, false, false]);
    expect(flaps("top")).toHaveLength(0);
    expect(characters()).toEqual(["1", "5", "'"]);
  });

  it("swaps without flaps while off screen", () => {
    const { rerender } = render(<SplitFlap value="05'" />);
    rerender(<SplitFlap value="15'" />);
    expect(flipping()).toEqual([false, false, false]);
    showBoard();
    act(() => io.intersect(board(), false));
    rerender(<SplitFlap value="INT" />);
    expect(flipping()).toEqual([false, false, false]);
    expect(characters()).toEqual(["I", "N", "T"]);
  });

  it("announces new values politely when live", () => {
    render(<SplitFlap value="90'" live="polite" />);
    const announcer = board().querySelector(".sr-only")!;
    expect(announcer.getAttribute("aria-live")).toBe("polite");
    expect(announcer.getAttribute("aria-atomic")).toBe("true");
  });

  it("settles once the bottom flap lands", () => {
    const { rerender } = render(<SplitFlap value="05'" />);
    showBoard();
    rerender(<SplitFlap value="15'" />);
    animationEnd(flaps("top")[0]!);
    expect(flipping()).toEqual([true, false, false]);
    animationEnd(flaps("bottom")[0]!);
    expect(flipping()).toEqual([false, false, false]);
    expect(flaps("top")).toHaveLength(0);
    expect(board().dataset.state).toBe("idle");

    // And flips again on the next change.
    rerender(<SplitFlap value="25'" />);
    expect(flipping()).toEqual([true, false, false]);
  });

  it("steps through the cycle, one flip per character", () => {
    const { rerender } = render(<SplitFlap value="1" cycle="0123456789" />);
    showBoard();
    rerender(<SplitFlap value="3" cycle="0123456789" />);
    expect(flaps("top")[0]?.textContent).toBe("1");
    expect(flaps("bottom")[0]?.textContent).toBe("2");
    animationEnd(flaps("bottom")[0]!);
    expect(flaps("top")[0]?.textContent).toBe("2");
    expect(flaps("bottom")[0]?.textContent).toBe("3");
    expect(flaps("top")[0]?.style.animationDelay).toBe("0ms");
    animationEnd(flaps("bottom")[0]!);
    expect(flipping()).toEqual([false]);
    expect(characters()).toEqual(["3"]);
  });

  it("wraps around the cycle and flips straight for characters outside it", () => {
    const { rerender } = render(<SplitFlap value="9" cycle="0123456789" />);
    showBoard();
    rerender(<SplitFlap value="0" cycle="0123456789" />);
    expect(flaps("bottom")[0]?.textContent).toBe("0");
    animationEnd(flaps("bottom")[0]!);
    expect(flipping()).toEqual([false]);
    rerender(<SplitFlap value="A" cycle="0123456789" />);
    expect(flaps("bottom")[0]?.textContent).toBe("A");
  });

  it("passes props, ref and the perspective to the root element", () => {
    const ref = createRef<HTMLElement>();
    render(
      <SplitFlap
        ref={ref}
        as="time"
        dateTime="PT19M"
        value="19:00"
        perspective={250}
        className="gap-1"
        cellClassName="bg-card px-1"
      />
    );
    expect(ref.current).toBe(board());
    expect(board().tagName).toBe("TIME");
    expect(board().getAttribute("datetime")).toBe("PT19M");
    expect(board().className).toContain("gap-1");
    expect(board().style.getPropertyValue("--split-flap-perspective")).toBe("250px");
    expect(cells()[0]?.className).toContain("bg-card");
  });
});
