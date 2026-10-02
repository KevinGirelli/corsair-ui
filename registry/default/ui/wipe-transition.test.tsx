import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WipeTransition } from "@/registry/default/ui/wipe-transition";
import { installMatchMedia } from "@/test-utils/browser";

// jsdom has no Web Animations API: stand in for element.animate, recording
// each call and letting the test decide when it finishes.
interface Played {
  element: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
  finish: () => void;
}

let played: Played[];

function installAnimate() {
  played = [];
  Element.prototype.animate = function animate(
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions
  ) {
    let finish = () => {};
    const finished = new Promise<Animation>((resolve) => {
      finish = () => resolve(animation);
    });
    const cancel = vi.fn();
    const animation = { finished, cancel } as unknown as Animation;
    played.push({
      element: this,
      keyframes: keyframes as Keyframe[],
      options: options as KeyframeAnimationOptions,
      cancel,
      finish,
    });
    return animation;
  };
}

/** Finishes the latest animation and lets React commit what follows. */
async function finishLatest() {
  await act(async () => {
    played.at(-1)!.finish();
  });
}

const root = () => document.querySelector<HTMLElement>("[data-slot=wipe-transition]")!;
const contentSlot = () =>
  document.querySelector<HTMLElement>("[data-slot=wipe-transition-content]")!;
const coverSlot = () => document.querySelector<HTMLElement>("[data-slot=wipe-transition-cover]");

function Page({ side, ...props }: { side: string } & Record<string, unknown>) {
  return (
    <WipeTransition transitionKey={side} {...props}>
      <p>{side === "players" ? "For players" : side === "venues" ? "For venues" : side}</p>
    </WipeTransition>
  );
}

beforeEach(() => {
  installMatchMedia([]);
  installAnimate();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (Element.prototype as Partial<Element>).animate;
});

describe("WipeTransition", () => {
  it("shows the children on first render, with no animation or cover", () => {
    render(<Page side="players" />);
    expect(screen.getByText("For players")).toBeTruthy();
    expect(root().dataset.state).toBe("idle");
    expect(root().getAttribute("aria-busy")).toBeNull();
    expect(coverSlot()).toBeNull();
    expect(played).toHaveLength(0);
  });

  it("keeps the old children until covered, then shows the new ones and reveals", async () => {
    const { rerender } = render(<Page side="players" />);
    rerender(<Page side="venues" />);

    expect(root().dataset.state).toBe("covering");
    expect(screen.getByText("For players")).toBeTruthy();
    expect(screen.queryByText("For venues")).toBeNull();
    expect(coverSlot()).not.toBeNull();
    expect(played).toHaveLength(1);
    expect(played[0]!.element).toBe(coverSlot());
    expect(played[0]!.options).toMatchObject({
      duration: 300,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
    });

    await finishLatest();
    expect(root().dataset.state).toBe("revealing");
    expect(screen.getByText("For venues")).toBeTruthy();
    expect(screen.queryByText("For players")).toBeNull();
    expect(played).toHaveLength(2);

    await finishLatest();
    expect(root().dataset.state).toBe("idle");
    expect(coverSlot()).toBeNull();
    expect(screen.getByText("For venues")).toBeTruthy();
  });

  it("calls onCovered with the new content in place, then onComplete", async () => {
    const calls: string[] = [];
    const onCovered = vi.fn(() => calls.push(`covered:${contentSlot().textContent}`));
    const onComplete = vi.fn(() => calls.push(`complete:${root().dataset.state}`));
    const { rerender } = render(
      <Page side="players" onCovered={onCovered} onComplete={onComplete} />
    );
    rerender(<Page side="venues" onCovered={onCovered} onComplete={onComplete} />);
    expect(onCovered).not.toHaveBeenCalled();

    await finishLatest();
    expect(calls).toEqual(["covered:For venues"]);
    await finishLatest();
    expect(calls).toEqual(["covered:For venues", "complete:idle"]);
  });

  it("is busy and ignores the pointer while it runs", async () => {
    const { rerender } = render(<Page side="players" />);
    rerender(<Page side="venues" />);
    expect(root().getAttribute("aria-busy")).toBe("true");
    expect(contentSlot().className).toContain("pointer-events-none");
    expect(coverSlot()!.getAttribute("aria-hidden")).toBe("true");

    await finishLatest();
    expect(root().getAttribute("aria-busy")).toBe("true");
    await finishLatest();
    expect(root().getAttribute("aria-busy")).toBeNull();
    expect(contentSlot().className).not.toContain("pointer-events-none");
  });

  it("fades the content out and in, with no cover, in fade mode", async () => {
    const { rerender } = render(<Page side="players" mode="fade" />);
    rerender(<Page side="venues" mode="fade" />);
    expect(coverSlot()).toBeNull();
    expect(root().dataset.mode).toBe("fade");
    expect(played[0]!.element).toBe(contentSlot());
    expect(played[0]!.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);

    await finishLatest();
    expect(screen.getByText("For venues")).toBeTruthy();
    expect(contentSlot().style.opacity).toBe("0");
    expect(played[1]!.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);

    await finishLatest();
    expect(contentSlot().style.opacity).toBe("");
    expect(
      played.every(({ keyframes }) => keyframes.every((frame) => !("transform" in frame)))
    ).toBe(true);
  });

  it("always fades over reducedDuration with reduced motion", async () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    const { rerender } = render(<Page side="players" reducedDuration={200} />);
    rerender(<Page side="venues" reducedDuration={200} />);
    expect(coverSlot()).toBeNull();
    expect(root().dataset.mode).toBe("fade");
    expect(played[0]!.element).toBe(contentSlot());
    expect(played[0]!.options.duration).toBe(100);

    await finishLatest();
    expect(played[1]!.options.duration).toBe(100);
    await finishLatest();
    expect(root().dataset.state).toBe("idle");
  });

  it("swaps at once without the Web Animations API", async () => {
    delete (Element.prototype as Partial<Element>).animate;
    const onComplete = vi.fn();
    const { rerender } = render(<Page side="players" onComplete={onComplete} />);
    await act(async () => {
      rerender(<Page side="venues" onComplete={onComplete} />);
    });
    expect(screen.getByText("For venues")).toBeTruthy();
    expect(root().dataset.state).toBe("idle");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("ends on the latest key after rapid changes", async () => {
    const { rerender } = render(<Page side="a" />);
    rerender(<Page side="b" />);
    rerender(<Page side="c" />);
    // Still covering the first content; the queued key wins at the swap.
    expect(screen.getByText("a")).toBeTruthy();
    expect(played).toHaveLength(1);

    await finishLatest();
    expect(screen.getByText("c")).toBeTruthy();

    // A change while revealing runs again once the reveal is done.
    rerender(<Page side="d" />);
    expect(screen.getByText("c")).toBeTruthy();
    await finishLatest();
    expect(root().dataset.state).toBe("covering");
    expect(screen.getByText("c")).toBeTruthy();

    await finishLatest();
    await finishLatest();
    expect(root().dataset.state).toBe("idle");
    expect(screen.getByText("d")).toBeTruthy();
    expect(screen.queryByText("c")).toBeNull();
  });

  it("moves focus to the content wrapper if it was inside the old content", async () => {
    const { rerender } = render(
      <WipeTransition transitionKey="players">
        <button key="players" type="button">
          Book a pitch
        </button>
      </WipeTransition>
    );
    screen.getByRole("button", { name: "Book a pitch" }).focus();
    rerender(
      <WipeTransition transitionKey="venues">
        <button key="venues" type="button">
          List your venue
        </button>
      </WipeTransition>
    );
    await finishLatest();
    expect(document.activeElement).toBe(contentSlot());
    expect(contentSlot().getAttribute("tabindex")).toBe("-1");

    // Out of the tab order again once focus moves on.
    act(() => screen.getByRole("button", { name: "List your venue" }).focus());
    expect(contentSlot().hasAttribute("tabindex")).toBe(false);
  });

  it("leaves focus alone when it was outside the content", async () => {
    const { rerender } = render(
      <>
        <button type="button">Switch</button>
        <Page side="players" />
      </>
    );
    const outside = screen.getByRole("button", { name: "Switch" });
    outside.focus();
    rerender(
      <>
        <button type="button">Switch</button>
        <Page side="venues" />
      </>
    );
    await finishLatest();
    expect(document.activeElement).toBe(outside);
    expect(contentSlot().hasAttribute("tabindex")).toBe(false);
  });

  it.each([
    ["right", "translate3d(-100%, 0, 0)", "translate3d(100%, 0, 0)"],
    ["left", "translate3d(100%, 0, 0)", "translate3d(-100%, 0, 0)"],
    ["down", "translate3d(0, -100%, 0)", "translate3d(0, 100%, 0)"],
    ["up", "translate3d(0, 100%, 0)", "translate3d(0, -100%, 0)"],
  ] as const)("travels %s", async (direction, enter, leave) => {
    const { rerender } = render(<Page side="players" direction={direction} />);
    rerender(<Page side="venues" direction={direction} />);
    expect(coverSlot()!.style.transform).toBe(enter);
    expect(played[0]!.keyframes).toEqual([
      { transform: enter },
      { transform: "translate3d(0, 0, 0)" },
    ]);
    await finishLatest();
    expect(played[1]!.keyframes).toEqual([
      { transform: "translate3d(0, 0, 0)" },
      { transform: leave },
    ]);
  });

  it("covers the viewport when fixed, and clips to itself otherwise", () => {
    const { rerender } = render(<Page side="players" fixed cover={<div data-testid="band" />} />);
    rerender(<Page side="venues" fixed cover={<div data-testid="band" />} />);
    expect(coverSlot()!.className).toContain("fixed");
    expect(root().className).not.toContain("overflow-clip");
    expect(screen.getByTestId("band").parentElement).toBe(coverSlot());

    rerender(<Page side="players" coverClassName="bg-card" />);
    rerender(<Page side="venues" coverClassName="bg-card" />);
    expect(coverSlot()!.className).toContain("absolute");
    expect(coverSlot()!.className).toContain("bg-card");
    expect(root().className).toContain("overflow-clip");
  });

  it("cancels its animation when unmounted mid-transition", () => {
    const onCovered = vi.fn();
    const { rerender, unmount } = render(<Page side="players" onCovered={onCovered} />);
    rerender(<Page side="venues" onCovered={onCovered} />);
    unmount();
    expect(played[0]!.cancel).toHaveBeenCalled();
    expect(onCovered).not.toHaveBeenCalled();
  });
});
